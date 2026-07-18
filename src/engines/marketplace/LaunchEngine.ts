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
 * Users interact with Opportunities, never Providers directly.
 */

import { MarketplaceOpportunity } from '../../types/marketplace';
import { safeFetch } from '../../utils/api';

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
 * Determine the best launch method for an opportunity.
 */
export function determineLaunchMethod(opportunity: MarketplaceOpportunity): LaunchMethod {
  // Check for inline launch mode first (provider or otherwise)
  if (opportunity.source === 'provider' && opportunity.metadata.launchMode === 'inline') {
    return 'inline';
  }

  // If there's an external URL and it's a provider opportunity, use redirect
  if (opportunity.source === 'provider' && opportunity.action.url) {
    return 'redirect';
  }

  // If the opportunity has a URL but is internal, use native
  if (opportunity.action.url && opportunity.action.actionType === 'url') {
    return 'native';
  }

  // For claims and completes, use inline
  if (opportunity.action.actionType === 'claim' || opportunity.action.actionType === 'complete') {
    return 'inline';
  }

  // Default to native
  return 'native';
}

/**
 * Check if opportunity supports inline/embedded launch.
 */
export function supportsInlineLaunch(opportunity: MarketplaceOpportunity): boolean {
  // Tier A providers with API inventory can support inline
  if (opportunity.source === 'provider') {
    return opportunity.metadata.launchMode === 'inline';
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

  try {
    // Call the backend to generate a signed launch URL with tracking
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

    if (res.success) {
      return {
        success: true,
        url: res.url,
        trackingId: res.trackingId,
        returnUrl: res.returnUrl,
      };
    }

    return { success: false, error: res.error || 'Failed to generate launch URL' };
  } catch (error) {
    // Backend failure - return error instead of fallback
    console.warn('[LaunchEngine] Backend launch failed:', error);
    return {
      success: false,
      error: 'Failed to generate secure launch URL. Please try again.',
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

  // Open blank window synchronously to avoid popup blockers
  const newWindow = window.open('about:blank', '_blank', 'noopener,noreferrer');

  // Generate tracking URL
  const result = await generateLaunchUrl(opportunity, userId);

  if (!result.success) {
    // Close the window on failure
    if (newWindow) {
      newWindow.close();
    }
    return result;
  }

  // Navigate the window to the actual URL
  if (newWindow && result.url) {
    newWindow.location.href = result.url;
  } else {
    return { success: false, error: 'Failed to open window (popup blocked)' };
  }

  return {
    success: true,
    url: result.url,
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

  // Open native URL
  window.location.href = opportunity.action.url;

  return {
    success: true,
    url: opportunity.action.url,
    trackingId: opportunity.action.trackingId,
  };
}

/**
 * Handle inline launches (claims, internal completions).
 */
function handleInlineLaunch(opportunity: MarketplaceOpportunity): LaunchResult {
  // For inline opportunities, we trigger the claim flow
  // This is handled by the calling component
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
    // Non-critical, don't throw
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

  // Check for provider callback parameters
  const statusParam = params.get('status');
  const validStatuses = ['completed', 'pending', 'failed'];
  const status = statusParam && validStatuses.includes(statusParam)
    ? (statusParam as 'completed' | 'pending' | 'failed')
    : undefined;
  const opportunityId = params.get('opportunity_id') || params.get('oid');
  const error = params.get('error');

  // Clear URL parameters
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

/**
 * Actions that can be taken on an opportunity.
 */
export interface OpportunityAction {
  type: 'claim' | 'start' | 'continue' | 'complete' | 'view';
  label: string;
  icon?: string;
}

/**
 * Get available actions for an opportunity.
 */
export function getOpportunityActions(opportunity: MarketplaceOpportunity): OpportunityAction[] {
  const actions: OpportunityAction[] = [];

  switch (opportunity.status) {
    case 'available':
      actions.push({ type: 'start', label: 'Start' });
      actions.push({ type: 'view', label: 'View Details' });
      break;
    case 'pending':
      actions.push({ type: 'continue', label: 'Continue' });
      break;
    case 'cooldown':
      actions.push({ type: 'view', label: 'View' });
      break;
    case 'completed':
      actions.push({ type: 'view', label: 'View' });
      break;
    case 'rejected':
      actions.push({ type: 'start', label: 'Retry' });
      break;
    case 'locked':
      // No actions available
      break;
  }

  return actions;
}

/**
 * Get the primary CTA for an opportunity.
 */
export function getPrimaryCTA(opportunity: MarketplaceOpportunity): {
  label: string;
  action: 'claim' | 'start' | 'continue' | 'pending' | 'completed' | 'locked';
} {
  switch (opportunity.status) {
    case 'available':
      return { label: 'Start', action: 'start' };
    case 'pending':
      return { label: 'Continue', action: 'continue' };
    case 'cooldown':
      return { label: 'On Cooldown', action: 'pending' };
    case 'completed':
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
