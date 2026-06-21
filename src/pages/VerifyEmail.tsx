import React, { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { Mail, RefreshCw, LogOut, Loader2, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useNavigate, Navigate, Link, useSearchParams } from 'react-router-dom';
import { auth } from '../firebase/config';
import { applyActionCode } from 'firebase/auth';

const VerifyEmail: React.FC = () => {
  const { currentUser, logout, sendVerification } = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const mode = searchParams.get('mode');
    const oobCode = searchParams.get('oobCode');

    if (mode === 'verifyEmail' && oobCode) {
      handleAutoVerify(oobCode);
    }
  }, [searchParams]);

  const handleAutoVerify = async (code: string) => {
    setIsVerifying(true);
    try {
      await applyActionCode(auth, code);
      toast.success('Email verified automatically!');
      await auth.currentUser?.reload();
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Auto-verification failed:', error);
      toast.error('Invalid or expired verification link.');
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleResend = async () => {
    if (countdown > 0) return;
    setIsSending(true);
    try {
      await sendVerification();
      toast.success('Verification email sent!');
      setCountdown(60);
    } catch (error) {
      toast.error('Too many requests. Please wait.');
    } finally {
      setIsSending(false);
    }
  };

  const checkStatus = async () => {
    setIsChecking(true);
    try {
      await auth.currentUser?.reload();
      if (auth.currentUser?.emailVerified) {
        toast.success('Email verified successfully!');
        navigate('/dashboard');
      } else {
        toast.error('Still pending verification.');
      }
    } finally {
      setIsChecking(false);
    }
  };

  if (!currentUser && !searchParams.get('oobCode')) return <Navigate to="/login" replace />;

  // Bypass for admin
  const isAdmin = currentUser?.email?.toLowerCase() === import.meta.env.VITE_ADMIN_EMAIL;
  if ((currentUser?.emailVerified || isAdmin) && !searchParams.get('oobCode')) {
    const target = isAdmin ? '/admin' : '/dashboard';
    return <Navigate to={target} replace />;
  }

  return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center px-6 py-20 relative overflow-hidden">
        {/* Background depth */}
        <div className="absolute inset-0 -z-10">
           <div className="absolute top-1/4 right-1/4 w-[35rem] h-[30rem] bg-primary/10 rounded-full blur-[160px]" />
           <div className="absolute bottom-1/4 left-1/4 w-[35rem] h-[30rem] bg-accent/5 rounded-full blur-[160px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <div className="glass-card p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden text-center">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />

            <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-8 shadow-xl">
               {isVerifying ? (
                 <Loader2 className="text-primary animate-spin" size={40} />
               ) : (
                 <Mail className="text-primary animate-bounce" size={40} />
               )}
            </div>

            <h1 className="text-3xl font-bold mb-4 tracking-tight text-text-primary">
              {isVerifying ? 'Verifying Account...' : 'Verify Your Email'}
            </h1>
            <p className="text-text-primary/50 text-sm mb-8 leading-relaxed">
              {isVerifying
                ? 'Please wait while we confirm your email address.'
                : (currentUser ? (
                  <>We've sent a verification link to <span className="text-text-primary font-bold">{currentUser.email}</span>. Please click the link in your email to activate your account.</>
                ) : (
                  'Please sign in to your account after verification is complete.'
                ))
              }
            </p>

            <div className="space-y-4">
               <Button
                onClick={currentUser ? checkStatus : () => navigate('/login')}
                disabled={isChecking || isVerifying}
                className="w-full py-4 rounded-xl shadow-lg text-xs uppercase tracking-widest font-bold"
               >
                  {isChecking ? <Loader2 className="animate-spin" size={16} /> : (currentUser ? 'I have verified my email' : 'Sign In to Account')}
               </Button>

               {currentUser && (
                 <button
                  onClick={handleResend}
                  disabled={isSending || countdown > 0}
                  className="w-full py-4 rounded-xl bg-surface-bright border border-border-bright text-text-secondary hover:text-text-primary hover:bg-surface-accent transition-all text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                 >
                    {isSending ? <RefreshCw className="animate-spin" size={16} /> : null}
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Email'}
                 </button>
               )}
            </div>

            <div className="mt-10 pt-8 border-t border-border-bright space-y-6">
               <div className="grid grid-cols-1 gap-4 text-left">
                  <div className="flex gap-4 p-4 rounded-2xl bg-surface-bright border border-border">
                     <CheckCircle2 size={20} className="text-success shrink-0" />
                     <div>
                        <p className="text-[11px] font-bold text-text-primary/80 uppercase">No email received?</p>
                        <p className="text-[10px] text-text-primary/30 mt-1 leading-relaxed">Check your spam folder or try resending the verification link.</p>
                     </div>
                  </div>
                  <div className="flex gap-4 p-4 rounded-2xl bg-surface-bright border border-border">
                     <AlertTriangle size={20} className="text-orange-500 shrink-0" />
                     <div>
                        <p className="text-[11px] font-bold text-text-primary/80 uppercase">Expired link?</p>
                        <p className="text-[10px] text-text-primary/30 mt-1 leading-relaxed">Verification links are valid for 24 hours. Request a new link if needed.</p>
                     </div>
                  </div>
               </div>

               <div className="flex flex-col gap-4 items-center pt-4">
                  <button
                    onClick={() => logout()}
                    className="flex items-center gap-2 text-red-500/60 hover:text-red-500 transition-colors text-[10px] font-bold uppercase tracking-widest"
                  >
                     <LogOut size={14} />
                     Sign Out and try another email
                  </button>
                  <Link to="/support" className="flex items-center gap-2 text-text-tertiary hover:text-text-primary transition-colors text-[10px] font-bold uppercase tracking-widest">
                     <HelpCircle size={14} />
                     Support Hub
                  </Link>
               </div>
            </div>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default VerifyEmail;
