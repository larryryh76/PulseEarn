/**
 * PSEmine loading, failure and unavailability — the product's single loader.
 *
 * REBUILT. The previous loader animated the brand mark's facets in sequence and
 * paired that motion with stage copy. The motion was the problem: it implied an
 * activity the product was not performing. What is left here is only what is
 * true.
 *
 * WHAT IS TRUE, AND THEREFORE WHAT IS SHOWN
 * -----------------------------------------
 *   • The duration of a restore or a read is genuinely unknown, so the indicator
 *     is INDETERMINATE by construction. There is no percentage, no bar that
 *     fills, no "scanning", no invented mining activity, no fake diagnostics.
 *   • The stage label is the REAL stage the application is in, passed in by the
 *     surface that knows it. This component never guesses one.
 *   • When a caller knows the real lifecycle (hydrate → identity → access →
 *     campaign → data) it can pass `steps`, and the step list is drawn from that
 *     caller's own state — not from a timer.
 *   • After 8s the loader says it is slow, because that is useful information.
 *     After 25s it stops pretending a fast answer is coming and offers a real
 *     retry or reload, so nobody is left with an unexplained spinner.
 *   • A retry appears only when there is something to retry.
 *
 * `PseLoadFailure` additionally refuses to offer a retry for a permanent refusal:
 * offering one would waste the operator's time and hide the real message.
 */
import React from 'react';
import type { PseErrorInfo } from '../../engines/psemine/pseErrors';
import { PSEmineMark } from './PSEBrand';

/**
 * The real stages the application passes through, in order. Each is knowable
 * from the providers the surfaces read.
 */
export type PseLoadStage = 'session' | 'identity' | 'access' | 'campaign' | 'data';

const STAGE_LABEL: Record<PseLoadStage, string> = {
  session: 'Restoring your session',
  identity: 'Confirming your identity',
  access: 'Checking your access',
  campaign: 'Reading the campaign',
  data: 'Loading your records',
};

const STAGE_NOTE: Record<PseLoadStage, string> = {
  session: 'Re-establishing the sign-in already held on this device.',
  identity: 'Sign-in is confirmed; the account record is being read.',
  access: 'Confirming what this account is enrolled in.',
  campaign: 'Reading the campaign record and its current position.',
  data: 'Reading your PSEmine records.',
};

/** True after `ms`, while `active`. Used to escalate honestly — never to fake progress. */
function useElapsed(ms: number, active: boolean): boolean {
  const [elapsed, setElapsed] = React.useState(false);
  React.useEffect(() => {
    if (!active) {
      setElapsed(false);
      return;
    }
    const id = window.setTimeout(() => setElapsed(true), ms);
    return () => window.clearTimeout(id);
  }, [ms, active]);
  return elapsed;
}

/** A real step in a real lifecycle, supplied by the caller that owns that state. */
export interface PseLoadStep {
  id: string;
  label: string;
  state: 'done' | 'current' | 'pending';
}

