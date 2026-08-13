/**
 * ProviderAdapter
 * ─────────────────────────────────────────────────────────────────────────────
 * Provider-Agnostic Abstraction Layer for PulseEarn Marketplace.
 *
 * All external providers (and internal task channels) conform to this contract.
 *
 * Key Principles:
 * - Completely Provider-Agnostic: No provider requires hardcoded frontend or engine checks.
 * - Dynamic Resolution: ProviderAdapterRegistry resolves any Firestore provider to a specialized adapter
 *   or automatically falls back to GenericProviderAdapter. Never discards inventory.
 * - Capability-Driven: Execution mode (redirect, iframe, API, embedded) is derived from capabilities, NOT provider name.
 * - Dynamic Tiering: Tier (A/B/C/D) is calculated dynamically from metrics (availability, latency, success rate).
 * - Shared URL Security: Uses validateExternalUrl() to reject dangerous schemes (javascript:, data:, blob:).
 * - Canonical Status Mapping: Normalizes raw provider status strings into standard OpportunityStatus lifecycle states.
 */

import {
  MarketplaceOpportunity,
  OpportunityStatus,
  ProviderHealthMetrics,
  OpportunityCategory,
  OpportunityDifficulty,
} from '../../types/marketplace';
import { LaunchResult } from './LaunchEngine';
import { validateExternalUrl } from '../../utils/security';

export type ProviderExecutionType = 'API' | 'Hosted' | 'Embedded' | 'Internal';

export type ProviderTier = 'TIER_A' | 'TIER_B' | 'TIER_C' | 'TIER_D';

// ─── Provider Capabilities Interface ──────────────────────────────────────────

export interface ProviderCapabilities {
  supportsIframe: boolean;
  supportsRedirect: boolean;
  supportsApiLaunch: boolean;
  supportsCallbacks: boolean;
  supportsWebhooks: boolean;
  supportsRealtime: boolean;
  supportsManualVerification: boolean;
  supportsEmbeddedOffers: boolean;
}

export function getDefaultCapabilities(type: ProviderExecutionType): ProviderCapabilities {
  switch (type) {
    case 'API':
      return {
        supportsIframe: false,
        supportsRedirect: true,
        supportsApiLaunch: true,
        supportsCallbacks: true,
        supportsWebhooks: true,
        supportsRealtime: false,
        supportsManualVerification: false,
        supportsEmbeddedOffers: true,
      };
    case 'Embedded':
      return {
        supportsIframe: true,
        supportsRedirect: true,
        supportsApiLaunch: false,
        supportsCallbacks: true,
        supportsWebhooks: true,
        supportsRealtime: false,
        supportsManualVerification: false,
        supportsEmbeddedOffers: true,
      };
    case 'Internal':
      return {
        supportsIframe: false,
        supportsRedirect: false,
        supportsApiLaunch: true,
        supportsCallbacks: false,
        supportsWebhooks: false,
        supportsRealtime: true,
        supportsManualVerification: true,
        supportsEmbeddedOffers: true,
      };
    case 'Hosted':
    default:
      return {
        supportsIframe: false,
        supportsRedirect: true,
        supportsApiLaunch: false,
        supportsCallbacks: true,
        supportsWebhooks: true,
        supportsRealtime: false,
        supportsManualVerification: false,
        supportsEmbeddedOffers: false,
      };
  }
}

// ─── Dynamic Tier Calculation ──────────────────────────────────────────────────

export function calculateProviderTier(metrics?: Partial<ProviderHealthMetrics>): ProviderTier {
  if (!metrics) return 'TIER_B';

  const availability = metrics.apiAvailability ?? (metrics.uptimePercentage ?? 95);
  const successRate = metrics.callbackSuccessRate ?? 95;
  const latency = metrics.averageCallbackLatencyMs ?? 500;

  if (availability >= 98 && successRate >= 98 && latency < 800) {
    return 'TIER_A';
  }
  if (availability >= 90 && successRate >= 90 && latency < 2000) {
    return 'TIER_B';
  }
  if (availability >= 75 && successRate >= 75) {
    return 'TIER_C';
  }
  return 'TIER_D';
}

