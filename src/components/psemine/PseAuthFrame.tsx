import React from 'react';
import { Link } from 'react-router-dom';
import { PSEmineLogo } from './PSEBrand';
import { PSE_DOC_LABEL, PSE_DOC_PATH, type PseDocId } from './pseDocs';

const AUTH_DOCS: readonly PseDocId[] = ['terms', 'privacy', 'risk'];

const AuthFooterLinks: React.FC = () => (
  <nav className="pse-auth-legal" aria-label="PSEmine legal information">
    {AUTH_DOCS.map(id => (
      <Link key={id} to={PSE_DOC_PATH[id]}>{PSE_DOC_LABEL[id]}</Link>
    ))}
  </nav>
);

export const PseAuthFrame: React.FC<{
  title: string;
  lede: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: 'page' | 'embedded';
  aside?: React.ReactNode;
}> = ({ title, lede, children, footer, variant = 'page', aside }) => {
  const isPage = variant === 'page';

  if (!isPage) {
    return (
      <section className="pse pse-surface pse-auth-embedded">
        <header className="pse-auth-heading">
          <h1 className="pse-auth-title">{title}</h1>
          <p className="pse-auth-sub">{lede}</p>
        </header>
        {aside && <div className="pse-auth-context">{aside}</div>}
        <div className="pse-auth-form">{children}</div>
        {footer && <div className="pse-auth-actions">{footer}</div>}
      </section>
    );
  }

  return (
    <div className="pse pse-surface pse-plane pse-auth">
      <header className="pse-auth-bar">
        <div className="pse-auth-bar-inner">
          <Link to="/mine" aria-label="PSEmine home" className="pse-auth-brandmark">
            <PSEmineLogo size={24} decorative />
          </Link>
          <Link to="/mine" className="pse-auth-back">Back to PSEmine</Link>
        </div>
      </header>

      <main className="pse-auth-main">
        <section className="pse-auth-card" aria-labelledby="pse-auth-title">
          <header className="pse-auth-heading">
            <h1 id="pse-auth-title" className="pse-auth-title">{title}</h1>
            <p className="pse-auth-sub">{lede}</p>
          </header>

          <div className="pse-auth-form">{children}</div>

          {footer && <div className="pse-auth-actions">{footer}</div>}
          <p className="pse-auth-safe">Secure access to your PSEmine account.</p>
        </section>
        <AuthFooterLinks />
      </main>
    </div>
  );
};

export default PseAuthFrame;
