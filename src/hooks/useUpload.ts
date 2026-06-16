import { useState, useCallback } from 'react';
import { useUploadContext } from '../contexts/UploadContext';
import { UploadOptions, UploadStatus } from '../engines/upload/UploadEngine';

export interface UseUploadReturn {
  upload: (file: File, options: UploadOptions) => Promise<string>;
  cancel: () => void;
  progress: number;
  status: UploadStatus;
  error?: string;
  downloadUrl?: string;
  isUploading: boolean;
  reset: () => void;
  uploadId?: string;
}

export const useUpload = (): UseUploadReturn => {
  const { startUpload, cancelUpload, uploads, removeUpload } = useUploadContext();
  const [currentUploadId, setCurrentUploadId] = useState<string | undefined>(undefined);

  const activeUpload = currentUploadId ? uploads[currentUploadId] : undefined;

  const upload = useCallback(async (file: File, options: UploadOptions): Promise<string> => {
    const { uploadId, promise } = startUpload(file, options);
    setCurrentUploadId(uploadId);

    try {
      return await promise;
    } catch (err) {
      throw err;
    }
  }, [startUpload]);

  const cancel = useCallback(() => {
    if (currentUploadId) {
      cancelUpload(currentUploadId);
    }
  }, [currentUploadId, cancelUpload]);

  const reset = useCallback(() => {
    if (currentUploadId) {
      removeUpload(currentUploadId);
      setCurrentUploadId(undefined);
    }
  }, [currentUploadId, removeUpload]);

  return {
    upload,
    cancel,
    progress: activeUpload?.progress || 0,
    status: activeUpload?.status || 'IDLE',
    error: activeUpload?.error,
    downloadUrl: activeUpload?.downloadUrl,
    isUploading: activeUpload ? ['VALIDATING', 'UPLOADING', 'FINALIZING'].includes(activeUpload.status) : false,
    reset,
    uploadId: currentUploadId
  };
};
