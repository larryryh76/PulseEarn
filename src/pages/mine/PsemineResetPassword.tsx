import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { usePsemineAuth } from '../../contexts/PsemineAuthContext';
import PsemineLogo from '../../components/mine/PsemineLogo';
import { Lock, ArrowRight, AlertCircle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export const PsemineResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { confirmResetPassword } = usePsemineAuth();
  const navigate = useNavigate();

  const oobCode = searchParams.get('oobCode');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!oobCode) {
      setErrorMsg('Invalid or missing password reset link. Please request a new one.');
    }
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!oobCode) {
      setErrorMsg('Missing password reset action code.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      await confirmResetPassword(oobCode, password);
      setSuccess(true);
      toast.success('Password updated successfully');
    } catch (err: any) {
      console.error('[PSEmine Reset Password] Error:', err);
      let msg = 'Failed to reset password. The link may have expired.';
      if (err.code === 'auth/invalid-action-code') {
        msg = 'The password reset link is invalid or has already been used.';
      } else if (err.code === 'auth/expired-action-code') {
        msg = 'The password reset link has expired. Please request a new link.';
      } else if (err.message) {
        msg = err.message;
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080A11] text-white flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans selection:bg-[#00F2FE]/30">
      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#00F2FE]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#0B0E17] border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10">
        <div className="flex flex-col items-center text-center mb-8">
          <Link to="/mine" className="mb-4">
            <PsemineLogo size="md" />
          </Link>
          <h2 className="text-xl font-bold text-white tracking-tight">Set New Password</h2>
          <p className="text-xs text-gray-400 mt-1">Enter your new credentials below</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-3">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p>{errorMsg}</p>
              {!oobCode && (
                <Link to="/mine/forgot-password" className="text-[#00F2FE] font-bold hover:underline block text-[11px]">
                  Request New Password Reset Link →
                </Link>
              )}
            </div>
          </div>
        )}

        {success ? (
          <div className="space-y-6 text-center">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex flex-col items-center gap-2 font-semibold">
              <CheckCircle2 size={32} />
              <p>Password Updated Successfully!</p>
              <p className="text-gray-300 font-normal">
                Your password has been changed. You may now sign in to your PSEmine account.
              </p>
            </div>

            <button
              onClick={() => navigate('/mine/login')}
              className="w-full py-3.5 px-4 bg-[#00F2FE] hover:bg-[#00D2FF] text-[#080A11] rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,242,254,0.3)]"
            >
              <span>Proceed to Sign In</span>
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                New Password (Min. 8 chars)
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  type="password"
                  required
                  disabled={!oobCode}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 focus:border-[#00F2FE] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#00F2FE] transition-all disabled:opacity-40"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  type="password"
                  required
                  disabled={!oobCode}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 focus:border-[#00F2FE] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#00F2FE] transition-all disabled:opacity-40"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !oobCode}
              className="w-full mt-4 py-3.5 px-4 bg-[#00F2FE] hover:bg-[#00D2FF] text-[#080A11] rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,242,254,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-white/5 text-center text-xs text-gray-400">
          <Link to="/mine/login" className="text-gray-300 hover:text-white font-semibold flex items-center justify-center gap-1.5 transition-all">
            <ArrowLeft size={14} />
            <span>Return to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PsemineResetPassword;
