/**
 * OfferwallProviderEngine
 * ─────────────────────────────────────────────────────────────────────────────
 * Provider-agnostic offerwall integration engine.
 *
 * Architecture:
 * - PROVIDER_REGISTRY: static config map — add a new provider here, zero code changes elsewhere
 * - ProviderAdapter: each provider defines how to extract params and verify its signature
 * - OfferwallProviderEngine: orchestrates callback ingestion, validation, dedup, and reward posting
 *
 * Callback pipeline:
 *   Receive → Extract Params → Verify Signature → Dedup Check → Fraud Gate → Point Engine → Audit
 */

import crypto from 'crypto';
import { OfferwallProviderSlug } from '../../types';

// ─── Provider Param Map ───────────────────────────────────────────────────────
// Describes how to extract canonical fields from each provider's callback payload.
// Every provider sends different param names — this config normalizes them.

export interface ProviderParamMap {
  /** Query/body param name that contains the PulseEarn user ID */
  userIdParam: string;
  /** Param name for the provider's unique transaction/offer ID */
  transactionIdParam: string;
  /** Param name for the offer/survey ID */
  offerIdParam: string;
  /** Param name for the offer name/title (optional) */
  offerNameParam?: string;
  /** Param name for the reward amount (in provider currency) */
  amountParam: string;
  /** Param name for the provider's user/publisher identifier */
  providerUserIdParam?: string;
  /** Param name for the signature / hash */
  signatureParam: string;
  /** How the signature is constructed */
  signatureMethod: 'md5' | 'sha1' | 'sha256' | 'hmac_sha256' | 'query_string_md5' | 'custom';
  /** Fields included in signature computation (in order) */
  signatureFields?: string[];
  /** Whether the callback comes via GET or POST */
  method: 'GET' | 'POST' | 'EITHER';
  /** Expected success response text */
  successResponse: string;
}

export const PROVIDER_REGISTRY: Record<string, ProviderParamMap> = {
  lootably: {
    userIdParam: 'userID',
    transactionIdParam: 'transactionID',
    offerIdParam: 'offerID',
    offerNameParam: 'offerName',
    amountParam: 'currencyReward',
    providerUserIdParam: 'userID',
    signatureParam: 'hash',
    signatureMethod: 'sha256',
    signatureFields: ['userID', 'ip', 'revenue', 'currencyReward', 'secret'],
    method: 'GET',
    successResponse: '1',
  },
  bitlabs: {
    userIdParam: 'uid',
    transactionIdParam: 'tx',
    offerIdParam: 'survey_id',
    offerNameParam: 'survey_name',
    amountParam: 'val',
    signatureParam: 'hash',
    signatureMethod: 'sha256',
    signatureFields: ['uid', 'survey_id', 'val', 'secret'],
    method: 'GET',
    successResponse: 'OK',
  },
  cpxresearch: {
    userIdParam: 'user_id',
    transactionIdParam: 'trans_id',
    offerIdParam: 'survey_id',
    offerNameParam: undefined,
    amountParam: 'amount_local',
    providerUserIdParam: 'user_id',
    signatureParam: 'hash',
    signatureMethod: 'md5',
    signatureFields: ['trans_id', 'secret'],
    method: 'GET',
    successResponse: '1',
  },
  adgem: {
    userIdParam: 'player_id',
    transactionIdParam: 'transaction_id',
    offerIdParam: 'campaign_id',
    offerNameParam: 'offer_name',
    amountParam: 'amount',
    signatureParam: 'verifier',
    signatureMethod: 'hmac_sha256',
    signatureFields: ['player_id', 'transaction_id', 'amount', 'secret'],
    method: 'GET',
    successResponse: 'OK',
  },
  offertoro: {
    userIdParam: 'user_id',
    transactionIdParam: 'id',
    offerIdParam: 'oid',
    offerNameParam: 'offer_name',
    amountParam: 'amount',
    signatureParam: 'sig',
    signatureMethod: 'md5',
    signatureFields: ['oid', 'user_id', 'amount', 'secret'],
    method: 'GET',
    successResponse: '1',
  },
  timewall: {
    userIdParam: 'userID',
    transactionIdParam: 'transactionID',
    offerIdParam: 'offerdetail',
    offerNameParam: 'offername',
    amountParam: 'currencyAmount',
    signatureParam: 'hash',
    signatureMethod: 'sha256',
    signatureFields: ['userID', 'revenue', 'secret'],
    method: 'GET',
    successResponse: 'OK',
  },
  cpagrip: {
    userIdParam: 'subid',
    transactionIdParam: 'lead_id',
    offerIdParam: 'campaign_id',
    offerNameParam: 'title',
    amountParam: 'payout',
    signatureParam: 'sig',
    signatureMethod: 'md5',
    signatureFields: ['lead_id', 'secret'],
    method: 'GET',
    successResponse: '1',
  },
  gemiad: {
    userIdParam: 'user_id',
    transactionIdParam: 'tx_id',
    offerIdParam: 'offer_id',
    offerNameParam: 'offer_name',
    amountParam: 'payout',
    signatureParam: 'signature',
    signatureMethod: 'sha256',
    signatureFields: ['tx_id', 'secret'],
    method: 'GET',
    successResponse: 'OK',
  },
};