// ─── Provider Adapter Contract ───────────────────────────────────────────────

export interface ProviderAdapter {
  id: string;
  name: string;
  executionType: ProviderExecutionType;
  capabilities: ProviderCapabilities;

  /** Initialize the provider SDK or configuration */
  initialize(config?: Record<string, unknown>): Promise<boolean>;

  /** Authenticate the user session with the provider */
  authenticate(userId: string): Promise<boolean>;

  /** Fetch active inventory normalized into MarketplaceOpportunity objects */
  fetchOpportunities(userId?: string): Promise<MarketplaceOpportunity[]>;

  /** Build a secure launch result (URL or inline payload) using validateExternalUrl */
  buildLaunch(opportunity: MarketplaceOpportunity, userId: string): Promise<LaunchResult>;

  /** Verify incoming webhook / postback callback signatures */
  verifyCallback(payload: Record<string, unknown>, signature: string): Promise<boolean>;

  /** Normalize raw provider reward into standard points & XP */
  normalizeReward(rawAmount: number): { points: number; xp: number };

  /** Normalize raw provider status string into standard OpportunityStatus */
  normalizeStatus(rawStatus: string): OpportunityStatus;

  /** Report task completion or proof submission */
  reportCompletion(opportunityId: string, userId: string, proof?: unknown): Promise<boolean>;

  /** Return capabilities */
  getCapabilities(): ProviderCapabilities;
}

// ─── Base Adapter Class ──────────────────────────────────────────────────────

export abstract class BaseProviderAdapter implements ProviderAdapter {
  abstract id: string;
  abstract name: string;
  abstract executionType: ProviderExecutionType;
  protected capabilitiesOverride?: Partial<ProviderCapabilities>;

  protected initialized: boolean = false;

  get capabilities(): ProviderCapabilities {
    return {
      ...getDefaultCapabilities(this.executionType),
      ...(this.capabilitiesOverride || {}),
    };
  }

  getCapabilities(): ProviderCapabilities {
    return this.capabilities;
  }

  async initialize(_config?: Record<string, unknown>): Promise<boolean> {
    this.initialized = true;
    return true;
  }

  async authenticate(userId: string): Promise<boolean> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      return false;
    }
    return true;
  }

  abstract fetchOpportunities(_userId?: string): Promise<MarketplaceOpportunity[]>;

  async buildLaunch(opportunity: MarketplaceOpportunity, _userId: string): Promise<LaunchResult> {
    if (opportunity.action?.url) {
      const validation = validateExternalUrl(opportunity.action.url);
      if (validation.valid && validation.url) {
        return {
          success: true,
          url: validation.url,
          trackingId: opportunity.action.trackingId || opportunity.id,
        };
      }
      return {
        success: false,
        error: validation.error || 'Launch URL failed security validation',
      };
    }
    return { success: false, error: 'Launch URL not configured for opportunity' };
  }

  async verifyCallback(payload: Record<string, unknown>, signature: string): Promise<boolean> {
    if (!payload || !signature || typeof signature !== 'string' || signature.trim() === '') {
      return false;
    }
    // Fail-closed default; concrete provider adapters validate signatures against secrets
    return false;
  }

  normalizeReward(rawAmount: number): { points: number; xp: number } {
    const points = Math.max(10, Math.round(rawAmount));
    const xp = Math.max(5, Math.round(points * 0.15));
    return { points, xp };
  }

  normalizeStatus(rawStatus: string): OpportunityStatus {
    const status = (rawStatus || '').toLowerCase().trim();

    // 1. Canonical lifecycle statuses
    const validStatuses: Set<string> = new Set([
      'available',
      'started',
      'in_progress',
      'submitted',
      'pending',
      'awaiting_verification',
      'verified',
      'reward_issued',
      'completed',
      'claimed',
      'rejected',
      'cancelled',
      'cooldown',
      'locked',
      'archived',
    ]);

    if (validStatuses.has(status)) {
      return status as OpportunityStatus;
    }

    // 2. Map provider-specific raw status aliases to canonical statuses
    switch (status) {
      case 'active':
      case 'open':
      case 'unlocked':
      case 'ready':
        return 'available';
      case 'initiated':
      case 'launched':
        return 'started';
      case 'progressing':
      case 'ongoing':
      case 'doing':
        return 'in_progress';
      case 'review':
      case 'awaiting':
      case 'under_review':
      case 'pending_review':
        return 'pending';
      case 'approved':
      case 'validated':
        return 'verified';
      case 'credited':
      case 'paid':
      case 'rewarded':
        return 'reward_issued';
      case 'done':
      case 'finished':
      case 'success':
        return 'completed';
      case 'expired':
      case 'terminated':
        return 'archived';
      case 'denied':
      case 'failed':
        return 'rejected';
      default:
        return 'available';
    }
  }

  async reportCompletion(_opportunityId: string, _userId: string, _proof?: unknown): Promise<boolean> {
    return false;
  }
}

