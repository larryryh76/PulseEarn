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

import { MarketplaceOpportunity, OpportunityStatus, ProviderHealthMetrics } from '../../types/marketplace';
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

// ─── Provider Adapter with Tiering Metadata ──────────────────────────────────

export interface ProviderAdapterWithTier extends ProviderAdapter {
  tier?: ProviderTier;
  healthMetrics?: Partial<ProviderHealthMetrics>;
}

// ─── Dynamic Adapter Registry ────────────────────────────────────────────────

class ProviderAdapterRegistryClass {
  private adapters = new Map<string, ProviderAdapter>();
  private tiers = new Map<string, ProviderTier>();
  private healthMetrics = new Map<string, Partial<ProviderHealthMetrics>>();

  constructor() {
    // Register standard default adapters for pre-known providers
    this.register(new ApiProviderAdapter('bitlabs', 'BitLabs'));
    this.register(new ApiProviderAdapter('cpxresearch', 'CPX Research'));
    this.register(new ApiProviderAdapter('adgem', 'AdGem'));
    this.register(new ApiProviderAdapter('cpagrip', 'CPAGrip'));
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
    // Initialize with default tier
    this.tiers.set(adapter.id.toLowerCase(), 'TIER_B');
  }

  /**
   * Update provider health metrics and recalculate tier dynamically.
   * Called when provider inventory is synchronized or health data arrives.
   * Merges incoming metrics with existing data to preserve known fields.
   */
  updateHealthMetrics(providerId: string, metrics: Partial<ProviderHealthMetrics>): void {
    const key = providerId.toLowerCase();
    // Merge new metrics with existing ones to avoid data loss on partial updates
    const existing = this.healthMetrics.get(key) || {};
    const merged = { ...existing, ...metrics };
    this.healthMetrics.set(key, merged);
    
    // Recalculate tier based on complete merged metrics
    const newTier = calculateProviderTier(merged);
    this.tiers.set(key, newTier);
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
   * Get the currently calculated tier for a provider.
   * Returns TIER_B by default if tier hasn't been explicitly set.
   */
  getTier(providerId: string): ProviderTier {
    const key = providerId.toLowerCase();
    return this.tiers.get(key) || 'TIER_B';
  }

  /**
   * Get the health metrics for a provider.
   */
  getHealthMetrics(providerId: string): Partial<ProviderHealthMetrics> | undefined {
    const key = providerId.toLowerCase();
    return this.healthMetrics.get(key);
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
    // Initialize with default tier
    this.tiers.set(key, 'TIER_B');
    return fallbackAdapter;
  }

  getAll(): ProviderAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Get all providers with their tiers and health metrics.
   * Used for operational dashboards and health reporting.
   */
  getAllWithMetrics(): Array<{ adapter: ProviderAdapter; tier: ProviderTier; health?: Partial<ProviderHealthMetrics> }> {
    return this.getAll().map(adapter => ({
      adapter,
      tier: this.getTier(adapter.id),
      health: this.getHealthMetrics(adapter.id),
    }));
  }
}

export const ProviderAdapterRegistry = new ProviderAdapterRegistryClass();
