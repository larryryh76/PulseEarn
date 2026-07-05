import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, ChevronRight, BarChart3, LineChart } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { StateEmpty } from '../system/states'
import { useTasks } from '../../hooks/useTasks'

export default function ActivePredictions() {
  const { predictions } = useTasks()

  const active = useMemo(
    () => (predictions || []).filter((p) => p.status === 'ACTIVE').slice(0, 4),
    [predictions],
  )

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LineChart className="size-4 text-primary" />
          <h2 className="text-base font-semibold tracking-tight text-foreground">Active Predictions</h2>
        </div>
        <Link to="/predictions" className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary">
          Portfolio <ChevronRight className="size-3.5" />
        </Link>
      </div>

      {active.length === 0 ? (
        <StateEmpty
          icon={BarChart3}
          title="No open forecasts"
          description="Place a market forecast to start earning on price movements."
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/predictions">Open markets</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {active.map((p) => {
            const up = p.direction === 'UP'
            return (
              <Card key={p.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-xl border',
                      up ? 'border-success/20 bg-success/10 text-success' : 'border-danger/20 bg-danger/10 text-danger',
                    )}
                  >
                    {up ? <TrendingUp className="size-5" /> : <TrendingDown className="size-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{p.symbol}/USD</p>
                      <Badge variant={up ? 'secondary' : 'destructive'} className="text-[10px]">
                        {p.direction}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Entry ${p.entryPrice?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{p.stakeAmount.toLocaleString()}</p>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-primary">Staked</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </section>
  )
}