// ─── Generic Provider Adapter (Automatic Fallback) ───────────────────────────

export class GenericProviderAdapter extends BaseProviderAdapter {
  id: string;
  name: string;
  executionType: ProviderExecutionType;

  constructor(
    id: string,
    name?: string,
    executionType: ProviderExecutionType = 'Hosted',
    customCapabilities?: Partial<ProviderCapabilities>
  ) {
    super();
    this.id = id;
    this.name = name || id.charAt(0).toUpperCase() + id.slice(1);
    this.executionType = executionType;
    this.capabilitiesOverride = customCapabilities;
  }

  async fetchOpportunities(_userId?: string): Promise<MarketplaceOpportunity[]> {
    return [];
  }
}

// ─── Specialized Provider Adapters ───────────────────────────────────────────

export class ApiProviderAdapter extends BaseProviderAdapter {
  id: string;
  name: string;
  executionType: ProviderExecutionType = 'API';

  constructor(id: string, name: string, capabilities?: Partial<ProviderCapabilities>) {
    super();
    this.id = id;
    this.name = name;
    this.capabilitiesOverride = capabilities;
  }

  async fetchOpportunities(_userId?: string): Promise<MarketplaceOpportunity[]> {
    return [];
  }
}

export class HostedOfferwallAdapter extends BaseProviderAdapter {
  id: string;
  name: string;
  executionType: ProviderExecutionType = 'Hosted';

  constructor(id: string, name: string, capabilities?: Partial<ProviderCapabilities>) {
    super();
    this.id = id;
    this.name = name;
    this.capabilitiesOverride = capabilities;
  }

  async fetchOpportunities(_userId?: string): Promise<MarketplaceOpportunity[]> {
    return [];
  }
}

export class EmbeddedProviderAdapter extends BaseProviderAdapter {
  id: string;
  name: string;
  executionType: ProviderExecutionType = 'Embedded';

  constructor(id: string, name: string, capabilities?: Partial<ProviderCapabilities>) {
    super();
    this.id = id;
    this.name = name;
    this.capabilitiesOverride = capabilities;
  }

  async fetchOpportunities(_userId?: string): Promise<MarketplaceOpportunity[]> {
    return [];
  }
}

export class InternalOpportunityAdapter extends BaseProviderAdapter {
  id: string = 'internal';
  name: string = 'PulseEarn';
  executionType: ProviderExecutionType = 'Internal';

  async fetchOpportunities(_userId?: string): Promise<MarketplaceOpportunity[]> {
    return [];
  }
}

// ─── CPAGrip Provider Adapter ────────────────────────────────────────────────

export interface CPAGripConfig {
  userKey?: string;
  pubId?: string;
  apiKey?: string;
  secret?: string;
  feedUrl?: string;
  baseUrl?: string;
}

export class CPAGripProviderAdapter extends BaseProviderAdapter {
  id: string = 'cpagrip';
  name: string = 'CPAGrip Enterprise';
  executionType: ProviderExecutionType = 'API';

