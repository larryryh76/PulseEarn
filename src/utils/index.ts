import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

export function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function requiresProofText(verificationType?: string): boolean {
  if (!verificationType) return false;
  const norm = verificationType.toLowerCase();
  return ['manual', 'proof', 'screenshot', 'admin_approval'].includes(norm);
}

export function resolveTimestamp(val: any): Date | undefined {
  if (!val) return undefined;

  // If it's a document/object, recursively resolve from known fields
  if (typeof val === 'object' && !(val instanceof Date)) {
    const fields = ['timestamp', 'createdAt', 'processedAt', 'lastCompleted', 'completedAt', 'updatedAt'];
    for (const f of fields) {
      if (val[f] !== undefined && val[f] !== null) {
        const res = resolveTimestamp(val[f]);
        if (res) return res;
      }
    }
    // Check if it's a Firestore Timestamp representation
    if (typeof val.toDate === 'function') {
      return val.toDate();
    }
    if (val.seconds !== undefined) {
      return new Date(Number(val.seconds) * 1000);
    }
    return undefined;
  }

  if (val instanceof Date) {
    return isNaN(val.getTime()) ? undefined : val;
  }
  if (typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? undefined : d;
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

export function evaluateTaskStatus(task: any, userTask: any): {
  status: 'available' | 'pending' | 'completed' | 'cooldown' | 'rejected' | 'started' | 'in_progress' | 'expired' | 'cancelled';
  nextAvailable?: Date;
  canSubmit: boolean;
  reason?: string;
} {
  if (!userTask) {
    return { status: 'available', canSubmit: true };
  }

  const st = (userTask.status || '').toLowerCase();

  // 1. Preserve unknown or non-standard states without downgrading
  const recognizedBase = new Set(['available', 'pending', 'awaiting_verification', 'submitted', 'completed', 'claimed', 'verified', 'cooldown', 'on_cooldown', 'rejected']);
  if (st && !recognizedBase.has(st)) {
    const canSubmit = st === 'started' || st === 'in_progress';
    return { status: st as any, canSubmit };
  }

  if (st === 'pending' || st === 'awaiting_verification' || st === 'submitted') {
    return { status: 'pending', canSubmit: false, reason: 'ALREADY_PENDING' };
  }

  // 2. Check global campaign limits (global task cap)
  const globalLimit = Number(task.maxCompletions ?? task.maxClaims ?? 0);
  const totalGlobalClaims = Number(task.totalClaims ?? task.completionCount ?? 0);
  if (globalLimit > 0 && totalGlobalClaims >= globalLimit) {
    return { status: 'completed', canSubmit: false, reason: 'TASK_CAP_REACHED' };
  }

  // 3. Check per-user limit
  const cooldownHours = Number(task.cooldownPeriod ?? task.cooldownHours ?? 0);
  const userLimit = Number(task.perUserLimit ?? (cooldownHours > 0 ? 999999 : 1));
  const totalCompletions = Number(userTask.totalCompletions || 0);

  if (userLimit > 0 && totalCompletions >= userLimit) {
    return { status: 'completed', canSubmit: false, reason: 'ALREADY_COMPLETED' };
  }

  // 4. Cooldown checks using the shared resolver
  if (cooldownHours > 0 && (st === 'completed' || st === 'claimed' || st === 'verified' || st === 'cooldown' || st === 'on_cooldown')) {
    const last = resolveTimestamp(userTask);
    if (!last) {
      return {
        status: 'cooldown',
        canSubmit: false,
        reason: 'COOLDOWN_TIMESTAMP_ERROR'
      };
    }
    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    const now = new Date();
    const elapsed = now.getTime() - last.getTime();

    if (elapsed < cooldownMs) {
      const nextAvailable = new Date(last.getTime() + cooldownMs);
      return {
        status: 'cooldown',
        nextAvailable,
        canSubmit: false,
        reason: 'ON_COOLDOWN'
      };
    }
  }

  if (st === 'rejected') {
    return { status: 'rejected', canSubmit: true };
  }

  return { status: 'available', canSubmit: true };
}

export { validateExternalUrl, type UrlValidationResult } from './security';

