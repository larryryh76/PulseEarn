import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Stamp } from './pse';

/**
 * Confirmation dialog for consequential admin actions (FIX 3/4).
 * Replaces native window.confirm with the PSE material language: the action is
 * stated as a receipt — what is being done, the concrete consequence and the
 * affected entity — and requires an explicit confirm/cancel. The BACKEND
 * remains the final authority; this dialog changes presentation only, never
 * authorization or API contracts.
 *
 * Duty & Ledger: presented as a document (head + ruled body), never a tinted
 * card. Colour keys the state — amber for attention, red for a destructive
 * action — and carries no decoration.
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
    <div className="pse-scrim" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="pse-scrim-bg" onClick={busy ? undefined : onCancel} />
      <div className="pse-scope pse-receipt" style={{ maxWidth: 460 }}>
        <div className="pse-receipt-head">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Stamp tone={danger ? 'fail' : 'attn'} glyph={danger ? '▲' : '·'}>
                {danger ? 'Destructive action' : 'Confirmation required'}
              </Stamp>
              <p id="confirm-title" className="pse-h3" style={{ marginTop: 10 }}>{title}</p>
              {affected && <p className="pse-meta" style={{ marginTop: 4 }}>Affected · {affected}</p>}
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="pse-btn pse-btn-3 pse-btn-sm"
              aria-label="Close dialog"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="pse-receipt-body">
          <p className="pse-copy-s">{consequence}</p>

          {requireText && (
            <label className="pse-field" htmlFor="confirm-require-input">
              <span className="pse-field-label">
                <span className="pse-np">Type to confirm</span>
                <span className="pse-mono pse-amber">{requireText}</span>
              </span>
              <input
                id="confirm-require-input"
                className="pse-input pse-mono"
                autoComplete="off"
                spellCheck={false}
                value={typed}
                onChange={e => setTyped(e.target.value)}
              />
            </label>
          )}

          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <button type="button" onClick={onCancel} disabled={busy} className="pse-btn pse-btn-2">
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!canConfirm}
              className={danger ? 'pse-btn pse-btn-danger' : 'pse-btn'}
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
