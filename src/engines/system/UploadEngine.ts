import { ref, uploadBytes, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase/config';

export interface UploadProgress {
  progress: number;
  state: 'idle' | 'connecting' | 'uploading' | 'success' | 'error';
  error?: string;
}

export class UploadEngine {
  /**
   * Robust upload function that prioritizes speed and reliability.
   * If resumable upload hangs for 3 seconds during connection, it falls back to a direct atomic upload.
   */
  static async upload(
    file: File,
    path: string,
    onProgress?: (update: UploadProgress) => void
  ): Promise<string> {
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const fullPath = `${path}/${fileName}`;
    const storageRef = ref(storage, fullPath);

    return new Promise((resolve, reject) => {
      let timeoutId: any = null;
      let isCompleted = false;

      const finish = (url: string) => {
        if (isCompleted) return;
        isCompleted = true;
        if (timeoutId) clearTimeout(timeoutId);
        onProgress?.({ progress: 100, state: 'success' });
        resolve(url);
      };

      const fail = (err: string) => {
        if (isCompleted) return;
        isCompleted = true;
        if (timeoutId) clearTimeout(timeoutId);
        onProgress?.({ progress: 0, state: 'error', error: err });
        reject(new Error(err));
      };

      // Initial connecting state
      onProgress?.({ progress: 0, state: 'connecting' });

      // Start resumable upload
      const uploadTask = uploadBytesResumable(storageRef, file);

      // Aggrersive 3s timeout for the initial connection/session creation
      timeoutId = setTimeout(async () => {
        if (uploadTask.snapshot.bytesTransferred === 0 && uploadTask.snapshot.state !== 'success') {
          console.warn('[UploadEngine] Resumable upload slow to connect, attempting atomic fallback...');
          uploadTask.cancel();

          try {
            onProgress?.({ progress: 10, state: 'uploading' }); // Fake progress to show activity
            const snapshot = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snapshot.ref);
            finish(url);
          } catch (err: any) {
            fail(err.message || 'Atomic fallback failed');
          }
        }
      }, 3000);

      uploadTask.on('state_changed',
        (snapshot) => {
          if (isCompleted) return;

          const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress?.({
            progress: p,
            state: snapshot.state === 'running' ? 'uploading' : 'connecting'
          });

          // If we see movement, clear the fallback timeout
          if (snapshot.bytesTransferred > 0 && timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
        },
        (error) => {
          if (isCompleted) return;
          if (error.code === 'storage/canceled') return; // Handled by fallback logic or user
          fail(error.message);
        },
        async () => {
          if (isCompleted) return;
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            finish(url);
          } catch (err: any) {
            fail('Failed to retrieve download URL');
          }
        }
      );
    });
  }
}
