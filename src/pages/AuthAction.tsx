import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  applyActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode
} from 'firebase/auth';
import { auth } from '../firebase/config';
import MainLayout from '../components/layout/MainLayout';
import { Lock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

const AuthAction: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = searchParams.get('mode');
  const actionCode = searchParams.get('oobCode');

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'reset-form'>('loading');
  const [errorMessage, setError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!mode || !actionCode) {
      setStatus('error');
      setError('Invalid or expired action link.');
      return;
    }

    handleAction();
  }, [mode, actionCode]);

  const handleAction = async () => {
    try {
      switch (mode) {
        case 'verifyEmail': {
          await applyActionCode(auth, actionCode!);
          // Reload user to sync verified state locally
          if (auth.currentUser) await auth.currentUser.reload();
          setStatus('success');
          toast.success('Email verified successfully!');
          break;
        }
        case 'resetPassword': {
          await verifyPasswordResetCode(auth, actionCode!);
          setStatus('reset-form');
          break;
        }
        default: {
          setStatus('error');
          setError('Unknown action type.');
        }
      }
    } catch (error: any) {
      console.error("[AuthAction] Error:", error.code, error.message);
      setStatus('error');
      setError(getFriendlyError(error.code));
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error('Password must be at least 6 characters.');

    setIsSubmitting(true);
    try {
      await confirmPasswordReset(auth, actionCode!, newPassword);
      setStatus('success');
      toast.success('Password updated successfully!');
    } catch (error: any) {
      console.error("[AuthAction] Reset Error:", error.code, error.message);
      toast.error(getFriendlyError(error.code));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFriendlyError = (code: string) => {
    switch (code) {
      case 'auth/expired-action-code': return 'The action link has expired.';
      case 'auth/invalid-action-code': return 'The action link is invalid.';
      case 'auth/user-disabled': return 'The account has been disabled.';
      case 'auth/user-not-found': return 'User not found.';
      case 'auth/weak-password': return 'The password is too weak.';
      default: return 'An unexpected error occurred. Please try again.';
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center px-6 py-20 relative overflow-hidden">
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

            {status === 'loading' && (
              <div className="space-y-6 py-10">
                <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />
                <p className="text-text-secondary font-bold uppercase tracking-widest text-xs">Synchronizing Action...</p>
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-8 py-4">
                <div className="w-20 h-20 rounded-3xl bg-success/10 border border-success/20 flex items-center justify-center mx-auto shadow-xl">
                   <CheckCircle2 className="text-success" size={40} />
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight text-text-primary">
                    {mode === 'verifyEmail' ? 'Verification Complete' : 'Password Reset'}
                  </h1>
                  <p className="text-text-secondary text-sm font-medium">
                    Your request has been successfully processed by the PulseEarn node.
                  </p>
                </div>
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full py-4 rounded-xl shadow-lg text-xs uppercase tracking-widest font-bold"
                >
                  Continue to Login
                </Button>
              </div>
            )}

            {status === 'reset-form' && (
              <div className="space-y-8">
                <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto shadow-xl">
                   <Lock className="text-primary" size={40} />
                </div>
                <div className="text-center">
                  <h1 className="text-2xl font-bold mb-2 tracking-tight text-text-primary uppercase italic">New Credentials</h1>
                  <p className="text-text-secondary text-sm font-medium">Enter your new secure password below</p>
                </div>

                <form onSubmit={handlePasswordReset} className="space-y-4 text-left">
                  <div className="space-y-1.5">
                    <label htmlFor="new-password" className="text-[10px] font-bold uppercase tracking-widest text-text-primary/30 ml-1">New Password</label>
                    <input
                      id="new-password"
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-surface-bright border border-border-bright rounded-xl px-4 py-4 text-sm text-text-primary focus:outline-none focus:border-primary/50 transition-all font-medium"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    isLoading={isSubmitting}
                    className="w-full py-4 rounded-xl shadow-lg text-xs uppercase tracking-widest font-bold mt-2"
                  >
                    Update Password
                  </Button>
                </form>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-8 py-4">
                <div className="w-20 h-20 rounded-3xl bg-danger/10 border border-danger/20 flex items-center justify-center mx-auto shadow-xl">
                   <AlertCircle className="text-danger" size={40} />
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight text-text-primary uppercase italic">Action Failed</h1>
                  <p className="text-text-secondary text-sm font-medium leading-relaxed">
                    {errorMessage}
                  </p>
                </div>
                <div className="flex flex-col gap-4">
                  <Button
                    onClick={() => navigate('/login')}
                    variant="outline"
                    className="w-full py-4 rounded-xl text-xs uppercase tracking-widest font-bold"
                  >
                    Back to Login
                  </Button>
                  <button
                    onClick={() => navigate('/support')}
                    className="text-[10px] font-bold text-text-tertiary hover:text-text-primary uppercase tracking-widest transition-colors"
                  >
                    Contact Integrity Team
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default AuthAction;
