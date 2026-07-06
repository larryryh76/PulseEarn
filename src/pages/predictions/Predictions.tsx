import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { LineChart, Zap, Activity, History as HistoryIcon, Search, AlertTriangle } from 'lucide-react'
import { useTasks } from '../../hooks/useTasks'
import { usePredictionMarkets } from '../../hooks/usePredictionMarkets'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import MarketCard from '../../components/Predictions/MarketCard'
import MarketDetail from '../../components/Predictions/MarketDetail'
import PredictionHistory from '../../components/Predictions/PredictionHistory'
import PredictionDetailDialog from '../../components/Predictions/PredictionDetailDialog'
import { cn } from '@/lib/utils'
import type { PredictionRecord } from '../../types'
import { formatFreshness, type Market } from '../../components/Predictions/helpers'

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mx-auto max-w-7xl px-4 pb-24 pt-24 md:px-8 md:pt-28">{children}</div>
)

/** Authoritative live-feed status. Never claims "Live" when data is stale or missing. */
function FeedStatus({
  loading,
  isStale,
  feedError,
  source,
  lastUpdated,
}: {
  loading: boolean
  isStale: boolean
  feedError: string | null
  source: 'coingecko' | 'coinbase' | 'cryptocompare'
  lastUpdated: number
}) {
  if (loading && !lastUpdated) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="size-1.5 rounded-full bg-muted-foreground" />
        Connecting to market feed…
      </span>
    )
  }
  if (feedError && !lastUpdated) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-danger">
        <AlertTriangle className="size-3.5" />
        Market data unavailable
      </span>
    )
  }
  if (isStale) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-warning">
        <AlertTriangle className="size-3.5" />
        Data stale · reconnecting
      </span>
    )
  }
  const sourceLabel = source === 'coingecko' ? 'CoinGecko' : source === 'coinbase' ? 'Coinbase' : 'CryptoCompare'
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="size-1.5 animate-pulse rounded-full bg-success" />
      Live · {sourceLabel} · {formatFreshness(lastUpdated)}
    </span>
  )
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  tone = 'muted',
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  tone?: 'primary' | 'success' | 'muted'
}) {
  const toneText: Record<string, string> = {
    primary: 'text-primary',
    success: 'text-success',
    muted: 'text-muted-foreground',
  }
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
          <Icon className={cn('size-4', toneText[tone])} />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold leading-tight text-foreground">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Predictions() {
  const location = useLocation()
  const { predictions: userPredictions = [] } = useTasks()
  const {
    markets,
    marketLoading,
    getCoin,
    unlockLevel,
    isLocked,
    userLevel,
    winMultiplier,
    points,
    source,
    lastUpdated,
    isStale,
    feedError,
    placePrediction,
  } = usePredictionMarkets()

  const [view, setView] = useState<'markets' | 'history'>('markets')
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null)
  const [detailItem, setDetailItem] = useState<PredictionRecord | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Deep-linking from the dashboard / activity feed.
  useEffect(() => {
    const state = location.state as { view?: string; highlightId?: string } | null
    if (!state) return
    if (state.view === 'PORTFOLIO') setView('history')
    if (state.highlightId && userPredictions.length > 0) {
      const item = userPredictions.find((p) => p.id === state.highlightId)
      if (item) {
        setView('history')
        setDetailItem(item)
        setDialogOpen(true)
      }
    }
  }, [location.state, userPredictions])

  const activeMarket = useMemo(
    () => markets.find((m) => m.id === selectedMarketId) || null,
    [markets, selectedMarketId],
  )

  const activeCount = useMemo(
    () => userPredictions.filter((p) => p.status === 'ACTIVE').length,
    [userPredictions],
  )

  const handleSelectMarket = (market: Market) => setSelectedMarketId(market.id)
  const handleSelectHistory = (pred: PredictionRecord) => {
    setDetailItem(pred)
    setDialogOpen(true)
  }

  const handleSubmit = async (direction: 'UP' | 'DOWN', stake: number) => {
    if (!activeMarket) return { success: false, error: 'No market selected.' }
    const result = await placePrediction(activeMarket, direction, stake)
    if (result.success) {
      setSelectedMarketId(null)
      setView('history')
    }
    return result
  }

  const switchView = (next: 'markets' | 'history') => {
    setView(next)
    setSelectedMarketId(null)
  }

  return (
    <Shell>
      <div className="space-y-8">
        <header className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-primary">
                <LineChart className="size-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Prediction Market</span>
              </div>
              <FeedStatus loading={marketLoading} isStale={isStale} feedError={feedError} source={source} lastUpdated={lastUpdated} />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Predictions</h1>
            <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
              Forecast the direction of live crypto markets and earn a fixed multiplier on winning positions.
              Every stake settles automatically after 24 hours.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryStat icon={Zap} label="Available points" value={points.toLocaleString()} tone="primary" />
            <SummaryStat icon={Activity} label="Active positions" value={activeCount.toLocaleString()} tone="success" />
            <SummaryStat icon={HistoryIcon} label="Total forecasts" value={userPredictions.length.toLocaleString()} />
            <SummaryStat icon={Search} label="Live markets" value={markets.length.toLocaleString()} />
          </div>
        </header>

        {activeMarket ? (
          <MarketDetail
            market={activeMarket}
            coin={getCoin(activeMarket.assetId)}
            multiplier={winMultiplier}
            points={points}
            isLocked={isLocked}
            unlockLevel={unlockLevel}
            userLevel={userLevel}
            source={source}
            lastUpdated={lastUpdated}
            isStale={isStale}
            onBack={() => setSelectedMarketId(null)}
            onSubmit={handleSubmit}
          />
        ) : (
          <div className="space-y-6">
            <Tabs value={view} onValueChange={(v) => switchView(v as 'markets' | 'history')}>
              <TabsList>
                <TabsTrigger value="markets">
                  <Activity className="size-4" data-icon="inline-start" />
                  Markets
                </TabsTrigger>
                <TabsTrigger value="history">
                  <HistoryIcon className="size-4" data-icon="inline-start" />
                  History
                  {activeCount > 0 ? <span className="ml-1.5 size-1.5 rounded-full bg-primary" /> : null}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {view === 'markets' ? (
              marketLoading && markets.length === 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-48 w-full rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {markets.map((market) => (
                    <MarketCard
                      key={market.id}
                      market={market}
                      multiplier={winMultiplier}
                      onSelect={handleSelectMarket}
                    />
                  ))}
                </div>
              )
            ) : (
              <PredictionHistory
                predictions={userPredictions}
                loading={false}
                onSelect={handleSelectHistory}
              />
            )}
          </div>
        )}
      </div>

      <PredictionDetailDialog
        prediction={detailItem}
        multiplier={winMultiplier}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </Shell>
  )
}
