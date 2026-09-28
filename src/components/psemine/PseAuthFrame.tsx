/**
 * The PSEmine authentication frame.
 *
 * ONE shell for every PSEmine authentication surface — sign in, create account,
 * password reset, email verification, access gate — so a person moving from
 * "create account" to "verify email" stays inside one product rather than
 * meeting three unrelated forms.
 *
 * COMPOSITION — a product surface, not a form on an empty page.
 *
 *   slim bar:  [ PSEmine ]                              About PSEmine
 *   ─────────────────────────────────────────────────────────────────────
 *   from 1024px:                            │  Sign in
 *     ┌───────────────────────────────┐     │  one line of supporting copy
 *     │  calibration rail             │     │  [ field ]
 *     │     ┌──────┐                  │     │  [ field ]
 *     │     │ mark │  precision plate │     │  [ primary action ]
 *     │     └──────┘                  │     │  secondary action
 *     │  PSEmine · Campaign mining    │     │  ──────  or  ──────
 *     │  (faint emblem watermark)     │     │  alternate provider
 *     └───────────────────────────────┘     │  cross-link
 *   ─────────────────────────────────────────────────────────────────────
 *                                           security reassurance
 *
 * The brand panel is a real surface at the same ladder position as the rest of
 * the product (surface, ring, one lift) and it carries artwork rather than
 * information: a precision plate holding the emblem, the lockup, a calibration
 * rail with ticks, and the emblem again as a faint watermark. That is what makes
 * the screen read as this product's screen — and it is deliberately ARIA-hidden,
 * because it repeats the product's own name decoratively and states nothing a
 * person needs in order to sign in.
 *
 * Below 1024px the panel folds into a compact brand strip above the form and the
 * form becomes the full-bleed column, because on a phone the form is the task
 * and a decorative panel would only spend the scarce axis on itself.
 *
 * AUTHENTICATION CONTENT CONTRACT (enforced here)
 *   allowed ·  identity, the product name and its descriptor, fields, password
 *              control, primary and secondary actions, cross-navigation,
 *              loading/error/success state, one concise security reassurance
 *   banned  ·  wallet balance, mining capacity, tool marketplace, campaign
 *              statistics or position, referral information, earnings, platform
 *              metrics, internal architecture, access/entitlement explanations,
 *              campaign, settlement or payout education
 *
 * THE PLANE
 * The public surfaces render on the product's own plane — always dark graphite,
 * regardless of the application's theme (see src/styles/psemine.css): a sign-in
 * surface belongs to the product, not to the operator's theme preference. The
 * `embedded` variant renders inside the console, which already provides chrome
 * and the application theme, so it stays unplaned on purpose. The auth family's
 * own additions to that layer are in src/styles/psemine-auth.css.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { PSEmineLogo, PSEmineMark } from './PSEBrand';

/** A small lock. Meaningful, not decorative — it marks the reassurance line. */
const LockGlyph: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <rect x="2.5" y="6" width="9" height="6.5" rx="1.75" stroke="currentColor" strokeWidth="1.2" />
    <path d="M5 6V4.25a2 2 0 1 1 4 0V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

/**
 * The brand panel. Decorative by contract, so it is `aria-hidden`: it carries the
 * mark, the lockup and the art, and never a figure, a state or an instruction.
 */
const PseAuthBrandPanel: React.FC = () => (
  <aside className="pse-auth-panel" aria-hidden="true">
    <span className="pse-auth-panel-rail">
      <span className="pse-auth-panel-tick" />
      <span className="pse-auth-panel-tick" />
      <span className="pse-auth-panel-tick" />
      <span className="pse-auth-panel-tick" />
      <span className="pse-auth-panel-node" />
    </span>

    <span className="pse-auth-panel-watermark">
      <PSEmineMark size={280} tone="mono" decorative />
    </span>

    <span className="pse-auth-panel-lockup">
      <span className="pse-auth-plate">
        <PSEmineMark size={48} decorative />
      </span>
      <span className="pse-auth-panel-wordmark">
        <span className="pse-auth-panel-name">PSEmine</span>
        <span className="pse-auth-panel-sub">Campaign mining</span>
      </span>
    </span>
  </aside>
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
   * provides chrome and the application theme (the access gate renders inside it).
   */
  variant?: 'page' | 'embedded';
}> = ({ title, lede, children, footer, variant = 'page' }) => {
  const isPage = variant === 'page';

  return (
    <div className={isPage ? 'pse pse-surface pse-plane pse-auth' : 'pse pse-surface'}>
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
        {isPage && <PseAuthBrandPanel />}

        <div className={isPage ? 'pse-auth-formwrap' : ''}>
          <div className="pse-auth-col mx-auto w-full">
            {/* The panel carries the lockup from 1024px; below that the form
                anchors it at the task, for a person who landed straight on this
                route. The embedded variant sits inside the console's own chrome,
                so it needs neither. */}
            {isPage && (
              <span className="pse-auth-brand">
                <PSEmineMark size={20} decorative />
                <span className="pse-auth-brand-name">PSEmine</span>
              </span>
            )}

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
        </div>
      </main>
    </div>
  );
};

export default PseAuthFrame;
