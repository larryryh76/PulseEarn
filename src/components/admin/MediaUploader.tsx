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
  const [isUploading, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return toast.error('Please select an image file');
    }

    if (file.size > 5 * 1024 * 1024) {
      return toast.error('File size must be under 5MB');
    }

    setIsSubmitting(true);
    const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
      (snapshot) => {
        const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(p);
      },
      (error) => {
        console.error(error);
        toast.error('Upload failed');
        setIsSubmitting(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        onChange(downloadURL);
        setIsSubmitting(false);
        toast.success('Media uploaded successfully');
      }
    );
  };

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">{label}</label>

      <div className={cn(
        "relative group border-2 border-dashed rounded-2xl overflow-hidden transition-all",
        value ? "border-success/20 bg-success/[0.02]" : "border-white/5 bg-white/[0.02] hover:border-primary/20",
        aspectRatio === 'video' ? "aspect-video" : aspectRatio === 'square' ? "aspect-square" : "min-h-[120px]"
      )}>
        {value ? (
          <>
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
               <button
                 type="button"
                 onClick={() => onChange('')}
                 className="p-3 bg-danger text-white rounded-xl hover:scale-110 transition-transform"
               >
                  <X size={18} />
               </button>
            </div>
            <div className="absolute top-4 right-4 p-2 bg-success text-white rounded-lg">
               <CheckCircle2 size={14} />
            </div>
          </>
        ) : (
          <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer p-6 text-center">
            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={isUploading} />
            {isUploading ? (
              <div className="space-y-4 flex flex-col items-center">
                 <Loader2 size={32} className="text-primary animate-spin" />
                 <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                 </div>
                 <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{Math.round(progress)}% Uploaded</p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                  <Upload size={20} className="text-white/20 group-hover:text-primary transition-colors" />
                </div>
                <p className="text-xs font-bold text-white/40 group-hover:text-white transition-colors">Select Asset to Upload</p>
                <p className="text-[9px] font-medium text-white/10 uppercase tracking-widest mt-1">JPG, PNG or WEBP (Max 5MB)</p>
              </>
            )}
          </label>
        )}
      </div>
    </div>
  );
};

export default MediaUploader;
