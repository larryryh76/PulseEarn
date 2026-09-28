/**
 * PSEmine minimal functional UI — the AUTHENTICATED CONSOLE's presentation.
 *
 * This is deliberately not the product's design system. The PSEmine visual
 * implementation was purged in `refactor(psemine): purge legacy design
 * implementation` and the console is being rebuilt one system at a time
 * afterwards; Phase 1 rebuilt the brand, loader, authentication family and
 * public landing page (see src/styles/psemine.css). Until the console's own
 * phase, these components keep it usable: plain headings, plain text, basic
 * tables and basic form controls.
 *
 * Rules for this file:
 *   • No decorative surfaces, gradients, shadows, palettes or motion of its own.
 *   • Loading and blocking failures are NOT re-invented here: they render through
 *     the product's loader family (PseLoader / PseLoadFailure), so the whole
 *     product reports a slow load or a failure the same way.
 *   • Every component here is replaceable by the console's future design without
 *     touching product logic — pages import behaviour, never presentation, from
 *     pseCore.ts.
 */
import React from 'react';
import type { PseErrorInfo } from '../../engines/psemine/pseErrors';
import { PseLoadFailure, PseLoader, type PseLoadStage } from './PseLoader';

/** A console route: title, one line stating its objective, then content. */
export const PsePage: React.FC<{
  title: string;
  objective?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, objective, actions, children }) => (
  <div className="mx-auto w-full max-w-5xl space-y-6 p-4 pb-16 sm:p-6">
    <header className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-text-primary sm:text-2xl">{title}</h1>
        {objective && <p className="mt-1 max-w-3xl text-sm text-text-secondary">{objective}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
    {children}
  </div>
);

/** A titled block. A rule, not a card. */
export const PseSection: React.FC<{ title?: string; meta?: React.ReactNode; children: React.ReactNode }> = ({
  title, meta, children,
}) => (
  <section className="space-y-3">
    {(title || meta) && (
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
        {title && <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">{title}</h2>}
        {meta && <span className="text-xs text-text-tertiary">{meta}</span>}
      </div>
    )}
    {children}
  </section>
);

/** Basic button. `tone="danger"` is the only distinction: it is destructive. */
export const PseButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'default' | 'danger' }
> = ({ tone = 'default', className = '', type = 'button', ...rest }) => (
  <button
    {...rest}
    type={type}
    className={`inline-flex min-h-[36px] items-center gap-1.5 rounded border px-3 py-1.5 text-sm disabled:opacity-50 ${
      tone === 'danger'
        ? 'border-danger text-danger'
        : 'border-border-bright text-text-primary'
    } ${className}`}
  />
);

/** Basic form control. Uses the global input styling in src/index.css. */
export const PseInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = '', ...rest }) => (
  <input {...rest} className={`w-full ${className}`} />
);

/** Labelled field wrapper. */
export const PseField: React.FC<{
  label: string; hint?: string; htmlFor?: string; children: React.ReactNode;
}> = ({ label, hint, htmlFor, children }) => (
  <label className="block space-y-1" htmlFor={htmlFor}>
    <span className="flex items-baseline justify-between gap-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">
      {label}
      {hint && <span className="font-normal normal-case tracking-normal text-text-tertiary">{hint}</span>}
    </span>
    {children}
  </label>
);

/**
 * Loading state.
 *
 * Delegates to the product's single loader (PseLoader) so a console page and the
 * authentication surfaces show the same honest, escalating loading state instead
 * of a text line that never changes and never times out. The visual layer is
 * Phase 1; the console's own layout is unaffected.
 */
export const PseLoading: React.FC<{ label?: string; stage?: PseLoadStage }> = ({ label, stage }) => (
  <PseLoader variant="inline" stage={stage} label={label} />
);

