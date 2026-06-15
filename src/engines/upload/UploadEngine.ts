import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  UploadTask,
  StorageError
} from 'firebase/storage';
import {
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { storage, db, auth } from '../../firebase/config';

export interface UploadOptions {
  path: string;
  maxSizeMB?: number;
  allowedTypes?: string[];
  metadata?: Record<string, any>;
}

export interface UploadState {
  progress: number;
  state: 'IDLE' | 'VALIDATING' | 'INITIALIZING' | 'UPLOADING' | 'FINALIZING' | 'SUCCESS' | 'ERROR';
  error?: string;
  downloadUrl?: string;
  uploadId?: string;
}

export class UploadEngine {
  private static DEFAULT_MAX_SIZE = 10; // 10MB
  private static DEFAULT_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  /**
   * Authoritative validation logic.
   */
  static validate(file: File, options: UploadOptions): void {
    const maxSize = (options.maxSizeMB || this.DEFAULT_MAX_SIZE) * 1024 * 1024;
    const allowedTypes = options.allowedTypes || this.DEFAULT_TYPES;

    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not supported. Please use JPG, PNG or WEBP.`);
    }

    if (file.size > maxSize) {
      throw new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum allowed is ${options.maxSizeMB || this.DEFAULT_MAX_SIZE}MB.`);
    }
  }

  /**
   * Reconstructed Production-Grade Upload sequence.
   * Atomic, observable, and backend-synchronized.
   */
  static async startUpload(
    file: File,
    options: UploadOptions,
    onStateChange: (state: UploadState) => void
  ): Promise<string> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('You must be signed in to upload assets.');
    }

    // 1. VALIDATION
    onStateChange({ progress: 0, state: 'VALIDATING' });
    this.validate(file, options);

    // 2. INITIALIZATION
    onStateChange({ progress: 0, state: 'INITIALIZING' });
    const uploadId = `upl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const fileName = `${uploadId}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storagePath = `${options.path}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    return new Promise((resolve, reject) => {
      let timeoutId: any = null;
      const uploadTask: UploadTask = uploadBytesResumable(storageRef, file);

      // connection watchdog: if no movement in 20s, fail explicitly.
      timeoutId = setTimeout(() => {
        if (uploadTask.snapshot.bytesTransferred === 0 && uploadTask.snapshot.state !== 'success') {
          uploadTask.cancel();
          const err = 'Cloud Storage connection failed (Timeout). Please check your network.';
          onStateChange({ progress: 0, state: 'ERROR', error: err, uploadId });
          reject(new Error(err));
        }
      }, 20000);

      // 3. STORAGE UPLOAD & PROGRESS
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = snapshot.totalBytes > 0
            ? (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            : 0;

          onStateChange({
            progress,
            state: 'UPLOADING',
            uploadId
          });

          // Reset timeout on first byte or movement
          if (snapshot.bytesTransferred > 0 && timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
        },
        (error: StorageError) => {
          if (timeoutId) clearTimeout(timeoutId);
          console.error('[UploadEngine] Storage Critical Error:', error.code, error.message);

          let msg = 'Upload failed: ' + error.message;
          if (error.code === 'storage/unauthorized') msg = 'Permission Denied: Unauthorized storage access.';
          if (error.code === 'storage/canceled') msg = 'Upload was canceled.';
          if (error.code === 'storage/retry-limit-exceeded') msg = 'Network instability: Retry limit exceeded.';

          onStateChange({ progress: 0, state: 'ERROR', error: msg, uploadId });
          reject(new Error(msg));
        },
        async () => {
          // 4. COMPLETION & FINALIZATION
          if (timeoutId) clearTimeout(timeoutId);
          onStateChange({ progress: 100, state: 'FINALIZING', uploadId });

          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

            // 5. FIRESTORE METADATA SYNC (Backend Authority)
            await setDoc(doc(db, 'system_uploads', uploadId), {
              uploadId,
              userId: user.uid,
              userEmail: user.email,
              storagePath,
              downloadUrl,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              metadata: options.metadata || {},
              createdAt: serverTimestamp(),
              status: 'COMPLETED',
              platform: 'web'
            });

            onStateChange({ progress: 100, state: 'SUCCESS', downloadUrl, uploadId });
            resolve(downloadUrl);
          } catch (err: any) {
            console.error('[UploadEngine] Synchronization Failure:', err);
            const msg = 'File uploaded but metadata synchronization failed.';
            onStateChange({ progress: 100, state: 'ERROR', error: msg, uploadId });
            reject(new Error(msg));
          }
        }
      );
    });
  }
}
