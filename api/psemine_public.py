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
    'currencyDisplay', 'purchaseEnabled', 'purchaseReady', 'miningEnabled', 'referralEnabled',
)

# Fields that are deliberately part of the public contract, and why. Kept beside
# the allow-list so a reviewer sees the intent without reading the purchase flow.
PUBLIC_CAMPAIGN_FIELD_NOTES = {
    'purchaseEnabled': 'Admin-controlled gate for hosted crypto checkout; it does not expose provider credentials.',
    'purchaseReady': 'Derived readiness: hosted provider purchase gate is enabled for an active campaign.',
}

# Never published. These are the operational fields the bootstrap writer, the
# purchase transaction and the admin lifecycle actions actually put on
# psemine_campaigns/active_campaign — internal economics and admin state that a
# payer has no reason to see. Listed so the intent is explicit rather than
# implied by absence; the projection never emits anything outside the allow-list
# regardless of what this tuple contains.
PRIVATE_CAMPAIGN_FIELDS = (
    'totalCapacitiesRegisteredGBPPerHour', 'totalAccruedLiabilityGBP',
    'totalBNBCollected', 'totalMinersCount', 'walletChangeDeadline',
    'receiverWalletConfigured', 'receiverWalletConfiguredAt', 'receiverWalletConfiguredBy',
    'pauseWindows', 'shutdownState', 'createdAt', 'updatedAt',
)


def campaign_purchase_ready(camp):
    """True only when the active campaign explicitly enables hosted purchases."""
    return bool(
        isinstance(camp, dict)
        and camp.get('status') == 'active'
        and camp.get('purchaseEnabled') is True
    )


def public_campaign_view(camp):
    """Project a campaign document down to the public allow-list.

    Returns None for a missing/empty document so callers can fall back to their
    default public configuration. Readiness is derived from the active campaign
    and admin-controlled purchase gate; no wallet address or provider secret is exposed.
    """
    if not camp:
        return None
    view = {k: camp[k] for k in PUBLIC_CAMPAIGN_FIELDS if k in camp and k != 'purchaseReady'}
    view['purchaseReady'] = campaign_purchase_ready(camp)
    return view


# ---------------------------------------------------------------------------
# Public tool catalog projection
# ---------------------------------------------------------------------------
# `psemine_tools` is deliberately world-readable in firestore.rules ("catalog is
# intentionally public"), so a public read of the tier catalog is legitimate.
# What was NOT legitimate is the legacy handler's `{**tool.to_dict(), 'id': ...}`:
# it published every field of the row, including operational metadata
# (createdAt/updatedAt), the admin deprecation internals
# (deprecated/deprecatedAt/deprecationReason/canonicalAlias) and prose that
# restates the economics. The projection below is the contract instead — a field
# added to a tool document must never become public by accident.
PUBLIC_TOOL_FIELDS = (
    'id', 'name', 'tier', 'priceGbp', 'miningRateGbpPerHour',
    'maxCopiesPerUser', 'campaignId', 'isActive',
)

# Never published from a tool document: operations/deprecation bookkeeping.
PRIVATE_TOOL_FIELDS = (
    'createdAt', 'updatedAt', 'deprecated', 'deprecatedAt',
    'deprecationReason', 'canonicalAlias', 'description',
)


def public_tool_view(tool):
    """Project a mining-tool document down to the public catalog allow-list.

    Returns None for a missing/empty document so callers can skip the row.
    """
    if not tool:
        return None
    return {k: tool[k] for k in PUBLIC_TOOL_FIELDS if k in tool}


def leaked_public_keys(camp):
    """Names in `camp` that would be unsafe to publish (diagnostics/tests).

    Empty list means the document holds no known-private field. This is advisory:
    the projection never emits anything outside the allow-list regardless.
    """
    src = camp or {}
    return sorted(k for k in src if k in PRIVATE_CAMPAIGN_FIELDS)


def leaked_tool_keys(tool):
    """Names in `tool` that would be unsafe to publish (diagnostics/tests)."""
    src = tool or {}
    return sorted(k for k in src if k in PRIVATE_TOOL_FIELDS)
