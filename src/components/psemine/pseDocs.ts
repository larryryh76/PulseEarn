/**
 * PSEmine product documents — the registry.
 *
 * The identifiers, the reading order, the routes and the short labels live here,
 * with no JSX, so the same set of documents is used by:
 *
 *   • the document pages themselves (src/pages/psemine/PSEminePolicy.tsx)
 *   • the landing page's footer and its "documents at the point of decision" lines
 *   • the authentication family's footer
 *
 * One source means a document cannot be added to the product and forgotten in the
 * footer, and a label cannot drift between two places that both name it. The
 * content of each document lives with the document page, because that is the only
 * consumer of the prose.
 */

export type PseDocId =
  | 'terms'
  | 'privacy'
  | 'cookies'
  | 'campaign-terms'
  | 'purchase-terms'
  | 'payout-policy'
  | 'referral-terms'
  | 'risk'
  | 'support';

/** Reading order used by every list of documents in the product. */
export const PSE_DOC_ORDER: readonly PseDocId[] = [
  'terms',
  'campaign-terms',
  'purchase-terms',
  'payout-policy',
  'referral-terms',
  'risk',
  'privacy',
  'cookies',
  'support',
];

export const PSE_DOC_PATH: Record<PseDocId, string> = {
  terms: '/mine/terms',
  privacy: '/mine/privacy',
  cookies: '/mine/cookies',
  'campaign-terms': '/mine/campaign-terms',
  'purchase-terms': '/mine/purchase-terms',
  'payout-policy': '/mine/payout-policy',
  'referral-terms': '/mine/referral-terms',
  risk: '/mine/risk',
  support: '/mine/support',
};

/** The short label a link uses, everywhere the document is named. */
export const PSE_DOC_LABEL: Record<PseDocId, string> = {
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  cookies: 'Cookies & Storage',
  'campaign-terms': 'Campaign Terms',
  'purchase-terms': 'Purchase Terms',
  'payout-policy': 'Payout Policy',
  'referral-terms': 'Referral Terms',
  risk: 'Risk Disclosure',
  support: 'Support',
};
