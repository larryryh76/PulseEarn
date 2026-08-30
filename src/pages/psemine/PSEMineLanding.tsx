import React, { useState } from 'react'
import { ArrowDownRight, ArrowRight, Check, ChevronDown, CircleDot, Clock3, LockKeyhole, ShieldCheck, Sparkles, WalletCards, Zap } from 'lucide-react'
import { PSEMineLandingLayout } from '../../components/psemine/PSEMineWordmark'
import './psemine.css'

const steps = [
  ['01', 'Create your account', 'Enter the PulseEarn ecosystem and reserve your place in the campaign.'],
  ['02', 'Connect your wallet', 'Keep your wallet connected for participation and eventual settlement.'],
  ['03', 'Activate mining tools', 'Choose the equipment that matches the capacity you want to build.'],
  ['04', 'Mine and follow earnings', 'Track SHA activity through a familiar campaign view shown in pounds.'],
]

const faqs = [
  ['What is PSEmine?', 'PSEmine is a limited digital mining campaign inside the PulseEarn ecosystem. You join, activate mining tools and follow your campaign earnings.'],
  ['What is SHA?', 'SHA is the digital asset at the centre of the PSEmine mining campaign. It is what your mining activity contributes toward.'],
  ['How do mining tools work?', 'Mining tools provide the capacity for your participation. The application will make your active tools and campaign activity easy to follow.'],
  ['Why are earnings displayed in pounds?', 'Pounds keep the main experience clear and familiar. SHA is the asset being mined; your campaign view is primarily presented in GBP.'],
  ['What happens at settlement?', 'When the campaign closes, the settlement stage begins and eligible campaign outcomes are sent to your connected wallet.'],
]

function ShaMark({ large = false }: { large?: boolean }) {
  return <span className={`sha-mark ${large ? 'sha-mark--large' : ''}`} aria-hidden="true"><span /></span>
}

function ProductVisual() {
  return <div className="product-visual" aria-label="Illustrative PSEmine campaign preview">
    <div className="visual-orbit visual-orbit--one" /><div className="visual-orbit visual-orbit--two" />
    <div className="sha-core"><ShaMark large /><span>SHA</span></div>
    <div className="visual-line visual-line--one"><span>capacity</span><i /></div>
    <div className="visual-line visual-line--two"><span>activity</span><i /></div>
    <div className="visual-line visual-line--three"><span>settlement</span><i /></div>
    <div className="preview-panel preview-panel--top"><span>Campaign status</span><strong>Building</strong><b><i /></b></div>
    <div className="preview-panel preview-panel--bottom"><span>Campaign earnings</span><strong>£—</strong><small>Shown in GBP</small></div>
    <div className="preview-chip"><Zap size={14} /> SHA mining</div>
  </div>
}

function EarningsPreview() {
  return <div className="earnings-preview">
    <div className="earnings-preview__head"><div><span className="eyebrow">Illustrative product view</span><h3>Campaign earnings</h3></div><span className="status-pill"><i /> Active</span></div>
    <div className="earnings-preview__value">£<span>—</span></div>
    <div className="earnings-preview__rule" />
    <div className="earnings-preview__rows"><div><span>Mining asset</span><strong><ShaMark /> SHA</strong></div><div><span>Mining capacity</span><strong>Tools active</strong></div><div><span>Campaign stage</span><strong>Participation</strong></div></div>
    <div className="earnings-preview__foot"><CircleDot size={16} /> Your campaign view keeps the focus on earnings in pounds.</div>
  </div>
}

function ToolPreview() {
  return <div className="tools-stage"><div className="tool tool--basic"><div className="tool-top" /><div className="tool-body" /><span>Basic</span></div><div className="tool tool--core"><div className="tool-top" /><div className="tool-body" /><span>Core</span></div><div className="tool tool--advanced"><div className="tool-top" /><div className="tool-body" /><span>Advanced</span></div><div className="tool tool--elite"><div className="tool-top" /><div className="tool-body" /><span>Elite</span></div><div className="tool-signal"><ShaMark /><span>One equipment family.<br />Four ways to build capacity.</span></div></div>
}