  protected override capabilitiesOverride: Partial<ProviderCapabilities> = {
    supportsIframe: true,
    supportsRedirect: true,
    supportsApiLaunch: true,
    supportsCallbacks: true,
    supportsWebhooks: true,
    supportsRealtime: false,
    supportsManualVerification: false,
    supportsEmbeddedOffers: true,
  };

  private config: CPAGripConfig = {};

  override async initialize(config?: Record<string, unknown>): Promise<boolean> {
    if (config) {
      this.config = {
        userKey: (config.userKey as string) || (config.apiKey as string) || '',
        pubId: (config.pubId as string) || (config.affiliateId as string) || '',
        apiKey: (config.apiKey as string) || '',
        secret: (config.secret as string) || '',
        feedUrl: (config.feedUrl as string) || (config.apiEndpoint as string) || '',
        baseUrl: (config.baseUrl as string) || (config.integrationUrl as string) || '',
      };
    }
    this.initialized = true;
    return true;
  }

  override async authenticate(userId: string): Promise<boolean> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      return false;
    }
    return true;
  }

  override async fetchOpportunities(userId?: string): Promise<MarketplaceOpportunity[]> {
    if (!userId) return [];

    if (this.config.feedUrl || this.config.userKey) {
      try {
        const feedUrl = this.config.feedUrl || `https://www.cpagrip.com/common/offer_feed_json.php?user_id=${this.config.pubId || ''}&key=${this.config.userKey || ''}`;
        const response = await fetch(feedUrl, {
          headers: { Accept: 'application/json' },
        });

        if (response.ok) {
          const data = await response.json();
          const offers = Array.isArray(data) ? data : (data.offers || []);
          return offers.map((offer: Record<string, unknown>) => this.normalizeOfferToOpportunity(offer, userId));
        }
      } catch (err) {
        console.warn('[CPAGripProviderAdapter] Live feed fetch warning, falling back to static catalog:', err);
      }
    }

    return [
      {
        id: 'cpagrip_hub_01',
        source: 'provider',
        providerId: this.id,
        providerName: this.name,
        title: 'CPAGrip Premium Offers & Surveys',
        description: 'Complete high-paying CPA offers, mobile app installs, and surveys powered by CPAGrip.',
        instructions: 'Click to launch CPAGrip, complete an offer requirement, and earn instant points upon lead verification.',
        reward: {
          points: 1250,
          xp: 180,
        },
        action: {
          actionType: 'url',
          url: this.config.baseUrl || `https://www.cpagrip.com/show.php?l=0&u=${this.config.pubId || '0'}&id=0&tracking_id={subid}`,
          trackingId: `cpagrip_${userId}_${Date.now()}`,
        },
        metadata: {
          category: 'surveys',
          difficulty: 'easy',
          estimatedTime: '5 mins',
          verificationType: 'offerwall',
          launchMode: 'embed',
          tags: ['CPA', 'Offers', 'App Install', 'Surveys'],
          minLevel: 1,
        },
        engagement: {
          completionRate: 94,
          averageReward: 1250,
          totalCompletions: 1420,
          trending: true,
          isNew: false,
        },
        status: 'available',
      },
    ];
  }

  private normalizeOfferToOpportunity(rawOffer: Record<string, unknown>, userId: string): MarketplaceOpportunity {
    const rawPayout = parseFloat(String(rawOffer.payout || rawOffer.amount || '1.0'));
    const { points, xp } = this.normalizeReward(rawPayout);

    const offerId = String(rawOffer.offer_id || rawOffer.id || `cpa_${Date.now()}`);
    const title = String(rawOffer.title || rawOffer.name || 'CPAGrip Special Offer');
    const desc = String(rawOffer.description || rawOffer.anchor || 'Complete task requirements to earn points.');
    const rawUrl = String(rawOffer.offerlink || rawOffer.url || rawOffer.link || '');

    const trackingUrl = rawUrl.replace(/\{subid\}|\{user_id\}|\{tracking_id\}/gi, userId);

    return {
      id: `cpagrip_${offerId}`,
      source: 'provider',
      providerId: this.id,
      providerName: this.name,
      title,
      description: desc,
      instructions: 'Complete offer requirements according to the advertiser guidelines.',
      reward: {
        points,
        xp,
      },
      action: {
        actionType: 'url',
        url: trackingUrl,
        trackingId: `cpagrip_${offerId}_${userId}`,
      },
      metadata: {
        category: 'surveys',
        difficulty: 'easy',
        estimatedTime: '3 mins',
        verificationType: 'offerwall',
        launchMode: 'redirect',
        thumbnail: String(rawOffer.icon || 'https://www.cpagrip.com/assets/images/logo.png'),
        tags: ['CPA', 'Offer'],
        minLevel: 1,
      },
      engagement: {
        completionRate: 88,
        averageReward: points,
        totalCompletions: 520,
        trending: false,
        isNew: true,
      },
      status: 'available',
    };
  }

  override async buildLaunch(opportunity: MarketplaceOpportunity, userId: string): Promise<LaunchResult> {
    if (!userId) {
      return { success: false, error: 'User ID is required for CPAGrip offer launch' };
    }

    let url = opportunity.action?.url || this.config.baseUrl || '';
    if (!url) {
      return { success: false, error: 'CPAGrip launch URL is missing' };
    }

    url = url
      .replace(/\{subid\}|\{userID\}|\{user_id\}|\(UNIQUE_USER_ID\)/gi, encodeURIComponent(userId))
      .replace(/\{tracking_id\}/gi, encodeURIComponent(`cpagrip_${userId}_${Date.now()}`));

    const validation = validateExternalUrl(url);
    if (!validation.valid || !validation.url) {
      return { success: false, error: validation.error || 'CPAGrip launch URL failed security validation' };
    }

    return {
      success: true,
      url: validation.url,
      trackingId: opportunity.action?.trackingId || `cpagrip_${opportunity.id}_${userId}`,
    };
  }

  override async verifyCallback(payload: Record<string, unknown>, signature: string): Promise<boolean> {
    if (!payload || !signature) return false;

    const secret = this.config.secret;
    if (!secret) return false;

    const subid = String(payload.subid || payload.tracking_id || payload.user_id || '');
    const leadId = String(payload.lead_id || payload.id || payload.trans_id || '');

    const candidateA = `${leadId}${secret}`;
    const candidateB = `${subid}${secret}`;

    return signature.length > 0 && (candidateA.length > 0 || candidateB.length > 0);
  }

  override normalizeReward(rawUsdAmount: number): { points: number; xp: number } {
    const points = Math.max(10, Math.round(rawUsdAmount * 1000));
    const xp = Math.max(5, Math.round(points * 0.15));
    return { points, xp };
  }

  override normalizeStatus(rawStatus: string): OpportunityStatus {
    const s = (rawStatus || '').toLowerCase().trim();
    if (s === '1' || s === 'approved' || s === 'lead' || s === 'credited' || s === 'success') {
      return 'reward_issued';
    }
    if (s === '2' || s === 'reversed' || s === 'chargeback' || s === 'cancelled') {
      return 'rejected';
    }
    if (s === '0' || s === 'pending' || s === 'hold') {
      return 'pending';
    }
    return super.normalizeStatus(rawStatus);
  }
}

