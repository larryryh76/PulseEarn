import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePsemineAuth } from '../../contexts/PsemineAuthContext';
import PsemineLogo from '../../components/mine/PsemineLogo';
import { Mail, ArrowLeft, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const PsemineForgotPassword: React.FC = () => {
  const { resetPassword } = usePsemineAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }

    try {
      setLoading(true);
      await resetPassword(email);
      setSubmitted(true);
      toast.success('Reset email dispatched');
    } catch (err: any) {
      console.error('[PSEmine Forgot Password] Error:', err);
      let msg = 'Failed to send reset email. Please try again.';
      if (err.code === 'auth/user-not-found') {
        msg = 'No user account found matching this email address.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Invalid email address provided.';
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
          <h2 className="text-xl font-bold text-white tracking-tight">Recover PSEmine Password</h2>
          <p className="text-xs text-gray-400 mt-1">Enter your email address to receive password reset instructions</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-3">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {submitted ? (
          <div className="space-y-6 text-center">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex flex-col items-center gap-2">
              <CheckCircle2 size={32} />
              <p className="font-bold">Password Reset Email Dispatched</p>
              <p className="text-gray-300 font-normal">
                If an account exists for <span className="text-white font-semibold">{email}</span>, you will receive a reset link shortly.
              </p>
            </div>

            <Link
              to="/mine/login"
              className="w-full py-3.5 px-4 bg-[#00F2FE] hover:bg-[#00D2FF] text-[#080A11] rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,242,254,0.3)]"
            >
              <ArrowLeft size={16} />
              <span>Return to PSEmine Sign In</span>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-white/5 border border-white/10 focus:border-[#00F2FE] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#00F2FE] transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-[#00F2FE] hover:bg-[#00D2FF] text-[#080A11] rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,242,254,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Dispatching Link...</span>
                </>
              ) : (
                <span>Send Reset Link</span>
              )}
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-white/5 text-center text-xs text-gray-400">
          <Link to="/mine/login" className="text-gray-300 hover:text-white font-semibold flex items-center justify-center gap-1.5 transition-all">
            <ArrowLeft size={14} />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PsemineForgotPassword;
