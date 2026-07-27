/**
 * Provider Classification Engine
 * 
 * PHASE 15.5 - Provider Orchestration Rebuild
 * 
 * Classifies providers dynamically from capabilities, not hardcoded tiers.
 * Computes capability score and tier classification automatically.
 * Determines verification, sync, and launch strategies per provider.
 */

import type {
  ProviderMetadata,
  ProviderCapabilities,
  ProviderClassification as ProviderClassificationType,
  CapabilityTier,
  InventorySourceProfile,
  VerificationProfile,
  LaunchProfile,
  SyncProfile,
  HealthProfile,
  VerificationType,
} from '../../types/provider';
import { ProviderDiscovery } from './ProviderDiscoveryEngine';

export class ProviderClassificationEngine {
  
  /**
   * Classify a provider dynamically from its capabilities.
   * This replaces ALL hardcoded TIER_A/B/C/D logic.
   */
  classifyProvider(metadata: ProviderMetadata): ProviderClassificationType {
    return {
      inventorySourceProfile: this.getInventorySourceProfile(metadata),
      verificationProfile: this.getVerificationProfile(metadata),
      launchProfile: this.getLaunchProfile(metadata),
      syncProfile: this.getSyncProfile(metadata),
      healthProfile: this.getHealthProfile(metadata),
      capabilityTier: this.getCapabilityTier(metadata),
    };
  }

  /**
   * Get inventory source profile from capabilities.
   */
  private getInventorySourceProfile(metadata: ProviderMetadata): InventorySourceProfile {
    const type = metadata.capabilities.inventorySource;
    const descriptions: Record<string, string> = {
      'api': 'Fetches inventory via REST/GraphQL API',
      'webhook': 'Receives inventory updates via webhooks',
      'manual': 'Manually configured campaigns',
      'hybrid': 'Combination of API, webhooks, and manual configuration',
    };
    
    return {
      type,
      description: descriptions[type],
    };
  }

  /**
   * Get verification profile from capabilities.
   */
  private getVerificationProfile(metadata: ProviderMetadata): VerificationProfile {
    const methods = metadata.capabilities.verificationMethods;
    
    return {
      supportsInstant: methods.includes('instant'),
      supportsCallback: methods.includes('callback'),
      supportsManual: methods.includes('manual'),
      supportsScreenshot: methods.includes('screenshot'),
      supportsWalletActivity: methods.includes('wallet_activity'),
    };
  }

  /**
   * Get launch profile from capabilities.
   */
  private getLaunchProfile(metadata: ProviderMetadata): LaunchProfile {
    const type = metadata.capabilities.launchExperience;
    const descriptions: Record<string, string> = {
      'native': 'Native embedded experience',
      'embedded': 'Embedded iframe/WebView',
      'external': 'Redirect to external provider',
      'hybrid': 'Mix of native, embedded, and external launches',
    };
    
    return {
      type,
      description: descriptions[type],
    };
  }

  /**
   * Get sync profile from capabilities.
   */
  private getSyncProfile(metadata: ProviderMetadata): SyncProfile {
    const mode = metadata.capabilities.syncMode;
    const intervalMs = metadata.capabilities.syncIntervalMs;
    
    const descriptions: Record<string, string> = {
      'realtime': 'Real-time inventory updates',
      'scheduled': `Updates every ${intervalMs ? intervalMs / 1000 / 60 : 5} minutes`,
      'manual': 'Manually triggered syncs',
      'hybrid': 'Combination of realtime, scheduled, and manual',
    };
    
    return {
      mode,
      intervalMs,
      description: descriptions[mode],
    };
  }

  /**
   * Get health profile from capabilities.
   */
  private getHealthProfile(metadata: ProviderMetadata): HealthProfile {
    return {
      status: metadata.capabilities.healthStatus,
      lastSync: metadata.capabilities.lastSyncAt,
    };
  }

  /**
   * Calculate capability tier from score (NOT hardcoded to provider name).
   * Tier determined solely by capability score and health.
   */
  private getCapabilityTier(metadata: ProviderMetadata): CapabilityTier {
    const score = this.calculateCapabilityScore(metadata.capabilities);
    
    return {
      score,
      tier: this.getTierFromScore(score),
    };
  }

