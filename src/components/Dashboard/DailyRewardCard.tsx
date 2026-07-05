import { useState, useEffect } from 'react'
import { Flame, Clock, Gift, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { useAuth } from '../../contexts/AuthContext'

const DailyRewardCard: React.FC = () => {
  const { userData } = useAuth()
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const updateCountdown = () => {
      const utcOffset = -new Date().getTimezoneOffset()
      const now = new Date()
      const localNow = new Date(now.getTime() + utcOffset * 60000)

      const nextResetLocal = new Date(localNow)
      nextResetLocal.setHours(24, 0, 0, 0)

      const diff = nextResetLocal.getTime() - localNow.getTime()
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`)
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [])

  const isClaimedToday = () => {
    if (!userData?.lastRewardDate) return false
    const utcOffset = -new Date().getTimezoneOffset()
    const lastDateUTC = userData.lastRewardDate.toDate()
    const nowUTC = new Date()

    const lastDateLocal = new Date(lastDateUTC.getTime() + utcOffset * 60000)
    const nowLocal = new Date(nowUTC.getTime() + utcOffset * 60000)

    return (
      lastDateLocal.getUTCFullYear() === nowLocal.getUTCFullYear() &&
      lastDateLocal.getUTCMonth() === nowLocal.getUTCMonth() &&
      lastDateLocal.getUTCDate() === nowLocal.getUTCDate()
    )
  }

  const claimed = isClaimedToday()
  const streak = userData?.streak || 0
  const weekProgress = Math.min((((streak || 0) - 1) % 7 + 1) / 7 * 100, 100)

  return (
    <Card>
      <CardContent className="flex h-full flex-col justify-between gap-6 p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Daily Check-In</p>
            <div className="flex items-center gap-2">
              <Flame className={cn('size-5 transition-colors', claimed ? 'fill-warning text-warning' : 'text-muted-foreground')} />
              <span className="text-2xl font-semibold tracking-tight text-foreground">{streak} Day{streak === 1 ? '' : 's'}</span>
            </div>
          </div>
          <div
            className={cn(
              'flex size-10 items-center justify-center rounded-xl border transition-colors',
              claimed ? 'border-success/20 bg-success/10 text-success' : 'border-border bg-muted text-muted-foreground',
            )}
          >
            {claimed ? <CheckCircle2 className="size-5" /> : <Gift className="size-5" />}
          </div>
        </div>

        <div className="space-y-2">
          <Progress value={weekProgress} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="size-3" /> Resets in {timeLeft}
            </span>
            {claimed ? (
              <Badge variant="secondary" className="text-success">Claimed</Badge>
            ) : (
              <span className="font-medium text-primary">Claim on login</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default DailyRewardCard
