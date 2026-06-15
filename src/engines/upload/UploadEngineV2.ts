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

export interface UploadMetadata {
  uploadId: string;
  userId: string;
  userEmail: string;
  storagePath: string;
  downloadUrl?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  metadata?: Record<string, any>;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  createdAt: any;
}

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

export class UploadEngineV2 {
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
  ): { task: UploadTask; uploadId: string; cancel: () => void } {
    console.log(`[UploadEngine] Initializing upload for: ${file.name} (${file.size} bytes)`);
    const user = auth.currentUser;
    if (!user) {
      console.error('[UploadEngine] Error: Authentication required.');
      throw new Error('Authentication required for uploads.');
    }

    const uploadId = `upl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const fileName = `${uploadId}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storagePath = `${options.path}/${fileName}`;

    // 1. Initial State
    onProgress({
      id: uploadId,
      progress: 0,
      status: 'VALIDATING',
      fileName: file.name
    });

    try {
      this.validate(file, options);
    } catch (err: any) {
      onProgress({
        id: uploadId,
        progress: 0,
        status: 'ERROR',
        error: err.message,
        fileName: file.name
      });
      throw err;
    }

    const storageRef = ref(storage, storagePath);
    console.log(`[UploadEngine] Storage Path: ${storagePath}`);

    const uploadTask = uploadBytesResumable(storageRef, file);

    // 2. Event Subscription
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log(`[UploadEngine] ${uploadId} Progress: ${progress.toFixed(2)}% (${snapshot.state})`);

        let status: UploadStatus = 'UPLOADING';
        if (snapshot.state === 'paused') status = 'IDLE';
        if (snapshot.state === 'running' && progress === 100) status = 'FINALIZING';

        onProgress({
          id: uploadId,
          progress,
          status,
          fileName: file.name
        });
      },
      async (error) => {
        console.error(`[UploadEngine] Task ${uploadId} failed:`, error.code, error.message);

        const status = error.code === 'storage/canceled' ? 'CANCELLED' : 'ERROR';
        onProgress({
          id: uploadId,
          progress: 0,
          status,
          error: error.message,
          fileName: file.name
        });

        // Log failure to Firestore
        await this.persistMetadata({
          uploadId,
          userId: user.uid,
          userEmail: user.email || '',
          storagePath,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          status: 'FAILED',
          metadata: { ...options.metadata, errorCode: error.code }
        });
      },
      async () => {
        // 3. Completion
        console.log(`[UploadEngine] ${uploadId} successfully uploaded to storage.`);
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          console.log(`[UploadEngine] ${uploadId} Download URL retrieved: ${downloadUrl}`);

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
            metadata: options.metadata
          });

          onProgress({
            id: uploadId,
            progress: 100,
            status: 'SUCCESS',
            downloadUrl,
            fileName: file.name
          });
        } catch (err: any) {
          onProgress({
            id: uploadId,
            progress: 100,
            status: 'ERROR',
            error: err.message,
            fileName: file.name
          });
        }
      }
    );

    return {
      task: uploadTask,
      uploadId,
      cancel: () => uploadTask.cancel()
    };
  }

  private static async persistMetadata(data: any) {
    try {
      await setDoc(doc(db, 'system_uploads', data.uploadId), {
        ...data,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('[UploadEngine] Firestore sync failed:', err);
    }
  }
}