/**
 * Empty state: states the fact, never invents a row.
 *
 * Two forms, and the difference is whether there is anything to do about it:
 *
 *   a bare note   a collection is empty and the reader only needed to know that.
 *                 This is the original one-line form and is unchanged.
 *   a titled state
 *                 the emptiness has a reason and a next step, so the state gets a
 *                 heading, the explanation, and the action that resolves it.
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
}> = ({ children, title, action }) => {
  if (!title && !action) return <p className="py-3 text-sm text-text-secondary">{children}</p>;
  return (
    <div className="border-l-2 border-border py-2.5 pl-4">
      {title && <p className="text-sm font-semibold text-text-primary">{title}</p>}
      <p className="mt-1 max-w-[68ch] text-sm text-text-secondary">{children}</p>
      {action && <div className="mt-3 flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
};

/** Inline notice for a reported exception or a blocked action. */
export const PseNotice: React.FC<{ tone?: 'info' | 'attention' | 'danger'; children: React.ReactNode }> = ({
  tone = 'info', children,
}) => (
  <p
    role="status"
    className={`border-l-2 py-1 pl-3 text-sm ${
      tone === 'danger' ? 'border-danger text-danger'
        : tone === 'attention' ? 'border-warning text-text-primary'
          : 'border-border-bright text-text-secondary'
    }`}
  >
    {children}
  </p>
);

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
      <PseButton onClick={onRetry} disabled={retrying} className="ml-2">{retrying ? 'Retrying…' : 'Retry'}</PseButton>
    )}
  </PseNotice>
);

/** Basic table for real records only. */
export const PseTable: React.FC<{ head: React.ReactNode[]; children: React.ReactNode }> = ({ head, children }) => (
  <div className="overflow-x-auto">
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr>
          {head.map((h, i) => (
            <th key={i} scope="col" className="border-b border-border py-2 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

/** A table row. Children are cells. */
export const PseRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <tr className="align-top">{children}</tr>
);

/** A table cell. */
export const PseCell: React.FC<{ children?: React.ReactNode; mono?: boolean }> = ({ children, mono }) => (
  <td className={`border-b border-border py-2 pr-3 text-text-primary ${mono ? 'font-mono text-xs' : ''}`}>{children}</td>
);

/** Monospace value (addresses, hashes, codes). */
export const PseMono: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="font-mono text-xs">{children}</span>
);

/** External verifier link (BscScan). */
export const PseExternalLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a href={href} target="_blank" rel="noreferrer" className="text-sm underline">
    {children}
  </a>
);

/**
 * Consequential-action confirmation.
 * Replaces the purged design dialog with the simplest honest equivalent: the
 * action, its consequence, the affected entity, and — for irreversible actions
 * — an exact token the operator must type. The BACKEND remains the authority;
 * this changes presentation only.
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
  React.useEffect(() => { if (!open) setTyped(''); }, [open]);
  // Escape must dismiss the dialog (unless it is mid-action) and the operator's
  // focus must return where it was — the dismissal behaviour the previous dialog
  // carried is preserved here (merged from remote).
  React.useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [open, busy, onCancel]);
  if (!open) return null;
  const typedOk = !requireText || typed.trim().toLowerCase() === requireText.trim().toLowerCase();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-md space-y-4 rounded border border-border-bright bg-surface p-5">
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        {affected && <p className="text-xs text-text-tertiary">Affected · {affected}</p>}
        <p className="text-sm text-text-secondary">{consequence}</p>
        {requireText && (
          <PseField label={`Type "${requireText}" to confirm`} htmlFor="pse-confirm-token">
            <PseInput
              id="pse-confirm-token"
              autoComplete="off"
              spellCheck={false}
              value={typed}
              onChange={e => setTyped(e.target.value)}
            />
          </PseField>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <PseButton onClick={onCancel} disabled={busy}>Cancel</PseButton>
          <PseButton tone={danger ? 'danger' : 'default'} onClick={onConfirm} disabled={busy || !typedOk}>
            {busy ? 'Working…' : confirmLabel}
          </PseButton>
        </div>
      </div>
    </div>
  );
};
