import type { ComponentType } from 'react'
import {
  Users,
  UserPlus,
  GraduationCap,
  BarChart3,
  MessageCircle,
  CalendarDays,
  Megaphone,
  Sparkles,
  Twitter,
  Youtube,
  Globe,
  Send,
  Smartphone,
  Zap,
  ShieldCheck,
  Clock,
  Link2,
  type LucideProps,
} from 'lucide-react'
import type { TaskCategory, VerificationType, SocialPlatform } from '../../types'

type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'muted'

export const toneChip: Record<Tone, string> = {
  primary: 'bg-primary/10 border-primary/20 text-primary',
  success: 'bg-success/10 border-success/20 text-success',
  warning: 'bg-warning/10 border-warning/20 text-warning',
  danger: 'bg-danger/10 border-danger/20 text-danger',
  muted: 'bg-muted border-border text-muted-foreground',
}

type CategoryMeta = { label: string; icon: ComponentType<LucideProps>; tone: Tone }

const CATEGORY_META: Record<TaskCategory, CategoryMeta> = {
  SOCIAL: { label: 'Social', icon: Users, tone: 'primary' },
  REFERRAL: { label: 'Referral', icon: UserPlus, tone: 'success' },
  EDUCATION: { label: 'Education', icon: GraduationCap, tone: 'primary' },
  PREDICTION: { label: 'Prediction', icon: BarChart3, tone: 'warning' },
  COMMUNITY: { label: 'Community', icon: MessageCircle, tone: 'primary' },
  EVENTS: { label: 'Events', icon: CalendarDays, tone: 'warning' },
  SPONSORED: { label: 'Sponsored', icon: Megaphone, tone: 'success' },
  CUSTOM: { label: 'Custom', icon: Sparkles, tone: 'muted' },
}

export function categoryMeta(category?: TaskCategory): CategoryMeta {
  return (category && CATEGORY_META[category]) || CATEGORY_META.CUSTOM
}

/** Ordered category filters for the marketplace tab bar. */
export const CATEGORY_FILTERS: { value: 'ALL' | TaskCategory; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'SOCIAL', label: 'Social' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'PREDICTION', label: 'Prediction' },
  { value: 'EDUCATION', label: 'Education' },
  { value: 'COMMUNITY', label: 'Community' },
  { value: 'EVENTS', label: 'Events' },
  { value: 'SPONSORED', label: 'Sponsored' },
]

/** Human label for a task's verification method. */
export function verificationMeta(v?: VerificationType): { label: string; icon: ComponentType<LucideProps> } {
  switch (v) {
    case 'automated':
    case 'api':
      return { label: 'Instant reward', icon: Zap }
    case 'link':
      return { label: 'Link visit', icon: Link2 }
    case 'timer':
      return { label: 'Timed', icon: Clock }
    default:
      return { label: 'Manual review', icon: ShieldCheck }
  }
}

/** Icon for the social platform a task targets. */
export function platformIcon(platform?: SocialPlatform): ComponentType<LucideProps> {
  switch (platform) {
    case 'TWITTER':
      return Twitter
    case 'YOUTUBE':
      return Youtube
    case 'TELEGRAM':
      return Send
    case 'DISCORD':
      return MessageCircle
    case 'APP_STORE':
      return Smartphone
    case 'WEBSITE':
      return Globe
    default:
      return Zap
  }
}

export type TaskStatusKey = 'available' | 'pending' | 'completed' | 'cooldown' | 'rejected'

type StatusMeta = { label: string; tone: Tone; actionable: boolean }

const STATUS_META: Record<TaskStatusKey, StatusMeta> = {
  available: { label: 'Available', tone: 'success', actionable: true },
  pending: { label: 'In review', tone: 'warning', actionable: false },
  completed: { label: 'Completed', tone: 'muted', actionable: false },
  cooldown: { label: 'On cooldown', tone: 'muted', actionable: false },
  rejected: { label: 'Rejected', tone: 'danger', actionable: true },
}

export function statusMeta(key: TaskStatusKey): StatusMeta {
  return STATUS_META[key] || STATUS_META.available
}

/** Map server error codes from /api/tasks/submit to friendly, user-facing copy. */
const SUBMIT_ERROR_COPY: Record<string, string> = {
  ALREADY_PENDING: 'This task is already awaiting review.',
  ALREADY_COMPLETED: 'You have already completed this task.',
  ON_COOLDOWN: 'This task is on cooldown. Check back later.',
  TASK_INACTIVE: 'This task is no longer available.',
  NOT_FOUND: 'This task could not be found.',
  MISSING_TASK_ID: 'Something went wrong. Please try again.',
}

export function submitErrorMessage(code?: string, fallback?: string): string {
  if (code && SUBMIT_ERROR_COPY[code]) return SUBMIT_ERROR_COPY[code]
  return fallback || 'Submission failed. Please try again.'
}

/** Short "available in Xh Ym" label for cooldown tasks. */
export function cooldownLabel(nextAvailable?: Date): string {
  if (!nextAvailable) return 'On cooldown'
  const ms = nextAvailable.getTime() - Date.now()
  if (ms <= 0) return 'Available now'
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  if (hours >= 24) return `Available in ${Math.floor(hours / 24)}d`
  if (hours >= 1) return `Available in ${hours}h ${minutes}m`
  return `Available in ${minutes}m`
}
