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

export function evaluateTaskStatus(task: any, userTask: any): {
  status: 'available' | 'pending' | 'completed' | 'cooldown' | 'rejected';
  nextAvailable?: Date;
  canSubmit: boolean;
  reason?: string;
} {
  if (!userTask) {
    return { status: 'available', canSubmit: true };
  }

  const st = (userTask.status || '').toLowerCase();

  if (st === 'pending' || st === 'awaiting_verification' || st === 'submitted') {
    return { status: 'pending', canSubmit: false, reason: 'ALREADY_PENDING' };
  }

  const maxCompletions = Number(task.perUserLimit ?? task.maxCompletions ?? task.maxClaims ?? ((task.cooldownPeriod ?? task.cooldownHours ?? 0) > 0 ? 999999 : 1));
  const totalCompletions = Number(userTask.totalCompletions || 0);

  if (maxCompletions > 0 && totalCompletions >= maxCompletions) {
    return { status: 'completed', canSubmit: false, reason: 'ALREADY_COMPLETED' };
  }

  const cooldownHours = Number(task.cooldownPeriod ?? task.cooldownHours ?? 0);
  if (cooldownHours > 0 && (st === 'completed' || st === 'claimed' || st === 'verified' || st === 'cooldown' || st === 'on_cooldown')) {
    const last = userTask.lastCompleted?.toDate?.() || userTask.completedAt?.toDate?.() || userTask.updatedAt?.toDate?.() || (userTask.lastCompleted ? new Date(userTask.lastCompleted) : new Date(0));
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

