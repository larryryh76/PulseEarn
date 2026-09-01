import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PSEMineWordmark } from '../../components/psemine/PSEMineWordmark';
import { ArrowRight, CheckCircle2, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import './psemine.css';

interface ToolConfig {
  id: string;
  name: string;
  priceGBP: number;
  hourlyRateGBP: number;
  maxCopies: number;
  description: string;
}

const TOOLS: ToolConfig[] = [
  { id: 'basic', name: 'Basic', priceGBP: 3, hourlyRateGBP: 0.10, maxCopies: 5, description: 'A dependable entry tool for starting your campaign capacity.' },
  { id: 'core', name: 'Core', priceGBP: 10, hourlyRateGBP: 0.50, maxCopies: 3, description: 'A balanced tool for building a stronger earning base.' },
  { id: 'advanced', name: 'Advanced Miner', priceGBP: 50, hourlyRateGBP: 1.20, maxCopies: 3, description: 'High-performance equipment for serious participants.' },
  { id: 'elite', name: 'Elite Miner', priceGBP: 200, hourlyRateGBP: 2.50, maxCopies: 2, description: 'Top-tier mining hardware for maximum campaign yield.' },
];

export const PSEMineTools: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const [selectedTool, setSelectedTool] = useState<ToolConfig | null>(null);
  const [txHash, setTxHash] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);

  const handleOpenCheckout = async (tool: ToolConfig) => {
    setSelectedTool(tool);
    setTxHash('');
    setQuote(null);
    setLoadingQuote(true);

    try {
      const idToken = await currentUser?.getIdToken();
      const res = await fetch('/api/mine/tools/quote', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ toolId: tool.id, quantity: 1 })
      });
      const data = await res.json();
      if (data.success) {
        setQuote(data.quote);
      } else {
        toast.error(data.error || 'Failed to generate quote');
      }
    } catch (err) {
      console.error('Quote fetch error:', err);
      toast.error('Network error getting BNB quote');
    } finally {
      setLoadingQuote(false);
    }
  };

  const handleVerifyPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txHash.trim() || !txHash.startsWith('0x') || txHash.length < 64) {
      return toast.error('Please enter a valid BSC transaction hash (0x...)');
    }

    try {
      setIsSubmitting(true);
      const idToken = await currentUser?.getIdToken();
      const res = await fetch('/api/mine/tools/verify-purchase', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          purchaseId: quote?.quoteId,
          transactionHash: txHash,
          senderWallet: userData?.walletAddress || '0x'
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Tool purchase verified! Equipment deployed.');
        setSelectedTool(null);
      } else {
        toast.error(data.error || 'Purchase verification failed');
      }
    } catch (err) {
      console.error('Verification error:', err);
      toast.error('Network error verifying transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="psemine-site" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="psemine-header">
        <div className="psemine-shell psemine-nav">
          <PSEMineWordmark />
          <nav className="psemine-nav-links">
            <a href="/mine/dashboard">Dashboard</a>
            <a href="/mine/tools" style={{ color: '#fff', fontWeight: 800 }}>Tools</a>
            <a href="/mine/wallet">Wallet</a>
            <a href="/mine/activity">Activity</a>
            <a href="/mine/referrals">Referrals</a>
          </nav>
        </div>
      </header>

      <main className="psemine-page" style={{ flex: 1, padding: '60px 0' }}>
        <div className="psemine-shell">
          <div style={{ marginBottom: '40px' }}>
            <p className="psemine-eyebrow">
              <Sparkles size={13} /> Mining Equipment Family
            </p>
            <h1 style={{ fontSize: '36px', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.05em' }}>
              Mining Tools
            </h1>
            <p style={{ color: 'var(--pm-muted)', fontSize: '15px', margin: 0 }}>
              Activate equipment to build your campaign capacity. Earnings are tracked in GBP (£).
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '24px'
            }}
          >
            {TOOLS.map((tool) => (
              <div
                key={tool.id}
                style={{
                  background: 'var(--pm-surface)',
                  border: '1px solid var(--pm-line)',
                  borderRadius: '16px',
                  padding: '28px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--pm-cyan)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Max {tool.maxCopies} copies
                    </div>
                    <span style={{ fontSize: '11px', background: 'rgba(104, 116, 255, 0.15)', color: 'var(--pm-blue)', padding: '4px 10px', borderRadius: '20px', fontWeight: 700 }}>
                      Tier {tool.id}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.03em' }}>
                    {tool.name}
                  </h3>
                  <p style={{ color: 'var(--pm-muted)', fontSize: '13px', lineHeight: 1.5, margin: '0 0 20px' }}>
                    {tool.description}
                  </p>

                  <div style={{ background: 'var(--pm-soft)', border: '1px solid var(--pm-line)', borderRadius: '10px', padding: '14px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#707786' }}>Purchase Price</span>
                      <strong style={{ fontSize: '13px', color: '#fff' }}>£{tool.priceGBP.toFixed(2)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', color: '#707786' }}>Earning Rate</span>
                      <strong style={{ fontSize: '13px', color: 'var(--pm-cyan)' }}>£{tool.hourlyRateGBP.toFixed(2)} / hr</strong>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenCheckout(tool)}
                  className="psemine-button"
                  style={{ width: '100%', border: 0, cursor: 'pointer' }}
                >
                  Activate Tool <ArrowRight size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Checkout Modal */}
        {selectedTool && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.8)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <div
              style={{
                background: 'var(--pm-surface)',
                border: '1px solid var(--pm-line)',
                borderRadius: '20px',
                padding: '36px',
                maxWidth: '480px',
                width: '100%',
                boxShadow: '0 25px 80px rgba(0,0,0,0.6)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>
                  Activate {selectedTool.name}
                </h2>
                <button
                  onClick={() => setSelectedTool(null)}
                  style={{ background: 'none', border: 0, color: 'var(--pm-muted)', fontSize: '20px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {loadingQuote ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--pm-muted)' }}>
                  <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
                  Generating BNB quote from oracle...
                </div>
              ) : quote ? (
                <form onSubmit={handleVerifyPurchase} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: 'var(--pm-soft)', border: '1px solid var(--pm-line)', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                      <span style={{ color: 'var(--pm-muted)' }}>GBP Value:</span>
                      <strong>£{quote.gbpPrice.toFixed(2)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                      <span style={{ color: 'var(--pm-muted)' }}>BNB Required:</span>
                      <strong style={{ color: 'var(--pm-cyan)' }}>{quote.bnbAmount} BNB</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#707786' }}>
                      <span>Network:</span>
                      <span>BNB Smart Chain (BEP20)</span>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(104, 116, 255, 0.08)', border: '1px solid rgba(104, 116, 255, 0.2)', borderRadius: '12px', padding: '14px' }}>
                    <label style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#707786', fontWeight: 700, marginBottom: '6px' }}>
                      Send BNB To Receiver Address:
                    </label>
                    <code style={{ display: 'block', fontSize: '12px', color: '#fff', wordBreak: 'break-all', background: '#000', padding: '8px 10px', borderRadius: '6px' }}>
                      {quote.receiverWallet}
                    </code>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--pm-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                      BSC Transaction Hash (TxHash)
                    </label>
                    <input
                      type="text"
                      placeholder="0x..."
                      value={txHash}
                      onChange={(e) => setTxHash(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        background: 'var(--pm-soft)',
                        border: '1px solid var(--pm-line)',
                        borderRadius: '8px',
                        padding: '12px',
                        color: '#fff',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
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
                        Verifying Transaction...
                      </>
                    ) : (
                      <>
                        Confirm & Deploy Tool <CheckCircle2 size={16} />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div style={{ textAlign: 'center', color: '#ef4444', padding: '20px 0' }}>
                  <AlertCircle size={24} style={{ margin: '0 auto 8px' }} />
                  Could not retrieve quote. Please try again.
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="psemine-footer">
        <div className="psemine-shell psemine-footer-inner">
          <div><PSEMineWordmark /><p>Part of the PulseEarn ecosystem.</p></div>
          <p className="psemine-copyright">© {new Date().getFullYear()} PulseEarn</p>
        </div>
      </footer>
    </div>
  );
};

export default PSEMineTools;
