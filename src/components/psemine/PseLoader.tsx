/**
 * PSEmine loading, failure and unavailability — the product's single loader.
 *
 * THE LOADER IS AN APPLICATION STATE, NOT A PAGE.
 *
 * It appears only when the product genuinely has to wait for something real:
 * session restore, the account record, access resolution, a campaign read, or a
 * protected page's own data. When there is nothing to wait for it must not be
 * rendered at all, and the two states that are *decisions* rather than waits —
 * "verification required" and "onboarding required" — are resolved by the route
 * guard navigating, so they never show a loader describing work that has already
 * finished.
 *
 * WHAT IT IS
 * A brand plate carrying the emblem, the product name, one indeterminate rail,
 * one honest sentence naming the state, and — only after the wait has actually
 * become unusual — one sentence saying so and a real way out. That is the whole
 * component. The plate is the composition rather than a decoration: it is the
 * same brand anchor the navigation and the authentication family carry, at the
 * size the state deserves, and its one slow sheen is what makes the surface read
 * as working without ever claiming a position.
 *
 * WHAT IT DELIBERATELY IS NOT
 * No percentage, no bar that fills, no scan, no terminal, no counter, no step
 * list, no "boot sequence", no invented infrastructure status and no fake
 * diagnostics. The duration is genuinely unknown, so nothing here pretends to
 * know it: the rail is indeterminate in the literal sense — it never claims a
 * position in a sequence.
 *
 * ESCALATION IS HONEST. After 8s it says the wait is longer than usual; after
 * 25s it stops implying a fast answer is coming and offers a real retry or a
 * reload. A retry appears only when the caller has something to retry.
 */
import React from 'react';
import type { PseErrorInfo } from '../../engines/psemine/pseErrors';
import { PSEmineMark } from './PSEBrand';

/** The real stages the application passes through. Each is knowable, and each is named plainly. */
export type PseLoadStage = 'session' | 'identity' | 'access' | 'campaign' | 'data';

const STAGE_LABEL: Record<PseLoadStage, string> = {
  session: 'Preparing your account',
  identity: 'Confirming your identity',
  access: 'Checking your access',
  campaign: 'Loading campaign state',
  data: 'Loading your account',
};

/** True after `ms`, while `active`. Used to escalate honestly, never to fake progress. */
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

const Dots: React.FC = () => (
  <span className="pse-loader-dots" aria-hidden="true">
    <i />
    <i />
    <i />
  </span>
);

export const PseLoader: React.FC<{
  /** The real stage. Drives the wording; never invented here. */
  stage?: PseLoadStage;
  /** Explicit label, when the caller knows something more specific and true. */
  label?: string;
  /** `page` fills the viewport, `section` sits inside content, `inline` is one row. */
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
  variant = 'section',
  onRetry,
  retrying = false,
  live = true,
  className = '',
}) => {
  const slow = useElapsed(8000, true);
  const stalled = useElapsed(25000, true);
  const text = label || STAGE_LABEL[stage];

  // One line of state, for a panel that is re-reading behind existing content.
  if (variant === 'inline') {
    return (
      <div className={`pse-loader-inline ${className}`}>
        <Dots />
        <span className="pse-loader-label" role={live ? 'status' : undefined} aria-live={live ? 'polite' : undefined}>
          {text}
        </span>
      </div>
    );
  }

  const isPage = variant === 'page';

  return (
    <div
      className={`pse-loader ${isPage ? 'min-h-[60vh]' : ''} ${className}`}
      role={live ? 'status' : undefined}
      aria-live={live ? 'polite' : undefined}
      aria-busy="true"
    >
      <span className="pse-loader-plate">
        <PSEmineMark size={40} decorative />
      </span>

      <span className="pse-loader-id">
        <span className="pse-loader-name">PSEmine</span>
        <span className="pse-loader-sub">Campaign mining</span>
      </span>

      <span className="pse-loader-track" aria-hidden="true">
        <i />
      </span>

      <p className="pse-loader-label">{text}</p>

      {(slow || stalled) && (
        <p className="pse-loader-note">
          {stalled
            ? 'This is taking longer than it should. Nothing has failed — retry, or reload the page.'
            : 'Still working. A slow connection is usually the reason.'}
        </p>
      )}

      {stalled && (
        <div className="pse-loader-actions">
          {onRetry && (
            <button type="button" className="pse-btn pse-btn--secondary pse-btn--sm" onClick={onRetry} disabled={retrying}>
              {retrying ? 'Retrying…' : 'Retry'}
            </button>
          )}
          <button
            type="button"
            className="pse-btn pse-btn--secondary pse-btn--sm"
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
 * A real failure. `error.retryable` decides whether a retry is offered at all —
 * offering one for a permanent refusal wastes the operator's time and hides the
 * actual message.
 */
export const PseLoadFailure: React.FC<{
  error: PseErrorInfo;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}> = ({ error, onRetry, retrying, className = '' }) => (
  <div className={`pse-card ${className}`} role="alert">
    <div className="pse-card-body" style={{ display: 'grid', gap: '0.75rem' }}>
      <span className="pse-tag" data-tone={error.retryable ? 'hold' : 'danger'} style={{ justifySelf: 'start' }}>
        <span className="pse-tag-dot" aria-hidden="true" />
        {error.retryable ? 'Temporarily unavailable' : 'Blocked'}
      </span>
      <p className="pse-h3">{error.title}</p>
      <p className="pse-small">{error.message}</p>
      {error.code && (
        <p className="pse-micro">
          Reference · {error.code}
          {error.status ? ` · ${error.status}` : ''}
        </p>
      )}
      {error.retryable && onRetry && (
        <button
          type="button"
          className="pse-btn pse-btn--secondary pse-btn--sm"
          style={{ justifySelf: 'start' }}
          onClick={onRetry}
          disabled={retrying}
        >
          {retrying ? 'Retrying…' : 'Try again'}
        </button>
      )}
    </div>
  </div>
);

/**
 * The service itself is not answering. Distinct from a refused operation:
 * nothing was rejected, and the honest statement is that the figures cannot be
 * read right now.
 */
export const PseUnavailable: React.FC<{
  what?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}> = ({ what = 'the campaign record', onRetry, retrying, className = '' }) => (
  <div className={`pse-card ${className}`} role="status">
    <div className="pse-card-body" style={{ display: 'grid', gap: '0.75rem' }}>
      <span className="pse-tag" data-tone="hold" style={{ justifySelf: 'start' }}>
        <span className="pse-tag-dot" aria-hidden="true" />
        Not readable
      </span>
      <p className="pse-h3">Could not read {what}</p>
      <p className="pse-small">
        The service did not answer. Nothing has changed on the campaign — the figures are simply not available in this
        view until it responds, and this page will not substitute a guess for them.
      </p>
      {onRetry && (
        <button
          type="button"
          className="pse-btn pse-btn--secondary pse-btn--sm"
          style={{ justifySelf: 'start' }}
          onClick={onRetry}
          disabled={retrying}
        >
          {retrying ? 'Retrying…' : 'Try again'}
        </button>
      )}
    </div>
  </div>
);

/** Empty state for a real, empty collection. It never fills the gap with a record. */
export const PseEmptyState: React.FC<{ title: string; children?: React.ReactNode; className?: string }> = ({
  title,
  children,
  className = '',
}) => (
  <div className={`pse-code ${className}`}>
    <p className="pse-h3">{title}</p>
    {children && <p className="pse-small mt-1">{children}</p>}
  </div>
);

export default PseLoader;
