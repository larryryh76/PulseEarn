import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, ArrowRight, CheckCircle2, Clock3, Home, LogOut, Package, UserRound, WalletCards, XCircle } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { safeFetch } from '../../utils/api'
import { PSEMineWordmark } from '../../components/psemine/PSEMineWordmark'
import './psemine.css'

interface Snapshot {
  campaign?: { name?: string; status?: string; startAt?: string; endAt?: string; endReason?: string }
  ownership?: Array<{ toolNameSnapshot?: string; quantity?: number; status?: string; hourlyRateGBP?: string }>
  earnings?: { grossToolEarningsGBP?: string; referralBonusGBP?: string; totalEarningsGBP?: string; status?: string; hourlyRateGBP?: string }
  wallets?: Array<{ address?: string; role?: string; network?: string; status?: string }>
  referrals?: { qualified?: number; pending?: number; rewardGBP?: string }
  activity?: Array<{ type?: string; label?: string; createdAt?: string }>
  user?: { participationStatus?: string }
}

const tools = [
  { key: 'Basic', max: 5, rate: 0.1 },
  { key: 'Core', max: 3, rate: 0.5 },
  { key: 'Advanced', max: 3, rate: 1.2 },
  { key: 'Elite', max: 2, rate: 2.5 },
]

const pounds = (value?: string | number) => `£${Number(value || 0).toFixed(2)}`
const mask = (address?: string) => address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''
const campaignLabel = (status?: string) => ({ draft: 'Campaign preparing', scheduled: 'Campaign opens soon', active: 'Campaign active', settling: 'Settlement in progress', settled: 'Campaign settled', disabled: 'Campaign unavailable', archived: 'Campaign closed' }[status || ''] || 'Campaign preparing')

