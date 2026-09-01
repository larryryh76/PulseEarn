import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PSEMineLandingLayout } from '../../components/psemine/PSEMineWordmark';
import toast from 'react-hot-toast';
import { Mail, Lock, LogIn, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { mapAuthError } from '../../utils/errors';
import './psemine.css';

export const PSEMineLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    try {
      setIsSubmitting(true);
      sessionStorage.setItem('psemine-auth-flow', 'true');
      await signInWithGoogle(undefined, 'psemine');
      navigate('/mine/activate');
    } catch (error: any) {
      let message = 'An unexpected error occurred.';
      if (error.code === 'auth/unauthorized-domain') {
        message = 'Google login is temporarily unavailable. Use email instead.';
      } else if (error.code === 'auth/popup-closed-by-user') {
        message = 'Sign-in window closed. Please try again.';
      } else if (error.code === 'auth/network-request-failed') {
        message = 'Network error. Check your connection and retry.';
      } else {
        message = mapAuthError(error);
      }
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      return toast.error('Please fill in all fields.');
    }

    try {
      setIsSubmitting(true);
      sessionStorage.setItem('psemine-auth-flow', 'true');
      await login(email, password);
      navigate('/mine/activate');
    } catch (error: any) {
      console.error("[PSEMineLogin] Auth Error:", error.code, error.message);
      toast.error(mapAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PSEMineLandingLayout>
      <main className="psemine-page" style={{ padding: '80px 0 120px' }}>
        <div className="psemine-shell" style={{ maxWidth: '440px', margin: '0 auto' }}>
          <div
            style={{
              background: 'var(--pm-surface)',
              border: '1px solid var(--pm-line)',
              borderRadius: '16px',
              padding: '36px 32px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(104, 116, 255, 0.12)',
                  border: '1px solid rgba(104, 116, 255, 0.25)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--pm-cyan)',
                  marginBottom: '16px'
                }}
              >
                <LogIn size={24} />
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.04em' }}>
                Sign in to PSEmine
              </h1>
              <p style={{ color: 'var(--pm-muted)', fontSize: '13px', margin: 0 }}>
                Enter your campaign account details
              </p>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '13px 16px',
                background: '#ffffff',
                color: '#08080c',
                border: 0,
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                marginBottom: '20px',
                opacity: isSubmitting ? 0.6 : 1
              }}
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" style={{ width: '18px', height: '18px' }} />
              Continue with Google
            </button>

            <div style={{ position: 'relative', textAlign: 'center', margin: '20px 0' }}>
              <div style={{ position: 'absolute', inset: '50% 0 0 0', borderTop: '1px solid var(--pm-line)' }} />
              <span style={{ position: 'relative', background: 'var(--pm-surface)', padding: '0 12px', fontSize: '10px', color: '#707786', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                Or Email Login
              </span>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--pm-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#707786' }} />
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      background: 'var(--pm-soft)',
                      border: '1px solid var(--pm-line)',
                      borderRadius: '8px',
                      padding: '12px 14px 12px 40px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--pm-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Password
                  </label>
                  <Link to="/mine/forgot-password" style={{ fontSize: '11px', color: 'var(--pm-cyan)', textDecoration: 'none', fontWeight: 600 }}>
                    Forgot Password?
                  </Link>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#707786' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      background: 'var(--pm-soft)',
                      border: '1px solid var(--pm-line)',
                      borderRadius: '8px',
                      padding: '12px 40px 12px 40px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, color: '#707786', cursor: 'pointer', padding: 0 }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="psemine-button"
                style={{ width: '100%', marginTop: '8px', border: 0, cursor: 'pointer' }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    Sign In to PSEmine <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--pm-line)', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: 'var(--pm-muted)', margin: 0 }}>
                Don't have a PSEmine account?{' '}
                <Link to="/mine/signup" style={{ color: 'var(--pm-cyan)', textDecoration: 'none', fontWeight: 700 }}>
                  Create Account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </PSEMineLandingLayout>
  );
};

export default PSEMineLogin;
