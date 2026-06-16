import React, { useState } from 'react';
import { storage, auth } from '../../firebase/config';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Terminal, Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const UploadTest: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'IDLE' | 'UPLOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const startUpload = () => {
    if (!file) return;

    const user = auth.currentUser;
    if (!user) {
      setStatus('ERROR');
      setError('You must be logged in to upload.');
      return;
    }

    setStatus('UPLOADING');
    setProgress(0);
    setError(null);

    const storageRef = ref(storage, `test-uploads/${user.uid}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(p);
      },
      (err) => {
        console.error('Upload error:', err);
        setStatus('ERROR');
        setError(err.message);
      },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        setDownloadUrl(url);
        setStatus('SUCCESS');
      }
    );
  };

  return (
    <div className="p-8 space-y-8 max-w-2xl mx-auto bg-surface border border-border rounded-3xl my-10">
      <div className="flex items-center gap-4 border-b border-border pb-6">
        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          <Terminal size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold uppercase italic">Upload System Integrity Test</h1>
          <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Direct Firebase Storage Path</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-1">Select Test Asset</label>
          <input
            type="file"
            onChange={handleFileChange}
            className="w-full bg-surface-bright border border-border-bright rounded-xl p-4 text-xs font-bold"
          />
        </div>

        <button
          onClick={startUpload}
          disabled={!file || status === 'UPLOADING'}
          className="w-full h-14 bg-primary text-text-primary rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
        >
          {status === 'UPLOADING' ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
          Execute Upload Sequence
        </button>

        {status === 'UPLOADING' && (
          <div className="space-y-3">
            <div className="h-2 w-full bg-surface-bright rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-center text-[10px] font-black text-primary uppercase tracking-widest">
              Uploading: {Math.round(progress)}%
            </p>
          </div>
        )}

        {status === 'SUCCESS' && (
          <div className="p-6 bg-success/5 border border-success/20 rounded-2xl space-y-4">
            <div className="flex items-center gap-3 text-success">
              <CheckCircle2 size={20} />
              <p className="text-xs font-bold uppercase tracking-widest">Upload Integrity Verified</p>
            </div>
            <div className="aspect-video rounded-xl overflow-hidden border border-border bg-black">
              <img src={downloadUrl!} className="w-full h-full object-contain" alt="Uploaded" />
            </div>
            <p className="text-[9px] font-mono text-text-tertiary break-all bg-surface p-3 rounded-lg border border-border">
              {downloadUrl}
            </p>
          </div>
        )}

        {status === 'ERROR' && (
          <div className="p-6 bg-danger/5 border border-danger/20 rounded-2xl flex items-center gap-3 text-danger">
            <AlertCircle size={20} />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest">Sequence Fault</p>
              <p className="text-[10px] font-medium opacity-80">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadTest;
