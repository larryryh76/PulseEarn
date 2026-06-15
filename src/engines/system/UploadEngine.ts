import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase/config';

export interface UploadResult {
  url: string;
  fileName: string;
}

export class UploadEngine {
  /**
   * High-speed atomic upload. Bypasses resumable sessions for maximum reliability
   * in production environments. Enforces a 10s hard timeout.
   */
  static async upload(
    file: File,
    path: string,
    onStatus?: (status: 'starting' | 'uploading' | 'finalizing' | 'success' | 'error', msg?: string) => void
  ): Promise<UploadResult> {
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const fullPath = `${path}/${fileName}`;
    const storageRef = ref(storage, fullPath);

    onStatus?.('starting');

    const uploadPromise = (async () => {
      onStatus?.('uploading');
      const snapshot = await uploadBytes(storageRef, file);

      onStatus?.('finalizing');
      const url = await getDownloadURL(snapshot.ref);

      onStatus?.('success');
      return { url, fileName };
    })();

    // 10s Hard Timeout for the entire pipeline
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Upload operation timed out (10s Limit).')), 10000);
    });

    try {
      return await Promise.race([uploadPromise, timeoutPromise]);
    } catch (err: any) {
      onStatus?.('error', err.message);
      console.error('[UploadEngine] Critical Failure:', err);
      throw err;
    }
  }
}
