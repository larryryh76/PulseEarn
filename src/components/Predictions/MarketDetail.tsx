import { ArrowLeft, BarChart3, Activity, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import PredictionChart from '../../pages/predictions/components/PredictionChart'
import TradePanel from './TradePanel'
import { formatChange, formatPrice, formatFreshness, isPriceUnavailable, type Market } from './helpers'
import type { CryptoMarketData } from '../../hooks/useCryptoData'

interface MarketDetailProps {
  market: Market
  coin?: CryptoMarketData
  multiplier: number
  points: number
  isLocked: boolean
  unlockLevel: number
  userLevel: number
  source: 'coingecko' | 'coinbase' | 'cryptocompare'
  lastUpdated: number
  isStale: boolean
  onBack: () => void
  onSubmit: (direction: 'UP' | 'DOWN', stake: number) => Promise<{ success: boolean; error?: string }>
}

export default function MarketDetail({
  market,
  coin,
  multiplier,
  points,
  isLocked,
  unlockLevel,
  userLevel,
  source,
  lastUpdated,
  isStale,
  onBack,
  onSubmit,
}: MarketDetailProps) {
  const price = coin?.current_price ?? market.price ?? null
  const change = coin?.price_change_percentage_24h ?? market.change ?? null
  const unavailable = isPriceUnavailable(price)
  const positive = (change ?? 0) >= 0
  const sourceLabel = source === 'coingecko' ? 'CoinGecko' : source === 'coinbase' ? 'Coinbase' : 'CryptoCompare'

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="group inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
        Back to markets
      </button>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-border bg-muted p-2.5">
                    {coin?.image || market.image ? (
                      <img src={coin?.image || market.image || '/placeholder.svg'} alt="" className="size-full object-contain" />
                    ) : (
                      <BarChart3 className="size-6 text-primary" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold text-foreground">{market.symbol}</h2>
                      {unavailable ? (
                        <Badge variant="secondary" className="gap-1 text-[10px] text-muted-foreground">
                          <span className="size-1.5 rounded-full bg-muted-foreground" />
                          No live quote
                        </Badge>
                      ) : isStale ? (
                        <Badge variant="secondary" className="gap-1 text-[10px] text-warning">
                          <AlertTriangle className="size-2.5" />
                          Stale
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 text-[10px]">
                          <span className="size-1.5 animate-pulse rounded-full bg-success" />
                          Live
                        </Badge>
                      )}
                    </div>
                    <p className="max-w-md text-pretty text-sm text-muted-foreground">{market.question}</p>
                  </div>
                </div>
                <div className="text-right">
                  {unavailable ? (
                    <>
                      <p className="text-2xl font-semibold text-muted-foreground">Unavailable</p>
                      <p className="text-sm text-muted-foreground">No live price feed</p>
                    </>
                  ) : (
                    <>
                      <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">{formatPrice(price)}</p>
                      <p className={cn('font-mono text-sm tabular-nums', positive ? 'text-success' : 'text-danger')}>
                        {formatChange(change)} · 24h
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {sourceLabel} · updated {formatFreshness(lastUpdated)}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="size-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Price · last 24 hours</h3>
                </div>
              </div>
              <PredictionChart assetId={market.assetId} symbol={market.symbol} />
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-24 lg:h-fit">
          <TradePanel
            market={market}
            multiplier={multiplier}
            points={points}
            isLocked={isLocked}
            unlockLevel={unlockLevel}
            userLevel={userLevel}
            priceUnavailable={unavailable}
            isStale={isStale}
            onSubmit={onSubmit}
          />
        </div>
      </div>
    </div>
  )
}
