"""
Public (unauthenticated) PSEmine payload projections.

WHY THIS IS ITS OWN MODULE
--------------------------
`GET /api/mine/campaign/status` is called before sign-in (landing page, shell
banner), so it must not hand out the campaign document. Returning
`camp_doc.to_dict()` meant that any field ever added to
`psemine_campaigns/active_campaign` — collected BNB, shutdown state, internal
audit metadata, a future payout key — would have become public the moment it was
written, with no code change and no review.

The projection is therefore an explicit allow-list, and it lives here rather
than inside the Flask app so it can be unit-tested directly (api/index.py
imports Flask at module scope and cannot be imported in a plain test run).

Contract:
  * Only names in PUBLIC_CAMPAIGN_FIELDS are ever emitted.
  * Unknown and private fields are dropped silently — adding a field to the
    campaign document must never widen the public API (regression test:
    api/tests/test_public_payload.py).
  * `receiverWalletAddress` is intentionally public: the purchase flow must show
    payers the receiving address before they sign in.
  * Enrolled users get the full document from the entitlement-gated
    `GET /api/mine/state`.
"""

PUBLIC_CAMPAIGN_FIELDS = (
    'id', 'name', 'status', 'durationDays', 'startAt', 'endAt',
    'currencyDisplay', 'paymentAsset', 'paymentNetwork', 'paymentNetworkId',
    'receiverWalletAddress', 'purchaseEnabled', 'miningEnabled', 'referralEnabled',
)

# Fields that are deliberately part of the public contract, and why. Kept beside
# the allow-list so a reviewer sees the intent without reading the purchase flow.
PUBLIC_CAMPAIGN_FIELD_NOTES = {
    'receiverWalletAddress': 'Payers must see the receiving address before signing in.',
}

# Never published, listed so the intent is explicit rather than implied by absence.
PRIVATE_CAMPAIGN_FIELDS = (
    'collectedBNB', 'collectedMinor', 'shutdownState', 'totalAccruedGBP',
    'accruedMinor', 'adminMetadata', 'internalNotes', 'payoutWallet',
)


def public_campaign_view(camp):
    """Project a campaign document down to the public allow-list.

    Returns None for a missing/empty document so callers can fall back to their
    default public configuration.
    """
    if not camp:
        return None
    return {k: camp[k] for k in PUBLIC_CAMPAIGN_FIELDS if k in camp}


def leaked_public_keys(camp):
    """Names in `camp` that would be unsafe to publish (diagnostics/tests).

    Empty list means the document holds no known-private field. This is advisory:
    the projection never emits anything outside the allow-list regardless.
    """
    src = camp or {}
    return sorted(k for k in src if k in PRIVATE_CAMPAIGN_FIELDS)