export const PSEMineLanding: React.FC = () => {
  const [openFaq, setOpenFaq] = useState(0)
  return (
    <PSEMineLandingLayout>
    <main className="psemine-page">
      <section className="psemine-hero psemine-shell"><div className="psemine-hero-copy"><p className="psemine-eyebrow"><CircleDot size={13} /> A limited PulseEarn campaign</p><h1>Mine SHA.<br /><em>Build your earning capacity.</em></h1><p className="psemine-lede">Join PSEmine, activate mining tools and follow your campaign earnings in pounds.</p><div className="psemine-hero-actions"><a className="psemine-button" href="/signup">Join PSEmine <ArrowRight size={17} /></a><a className="psemine-text-link" href="#how-it-works">How it works <ArrowDownRight size={16} /></a></div><p className="psemine-note">A clearer way to enter digital mining.</p></div><ProductVisual /></section>

      <section className="sha-section" id="experience"><div className="psemine-shell sha-grid"><div className="sha-display"><div className="sha-display__halo" /><ShaMark large /><span className="sha-display__label">SHA / digital asset</span></div><div className="psemine-section-copy"><p className="psemine-eyebrow">The asset at the centre</p><h2>Meet SHA.</h2><p>SHA is what you are mining inside the PSEmine campaign. Your tools create capacity, your activity contributes to SHA mining, and your campaign experience stays grounded in a balance you can understand.</p><div className="psemine-inline-value"><span>Mining asset</span><strong><ShaMark /> SHA</strong></div></div></div></section>

      <section className="psemine-steps-section" id="how-it-works"><div className="psemine-shell"><div className="psemine-section-heading"><p className="psemine-eyebrow">How PSEmine works</p><h2>A simple path from joining<br /><em>to campaign earnings.</em></h2></div><div className="psemine-steps">{steps.map(([number, title, body]) => <article className="psemine-step" key={number}><span>{number}</span><div><h3>{title}</h3><p>{body}</p></div><ArrowRight size={18} /></article>)}</div></div></section>

      <section className="capacity-section"><div className="psemine-shell"><div className="capacity-heading"><div><p className="psemine-eyebrow">The relationship is simple</p><h2>Tools become capacity.<br /><em>Capacity becomes activity.</em></h2></div><p>Activate equipment, follow your SHA mining, and see the campaign value in a familiar view of pounds.</p></div><div className="capacity-flow"><div><div className="flow-icon"><Sparkles /></div><strong>Mining tool</strong><small>Equipment you activate</small></div><ArrowRight /><div><div className="flow-icon"><Zap /></div><strong>Mining capacity</strong><small>Power to participate</small></div><ArrowRight /><div><div className="flow-icon"><ShaMark /></div><strong>SHA mining</strong><small>The asset at work</small></div><ArrowRight /><div className="flow-final"><div className="flow-icon">£</div><strong>Campaign earnings</strong><small>Your primary view</small></div></div></div></section>

      <section className="earnings-section"><div className="psemine-shell earnings-grid"><div className="psemine-section-copy"><p className="psemine-eyebrow">A product view built for clarity</p><h2>See the value.<br /><em>Not the noise.</em></h2><p>PSEmine puts campaign earnings first. SHA is the asset being mined, but the experience you return to is a familiar view of your progress in pounds.</p><div className="clarity-list"><span><Check size={15} /> GBP-first campaign view</span><span><Check size={15} /> Clear mining status</span><span><Check size={15} /> No tokenomics overload</span></div></div><EarningsPreview /></div></section>

      <section className="psemine-equipment"><div className="psemine-shell"><div className="tools-heading"><div><p className="psemine-eyebrow">The mining tool family</p><h2>Start with a tool.<br /><em>Build toward Elite.</em></h2></div><p>A progression of purpose-designed equipment, made to feel like one PSEmine family. Explore the details after you enter the campaign.</p></div><ToolPreview /></div></section>

      <section className="referral-section"><div className="psemine-shell referral-grid"><div className="referral-mark"><WalletCards size={23} /><span>Optional<br />boost</span></div><div><p className="psemine-eyebrow">Grow your capacity</p><h2>Invite the right people.<br /><em>Keep your focus on mining.</em></h2></div><p>Referrals are an optional boost for participants who want to grow their campaign activity. They are part of the experience, never the whole story.</p></div></section>

      <section className="psemine-campaign"><div className="psemine-shell campaign-grid"><div><p className="psemine-eyebrow">A defined campaign window</p><h2>Participation has a beginning,<br /><em>a middle and a close.</em></h2></div><div className="psemine-timeline"><div><span>01</span><strong>Participation</strong><small>Join, connect and activate your tools.</small></div><div><span>02</span><strong>Mining</strong><small>Build capacity and follow SHA activity.</small></div><div><span>03</span><strong>Settlement</strong><small>The campaign closes and outcomes are settled.</small></div></div></div></section>

      <section className="psemine-trust"><div className="psemine-shell trust-grid"><div><ShieldCheck size={24} /><p className="psemine-eyebrow">Designed for confidence</p><h2>A serious product<br /><em>should feel clear.</em></h2></div><div className="trust-points"><div><LockKeyhole /><span><strong>Your wallet stays yours.</strong>Wallet connection is part of participation, not a reason to compromise ownership.</span></div><div><ShieldCheck /><span><strong>Activity is visible.</strong>Follow the campaign through a product experience designed to be understood.</span></div><div><Clock3 /><span><strong>Settlement is contextual.</strong>The campaign has a defined close, so the next step is never hidden.</span></div></div></div></section>

      <section className="psemine-faq psemine-shell" id="faq"><div className="faq-grid"><div className="psemine-section-heading"><p className="psemine-eyebrow">Questions, answered</p><h2>Understand it<br /><em>before you join.</em></h2></div><div className="psemine-faq-list">{faqs.map(([question, answer], index) => <div className={`faq-item ${openFaq === index ? 'is-open' : ''}`} key={question}><button onClick={() => setOpenFaq(openFaq === index ? -1 : index)} aria-expanded={openFaq === index}><span>{question}</span><ChevronDown size={18} /></button>{openFaq === index && <p>{answer}</p>}</div>)}</div></div></section>

      <section className="psemine-final-cta psemine-shell"><ShaMark large /><p className="psemine-eyebrow">The next campaign is taking shape</p><h2>Build your place<br /><em>inside PSEmine.</em></h2><p>Join the PulseEarn ecosystem and be ready for a different kind of mining experience.</p><a className="psemine-button" href="/signup">Join PSEmine <ArrowRight size={17} /></a></section>
    </main>
    </PSEMineLandingLayout>
  )
}

export default PSEMineLanding
