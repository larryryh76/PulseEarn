import { Link } from 'react-router-dom'
import { Activity as ActivityIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { StateEmpty } from '../system/states'
import { useTasks } from '../../hooks/useTasks'
import { activityMeta, toneChip, relativeTime } from './helpers'

export default function ActivityFeed() {
  const { activities } = useTasks()
  const recent = (activities || []).slice(0, 6)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <ActivityIcon className="size-4 text-primary" />
          Recent Activity
        </CardTitle>
        {recent.length > 0 ? (
          <Link
            to="/notifications"
            state={{ tab: 'ACTIVITY' }}
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            See all
          </Link>
        ) : null}
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <StateEmpty
            icon={ActivityIcon}
            title="No activity yet"
            description="Your earnings and events will show up here as you use PulseEarn."
          />
        ) : (
          <div className="space-y-1">
            {recent.map((a) => {
              const meta = activityMeta(a.type)
              const Icon = meta.icon
              const positive = a.points > 0
              return (
                <div key={a.id} className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted/50">
                  <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg border', toneChip[meta.tone])}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{a.description}</p>
                    <p className="text-[10px] text-muted-foreground">{relativeTime(a.timestamp)}</p>
                  </div>
                  {a.points !== 0 ? (
                    <span className={cn('shrink-0 text-sm font-semibold', positive ? 'text-success' : 'text-danger')}>
                      {positive ? '+' : ''}
                      {a.points.toLocaleString()}
                    </span>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
