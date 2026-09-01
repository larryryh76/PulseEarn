import { useCallback, useEffect, useState } from 'react'
import { auth } from '../../firebase/config'
import { safeFetch } from '../../utils/api'

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
    setBusy(true); setMessage('')
    const token = await auth.currentUser?.getIdToken()
    const result = await safeFetch('/api/admin/mine/campaign/action', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ action, reason }),
    })
    setMessage(result.success ? `Campaign ${action} request completed.` : result.message || result.error || 'Action failed.')
    await load(); setBusy(false)
  }

  const saveConfig = async () => {
    setBusy(true); setMessage('')
    const token = await auth.currentUser?.getIdToken()
    const result = await safeFetch('/api/admin/mine/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ receiverWalletAddress: wallet }),
    })
    setMessage(result.success ? 'Receiving wallet saved securely.' : result.message || result.error || 'Configuration failed.')
    await load(); setBusy(false)
  }

  return <main className="psemine-admin-page"><div className="psemine-shell">
    <header className="psemine-dashboard-heading"><div><span className="psemine-eyebrow">PSEmine operations</span><h1>Campaign control</h1><p>Authorized operations only. Private keys, RPC credentials, and signer tokens never reach this browser.</p></div></header>
    <section className="psemine-dashboard-grid psemine-dashboard-grid--three">{[['Campaign status', stats?.campaignStatus || campaign?.status || 'Unavailable'], ['Active miners', stats?.activeMiners ?? 'Unavailable'], ['Accrued liability', stats ? `£${Number(stats.totalAccruedLiabilityGBP || 0).toFixed(2)}` : 'Unavailable']].map(([label, value]) => <article className="psemine-dashboard-card" key={label}><span>{label}</span><strong>{value}</strong></article>)}</section>
    <div className="psemine-dashboard-grid psemine-dashboard-grid--two">
      <section className="psemine-dashboard-card psemine-admin-controls"><h2>Secure campaign configuration</h2><p>The receiving wallet is stored in Firestore and is used by server-side payment verification. Never paste a private key here.</p><label>Authorized BSC receiving wallet<input value={wallet} onChange={event => setWallet(event.target.value)} placeholder="0x..." autoComplete="off" /></label><button disabled={busy || !wallet} onClick={() => void saveConfig()}>Save receiving wallet</button></section>
      <section className="psemine-dashboard-card psemine-admin-controls"><h2>Lifecycle controls</h2><p>Start manually, stop safely, or freeze the campaign for settlement. Every mutation is audited.</p><label>Audit reason<input value={reason} onChange={event => setReason(event.target.value)} placeholder="Why is this action being taken?" /></label><div className="psemine-hero-actions"><button disabled={busy} onClick={() => void act('start')}>Start</button><button disabled={busy} onClick={() => void act('stop')}>Stop</button><button disabled={busy} onClick={() => void act('settle')}>Settle</button><button disabled={busy} onClick={() => void act('shutdown')}>Archive</button></div></section>
    </div>
    {message && <p role="status" className="psemine-dashboard-card">{message}</p>}
    <section className="psemine-dashboard-card"><h2>Settlement queue</h2><p>{settlements.length ? `${settlements.length} settlement record${settlements.length === 1 ? '' : 's'} available for review.` : 'No settlement snapshots have been created.'}</p>{settlements.slice(0, 8).map(item => <div className="psemine-wallet-row" key={item.settlementId}><span>{item.settlementId}</span><strong>{item.status || 'pending'}</strong></div>)}</section>
  </div></main>
}
