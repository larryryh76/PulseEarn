/**
 * The PSEmine authentication frame.
 *
 * ONE shell for every PSEmine authentication surface — sign in, create account,
 * password reset, email verification, access gate — so a person moving from
 * "create account" to "verify email" stays inside one product rather than
 * meeting three unrelated forms.
 *
 * COMPOSITION — one column, one axis.
 *
 *   slim bar:  [ PSEmine ]                              About PSEmine
 *   ─────────────────────────────────────────────────────────────────
 *              (vertically centred)
 *                     Sign in
 *                     one line of supporting copy
 *                     [ field ]
 *                     [ field ]
 *                     [ primary action ]
 *                     secondary action
 *                     ────────  or  ────────
 *                     alternate provider
 *                     cross-link to the sibling surface
 *   ─────────────────────────────────────────────────────────────────
 *                     security reassurance
 *
 * There is deliberately NO secondary visual panel. A panel wide enough to be
 * worth its space would have to carry product marketing to fill it — and a
 * sign-in page must contain only authentication.
 * Everything previously printed beside the form (campaign status and duration,
 * purchase window, the tool tier range, the capacity and referral ceilings) has
 * been REMOVED and now lives on the landing page, where it belongs.
 *
 * AUTHENTICATION CONTENT CONTRACT (enforced here)
 *   allowed ·  identity, welcome copy, fields, password control, primary and
 *              secondary actions, cross-navigation, loading/error/success state,
 *              one concise security reassurance
 *   banned  ·  wallet balance, mining capacity, tool marketplace, campaign
 *              statistics, referral information, earnings, platform metrics,
 *              internal architecture, access/entitlement explanations
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { PSEmineLogo } from './PSEBrand';

/** A small lock. Meaningful, not decorative — it marks the reassurance line. */
const LockGlyph: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <rect x="2.5" y="6" width="9" height="6.5" rx="1.75" stroke="currentColor" strokeWidth="1.2" />
    <path d="M5 6V4.25a2 2 0 1 1 4 0V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

export const PseAuthFrame: React.FC<{
  /** The task this surface performs. */
  title: string;
  /** One truthful line about what this surface is for. */
  lede: React.ReactNode;
  children: React.ReactNode;
  /** Cross-links to the sibling surfaces, under the form. */
  footer?: React.ReactNode;
  /**
   * `page` — a standalone full-page surface with its own bar (sign in, create
   * account, reset, verify).
   * `embedded` — the same language inside the console shell, which already
   * provides chrome (the access gate renders inside it).
   */
  variant?: 'page' | 'embedded';
}> = ({ title, lede, children, footer, variant = 'page' }) => {
  const isPage = variant === 'page';

  return (
    <div className={isPage ? 'pse pse-surface pse-auth' : 'pse pse-surface'}>
      {isPage && (
        <header className="pse-auth-bar">
          <div className="pse-wrap pse-auth-bar-inner">
            <Link to="/mine" aria-label="PSEmine home" className="inline-flex min-h-[44px] items-center">
              <PSEmineLogo size={24} decorative />
            </Link>
            <Link to="/mine" className="pse-mast-link">
              About PSEmine
            </Link>
          </div>
        </header>
      )}

      <main className={isPage ? 'pse-auth-main' : 'pse-wrap py-14'}>
        <div className="pse-auth-col mx-auto w-full">
          <header>
            <h1 className="pse-auth-title">{title}</h1>
            <p className="pse-auth-sub">{lede}</p>
          </header>

          <div className="mt-7">{children}</div>

          {footer && <div className="mt-5">{footer}</div>}

          {isPage && (
            <div className="pse-auth-foot">
              <p className="pse-reassure">
                <LockGlyph />
                <span>
                  PSEmine never asks for your private key or seed phrase, and never holds your funds.
                </span>
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PseAuthFrame;
