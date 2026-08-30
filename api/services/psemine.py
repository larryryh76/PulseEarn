"""PSEmine backend authority layer.

This module contains validation, configuration, lifecycle, and Firestore transaction
primitives for the isolated PSEmine campaign product. It intentionally never treats
client supplied balances, prices, verification, or timestamps as authoritative.
"""
from datetime import datetime, timezone, timedelta
from decimal import Decimal, InvalidOperation, ROUND_DOWN
import re
import uuid

from firebase_admin import firestore

PSE_COLLECTIONS = {
    "campaigns": "psemine_campaigns",
    "tools": "psemine_tools",
    "users": "psemine_users",
    "wallets": "psemine_wallets",
    "intents": "psemine_purchase_intents",
    "purchases": "psemine_purchases",
    "ownership": "psemine_tool_ownership",
    "earnings": "psemine_earnings",
    "referrals": "psemine_referrals",
    "referral_events": "psemine_referral_events",
    "settlements": "psemine_settlements",
    "payouts": "psemine_payouts",
    "transactions": "psemine_transactions",
    "activity": "psemine_activity",
    "notifications": "psemine_notifications",
    "admin_config": "psemine_admin_config",
    "audit": "psemine_audit_logs",
}

TOOL_SEED = {
    "basic": {"name": "Basic", "tier": 1, "purchasePriceGBP": "3.00", "hourlyRateGBP": "0.10", "maxPerAccount": 5, "description": "A dependable entry tool for starting your campaign capacity.", "sortOrder": 1},
    "core": {"name": "Core", "tier": 2, "purchasePriceGBP": "10.00", "hourlyRateGBP": "0.50", "maxPerAccount": 3, "description": "A balanced tool for building a stronger earning base.", "sortOrder": 2},
    "advanced": {"name": "Advanced", "tier": 3, "purchasePriceGBP": "50.00", "hourlyRateGBP": "1.20", "maxPerAccount": 3, "description": "Higher-capacity campaign equipment for committed participants.", "sortOrder": 3},
    "elite": {"name": "Elite", "tier": 4, "purchasePriceGBP": "200.00", "hourlyRateGBP": "2.50", "maxPerAccount": 2, "description": "The highest initial campaign tier with limited availability.", "sortOrder": 4},
}

ADDRESS_RE = re.compile(r"^0x[a-fA-F0-9]{40}$")
ACTIVE_CAMPAIGN_STATES = {"active"}


def utc_now():
    return datetime.now(timezone.utc)


def money(value, field="amount"):
    try:
        amount = Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_DOWN)
    except (InvalidOperation, TypeError, ValueError):
        raise PSEmineError("INVALID_AMOUNT", f"{field} must be a valid monetary amount.", 400)
    if not amount.is_finite() or amount < 0:
        raise PSEmineError("INVALID_AMOUNT", f"{field} must be finite and non-negative.", 400)
    return amount


def positive_quantity(value):
    try:
        quantity = int(value)
    except (TypeError, ValueError):
        raise PSEmineError("INVALID_QUANTITY", "Quantity must be a positive integer.", 400)
    if quantity < 1 or quantity > 100:
        raise PSEmineError("INVALID_QUANTITY", "Quantity must be between 1 and 100.", 400)
    return quantity


def normalize_address(value):
    address = (value or "").strip().lower()
    if not ADDRESS_RE.match(address):
        raise PSEmineError("INVALID_WALLET_ADDRESS", "Enter a valid EVM wallet address.", 400)
    return address


def public_address(value):
    address = normalize_address(value)
    return f"{address[:6]}...{address[-4:]}"


class PSEmineError(Exception):
    def __init__(self, code, message, status=400, details=None):
        super().__init__(message)
        self.code, self.message, self.status, self.details = code, message, status, details or {}


def error_payload(error):
    return {"success": False, "error": error.code, "message": error.message, "details": error.details}


def audit(db, actor_id, event_type, target_user_id=None, campaign_id=None, metadata=None, previous_state=None, new_state=None):
    db.collection(PSE_COLLECTIONS["audit"]).add({
        "eventId": str(uuid.uuid4()), "actorId": actor_id, "targetUserId": target_user_id,
        "campaignId": campaign_id, "eventType": event_type, "previousState": previous_state,
        "newState": new_state, "metadata": metadata or {}, "createdAt": firestore.SERVER_TIMESTAMP,
    })


def ensure_user(db, uid, auth_user=None):
    ref = db.collection(PSE_COLLECTIONS["users"]).document(uid)
    snap = ref.get()
    if not snap.exists:
        ref.set({"userId": uid, "productAccess": {"psemine": False}, "participationStatus": "onboarding",
                 "createdAt": firestore.SERVER_TIMESTAMP, "updatedAt": firestore.SERVER_TIMESTAMP})
        return {"userId": uid, "productAccess": {"psemine": False}, "participationStatus": "onboarding"}
    return snap.to_dict() or {}


def get_active_campaign(db):
    query = db.collection(PSE_COLLECTIONS["campaigns"]).where("status", "in", ["active", "scheduled"]).limit(5).stream()
    campaigns = [dict(doc.to_dict() or {}, campaignId=doc.id) for doc in query]
    campaigns.sort(key=lambda c: c.get("startAt") or datetime.max.replace(tzinfo=timezone.utc))
    return campaigns[0] if campaigns else None


