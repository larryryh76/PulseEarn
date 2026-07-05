import { useEffect, useMemo, useState } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'
import { EconomyConfigEngine } from '../engines/system/EconomyConfigEngine'
import type { ReferralRecord } from '../types'

export interface ReferralSummary {
  total: number
  rewarded: number
  pending: number
  flagged: number
  pointsEarned: number
}

export interface UseReferralsResult {
  referrals: ReferralRecord[]
  loading: boolean
  error: string | null
  /** Points awarded per qualified referral, sourced from the economy config. */
  rewardAmount: number
  summary: ReferralSummary
}

const REWARDED_STATUSES = new Set(['REWARDED'])
const FLAGGED_STATUSES = new Set(['FLAGGED', 'REVERSED'])

/**
 * Live referral data for the current user. Owns the Firestore subscription and the
 * economy-config lookup so the Referrals surface stays a pure view. Sorting is done
 * client-side (newest first) to avoid requiring a composite Firestore index.
 */
export function useReferrals(): UseReferralsResult {
  const { currentUser } = useAuth()
  const [referrals, setReferrals] = useState<ReferralRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rewardAmount, setRewardAmount] = useState(50)

  useEffect(() => {
    let active = true
    EconomyConfigEngine.getConfig()
      .then((config) => {
        if (active) setRewardAmount(config.rewards.referralBonusPoints)
      })
      .catch(() => {
        /* fall back to the default reward amount */
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!currentUser) {
      setReferrals([])
      setLoading(false)
      return
    }

    setLoading(true)
    const q = query(collection(db, 'referrals'), where('referrerId', '==', currentUser.uid))

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ReferralRecord)
        data.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
        setReferrals(data)
        setError(null)
        setLoading(false)
      },
      (err: { code?: string; message?: string }) => {
        console.error('[useReferrals] sync failure:', err.message)
        setError(err.code === 'permission-denied' ? 'Access denied: referral data locked.' : 'Could not load referrals.')
        setLoading(false)
      },
    )

    return unsubscribe
  }, [currentUser])

  const summary = useMemo<ReferralSummary>(() => {
    const rewarded = referrals.filter((r) => REWARDED_STATUSES.has(r.status)).length
    const flagged = referrals.filter((r) => FLAGGED_STATUSES.has(r.status)).length
    const pending = referrals.length - rewarded - flagged
    return {
      total: referrals.length,
      rewarded,
      pending,
      flagged,
      pointsEarned: rewarded * rewardAmount,
    }
  }, [referrals, rewardAmount])

  return { referrals, loading, error, rewardAmount, summary }
}
