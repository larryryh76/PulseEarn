import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { auth } from '../../firebase/config';
import {
  applyActionCode,
  confirmPasswordReset,
  checkActionCode,
  verifyPasswordResetCode
} from 'firebase/auth';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import { motion } from 'framer-motion';
import { ShieldCheck, Loader2, CheckCircle2, AlertCircle, Key } from 'lucide-react';
import toast from 'react-hot-toast';
import { mapAuthError } from '../../utils/errors';

const AuthAction: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');

  useEffect(() => {
    if (!mode || !oobCode) {
      setError('Invalid request. Missing parameters.');
      setLoading(false);
      return;
    }

    const handleAction = async () => {
      try {
        switch (mode) {
          case 'verifyEmail': {
            await applyActionCode(auth, oobCode);
            await auth.currentUser?.reload();
            setSuccess('Email verified successfully!');
            setTimeout(() => navigate('/dashboard'), 3000);
            break;
          }

          case 'resetPassword': {
            const resetEmail = await verifyPasswordResetCode(auth, oobCode);
            setEmail(resetEmail);
            break;
          }

          case 'recoverEmail': {
            await checkActionCode(auth, oobCode);
            await applyActionCode(auth, oobCode);
            setSuccess('Email recovery successful. Your email has been restored.');
            break;
          }

          case 'verifyAndChangeEmail': {
            await applyActionCode(auth, oobCode);
            await auth.currentUser?.reload();
            setSuccess('Email change verified successfully!');
            setTimeout(() => navigate('/dashboard'), 3000);
            break;
          }

          default:
            setError('Unsupported authentication mode.');
        }
      } catch (err: any) {
        console.error('Auth Action Error:', err);
        setError(mapAuthError(err.code || err.message) || 'An error occurred during the authentication process.');
      } finally {
        setLoading(false);
      }
    };

    handleAction();
  }, [mode, oobCode, navigate]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode!, newPassword);
      setSuccess('Password has been reset successfully.');
      toast.success('Password reset complete!');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
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

            {loading ? (
              <div className="space-y-6 py-8">
                <Loader2 className="animate-spin text-primary mx-auto" size={48} />
                <h1 className="text-2xl font-bold">Processing...</h1>
                <p className="text-text-tertiary">Please wait while we secure your account.</p>
              </div>
            ) : error ? (
              <div className="space-y-6 py-4">
                <div className="w-20 h-20 rounded-3xl bg-danger/10 border border-danger/20 flex items-center justify-center mx-auto shadow-xl">
                   <AlertCircle className="text-danger" size={40} />
                </div>
                <h1 className="text-2xl font-bold">Verification Failed</h1>
                <p className="text-text-tertiary text-sm leading-relaxed">{error}</p>
                <Link to="/login">
                  <Button className="w-full mt-4">Return to Login</Button>
                </Link>
              </div>
            ) : success ? (
              <div className="space-y-6 py-4">
                <div className="w-20 h-20 rounded-3xl bg-success/10 border border-success/20 flex items-center justify-center mx-auto shadow-xl">
                   <CheckCircle2 className="text-success" size={40} />
                </div>
                <h1 className="text-2xl font-bold uppercase italic tracking-tighter">Success</h1>
                <p className="text-text-tertiary text-sm leading-relaxed">{success}</p>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest animate-pulse">Redirecting in 3 seconds...</p>
                <Link to={(mode === 'verifyEmail' || mode === 'verifyAndChangeEmail' || mode === 'recoverEmail') ? "/dashboard" : "/login"} className="block">
                  <Button className="w-full">Continue to PulseEarn</Button>
                </Link>
              </div>
            ) : mode === 'resetPassword' && email ? (
              <form onSubmit={handlePasswordReset} className="space-y-6 text-left">
                <div className="text-center mb-8">
                  <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                     <Key className="text-primary" size={40} />
                  </div>
                  <h1 className="text-2xl font-bold">Reset Password</h1>
                  <p className="text-text-tertiary text-sm mt-2">Set a new password for <span className="text-text-primary font-bold">{email}</span></p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-2 italic">New Password</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-surface-bright border border-border px-6 py-4 rounded-2xl focus:border-primary outline-none transition-all font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-2 italic">Confirm Password</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-surface-bright border border-border px-6 py-4 rounded-2xl focus:border-primary outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                <Button type="submit" isLoading={loading} className="w-full py-4 uppercase tracking-widest text-[11px] font-black mt-4">
                   Update Password
                </Button>
              </form>
            ) : null}

            <div className="mt-8 pt-8 border-t border-border-bright flex flex-col items-center gap-4">
               <Link to="/support" className="flex items-center gap-2 text-text-tertiary hover:text-text-primary transition-colors text-[10px] font-bold uppercase tracking-widest italic">
                  <ShieldCheck size={14} />
                  Secure Identity Gate
               </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default AuthAction;