def seed_defaults(db, actor_id):
    """Idempotent bootstrap for initial campaign/tool definitions; no user balances are created."""
    for tool_id, tool in TOOL_SEED.items():
        ref = db.collection(PSE_COLLECTIONS["tools"]).document(tool_id)
        if not ref.get().exists:
            ref.set({**tool, "toolId": tool_id, "status": "enabled", "createdAt": firestore.SERVER_TIMESTAMP, "updatedAt": firestore.SERVER_TIMESTAMP})
    campaign_ref = db.collection(PSE_COLLECTIONS["campaigns"]).document("psemine-initial")
    if not campaign_ref.get().exists:
        campaign_ref.set({"campaignId": "psemine-initial", "name": "PSEmine Initial Campaign", "status": "draft",
                          "purchaseEnabled": False, "walletConnectionEnabled": True, "referralEnabled": True,
                          "createdAt": firestore.SERVER_TIMESTAMP, "updatedAt": firestore.SERVER_TIMESTAMP})
        audit(db, actor_id, "PSEmine_DEFAULTS_INITIALIZED", campaign_id="psemine-initial")


def require_participation(db, uid):
    user = ensure_user(db, uid)
    if not user.get("productAccess", {}).get("psemine"):
        raise PSEmineError("PSEmine_ACCESS_REQUIRED", "Complete PSEmine onboarding before using campaign features.", 403)
    return user


def create_purchase_intent(db, uid, tool_id, quantity):
    user = require_participation(db, uid)
    campaign = get_active_campaign(db)
    if not campaign or campaign.get("status") not in ACTIVE_CAMPAIGN_STATES:
        raise PSEmineError("CAMPAIGN_NOT_ACTIVE", "This campaign is not accepting purchases.", 409)
    if not campaign.get("purchaseEnabled"):
        raise PSEmineError("PURCHASES_DISABLED", "Tool purchases are currently closed.", 409)
    quantity = positive_quantity(quantity)
    tool_snap = db.collection(PSE_COLLECTIONS["tools"]).document(tool_id).get()
    if not tool_snap.exists:
        raise PSEmineError("TOOL_NOT_FOUND", "That tool is not available.", 404)
    tool = tool_snap.to_dict() or {}
    if tool.get("status") != "enabled":
        raise PSEmineError("TOOL_DISABLED", "That tool is currently unavailable.", 409)
    owned = list(db.collection(PSE_COLLECTIONS["ownership"]).where("userId", "==", uid).where("campaignId", "==", campaign["campaignId"]).where("toolId", "==", tool_id).stream())
    owned_qty = sum(int((x.to_dict() or {}).get("quantity", 0)) for x in owned if (x.to_dict() or {}).get("status") in {"activated", "pending_payment"})
    if owned_qty + quantity > int(tool.get("maxPerAccount", 0)):
        raise PSEmineError("TOOL_LIMIT_REACHED", "This purchase exceeds your ownership limit.", 409, {"owned": owned_qty, "maximum": tool.get("maxPerAccount")})
    gbp = money(tool.get("purchasePriceGBP"), "purchasePriceGBP") * quantity
    # A quote is not payable without a real server-side BNB price source.
    raise PSEmineError("PRICE_UNAVAILABLE", "A live BNB price source is not configured; no payable quote was created.", 503, {"expectedGBP": str(gbp), "campaignId": campaign["campaignId"]})


def serialize_campaign(campaign):
    if not campaign:
        return None
    return {k: v.isoformat() if hasattr(v, "isoformat") else v for k, v in campaign.items()}


def serialize_tool(doc):
    data = doc.to_dict() or {}
    return {**data, "toolId": doc.id}


def dashboard_snapshot(db, uid):
    user = require_participation(db, uid)
    campaign = get_active_campaign(db)
    ownership = [dict(x.to_dict() or {}, ownershipId=x.id) for x in db.collection(PSE_COLLECTIONS["ownership"]).where("userId", "==", uid).stream()]
    earnings = db.collection(PSE_COLLECTIONS["earnings"]).document(f"{uid}_{campaign['campaignId'] if campaign else 'none'}").get()
    return {"user": user, "campaign": serialize_campaign(campaign), "ownership": ownership, "earnings": earnings.to_dict() if earnings.exists else {"grossToolEarningsGBP": "0.00", "referralBonusGBP": "0.00", "status": "not_started"}}


def safe_wallet_view(db, uid):
    wallets = []
    for doc in db.collection(PSE_COLLECTIONS["wallets"]).where("userId", "==", uid).stream():
        data = doc.to_dict() or {}
        wallets.append({"walletId": doc.id, "address": public_address(data.get("address")), "network": data.get("network"), "role": data.get("role"), "status": data.get("status")})
    return wallets


def verify_transaction_not_implemented():
    raise PSEmineError("BSC_RPC_UNAVAILABLE", "Independent BNB verification is unavailable until a configured BSC RPC provider is connected. No purchase was activated.", 503)
