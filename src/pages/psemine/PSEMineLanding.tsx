import React from 'react'
import { ArrowDownRight, ArrowRight, Check, ChevronDown, CircleDot, ShieldCheck, Sparkles } from 'lucide-react'
import { PSEMineLandingLayout } from '../../components/psemine/PSEMineWordmark'
import './psemine.css'

const steps = [
  ['01', 'Join the campaign', 'Create your PulseEarn account and reserve your place in the experience.'],
  ['02', 'Choose your capacity', 'Select the level of participation that fits your plans.'],
  ['03', 'Let it run', 'Your chosen equipment participates throughout the campaign window.'],
  ['04', 'Settle clearly', 'Follow your progress and receive the campaign outcome in pounds.'],
]

const faqs = [
  ['What is PSEmine?', 'PSEmine is a limited campaign experience inside PulseEarn, designed around real mining equipment and clear campaign participation.'],
  ['Do I need to be a mining expert?', 'No. PSEmine is designed to make participation simple, with the important information presented in plain language.'],
  ['When does the campaign begin?', 'The campaign schedule will be shared with participants before access opens.'],
  ['How are earnings shown?', 'The experience is designed around British pounds, so your progress is easy to understand.'],
]

export const PSEMineLanding: React.FC = () => (
  <PSEMineLandingLayout>
    <main>
      <section className="psemine-hero psemine-shell">
        <div className="psemine-hero-copy">
          <p className="psemine-eyebrow"><CircleDot size={13} /> A new PulseEarn experience</p>
          <h1>Mining, made <em>worth watching.</em></h1>
          <p className="psemine-lede">A considered way to participate in a time-bound mining campaign, with a clear view of what your equipment is doing and what it means for you.</p>
          <div className="psemine-hero-actions"><a className="psemine-button" href="/signup">Get started <ArrowRight size={17} /></a><a className="psemine-text-link" href="#experience">Explore PSEmine <ArrowDownRight size={16} /></a></div>
          <p className="psemine-note">Built inside PulseEarn. Designed for clarity.</p>
        </div>
        <div className="psemine-hero-visual" aria-label="A premium mining equipment preview">
          <img src="/psemine-miner.png" alt="Graphite industrial mining computer in a studio setting" />
          <div className="psemine-visual-caption"><span>Equipment preview</span><strong>Precision hardware<br />for a focused campaign</strong></div>
          <div className="psemine-visual-line" />
        </div>
      </section>

      <section className="psemine-proof psemine-shell" id="experience">
        <div><p className="psemine-eyebrow">A more thoughtful interface</p><h2>Everything you need.<br /><span>Nothing you don&apos;t.</span></h2></div>
        <div className="psemine-proof-copy"><p>PSEmine brings the physical world of mining together with the calm, familiar experience of a modern financial product.</p><a className="psemine-text-link" href="#how-it-works">See how it works <ArrowRight size={16} /></a></div>
      </section>

      <section className="psemine-preview-section psemine-shell">
        <div className="psemine-preview-intro"><p className="psemine-eyebrow">The participant view</p><h2>A clear picture of your campaign.</h2><p>Progress, equipment and earnings are brought together in one focused view — shown in pounds, not abstract balances.</p></div>
        <div className="psemine-dashboard-preview" aria-label="Illustrative PSEmine product preview">
          <div className="psemine-preview-top"><span className="psemine-mini-brand">PSEmine</span><span className="psemine-preview-status"><i /> Preview experience</span></div>
          <div className="psemine-preview-main"><div><span className="psemine-data-label">Campaign earnings</span><strong>£ —</strong><small>Shown here when your campaign begins</small></div><div className="psemine-ring"><span>Active<br /><b>view</b></span></div></div>
          <div className="psemine-preview-bottom"><div><span className="psemine-data-label">Equipment</span><b>Selected capacity</b></div><div><span className="psemine-data-label">Campaign</span><b>Participation window</b></div><div><span className="psemine-data-label">Next view</span><b>Updated regularly</b></div></div>
        </div>
      </section>

      <section className="psemine-steps-section" id="how-it-works"><div className="psemine-shell"><div className="psemine-section-heading"><p className="psemine-eyebrow">How it works</p><h2>A simple path from interest<br />to participation.</h2></div><div className="psemine-steps">{steps.map(([number, title, body]) => <article className="psemine-step" key={number}><span>{number}</span><div><h3>{title}</h3><p>{body}</p></div></article>)}</div></div></section>

      <section className="psemine-equipment psemine-shell"><div className="psemine-equipment-image"><img src="/psemine-miner.png" alt="Close detail of premium graphite mining hardware" /></div><div className="psemine-equipment-copy"><p className="psemine-eyebrow">The mining experience</p><h2>Real equipment.<br /><em>Refined participation.</em></h2><p>From the first level, Basic, through to Elite, PSEmine is built around a progression of physical technology — presented without the noise.</p><div className="psemine-equipment-list"><span><Check size={15} /> Purpose-built equipment</span><span><Check size={15} /> A focused campaign window</span><span><Check size={15} /> Clear pound-based progress</span></div></div></section>

      <section className="psemine-campaign psemine-shell"><div><p className="psemine-eyebrow">Campaign experience</p><h2>Designed as a journey,<br />not a countdown.</h2></div><div className="psemine-timeline"><div className="psemine-timeline-labels"><span>Participation opens</span><span>Campaign window</span><span>Settlement</span></div><div className="psemine-timeline-line"><i /><i /><i /></div><p>The exact campaign schedule will be communicated clearly before participation begins.</p></div></section>

      <section className="psemine-trust"><div className="psemine-shell psemine-trust-inner"><div><ShieldCheck size={24} /><p className="psemine-eyebrow">Built for clarity</p><h2>A premium experience<br />should feel understandable.</h2></div><div className="psemine-trust-points"><p><strong>See the essentials.</strong> Your campaign view keeps participation, equipment and progress close at hand.</p><p><strong>Stay in control.</strong> Wallet-based interaction is presented with the same care as the rest of PulseEarn.</p><p><strong>Share, if you want to.</strong> Referrals are an optional way to grow your participation — never the main event.</p></div></div></section>

      <section className="psemine-faq psemine-shell" id="faq"><div className="psemine-section-heading"><p className="psemine-eyebrow">Questions, answered</p><h2>Good products leave<br />less to guess.</h2></div><div className="psemine-faq-list">{faqs.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={18} /></summary><p>{answer}</p></details>)}</div></section>

      <section className="psemine-final-cta psemine-shell"><Sparkles size={20} /><h2>Make your next move<br /><em>more considered.</em></h2><p>PSEmine is coming to PulseEarn. Join the experience from the beginning.</p><a className="psemine-button" href="/signup">Get started <ArrowRight size={17} /></a></section>
    </main>
  </PSEMineLandingLayout>
)

export default PSEMineLanding
