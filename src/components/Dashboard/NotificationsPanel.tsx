import { Link } from 'react-router-dom'
import { Bell, BellOff, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { StateLoading } from '../system/states'
import { useNotifications } from '../../hooks/useNotifications'
import { notificationMeta, toneChip, relativeTime } from './helpers'

export default function NotificationsPanel() {
  const { notifications, unreadCount, loading, markAllAsRead } = useNotifications()
  const recent = notifications.slice(0, 5)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="size-4 text-primary" />
          Notifications
          {unreadCount > 0 ? (
            <Badge variant="default" className="ml-1">{unreadCount}</Badge>
          ) : null}
        </CardTitle>
        {unreadCount > 0 ? (
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs" onClick={() => markAllAsRead()}>
            <Check className="size-3.5" /> Mark read
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-1">
        {loading ? (
          <StateLoading rows={3} rowClassName="h-14" />
        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <BellOff className="size-6 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">You&apos;re all caught up.</p>
          </div>
        ) : (
          <>
            {recent.map((n) => {
              const meta = notificationMeta(n.type)
              const Icon = meta.icon
              return (
                <div
                  key={n.id}
                  className={cn(
                    'flex items-start gap-3 rounded-lg p-2.5 transition-colors',
                    !n.read && 'bg-primary/[0.04]',
                  )}
                >
                  <div className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border', toneChip[meta.tone])}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug text-foreground">{n.title}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{n.description}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{relativeTime(n.timestamp)}</p>
                  </div>
                  {!n.read ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" /> : null}
                </div>
              )
            })}
            <Link
              to="/notifications"
              className="block pt-2 text-center text-xs font-medium text-primary transition-colors hover:text-primary/80"
            >
              View all notifications
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  )
}
