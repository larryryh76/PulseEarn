import type { ComponentType, ReactNode } from 'react'
import { AlertTriangleIcon, RefreshCwIcon, type LucideProps } from 'lucide-react'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * Shared, brand-consistent state primitives used across every rebuilt surface
 * (Dashboard, Tasks, Referrals, Predictions, Admin, Moderator). Each surface composes
 * these instead of hand-rolling empty/error/loading markup so the whole product feels
 * like one system.
 */

/** Empty state — no data yet, but nothing is wrong. */
export function StateEmpty({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ComponentType<LucideProps>
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <Empty className={cn('border', className)}>
      <EmptyHeader>
        {Icon ? (
          <EmptyMedia variant="icon">
            <Icon />
          </EmptyMedia>
        ) : null}
        <EmptyTitle>{title}</EmptyTitle>
        {description ? <EmptyDescription>{description}</EmptyDescription> : null}
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  )
}

/** Error state — something failed; offer a retry when possible. */
export function StateError({
  title = 'Something went wrong',
  description = 'We could not load this right now. Please try again.',
  onRetry,
  className,
}: {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <Alert variant="destructive" className={cn('flex flex-col gap-3', className)}>
      <AlertTriangleIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-1 w-fit">
          <RefreshCwIcon data-icon="inline-start" />
          Retry
        </Button>
      ) : null}
    </Alert>
  )
}

/** Loading skeleton — a vertical list of shimmer rows. */
export function StateLoading({
  rows = 3,
  className,
  rowClassName,
}: {
  rows?: number
  className?: string
  rowClassName?: string
}) {
  return (
    <div className={cn('flex flex-col gap-3', className)} aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={cn('h-16 w-full rounded-xl', rowClassName)} />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  )
}
