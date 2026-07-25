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
  initialize(config?: Record<string, any>): Promise<boolean>;

  /** Authenticate the user session with the provider */
  authenticate(userId: string): Promise<boolean>;

  /** Fetch active inventory normalized into MarketplaceOpportunity objects */
  fetchOpportunities(userId?: string): Promise<MarketplaceOpportunity[]>;

  /** Build a secure launch result (URL or inline payload) */
  buildLaunch(opportunity: MarketplaceOpportunity, userId: string): Promise<LaunchResult>;

  /** Verify incoming webhook / postback callback signatures */
  verifyCallback(payload: Record<string, any>, signature: string): Promise<boolean>;

  /** Normalize raw provider reward into standard points & XP */
  normalizeReward(rawAmount: number): { points: number; xp: number };

  /** Normalize raw provider status string into standard OpportunityStatus */
  normalizeStatus(rawStatus: string): OpportunityStatus;

  /** Report task completion or proof submission */
  reportCompletion(opportunityId: string, userId: string, proof?: any): Promise<boolean>;
}

// ─── Base Adapter Class ──────────────────────────────────────────────────────

export abstract class BaseProviderAdapter implements ProviderAdapter {
  abstract id: string;
  abstract name: string;
  abstract executionType: ProviderExecutionType;

  protected initialized: boolean = false;

  async initialize(_config?: Record<string, any>): Promise<boolean> {
    this.initialized = true;
    return true;
  }

  async authenticate(userId: string): Promise<boolean> {
    return Boolean(userId);
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

  async verifyCallback(payload: Record<string, any>, signature: string): Promise<boolean> {
    return Boolean(payload && signature);
  }

  normalizeReward(rawAmount: number): { points: number; xp: number } {
    const points = Math.max(10, Math.round(rawAmount));
    const xp = Math.max(5, Math.round(points * 0.15));
    return { points, xp };
  }

  normalizeStatus(rawStatus: string): OpportunityStatus {
    const status = (rawStatus || '').toLowerCase();
    switch (status) {
      case 'available':
      case 'active':
      case 'open':
        return 'available';
      case 'started':
      case 'initiated':
        return 'started';
      case 'in_progress':
      case 'progressing':
        return 'in_progress';
      case 'pending':
      case 'review':
      case 'awaiting':
        return 'pending';
      case 'verified':
      case 'approved':
        return 'verified';
      case 'reward_issued':
      case 'credited':
      case 'paid':
        return 'reward_issued';
      case 'completed':
      case 'claimed':
        return 'completed';
      case 'archived':
      case 'expired':
        return 'archived';
      default:
        return 'available';
    }
  }

  async reportCompletion(_opportunityId: string, _userId: string, _proof?: any): Promise<boolean> {
    return true;
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
    return this.adapters.get(providerId) || this.adapters.get('internal');
  }

  getAll(): ProviderAdapter[] {
    return Array.from(this.adapters.values());
  }
}

export const ProviderAdapterRegistry = new ProviderAdapterRegistryClass();
