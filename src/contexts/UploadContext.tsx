import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { UploadProgress, UploadOptions, UploadEngineV2 } from '../engines/upload/UploadEngineV2';

interface StartUploadResult {
  uploadId: string;
  promise: Promise<string>;
}

interface UploadContextType {
  uploads: Record<string, UploadProgress>;
  startUpload: (file: File, options: UploadOptions) => StartUploadResult;
  cancelUpload: (uploadId: string) => void;
  removeUpload: (uploadId: string) => void;
  clearCompleted: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export const useUploadContext = () => {
  const context = useContext(UploadContext);
  if (!context) throw new Error('useUploadContext must be used within an UploadProvider');
  return context;
};

export const UploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [uploads, setUploads] = useState<Record<string, UploadProgress>>({});
  const tasksRef = useRef<Record<string, () => void>>({});

  const updateUpload = useCallback((id: string, update: Partial<UploadProgress>) => {
    setUploads(prev => ({
      ...prev,
      [id]: { ...prev[id], ...update } as UploadProgress
    }));
  }, []);

  const startUpload = useCallback((file: File, options: UploadOptions): StartUploadResult => {
    let currentUploadId: string = '';

    const promise = new Promise<string>((resolve, reject) => {
      try {
        const { uploadId, cancel } = UploadEngineV2.startUpload(file, options, (progress) => {
          updateUpload(progress.id, progress);

          if (progress.status === 'SUCCESS' && progress.downloadUrl) {
            resolve(progress.downloadUrl);
          }

          if (progress.status === 'ERROR') {
            reject(new Error(progress.error));
          }

          if (progress.status === 'CANCELLED') {
            reject(new Error('Upload cancelled'));
          }
        });

        currentUploadId = uploadId;
        tasksRef.current[uploadId] = cancel;
      } catch (err) {
        reject(err);
      }
    });

    return { uploadId: currentUploadId, promise };
  }, [updateUpload]);

  const cancelUpload = useCallback((uploadId: string) => {
    if (tasksRef.current[uploadId]) {
      tasksRef.current[uploadId]();
      delete tasksRef.current[uploadId];
    }
  }, []);

  const removeUpload = useCallback((uploadId: string) => {
    setUploads(prev => {
      const next = { ...prev };
      delete next[uploadId];
      return next;
    });
  }, []);

  const clearCompleted = useCallback(() => {
    setUploads(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        if (['SUCCESS', 'ERROR', 'CANCELLED'].includes(next[id].status)) {
          delete next[id];
        }
      });
      return next;
    });
  }, []);

  return (
    <UploadContext.Provider value={{ uploads, startUpload, cancelUpload, removeUpload, clearCompleted }}>
      {children}
    </UploadContext.Provider>
  );
};
