import { Zap, Sparkles, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Task } from '../../types'
import {
  categoryMeta,
  verificationMeta,
  statusMeta,
  cooldownLabel,
  toneChip,
  type TaskStatusKey,
} from './helpers'

export type TaskWithStatus = {
  task: Task
  status: TaskStatusKey
  nextAvailable?: Date
}

export default function TaskCard({
  entry,
  onSelect,
}: {
  entry: TaskWithStatus
  onSelect: (task: Task) => void
}) {
  const { task, status, nextAvailable } = entry
  const cat = categoryMeta(task.category)
  const CatIcon = cat.icon
  const verify = verificationMeta(task.verificationType)
  const VerifyIcon = verify.icon
  const stat = statusMeta(status)

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onSelect(task)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(task))}
      className={cn(
        'group cursor-pointer transition-colors hover:border-primary/40 focus-visible:border-primary/40 focus-visible:outline-none',
        !stat.actionable && 'opacity-80',
      )}
    >
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className={cn('flex size-10 items-center justify-center rounded-xl border', toneChip[cat.tone])}>
            <CatIcon className="size-5" />
          </div>
          <Badge
            variant="outline"
            className={cn('shrink-0 text-[10px] font-semibold uppercase tracking-wide', toneChip[stat.tone])}
          >
            {status === 'cooldown' ? cooldownLabel(nextAvailable) : stat.label}
          </Badge>
        </div>

        <div className="flex-1 space-y-1.5">
          <Badge variant="outline" className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {cat.label}
          </Badge>
          <h3 className="line-clamp-1 text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
            {task.title}
          </h3>
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {task.subtitle || task.description || 'Complete this objective to claim your reward.'}
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
              <Zap className="size-3.5 text-primary" />+{task.rewardAmount.toLocaleString()}
            </span>
            {task.xpReward > 0 ? (
              <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="size-3.5" />
                {task.xpReward.toLocaleString()} XP
              </span>
            ) : null}
          </div>
          <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <VerifyIcon className="size-3.5" />
            <span className="hidden sm:inline">{verify.label}</span>
            <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
