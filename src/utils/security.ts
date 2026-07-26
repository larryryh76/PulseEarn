/**
 * Security & URL Validation Utility
 *
 * Enforces unified launch security for external URLs and partner integrations across PulseEarn.
 */

export interface UrlValidationResult {
  valid: boolean;
  url?: string;
  error?: string;
}

/**
 * Validates external URLs against security rules.
 * Accepts: http:// and https:// URLs.
 * Rejects: javascript:, data:, file:, blob:, vbscript:, malformed URLs.
 */
export function validateExternalUrl(inputUrl?: string | null): UrlValidationResult {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return { valid: false, error: 'URL is missing or invalid type' };
  }

  const trimmed = inputUrl.trim();
  if (!trimmed) {
    return { valid: false, error: 'URL is empty' };
  }

  // Reject dangerous protocols explicitly before URL parsing
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('file:') ||
    lower.startsWith('blob:') ||
    lower.startsWith('vbscript:')
  ) {
    return { valid: false, error: 'Insecure URL protocol rejected' };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: `Unsupported protocol: ${parsed.protocol}` };
    }
    return { valid: true, url: parsed.href };
  } catch {
    return { valid: false, error: 'Malformed URL format' };
  }
}
