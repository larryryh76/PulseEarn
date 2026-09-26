import React, { useEffect, useRef, useState } from 'react';

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
  const [typed, setTyped] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, [open]);

  if (!open) return null;

  const typedOk = !requireText || typed.trim().toLowerCase() === requireText.trim().toLowerCase();
  const canConfirm = !busy && typedOk;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="confirm-title"
      onCancel={event => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      onClick={event => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <header>
        <p>{danger ? 'Destructive action' : 'Confirmation required'}</p>
        <h2 id="confirm-title">{title}</h2>
        {affected && <p>Affected · {affected}</p>}
      </header>

      <p>{consequence}</p>

      {requireText && (
        <p>
          <label htmlFor="confirm-require-input">
            Type to confirm: {requireText}
          </label>
          <input
            id="confirm-require-input"
            autoComplete="off"
            spellCheck={false}
            value={typed}
            onChange={e => setTyped(e.target.value)}
          />
        </p>
      )}

      <button type="button" onClick={onCancel} disabled={busy}>Close dialog</button>
      <button type="button" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
      <button type="button" onClick={onConfirm} disabled={!canConfirm}>
        {busy ? 'Working…' : confirmLabel}
      </button>
    </dialog>
  );
};

export default ConfirmDialog;
