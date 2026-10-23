/**
 * PSEmine console primitives — the authenticated product's presentation.
 *
 * ONE VOCABULARY, ONE PRODUCT. Every console route composes from the components
 * in this file, and every one of them is a thin wrapper over a class in the
 * product's own visual layer (src/styles/psemine.css, extended by
 * src/styles/psemine-console.css). A page here never invents its own surface, so
 * a change to the register, the ledger or the empty state lands on all nine
 * console routes at once instead of on one.
 *
 * WHAT THIS FILE IS FOR. It is the console's presentation only. Behaviour —
 * every call, guard, mutation and piece of derived state — lives in the pages
 * and in pseCore.ts / PseStateProvider.ts, and nothing here reads product state
 * or decides anything. Pages import behaviour, never presentation, from those
 * modules.
 *
 * THE RULES THESE COMPONENTS ENFORCE
 *   • A section is a NAMED REGISTER, not a card. A term, an optional meta, a
 *     hairline, then content. Panels are for objects; registers are for the page.
 *   • A FIGURE IS TABULAR AND RIGHT-ALIGNED in a column, so a column can be read
 *     down. `PseFacts` is the key/value register; `PseTable` is the ledger.
 *   • AN EMPTY COLLECTION STATES ITSELF and offers the one real next step. It is
 *     never given a record to fill the gap, and never given a button that only
 *     dismisses itself.
 *   • A FAILURE SAYS WHETHER A RETRY IS HONEST. Loading and blocking failures are
 *     NOT re-invented here: they render through the product's loader family
 *     (PseLoader / PseLoadFailure), so the whole product reports a slow load or a
 *     refusal the same way.
 *   • A CONTROL HAS EVERY STATE. Hover, focus-visible, active, disabled, busy and
 *     invalid are all stated in CSS; a control that only looks enabled is a lie.
 */
import React from 'react';
import type { PseErrorInfo } from '../../engines/psemine/pseErrors';
import type { PseStateTool } from '../../engines/psemine/pseMineApi';
import { PseLoadFailure, PseLoader, type PseLoadStage } from './PseLoader';
import { PseGlyph, type PseGlyphName } from './PseMechanism';
import { CYCLE_STATE_MAP, cycleStateView, gbpHour, operatingModelView, toDateSafe } from './pseCore';

/* ═══════════════ PAGE ═══════════════ */

/**
 * A console page. The head states the page's title and its objective — one line
 * naming what the surface is for, so a reader knows what to expect before they
 * read a single figure — and then the page's own controls.
 */
