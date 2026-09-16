import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check, X, Wallet, ShieldCheck, Loader2, Clock, ChevronRight, ExternalLink,
} from 'lucide-react';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { usePseState } from '../../components/psemine/PseStateProvider';
import { PSEMineToolDefinition } from '../../types/psemine';
import {
  Chip, PageHeader, gbp, shortAddr, shortHash, nowMs, CopyField,
} from '../../components/psemine/pse';
import { cn } from '../../utils';
import toast from 'react-hot-toast';

const EVM = /^0x[0-9a-fA-F]{40}$/;

export const PSEMineTools: React.FC = () => {
  const { tools, pseUser, campaign } = usePSEMine();
  const { state, refresh } = usePseState();
  const [purchasing, setPurchasing] = useState<PSEMineToolDefinition | null>(null);

  const counts = pseUser?.toolOwnershipCounts || { starter: 0, builder: 0, advanced: 0, elite: 0 };
  const purchaseOpen = campaign?.purchaseEnabled !== false && campaign?.status === 'active';
  const ownedTools = (state?.tools ?? []).filter(t => t.status === 'active' || t.status === 'cycle_complete' || t.status === 'maintenance_required');

  return (
    <div className="pse-section space-y-5 pb-24 pt-6 md:pt-8">
      <PageHeader
        eyebrow="Marketplace"
        title="Mining tools"
        sub="Fixed GBP prices, paid in BNB at the live rate. Every purchase is quoted and verified by the backend."
      />

      {campaign && campaign.status !== 'active' && (
        <div className="pse-card flex items-start gap-3 p-4" style={{ borderColor: 'rgba(245,165,36,0.3)' }}>
          <Clock size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-warning)' }} />
          <p className="pse-caption">
            {campaign.status === 'scheduled'
              ? 'Purchases are not open yet — the campaign has not started.'
              : `Purchases are closed — the campaign is ${campaign.status}.`}
          </p>
        </div>
      )}

      {/* Ownership strip */}
      {ownedTools.length > 0 && (
        <section className="pse-card overflow-hidden">
          <div className="border-b p-5" style={{ borderColor: 'var(--pse-line)' }}>
            <p className="pse-h3">Your operating tools</p>
            <p className="pse-micro mt-0.5">Cycle state is derived by the backend; maintenance is always free.</p>
          </div>
          <ul className="divide-y" style={{ borderColor: 'var(--pse-line)' }}>
            {ownedTools.slice(0, 6).map(t => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="pse-caption font-medium" style={{ color: 'var(--pse-text)' }}>
                    {t.toolName || t.toolId}
                  </p>
                  <p className="pse-micro">
                    {t.cycleState === 'active'
                      ? 'Operating'
                      : t.cycleState === 'cycle_complete'
                        ? 'Cycle complete — maintenance available'
                        : t.cycleState === 'maintenance_required'
                          ? 'Maintenance required'
                          : (t.status || '—')}
                  </p>
                </div>
                {t.maintenanceRequired || t.cycleState === 'cycle_complete' ? (
                  <Chip label="Maintain on dashboard" chip="pse-chip pse-chip-warning" dot={false} />
                ) : (
                  <Chip label={t.cycleState === 'active' ? 'Active' : (t.status || '—')} chip="pse-chip pse-chip-success" dot={false} />
                )}
              </li>
            ))}
          </ul>
          {ownedTools.length > 6 && (
            <div className="border-t p-3 text-center" style={{ borderColor: 'var(--pse-line)' }}>
              <LinkToDash />
            </div>
          )}
        </section>
      )}

      {/* Tool grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tools.map(tool => {
          const owned = counts[tool.id] || 0;
          const isMax = owned >= tool.maxPerUser;
          const canBuy = purchaseOpen && !isMax && tool.enabled;
          return (
            <div key={tool.id} className={cn('pse-card flex flex-col p-6', canBuy && 'pse-card-hover')}>
              <div className="flex items-center justify-between">
                <span className="pse-eyebrow">Tier {tool.tier}</span>
                <Chip label={`${owned}/${tool.maxPerUser}`} chip={owned > 0 ? 'pse-chip pse-chip-success' : 'pse-chip pse-chip-neutral'} dot={false} />
              </div>
              <p className="pse-h3 mt-3">{tool.name}</p>
              <p className="pse-micro mt-1.5 min-h-[32px]">{tool.tagline}</p>

              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="pse-num text-[24px] font-semibold" style={{ color: 'var(--pse-blue)' }}>
                  {gbp(tool.purchasePriceGBP)}
                </span>
                <span className="pse-micro">one-time</span>
              </div>
              <p className="pse-caption mt-1">
                <span className="pse-num font-semibold" style={{ color: 'var(--pse-cyan)' }}>+{gbp(tool.hourlyRateGBP).replace('£', '£')}</span>
                <span style={{ color: 'var(--pse-text-2)' }}>/hour capacity</span>
              </p>

              <div className="pse-inset mt-4 space-y-2 p-3.5 pse-micro">
                <div className="flex justify-between"><span style={{ color: 'var(--pse-text-3)' }}>Operating cycle</span><span>24 hours</span></div>
                <div className="flex justify-between"><span style={{ color: 'var(--pse-text-3)' }}>Maintenance</span><span>Free</span></div>
                <div className="flex justify-between"><span style={{ color: 'var(--pse-text-3)' }}>Ownership limit</span><span>{tool.maxPerUser} per account</span></div>
                <div className="flex justify-between"><span style={{ color: 'var(--pse-text-3)' }}>Your rate from this tool</span><span className="pse-num">+£{(owned * tool.hourlyRateGBP).toFixed(2)}/hr</span></div>
              </div>

              <div className="mt-5">
                {!tool.enabled ? (
                  <button disabled className="pse-btn pse-btn-secondary w-full justify-center">Unavailable</button>
                ) : isMax ? (
                  <button disabled className="pse-btn pse-btn-secondary w-full justify-center">
                    <Check size={14} style={{ color: 'var(--pse-success)' }} /> Maximum owned
                  </button>
                ) : !purchaseOpen ? (
                  <button disabled className="pse-btn pse-btn-secondary w-full justify-center">
                    {campaign?.status === 'active' ? 'Purchases closed' : 'Campaign ' + (campaign?.status || 'inactive')}
                  </button>
                ) : (
                  <button onClick={() => setPurchasing(tool)} className="pse-btn pse-btn-primary w-full justify-center">
                    Purchase with BNB <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {purchasing && (
        <PurchaseFlow tool={purchasing} onClose={() => { setPurchasing(null); void refresh(); }} />
      )}
    </div>
  );
};

function LinkToDash() {
  // FIX 10: SPA navigation instead of a full page reload.
  return (
    <Link to="/mine/dashboard" className="pse-micro font-medium hover:underline" style={{ color: 'var(--pse-blue)' }}>
      Manage all tools on the dashboard →
    </Link>
  );
}

/* ═══════════════════════════ PURCHASE FLOW ═══════════════════════════ */
/* States mirror the backend purchase lifecycle — success is never shown
 * before the backend verifies the transaction on-chain. */
type FlowStep = 'quote' | 'pay' | 'verifying' | 'result';

const PurchaseFlow: React.FC<{ tool: PSEMineToolDefinition; onClose: () => void }> = ({ tool, onClose }) => {
  const {
    connectedWallet, connectWallet, isConnectingWallet, pseUser,
    requestQuote, activeQuote, clearQuote, submitPurchaseTx,
  } = usePSEMine();

  const [step, setStep] = useState<FlowStep>('quote');
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [result, setResult] = useState<{ ok: boolean; message: string; hash?: string } | null>(null);

  // Fetch quote on open
  useEffect(() => {
    let cancelled = false;
    setQuoteLoading(true);
    requestQuote(tool.id)
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setQuoteLoading(false); });
    return () => { cancelled = true; clearQuote(); };
  }, [tool.id, requestQuote, clearQuote]);

  // Quote countdown (server expiry, locally interpolated)
  useEffect(() => {
    if (!activeQuote) return;
    const tick = () => setSecondsLeft(Math.max(0, Math.floor((new Date(activeQuote.expiresAt).getTime() - nowMs()) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [activeQuote]);

  useEffect(() => {
    if (activeQuote && secondsLeft === 0 && step === 'pay') {
      clearQuote();
      setQuoteLoading(true);
      requestQuote(tool.id).finally(() => setQuoteLoading(false));
      toast('Quote expired — refreshed with the live BNB rate.', { icon: '⏳' });
    }
  }, [secondsLeft, activeQuote, step, clearQuote, requestQuote, tool.id]);

  const owned = pseUserCount(tool.id);
  function pseUserCount(id: string) {
    const counts = pseUser?.toolOwnershipCounts;
    return counts ? (counts as Record<string, number>)[id] || 0 : 0;
  }

  const sendPayment = async () => {
    if (!activeQuote) return;
    if (!connectedWallet || !EVM.test(connectedWallet)) {
      toast.error('Connect a valid BNB Smart Chain wallet first.');
      return;
    }
    setStep('verifying');
    try {
      // eth_sendTransaction via the injected provider
      const eth = (window as unknown as {
        ethereum?: { request: (args: { method: string; params?: Array<Record<string, unknown>> }) => Promise<string> };
      }).ethereum;
      if (!eth) throw new Error('No Web3 wallet found. Install MetaMask or Trust Wallet.');
      const txHash = await eth.request({
        method: 'eth_sendTransaction',
        params: [{ from: connectedWallet, to: activeQuote.receiverWallet, value: activeQuote.bnbAmountWei }],
      });
      if (!txHash) throw new Error('Transaction was not submitted.');

      // Backend verifies on-chain; activation is server-authoritative.
      const res = await submitPurchaseTx(activeQuote, txHash);
      if (res.success) {
        setResult({ ok: true, message: `${tool.name} activated. Capacity is now live in your dashboard.`, hash: txHash });
      } else {
        setResult({
          ok: false,
          message: res.error || 'Verification failed. If you already sent the payment, keep the transaction hash — support can reconcile it from the on-chain record.',
          hash: txHash,
        });
      }
      setStep('result');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Payment could not be submitted.';
      // User rejection returns to the pay step; genuine failures show a result.
      if (/user rejected|user denied|4001/i.test(msg)) {
        setStep('pay');
        toast('Payment cancelled in your wallet.');
      } else {
        setResult({ ok: false, message: msg });
        setStep('result');
      }
    }
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  /* FIX 12: derive the meter denominator from the SERVER-issued quote window
   * (createdAt → expiresAt). The 15-minute fallback only applies if the
   * backend quote predates createdAt; the server remains authoritative. */
  const quoteDurationSec = (() => {
    if (!activeQuote) return 900;
    const exp = new Date(activeQuote.expiresAt).getTime();
    const created = activeQuote.createdAt ? new Date(activeQuote.createdAt as unknown as string).getTime() : NaN;
    if (Number.isFinite(exp) && Number.isFinite(created) && exp > created) return Math.round((exp - created) / 1000);
    return 900;
  })();
  const meterPct = Math.min(100, Math.max(0, (secondsLeft / quoteDurationSec) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={`Purchase ${tool.name}`}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={step === 'verifying' ? undefined : onClose} />
      <div className="pse-scope relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border sm:rounded-2xl"
        style={{ background: 'var(--pse-surface)', borderColor: 'var(--pse-line-strong)' }}>

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b p-5"
          style={{ borderColor: 'var(--pse-line)', background: 'var(--pse-surface)' }}>
          <div>
            <p className="pse-eyebrow">Purchase</p>
            <p className="pse-h3 mt-0.5">{tool.name}</p>
          </div>
          <button onClick={onClose} disabled={step === 'verifying'} className="pse-btn pse-btn-ghost pse-btn-sm" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          {/* STEP: quote */}
          {step === 'quote' && (
            quoteLoading || !activeQuote ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <Loader2 size={22} className="animate-spin" style={{ color: 'var(--pse-blue)' }} />
                <p className="pse-caption">Requesting a live BNB quote from the server…</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="pse-card p-5">
                  <div className="flex items-baseline justify-between">
                    <span className="pse-caption">Fixed price</span>
                    <span className="pse-num text-[22px] font-semibold">{gbp(activeQuote.gbpPrice)}</span>
                  </div>
                  <div className="pse-divider my-3.5" />
                  <div className="flex items-baseline justify-between">
                    <span className="pse-caption">You pay (exact amount)</span>
                    <span className="pse-num text-[22px] font-semibold" style={{ color: 'var(--pse-cyan)' }}>
                      {Number(activeQuote.bnbAmount).toFixed(6)} BNB
                    </span>
                  </div>
                  <p className="pse-micro mt-3">
                    Rate: 1 BNB = £{Number(activeQuote.exchangeRateBNBGBP).toFixed(2)} · Quote {shortHash(activeQuote.quoteId, 8)}
                  </p>
                </div>

                <div className="flex items-center justify-between pse-caption">
                  <span style={{ color: 'var(--pse-text-2)' }}>Quote expires in</span>
                  <span className="pse-mono pse-num" style={{ color: secondsLeft < 120 ? 'var(--pse-warning)' : 'var(--pse-text)' }}>{mm}:{ss}</span>
                </div>
                <div className="pse-meter">
                  <div className="pse-meter-fill" style={{ width: `${meterPct}%` }} />
                </div>

                {owned >= tool.maxPerUser ? (
                  <p className="pse-caption p-3 rounded-xl text-center" style={{ background: 'var(--pse-inset)', border: '1px solid var(--pse-line)' }}>
                    Maximum ownership for this tool reached.
                  </p>
                ) : !connectedWallet ? (
                  <button onClick={() => void connectWallet()} disabled={isConnectingWallet} className="pse-btn pse-btn-primary w-full justify-center py-3">
                    <Wallet size={15} /> {isConnectingWallet ? 'Connecting…' : 'Connect BNB Smart Chain wallet'}
                  </button>
                ) : (
                  <button onClick={() => setStep('pay')} className="pse-btn pse-btn-primary w-full justify-center py-3">
                    Continue to payment <ChevronRight size={15} />
                  </button>
                )}
                {/* Expiry meter + caption are rendered above this block; FIX 12 keeps them server-derived. */}
                {connectedWallet && (
                  <p className="pse-micro text-center">Paying from <span className="pse-mono">{shortAddr(connectedWallet)}</span></p>
                )}
              </div>
            )
          )}

          {/* STEP: pay */}
          {step === 'pay' && activeQuote && (
            <div className="space-y-4">
              <div className="pse-card p-5 space-y-3.5">
                <div>
                  <p className="pse-eyebrow mb-1.5">Send exactly</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="pse-num text-[24px] font-semibold" style={{ color: 'var(--pse-cyan)' }}>
                      {Number(activeQuote.bnbAmount).toFixed(6)} BNB
                    </span>
                    <CopyField value={String(activeQuote.bnbAmount)} display={`${Number(activeQuote.bnbAmount).toFixed(6)} BNB`} label="BNB amount" />
                  </div>
                  <p className="pse-micro mt-1" style={{ color: 'var(--pse-warning)' }}>
                    Send the exact amount — underpayments are detected and will not activate a tool.
                  </p>
                </div>
                <div className="pse-divider" />
                <div>
                  <p className="pse-eyebrow mb-1.5">To the campaign receiving wallet</p>
                  <CopyField value={activeQuote.receiverWallet} display={shortAddr(activeQuote.receiverWallet)} label="receiving wallet" />
                  <p className="pse-micro mt-2">Verify the full address in your wallet before sending. Network: BNB Smart Chain (chain {activeQuote.chainId}).</p>
                </div>
              </div>

              <button onClick={() => void sendPayment()} className="pse-btn pse-btn-primary w-full justify-center py-3.5">
                <Wallet size={15} /> Open wallet & send {Number(activeQuote.bnbAmount).toFixed(4)} BNB
              </button>
              <button onClick={() => setStep('quote')} className="pse-btn pse-btn-ghost w-full justify-center">Back to quote</button>

              <div className="flex items-start gap-2.5 p-3.5 rounded-xl" style={{ background: 'var(--pse-inset)', border: '1px solid var(--pse-line)' }}>
                <ShieldCheck size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-cyan)' }} />
                <p className="pse-micro">
                  After you send, the backend verifies your transaction on-chain — sender, recipient, exact amount, and confirmations —
                  before the tool activates. This usually takes under a minute.
                </p>
              </div>
            </div>
          )}

          {/* STEP: verifying */}
          {step === 'verifying' && (
            <div className="flex flex-col items-center gap-4 py-14">
              <Loader2 size={26} className="animate-spin" style={{ color: 'var(--pse-blue)' }} />
              <p className="pse-h3">Verifying on BNB Smart Chain</p>
              <p className="pse-micro max-w-xs text-center">
                Confirming your transaction — sender, recipient, amount, and network confirmations. Don't close this window.
              </p>
            </div>
          )}

          {/* STEP: result */}
          {step === 'result' && result && (
            <div className="space-y-4 py-2">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={result.ok
                    ? { background: 'rgba(46,206,132,0.12)', border: '1px solid rgba(46,206,132,0.3)' }
                    : { background: 'rgba(240,68,56,0.10)', border: '1px solid rgba(240,68,56,0.3)' }}>
                  {result.ok ? <Check size={22} style={{ color: 'var(--pse-success)' }} /> : <X size={22} style={{ color: 'var(--pse-danger)' }} />}
                </div>
                <p className="pse-h2 text-[20px]">{result.ok ? 'Tool activated' : 'Verification didn\u2019t complete'}</p>
                <p className="pse-caption max-w-sm">{result.message}</p>
                {result.hash && (
                  <a href={`https://bscscan.com/tx/${result.hash}`} target="_blank" rel="noreferrer"
                    className="pse-micro inline-flex items-center gap-1.5 font-medium hover:underline" style={{ color: 'var(--pse-blue)' }}>
                    <ExternalLink size={12} /> View transaction {shortHash(result.hash)} on BscScan
                  </a>
                )}
              </div>
              <button onClick={onClose} className="pse-btn pse-btn-primary w-full justify-center py-3">
                {result.ok ? 'Go to dashboard' : 'Close'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PSEMineTools;
