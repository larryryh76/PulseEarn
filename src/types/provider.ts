/**
 * PulseEarn Provider Metadata & Capabilities
 * 
 * PHASE 15.5: Provider Orchestration Rebuild
 * 
 * All provider behavior is determined by metadata, NOT hardcoded logic.
 * No if/switch statements on provider names.
 * No predefined tiers.
 * All capabilities are self-described.
 */

// ─── Verification Types ────────────────────────────────────────────────────────

export type VerificationType = 
  | 'instant'
  | 'callback'
  | 'manual'
  | 'screenshot'
  | 'timer'
  | 'wallet_activity'
  | 'api'
  | 'admin_approval';

// ─── Provider Capabilities ────────────────────────────────────────────────────

export interface ProviderCapabilities {
  // Inventory Source: Where does this provider get opportunities?
  inventorySource: 'api' | 'webhook' | 'manual' | 'hybrid';
  
  // Verification Methods: What verification types does this provider support?
  verificationMethods: VerificationType[];
  
  // Launch Experience: How does the user access opportunities?
  launchExperience: 'native' | 'embedded' | 'external' | 'hybrid';
  
  // Integration Methods: How does this provider integrate?
  supportsInventoryAPI: boolean;      // Can we pull inventory via API?
  supportsCallback: boolean;          // Does provider call us on completion?
  supportsWebhook: boolean;           // Does provider send webhooks?
  supportsNativeCampaigns: boolean;   // Does provider have native campaigns?
  supportsManualCampaigns: boolean;   // Can we manually create campaigns?
  supportsEmbeddedExperience: boolean; // Can we embed the experience?
  supportsExternalLaunch: boolean;    // Can we redirect to external link?
  
  // Sync Configuration
  syncMode: 'realtime' | 'scheduled' | 'manual' | 'hybrid';
  syncIntervalMs?: number;            // For scheduled sync
  
  // Health Status (live, updated by sync engine)
  healthStatus: 'healthy' | 'degraded' | 'offline' | 'maintenance';
  
  // Inventory Metrics (updated on each sync)
  inventoryCount: number;
  campaignCount: number;
  opportunityCount: number;
  lastSyncAt: Date;
  
  // Capability Score: Computed from supported features (0-100)
  // Used for smart ordering, not hardcoded tiers
  capabilityScore: number;
}

// ─── Provider Provider Metadata ────────────────────────────────────────────────

export interface ProviderConfiguration {
  apiEndpoint?: string;
  webhookUrl?: string;
  callbackUrl?: string;
  apiKey?: string;
  authToken?: string;
  identity?: Record<string, { fieldName: string; value: string; required: boolean }>;
  rewardMultiplier?: number;
  userSharePct?: number;
  platformSharePct?: number;
  minimumReward?: number;
  maximumReward?: number;
  customHeaders?: Record<string, string>;
  customParams?: Record<string, string>;
}

export interface ProviderMetadata {
  // Identity
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'maintenance' | 'disabled';
  
  // Capabilities: Defines ALL provider behavior
  capabilities: ProviderCapabilities;
  
  // Configuration: How to connect to this provider
  configuration: ProviderConfiguration;
  
  // Metadata: Descriptive info
  metadata: {
    description?: string;
    logo?: string;
    website?: string;
    region?: string;
    priority?: number;           // Higher = shown first in recommendations
    tags?: string[];
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastUpdated: Date;
}

// ─── Provider Classification (Derived from Capabilities) ──────────────────────

export interface InventorySourceProfile {
  type: 'api' | 'webhook' | 'manual' | 'hybrid';
  description: string;
}

export interface VerificationProfile {
  supportsInstant: boolean;
  supportsCallback: boolean;
  supportsManual: boolean;
  supportsScreenshot: boolean;
  supportsWalletActivity: boolean;
}

export interface LaunchProfile {
  type: 'native' | 'embedded' | 'external' | 'hybrid';
  description: string;
}

export interface SyncProfile {
  mode: 'realtime' | 'scheduled' | 'manual' | 'hybrid';
  intervalMs?: number;
  description: string;
}

export interface HealthProfile {
  status: 'healthy' | 'degraded' | 'offline' | 'maintenance';
  lastSync?: Date;
  errorCount?: number;
  successRate?: number;
}

export interface CapabilityTier {
  // Tiers calculated from capability score, NOT hardcoded
  // TIER_A: 75+ = 6+ features + healthy
  // TIER_B: 50+ = 4-5 features + healthy
  // TIER_C: 25+ = 2-3 features
  // TIER_D: <25 = 1 or no features
  tier: 'TIER_A' | 'TIER_B' | 'TIER_C' | 'TIER_D';
  score: number;
}

export interface ProviderClassification {
  inventorySourceProfile: InventorySourceProfile;
  verificationProfile: VerificationProfile;
  launchProfile: LaunchProfile;
  syncProfile: SyncProfile;
  healthProfile: HealthProfile;
  capabilityTier: CapabilityTier;
}

// ─── Provider Status & Health ──────────────────────────────────────────────────

export interface ProviderHealthMetrics {
  providerId: string;
  healthStatus: 'healthy' | 'degraded' | 'offline' | 'maintenance';
  lastSuccessfulSync: Date;
  lastFailedSync?: Date;
  syncErrorCount: number;
  successRate: number;  // 0-100
  averageResponseTime: number; // ms
  uptimePercentage: number; // 0-100
  callbackQueueDepth: number;
  failedCallbacks: number;
}

export interface ProviderSyncStatus {
  providerId: string;
  lastSyncAt: Date;
  nextSyncAt?: Date;
  syncInProgress: boolean;
  syncDuration: number; // ms
  inventoriesFetched: number;
  campaignsGenerated: number;
  opportunitiesGenerated: number;
  errors: string[];
}

// ─── Provider Event Types ──────────────────────────────────────────────────────

export type ProviderEvent = 
  | 'inventory_synced'
  | 'campaign_created'
  | 'campaign_deleted'
  | 'opportunity_created'
  | 'opportunity_deleted'
  | 'opportunity_completed'
  | 'callback_received'
  | 'webhook_received'
  | 'health_degraded'
  | 'health_recovered'
  | 'sync_failed';

export interface ProviderEventData {
  event: ProviderEvent;
  providerId: string;
  timestamp: Date;
  data?: any;
}
