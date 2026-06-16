import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  UploadTask
} from 'firebase/storage';
import {
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { storage, auth, db } from '../../firebase/config';

export type UploadStatus = 'IDLE' | 'VALIDATING' | 'UPLOADING' | 'FINALIZING' | 'SUCCESS' | 'ERROR' | 'CANCELLED';

export interface UploadProgress {
  id: string;
  progress: number;
  status: UploadStatus;
  error?: string;
  downloadUrl?: string;
  fileName: string;
}

export interface UploadOptions {
  path: string;
  maxSizeMB?: number;
  allowedTypes?: string[];
  metadata?: Record<string, any>;
}

export type UploadCallback = (progress: UploadProgress) => void;

export class UploadEngine {
  private static DEFAULT_MAX_SIZE = 10; // 10MB
  private static DEFAULT_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  static validate(file: File, options: UploadOptions): void {
    const maxSize = (options.maxSizeMB || this.DEFAULT_MAX_SIZE) * 1024 * 1024;
    const allowedTypes = options.allowedTypes || this.DEFAULT_TYPES;

    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Invalid file type: ${file.type}. Supported: ${allowedTypes.join(', ')}`);
    }

    if (file.size > maxSize) {
      throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Limit: ${options.maxSizeMB || this.DEFAULT_MAX_SIZE}MB`);
    }
  }

  static startUpload(
    file: File,
    options: UploadOptions,
    onProgress: UploadCallback
  ): { uploadId: string; cancel: () => void } {
    const user = auth.currentUser;
    if (!user) throw new Error('Authentication required');

    const uploadId = `upl_${Date.now()}`;
    let isCancelled = false;
    let transport: UploadTask | null = null;

    const cancel = () => {
      isCancelled = true;
      if (transport) {
        transport.cancel();
      }
      onProgress({ id: uploadId, progress: 0, status: 'CANCELLED', fileName: file.name });
    };

    onProgress({ id: uploadId, progress: 0, status: 'VALIDATING', fileName: file.name });

    try {
      this.validate(file, options);
    } catch (err: any) {
      onProgress({ id: uploadId, progress: 0, status: 'ERROR', error: err.message, fileName: file.name });
      return { uploadId, cancel: () => {} };
    }

    // Direct Firebase Storage Upload
    const fileName = `${uploadId}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storagePath = `${options.path}/${user.uid}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    // Metadata for Firebase Storage
    const storageMetadata = {
      contentType: file.type,
      customMetadata: {
        uploadId,
        userId: user.uid,
        ...options.metadata
      }
    };

    const uploadTask = uploadBytesResumable(storageRef, file, storageMetadata);
    transport = uploadTask;

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (isCancelled) return;
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress({ id: uploadId, progress, status: 'UPLOADING', fileName: file.name });
      },
      (error) => {
        if (isCancelled) return;
        console.error('[UploadEngine] Storage Error:', error);

        // Detailed error reporting for Admin visibility
        let message = `Upload Failed: ${error.message}`;

        if (error.code === 'storage/unauthorized') {
          message = 'Storage Error: Permission denied. Verify storage security rules and authentication status.';
        } else if (error.code === 'storage/canceled') {
          return; // No error state for manual cancellation
        } else if (error.code === 'storage/quota-exceeded') {
          message = 'Storage Error: Project quota exceeded. Check Firebase billing.';
        } else if (error.code === 'storage/object-not-found') {
          message = 'Storage Error: Target path not found.';
        } else if (error.code === 'storage/retry-limit-exceeded') {
          message = 'Storage Error: Connection timed out. Please try again on a stable network.';
        }

        onProgress({ id: uploadId, progress: 0, status: 'ERROR', error: message, fileName: file.name });
      },
      async () => {
        if (isCancelled) return;
        onProgress({ id: uploadId, progress: 100, status: 'FINALIZING', fileName: file.name });

        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

          // Persist metadata to Firestore
          await this.persistMetadata({
            uploadId,
            userId: user.uid,
            userEmail: user.email || '',
            storagePath,
            downloadUrl,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            status: 'COMPLETED',
            metadata: options.metadata || {}
          });

          onProgress({ id: uploadId, progress: 100, status: 'SUCCESS', downloadUrl, fileName: file.name });
        } catch (err: any) {
          console.error('[UploadEngine] Finalization Error:', err);
          onProgress({ id: uploadId, progress: 100, status: 'ERROR', error: 'Failed to retrieve download URL', fileName: file.name });
        }
      }
    );

    return { uploadId, cancel };
  }

  private static async persistMetadata(data: any) {
    try {
      await setDoc(doc(db, 'system_uploads', data.uploadId), {
        ...data,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('[UploadEngine] Firestore sync failed:', err);
      // We don't fail the whole upload if just metadata sync fails,
      // but in production we should probably log this to a monitoring service.
    }
  }
}
