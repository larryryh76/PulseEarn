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
  ): { uploadId: string; cancel: () => void } {
    const user = auth.currentUser;
    if (!user) throw new Error('Authentication required');

    const uploadId = `upl_${Date.now()}`;
    let isCancelled = false;
    let transport: XMLHttpRequest | UploadTask | null = null;

    const cancel = () => {
      isCancelled = true;
      if (transport) {
        if ('abort' in transport) transport.abort();
        else transport.cancel();
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

    // 1. Attempt Industrial Python Backend
    const runPythonUpload = () => {
      const xhr = new XMLHttpRequest();
      transport = xhr;

      const apiEndpoint = window.location.hostname === 'localhost' ? 'http://localhost:5000/api/upload' : '/api/upload';
      xhr.open('POST', apiEndpoint, true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          onProgress({ id: uploadId, progress, status: 'UPLOADING', fileName: file.name });
        }
      };

      xhr.onload = async () => {
        if (isCancelled) return;
        if (xhr.status >= 200 && xhr.status < 300) {
          const result = JSON.parse(xhr.responseText);
          onProgress({ id: uploadId, progress: 100, status: 'SUCCESS', downloadUrl: result.downloadUrl, fileName: file.name });
        } else {
          console.warn('[UploadEngine] Python backend failed, attempting fallback');
          runFallback();
        }
      };

      xhr.onerror = () => {
        if (isCancelled) return;
        runFallback();
      };

      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user.uid);
      formData.append('path', options.path);
      formData.append('metadata', JSON.stringify(options.metadata || {}));
      xhr.send(formData);
    };

    // 2. Client-side Fallback
    const runFallback = () => {
      if (isCancelled) return;
      const fileName = `${uploadId}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const storagePath = `${options.path}/${fileName}`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file);
      transport = uploadTask;

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress({ id: uploadId, progress, status: 'UPLOADING', fileName: file.name });
        },
        (error) => {
          if (isCancelled) return;
          onProgress({ id: uploadId, progress: 0, status: 'ERROR', error: error.message, fileName: file.name });
        },
        async () => {
          if (isCancelled) return;
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          await this.persistMetadata({
            uploadId,
            userId: user.uid,
            userEmail: user.email || '',
            storagePath,
            downloadUrl,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            status: 'COMPLETED'
          });
          onProgress({ id: uploadId, progress: 100, status: 'SUCCESS', downloadUrl, fileName: file.name });
        }
      );
    };

    runPythonUpload();

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
    }
  }
}
