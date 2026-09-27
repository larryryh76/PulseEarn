/**
 * PSEmine loading, retry and unavailability states.
 *
 * ONE loading primitive for the product. Previously each surface improvised its
 * own ("Restoring session", "Checking session…", a bare spinner, nothing at all
 * while a guard resolved), which meant a user could not tell a slow session
 * restore from a hung page.
 *
 * HONESTY RULES — these are the point of this component:
 *   • No fabricated progress. No percentage, no "scanning", no fake diagnostics,
 *     no invented mining activity. The bar is indeterminate by construction.
 *   • The label states the REAL stage the application is actually in, passed in
 *     by the surface that knows it (auth hydration, identity, product access,
 *     campaign state, a data feed). Nothing is guessed here.
 *   • No infinite spinner. After `slowAfterMs` the loader says it is slow; after
 *     `stalledAfterMs` it stops pretending and offers a real retry or reload.
 *   • A retry only appears when there is something to retry.
 *
 * VISUAL: the brand mark with its capacity bars pulsing in sequence, plus an
 * indeterminate rule. Deliberately no skeleton screens here — a skeleton would
 * promise a layout that the console (rebuilt in a later phase) has not defined.
 */
import React from 'react';
import type { PseErrorInfo } from '../../engines/psemine/pseErrors';
import { PSEmineMark } from './PSEBrand';

/**
 * Real application stages. Each one is a state the app genuinely passes through,
 * in this order, and each is knowable from the providers it reads.
 */
export type PseLoadStage = 'session' | 'identity' | 'access' | 'campaign' | 'data';

const STAGE_LABEL: Record<PseLoadStage, string> = {
  session: 'Restoring your session',
  identity: 'Confirming your identity',
  access: 'Checking PSEmine access',
  campaign: 'Reading campaign state',
  data: 'Loading PSEmine data',
};

const STAGE_NOTE: Record<PseLoadStage, string> = {
  session: 'PSEmine is re-establishing the sign-in you already have.',
  identity: 'Sign-in is confirmed; the account record is being read.',
  access: 'Confirming whether this account is enrolled in PSEmine.',
  campaign: 'Reading the campaign record and its current position.',
  data: 'Reading your PSEmine records.',
};

/** True after `ms` — used to escalate a slow loader without faking progress. */
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

export interface PseLoadStep {
  id: string;
  label: string;
  state: 'done' | 'current' | 'pending';
}

export const PseLoader: React.FC<{
  /** The real stage. Drives the wording; never invented by this component. */
  stage?: PseLoadStage;
  /** Explicit label, when the caller knows something more specific and true. */
  label?: string;
  /** Real, caller-known progress through the lifecycle. */
  steps?: PseLoadStep[];
  /** Where the loader sits: page, section or a single line of text. */
  variant?: 'page' | 'section' | 'inline';
  /** Re-runs the real operation behind this state. */
  onRetry?: () => void;
  retrying?: boolean;
  /** Announces the state to assistive tech (off for decorative re-loads). */
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
      <div className={`space-y-2 ${className}`}>
        <p className="pse-small" role="status" aria-live="polite">
          {text}…
        </p>
        <div className="pse-inline-bar" aria-hidden="true">
          <span />
        </div>
      </div>
    );
  }

  const isPage = variant === 'page';

  return (
    <div
      className={`pse-loader ${isPage ? 'min-h-[52vh] justify-center' : ''} ${className}`}
      role={live ? 'status' : undefined}
      aria-live={live ? 'polite' : undefined}
      aria-busy="true"
    >
      <PSEmineMark size={isPage ? 44 : 32} animated />

      <div className="space-y-1.5">
        <p className="pse-loader-label">{text}</p>
        <p className="pse-loader-note mx-auto">{stalled
          ? 'This has taken much longer than it should. Nothing has failed yet — retry, or reload the page.'
          : slow
            ? 'Still working. A slow connection is the usual reason.'
            : STAGE_NOTE[stage]}</p>
      </div>

      <div className="pse-loader-track" aria-hidden="true">
        <span className="pse-loader-bar" />
      </div>

      {steps && steps.length > 0 && (
        <ol className="pse-loader-steps justify-center">
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
          <button type="button" className="pse-btn pse-btn-quiet pse-btn-sm" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Failure with a truthful next step. `error.retryable` decides whether a retry is
 * offered at all — offering a retry for a permanent refusal wastes the operator's
 * time and hides the real message.
 */
export const PseLoadFailure: React.FC<{
  error: PseErrorInfo;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}> = ({ error, onRetry, retrying, className = '' }) => (
  <div className={`pse-panel pse-panel-body space-y-3 ${className}`} role="alert">
    <div className="flex flex-wrap items-center gap-2">
      <span className="pse-tag" data-tone="hold">
        <span className="pse-tag-dot" aria-hidden="true" />
        {error.retryable ? 'Temporarily unavailable' : 'Blocked'}
      </span>
      {error.operation && <span className="pse-micro">{error.operation}</span>}
    </div>
    <p className="pse-h3">{error.title}</p>
    <p className="pse-small">{error.message}</p>
    {error.code && <p className="pse-micro">Reference · {error.code}{error.status ? ` · ${error.status}` : ''}</p>}
    {error.retryable && onRetry && (
      <button type="button" className="pse-btn pse-btn-quiet pse-btn-sm" onClick={onRetry} disabled={retrying}>
        {retrying ? 'Retrying…' : 'Try again'}
      </button>
    )}
  </div>
);

/**
 * The backend itself is not answering. Distinct from a refused operation: nothing
 * was rejected, and the honest statement is that PSEmine cannot read its records
 * right now. Retryable by nature.
 */
export const PseUnavailable: React.FC<{
  what?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}> = ({ what = 'PSEmine data', onRetry, retrying, className = '' }) => (
  <div className={`pse-panel pse-panel-body space-y-3 ${className}`} role="status">
    <span className="pse-tag" data-tone="hold">
      <span className="pse-tag-dot" aria-hidden="true" />
      Unavailable
    </span>
    <p className="pse-h3">Could not read {what}</p>
    <p className="pse-small">
      The PSEmine service did not answer. Nothing has changed on the campaign or on your account — the figures are
      simply not available in this view until it responds.
    </p>
    {onRetry && (
      <button type="button" className="pse-btn pse-btn-quiet pse-btn-sm" onClick={onRetry} disabled={retrying}>
        {retrying ? 'Retrying…' : 'Try again'}
      </button>
    )}
  </div>
);

/**
 * Empty state for a real, empty collection. It never fills the gap with a
 * plausible-looking record.
 */
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
