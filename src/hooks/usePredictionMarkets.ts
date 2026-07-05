import { useCallback, useEffect, useMemo, useState } from 'react'
import { useCryptoData, type CryptoMarketData } from './useCryptoData'
import { useAuth } from '../contexts/AuthContext'
import { useTasks } from './useTasks'
import { EconomyConfigEngine } from '../engines/system/EconomyConfigEngine'
import { PointTransactionEngine } from '../engines/points/PointTransactionEngine'
import { buildMarkets, type Market } from '../components/Predictions/helpers'

export interface PlaceResult {
  success: boolean
  error?: string
}

export interface UsePredictionMarketsResult {
  markets: Market[]
  marketLoading: boolean
  /** Live coin lookup by CoinGecko-style asset id. */
  getCoin: (assetId: string) => CryptoMarketData | undefined
  unlockLevel: number
  isLocked: boolean
  userLevel: number
  winMultiplier: number
  points: number
  placePrediction: (market: Market, direction: 'UP' | 'DOWN', stake: number) => Promise<PlaceResult>
}

/**
 * Owns all Predictions data + submission logic so the page and its child components
 * stay pure views. Combines the live crypto feed with prediction campaigns, resolves
 * the economy config (unlock level + reward multiplier), and brokers stake execution
 * through the server-side transaction engine.
 */
export function usePredictionMarkets(): UsePredictionMarketsResult {
  const { marketData = [], loading: marketLoading, getCoin } = useCryptoData()
  const { currentUser, userData } = useAuth()
  const { campaigns: contextCampaigns = [] } = useTasks()

  const [winMultiplier, setWinMultiplier] = useState(2.0)
  const [unlockLevel, setUnlockLevel] = useState(5)

  useEffect(() => {
    let active = true
    EconomyConfigEngine.getConfig()
      .then((config) => {
        if (!active) return
        setWinMultiplier(config?.rewards?.predictionWinMultiplier || 2.0)
        setUnlockLevel(config?.thresholds?.predictionUnlockLevel || 5)
      })
      .catch(() => {
        /* keep sensible defaults */
      })
    return () => {
      active = false
    }
  }, [])

  const markets = useMemo(
    () => buildMarkets(contextCampaigns, marketData),
    [contextCampaigns, marketData],
  )

  const userLevel = userData?.level || 1
  const isLocked = userLevel < unlockLevel
  const points = userData?.points || 0

  const placePrediction = useCallback<UsePredictionMarketsResult['placePrediction']>(
    async (market, direction, stake) => {
      if (!currentUser || !userData) return { success: false, error: 'You must be signed in.' }
      if (isLocked) return { success: false, error: `Predictions unlock at level ${unlockLevel}.` }
      if (points < stake) return { success: false, error: 'Insufficient points for this stake.' }

      const coin = getCoin(market.assetId)
      const entryPrice = coin?.current_price || market.price || 0
      const claimId = `${currentUser.uid}_${market.id}_${Date.now()}`

      try {
        const result = await PointTransactionEngine.executePrediction({
          userId: currentUser.uid,
          taskId: market.id,
          amount: stake,
          assetId: market.assetId,
          symbol: market.symbol,
          direction,
          entryPrice,
          claimId,
          rewardAmount: stake * winMultiplier,
        })
        if (!result.success) throw new Error(result.error)
        return { success: true }
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Submission failed.' }
      }
    },
    [currentUser, userData, isLocked, unlockLevel, points, getCoin, winMultiplier],
  )

  return {
    markets,
    marketLoading,
    getCoin,
    unlockLevel,
    isLocked,
    userLevel,
    winMultiplier,
    points,
    placePrediction,
  }
}