  /**
   * Calculate capability score (0-100) from supported features.
   * Higher score = more capable provider.
   */
  calculateCapabilityScore(capabilities: ProviderCapabilities): number {
    let score = 0;
    let featureCount = 0;
    
    // Each integration method = +10 points (max 70)
    if (capabilities.supportsInventoryAPI) { score += 10; featureCount++; }
    if (capabilities.supportsCallback) { score += 10; featureCount++; }
    if (capabilities.supportsWebhook) { score += 10; featureCount++; }
    if (capabilities.supportsNativeCampaigns) { score += 10; featureCount++; }
    if (capabilities.supportsManualCampaigns) { score += 10; featureCount++; }
    if (capabilities.supportsEmbeddedExperience) { score += 10; featureCount++; }
    if (capabilities.supportsExternalLaunch) { score += 10; featureCount++; }
    
    // Verification methods diversity = +5 points per method (max 20)
    score += capabilities.verificationMethods.length * 5;
    
    // Full-featured bonus: if has 6+ features, add 10 point bonus
    if (featureCount >= 6) {
      score += 10;
    }
    
    // Health multiplier
    if (capabilities.healthStatus === 'healthy') {
      score *= 1.0;  // 100%
    } else if (capabilities.healthStatus === 'degraded') {
      score *= 0.75; // 75%
    } else if (capabilities.healthStatus === 'offline' || capabilities.healthStatus === 'maintenance') {
      return 0;      // No score
    }
    
    return Math.min(100, Math.max(0, Math.round(score)));
  }

  /**
   * Get tier from capability score (no hardcoding).
   * TIER_A: 75+ = Full-featured + healthy
   * TIER_B: 50+ = Most features + healthy
   * TIER_C: 25+ = Some features
   * TIER_D: <25 = Minimal features
   */
  private getTierFromScore(score: number): 'TIER_A' | 'TIER_B' | 'TIER_C' | 'TIER_D' {
    if (score >= 75) return 'TIER_A';
    if (score >= 50) return 'TIER_B';
    if (score >= 25) return 'TIER_C';
    return 'TIER_D';
  }

  /**
   * Get compatible verification methods for a provider.
   * Query from provider capabilities, not hardcoded.
   */
  getCompatibleVerificationMethods(providerId: string): VerificationType[] {
    const provider = ProviderDiscovery.getProvider(providerId);
    if (!provider) return ['manual'];
    
    // Return provider's supported methods, with fallback to manual
    const methods = provider.capabilities.verificationMethods;
    return methods.length > 0 ? methods : ['manual'];
  }

  /**
   * Get all providers sorted by capability tier.
   * Used for displaying providers in order of capability.
   */
  sortProvidersByCapability(providers: ProviderMetadata[]): ProviderMetadata[] {
    return [...providers].sort((a, b) => {
      const scoreA = this.calculateCapabilityScore(a.capabilities);
      const scoreB = this.calculateCapabilityScore(b.capabilities);
      return scoreB - scoreA; // Higher score first
    });
  }

  /**
   * Check if provider is viable for general use.
   * Considers health, features, and status.
   */
  isViableProvider(providerId: string): boolean {
    const provider = ProviderDiscovery.getProvider(providerId);
    if (!provider) return false;
    
    // Must be active
    if (provider.status !== 'active') return false;
    
    // Must be healthy or degraded (not offline/maintenance)
    if (provider.capabilities.healthStatus === 'offline' || 
        provider.capabilities.healthStatus === 'maintenance') {
      return false;
    }
    
    // Must have at least one capability
    const score = this.calculateCapabilityScore(provider.capabilities);
    return score > 0;
  }

  /**
   * Get providers recommended for a specific use case.
   * Routes to appropriate providers based on requirements.
   */
  getRecommendedProviders(
    requirements: {
      verificationMethod?: VerificationType;
      launchType?: 'native' | 'embedded' | 'external';
      inventorySource?: 'api' | 'webhook' | 'manual';
      minCapabilityScore?: number;
    }
  ): ProviderMetadata[] {
    let providers = ProviderDiscovery.getHealthyProviders();
    
    // Filter out inactive providers (administrative disable)
    providers = providers.filter(p => p.status === 'active');
    
    // Filter by verification method
    if (requirements.verificationMethod) {
      providers = providers.filter(
        p => p.capabilities.verificationMethods.includes(requirements.verificationMethod!)
      );
    }
    
    // Filter by launch type
    if (requirements.launchType) {
      providers = providers.filter(
        p => p.capabilities.launchExperience === requirements.launchType || 
             p.capabilities.launchExperience === 'hybrid'
      );
    }
    
    // Filter by inventory source
    if (requirements.inventorySource) {
      providers = providers.filter(
        p => p.capabilities.inventorySource === requirements.inventorySource ||
             p.capabilities.inventorySource === 'hybrid'
      );
    }
    
    // Filter by minimum capability score
    if (requirements.minCapabilityScore) {
      providers = providers.filter(
        p => this.calculateCapabilityScore(p.capabilities) >= requirements.minCapabilityScore!
      );
    }
    
    // Sort by capability
    return this.sortProvidersByCapability(providers);
  }
}

// Singleton instance
export const ClassificationEngine = new ProviderClassificationEngine();
