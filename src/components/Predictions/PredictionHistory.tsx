import { useMemo, useState } from 'react'
import { TrendingUp, TrendingDown, ChevronRight, History } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { StateEmpty, StateLoading } from '../system/states'
import { HISTORY_FILTERS, predictionOutcome, toneChip, formatDate, type HistoryFilter } from './helpers'
import type { PredictionRecord } from '../../types'

function HistoryRow({ pred, onSelect }: { pred: PredictionRecord; onSelect: (p: PredictionRecord) => void }) {
  const meta = predictionOutcome(pred)
  const up = pred.direction === 'UP'

  return (
    <button
      type="button"
      onClick={() => onSelect(pred)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-border/80"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg border',
            up ? 'border-success/20 bg-success/10 text-success' : 'border-danger/20 bg-danger/10 text-danger',
          )}
        >
          {up ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{pred.symbol}</p>
          <p className="text-xs text-muted-foreground">{formatDate(pred.createdAt)}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p
            className={cn(
              'font-mono text-sm font-semibold tabular-nums',
              meta.won ? 'text-success' : meta.group === 'active' ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {meta.group === 'active'
              ? `${pred.stakeAmount.toLocaleString()} PTS`
              : meta.won
                ? `+${(pred.rewardAmount || 0).toLocaleString()} PTS`
                : '—'}
          </p>
        </div>
        <span className={cn('hidden rounded-full border px-2.5 py-0.5 text-xs font-medium sm:inline-flex', toneChip[meta.tone])}>
          {meta.label}
        </span>
        <ChevronRight className="size-4 text-muted-foreground" />
      </div>
    </button>
  )
}

export default function PredictionHistory({
  predictions,
  loading,
  onSelect,
}: {
  predictions: PredictionRecord[]
  loading: boolean
  onSelect: (p: PredictionRecord) => void
}) {
  const [filter, setFilter] = useState<HistoryFilter>('ALL')

  const filtered = useMemo(() => {
    const sorted = [...predictions].sort(
      (a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0),
    )
    if (filter === 'ALL') return sorted
    return sorted.filter((p) => p.status === filter)
  }, [predictions, filter])

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Forecast history</h2>
            <p className="text-sm text-muted-foreground">Every position you&apos;ve opened and how it settled.</p>
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as HistoryFilter)}>
            <ScrollArea className="w-full whitespace-nowrap">
              <TabsList className="w-max">
                {HISTORY_FILTERS.map((f) => (
                  <TabsTrigger key={f.value} value={f.value}>
                    {f.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </Tabs>
        </div>

        {loading ? (
          <StateLoading rows={4} rowClassName="h-16" />
        ) : filtered.length === 0 ? (
          <StateEmpty
            icon={History}
            title={filter === 'ALL' ? 'No forecasts yet' : 'Nothing here yet'}
            description={
              filter === 'ALL'
                ? 'Open your first position from the markets tab to start building a track record.'
                : 'No forecasts match this filter right now.'
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((pred) => (
              <HistoryRow key={pred.id} pred={pred} onSelect={onSelect} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
