import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PSEMineLandingLayout } from '../../components/psemine/PSEMineWordmark';
import toast from 'react-hot-toast';
import { Mail, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { mapAuthError } from '../../utils/errors';
import './psemine.css';

export const PSEMineForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      return toast.error('Please enter your email address.');
    }

    try {
      setIsSubmitting(true);
      await resetPassword(email);
      setSubmitted(true);
      toast.success('Password reset link sent.');
    } catch (error: any) {
      console.error("[PSEMineForgotPassword] Auth Error:", error.code, error.message);
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
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'rgba(139, 229, 239, 0.12)',
                    border: '1px solid rgba(139, 229, 239, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--pm-cyan)',
                    marginBottom: '20px'
                  }}
                >
                  <CheckCircle2 size={28} />
                </div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 10px' }}>Reset Link Sent</h1>
                <p style={{ color: 'var(--pm-muted)', fontSize: '14px', lineHeight: 1.6, margin: '0 0 24px' }}>
                  We have dispatched a password reset link to <strong style={{ color: '#fff' }}>{email}</strong>. Check your inbox to proceed.
                </p>
                <Link to="/mine/login" className="psemine-button" style={{ width: '100%', textDecoration: 'none' }}>
                  Return to Sign In
                </Link>
              </div>
            ) : (
              <>
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
                    <Mail size={24} />
                  </div>
                  <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.04em' }}>
                    Reset Password
                  </h1>
                  <p style={{ color: 'var(--pm-muted)', fontSize: '13px', margin: 0 }}>
                    Enter your email to receive a password reset link
                  </p>
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

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="psemine-button"
                    style={{ width: '100%', marginTop: '8px', border: 0, cursor: 'pointer' }}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Sending Reset Link...
                      </>
                    ) : (
                      <>
                        Send Reset Link <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>

                <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--pm-line)', textAlign: 'center' }}>
                  <Link to="/mine/login" style={{ fontSize: '13px', color: 'var(--pm-muted)', textDecoration: 'none', fontWeight: 600 }}>
                    ← Back to Sign In
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </PSEMineLandingLayout>
  );
};

export default PSEMineForgotPassword;
