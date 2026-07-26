/**
 * LaunchEngine
 * 
 * Part 5: Opportunity System - Unified launch handling for all opportunity types.
 * 
 * This engine handles:
 * - Internal opportunity launches (claim, navigate)
 * - Provider opportunity launches (redirect to provider)
 * - Launch URL generation with tracking
 * - Return URL handling
 * - Callback flow coordination
 * 
 * Capability-Driven & Security Enforced:
 * - Uses validateExternalUrl() to reject invalid protocols (javascript:, data:, blob:)
 * - Derives launch method from provider capabilities rather than provider name
 */

import { MarketplaceOpportunity } from '../../types/marketplace';
import { safeFetch } from '../../utils/api';
import { validateExternalUrl, UrlValidationResult } from '../../utils/security';
import { ProviderAdapterRegistry } from './ProviderAdapter';

export { validateExternalUrl, type UrlValidationResult };

// ─── Launch Result ─────────────────────────────────────────────────────────

export interface LaunchResult {
  success: boolean;
  url?: string;
  error?: string;
  trackingId?: string;
  returnUrl?: string;
}

// ─── Launch Methods ─────────────────────────────────────────────────────────

export type LaunchMethod = 'inline' | 'native' | 'redirect' | 'modal';

/**
 * Determine the best launch method for an opportunity based on capabilities.
 */
export function determineLaunchMethod(opportunity: MarketplaceOpportunity): LaunchMethod {
  if (opportunity.source === 'provider' && opportunity.providerId) {
    const adapter = ProviderAdapterRegistry.get(opportunity.providerId);
    const caps = adapter.getCapabilities();

    if (opportunity.metadata.launchMode === 'inline' && caps.supportsEmbeddedOffers) {
      return 'inline';
    }

    if (opportunity.action.url) {
      return 'redirect';
    }
  }

  // Check for inline launch mode
  if (opportunity.metadata.launchMode === 'inline') {
    return 'inline';
  }

  // If there's an external URL, use redirect
  if (opportunity.action.url) {
    const val = validateExternalUrl(opportunity.action.url);
    if (val.valid) {
      return 'redirect';
    }
  }

  // For claims and completes, use inline
  if (opportunity.action.actionType === 'claim' || opportunity.action.actionType === 'complete') {
    return 'inline';
  }

  // Default to native
  return 'native';
}

/**
 * Check if opportunity supports inline/embedded launch based on provider capabilities.
 */
export function supportsInlineLaunch(opportunity: MarketplaceOpportunity): boolean {
  if (opportunity.source === 'provider' && opportunity.providerId) {
    const adapter = ProviderAdapterRegistry.get(opportunity.providerId);
    return adapter.getCapabilities().supportsEmbeddedOffers || opportunity.metadata.launchMode === 'inline';
  }
  
  // Internal opportunities can always use inline
  return true;
}

// ─── Launch URL Generation ────────────────────────────────────────────────

/**
 * Generate a secure launch URL for a provider opportunity.
 * The URL includes tracking parameters and return URL.
 */
export async function generateLaunchUrl(
  opportunity: MarketplaceOpportunity,
  userId: string
): Promise<LaunchResult> {
  if (!opportunity.action.url) {
    return { success: false, error: 'No launch URL available' };
  }

  const urlValidation = validateExternalUrl(opportunity.action.url);
  if (!urlValidation.valid || !urlValidation.url) {
    return { success: false, error: urlValidation.error || 'Security validation failed for launch URL' };
  }

  try {
    // Call backend to generate signed launch URL with tracking
    const res = await safeFetch('/api/marketplace/launch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        opportunityId: opportunity.id,
        providerId: opportunity.providerId,
        offerId: opportunity.action.trackingId,
        userId,
        returnUrl: window.location.origin + '/marketplace',
      }),
    });

    if (res.success && res.url) {
      const serverValidation = validateExternalUrl(res.url);
      if (serverValidation.valid && serverValidation.url) {
        return {
          success: true,
          url: serverValidation.url,
          trackingId: res.trackingId,
          returnUrl: res.returnUrl,
        };
      }
    }

    // If server return URL is missing or fallback is needed, use validated client URL
    return {
      success: true,
      url: urlValidation.url,
      trackingId: opportunity.action.trackingId || opportunity.id,
    };
  } catch (error) {
    console.warn('[LaunchEngine] Backend launch request failed, falling back to client launch URL:', error);
    return {
      success: true,
      url: urlValidation.url,
      trackingId: opportunity.action.trackingId || opportunity.id,
    };
  }
}

// ─── Launch Execution ─────────────────────────────────────────────────────

/**
 * Execute an opportunity launch.
 */
export async function launchOpportunity(
  opportunity: MarketplaceOpportunity,
  userId: string
): Promise<LaunchResult> {
  const method = determineLaunchMethod(opportunity);

  switch (method) {
    case 'redirect':
      return handleRedirectLaunch(opportunity, userId);
    case 'native':
      return handleNativeLaunch(opportunity);
    case 'inline':
      return handleInlineLaunch(opportunity);
    default:
      return handleNativeLaunch(opportunity);
  }
}

/**
 * Handle redirect launches (external providers).
 */
