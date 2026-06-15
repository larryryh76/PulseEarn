import React, { useState } from 'react';
import { Upload, X, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../../utils';
import { UploadEngine, UploadProgress } from '../../engines/system/UploadEngine';
import toast from 'react-hot-toast';

interface MediaUploaderProps {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  path: string;
  aspectRatio?: 'video' | 'square' | 'any';
}

const MediaUploader: React.FC<MediaUploaderProps> = ({ label, value, onChange, path, aspectRatio = 'any' }) => {
  const [uploadState, setUploadState] = useState<UploadProgress>({
    progress: 0,
    state: 'idle'
  });

  const isUploading = uploadState.state === 'connecting' || uploadState.state === 'uploading';

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      return toast.error('Please select a valid media file (image/video)');
    }

    if (file.size > 10 * 1024 * 1024) {
      return toast.error('File size must be under 10MB');
    }

    try {
      const url = await UploadEngine.upload(file, path, (progress) => {
        setUploadState(progress);
      });

      onChange(url);
      toast.success('Media uploaded successfully');
    } catch (err: any) {
      console.error('[MediaUploader] Upload Error:', err);
      toast.error(err.message || 'Upload failed');
      setUploadState({ progress: 0, state: 'error', error: err.message });
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary ml-1">{label}</label>

      <div className={cn(
        "relative group border-2 border-dashed rounded-2xl overflow-hidden transition-all",
        value ? "border-success/20 bg-success/[0.02]" : "border-border bg-surface-bright hover:border-primary/20",
        aspectRatio === 'video' ? "aspect-video" : aspectRatio === 'square' ? "aspect-square" : "min-h-[120px]"
      )}>
        {value ? (
          <>
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
               <button
                 type="button"
                 onClick={() => onChange('')}
                 className="p-3 bg-danger text-text-primary rounded-xl hover:scale-110 transition-transform"
               >
                  <X size={18} />
               </button>
            </div>
            <div className="absolute top-4 right-4 p-2 bg-success text-text-primary rounded-lg">
               <CheckCircle2 size={14} />
            </div>
          </>
        ) : (
          <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer p-6 text-center">
            <input type="file" className="hidden" accept="image/*,video/*" onChange={handleUpload} disabled={isUploading} />
            {isUploading ? (
              <div className="space-y-4 flex flex-col items-center">
                 <Loader2 size={32} className="text-primary animate-spin" />
                 <div className="w-32 h-1.5 bg-surface-glass rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadState.progress}%` }} />
                 </div>
                 <p className="text-[10px] font-bold text-primary uppercase tracking-widest">
                   {uploadState.state === 'connecting' ? 'Connecting...' : `${Math.round(uploadState.progress)}% Uploaded`}
                 </p>
              </div>
            ) : uploadState.state === 'error' ? (
              <div className="space-y-4 flex flex-col items-center px-6">
                 <AlertCircle size={32} className="text-danger" />
                 <p className="text-[10px] font-bold text-danger uppercase tracking-widest text-center">{uploadState.error || 'Upload failed'}</p>
                 <button
                   type="button"
                   onClick={(e) => { e.preventDefault(); setUploadState({ progress: 0, state: 'idle' }); }}
                   className="text-[9px] font-black uppercase tracking-widest text-text-tertiary hover:text-text-primary underline"
                 >
                   Try Again
                 </button>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-surface-glass flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                  <Upload size={20} className="text-text-tertiary group-hover:text-primary transition-colors" />
                </div>
                <p className="text-xs font-bold text-text-secondary group-hover:text-text-primary transition-colors">Select Asset to Upload</p>
                <p className="text-[9px] font-medium text-text-tertiary/50 uppercase tracking-widest mt-1">JPG, PNG, WEBP or MP4 (Max 10MB)</p>
              </>
            )}
          </label>
        )}
      </div>
    </div>
  );
};

export default MediaUploader;