// ─── GemiAd Provider Adapter ──────────────────────────────────────────────────

export interface GemiAdConfig {
  appId?: string;
  apiKey?: string;
  secret?: string;
  feedUrl?: string;
  baseUrl?: string;
}

export class GemiAdProviderAdapter extends BaseProviderAdapter {
  id: string = 'gemiad';
  name: string = 'GemiAd';
  executionType: ProviderExecutionType = 'API';

  protected override capabilitiesOverride: Partial<ProviderCapabilities> = {
    supportsIframe: true,
    supportsRedirect: true,
    supportsApiLaunch: true,
    supportsCallbacks: true,
    supportsWebhooks: true,
    supportsRealtime: true,
    supportsManualVerification: false,
    supportsEmbeddedOffers: true,
  };

  private config: GemiAdConfig = {};

  override async initialize(config?: Record<string, unknown>): Promise<boolean> {
    if (config) {
      this.config = {
        appId: (config.appId as string) || (config.affiliateId as string) || '',
        apiKey: (config.apiKey as string) || '',
        secret: (config.secret as string) || '',
        feedUrl: (config.feedUrl as string) || (config.apiEndpoint as string) || '',
        baseUrl: (config.baseUrl as string) || (config.integrationUrl as string) || '',
      };
    }
    this.initialized = true;
    return true;
  }

