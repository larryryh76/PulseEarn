import type { ReferralStatus } from '../../types'

type Tone = 'success' | 'warning' | 'danger' | 'muted'

export const toneChip: Record<Tone, string> = {
  success: 'bg-success/10 border-success/20 text-success',
  warning: 'bg-warning/10 border-warning/20 text-warning',
  danger: 'bg-danger/10 border-danger/20 text-danger',
  muted: 'bg-muted border-border text-muted-foreground',
}

type StatusMeta = { label: string; tone: Tone; group: 'rewarded' | 'pending' | 'flagged' }

const STATUS_META: Record<ReferralStatus, StatusMeta> = {
  INVITED: { label: 'Invited', tone: 'muted', group: 'pending' },
  REGISTERED: { label: 'Registered', tone: 'warning', group: 'pending' },
  VERIFIED: { label: 'Verified', tone: 'warning', group: 'pending' },
  ACTIVATED: { label: 'Activated', tone: 'warning', group: 'pending' },
  REWARDED: { label: 'Rewarded', tone: 'success', group: 'rewarded' },
  FLAGGED: { label: 'Flagged', tone: 'danger', group: 'flagged' },
  REVERSED: { label: 'Reversed', tone: 'danger', group: 'flagged' },
}

export function referralStatusMeta(status: ReferralStatus): StatusMeta {
  return STATUS_META[status] || STATUS_META.REGISTERED
}

/** Filter tabs for the referral history list. */
export const REFERRAL_FILTERS: { value: 'ALL' | 'rewarded' | 'pending' | 'flagged'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'rewarded', label: 'Qualified' },
  { value: 'pending', label: 'Pending' },
  { value: 'flagged', label: 'Flagged' },
]

/** Growth milestones — reaching each unlocks recognition (client-side, cosmetic). */
export const MILESTONES = [1, 5, 10, 25, 50, 100] as const

export function nextMilestone(total: number): { target: number; progress: number } {
  const target = MILESTONES.find((m) => m > total) ?? MILESTONES[MILESTONES.length - 1]
  const prev = [...MILESTONES].reverse().find((m) => m <= total) ?? 0
  const span = target - prev || target
  const progress = Math.min(Math.round(((total - prev) / span) * 100), 100)
  return { target, progress }
}

/** Format a Firestore Timestamp-ish value as a short join date. */
export function formatJoinDate(createdAt?: { toDate?: () => Date }): string {
  const date = createdAt?.toDate?.()
  if (!date) return 'Recently'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
