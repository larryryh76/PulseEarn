import {
  ref,
  uploadBytesResumable,
  uploadBytes,
  getDownloadURL,
  UploadTask
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
   * Features: Atomic fallback for small files, watchdog for sessions, backend sync.
   */
  static async startUpload(
    file: File,
    options: UploadOptions,
    onStateChange: (state: UploadState) => void
  ): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('Authentication required.');

    onStateChange({ progress: 0, state: 'VALIDATING' });
    this.validate(file, options);

    const uploadId = `upl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fileName = `${uploadId}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storagePath = `${options.path}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    // ATOMIC SPEED OPTIMIZATION: If file is < 1MB, use uploadBytes directly (no session overhead)
    if (file.size < 1024 * 1024) {
      onStateChange({ progress: 20, state: 'UPLOADING', uploadId });
      try {
        const result = await uploadBytes(storageRef, file);
        onStateChange({ progress: 90, state: 'FINALIZING', uploadId });
        const downloadUrl = await getDownloadURL(result.ref);
        await this.syncMetadata(uploadId, user.uid, user.email || '', storagePath, downloadUrl, file, options);
        onStateChange({ progress: 100, state: 'SUCCESS', downloadUrl, uploadId });
        return downloadUrl;
      } catch (err: any) {
        const errorMsg = err.code === 'storage/retry-limit-exceeded' ? 'Network timeout. Please check your connection.' : err.message;
        onStateChange({ progress: 0, state: 'ERROR', error: errorMsg, uploadId });
        throw new Error(errorMsg);
      }
    }

    // RESUMABLE UPLOAD (with watchdog)
    return new Promise((resolve, reject) => {
      let watchdog: any = null;
      const uploadTask: UploadTask = uploadBytesResumable(storageRef, file);

      const clearWatchdog = () => { if (watchdog) { clearTimeout(watchdog); watchdog = null; } };
      const resetWatchdog = (ms = 10000) => {
        clearWatchdog();
        watchdog = setTimeout(() => {
          uploadTask.cancel();
          const msg = 'Upload timed out due to inactivity. Please try a smaller file or better connection.';
          onStateChange({ progress: 0, state: 'ERROR', error: msg, uploadId });
          reject(new Error(msg));
        }, ms);
      };

      resetWatchdog(15000); // Initial connection timeout

      uploadTask.on('state_changed',
        (snap) => {
          const progress = (snap.bytesTransferred / snap.totalBytes) * 100;
          onStateChange({ progress, state: 'UPLOADING', uploadId });
          if (snap.bytesTransferred > 0) resetWatchdog(12000); // Reset watchdog on activity
        },
        (error) => {
          clearWatchdog();
          onStateChange({ progress: 0, state: 'ERROR', error: error.message, uploadId });
          reject(error);
        },
        async () => {
          clearWatchdog();
          onStateChange({ progress: 95, state: 'FINALIZING', uploadId });
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            await this.syncMetadata(uploadId, user.uid, user.email || '', storagePath, downloadUrl, file, options);
            onStateChange({ progress: 100, state: 'SUCCESS', downloadUrl, uploadId });
            resolve(downloadUrl);
          } catch (err: any) {
            onStateChange({ progress: 0, state: 'ERROR', error: err.message, uploadId });
            reject(err);
          }
        }
      );
    });
  }

  private static async syncMetadata(
    uploadId: string,
    userId: string,
    userEmail: string,
    storagePath: string,
    downloadUrl: string,
    file: File,
    options: UploadOptions
  ) {
    await setDoc(doc(db, 'system_uploads', uploadId), {
      uploadId, userId, userEmail, storagePath, downloadUrl,
      fileName: file.name, fileType: file.type, fileSize: file.size,
      metadata: options.metadata || {},
      createdAt: serverTimestamp(),
      status: 'COMPLETED'
    });
  }
}
