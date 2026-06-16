import { useState, useCallback } from 'react';
import { useUploadContext } from '../contexts/UploadContext';
import { UploadOptions, UploadStatus } from '../engines/upload/UploadEngine';

export interface UseUploadReturn {
  upload: (file: File, options: UploadOptions) => Promise<string>;
  progress: number;
  status: UploadStatus;
  error?: string;
  downloadUrl?: string;
  isUploading: boolean;
  reset: () => void;
  uploadId?: string;
}

export const useUpload = (): UseUploadReturn => {
  const { startUpload, uploads, clearUpload } = useUploadContext();
  const [currentId, setCurrentId] = useState<string | undefined>(undefined);

  const activeUpload = currentId ? uploads[currentId] : undefined;

  const upload = useCallback(async (file: File, options: UploadOptions): Promise<string> => {
    try {
      const { uploadId, promise } = startUpload(file, options);
      setCurrentId(uploadId);
      return await promise;
    } catch (err) {
      throw err;
    }
  }, [startUpload]);

  return {
    upload,
    progress: activeUpload?.progress || 0,
    status: activeUpload?.status || 'IDLE',
    error: activeUpload?.error,
    downloadUrl: activeUpload?.downloadUrl,
    isUploading: activeUpload?.status === 'UPLOADING',
    reset: () => {
      if (currentId) {
        clearUpload(currentId);
        setCurrentId(undefined);
      }
    },
    uploadId: currentId
  };
};
