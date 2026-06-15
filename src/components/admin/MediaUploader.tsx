import React, { useState } from 'react';
import { Upload, X, CheckCircle2, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils';
import { UploadEngine, UploadState } from '../../engines/upload/UploadEngine';
import toast from 'react-hot-toast';

interface MediaUploaderProps {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  path: string;
  aspectRatio?: 'video' | 'square' | 'any';
  maxSizeMB?: number;
}

const MediaUploader: React.FC<MediaUploaderProps> = ({
  label,
  value,
  onChange,
  path,
  aspectRatio = 'any',
  maxSizeMB = 10
}) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    progress: 0,
    state: 'IDLE'
  });

  const isUploading = ['INITIALIZING', 'UPLOADING', 'FINALIZING'].includes(uploadState.state);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await UploadEngine.startUpload(
        file,
        { path, maxSizeMB },
        (state) => setUploadState(state)
      );

      onChange(url);
      toast.success('Media successfully synced');
    } catch (err: any) {
      console.error('[MediaUploader] Upload sequence failed:', err);
      toast.error(err.message || 'Upload failed');
      setUploadState(prev => ({ ...prev, state: 'ERROR', error: err.message }));
    }
  };

  const reset = () => {
    setUploadState({ progress: 0, state: 'IDLE' });
  };

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-[0.25em] text-text-tertiary ml-1">{label}</label>

      <div className={cn(
        "relative group border-2 border-dashed rounded-[2rem] overflow-hidden transition-all duration-500",
        value ? "border-success/30 bg-success/[0.02]" :
        uploadState.state === 'ERROR' ? "border-danger/30 bg-danger/[0.01]" :
        "border-border bg-surface-bright/30 hover:border-primary/30 hover:bg-surface-bright/50",
        aspectRatio === 'video' ? "aspect-video" : aspectRatio === 'square' ? "aspect-square" : "min-h-[160px]"
      )}>
        <AnimatePresence mode="wait">
          {value ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              <img src={value} alt="Preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                 <button
                   type="button"
                   onClick={() => onChange('')}
                   className="p-4 bg-danger text-text-primary rounded-2xl hover:scale-110 transition-transform shadow-2xl"
                 >
                    <X size={20} />
                 </button>
              </div>
              <div className="absolute top-6 right-6 p-2 bg-success text-text-primary rounded-xl shadow-lg border border-success/20">
                 <CheckCircle2 size={14} />
              </div>
            </motion.div>
          ) : (
            <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer p-8 text-center">
              <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={isUploading} />

              {isUploading ? (
                <div className="space-y-6 flex flex-col items-center w-full max-w-[200px]">
                   <div className="relative">
                      <Loader2 size={40} className="text-primary animate-spin" />
                      <div className="absolute inset-0 bg-primary/20 blur-xl animate-pulse" />
                   </div>
                   <div className="w-full space-y-2">
                      <div className="h-1.5 w-full bg-surface-glass rounded-full overflow-hidden">
                         <motion.div
                           className="h-full bg-primary"
                           initial={{ width: 0 }}
                           animate={{ width: `${uploadState.progress}%` }}
                           transition={{ duration: 0.3 }}
                         />
                      </div>
                      <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                        {uploadState.state === 'INITIALIZING' ? 'Connecting...' :
                         uploadState.state === 'FINALIZING' ? 'Finalizing...' :
                         `${Math.round(uploadState.progress)}% Uploaded`}
                      </p>
                   </div>
                </div>
              ) : uploadState.state === 'ERROR' ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4 flex flex-col items-center px-6"
                >
                   <div className="w-14 h-14 rounded-2xl bg-danger/10 flex items-center justify-center text-danger">
                      <AlertCircle size={28} />
                   </div>
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-danger uppercase tracking-widest">{uploadState.error || 'System Error'}</p>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); reset(); }}
                        className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-text-tertiary hover:text-text-primary mx-auto transition-colors"
                      >
                        <RefreshCw size={12} />
                        Retry Upload
                      </button>
                   </div>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-16 h-16 rounded-[2rem] bg-surface-glass border border-border flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-primary/40 group-hover:bg-primary/5 transition-all duration-500">
                    <Upload size={24} className="text-text-tertiary group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-xs font-black text-text-secondary uppercase tracking-[0.1em] group-hover:text-text-primary transition-colors">Select Asset to Upload</p>
                  <p className="text-[9px] font-bold text-text-tertiary/40 uppercase tracking-[0.2em] mt-2">JPG, PNG or WEBP (Max {maxSizeMB}MB)</p>
                </motion.div>
              )}
            </label>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MediaUploader;