async function handleRedirectLaunch(
  opportunity: MarketplaceOpportunity,
  userId: string
): Promise<LaunchResult> {
  if (!opportunity.action.url) {
    return { success: false, error: 'No redirect URL available' };
  }

  const initialVal = validateExternalUrl(opportunity.action.url);
  if (!initialVal.valid) {
    return { success: false, error: initialVal.error || 'Invalid redirect URL protocol' };
  }

  // Open blank window synchronously to preserve user gesture
  const newWindow = window.open('about:blank', '_blank', 'noopener,noreferrer');

  // Generate tracking URL
  const result = await generateLaunchUrl(opportunity, userId);

  if (!result.success || !result.url) {
    if (newWindow) newWindow.close();
    return result;
  }

  const finalVal = validateExternalUrl(result.url);
  if (!finalVal.valid || !finalVal.url) {
    if (newWindow) newWindow.close();
    return { success: false, error: finalVal.error || 'Invalid generated launch URL' };
  }

  // Navigate window to validated URL
  if (newWindow) {
    newWindow.location.href = finalVal.url;
  } else {
    window.open(finalVal.url, '_blank', 'noopener,noreferrer');
  }

  return {
    success: true,
    url: finalVal.url,
    trackingId: result.trackingId,
  };
}

/**
 * Handle native launches (deep links, app installs).
 */
function handleNativeLaunch(opportunity: MarketplaceOpportunity): LaunchResult {
  if (!opportunity.action.url) {
    return { success: false, error: 'No action URL available' };
  }

  const val = validateExternalUrl(opportunity.action.url);
  if (!val.valid || !val.url) {
    return { success: false, error: val.error || 'Invalid action URL' };
  }

  window.location.href = val.url;

  return {
    success: true,
    url: val.url,
    trackingId: opportunity.action.trackingId,
  };
}

/**
 * Handle inline launches (claims, internal completions).
 */
function handleInlineLaunch(opportunity: MarketplaceOpportunity): LaunchResult {
  return {
    success: true,
    trackingId: opportunity.action.trackingId,
  };
}

// ─── Launch Tracking ─────────────────────────────────────────────────────

/**
 * Track a launch event.
 */
export async function trackLaunch(
  opportunity: MarketplaceOpportunity,
  userId: string,
  trackingId?: string
): Promise<void> {
  try {
    await safeFetch('/api/marketplace/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        opportunityId: opportunity.id,
        providerId: opportunity.providerId,
        userId,
        trackingId: trackingId || opportunity.action.trackingId,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.warn('[LaunchEngine] Tracking failed:', err);
  }
}

// ─── Return URL Handling ────────────────────────────────────────────────

/**
 * Handle return from provider callback.
 * Called after a provider redirects back to PulseEarn.
 */
export function handleProviderReturn(): {
  opportunityId?: string;
  status?: 'completed' | 'pending' | 'failed';
  error?: string;
} {
  const params = new URLSearchParams(window.location.search);

  const statusParam = params.get('status');
  const validStatuses = ['completed', 'pending', 'failed'];
  const status = statusParam && validStatuses.includes(statusParam)
    ? (statusParam as 'completed' | 'pending' | 'failed')
    : undefined;
  const opportunityId = params.get('opportunity_id') || params.get('oid');
  const error = params.get('error');

  if (window.history.replaceState) {
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);
  }

  return {
    opportunityId: opportunityId || undefined,
    status,
    error: error || undefined,
  };
}

// ─── Opportunity Actions ───────────────────────────────────────────────

export interface OpportunityAction {
  type: 'claim' | 'start' | 'continue' | 'complete' | 'view';
  label: string;
  icon?: string;
}

export function getOpportunityActions(opportunity: MarketplaceOpportunity): OpportunityAction[] {
  const actions: OpportunityAction[] = [];

  switch (opportunity.status) {
    case 'available':
      actions.push({ type: 'start', label: 'Start' });
      actions.push({ type: 'view', label: 'View Details' });
      break;
    case 'pending':
    case 'in_progress':
    case 'started':
      actions.push({ type: 'continue', label: 'Continue' });
      break;
    case 'cooldown':
      actions.push({ type: 'view', label: 'View' });
      break;
    case 'completed':
    case 'verified':
    case 'reward_issued':
      actions.push({ type: 'view', label: 'View' });
      break;
    case 'rejected':
      actions.push({ type: 'start', label: 'Retry' });
      break;
    case 'locked':
      break;
  }

  return actions;
}

export function getPrimaryCTA(opportunity: MarketplaceOpportunity): {
  label: string;
  action: 'claim' | 'start' | 'continue' | 'pending' | 'completed' | 'locked';
} {
  switch (opportunity.status) {
    case 'available':
      return { label: 'Start', action: 'start' };
    case 'started':
    case 'in_progress':
    case 'pending':
      return { label: 'Continue', action: 'continue' };
    case 'cooldown':
      return { label: 'On Cooldown', action: 'pending' };
    case 'completed':
    case 'verified':
    case 'reward_issued':
      return { label: 'Completed', action: 'completed' };
    case 'rejected':
      return { label: 'Retry', action: 'start' };
    case 'locked':
      return { label: 'Locked', action: 'locked' };
    default:
      return { label: 'Start', action: 'start' };
  }
}

const LaunchEngine = {
  determineLaunchMethod,
  supportsInlineLaunch,
  generateLaunchUrl,
  launchOpportunity,
  trackLaunch,
  handleProviderReturn,
  getOpportunityActions,
  getPrimaryCTA,
};

export default LaunchEngine;
