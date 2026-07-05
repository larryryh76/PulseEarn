import { useState } from 'react'
import { LineChart, Zap, Activity, History as HistoryIcon, Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import MarketCard from '../../components/Predictions/MarketCard'
import TradePanel from '../../components/Predictions/TradePanel'
import PredictionHistory from '../../components/Predictions/PredictionHistory'
import PredictionDetailDialog from '../../components/Predictions/PredictionDetailDialog'
import type { Market } from '../../components/Predictions/helpers'
import type { PredictionRecord } from '../../types'

const ts = (d: Date) => ({ toDate: () => d, toMillis: () => d.getTime() }) as any

const MARKETS: Market[] = [
  { id: 'g_btc', assetId: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', question: 'Will Bitcoin rise over the next 24 hours?', isCampaign: true, image: '', price: 63120.42, change: 2.14 },
  { id: 'g_eth', assetId: 'ethereum', symbol: 'ETH', name: 'Ethereum', question: 'Will Ethereum rise over the next 24 hours?', isCampaign: false, image: '', price: 3110.88, change: -1.02 },
  { id: 'g_sol', assetId: 'solana', symbol: 'SOL', name: 'Solana', question: 'Will Solana rise over the next 24 hours?', isCampaign: false, image: '', price: 142.31, change: 4.87 },
  { id: 'g_xrp', assetId: 'ripple', symbol: 'XRP', name: 'XRP', question: 'Will XRP rise over the next 24 hours?', isCampaign: false, image: '', price: 0.5233, change: 0.42 },
  { id: 'g_doge', assetId: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', question: 'Will Dogecoin rise over the next 24 hours?', isCampaign: false, image: '', price: 0.1288, change: -3.11 },
  { id: 'g_link', assetId: 'chainlink', symbol: 'LINK', name: 'Chainlink', question: 'Will Chainlink rise over the next 24 hours?', isCampaign: false, image: '', price: 13.77, change: 1.9 },
]

const PREDS: PredictionRecord[] = [
  { id: 'p1_abcdef0123456789', userId: 'u', taskId: 'g_btc', assetId: 'bitcoin', symbol: 'BTC', direction: 'UP', entryPrice: 61200, stakeAmount: 100, status: 'ACTIVE', transactionReference: 'tx1', createdAt: ts(new Date(Date.now() - 3600_000)), auditTrail: [] },
  { id: 'p2_abcdef0123456789', userId: 'u', taskId: 'g_eth', assetId: 'ethereum', symbol: 'ETH', direction: 'DOWN', entryPrice: 3200, exitPrice: 3110, stakeAmount: 50, rewardAmount: 100, status: 'RESOLVED', transactionReference: 'tx2', createdAt: ts(new Date(Date.now() - 86400_000)), auditTrail: [] },
  { id: 'p3_abcdef0123456789', userId: 'u', taskId: 'g_sol', assetId: 'solana', symbol: 'SOL', direction: 'UP', entryPrice: 150, exitPrice: 142, stakeAmount: 500, rewardAmount: 0, status: 'RESOLVED', transactionReference: 'tx3', createdAt: ts(new Date(Date.now() - 172800_000)), auditTrail: [] },
]

function SummaryStat({ icon: Icon, label, value, tone = 'muted' }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; tone?: 'primary' | 'success' | 'muted' }) {
  const toneText: Record<string, string> = { primary: 'text-primary', success: 'text-success', muted: 'text-muted-foreground' }
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

export default function PredictionsPreview() {
  const [view, setView] = useState<'markets' | 'history'>('markets')
  const [detail, setDetail] = useState<PredictionRecord | null>(null)
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-10 md:px-8">
        <div className="space-y-8">
          <header className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <LineChart className="size-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Prediction Market</span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Predictions</h1>
              <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
                Forecast the direction of live crypto markets and earn a fixed multiplier on winning positions.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <SummaryStat icon={Zap} label="Available points" value="8,420" tone="primary" />
              <SummaryStat icon={Activity} label="Active positions" value="1" tone="success" />
              <SummaryStat icon={HistoryIcon} label="Total forecasts" value="3" />
              <SummaryStat icon={Search} label="Live markets" value="6" />
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Tabs value={view} onValueChange={(v) => setView(v as 'markets' | 'history')}>
                <TabsList>
                  <TabsTrigger value="markets">Markets</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="mt-6">
                {view === 'markets' ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {MARKETS.map((m) => (
                      <MarketCard key={m.id} market={m} multiplier={2} onSelect={() => {}} />
                    ))}
                  </div>
                ) : (
                  <PredictionHistory predictions={PREDS} loading={false} onSelect={(p) => { setDetail(p); setOpen(true) }} />
                )}
              </div>
            </div>
            <div>
              <TradePanel
                market={MARKETS[0]}
                multiplier={2}
                points={8420}
                isLocked={false}
                unlockLevel={5}
                userLevel={9}
                onSubmit={async () => ({ success: true })}
              />
            </div>
          </div>
        </div>
      </div>
      <PredictionDetailDialog prediction={detail} multiplier={2} open={open} onOpenChange={setOpen} />
    </div>
  )
}
