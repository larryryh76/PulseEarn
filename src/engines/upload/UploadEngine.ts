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
   * Primary entry point for production-grade uploads.
   * Handles validation, progress tracking, and metadata synchronization.
   */
  static async startUpload(
    file: File,
    options: UploadOptions,
    onStateChange: (state: UploadState) => void
  ): Promise<string> {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error('Authentication required for uploads');
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

      // Timeout detection (15s for initial connection)
      timeoutId = setTimeout(() => {
        if (uploadTask.snapshot.bytesTransferred === 0 && uploadTask.snapshot.state !== 'success') {
          uploadTask.cancel();
          const err = 'Upload timed out: Failed to establish storage connection.';
          onStateChange({ progress: 0, state: 'ERROR', error: err });
          reject(new Error(err));
        }
      }, 15000);

      // 3. UPLOAD MONITORING
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onStateChange({ progress, state: 'UPLOADING', uploadId });

          if (snapshot.bytesTransferred > 0 && timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
        },
        (error: StorageError) => {
          if (timeoutId) clearTimeout(timeoutId);
          console.error('[UploadEngine] Error:', error.code, error.message);

          let userMsg = 'Upload failed';
          if (error.code === 'storage/unauthorized') userMsg = 'Access Denied: Check permissions.';
          if (error.code === 'storage/canceled') userMsg = 'Upload canceled.';
          if (error.code === 'storage/retry-limit-exceeded') userMsg = 'Network unstable. Retrying...';

          onStateChange({ progress: 0, state: 'ERROR', error: userMsg, uploadId });
          reject(new Error(userMsg));
        },
        async () => {
          // 4. FINALIZATION
          if (timeoutId) clearTimeout(timeoutId);
          onStateChange({ progress: 100, state: 'FINALIZING', uploadId });

          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

            // 5. METADATA SYNCHRONIZATION
            await setDoc(doc(db, 'system_uploads', uploadId), {
              uploadId,
              userId,
              storagePath,
              downloadUrl,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              metadata: options.metadata || {},
              createdAt: serverTimestamp(),
              status: 'COMPLETED'
            });

            onStateChange({ progress: 100, state: 'SUCCESS', downloadUrl, uploadId });
            resolve(downloadUrl);
          } catch (err: any) {
            console.error('[UploadEngine] Finalization Error:', err);
            onStateChange({ progress: 100, state: 'ERROR', error: 'Metadata sync failed', uploadId });
            reject(err);
          }
        }
      );
    });
  }

  /**
   * Standalone validation logic
   */
  static validate(file: File, options: UploadOptions): void {
    const maxSize = (options.maxSizeMB || this.DEFAULT_MAX_SIZE) * 1024 * 1024;
    const allowedTypes = options.allowedTypes || this.DEFAULT_TYPES;

    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Unsupported file type: ${file.type}. Allowed: ${allowedTypes.join(', ')}`);
    }

    if (file.size > maxSize) {
      throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Max: ${options.maxSizeMB || this.DEFAULT_MAX_SIZE}MB`);
    }
  }
}
