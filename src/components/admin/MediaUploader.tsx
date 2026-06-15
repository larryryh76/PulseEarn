import React, { useState } from 'react';
import { Upload, X, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils';
import { UploadEngine } from '../../engines/system/UploadEngine';
import toast from 'react-hot-toast';

interface MediaUploaderProps {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  path: string;
  aspectRatio?: 'video' | 'square' | 'any';
}

type Status = 'idle' | 'busy' | 'error';

const MediaUploader: React.FC<MediaUploaderProps> = ({ label, value, onChange, path, aspectRatio = 'any' }) => {
  const [status, setStatus] = useState<Status>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Fast validation
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      return toast.error('Invalid file type');
    }

    if (file.size > 10 * 1024 * 1024) {
      return toast.error('File too large (Max 10MB)');
    }

    setStatus('busy');
    setStatusMsg('Initializing...');

    try {
      const result = await UploadEngine.upload(file, path, (s, msg) => {
        if (s === 'uploading') setStatusMsg('Uploading to Storage...');
        if (s === 'finalizing') setStatusMsg('Generating URL...');
        if (msg) setStatusMsg(msg);
      });

      onChange(result.url);
      setStatus('idle');
      toast.success('Asset Ready');
    } catch (err: any) {
      setStatus('error');
      setStatusMsg(err.message || 'Upload failed');
      toast.error('Upload Failed');
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-tertiary ml-1">{label}</label>

      <div className={cn(
        "relative group border-2 border-dashed rounded-3xl overflow-hidden transition-all duration-500",
        value ? "border-success/30 bg-success/[0.02]" :
        status === 'error' ? "border-danger/30 bg-danger/[0.02]" :
        "border-border bg-surface-bright/50 hover:border-primary/30 hover:bg-surface-bright",
        aspectRatio === 'video' ? "aspect-video" : aspectRatio === 'square' ? "aspect-square" : "min-h-[140px]"
      )}>
        {value ? (
          <>
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
               <button
                 type="button"
                 onClick={() => onChange('')}
                 className="p-4 bg-danger text-text-primary rounded-2xl hover:scale-110 transition-transform shadow-xl"
               >
                  <X size={20} />
               </button>
            </div>
            <div className="absolute top-6 right-6 p-2.5 bg-success text-text-primary rounded-xl shadow-lg">
               <CheckCircle2 size={16} />
            </div>
          </>
        ) : (
          <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer p-8 text-center">
            <input type="file" className="hidden" accept="image/*,video/*" onChange={handleUpload} disabled={status === 'busy'} />

            {status === 'busy' ? (
              <div className="space-y-4 flex flex-col items-center">
                 <div className="relative">
                    <Loader2 size={40} className="text-primary animate-spin" />
                    <div className="absolute inset-0 bg-primary/20 blur-xl animate-pulse" />
                 </div>
                 <p className="text-[10px] font-black text-primary uppercase tracking-[0.25em] animate-pulse">
                   {statusMsg}
                 </p>
              </div>
            ) : status === 'error' ? (
              <div className="space-y-4 flex flex-col items-center px-6">
                 <div className="w-16 h-16 rounded-3xl bg-danger/10 flex items-center justify-center text-danger mb-2">
                    <AlertCircle size={32} />
                 </div>
                 <p className="text-[10px] font-black text-danger uppercase tracking-[0.2em]">{statusMsg}</p>
                 <button
                   type="button"
                   onClick={(e) => { e.preventDefault(); setStatus('idle'); }}
                   className="badge-system border-danger/20 text-danger hover:bg-danger/5"
                 >
                   Retry Upload
                 </button>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center"
              >
                <div className="w-16 h-16 rounded-[2rem] bg-surface-glass border border-border flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-primary/30 group-hover:bg-primary/5 transition-all duration-500">
                  <Upload size={24} className="text-text-tertiary group-hover:text-primary transition-colors" />
                </div>
                <p className="text-xs font-black text-text-secondary uppercase tracking-widest group-hover:text-text-primary transition-colors">Upload Media</p>
                <p className="text-[9px] font-bold text-text-tertiary/40 uppercase tracking-[0.15em] mt-2">Maximum File Size: 10MB</p>
              </motion.div>
            )}
          </label>
        )}
      </div>
    </div>
  );
};

export default MediaUploader;
