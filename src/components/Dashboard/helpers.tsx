import type { ComponentType } from 'react'
import type { Timestamp } from 'firebase/firestore'
import {
  Zap,
  Target,
  UserPlus,
  BarChart3,
  TrendingUp,
  Trophy,
  Flame,
  ShieldAlert,
  Gift,
  Bell,
  CheckCircle2,
  Wallet,
  type LucideProps,
} from 'lucide-react'
import type { Activity, Notification } from '../../types'

/** Firestore Timestamp | Date -> short "time ago" label. */
export function relativeTime(ts?: Timestamp | Date | null): string {
  if (!ts) return ''
  const date = ts instanceof Date ? ts : ts.toDate?.()
  if (!date) return ''
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 45) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type Meta = { icon: ComponentType<LucideProps>; tone: 'primary' | 'success' | 'warning' | 'danger' | 'muted' }

/** Map an activity type to an icon + semantic tone. */
export function activityMeta(type: Activity['type']): Meta {
  if (type.includes('prediction')) return { icon: BarChart3, tone: type.includes('won') ? 'success' : type.includes('lost') ? 'danger' : 'primary' }
  if (type.includes('referral')) return { icon: UserPlus, tone: 'primary' }
  if (type.includes('level') || type.includes('xp')) return { icon: TrendingUp, tone: 'primary' }
  if (type.includes('streak')) return { icon: Flame, tone: 'warning' }
  if (type.includes('withdrawal')) return { icon: Wallet, tone: 'muted' }
  if (type.includes('reward_reversed') || type.includes('moderation')) return { icon: ShieldAlert, tone: 'danger' }
  if (type.includes('reward')) return { icon: Zap, tone: 'success' }
  if (type.includes('task') || type.includes('mission') || type.includes('campaign')) return { icon: Target, tone: 'primary' }
  if (type.includes('milestone') || type.includes('achieved')) return { icon: Trophy, tone: 'warning' }
  return { icon: Zap, tone: 'muted' }
}

/** Map a notification type to an icon + semantic tone. */
export function notificationMeta(type: Notification['type']): Meta {
  switch (type) {
    case 'reward_claimed':
      return { icon: Gift, tone: 'success' }
    case 'task_completed':
      return { icon: CheckCircle2, tone: 'success' }
    case 'referral_joined':
      return { icon: UserPlus, tone: 'primary' }
    case 'streak_bonus':
      return { icon: Flame, tone: 'warning' }
    case 'prediction_result':
      return { icon: BarChart3, tone: 'primary' }
    case 'payout_processed':
      return { icon: Wallet, tone: 'success' }
    case 'moderation_notice':
      return { icon: ShieldAlert, tone: 'danger' }
    case 'subtask_update':
      return { icon: Target, tone: 'primary' }
    default:
      return { icon: Bell, tone: 'muted' }
  }
}

/** Tailwind classes for a tone's icon chip (bg + border + text). */
export const toneChip: Record<Meta['tone'], string> = {
  primary: 'bg-primary/10 border-primary/20 text-primary',
  success: 'bg-success/10 border-success/20 text-success',
  warning: 'bg-warning/10 border-warning/20 text-warning',
  danger: 'bg-danger/10 border-danger/20 text-danger',
  muted: 'bg-muted border-border text-muted-foreground',
}
