import type { Campaign, PredictionRecord } from '../../types'
import type { CryptoMarketData } from '../../hooks/useCryptoData'

export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'muted'

export const toneChip: Record<Tone, string> = {
  primary: 'bg-primary/10 border-primary/20 text-primary',
  success: 'bg-success/10 border-success/20 text-success',
  warning: 'bg-warning/10 border-warning/20 text-warning',
  danger: 'bg-danger/10 border-danger/20 text-danger',
  muted: 'bg-muted border-border text-muted-foreground',
}

/** A tradable market, unified from prediction campaigns and live global assets. */
export interface Market {
  id: string
  assetId: string
  symbol: string
  name: string
  question: string
  isCampaign: boolean
  image: string
  price: number
  change: number
}

/**
 * Build the unified market list. Prediction campaigns are prioritised over the
 * generic global feed, and duplicate assets are removed so each coin appears once.
 */
export function buildMarkets(campaigns: Campaign[], marketData: CryptoMarketData[]): Market[] {
  if (!Array.isArray(marketData)) return []

  const campaignMarkets: Market[] = (campaigns || [])
    .filter((c) => c?.category === 'PREDICTION' && (c as { predictionAsset?: string }).predictionAsset)
    .map((c) => {
      const asset = (c as { predictionAsset?: string }).predictionAsset || 'bitcoin'
      const coin = marketData.find((cd) => cd.id === asset)
      return {
        id: c.id,
        assetId: asset,
        symbol: (c as { predictionSymbol?: string }).predictionSymbol || 'BTC',
        name: c.name,
        question: c.predictionQuestion || c.description,
        isCampaign: true,
        image: coin?.image || '',
        price: coin?.current_price || 0,
        change: coin?.price_change_percentage_24h || 0,
      }
    })

  const globalMarkets: Market[] = marketData.slice(0, 15).map((coin) => ({
    id: `global_${coin.id}`,
    assetId: coin.id,
    symbol: coin.symbol.toUpperCase(),
    name: coin.name,
    question: `Will ${coin.name} rise over the next 24 hours?`,
    isCampaign: false,
    image: coin.image,
    price: coin.current_price,
    change: coin.price_change_percentage_24h,
  }))

  const seen = new Set<string>()
  return [...campaignMarkets, ...globalMarkets].filter((m) => {
    if (seen.has(m.assetId)) return false
    seen.add(m.assetId)
    return true
  })
}

export type OutcomeGroup = 'active' | 'resolved'

export interface OutcomeMeta {
  label: string
  tone: Tone
  group: OutcomeGroup
  won: boolean
}

/** Map a prediction record to its display outcome (label, tone, win/loss). */
export function predictionOutcome(pred: PredictionRecord): OutcomeMeta {
  if (pred.status === 'ACTIVE') {
    return { label: 'Active', tone: 'primary', group: 'active', won: false }
  }
  if (pred.status === 'RESOLVED') {
    const won = (pred.rewardAmount || 0) > 0
    return won
      ? { label: 'Won', tone: 'success', group: 'resolved', won: true }
      : { label: 'Lost', tone: 'muted', group: 'resolved', won: false }
  }
  const labels: Record<string, string> = {
    CANCELED: 'Canceled',
    DISPUTED: 'Disputed',
    FAILED_SETTLEMENT: 'Settlement issue',
  }
  return { label: labels[pred.status] || 'Closed', tone: 'warning', group: 'resolved', won: false }
}

/** Filter tabs for the forecast ledger. */
export const HISTORY_FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'RESOLVED', label: 'Resolved' },
] as const

export type HistoryFilter = (typeof HISTORY_FILTERS)[number]['value']

/** Preset stake amounts offered in the trade panel. */
export const STAKE_OPTIONS = [10, 50, 100, 500, 1000] as const

export function formatPrice(value: number): string {
  if (!value) return '$0.00'
  const digits = value < 1 ? 4 : 2
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
}

export function formatChange(change?: number): string {
  const v = change || 0
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}%`
}

export function formatDateTime(ts?: { toDate?: () => Date }): string {
  const date = ts?.toDate?.()
  if (!date) return 'Pending'
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function formatDate(ts?: { toDate?: () => Date }): string {
  const date = ts?.toDate?.()
  if (!date) return 'Pending'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