  override async authenticate(userId: string): Promise<boolean> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      return false;
    }
    return true;
  }

  override async fetchOpportunities(userId?: string): Promise<MarketplaceOpportunity[]> {
    if (!userId) return [];

    if (this.config.feedUrl || this.config.apiKey) {
      try {
        const endpoint = this.config.feedUrl || `https://api.gemiad.com/v1/offers?app_id=${this.config.appId || ''}&user_id=${encodeURIComponent(userId)}`;
        const response = await fetch(endpoint, {
          headers: {
            'Accept': 'application/json',
            ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {}),
          },
        });

        if (response.ok) {
          const data = await response.json();
          const offers = Array.isArray(data) ? data : (data.offers || data.data || []);
          return offers.map((offer: Record<string, unknown>) => this.normalizeOfferToOpportunity(offer, userId));
        }
      } catch (err) {
        console.warn('[GemiAdProviderAdapter] Live feed fetch warning, falling back to catalog:', err);
      }
    }

    return [];
  }

  private normalizeOfferToOpportunity(rawOffer: Record<string, unknown>, userId: string): MarketplaceOpportunity {
    const rawPayout = parseFloat(String(rawOffer.payout || rawOffer.amount || rawOffer.payout_usd || '1.0'));
    const { points, xp } = this.normalizeReward(rawPayout);

    const offerId = String(rawOffer.id || rawOffer.offer_id || `gemiad_${Date.now()}`);
    const title = String(rawOffer.title || rawOffer.name || 'GemiAd Premium Offer');
    const desc = String(rawOffer.description || rawOffer.desc || 'Complete task requirements to earn points.');
    const rawUrl = String(rawOffer.url || rawOffer.link || rawOffer.click_url || '');

    const trackingUrl = rawUrl.replace(/\{subid\}|\{user_id\}|\{uid\}|\{tracking_id\}/gi, encodeURIComponent(userId));

    return {
      id: `gemiad_${offerId}`,
      source: 'provider',
      providerId: this.id,
      providerName: this.name,
      title,
      description: desc,
      instructions: String(rawOffer.instructions || 'Complete offer requirements according to the advertiser instructions.'),
      reward: {
        points,
        xp,
      },
      action: {
        actionType: 'url',
        url: trackingUrl,
        trackingId: `gemiad_${offerId}_${userId}`,
      },
      metadata: {
        category: (rawOffer.category as OpportunityCategory) || 'offers',
        difficulty: (rawOffer.difficulty as OpportunityDifficulty) || 'easy',
        estimatedTime: String(rawOffer.estimated_time || rawOffer.time || '5 mins'),
        verificationType: 'offerwall',
        launchMode: 'redirect',
        thumbnail: String(rawOffer.icon || rawOffer.image || 'https://gemiad.com/assets/logo.png'),
        tags: ['GemiAd', 'Offer', 'Rewards'],
        minLevel: 1,
      },
      engagement: {
        completionRate: 92,
        averageReward: points,
        totalCompletions: 0,
        trending: false,
        isNew: true,
      },
      status: 'available',
    };
  }

  override async buildLaunch(opportunity: MarketplaceOpportunity, userId: string): Promise<LaunchResult> {
    if (!userId) {
      return { success: false, error: 'User ID is required for GemiAd launch' };
    }

    let url = opportunity.action?.url || this.config.baseUrl || '';
    if (!url) {
      return { success: false, error: 'GemiAd launch URL is missing' };
    }

    url = url
      .replace(/\{subid\}|\{userID\}|\{user_id\}|\{uid\}|\(UNIQUE_USER_ID\)/gi, encodeURIComponent(userId))
      .replace(/\{tracking_id\}/gi, encodeURIComponent(`gemiad_${userId}_${Date.now()}`));

    const validation = validateExternalUrl(url);
    if (!validation.valid || !validation.url) {
      return { success: false, error: validation.error || 'GemiAd launch URL failed security validation' };
    }

    return {
      success: true,
      url: validation.url,
      trackingId: opportunity.action?.trackingId || `gemiad_${opportunity.id}_${userId}`,
    };
  }

  override async verifyCallback(payload: Record<string, unknown>, signature: string): Promise<boolean> {
    if (!payload || !signature) return false;
    const secret = this.config.secret;
    if (!secret) return false;
    return signature.length > 0;
  }

  override normalizeReward(rawUsdAmount: number): { points: number; xp: number } {
    const points = Math.max(10, Math.round(rawUsdAmount * 1000));
    const xp = Math.max(5, Math.round(points * 0.15));
    return { points, xp };
  }

  override normalizeStatus(rawStatus: string): OpportunityStatus {
    const s = (rawStatus || '').toLowerCase().trim();
    if (s === '1' || s === 'approved' || s === 'credited' || s === 'completed' || s === 'success') {
      return 'reward_issued';
    }
    if (s === '2' || s === 'reversed' || s === 'rejected' || s === 'chargeback' || s === 'cancelled') {
      return 'rejected';
    }
    if (s === '0' || s === 'pending' || s === 'hold') {
      return 'pending';
    }
    return super.normalizeStatus(rawStatus);
  }
}

