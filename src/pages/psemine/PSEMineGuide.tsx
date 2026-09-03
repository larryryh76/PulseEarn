import React from 'react'
import { ArrowLeft, CheckCircle2, WalletCards, Wrench, Activity, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PSEMineLandingLayout } from '../../components/psemine/PSEMineWordmark'
import './psemine.css'

const sections = [
  { icon: WalletCards, title: 'Create your account', body: 'PSEmine uses its own campaign experience. Your account is separate from PulseEarn product access.' },
  { icon: Wrench, title: 'Connect when you are ready', body: 'Wallet connection is optional during onboarding. Connect a BNB Smart Chain wallet from Wallet before purchasing tools or configuring settlement.' },
  { icon: Activity, title: 'Activate campaign tools', body: 'Available tools, prices, limits, and ownership are loaded from the campaign backend. Nothing is simulated in the browser.' },
  { icon: ShieldCheck, title: 'Follow verified activity', body: 'Purchases and earnings are recorded against your authenticated PSEmine identity and validated server-side.' },
]

export const PSEMineGuide: React.FC = () => (
  <PSEMineLandingLayout>
    <main className="psemine-page psemine-guide-page">
      <section className="psemine-shell psemine-guide-hero">
        <Link to="/mine" className="psemine-text-link"><ArrowLeft size={16} /> Back to PSEmine</Link>
        <p className="psemine-eyebrow">PSEmine guide</p>
        <h1>Understand the campaign<br /><em>before you participate.</em></h1>
        <p className="psemine-lede">A clear operating guide for your independent PSEmine account, wallet, tools, activity, and settlement.</p>
      </section>
      <section className="psemine-shell psemine-guide-grid">
        {sections.map(({ icon: Icon, title, body }) => <article className="psemine-guide-card" key={title}><Icon /><h2>{title}</h2><p>{body}</p><CheckCircle2 /></article>)}
      </section>
      <section className="psemine-shell psemine-guide-note"><strong>Important</strong><p>PSEmine never asks for a private key or seed phrase. Only connect a wallet you control, review every transaction in your wallet, and use the official PSEmine screens for campaign actions.</p></section>
    </main>
  </PSEMineLandingLayout>
)

export default PSEMineGuide