export const PSEMineDashboard: React.FC = () => {
  const { currentUser, userData, logout } = useAuth()
  const navigate = useNavigate()
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!currentUser) return
    setLoading(true)
    setError(null)
    try {
      const token = await currentUser.getIdToken()
      const result = await safeFetch('/api/psemine/me', { headers: { Authorization: `Bearer ${token}` } })
      if (!result.success) throw new Error(result.message || 'We could not load your campaign data.')
      setSnapshot(result)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not load your campaign data.')
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => { void refresh() }, [refresh])

  const counts = useMemo(() => tools.map(tool => ({ ...tool, count: snapshot?.ownership?.filter(item => item.toolNameSnapshot?.toLowerCase() === tool.key.toLowerCase()).reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0 })), [snapshot])
  const activeTools = snapshot?.ownership?.filter(item => item.status === 'activated').reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0
  const hourlyRate = snapshot?.earnings?.hourlyRateGBP || counts.reduce((sum, item) => sum + item.count * item.rate, 0).toFixed(2)
  const wallet = snapshot?.wallets?.find(item => item.role === 'payout') || snapshot?.wallets?.[0]
  const activity = snapshot?.activity?.slice(0, 5) || []

  if (loading) return <div className="psemine-app-state"><span className="psemine-spinner" />Loading your campaign workspace</div>
  if (!currentUser) return <div className="psemine-app-state"><XCircle size={22} />Sign in to access PSEmine.</div>
  if (error) return <div className="psemine-app-state"><XCircle size={22} /><div><strong>We couldn&apos;t load your campaign data.</strong><p>{error}</p><button className="psemine-button" onClick={() => void refresh()}>Retry</button></div></div>

  return <div className="psemine-app-page">
    <header className="psemine-app-nav"><div className="psemine-app-nav-brand"><PSEMineWordmark /></div><nav className="psemine-app-nav-links" aria-label="PSEmine navigation"><Link className="is-active" to="/mine/dashboard"><Home />Home</Link><Link to="/mine/tools"><Package />Tools</Link><Link to="/mine/wallet"><WalletCards />Wallet</Link><Link to="/mine/activity"><Clock3 />Activity</Link><Link to="/mine/me"><UserRound />Me</Link><button onClick={async () => { await logout(); navigate('/mine') }}><LogOut />Log out</button></nav></header>
    <main className="psemine-shell psemine-dashboard-main">
      <div className="psemine-dashboard-heading"><div><span className="psemine-eyebrow">{campaignLabel(snapshot?.campaign?.status)}</span><h1>{snapshot?.campaign?.name || 'Welcome to PSEmine'}</h1><p>{userData?.username ? `Good to see you, ${userData.username}.` : 'Your campaign workspace at a glance.'}</p></div><span className="psemine-status-badge">{snapshot?.user?.participationStatus || 'onboarding'}</span></div>
      <section className="psemine-earnings-card"><div><span className="psemine-eyebrow">Campaign earnings</span><strong>{pounds(snapshot?.earnings?.totalEarningsGBP)}</strong><small>{snapshot?.earnings?.status === 'active' ? `Earning at ${pounds(hourlyRate)}/hr` : 'Authoritative GBP balance'}</small></div><Activity size={28} /></section>
      <section className="psemine-dashboard-grid psemine-dashboard-grid--three"><article className="psemine-dashboard-card"><span>Mining status</span><strong>{activeTools ? 'Mining active' : 'No active tools'}</strong><small>{activeTools ? `${activeTools} active tools` : 'Choose a tool to begin participating.'}</small>{!activeTools && <Link to="/mine/tools">Explore tools <ArrowRight size={15} /></Link>}</article><article className="psemine-dashboard-card"><span>Current hourly earnings</span><strong>{pounds(hourlyRate)}<em>/hr</em></strong><small>From authoritative active tool ownership</small></article><article className="psemine-dashboard-card"><span>Wallet readiness</span><strong>{wallet ? 'Connected' : 'Not connected'}</strong><small>{wallet ? mask(wallet.address) : 'Connect your wallet to prepare for settlement.'}</small>{!wallet && <Link to="/mine/wallet">Connect wallet <ArrowRight size={15} /></Link>}</article></section>
      <section className="psemine-dashboard-grid psemine-dashboard-grid--two"><article className="psemine-dashboard-card"><div className="psemine-app-section-head"><div><span className="psemine-eyebrow">My tools</span><h2>Owned capacity</h2></div><Link to="/mine/tools">View tools <ArrowRight size={15} /></Link></div><div className="psemine-tool-summary">{counts.map(item => <div key={item.key}><span>{item.key}</span><strong>{item.count} <small>/ {item.max}</small></strong></div>)}</div></article><article className="psemine-dashboard-card"><div className="psemine-app-section-head"><div><span className="psemine-eyebrow">Referral boost</span><h2>Qualified referrals</h2></div><Link to="/mine/referrals">View referrals <ArrowRight size={15} /></Link></div><div className="psemine-referral-value"><strong>{snapshot?.referrals?.qualified ?? 0} <small>/ 5</small></strong><span>Referral addition {pounds(snapshot?.referrals?.rewardGBP || snapshot?.earnings?.referralBonusGBP)}</span></div></article></section>
      <section className="psemine-dashboard-grid psemine-dashboard-grid--two"><article className="psemine-dashboard-card"><span className="psemine-eyebrow">Campaign progress</span><h2>{campaignLabel(snapshot?.campaign?.status)}</h2><p>{snapshot?.campaign?.startAt && snapshot?.campaign?.endAt ? `${new Date(snapshot.campaign.startAt).toLocaleDateString()} – ${new Date(snapshot.campaign.endAt).toLocaleDateString()}` : 'Campaign timing is controlled by campaign operations.'}</p></article><article className="psemine-dashboard-card"><div className="psemine-app-section-head"><div><span className="psemine-eyebrow">Recent activity</span><h2>Latest updates</h2></div><Link to="/mine/activity">View all activity <ArrowRight size={15} /></Link></div>{activity.length ? <div className="psemine-activity-preview">{activity.map((item, index) => <div key={`${item.createdAt}-${index}`}><CheckCircle2 size={16} /><span>{item.label || item.type || 'Campaign update'}</span></div>)}</div> : <div className="psemine-empty-state">No activity yet. Your verified campaign events will appear here.</div>}</article></section>
    </main>
    <nav className="psemine-mobile-nav" aria-label="Mobile PSEmine navigation">{[['/mine/dashboard', 'Home', Home], ['/mine/tools', 'Tools', Package], ['/mine/wallet', 'Wallet', WalletCards], ['/mine/activity', 'Activity', Clock3], ['/mine/me', 'Me', UserRound]].map(([href, label, Icon]) => <Link key={String(href)} to={String(href)} className={href === '/mine/dashboard' ? 'is-active' : ''}><Icon size={18} /><span>{String(label)}</span></Link>)}</nav>
  </div>
}

export default PSEMineDashboard
