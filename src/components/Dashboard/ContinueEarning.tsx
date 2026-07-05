import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap, Target, UserPlus, BarChart3, Calendar, ArrowRight, ChevronRight, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { StateEmpty } from '../system/states'
import { useTasks } from '../../hooks/useTasks'

type RailItem = {
  id: string
  type: 'CAMPAIGN' | 'TASK' | 'MISSION'
  title: string
  category?: string
  reward: number
  description?: string
  progress?: number
  target?: number
  priority: number
}

function categoryIcon(item: RailItem) {
  if (item.category === 'PREDICTION') return BarChart3
  if (item.category === 'REFERRAL') return UserPlus
  if (item.type === 'MISSION') return Calendar
  return Target
}

export default function ContinueEarning() {
  const navigate = useNavigate()
  const { tasks, campaigns, systemTasks, getTaskStatus } = useTasks()

  const items = useMemo<RailItem[]>(() => {
    const activeCampaigns = (campaigns || []).filter((c) => c.active)
    const rail: RailItem[] = []

    activeCampaigns
      .filter((c) => c.featured)
      .forEach((c) =>
        rail.push({
          id: `campaign_${c.id}`,
          type: 'CAMPAIGN',
          title: c.name,
          category: c.category,
          reward: c.totalPrizePool || 0,
          description: c.description,
          priority: 100,
        }),
      )

    tasks
      .filter((t) => t.active && getTaskStatus(t).status === 'available')
      .slice(0, 8)
      .forEach((t) =>
        rail.push({
          id: `task_${t.id}`,
          type: 'TASK',
          title: t.title,
          category: t.category,
          reward: t.rewardAmount,
          description: t.instructions,
          priority: t.rewardAmount > 500 ? 90 : 70,
        }),
      )

    systemTasks
      .filter((st) => st.progress?.status !== 'CLAIMED' && st.definition?.active !== false)
      .forEach((st) =>
        rail.push({
          id: `mission_${st.id}`,
          type: 'MISSION',
          title: st.definition.title,
          category: st.definition.category,
          reward: st.definition.rewardPoints,
          description: st.definition.description,
          progress: st.progress?.progress || 0,
          target: st.definition.targetValue,
          priority: st.progress?.status === 'COMPLETED' ? 95 : 80,
        }),
      )

    return rail.sort((a, b) => b.priority - a.priority).slice(0, 9)
  }, [tasks, campaigns, systemTasks, getTaskStatus])

  const go = (item: RailItem) => {
    if (item.category === 'PREDICTION') navigate('/predictions')
    else if (item.category === 'REFERRAL') navigate('/referrals')
    else navigate('/tasks')
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h2 className="text-base font-semibold tracking-tight text-foreground">Continue Earning</h2>
        </div>
        <Link to="/tasks" className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary">
          View all <ChevronRight className="size-3.5" />
        </Link>
      </div>

      {items.length === 0 ? (
        <StateEmpty
          icon={Target}
          title="No open objectives"
          description="You're all caught up. New tasks and campaigns will appear here as they launch."
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/tasks">Browse tasks</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const Icon = categoryIcon(item)
            const pct = item.target && item.target > 0 ? Math.round(((item.progress || 0) / item.target) * 100) : null
            return (
              <Card
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => go(item)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && go(item)}
                className={cn(
                  'group cursor-pointer transition-colors hover:border-primary/40',
                  item.type === 'CAMPAIGN' && 'border-primary/20 bg-primary/[0.03]',
                )}
              >
                <CardContent className="flex h-full flex-col gap-4 p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-muted text-primary">
                      <Icon className="size-5" />
                    </div>
                    <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
                      <Zap className="size-3.5 text-primary" />+{item.reward.toLocaleString()}
                    </div>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Badge variant="outline" className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {item.category || item.type}
                    </Badge>
                    <h3 className="line-clamp-1 text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                      {item.title}
                    </h3>
                    <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {item.description || 'Complete this objective to claim your reward.'}
                    </p>
                  </div>
                  {pct !== null ? (
                    <div className="space-y-1.5">
                      <Progress value={pct} className="h-1.5" />
                      <p className="text-[10px] font-medium text-muted-foreground">{pct}% complete</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
                      <span className="font-medium text-success">Available</span>
                      <ArrowRight className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </section>
  )
}
