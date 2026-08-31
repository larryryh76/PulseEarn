import React from 'react'

export const PSEMineWordmark: React.FC = () => (
  <a href="/mine" className="psemine-wordmark" aria-label="PSEmine home">
    <span className="psemine-mark" aria-hidden="true"><span /></span>
    <span>PSE<span className="psemine-wordmark-accent">mine</span></span>
  </a>
)

export const PSEMineLandingLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="psemine-site">
    <header className="psemine-header">
      <div className="psemine-shell psemine-nav">
        <PSEMineWordmark />
        <nav className="psemine-nav-links" aria-label="Main navigation">
          <a href="#experience">Experience</a>
          <a href="#how-it-works">How it works</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="psemine-nav-actions">
          <a className="psemine-signin" href="/mine/login">Sign in</a>
          <a className="psemine-button psemine-button-small" href="/mine/signup">Get started <span aria-hidden="true">↗</span></a>
        </div>
      </div>
    </header>
    {children}
    <footer className="psemine-footer">
      <div className="psemine-shell psemine-footer-inner">
        <div><PSEMineWordmark /><p>Part of the PulseEarn ecosystem.</p></div>
        <div className="psemine-footer-links"><a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="/help">Support</a></div>
        <p className="psemine-copyright">© {new Date().getFullYear()} PulseEarn</p>
      </div>
    </footer>
  </div>
)

export default PSEMineLandingLayout
