/**
 * ProviderAdapter
 * ─────────────────────────────────────────────────────────────────────────────
 * Standard provider contract for PulseEarn Marketplace.
 * Abstracts provider-specific execution logic across:
 * - Type A: API Providers (BitLabs, CPX Research, AdGem)
 * - Type B: Hosted Offerwalls (TimeWall, Lootably, OfferToro)
 * - Type C: Embedded Providers (Pollfish, PeanutLabs)
 * - Type D: Internal Opportunities (Daily Rewards, Referrals, Community, Education, Predictions)
 */

import { MarketplaceOpportunity, OpportunityStatus } from '../../types/marketplace';
import { LaunchResult } from './LaunchEngine';

export type ProviderExecutionType = 'API' | 'Hosted' | 'Embedded' | 'Internal';

export interface ProviderAdapter {
  id: string;
  name: string;
  executionType: ProviderExecutionType;

  /** Initialize the provider SDK or configuration */
  initialize(config?: Record<string, unknown>): Promise<boolean>;

  /** Authenticate the user session with the provider */
  authenticate(userId: string): Promise<boolean>;

  /** Fetch active inventory normalized into MarketplaceOpportunity objects */
  fetchOpportunities(userId?: string): Promise<MarketplaceOpportunity[]>;

  /** Build a secure launch result (URL or inline payload) */
  buildLaunch(opportunity: MarketplaceOpportunity, userId: string): Promise<LaunchResult>;

  /** Verify incoming webhook / postback callback signatures */
  verifyCallback(payload: Record<string, unknown>, signature: string): Promise<boolean>;

  /** Normalize raw provider reward into standard points & XP */
  normalizeReward(rawAmount: number): { points: number; xp: number };

  /** Normalize raw provider status string into standard OpportunityStatus */
  normalizeStatus(rawStatus: string): OpportunityStatus;

  /** Report task completion or proof submission */
  reportCompletion(opportunityId: string, userId: string, proof?: unknown): Promise<boolean>;
}

// ─── Base Adapter Class ──────────────────────────────────────────────────────

export abstract class BaseProviderAdapter implements ProviderAdapter {
  abstract id: string;
  abstract name: string;
  abstract executionType: ProviderExecutionType;

  protected initialized: boolean = false;

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
      return {
        success: true,
        url: opportunity.action.url,
        trackingId: opportunity.action.trackingId || opportunity.id,
      };
    }
    return { success: false, error: 'Launch URL not configured for opportunity' };
  }

  async verifyCallback(payload: Record<string, unknown>, signature: string): Promise<boolean> {
    if (!payload || !signature || typeof signature !== 'string' || signature.trim() === '') {
      return false;
    }
    // Fail-closed default; concrete provider adapters must validate signatures against credentials
    return false;
  }

  normalizeReward(rawAmount: number): { points: number; xp: number } {
    const points = Math.max(10, Math.round(rawAmount));
    const xp = Math.max(5, Math.round(points * 0.15));
    return { points, xp };
  }

  normalizeStatus(rawStatus: string): OpportunityStatus {
    const status = (rawStatus || '').toLowerCase().trim();

    // 1. Preserve canonical lifecycle statuses directly
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

    // 2. Map provider-specific raw status aliases
    switch (status) {
      case 'active':
      case 'open':
      case 'unlocked':
        return 'available';
      case 'initiated':
        return 'started';
      case 'progressing':
      case 'ongoing':
        return 'in_progress';
      case 'review':
      case 'awaiting':
      case 'under_review':
        return 'pending';
      case 'approved':
        return 'verified';
      case 'credited':
      case 'paid':
        return 'reward_issued';
      case 'expired':
        return 'archived';
      default:
        return 'available';
    }
  }

  async reportCompletion(_opportunityId: string, _userId: string, _proof?: unknown): Promise<boolean> {
    // Fail-closed default; must be implemented by concrete adapters requiring verification
    return false;
  }
}

// ─── Type A: API Provider Adapter ──────────────────────────────────────────────

export class ApiProviderAdapter extends BaseProviderAdapter {
  id: string;
  name: string;
  executionType: ProviderExecutionType = 'API';

  constructor(id: string, name: string) {
    super();
    this.id = id;
    this.name = name;
  }

  async fetchOpportunities(_userId?: string): Promise<MarketplaceOpportunity[]> {
    return [];
  }
}

// ─── Type B: Hosted Offerwall Adapter ──────────────────────────────────────────

export class HostedOfferwallAdapter extends BaseProviderAdapter {
  id: string;
  name: string;
  executionType: ProviderExecutionType = 'Hosted';

  constructor(id: string, name: string) {
    super();
    this.id = id;
    this.name = name;
  }

  async fetchOpportunities(_userId?: string): Promise<MarketplaceOpportunity[]> {
    return [];
  }
}

// ─── Type C: Embedded Provider Adapter ────────────────────────────────────────

export class EmbeddedProviderAdapter extends BaseProviderAdapter {
  id: string;
  name: string;
  executionType: ProviderExecutionType = 'Embedded';

  constructor(id: string, name: string) {
    super();
    this.id = id;
    this.name = name;
  }

  async fetchOpportunities(_userId?: string): Promise<MarketplaceOpportunity[]> {
    return [];
  }
}

// ─── Type D: Internal Opportunity Adapter ─────────────────────────────────────

export class InternalOpportunityAdapter extends BaseProviderAdapter {
  id: string = 'internal';
  name: string = 'PulseEarn';
  executionType: ProviderExecutionType = 'Internal';

  async fetchOpportunities(_userId?: string): Promise<MarketplaceOpportunity[]> {
    return [];
  }
}

// ─── Adapter Registry ─────────────────────────────────────────────────────────

class ProviderAdapterRegistryClass {
  private adapters = new Map<string, ProviderAdapter>();

  constructor() {
    // Register standard adapters
    this.register(new ApiProviderAdapter('bitlabs', 'BitLabs'));
    this.register(new ApiProviderAdapter('cpxresearch', 'CPX Research'));
    this.register(new ApiProviderAdapter('adgem', 'AdGem'));
    this.register(new HostedOfferwallAdapter('timewall', 'TimeWall'));
    this.register(new HostedOfferwallAdapter('lootably', 'Lootably'));
    this.register(new HostedOfferwallAdapter('offertoro', 'OfferToro'));
    this.register(new EmbeddedProviderAdapter('pollfish', 'Pollfish'));
    this.register(new InternalOpportunityAdapter());
  }

  register(adapter: ProviderAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  get(providerId: string): ProviderAdapter | undefined {
    return this.adapters.get(providerId);
  }

  getAll(): ProviderAdapter[] {
    return Array.from(this.adapters.values());
  }
}

export const ProviderAdapterRegistry = new ProviderAdapterRegistryClass();