export const PsePage: React.FC<{
  title: string;
  objective?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, objective, actions, children }) => (
  <div className={`pse-console-main pse-route-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} data-pse-route={title.toLowerCase().replace(/[^a-z0-9]+/g, '-') }>
    <header className="pse-page-head">
      <div className="pse-page-head-main min-w-0">
        <h1 className="pse-page-title">{title}</h1>
        {objective && <p className="pse-page-objective">{objective}</p>}
      </div>
      {actions && <div className="pse-page-actions">{actions}</div>}
    </header>
    {children}
  </div>
);

/**
 * A named register on a page. The term is the console's data-label role: mono,
 * tracked, uppercase, quiet — the content below it is what speaks.
 */
export const PseSection: React.FC<{ title?: string; meta?: React.ReactNode; children: React.ReactNode }> = ({
  title, meta, children,
}) => (
  <section className="pse-block">
    {(title || meta) && (
      <div className="pse-block-head">
        {title && <h2 className="pse-block-title">{title}</h2>}
        {meta && <span className="pse-block-meta">{meta}</span>}
      </div>
    )}
    {children}
  </section>
);

/**
 * The console's two-column composition: the dominant block on the left, the
 * supporting register beside it.
 *
 * ONE COLUMN ON A PHONE, TWO FROM 768px, AND THE PAGE'S OWN COMPONENT SIZES ARE
 * WRITTEN FOR THE NARROW COLUMN. A 768px screen is not a 390px screen: the
 * dominant register and its supporting column both fit, and stacking them there
 * makes a tablet read as a phone in landscape, which is what this rule exists to
 * stop. The supporting column is the narrow one (~1/3), so a register whose
 * contents cannot live in a third of a tablet states its own composition inside
 * its own block rather than expecting the split to know about it.
 */
export const PseSplit: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="pse-split-console">{children}</div>
);

/** A vertical stack of registers. */
export const PseStack: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="pse-stack">{children}</div>
);

/* ═══════════════ CONTROLS ═══════════════ */

/**
 * A control. `primary` is the one action a surface is asking for; everything
 * else is `secondary`. `tone="danger"` is outlined rather than filled, because
 * red in this product also states a state.
 *
 * `busy` states the work AND holds the width: a control that resizes when it
 * starts working moves the thing the reader was about to click.
 */
export const PseButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    tone?: 'default' | 'danger';
    variant?: 'primary' | 'secondary';
    size?: 'md' | 'sm';
    block?: boolean;
    busy?: boolean;
  }
> = ({
  tone = 'default', variant = 'primary', size = 'md', block, busy,
  className = '', type = 'button', children, ...rest
}) => {
  const cls = [
    'pse-btn',
    variant === 'secondary' ? 'pse-btn--secondary' : '',
    tone === 'danger' ? 'pse-btn--danger' : '',
    size === 'sm' ? 'pse-btn--sm' : '',
    block ? 'pse-btn--block' : '',
    className,
  ].filter(Boolean).join(' ');
  return (
    <button {...rest} type={type} className={cls} aria-busy={busy || undefined}>
      {children}
    </button>
  );
};

/*
 * A NAVIGATING ACTION IS A LINK, AND IT IS STYLED AS ONE.
 *
 * Where a console surface needs "go to this page" as a control, the page writes
 * `<Link className="pse-btn pse-btn--secondary pse-btn--sm">` rather than
 * wrapping a button in an onClick. That is deliberate and not repeated here as a
 * component: a component called `LinkButton` is how a codebase ends up with one
 * more abstraction than it has uses, and the class list is the whole of the
 * convention.
 */

/** A basic form control, on the product's own input surface. */
export const PseInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = '', ...rest }) => (
  <input {...rest} className={`pse-input ${className}`} />
);

/** A labelled field. The label is the field's name; the hint qualifies it. */
export const PseField: React.FC<{
  label: string; hint?: string; htmlFor?: string; children: React.ReactNode; error?: string;
}> = ({ label, hint, htmlFor, children, error }) => (
  <div className="pse-field">
    <label className="pse-label" htmlFor={htmlFor}>
      <span>{label}</span>
      {hint && <span className="pse-label-hint">{hint}</span>}
    </label>
    {children}
    {error && (
      <p className="pse-field-error" role="alert">
        {error}
      </p>
    )}
  </div>
);

/** A single-glyph control: the sheet close, a refresh, a nav toggle. */
export const PseIconButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; badge?: number }
> = ({ label, badge, className = '', children, ...rest }) => (
  <button
    {...rest}
    type="button"
    aria-label={label}
    title={label}
    className={`pse-icon-btn ${className}`}
  >
    {children}
    {typeof badge === 'number' && badge > 0 && (
      <span className="pse-icon-btn-badge" aria-hidden="true">{badge > 99 ? '99+' : badge}</span>
    )}
  </button>
);

/* ═══════════════ STATE LABELS ═══════════════ */

export type PseStatusTone = 'good' | 'hold' | 'danger' | 'idle';

/**
 * A state, stated in words first. The dot and colour are the second reading, so
 * a reader who cannot separate the tones still reads the exact state.
 */
export const PseStatus: React.FC<{ tone?: PseStatusTone; children: React.ReactNode }> = ({
  tone = 'idle', children,
}) => (
  <span className="pse-status" data-tone={tone}>{children}</span>
);

/** The tone of a backend operating-cycle state. Never inferred from capacity. */
function cycleTone(state?: string | null): PseStatusTone {
  if (state === 'active') return 'good';
  if (state === 'paused' || state === 'restarting' || state === 'cycle_complete'
    || state === 'maintenance_required' || state === 'settling') return 'hold';
  if (state === 'revoked' || state === 'expired') return 'danger';
  return 'idle';
}

/* ═══════════════ FIGURES ═══════════════ */

/**
 * A compact operational strip: label, figure, optional qualifier. Figures are
 * tabular and share one baseline, so a row of them is scanned rather than read.
 */
export const PseStatBar: React.FC<{ cols?: 2 | 3 | 4; children: React.ReactNode }> = ({
  cols = 4, children,
}) => (
  <dl className="pse-statbar" style={{ ['--pse-statbar-cols' as string]: String(cols) }}>{children}</dl>
);

export const PseStat: React.FC<{ label: string; value: React.ReactNode; note?: React.ReactNode }> = ({
  label, value, note,
}) => (
  <div className="pse-stat">
    <dt className="pse-stat-key">{label}</dt>
    <dd className="pse-stat-val">{value}</dd>
    {note && <dd className="pse-stat-note">{note}</dd>}
  </div>
);

/* ═══════════════ OWNED EQUIPMENT ═══════════════ */

/** Activation date, printed once per unit; undated records say so. */
function activatedLabel(tool: PseStateTool): string {
  const d = toDateSafe(tool.activatedAt);
  if (!d) return 'Activation date not reported';
  return `Activated ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

/**
 * One ownership record, as the backend reports it.
 *
 * This component never receives a catalogue definition: it renders a record the
 * account actually owns. A tool's operating model, cycle state and hourly rate
 * are all backend values; a missing rate prints as an em dash rather than being
 * filled from a price list.
 *
 * The action is supplied by the page: restarting is the dashboard's business,
 * while the marketplace only needs to point at it.
 */
export const PseOwnedUnit: React.FC<{ tool: PseStateTool; action?: React.ReactNode }> = ({
  tool, action,
}) => {
  const cycleKey = tool.cycleState || tool.status || '';
  const cycle = cycleKey && CYCLE_STATE_MAP[cycleKey]
    ? cycleStateView(cycleKey)
    : { label: 'State not reported', description: 'The backend has not reported this unit’s operating state.' };
  const model = operatingModelView(tool.operatingModel);
  const rate = typeof tool.hourlyRateGBP === 'number' && Number.isFinite(tool.hourlyRateGBP)
    ? gbpHour(tool.hourlyRateGBP)
    : '—';
  return (
    <li className="pse-owner" data-no-action={action ? undefined : 'true'}>
      <div className="pse-owner-id">
        <span className="pse-owner-name">{tool.toolName || tool.toolId || 'Mining tool'}</span>
        <span className="pse-owner-meta">
          {model.label} · {activatedLabel(tool)}
        </span>
      </div>
      <span className="pse-owner-state">
        <PseStatus tone={cycleTone(tool.cycleState || tool.status)}>{cycle.label}</PseStatus>
      </span>
      <div className="pse-owner-figs">
        <span><strong>{rate}</strong> capacity</span>
      </div>
      {action && <div className="pse-owner-action">{action}</div>}
    </li>
  );
};

/* ═══════════════ STATE ═══════════════ */

/**
 * Loading. Delegates to the product's single loader so a console page and the
 * authentication surfaces show the same honest, escalating loading state instead
 * of a text line that never changes and never times out.
 *
 * Page-level waits use the skeleton family below instead: the console shell and
 * the page's own head are already real, so replacing the whole page with a
 * centred loader hides more than it explains.
 */
export const PseLoading: React.FC<{ label?: string; stage?: PseLoadStage }> = ({ label, stage }) => (
  <PseLoader variant="inline" stage={stage} label={label} />
);

/**
 * A placeholder for one line of content that is still being read.
 *
 * It stands in for a specific line, not for "the page": its width and height
 * are the caller's, so the real figure lands exactly where the placeholder was.
 * A skeleton that is the wrong size is a layout shift with a nicer name.
 */
export const PseSkeleton: React.FC<{
  /** CSS width of the bar, e.g. '12ch' or '60%'. */
  width?: string;
  /** CSS height, matched to the line it replaces. */
  height?: string;
  className?: string;
}> = ({ width, height, className = '' }) => (
  <span
    className={`pse-skel ${className}`}
    aria-hidden="true"
    style={{
      ['--pse-skel-w' as string]: width,
      ['--pse-skel-h' as string]: height,
    }}
  />
);

/**
 * A register's worth of skeleton rows: two lines of identity on the left, one
 * figure on the right, separated by the same hairlines the real rows use.
 *
 * It is announced ONCE, as a busy region, by the calling block — the individual
 * bars are decorative and carry nothing for a screen reader.
 */
export const PseSkeletonRows: React.FC<{ rows?: number; label?: string }> = ({ rows = 4, label }) => (
  <div role="status" aria-busy="true" aria-live="polite" className="pse-skel-stack">
    {label && <span className="sr-only">{label}</span>}
    {Array.from({ length: rows }, (_, i) => (
      <span className="pse-skel-row" key={i}>
        <span className="pse-skel-stack" style={{ gap: '0.4rem' }}>
          <PseSkeleton width={i % 2 === 0 ? '46%' : '38%'} height="0.8125rem" />
          <PseSkeleton width={i % 2 === 0 ? '68%' : '56%'} height="0.625rem" />
        </span>
        <PseSkeleton width="4.5rem" height="0.8125rem" />
      </span>
    ))}
  </div>
);

/**
 * Empty state: states the fact, never invents a row.
 *
 * Two forms, and the difference is whether there is anything to do about it:
 *
 *   a bare note    a collection is empty and the reader only needed to know that.
 *   a titled state the emptiness has a reason and a next step, so the state gets
 *                  a heading, the explanation, the mark, and the action that
 *                  resolves it.
 *
 * The action is always a real destination inside the product — an empty state is
 * never given a button that only dismisses itself.
 */
export const PseEmptyNote: React.FC<{
  children: React.ReactNode;
  /** Present when the empty collection has a name worth stating. */
  title?: string;
  /** The real next action, when one exists. */
  action?: React.ReactNode;
  /** The product glyph that names what the empty collection holds. */
  glyph?: PseGlyphName;
}> = ({ children, title, action, glyph }) => {
  if (!title && !action) return <p className="pse-empty-note--bare">{children}</p>;
  return (
    <div className="pse-empty">
      {title && (
        <p className="pse-empty-title">
          {glyph && (
            <span className="pse-empty-mark" aria-hidden="true">
              <PseGlyph name={glyph} size={14} />
            </span>
          )}
          {title}
        </p>
      )}
      <p className="pse-empty-note">{children}</p>
      {action && <div className="pse-empty-actions">{action}</div>}
    </div>
  );
};

/** Inline notice for a reported exception, a held action or a good result. */
export const PseNotice: React.FC<{
  tone?: 'info' | 'attention' | 'danger' | 'good';
  title?: string;
  children: React.ReactNode;
}> = ({ tone = 'info', title, children }) => {
  const dataTone = tone === 'attention' ? 'hold' : tone === 'info' ? undefined : tone;
  return (
    <p className="pse-notice" data-tone={dataTone} role={tone === 'danger' ? 'alert' : 'status'}>
      {title && <span className="pse-notice-title">{title}</span>}
      <span>{children}</span>
    </p>
  );
};

/**
 * Blocking failure: what happened, whether a retry is honest, and a retry.
 * Rendered through the product's failure component so every PSEmine surface
 * classifies and presents a failure the same way.
 */
export const PseErrorNotice: React.FC<{
  error: PseErrorInfo; onRetry?: () => void; retrying?: boolean;
}> = ({ error, onRetry, retrying }) => (
  <PseLoadFailure error={error} onRetry={onRetry} retrying={retrying} />
);

/** Non-blocking notice for a degraded secondary feed. */
export const PseFeedNotice: React.FC<{ message: string; onRetry?: () => void; retrying?: boolean }> = ({
  message, onRetry, retrying,
}) => (
  <PseNotice tone="attention">
    {message}{' '}
    {onRetry && (
      <PseButton variant="secondary" size="sm" onClick={onRetry} busy={retrying}>
        {retrying ? 'Retrying…' : 'Retry'}
      </PseButton>
    )}
  </PseNotice>
);

/* ═══════════════ REGISTERS ═══════════════ */

/**
 * The fact register: key/value pairs in a grid whose cells are separated by the
 * page's own hairline. The value is printed in the figure family and tabular, so
 * eight figures can be compared by scanning down the column rather than by
 * reading across eight rows.
 *
 * A value that is a sentence rather than a figure takes `text` and gets the
 * interface family back.
 */
export const PseFacts: React.FC<{ cols?: 1 | 2 | 3; children: React.ReactNode }> = ({
  cols = 2, children,
}) => (
  <div className={`pse-facts${cols > 1 ? ` pse-facts--${cols}` : ''}`}>{children}</div>
);

export const PseFact: React.FC<{
  label: string;
  value: React.ReactNode;
  /** The value is language, not a figure — it wraps and sets in the text family. */
  text?: boolean;
  /** A qualifier under the label, where the figure needs one. */
  hint?: string;
}> = ({ label, value, text, hint }) => (
  <div className="pse-fact">
    <span className="pse-fact-key">
      {label}
      {hint && <span className="pse-ledger-sub">{hint}</span>}
    </span>
    <span className={`pse-fact-val${text ? ' pse-fact-val--text' : ''}`}>{value}</span>
  </div>
);

/**
 * The ledger. Column heads are the data-label role, rows are separated by
 * hairlines, and the columns named in `numeric` are printed tabular and
 * right-aligned so the digits of one row sit under the digits of the last.
 *
 * The table scrolls inside its own wrapper rather than pushing the page
 * sideways, and only the identifying column wraps — a figure split across two
 * lines is unreadable, a tool name is not.
 */
export const PseTable: React.FC<{
  head: React.ReactNode[];
  /** Indices of columns holding figures. */
  numeric?: number[];
  children: React.ReactNode;
  /** A caption for assistive tech, where the visible head does not name the table. */
  caption?: string;
}> = ({ head, numeric = [], children, caption }) => (
  <div className="pse-ledger-wrap">
    <table className="pse-ledger">
      {caption && <caption className="sr-only">{caption}</caption>}
      <thead>
        <tr>
          {head.map((h, i) => (
            <th key={i} scope="col" className={numeric.includes(i) ? 'pse-num' : undefined}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

/** A ledger row. */
export const PseRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <tr>{children}</tr>
);

/** A ledger cell. `mono` is a machine fact; `numeric` is a figure. */
export const PseCell: React.FC<{
  children?: React.ReactNode;
  mono?: boolean;
  numeric?: boolean;
  /** A second line under the cell's value, for a description. */
  sub?: React.ReactNode;
}> = ({ children, mono, numeric, sub }) => (
  <td className={numeric ? 'pse-num' : mono ? 'pse-mono-cell' : undefined}>
    {children}
    {sub && <span className="pse-ledger-sub">{sub}</span>}
  </td>
);

/** A dated group inside a ledger. The date is printed once, above its rows. */
export const PseLedgerDay: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="pse-ledger-day">{children}</p>
);

/** Monospace value (addresses, hashes, codes). */
export const PseMono: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="pse-mono-cell">{children}</span>
);

/** External verifier link (BscScan). */
export const PseExternalLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a href={href} target="_blank" rel="noreferrer" className="pse-link">
    {children}
  </a>
);

/* ═══════════════ DIALOG ═══════════════ */

/**
 * Consequential-action confirmation.
 *
 * The action, its consequence, the entity it affects, and — for irreversible
 * actions — an exact token the operator must type. Escape dismisses it (unless
 * it is mid-action) and focus returns where it was. The BACKEND remains the
 * authority; this changes presentation only.
 */
export const PseConfirm: React.FC<{
  open: boolean;
  title: string;
  consequence: string;
  affected?: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  requireText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, title, consequence, affected, confirmLabel = 'Confirm', danger, busy, requireText, onConfirm, onCancel }) => {
  const [typed, setTyped] = React.useState('');
  const plateRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => { if (!open) setTyped(''); }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onCancel(); };
    document.addEventListener('keydown', onKey);
    // Focus moves INTO the dialog: a modal that leaves focus on the page behind
    // it is announced at the wrong place and reachable by tab.
    plateRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [open, busy, onCancel]);

  if (!open) return null;
  const typedOk = !requireText || typed.trim().toLowerCase() === requireText.trim().toLowerCase();
  return (
    <div className="pse-scrim" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onCancel(); }}>
      <div
        ref={plateRef}
        tabIndex={-1}
        className="pse-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <h2 className="pse-dialog-title">{title}</h2>
        {affected && <p className="pse-dialog-affected">Affected · {affected}</p>}
        <p className="pse-dialog-note">{consequence}</p>
        {requireText && (
          <PseField label={`Type “${requireText}” to confirm`} htmlFor="pse-confirm-token">
            <PseInput
              id="pse-confirm-token"
              autoComplete="off"
              spellCheck={false}
              value={typed}
              onChange={e => setTyped(e.target.value)}
            />
          </PseField>
        )}
        <div className="pse-dialog-actions">
          <PseButton variant="secondary" onClick={onCancel} disabled={busy}>Cancel</PseButton>
          <PseButton tone={danger ? 'danger' : 'default'} onClick={onConfirm} disabled={busy || !typedOk} busy={busy}>
            {busy ? 'Working…' : confirmLabel}
          </PseButton>
        </div>
      </div>
    </div>
  );
};
