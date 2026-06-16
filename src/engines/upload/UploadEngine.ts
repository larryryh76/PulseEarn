import {
  ref,
  uploadBytesResumable,
  getDownloadURL
} from 'firebase/storage';
import {
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { storage, auth, db } from '../../firebase/config';

export type UploadStatus = 'IDLE' | 'UPLOADING' | 'SUCCESS' | 'ERROR';

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
  metadata?: Record<string, any>;
}

export type UploadCallback = (progress: UploadProgress) => void;

export class UploadEngine {
  static startUpload(
    file: File,
    options: UploadOptions,
    onProgress: UploadCallback
  ): { uploadId: string; promise: Promise<string> } {
    const user = auth.currentUser;
    if (!user) throw new Error('Authentication required');

    const maxSize = (options.maxSizeMB || 10) * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(`File too large: ${(file.size / (1024 * 1024)).toFixed(2)}MB. Max: ${options.maxSizeMB || 10}MB`);
    }

    const uploadId = `upl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const fileName = `${uploadId}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storagePath = `${options.path}/${user.uid}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    const promise = new Promise<string>((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          ...options.metadata,
          userId: user.uid,
          originalName: file.name
        }
      });

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress({ id: uploadId, progress, status: 'UPLOADING', fileName: file.name });
        },
        (error) => {
          onProgress({ id: uploadId, progress: 0, status: 'ERROR', error: error.message, fileName: file.name });
          reject(error);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            await setDoc(doc(db, 'system_uploads', uploadId), {
              id: uploadId,
              userId: user.uid,
              downloadUrl,
              storagePath,
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              createdAt: serverTimestamp()
            });
            onProgress({ id: uploadId, progress: 100, status: 'SUCCESS', downloadUrl, fileName: file.name });
            resolve(downloadUrl);
          } catch (err: any) {
            reject(err);
          }
        }
      );
    });

    return { uploadId, promise };
  }
}