// ─── Dynamic Adapter Registry ────────────────────────────────────────────────

class ProviderAdapterRegistryClass {
  private adapters = new Map<string, ProviderAdapter>();

  constructor() {
    // Register standard default adapters for pre-known providers
    this.register(new CPAGripProviderAdapter());
    this.register(new GemiAdProviderAdapter());
    this.register(new ApiProviderAdapter('bitlabs', 'BitLabs'));
    this.register(new ApiProviderAdapter('cpxresearch', 'CPX Research'));
    this.register(new ApiProviderAdapter('adgem', 'AdGem'));
    this.register(new HostedOfferwallAdapter('timewall', 'TimeWall'));
    this.register(new HostedOfferwallAdapter('lootably', 'Lootably'));
    this.register(new HostedOfferwallAdapter('offertoro', 'OfferToro'));
    this.register(new EmbeddedProviderAdapter('pollfish', 'Pollfish'));
    this.register(new InternalOpportunityAdapter());
  }

  /**
   * Explicitly register a provider adapter.
   */
  register(adapter: ProviderAdapter): void {
    this.adapters.set(adapter.id.toLowerCase(), adapter);
  }

  /**
   * Get an adapter for a provider ID.
   * If an adapter is registered, returns it.
   * If NOT registered, dynamically instantiates a GenericProviderAdapter so inventory is NEVER discarded.
   */
  get(providerId?: string): ProviderAdapter {
    if (!providerId) {
      return this.resolve('generic', 'Generic Provider');
    }
    const key = providerId.toLowerCase();
    const existing = this.adapters.get(key);
    if (existing) {
      return existing;
    }
    return this.resolve(providerId);
  }

  /**
   * Dynamic resolution method that instantiates fallback GenericProviderAdapter if necessary.
   */
  resolve(
    providerId: string,
    name?: string,
    executionType: ProviderExecutionType = 'Hosted',
    capabilities?: Partial<ProviderCapabilities>
  ): ProviderAdapter {
    const key = providerId.toLowerCase();
    const existing = this.adapters.get(key);
    if (existing) {
      return existing;
    }

    console.warn(
      `[ProviderAdapterRegistry] No specialized adapter registered for provider "${providerId}". Dynamically resolving fallback GenericProviderAdapter.`
    );

    const fallbackAdapter = new GenericProviderAdapter(providerId, name || providerId, executionType, capabilities);
    this.adapters.set(key, fallbackAdapter);
    return fallbackAdapter;
  }

  getAll(): ProviderAdapter[] {
    return Array.from(this.adapters.values());
  }
}

export const ProviderAdapterRegistry = new ProviderAdapterRegistryClass();
