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
import { storage, db, auth } from '../../firebase/config';

export type UploadStatus = 'IDLE' | 'VALIDATING' | 'UPLOADING' | 'FINALIZING' | 'SUCCESS' | 'ERROR' | 'CANCELLED';

export interface UploadProgress {
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
  status: UploadStatus;
  error?: string;
  downloadUrl?: string;
  uploadId?: string;
}

export interface UploadOptions {
  path: string;
  maxSizeMB?: number;
  allowedTypes?: string[];
  metadata?: Record<string, any>;
}

export class UploadService {
  private static DEFAULT_MAX_SIZE = 10; // 10MB
  private static DEFAULT_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  /**
   * Generates a unique upload ID
   */
  private static generateUploadId(): string {
    return `upl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Validates the file against options
   */
  static validate(file: File, options: UploadOptions): void {
    const maxSize = (options.maxSizeMB || this.DEFAULT_MAX_SIZE) * 1024 * 1024;
    const allowedTypes = options.allowedTypes || this.DEFAULT_TYPES;

    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Invalid file type: ${file.type}. Supported types: ${allowedTypes.join(', ')}`);
    }

    if (file.size > maxSize) {
      throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Max: ${options.maxSizeMB || this.DEFAULT_MAX_SIZE}MB`);
    }
  }

  /**
   * Starts a resumable upload to Firebase Storage
   */
  static startUpload(
    file: File,
    options: UploadOptions,
    onProgress: (progress: UploadProgress) => void
  ): { task: UploadTask; uploadId: string; cancel: () => void } {
    const user = auth.currentUser;
    if (!user) {
      const error = 'Authentication required for uploads.';
      onProgress({ progress: 0, bytesTransferred: 0, totalBytes: file.size, status: 'ERROR', error });
      throw new Error(error);
    }

    onProgress({ progress: 0, bytesTransferred: 0, totalBytes: file.size, status: 'VALIDATING' });

    try {
      this.validate(file, options);
    } catch (err: any) {
      onProgress({ progress: 0, bytesTransferred: 0, totalBytes: file.size, status: 'ERROR', error: err.message });
      throw err;
    }

    const uploadId = this.generateUploadId();
    const fileName = `${uploadId}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storagePath = `${options.path}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress({
          progress,
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: snapshot.totalBytes,
          status: 'UPLOADING',
          uploadId
        });
      },
      (error) => {
        if (error.code === 'storage/canceled') {
          onProgress({ progress: 0, bytesTransferred: 0, totalBytes: file.size, status: 'CANCELLED', uploadId });
        } else {
          onProgress({ progress: 0, bytesTransferred: 0, totalBytes: file.size, status: 'ERROR', error: error.message, uploadId });
        }
      },
      async () => {
        onProgress({ progress: 100, bytesTransferred: file.size, totalBytes: file.size, status: 'FINALIZING', uploadId });

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
            metadata: options.metadata || {}
          });

          onProgress({
            progress: 100,
            bytesTransferred: file.size,
            totalBytes: file.size,
            status: 'SUCCESS',
            downloadUrl,
            uploadId
          });
        } catch (err: any) {
          onProgress({ progress: 100, bytesTransferred: file.size, totalBytes: file.size, status: 'ERROR', error: err.message, uploadId });
        }
      }
    );

    return {
      task: uploadTask,
      uploadId,
      cancel: () => uploadTask.cancel()
    };
  }

  /**
   * Persists upload metadata to Firestore for audit and tracking
   */
  private static async persistMetadata(data: {
    uploadId: string;
    userId: string;
    userEmail: string;
    storagePath: string;
    downloadUrl: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    metadata: Record<string, any>;
  }) {
    await setDoc(doc(db, 'system_uploads', data.uploadId), {
      ...data,
      createdAt: serverTimestamp(),
      status: 'COMPLETED'
    });
  }
}
