import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { predictionOutcome, toneChip, formatDateTime, formatPrice } from './helpers'
import type { PredictionRecord } from '../../types'

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-mono text-sm font-medium tabular-nums text-foreground">{value}</span>
    </div>
  )
}

export default function PredictionDetailDialog({
  prediction,
  multiplier,
  open,
  onOpenChange,
}: {
  prediction: PredictionRecord | null
  multiplier: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!prediction) return null

  const meta = predictionOutcome(prediction)
  const estimatedPayout = Math.round(prediction.stakeAmount * multiplier)
  const finalYield = prediction.rewardAmount || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{prediction.symbol} forecast</DialogTitle>
            <Badge className={cn('border', toneChip[meta.tone])}>{meta.label}</Badge>
          </div>
          <DialogDescription>{formatDateTime(prediction.createdAt)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/40 px-4 divide-y divide-border">
            <DetailRow label="Direction" value={prediction.direction === 'UP' ? 'Up' : 'Down'} />
            <DetailRow label="Entry price" value={formatPrice(prediction.entryPrice)} />
            <DetailRow label="Settlement price" value={prediction.exitPrice ? formatPrice(prediction.exitPrice) : '—'} />
            <DetailRow label="Stake" value={`${prediction.stakeAmount.toLocaleString()} PTS`} />
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-5 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {meta.group === 'active' ? 'Estimated payout' : 'Final result'}
            </p>
            <p
              className={cn(
                'mt-1 font-mono text-2xl font-semibold tabular-nums',
                meta.group === 'active' ? 'text-primary' : meta.won ? 'text-success' : 'text-muted-foreground',
              )}
            >
              {meta.group === 'active'
                ? `+${estimatedPayout.toLocaleString()}`
                : meta.won
                  ? `+${finalYield.toLocaleString()}`
                  : '0'}
              <span className="ml-1 text-sm text-muted-foreground">PTS</span>
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-xs text-muted-foreground">Reference ID</span>
            <span className="font-mono text-xs text-muted-foreground">{prediction.id.slice(-16)}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
