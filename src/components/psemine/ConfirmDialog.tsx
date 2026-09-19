import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Design-system confirmation dialog for consequential admin actions (FIX 3/4).
 * Replaces native window.confirm with the PSE token language: explains the
 * action, the concrete consequence, and the affected entity; requires an
 * explicit confirm/cancel. The BACKEND remains the final authority — this
 * dialog changes presentation only, never authorization or API contracts.
 *
 * `requireText` (optional) forces the operator to type an exact token
 * (e.g. "shutdown") for the most destructive actions.
 */
export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  consequence: string;
  affected?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  requireText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open, title, consequence, affected, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  danger = false, busy = false, requireText, onConfirm, onCancel,
}) => {
  // Typed-confirmation value (only used when requireText is set).
  const [typed, setTyped] = useState('');

  // Escape to cancel; lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onCancel(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  const typedOk = !requireText || typed.trim().toLowerCase() === requireText.trim().toLowerCase();
  const canConfirm = !busy && typedOk;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={busy ? undefined : onCancel} />
      <div
        className="pse-scope relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border shadow-2xl sm:rounded-2xl"
        style={{ background: 'var(--pse-surface)', borderColor: 'var(--pse-line-strong)' }}
      >
        <div className="flex items-start justify-between gap-3 border-b p-5" style={{ borderColor: 'var(--pse-line)' }}>
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={danger
                ? { background: 'var(--pse-inset)', border: '1px solid var(--pse-danger)' }
                : { background: 'var(--pse-inset)', border: '1px solid var(--pse-warning)' }}
            >
              <AlertTriangle size={17} style={{ color: danger ? 'var(--pse-danger)' : 'var(--pse-warning)' }} />
            </div>
            <div>
              <p id="confirm-title" className="pse-h3">{title}</p>
              {affected && <p className="pse-micro mt-0.5">Affected: {affected}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex h-9 w-9 items-center justify-center rounded-lg pse-btn pse-btn-ghost"
            aria-label="Close dialog"
          >
            <X size={15} />
          </button>
        </div>

        <div className="p-5">
          <p className="pse-caption">{consequence}</p>
          {requireText && (
            <div className="mt-4">
              <label className="pse-caption mb-1.5 block font-medium" htmlFor="confirm-require-input">
                Type <span className="pse-mono" style={{ color: 'var(--pse-warning)' }}>{requireText}</span> to confirm
              </label>
              <input
                id="confirm-require-input"
                className="pse-input pse-mono"
                autoComplete="off"
                spellCheck={false}
                value={typed}
                onChange={e => setTyped(e.target.value)}
              />
            </div>
          )}
          <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <button type="button" onClick={onCancel} disabled={busy} className="pse-btn pse-btn-secondary justify-center">
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!canConfirm}
              className={(danger ? 'pse-btn pse-btn-danger' : 'pse-btn pse-btn-primary') + ' justify-center'}
            >
              {busy ? 'Working…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