export const PseLoader: React.FC<{
  /** The real stage. Drives the wording; never invented here. */
  stage?: PseLoadStage;
  /** Explicit label, when the caller knows something more specific and true. */
  label?: string;
  /** The real lifecycle, when the caller knows it. */
  steps?: PseLoadStep[];
  /** Where the loader sits: a whole page, a section, or one line of text. */
  variant?: 'page' | 'section' | 'inline';
  /** Re-runs the real operation behind this state. */
  onRetry?: () => void;
  retrying?: boolean;
  /** Announces the state to assistive tech (off for background re-reads). */
  live?: boolean;
  className?: string;
}> = ({
  stage = 'data',
  label,
  steps,
  variant = 'section',
  onRetry,
  retrying = false,
  live = true,
  className = '',
}) => {
  const slow = useElapsed(8000, true);
  const stalled = useElapsed(25000, true);
  const text = label || STAGE_LABEL[stage];

  if (variant === 'inline') {
    return (
      <div className={`pse-loader-inline ${className}`}>
        <p className="pse-loader-label" role={live ? 'status' : undefined} aria-live={live ? 'polite' : undefined}>
          {text}
        </p>
        <div className="pse-inline-bar mt-2" aria-hidden="true">
          <span />
        </div>
        <p className="pse-small mt-2">
          {stalled
            ? 'No answer yet. Retry, or reload the page.'
            : slow
              ? 'Still reading. A slow connection is the usual reason.'
              : STAGE_NOTE[stage]}
        </p>
      </div>
    );
  }

  const isPage = variant === 'page';

  return (
    <div
      className={`pse-loader ${isPage ? 'min-h-[46vh] justify-center' : ''} ${className}`}
      role={live ? 'status' : undefined}
      aria-live={live ? 'polite' : undefined}
      aria-busy="true"
    >
      {/* A static mark: identity only. It is never animated into implying work. */}
      <PSEmineMark size={isPage ? 34 : 26} decorative />

      <div className="space-y-1.5">
        <p className="pse-loader-label">{text}</p>
        <p className="pse-loader-note">
          {stalled
            ? 'This has taken much longer than it should. Nothing has failed yet — retry, or reload the page.'
            : slow
              ? 'Still working. A slow connection is the usual reason.'
              : STAGE_NOTE[stage]}
        </p>
      </div>

      <div className="pse-loader-track" aria-hidden="true">
        <span className="pse-loader-bar" />
      </div>

      {steps && steps.length > 0 && (
        <ol className="pse-loader-steps">
          {steps.map(step => (
            <li key={step.id} className="pse-loader-step" data-state={step.state}>
              <span className="pse-loader-step-mark" aria-hidden="true" />
              {step.label}
            </li>
          ))}
        </ol>
      )}

      {stalled && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {onRetry && (
            <button type="button" className="pse-btn pse-btn-quiet pse-btn-sm" onClick={onRetry} disabled={retrying}>
              {retrying ? 'Retrying…' : 'Retry'}
            </button>
          )}
          <button
            type="button"
            className="pse-btn pse-btn-quiet pse-btn-sm"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Failure with a truthful next step. `error.retryable` decides whether a retry is
 * offered at all.
 */
export const PseLoadFailure: React.FC<{
  error: PseErrorInfo;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}> = ({ error, onRetry, retrying, className = '' }) => (
  <div className={`pse-panel pse-panel-body space-y-3 ${className}`} role="alert">
    <div className="flex flex-wrap items-center gap-2">
      <span className="pse-tag" data-tone={error.retryable ? 'hold' : 'danger'}>
        <span className="pse-tag-dot" aria-hidden="true" />
        {error.retryable ? 'Temporarily unavailable' : 'Blocked'}
      </span>
      {error.operation && <span className="pse-micro">{error.operation}</span>}
    </div>
    <p className="pse-h3">{error.title}</p>
    <p className="pse-small">{error.message}</p>
    {error.code && (
      <p className="pse-micro">
        Reference · {error.code}
        {error.status ? ` · ${error.status}` : ''}
      </p>
    )}
    {error.retryable && onRetry && (
      <button type="button" className="pse-btn pse-btn-quiet pse-btn-sm" onClick={onRetry} disabled={retrying}>
        {retrying ? 'Retrying…' : 'Try again'}
      </button>
    )}
  </div>
);

/**
 * The service itself is not answering. Distinct from a refused operation: nothing
 * was rejected, and the honest statement is that PSEmine cannot read its records
 * right now.
 */
export const PseUnavailable: React.FC<{
  what?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}> = ({ what = 'the campaign record', onRetry, retrying, className = '' }) => (
  <div className={`pse-panel pse-panel-body space-y-3 ${className}`} role="status">
    <span className="pse-tag" data-tone="hold">
      <span className="pse-tag-dot" aria-hidden="true" />
      Not readable
    </span>
    <p className="pse-h3">Could not read {what}</p>
    <p className="pse-small">
      The service did not answer. Nothing has changed on the campaign or on your account — the figures are simply not
      available in this view until it responds, and this page will not substitute a guess for them.
    </p>
    {onRetry && (
      <button type="button" className="pse-btn pse-btn-quiet pse-btn-sm" onClick={onRetry} disabled={retrying}>
        {retrying ? 'Retrying…' : 'Try again'}
      </button>
    )}
  </div>
);

/** Empty state for a real, empty collection. It never fills the gap with a record. */
export const PseEmptyState: React.FC<{ title: string; children?: React.ReactNode; className?: string }> = ({
  title,
  children,
  className = '',
}) => (
  <div className={`pse-well px-4 py-6 space-y-1 ${className}`}>
    <p className="pse-h3">{title}</p>
    {children && <p className="pse-small">{children}</p>}
  </div>
);

export default PseLoader;
