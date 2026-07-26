/**
 * Provider Discovery Engine
 * 
 * PHASE 15.5 - Provider Orchestration Rebuild
 * 
 * Dynamically discovers provider capabilities from metadata.
 * Zero hardcoded logic. No if/switch on provider names.
 * All provider behavior is self-described through capabilities.
 */

import type {
  ProviderMetadata,
  ProviderCapabilities,
  VerificationType,
} from '../../types/provider';

export class ProviderDiscoveryEngine {
  private providers = new Map<string, ProviderMetadata>();
  private listeners = new Set<(providers: ProviderMetadata[]) => void>();

  /**
   * Register a provider from Firestore metadata.
   * This is the ONLY place provider configuration happens.
   */
  registerProvider(metadata: ProviderMetadata): void {
    const key = metadata.id.toLowerCase();
    this.providers.set(key, metadata);
    this.notifyListeners();
  }

  /**
   * Get provider by ID.
   * Never use provider name in conditionals - use metadata instead.
   */
  getProvider(providerId: string): ProviderMetadata | undefined {
    return this.providers.get(providerId.toLowerCase());
  }

  /**
   * Get all registered providers.
   */
  getAllProviders(): ProviderMetadata[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get number of registered providers.
   */
  getProviderCount(): number {
    return this.providers.size;
  }

  /**
   * Check if provider supports a specific capability.
   * Query capabilities from metadata, never hardcode.
   */
  supportsInventoryAPI(providerId: string): boolean {
    return this.getProvider(providerId)?.capabilities.supportsInventoryAPI ?? false;
  }

  supportsCallback(providerId: string): boolean {
    return this.getProvider(providerId)?.capabilities.supportsCallback ?? false;
  }

  supportsWebhook(providerId: string): boolean {
    return this.getProvider(providerId)?.capabilities.supportsWebhook ?? false;
  }

  supportsNativeCampaigns(providerId: string): boolean {
    return this.getProvider(providerId)?.capabilities.supportsNativeCampaigns ?? false;
  }

  supportsManualCampaigns(providerId: string): boolean {
    return this.getProvider(providerId)?.capabilities.supportsManualCampaigns ?? false;
  }

  supportsEmbeddedExperience(providerId: string): boolean {
    return this.getProvider(providerId)?.capabilities.supportsEmbeddedExperience ?? false;
  }

  supportsExternalLaunch(providerId: string): boolean {
    return this.getProvider(providerId)?.capabilities.supportsExternalLaunch ?? false;
  }

  /**
   * Get all providers supporting a specific capability.
   * Used for routing operations to compatible providers.
   */
  getProvidersByCapability(capability: keyof ProviderCapabilities, value: any): ProviderMetadata[] {
    return this.getAllProviders().filter(
      p => (p.capabilities as any)[capability] === value
    );
  }

  /**
   * Get providers supporting a specific verification method.
   */
  getProvidersByVerification(method: VerificationType): ProviderMetadata[] {
    return this.getAllProviders().filter(
      p => p.capabilities.verificationMethods.includes(method)
    );
  }

  /**
   * Get providers by inventory source.
   */
  getProvidersByInventorySource(source: 'api' | 'webhook' | 'manual' | 'hybrid'): ProviderMetadata[] {
    return this.getProvidersByCapability('inventorySource', source);
  }

  /**
   * Get providers by launch experience type.
   */
  getProvidersByLaunchExperience(experience: 'native' | 'embedded' | 'external' | 'hybrid'): ProviderMetadata[] {
    return this.getProvidersByCapability('launchExperience', experience);
  }

  /**
   * Get healthy providers (not offline/maintenance).
   */
  getHealthyProviders(): ProviderMetadata[] {
    return this.getAllProviders().filter(
      p => p.capabilities.healthStatus !== 'offline' && p.capabilities.healthStatus !== 'maintenance'
    );
  }

  /**
   * Get active providers.
   */
  getActiveProviders(): ProviderMetadata[] {
    return this.getAllProviders().filter(p => p.status === 'active');
  }

  /**
   * Get provider inventory source strategy.
   * Use this to determine how to fetch provider data, not provider name.
   */
  getInventorySourceStrategy(providerId: string): 'api' | 'webhook' | 'manual' | 'hybrid' | null {
    return this.getProvider(providerId)?.capabilities.inventorySource ?? null;
  }

  /**
   * Get provider sync mode.
   * Use this to determine sync frequency/strategy.
   */
  getSyncMode(providerId: string): 'realtime' | 'scheduled' | 'manual' | 'hybrid' | null {
    return this.getProvider(providerId)?.capabilities.syncMode ?? null;
  }

  /**
   * Get provider verification methods.
   * Use this to route completion verification, not provider name.
   */
  getVerificationMethods(providerId: string): VerificationType[] {
    return this.getProvider(providerId)?.capabilities.verificationMethods ?? ['manual'];
  }

  /**
   * Subscribe to provider changes.
   */
  subscribe(callback: (providers: ProviderMetadata[]) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    const providers = this.getAllProviders();
    this.listeners.forEach(listener => listener(providers));
  }

  /**
   * Clear all providers.
   */
  clear(): void {
    this.providers.clear();
    this.notifyListeners();
  }
}

// Singleton instance
export const ProviderDiscovery = new ProviderDiscoveryEngine();
