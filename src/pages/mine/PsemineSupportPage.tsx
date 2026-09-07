import { FormEvent, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { CircleHelp, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { PsemineLayout } from '../../components/mine/PsemineLayout';
import { db } from '../../firebase/config';
import { usePsemineAuth } from '../../contexts/PsemineAuthContext';

export default function PsemineSupportPage() {
  const { currentUser } = usePsemineAuth();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser || message.trim().length < 10) { toast.error('Please enter at least 10 characters.'); return; }
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'psemine_support'), { userId: currentUser.uid, email: currentUser.email, message: message.trim(), status: 'open', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      setMessage('');
      toast.success('Support request submitted');
    } catch { toast.error('Support is unavailable right now.'); } finally { setSubmitting(false); }
  };
  return <PsemineLayout><div className="mx-auto max-w-2xl py-8"><div className="psemine-kicker flex items-center gap-2"><CircleHelp size={14} /> PSEmine support</div><h1 className="mt-4 text-4xl font-black tracking-tight text-[#f4f7f2]">How can we help?</h1><p className="mt-4 text-sm leading-7 text-[#9ca8ac]">Questions about mining, tools, payments, referrals, wallets, or account security create a real support record for the PSEmine team.</p><form onSubmit={submit} className="psemine-panel mt-10 rounded-3xl p-6 sm:p-8"><label htmlFor="support-message" className="text-xs font-bold uppercase tracking-widest text-[#9ca8ac]">Describe the issue</label><textarea id="support-message" value={message} onChange={(event) => setMessage(event.target.value)} rows={7} minLength={10} className="mt-3 w-full resize-y rounded-2xl border border-white/10 bg-[#080b10] p-4 text-sm leading-6 text-[#f4f7f2] outline-none transition focus:border-[#f0aa3e]" placeholder="Tell us what happened..." /><button disabled={submitting} className="psemine-button-primary mt-4 flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50"><Send size={15} /> {submitting ? 'Submitting...' : 'Submit request'}</button></form></div></PsemineLayout>;
}
