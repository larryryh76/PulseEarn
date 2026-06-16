import React, { createContext, useContext, useState, useCallback } from 'react';
import { UploadProgress, UploadOptions, UploadEngine } from '../engines/upload/UploadEngine';

interface UploadContextType {
  uploads: Record<string, UploadProgress>;
  startUpload: (file: File, options: UploadOptions) => { uploadId: string; promise: Promise<string> };
  clearUpload: (id: string) => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export const useUploadContext = () => {
  const context = useContext(UploadContext);
  if (!context) throw new Error('useUploadContext must be used within an UploadProvider');
  return context;
};

export const UploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [uploads, setUploads] = useState<Record<string, UploadProgress>>({});

  const startUpload = useCallback((file: File, options: UploadOptions) => {
    return UploadEngine.startUpload(file, options, (progress) => {
      setUploads(prev => ({
        ...prev,
        [progress.id]: progress
      }));
    });
  }, []);

  const clearUpload = useCallback((id: string) => {
    setUploads(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  return (
    <UploadContext.Provider value={{ uploads, startUpload, clearUpload }}>
      {children}
    </UploadContext.Provider>
  );
};