// ─── Extracted Callback Data ──────────────────────────────────────────────────

export interface ExtractedCallbackData {
  userId: string;
  transactionId: string;
  offerId: string;
  offerName: string;
  rawAmount: number;
  providerUserId: string;
  signature: string;
  rawParams: Record<string, string>;
}

// ─── Signature Verifiers ──────────────────────────────────────────────────────

function buildSignatureString(
  fields: string[],
  params: Record<string, string>,
  secret: string
): string {
  return fields.map(f => f === 'secret' ? secret : (params[f] ?? '')).join('');
}

export function verifySignature(
  method: ProviderParamMap['signatureMethod'],
  fields: string[],
  params: Record<string, string>,
  secret: string,
  receivedSig: string,
): boolean {
  try {
    switch (method) {
      case 'md5': {
        const raw = buildSignatureString(fields, params, secret);
        const hash = crypto.createHash('md5').update(raw).digest('hex');
        return hash === receivedSig;
      }
      case 'sha1': {
        const raw = buildSignatureString(fields, params, secret);
        const hash = crypto.createHash('sha1').update(raw).digest('hex');
        return hash === receivedSig;
      }
      case 'sha256': {
        const raw = buildSignatureString(fields, params, secret);
        const hash = crypto.createHash('sha256').update(raw).digest('hex');
        return hash === receivedSig;
      }
      case 'hmac_sha256': {
        // HMAC: secret as key, all non-secret fields joined
        const message = fields.filter(f => f !== 'secret').map(f => params[f] ?? '').join('');
        const hash = crypto.createHmac('sha256', secret).update(message).digest('hex');
        return hash === receivedSig;
      }
      case 'query_string_md5': {
        // Some providers hash the full sorted query string
        const sortedStr = Object.keys(params).sort()
          .map(k => `${k}=${params[k]}`)
          .join('&') + secret;
        const hash = crypto.createHash('md5').update(sortedStr).digest('hex');
        return hash === receivedSig;
      }
      default:
        // Unknown method — fail safe
        return false;
    }
  } catch {
    return false;
  }
}

// ─── Param Extractor ──────────────────────────────────────────────────────────

export function extractCallbackData(
  providerSlug: OfferwallProviderSlug,
  params: Record<string, string>
): ExtractedCallbackData | null {
  const map = PROVIDER_REGISTRY[providerSlug];
  if (!map) return null;

  const userId = params[map.userIdParam] ?? '';
  const transactionId = params[map.transactionIdParam] ?? '';
  const offerId = params[map.offerIdParam] ?? '';
  const offerName = map.offerNameParam ? (params[map.offerNameParam] ?? '') : `Offer ${offerId}`;
  const rawAmountStr = params[map.amountParam] ?? '0';
  const rawAmount = parseFloat(rawAmountStr) || 0;
  const providerUserId = map.providerUserIdParam ? (params[map.providerUserIdParam] ?? '') : '';
  const signature = params[map.signatureParam] ?? '';

  if (!userId || !transactionId) return null;

  return { userId, transactionId, offerId, offerName, rawAmount, providerUserId, signature, rawParams: params };
}

// ─── Points Calculator ────────────────────────────────────────────────────────

export interface PointsCalculation {
  totalPoints: number;   // After multiplier
  userPoints: number;    // userShare * totalPoints
  platformPoints: number;
}

export function calculatePoints(
  rawAmount: number,
  multiplier: number,
  userSharePct: number,
  platformSharePct: number,
  minReward: number,
  maxReward: number
): PointsCalculation {
  const total = Math.round(rawAmount * multiplier);
  const clamped = Math.min(Math.max(total, minReward), maxReward);
  const userPoints = Math.round(clamped * userSharePct);
  const platformPoints = Math.round(clamped * platformSharePct);
  return { totalPoints: clamped, userPoints, platformPoints };
}

// ─── Duplicate ID Builder ─────────────────────────────────────────────────────
// Canonical dedup key: providerId + transactionId — immutable for the lifecycle of a callback

export function buildDedupKey(providerId: string, transactionId: string): string {
  return `${providerId}:${transactionId}`;
}
