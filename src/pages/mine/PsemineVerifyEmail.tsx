import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePsemineAuth } from '../../contexts/PsemineAuthContext';
import PsemineLogo from '../../components/mine/PsemineLogo';
import { Mail, RefreshCw, CheckCircle2, ArrowRight, AlertCircle, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

export const PsemineVerifyEmail: React.FC = () => {
  const { currentUser, sendVerification, refreshVerificationStatus, logout, psemineProfile } = usePsemineAuth();
  const navigate = useNavigate();

  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // If already verified on mount or reload, auto route
  useEffect(() => {
    if (currentUser?.emailVerified) {
      if (psemineProfile?.hasCompletedGuide) {
        navigate('/mine/dashboard');
      } else {
        navigate('/mine/guide');
      }
    }
  }, [currentUser?.emailVerified, psemineProfile?.hasCompletedGuide, navigate]);

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;

    try {
      setResending(true);
      setErrorMsg(null);
      await sendVerification();
      toast.success('Verification email sent!');
      setResendCooldown(60);
    } catch (err: any) {
      console.error('[PSEmine Verification] Resend error:', err);
      let msg = 'Failed to resend verification email.';
      if (err.code === 'auth/too-many-requests') {
        msg = 'Too many requests. Please wait a moment before trying again.';
      } else if (err.message) {
        msg = err.message;
      }
      setErrorMsg(msg);
    } finally {
      setResending(false);
    }
  };

  const handleRefreshStatus = async () => {
    try {
      setRefreshing(true);
      setErrorMsg(null);
      await refreshVerificationStatus();

      if (currentUser?.emailVerified) {
        toast.success('Email verified successfully!');
        if (psemineProfile?.hasCompletedGuide) {
          navigate('/mine/dashboard');
        } else {
          navigate('/mine/guide');
        }
      } else {
        toast('Verification email pending. Please check your inbox.', { icon: '⏳' });
      }
    } catch (err: any) {
      console.error('[PSEmine Verification] Refresh error:', err);
      setErrorMsg('Failed to refresh status. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/mine/login');
  };

  return (
    <div className="min-h-screen bg-[#080A11] text-white flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans selection:bg-[#00F2FE]/30">
      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#00F2FE]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#0B0E17] border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10 text-center">
        <div className="flex flex-col items-center mb-6">
          <PsemineLogo size="md" className="mb-6" />

          <div className="w-14 h-14 rounded-2xl bg-[#00F2FE]/10 border border-[#00F2FE]/30 flex items-center justify-center text-[#00F2FE] mb-4 shadow-[0_0_20px_rgba(0,242,254,0.2)]">
            <Mail size={28} />
          </div>

          <h2 className="text-xl font-bold text-white tracking-tight">Verify Your Email Address</h2>
          <p className="text-xs text-gray-400 mt-2 max-w-xs leading-relaxed">
            A verification link was sent to{' '}
            <span className="font-semibold text-white">{currentUser?.email || 'your email'}</span>.
            Please verify your email to unlock PSEmine workspace access.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-3 text-left">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {currentUser?.emailVerified ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center gap-2 font-bold">
              <CheckCircle2 size={18} />
              <span>Email Confirmed!</span>
            </div>
            <button
              onClick={() => {
                if (psemineProfile?.hasCompletedGuide) {
                  navigate('/mine/dashboard');
                } else {
                  navigate('/mine/guide');
                }
              }}
              className="w-full py-3.5 px-4 bg-[#00F2FE] hover:bg-[#00D2FF] text-[#080A11] rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,242,254,0.3)]"
            >
              <span>Continue to Workspace</span>
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={handleRefreshStatus}
              disabled={refreshing}
              className="w-full py-3.5 px-4 bg-[#00F2FE] hover:bg-[#00D2FF] text-[#080A11] rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,242,254,0.3)] disabled:opacity-50"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'Checking Status...' : 'I Have Verified / Refresh'}</span>
            </button>

            <button
              onClick={handleResend}
              disabled={resending || resendCooldown > 0}
              className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Mail size={14} />
              <span>
                {resendCooldown > 0
                  ? `Resend Email (${resendCooldown}s)`
                  : resending
                  ? 'Sending Email...'
                  : 'Resend Verification Email'}
              </span>
            </button>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between text-xs text-gray-500">
          <span>Wrong email?</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-red-400 hover:text-red-300 font-bold transition-all"
          >
            <LogOut size={13} />
            <span>Sign Out & Try Again</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PsemineVerifyEmail;
