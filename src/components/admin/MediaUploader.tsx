import React, { useState } from 'react';
import { Upload, X, CheckCircle2, Loader2 } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase/config';
import { cn } from '../../utils';
import toast from 'react-hot-toast';

interface MediaUploaderProps {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  path: string;
  aspectRatio?: 'video' | 'square' | 'any';
}

const MediaUploader: React.FC<MediaUploaderProps> = ({ label, value, onChange, path, aspectRatio = 'any' }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    console.log(`[MediaUploader] Initiating upload for: ${file.name} (${file.size} bytes)`);

    // 1. Validation
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      return toast.error('Please select a valid media file (image/video)');
    }

    if (file.size > 10 * 1024 * 1024) {
      return toast.error('File size must be under 10MB');
    }

    setIsUploading(true);
    setProgress(0);

    // Create a controller for the timeout
    let timeoutId: any = null;

    try {
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const fullPath = `${path}/${fileName}`;

      // Ensure storage is initialized
      if (!storage) {
        throw new Error('Storage service not initialized');
      }

      const storageRef = ref(storage, fullPath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      // Timeout logic
      timeoutId = setTimeout(() => {
        if (isUploading && progress === 0) {
          uploadTask.cancel();
          const err = 'Upload timed out at 0%. Please check your connection or storage permissions.';
          console.error('[MediaUploader] Timeout:', err);
          setError(err);
          toast.error(err);
          setIsUploading(false);
        }
      }, 15000); // 15s for 0% hang detection

      uploadTask.on('state_changed',
        (snapshot) => {
          const p = snapshot.totalBytes > 0
            ? (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            : 0;

          console.log(`[MediaUploader] Progress: ${Math.round(p)}% (State: ${snapshot.state})`);
          setProgress(p);

          // Reset timeout if we're moving
          if (p > 0 && timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
        },
        (error) => {
          if (timeoutId) clearTimeout(timeoutId);
          console.error('[MediaUploader] Upload Task Error:', error.code, error.message);

          let msg = 'Upload failed';
          if (error.code === 'storage/unauthorized') msg = 'Storage Access Denied: Please check permissions.';
          if (error.code === 'storage/canceled') msg = 'Upload canceled.';

          setError(msg);
          toast.error(msg);
          setIsUploading(false);
          setProgress(0);
        },
        async () => {
          if (timeoutId) clearTimeout(timeoutId);
          try {
            console.log('[MediaUploader] Finalizing upload...');
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('[MediaUploader] Success! URL:', downloadURL);

            onChange(downloadURL);
            toast.success('Media uploaded successfully');
            setIsUploading(false);
            setProgress(100);
          } catch (err: any) {
            console.error('[MediaUploader] URL Finalization Error:', err);
            setError('Failed to finalize file URL');
            toast.error('Failed to retrieve file URL');
            setIsUploading(false);
          }
        }
      );

    } catch (err: any) {
      if (timeoutId) clearTimeout(timeoutId);
      console.error('[MediaUploader] Initialization Error:', err);
      toast.error(`Failed to initialize: ${err.message}`);
      setIsUploading(false);
      setProgress(0);
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
            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={isUploading} />
            {isUploading ? (
              <div className="space-y-4 flex flex-col items-center">
                 <Loader2 size={32} className="text-primary animate-spin" />
                 <div className="w-32 h-1.5 bg-surface-glass rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                 </div>
                 <p className="text-[10px] font-bold text-primary uppercase tracking-widest">
                   {progress === 0 ? 'Connecting...' : `${Math.round(progress)}% Uploaded`}
                 </p>
              </div>
            ) : error ? (
              <div className="space-y-4 flex flex-col items-center px-6">
                 <X size={32} className="text-danger" />
                 <p className="text-[10px] font-bold text-danger uppercase tracking-widest text-center">{error}</p>
                 <button
                   type="button"
                   onClick={(e) => { e.preventDefault(); setError(null); }}
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
                <p className="text-[9px] font-medium text-text-tertiary/50 uppercase tracking-widest mt-1">JPG, PNG or WEBP (Max 5MB)</p>
              </>
            )}
          </label>
        )}
      </div>
    </div>
  );
};

export default MediaUploader;
