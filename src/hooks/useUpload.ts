import { useState, useCallback, useRef } from 'react';
import { UploadService, UploadOptions, UploadProgress, UploadStatus } from '../engines/upload/UploadService';

export interface UseUploadReturn {
  upload: (file: File, options: UploadOptions) => Promise<string>;
  cancel: () => void;
  progress: number;
  status: UploadStatus;
  error?: string;
  downloadUrl?: string;
  isUploading: boolean;
  reset: () => void;
}

export const useUpload = (): UseUploadReturn => {
  const [state, setState] = useState<UploadProgress>({
    progress: 0,
    bytesTransferred: 0,
    totalBytes: 0,
    status: 'IDLE'
  });

  const cancelRef = useRef<(() => void) | null>(null);

  const reset = useCallback(() => {
    setState({
      progress: 0,
      bytesTransferred: 0,
      totalBytes: 0,
      status: 'IDLE'
    });
    cancelRef.current = null;
  }, []);

  const upload = useCallback(async (file: File, options: UploadOptions): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const { cancel } = UploadService.startUpload(file, options, (progress) => {
          setState(progress);

          if (progress.status === 'SUCCESS' && progress.downloadUrl) {
            resolve(progress.downloadUrl);
          }

          if (progress.status === 'ERROR') {
            reject(new Error(progress.error));
          }

          if (progress.status === 'CANCELLED') {
            reject(new Error('Upload cancelled by user'));
          }
        });

        cancelRef.current = cancel;
      } catch (err) {
        reject(err);
      }
    });
  }, []);

  const cancel = useCallback(() => {
    if (cancelRef.current) {
      cancelRef.current();
    }
  }, []);

  return {
    upload,
    cancel,
    progress: state.progress,
    status: state.status,
    error: state.error,
    downloadUrl: state.downloadUrl,
    isUploading: ['VALIDATING', 'UPLOADING', 'FINALIZING'].includes(state.status),
    reset
  };
};
