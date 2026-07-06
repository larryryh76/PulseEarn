import { BarChart3, ArrowRight, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatChange, formatPrice, isPriceUnavailable, type Market } from './helpers'

export default function MarketCard({
  market,
  multiplier,
  onSelect,
}: {
  market: Market
  multiplier: number
  onSelect: (market: Market) => void
}) {
  const unavailable = isPriceUnavailable(market.price)
  const positive = (market.change || 0) >= 0

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onSelect(market)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(market)
        }
      }}
      className="group cursor-pointer transition-colors hover:border-primary/40 focus-visible:border-primary/40 focus-visible:outline-none"
    >
      <CardContent className="flex h-full flex-col gap-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted p-2">
            {market.image ? (
              <img src={market.image || '/placeholder.svg'} alt="" className="size-full object-contain" />
            ) : (
              <BarChart3 className="size-5 text-primary" />
            )}
          </div>
          <div className="text-right">
            {unavailable ? (
              <>
                <p className="text-sm font-semibold text-muted-foreground">Unavailable</p>
                <p className="text-xs text-muted-foreground">No live quote</p>
              </>
            ) : (
              <>
                <p className="font-mono text-sm font-semibold tabular-nums text-foreground">{formatPrice(market.price)}</p>
                <p className={cn('font-mono text-xs tabular-nums', positive ? 'text-success' : 'text-danger')}>
                  {formatChange(market.change)}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{market.symbol}</span>
            {market.isCampaign ? (
              <Badge variant="secondary" className="text-[10px]">
                Featured
              </Badge>
            ) : null}
          </div>
          <p className="line-clamp-2 text-pretty text-sm leading-relaxed text-muted-foreground">{market.question}</p>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <div className="flex items-center gap-1.5 text-primary">
            <Zap className="size-3.5" />
            <span className="text-xs font-medium">{multiplier.toFixed(2)}x payout</span>
          </div>
          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
            Trade
            <ArrowRight className="size-3.5" />
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
