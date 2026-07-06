import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, Zap, Lock, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { STAKE_OPTIONS, type Market } from './helpers'

interface TradePanelProps {
  market: Market
  multiplier: number
  points: number
  isLocked: boolean
  unlockLevel: number
  userLevel: number
  priceUnavailable?: boolean
  isStale?: boolean
  onSubmit: (direction: 'UP' | 'DOWN', stake: number) => Promise<{ success: boolean; error?: string }>
}

export default function TradePanel({
  market,
  multiplier,
  points,
  isLocked,
  unlockLevel,
  userLevel,
  priceUnavailable = false,
  isStale = false,
  onSubmit,
}: TradePanelProps) {
  const navigate = useNavigate()
  const [direction, setDirection] = useState<'UP' | 'DOWN' | null>(null)
  const [stake, setStake] = useState<number>(100)
  const [submitting, setSubmitting] = useState(false)

  const payout = Math.round(stake * multiplier)
  const insufficient = stake > points
  // Cannot forecast without a live, fresh price. Backend is authoritative, but we gate
  // the UI so users never stake against a missing or stale market quote.
  const feedBlocked = priceUnavailable || isStale

  const handleSubmit = async () => {
    if (!direction) return
    setSubmitting(true)
    const result = await onSubmit(direction, stake)
    setSubmitting(false)
    if (result.success) {
      toast.success('Position opened')
      setDirection(null)
    } else {
      toast.error(result.error || 'Could not place prediction')
    }
  }

  if (isLocked) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-5 p-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-muted text-muted-foreground">
            <Lock className="size-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">Predictions locked</h3>
            <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
              Reach level {unlockLevel} to start forecasting. Complete tasks to earn XP and level up.
            </p>
          </div>
          <div className="w-full space-y-1.5">
            <Progress value={Math.min(100, (userLevel / unlockLevel) * 100)} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Level {userLevel}</span>
              <span>Level {unlockLevel}</span>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/tasks')} className="w-full">
            Earn XP with tasks
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Place your forecast</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2.5">
          <p className="text-xs font-medium text-muted-foreground">Direction</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDirection('UP')}
              aria-pressed={direction === 'UP'}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors',
                direction === 'UP'
                  ? 'border-success bg-success/10 text-success'
                  : 'border-border bg-card text-muted-foreground hover:border-success/40',
              )}
            >
              <TrendingUp className="size-5" />
              <span className="text-sm font-medium">Up</span>
            </button>
            <button
              type="button"
              onClick={() => setDirection('DOWN')}
              aria-pressed={direction === 'DOWN'}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors',
                direction === 'DOWN'
                  ? 'border-danger bg-danger/10 text-danger'
                  : 'border-border bg-card text-muted-foreground hover:border-danger/40',
              )}
            >
              <TrendingDown className="size-5" />
              <span className="text-sm font-medium">Down</span>
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Stake</p>
            <span className="font-mono text-xs text-muted-foreground">{points.toLocaleString()} PTS available</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {STAKE_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setStake(opt)}
                disabled={opt > points}
                className={cn(
                  'rounded-lg border px-3.5 py-2 font-mono text-xs font-medium tabular-nums transition-colors',
                  stake === opt
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40',
                  opt > points && 'cursor-not-allowed opacity-40',
                )}
              >
                {opt.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Stake</span>
            <span className="font-mono font-medium tabular-nums text-foreground">{stake.toLocaleString()} PTS</span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="flex items-center gap-1.5 text-sm text-primary">
              <Zap className="size-3.5" />
              Potential win
            </span>
            <div className="text-right">
              <span className="block font-mono text-lg font-semibold leading-none tabular-nums text-primary">
                {payout.toLocaleString()} PTS
              </span>
              <span className="text-xs text-muted-foreground">{multiplier.toFixed(2)}x fixed reward</span>
            </div>
          </div>
        </div>

        {insufficient ? (
          <p className="text-xs text-danger">You don&apos;t have enough points for this stake.</p>
        ) : null}

        {feedBlocked ? (
          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
            <p className="text-xs text-warning">
              {priceUnavailable
                ? 'Live price unavailable for this market. Forecasting is disabled until a quote loads.'
                : 'Market data is stale. Forecasting is paused until a fresh price arrives.'}
            </p>
          </div>
        ) : null}

        <Button
          className="w-full"
          size="lg"
          disabled={!direction || submitting || insufficient || feedBlocked}
          onClick={handleSubmit}
        >
          {feedBlocked
            ? 'Forecasting unavailable'
            : submitting
              ? 'Opening position…'
              : `Forecast ${market.symbol} ${direction ? (direction === 'UP' ? 'Up' : 'Down') : ''}`}
        </Button>
      </CardContent>
    </Card>
  )
}
