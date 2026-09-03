import { useCallback, useEffect, useState } from 'react'
import { auth } from '../../firebase/config'
import { safeFetch } from '../../utils/api'
import { ShieldCheck, RefreshCw, AlertTriangle, Layers, Wallet, Play, Square, CheckCircle, Archive, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import '../psemine/psemine.css'

export default function PSEmineAdmin() {
  const [stats, setStats] = useState<any>(null)
  const [campaign, setCampaign] = useState<any>(null)
  const [wallet, setWallet] = useState('')
  const [reason, setReason] = useState('')
  const [settlements, setSettlements] = useState<any[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken()
    if (!token) return
    const headers = { Authorization: `Bearer ${token}` }
    const [overview, queue, config] = await Promise.all([
      safeFetch('/api/admin/mine/overview', { headers }),
      safeFetch('/api/admin/mine/settlements', { headers }),
      safeFetch('/api/admin/mine/config', { headers }),
    ])
    if (overview.success) setStats(overview.stats)
    if (queue.success) setSettlements(queue.settlements || [])
    if (config.success) {
      setCampaign(config.campaign)
      setWallet(config.campaign?.receiverWalletAddress || '')
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const act = async (action: string) => {
    if (!window.confirm(`Are you sure you want to perform action '${action.toUpperCase()}' on the active PSEmine campaign?`)) {
      return
    }
    setBusy(true); setMessage('')
    const token = await auth.currentUser?.getIdToken()
    const result = await safeFetch('/api/admin/mine/campaign/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ action, reason }),
    })
    const msg = result.success ? `Campaign ${action} request completed.` : result.message || result.error || 'Action failed.'
    setMessage(msg)
    if (result.success) toast.success(msg)
    else toast.error(msg)
    await load(); setBusy(false)
  }

  const saveConfig = async () => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet.trim())) {
      toast.error('Enter a valid EVM/BSC wallet address.')
      return
    }
    setBusy(true); setMessage('')
    const token = await auth.currentUser?.getIdToken()
    const result = await safeFetch('/api/admin/mine/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ receiverWalletAddress: wallet.trim() }),
    })
    const msg = result.success ? 'Receiving wallet saved securely.' : result.message || result.error || 'Configuration failed.'
    setMessage(msg)
    if (result.success) toast.success(msg)
    else toast.error(msg)
    await load(); setBusy(false)
  }

  const handleBootstrap = async () => {
    if (!window.confirm('Initialize or reset PSEmine default campaign configuration? This will not affect user balances.')) {
      return
    }
    setBusy(true); setMessage('')
    const token = await auth.currentUser?.getIdToken()
    const result = await safeFetch('/api/psemine/admin/bootstrap', {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    })
    const msg = result.success ? result.message : result.message || 'Bootstrap failed.'
    setMessage(msg)
    if (result.success) toast.success(msg)
    else toast.error(msg)
    await load(); setBusy(false)
  }

  return (
    <main className="psemine-site" style={{ minHeight: '100vh', padding: '40px 0 80px' }}>
      <div className="psemine-shell">
        <div style={{ marginBottom: '24px' }}>
          <Link to="/admin/overview" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--pm-cyan)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, textDecoration: 'none' }}>
            <ArrowLeft size={14} /> Back to Admin Operations
          </Link>
        </div>

        <header className="psemine-dashboard-heading" style={{ marginBottom: '32px' }}>
          <div>
            <span className="psemine-eyebrow"><ShieldCheck size={13} /> PSEmine Operations Control</span>
            <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '4px 0' }}>Campaign Command & Audit Center</h1>
            <p style={{ color: 'var(--pm-muted)', fontSize: '14px', margin: 0 }}>
              Backend-authoritative control panel for PSEmine tools, campaigns, and settlements.
            </p>
          </div>
          <button
            onClick={() => void load()}
            disabled={busy}
            className="psemine-button psemine-button-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <RefreshCw size={14} className={busy ? 'animate-spin' : ''} /> Refresh Data
          </button>
        </header>

        <section className="psemine-dashboard-grid psemine-dashboard-grid--three" style={{ marginBottom: '32px' }}>
          <article className="psemine-dashboard-card">
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#707786', fontWeight: 700 }}>Campaign Status</span>
            <strong style={{ fontSize: '24px', color: 'var(--pm-cyan)' }}>{stats?.campaignStatus || campaign?.status || 'Draft'}</strong>
            <small style={{ color: 'var(--pm-muted)', fontSize: '12px' }}>90-Day Fixed Campaign Lifecycle</small>
          </article>
          <article className="psemine-dashboard-card">
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#707786', fontWeight: 700 }}>Active Miners</span>
            <strong style={{ fontSize: '24px', color: '#fff' }}>{stats?.activeMiners ?? 0} <span style={{ fontSize: '14px', color: '#707786' }}>/ {stats?.totalMiners ?? 0} total</span></strong>
            <small style={{ color: 'var(--pm-muted)', fontSize: '12px' }}>{stats?.toolsSold ?? 0} tools deployed</small>
          </article>
          <article className="psemine-dashboard-card">
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#707786', fontWeight: 700 }}>Accrued Capacity Liability</span>
            <strong style={{ fontSize: '24px', color: '#10B981' }}>£{Number(stats?.totalAccruedLiabilityGBP || 0).toFixed(2)}</strong>
            <small style={{ color: 'var(--pm-muted)', fontSize: '12px' }}>£{Number(stats?.totalCapacityGBPPerHour || 0).toFixed(2)}/hr current rate</small>
          </article>
        </section>

        <div className="psemine-dashboard-grid psemine-dashboard-grid--two" style={{ marginBottom: '32px' }}>
          <section className="psemine-dashboard-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Wallet size={18} style={{ color: 'var(--pm-cyan)' }} />
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Treasury Receiving Wallet</h2>
            </div>
            <p style={{ color: 'var(--pm-muted)', fontSize: '13px', lineHeight: 1.5, margin: '0 0 20px' }}>
              The official campaign payment receiver address on BNB Smart Chain. Used for server-side verification of tool purchases.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--pm-muted)', fontWeight: 700 }}>
                BSC Treasury Address (BEP20)
                <input
                  value={wallet}
                  onChange={e => setWallet(e.target.value)}
                  placeholder="0x..."
                  autoComplete="off"
                  style={{ background: 'var(--pm-soft)', border: '1px solid var(--pm-line)', borderRadius: '8px', padding: '12px', color: '#fff', fontFamily: 'monospace', fontSize: '13px' }}
                />
              </label>
              <button
                disabled={busy || !wallet.trim()}
                onClick={() => void saveConfig()}
                className="psemine-button"
                style={{ border: 0, cursor: 'pointer' }}
              >
                Save Receiver Address
              </button>
            </div>
          </section>

          <section className="psemine-dashboard-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Layers size={18} style={{ color: 'var(--pm-cyan)' }} />
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Lifecycle & System Seed</h2>
            </div>
            <p style={{ color: 'var(--pm-muted)', fontSize: '13px', lineHeight: 1.5, margin: '0 0 16px' }}>
              Control campaign lifecycle or bootstrap default campaign tools & rules safely.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--pm-muted)', fontWeight: 700 }}>
                Audit Note / Reason
                <input
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Reason for administrative action..."
                  style={{ background: 'var(--pm-soft)', border: '1px solid var(--pm-line)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '13px' }}
                />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button disabled={busy} onClick={() => void act('start')} className="psemine-button" style={{ border: 0, cursor: 'pointer', background: '#10B981', color: '#000', fontSize: '12px', padding: '10px' }}>
                  <Play size={14} /> Start Campaign
                </button>
                <button disabled={busy} onClick={() => void act('stop')} className="psemine-button" style={{ border: 0, cursor: 'pointer', background: '#EF4444', color: '#fff', fontSize: '12px', padding: '10px' }}>
                  <Square size={14} /> Stop
                </button>
                <button disabled={busy} onClick={() => void act('settle')} className="psemine-button" style={{ border: 0, cursor: 'pointer', background: '#F59E0B', color: '#000', fontSize: '12px', padding: '10px' }}>
                  <CheckCircle size={14} /> Settle
                </button>
                <button disabled={busy} onClick={() => void act('shutdown')} className="psemine-button" style={{ border: 0, cursor: 'pointer', background: '#6B7280', color: '#fff', fontSize: '12px', padding: '10px' }}>
                  <Archive size={14} /> Archive
                </button>
              </div>
              <button
                disabled={busy}
                onClick={() => void handleBootstrap()}
                style={{ background: 'var(--pm-soft)', border: '1px solid var(--pm-line)', color: 'var(--pm-cyan)', borderRadius: '8px', padding: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', marginTop: '4px' }}
              >
                Bootstrap Initial Campaign Defaults
              </button>
            </div>
          </section>
        </div>

        {message && (
          <div className="psemine-dashboard-card" style={{ marginBottom: '32px', background: 'rgba(139, 229, 239, 0.08)', border: '1px solid rgba(139, 229, 239, 0.25)', color: '#fff', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} style={{ color: 'var(--pm-cyan)' }} />
            <span>{message}</span>
          </div>
        )}

        <section className="psemine-dashboard-card">
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px' }}>Settlement Queue</h2>
          <p style={{ color: 'var(--pm-muted)', fontSize: '13px', margin: '0 0 20px' }}>
            {settlements.length ? `${settlements.length} settlement record(s) pending processing.` : 'No settlements queued.'}
          </p>
          {settlements.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {settlements.slice(0, 10).map(item => (
                <div key={item.settlementId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--pm-soft)', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', border: '1px solid var(--pm-line)' }}>
                  <div>
                    <strong style={{ color: '#fff', display: 'block', fontSize: '13px', fontFamily: 'monospace' }}>{item.settlementId}</strong>
                    <span style={{ color: 'var(--pm-muted)', fontSize: '11px' }}>User: {item.userId}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: 'var(--pm-cyan)', fontWeight: 800, display: 'block' }}>£{Number(item.amountGBP || 0).toFixed(2)}</span>
                    <small style={{ textTransform: 'uppercase', color: '#707786', fontSize: '10px', fontWeight: 700 }}>{item.status || 'pending'}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--pm-muted)', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>
              No settlement snapshots created yet.
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
