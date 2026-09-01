import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Activity, ArrowRight, ShieldAlert, WalletCards, Home, Package, Clock3, UserRound, BookOpen, LogOut } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { safeFetch } from '../../utils/api'
import './psemine.css'

interface Snapshot {
  campaign?: { name?: string; status?: string; endAt?: string }
  ownership?: Array<{ toolNameSnapshot?: string; quantity?: number; status?: string }>
  earnings?: { grossToolEarningsGBP?: string; referralBonusGBP?: string; totalEarningsGBP?: string; status?: string }
  capacity?: { activeTools?: number; hourlyRateGBP?: string }
  referrals?: { qualified?: number; maximum?: number; hourlyBoostGBP?: string }
  activity?: Array<{ type?: string; message?: string; createdAt?: string }>
  wallets?: Array<{ address?: string; role?: string; network?: string; status?: string }>
  user?: { participationStatus?: string }
}

const money = (value?: string) => `£${Number(value || 0).toFixed(2)}`

export const PSEmineApp: React.FC = () => {
  const { currentUser, loading: authLoading, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [error, setError] = useState<{ code?: string; message?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const requestUserId = useRef<string | null>(null)

  const refresh = useCallback(async () => {
    const user = currentUser
    requestUserId.current = user?.uid ?? null
    if (!user) {
      setSnapshot(null)
      setError(null)
      setLoading(false)
      return
    }
    setSnapshot(null)
    setError(null)
    setLoading(true)
    const token = await user.getIdToken()
    const result = await safeFetch('/api/psemine/me', { headers: { Authorization: `Bearer ${token}` } })
    if (requestUserId.current !== user.uid) return
    if (result.success) {
      setSnapshot(result)
      setError(null)
    } else {
      setError({ code: result.error, message: result.message })
    }
    setLoading(false)
  }, [currentUser])

  useEffect(() => { void refresh() }, [refresh])

  if (authLoading || loading) return <div className="psemine-app-state"><span className="psemine-spinner" />Loading your campaign workspace</div>
  if (!currentUser) return <div className="psemine-app-state"><ShieldAlert size={22} />Sign in to access PSEmine.</div>
  if (error) return <div className="psemine-app-state"><ShieldAlert size={22} /><div><strong>{error.code === 'PSEmine_ACCESS_REQUIRED' ? 'Finish PSEmine onboarding' : 'Campaign data unavailable'}</strong><p>{error.message}</p><button className="psemine-button" onClick={() => { window.location.href = '/mine' }}>Return to PSEmine</button></div></div>

  const total = snapshot?.earnings?.totalEarningsGBP || '0.00'
  const activeTools = snapshot?.capacity?.activeTools ?? (snapshot?.ownership?.filter(tool => tool.status === 'activated').reduce((sum, tool) => sum + Number(tool.quantity || 0), 0) || 0)

  const navItems = [{ href: '/mine/app', label: 'Home', icon: Home }, { href: '/mine/tools', label: 'Tools', icon: Package }, { href: '/mine/activity', label: 'Activity', icon: Clock3 }, { href: '/mine/guide', label: 'Guide', icon: BookOpen }, { href: '/mine/me', label: 'Me', icon: UserRound }]
  return <div className="psemine-app-page">
    <nav className="psemine-app-nav" aria-label="PSEmine workspace"><Link to="/mine/app" className="psemine-app-nav-brand">PSEmine</Link><div className="psemine-app-nav-links">{navItems.map(({ href, label, icon: Icon }) => <Link key={href} to={href} className={location.pathname === href ? 'is-active' : ''}><Icon />{label}</Link>)}<button onClick={async () => { await logout(); navigate('/mine') }} aria-label="Log out"><LogOut />Log out</button></div></nav>
    <header className="psemine-app-header psemine-shell"><div><span className="psemine-eyebrow">PSEmine campaign workspace</span><h1>{snapshot?.campaign?.name || 'Your campaign'}</h1></div><span className="psemine-status-badge">{snapshot?.user?.participationStatus || 'onboarding'}</span></header>
    <main className="psemine-shell psemine-app-main">
      {location.pathname !== '/mine/app' && <section className="psemine-app-section psemine-feature-state"><span className="psemine-eyebrow">{navItems.find(item => item.href === location.pathname)?.label || 'PSEmine'}</span><h2>This workspace is ready for authoritative data.</h2><p>That capability is not enabled in the current backend configuration. Nothing has been simulated or mutated in the browser.</p><Link to="/mine/app" className="psemine-button psemine-button-secondary">Return home <ArrowRight /></Link></section>}
      <section className="psemine-earnings-card"><div><span className="psemine-eyebrow">Campaign earnings</span><strong>{money(String(total))}</strong><small>Authoritative GBP earnings · {snapshot?.earnings?.status || 'not started'}</small></div><Activity size={28} /></section>
      <section className="psemine-metrics"><article><span>Active tools</span><strong>{activeTools}</strong><small>Ownership is backend-controlled</small></article><article><span>Referral bonus</span><strong>{money(snapshot?.earnings?.referralBonusGBP)}</strong><small>Qualified referrals only</small></article><article><span>Wallet status</span><strong>{snapshot?.wallets?.length ? 'Ready' : 'Required'}</strong><small>BNB Smart Chain</small></article></section>
      <section className="psemine-app-section"><div className="psemine-app-section-head"><div><span className="psemine-eyebrow">Owned tools</span><h2>Build capacity with purpose.</h2></div><a href="/mine/tools">View tools <ArrowRight size={16} /></a></div>{snapshot?.ownership?.length ? <div className="psemine-ownership-list">{snapshot.ownership.map((tool, index) => <div key={`${tool.toolNameSnapshot}-${index}`}><strong>{tool.toolNameSnapshot || 'PSEmine tool'}</strong><span>{tool.quantity || 0} owned · {tool.status || 'pending'}</span></div>)}</div> : <div className="psemine-empty-state">No tools have been activated yet.<a href="/mine/tools">Explore available tools <ArrowRight size={16} /></a></div>}</section>
      <section className="psemine-app-section"><div className="psemine-app-section-head"><div><span className="psemine-eyebrow">Wallets</span><h2>Settlement destination</h2></div><WalletCards size={22} /></div>{snapshot?.wallets?.length ? snapshot.wallets.map(wallet => <div className="psemine-wallet-row" key={`${wallet.role}-${wallet.address}`}><span>{wallet.role === 'payout' ? 'Payout wallet' : 'Connected wallet'}</span><strong>{wallet.address}</strong><small>{wallet.network} · {wallet.status}</small></div>) : <div className="psemine-empty-state">Connect a BNB Smart Chain wallet during onboarding.</div>}</section>
    </main>
  </div>
}

export default PSEmineApp
