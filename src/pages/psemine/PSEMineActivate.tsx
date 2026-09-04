import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PSEMineLandingLayout } from '../../components/psemine/PSEMineWordmark';
import toast from 'react-hot-toast';
import { ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import './psemine.css';

export const PSEMineActivate: React.FC = () => {
  const { currentUser, userData, activatePSEMineAccess } = useAuth();
  const [isActivating, setIsActivating] = useState(false);
  const navigate = useNavigate();

  const handleActivate = async () => {
    try {
      setIsActivating(true);
      await activatePSEMineAccess();
      toast.success('PSEmine access activated!');
      navigate('/mine/dashboard');
    } catch (error: any) {
      console.error('[PSEMineActivate] Activation Error:', error);
      const message = error?.message || error?.code || 'Failed to activate PSEmine access. Please try again.';
      toast.error(message);
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <PSEMineLandingLayout>
      <main className="psemine-page" style={{ padding: '80px 0 120px' }}>
        <div className="psemine-shell" style={{ maxWidth: '520px', margin: '0 auto' }}>
          <div
            style={{
              background: 'var(--pm-surface)',
              border: '1px solid var(--pm-line)',
              borderRadius: '16px',
              padding: '40px 36px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'rgba(139, 229, 239, 0.12)',
                border: '1px solid rgba(139, 229, 239, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--pm-cyan)',
                marginBottom: '20px'
              }}
            >
              <ShieldCheck size={28} />
            </div>

            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.04em' }}>
              Activate PSEmine Campaign Access
            </h1>

            <p style={{ color: 'var(--pm-muted)', fontSize: '14px', lineHeight: 1.6, margin: '0 0 28px' }}>
              Welcome, <strong style={{ color: '#fff' }}>{userData?.username || currentUser?.email}</strong>. Activate your account now to access your campaign workspace.
            </p>

            <div
              style={{
                background: 'var(--pm-soft)',
                border: '1px solid var(--pm-line)',
                borderRadius: '10px',
                padding: '16px',
                textAlign: 'left',
                marginBottom: '28px'
              }}
            >
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#707786', fontWeight: 700, marginBottom: '8px' }}>
                PSEmine Workspace Access
              </div>
              <div style={{ fontSize: '12px', color: '#c6cad3', lineHeight: 1.5 }}>
                Product activation grants instant access to campaigns, analytics, and mining tools.
              </div>
            </div>

            <button
              onClick={handleActivate}
              disabled={isActivating}
              className="psemine-button"
              style={{ width: '100%', border: 0, cursor: 'pointer', opacity: isActivating ? 0.6 : 1 }}
            >
              {isActivating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Activating Access...
                </>
              ) : (
                <>
                  Enter PSEmine Workspace <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </PSEMineLandingLayout>
  );
};

export default PSEMineActivate;
