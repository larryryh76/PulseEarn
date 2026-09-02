"""PSEmine backend authority layer.

This module contains validation, configuration, lifecycle, and Firestore transaction
primitives for the isolated PSEmine campaign product. It intentionally never treats
client supplied balances, prices, verification, or timestamps as authoritative.
"""
from datetime import datetime, timezone, timedelta
from decimal import Decimal, InvalidOperation, ROUND_DOWN
import os
import re
import uuid

import requests
from firebase_admin import firestore


BSC_CHAIN_ID = 56
WEI_PER_BNB = Decimal(10) ** 18
DEFAULT_COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=gbp'


def _required_config(name):
    value = os.environ.get(name)
    if not value:
        raise PSEmineError('CONFIGURATION_REQUIRED', f'{name} is not configured for live settlement.', 503, {'variable': name})
    return value


def live_bnb_gbp_price():
    url = os.environ.get('PSEMINE_COINGECKO_API_URL') or DEFAULT_COINGECKO_URL
    try:
        response = requests.get(url, timeout=8, headers={'Accept': 'application/json', 'User-Agent': 'PSEmine/1.0'})
        response.raise_for_status()
        price = money(response.json().get('binancecoin', {}).get('gbp'), 'bnbGbpPrice')
        if price <= 0:
            raise ValueError('non-positive price')
        return price
    except (requests.RequestException, ValueError, TypeError, KeyError) as primary_error:
        try:
            binance_url = 'https://api.binance.com/api/v3/ticker/price?symbol=BNBGBP'
            resp2 = requests.get(binance_url, timeout=8, headers={'Accept': 'application/json', 'User-Agent': 'PSEmine/1.0'})
            resp2.raise_for_status()
            p2 = money(resp2.json().get('price'), 'bnbGbpPrice')
            if p2 > 0:
                return p2
        except Exception:
            pass
        raise PSEmineError('PRICE_UNAVAILABLE', 'Live BNB pricing is temporarily unavailable.', 503, {'provider': 'coingecko', 'reason': str(primary_error)})


def bsc_rpc(method, params):
    url = _required_config('PSEMINE_BSC_RPC_URL')
    try:
        response = requests.post(url, json={'jsonrpc': '2.0', 'id': 1, 'method': method, 'params': params}, timeout=10)
        response.raise_for_status()
        body = response.json()
        if body.get('error'):
            raise ValueError(body['error'].get('message', 'RPC error'))
        return body.get('result')
    except (requests.RequestException, ValueError, TypeError) as error:
        raise PSEmineError('BSC_RPC_UNAVAILABLE', 'BSC transaction verification is temporarily unavailable.', 503, {'reason': str(error)})


def bsc_transaction(tx_hash):
    if not re.fullmatch(r'0x[a-fA-F0-9]{64}', tx_hash or ''):
        raise PSEmineError('INVALID_TRANSACTION_HASH', 'Enter a valid BSC transaction hash.', 400)
    transaction = bsc_rpc('eth_getTransactionByHash', [tx_hash])
    receipt = bsc_rpc('eth_getTransactionReceipt', [tx_hash])
    if not transaction or not receipt:
        raise PSEmineError('TRANSACTION_NOT_FOUND', 'The BSC transaction is not available yet.', 409)
    return transaction, receipt


def wei_to_bnb(value):
    try:
        return Decimal(int(value, 16)) / WEI_PER_BNB
    except (TypeError, ValueError):
        raise PSEmineError('INVALID_TRANSACTION', 'The BSC transaction amount is invalid.', 400)


def create_live_purchase_intent(db, uid, tool_id, quantity):
    user = ensure_user(db, uid)
    base = create_purchase_intent(db, uid, tool_id, quantity)
    campaign = db.collection(PSE_COLLECTIONS['campaigns']).document(base['campaignId']).get().to_dict() or {}
    receiver = str(campaign.get('receiverWalletAddress') or '').strip()
    if not ADDRESS_RE.fullmatch(receiver):
        raise PSEmineError('PAYMENT_CONFIG_REQUIRED', 'The campaign payment wallet is not configured.', 503)
    bnb_gbp = live_bnb_gbp_price()
    expected_gbp = money(base['expectedGBP'], 'expectedGBP')
    bnb_amount = (expected_gbp / bnb_gbp).quantize(Decimal('0.000000000000000001'), rounding=ROUND_DOWN)
    intent_id = str(uuid.uuid4())
    db.collection(PSE_COLLECTIONS['intents']).document(intent_id).set({
        'intentId': intent_id, 'userId': uid, 'campaignId': base['campaignId'], 'toolId': tool_id,
        'quantity': positive_quantity(quantity), 'purchaseWallet': user.get('purchaseWallet'), 'expectedGBP': str(expected_gbp), 'bnbGbpPrice': str(bnb_gbp),
        'expectedBNB': str(bnb_amount), 'status': 'quoted', 'createdAt': firestore.SERVER_TIMESTAMP,
        'expiresAt': utc_now() + timedelta(minutes=10),
    })
    return {'intentId': intent_id, 'expectedGBP': str(expected_gbp), 'bnbGbpPrice': str(bnb_gbp), 'expectedBNB': str(bnb_amount), 'expiresInSeconds': 600}


def verify_purchase(db, uid, purchase_id, tx_hash):
    # PHASE A: Non-transactional validation & external BSC RPC lookup
    intent_ref = db.collection(PSE_COLLECTIONS['intents']).document(purchase_id)
    intent_snap = intent_ref.get()
    if not intent_snap.exists:
        raise PSEmineError('PURCHASE_INTENT_NOT_FOUND', 'Purchase intent not found.', 404)
    intent = intent_snap.to_dict() or {}
    if intent.get('userId') != uid:
        raise PSEmineError('FORBIDDEN', 'Purchase intent does not belong to this account.', 403)
    if intent.get('status') != 'quoted':
        raise PSEmineError('PURCHASE_ALREADY_PROCESSED', 'This purchase intent has already been processed.', 409)
    expires = intent.get('expiresAt')
    if expires and hasattr(expires, 'timestamp') and expires < utc_now():
        raise PSEmineError('PURCHASE_INTENT_EXPIRED', 'This purchase quote has expired.', 409)

    transaction, receipt = bsc_transaction(tx_hash)
    if int(transaction.get('chainId', '0x0'), 16) != BSC_CHAIN_ID or receipt.get('status') != '0x1':
        raise PSEmineError('TRANSACTION_INVALID', 'The transaction was not confirmed successfully on BSC.', 400)

    latest_block = bsc_rpc('eth_blockNumber', [])
    tx_block = receipt.get('blockNumber')
    confirmations_required = int(os.environ.get('PSEMINE_REQUIRED_CONFIRMATIONS', '15'))
    if not latest_block or not tx_block or int(latest_block, 16) - int(tx_block, 16) + 1 < confirmations_required:
        raise PSEmineError('PAYMENT_CONFIRMATIONS_PENDING', 'Payment is confirmed but has not reached the required BSC confirmations.', 409, {'required': confirmations_required})

    expected_wei = int((Decimal(intent['expectedBNB']) * WEI_PER_BNB).to_integral_value(rounding=ROUND_DOWN))
    actual_wei = int(transaction.get('value', '0x0'), 16)
    if actual_wei < expected_wei:
        raise PSEmineError('PAYMENT_INSUFFICIENT', 'The confirmed BNB payment is below the quoted amount.', 400)

    campaign = db.collection(PSE_COLLECTIONS['campaigns']).document(intent.get('campaignId', '')).get().to_dict() or {}
    treasury = (campaign.get('receiverWalletAddress') or '').lower()
    if not treasury or transaction.get('to', '').lower() != treasury:
        raise PSEmineError('PAYMENT_RECIPIENT_INVALID', 'The payment recipient does not match the active campaign treasury.', 400)

    recorded_wallet = str(intent.get('purchaseWallet') or '').strip().lower()
    if recorded_wallet and transaction.get('from', '').lower() != recorded_wallet:
        raise PSEmineError('PAYMENT_SENDER_INVALID', 'The payment was sent from a different wallet than the recorded purchase wallet.', 400)

    tx_doc_id = tx_hash.lower()
    tx_ref = db.collection(PSE_COLLECTIONS['transactions']).document(tx_doc_id)
    ownership_id = purchase_id
    ownership_ref = db.collection(PSE_COLLECTIONS['ownership']).document(ownership_id)
    tool_snap = db.collection(PSE_COLLECTIONS['tools']).document(intent.get('toolId', '')).get()
    hourly_rate = str((tool_snap.to_dict() or {}).get('hourlyRateGBP', '0.00')) if tool_snap.exists else '0.00'

    # PHASE B: Atomic Firestore mutation (establishes single-use claim & ownership)
    @firestore.transactional
    def process_verification(txn):
        tx_snap_txn = tx_ref.get(transaction=txn)
        if tx_snap_txn.exists:
            raise PSEmineError('TRANSACTION_REPLAYED', 'This transaction has already been submitted.', 409)

        intent_snap_txn = intent_ref.get(transaction=txn)
        if not intent_snap_txn.exists:
            raise PSEmineError('PURCHASE_INTENT_NOT_FOUND', 'Purchase intent not found.', 404)
        intent_txn = intent_snap_txn.to_dict() or {}
        if intent_txn.get('status') != 'quoted':
            raise PSEmineError('PURCHASE_ALREADY_PROCESSED', 'This purchase intent has already been processed.', 409)

        txn.set(tx_ref, {
            'txHash': tx_doc_id, 'userId': uid, 'intentId': purchase_id,
            'status': 'verified', 'actualWei': str(actual_wei),
            'fromWallet': transaction.get('from', '').lower(),
            'toWallet': transaction.get('to', '').lower(),
            'createdAt': firestore.SERVER_TIMESTAMP
        }, merge=True)

        txn.set(intent_ref, {
            'status': 'verified', 'txHash': tx_doc_id,
            'verifiedAt': firestore.SERVER_TIMESTAMP, 'actualWei': str(actual_wei)
        }, merge=True)

        txn.set(ownership_ref, {
            'ownershipId': ownership_id, 'userId': uid,
            'campaignId': intent.get('campaignId'), 'toolId': intent.get('toolId'),
            'quantity': int(intent.get('quantity', 1)), 'hourlyRateGBP': hourly_rate,
            'status': 'activated', 'purchaseIntentId': purchase_id,
            'activatedAt': firestore.SERVER_TIMESTAMP, 'lastAccruedAt': firestore.SERVER_TIMESTAMP
        }, merge=True)

        act_ref = db.collection(PSE_COLLECTIONS['activity']).document()
        txn.set(act_ref, {
            'activityId': act_ref.id, 'userId': uid,
            'campaignId': intent.get('campaignId'),
            'type': 'tool_purchase_verified',
            'amountGBP': intent.get('expectedGBP', '0.00'),
            'txHash': tx_doc_id,
            'message': 'Tool purchase verified and activated.',
            'createdAt': firestore.SERVER_TIMESTAMP
        })

        ref_query = db.collection(PSE_COLLECTIONS['referrals']).where('refereeId', '==', uid).limit(1).stream()
        for ref_doc in ref_query:
            r_data = ref_doc.to_dict() or {}
            if r_data.get('status') == 'registered':
                txn.set(ref_doc.reference, {
                    'status': 'qualified',
                    'qualificationEvent': 'PSEMINE_TOOL_PURCHASE',
                    'qualifiedAt': firestore.SERVER_TIMESTAMP,
                    'updatedAt': firestore.SERVER_TIMESTAMP
                }, merge=True)

    try:
        process_verification(db.transaction())
        audit(db, uid, 'PURCHASE_VERIFIED', target_user_id=uid, campaign_id=intent.get('campaignId'),
              metadata={'txHash': tx_doc_id, 'purchaseId': purchase_id, 'toolId': intent.get('toolId')})
        return {'success': True, 'intentId': purchase_id, 'txHash': tx_doc_id, 'status': 'verified', 'ownershipId': ownership_id}
    except PSEmineError:
        raise
    except Exception as e:
        raise PSEmineError('PURCHASE_VERIFICATION_FAILED', str(e), 500)


def reconcile_psemine(db):
    processed = 0
    for doc in db.collection(PSE_COLLECTIONS['intents']).where('status', '==', 'verified').limit(100).stream():
        data = doc.to_dict() or {}
        if data.get('reconciledAt'):
            continue
        db.collection(PSE_COLLECTIONS['settlements']).document(doc.id).set({'settlementId': doc.id, 'intentId': doc.id, 'userId': data.get('userId'), 'status': 'pending', 'amountGBP': data.get('expectedGBP'), 'createdAt': firestore.SERVER_TIMESTAMP}, merge=True)
        doc.reference.set({'status': 'reconciled', 'reconciledAt': firestore.SERVER_TIMESTAMP}, merge=True)
        processed += 1
    return {'processed': processed}


def request_managed_payout(db, settlement_id):
    signer_url = _required_config('PSEMINE_MANAGED_SIGNER_URL')
    signer_token = _required_config('PSEMINE_MANAGED_SIGNER_TOKEN')
    settlement_ref = db.collection(PSE_COLLECTIONS['settlements']).document(settlement_id)
    settlement = settlement_ref.get().to_dict() or {}
    if not settlement or settlement.get('status') != 'pending':
        raise PSEmineError('SETTLEMENT_NOT_READY', 'Settlement is not ready for payout.', 409)
    response = requests.post(signer_url, json={'settlementId': settlement_id, 'userId': settlement.get('userId'), 'amountGBP': settlement.get('amountGBP')}, headers={'Authorization': f'Bearer {signer_token}', 'Content-Type': 'application/json'}, timeout=15)
    if response.status_code >= 400:
        raise PSEmineError('PAYOUT_PROVIDER_ERROR', 'Managed payout provider rejected the settlement.', 502)
    result = response.json()
    payout_id = result.get('payoutId')
    if not payout_id:
        raise PSEmineError('PAYOUT_PROVIDER_ERROR', 'Managed payout provider returned no payout id.', 502)
    settlement_ref.set({'status': 'submitted', 'payoutId': payout_id, 'submittedAt': firestore.SERVER_TIMESTAMP}, merge=True)
    db.collection(PSE_COLLECTIONS['payouts']).document(payout_id).set({'payoutId': payout_id, 'settlementId': settlement_id, 'userId': settlement.get('userId'), 'status': 'submitted', 'createdAt': firestore.SERVER_TIMESTAMP}, merge=True)
    return {'success': True, 'payoutId': payout_id, 'status': 'submitted'}

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
    if isinstance(value, bool):
        raise PSEmineError("INVALID_QUANTITY", "Quantity must be a positive integer.", 400)
    try:
        quantity = int(value)
        if isinstance(value, float) and not value.is_integer():
            raise ValueError("fractional quantity")
        if isinstance(value, str) and str(quantity) != value.strip():
            raise ValueError("non-integer quantity")
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
    return {"expectedGBP": str(gbp), "campaignId": campaign["campaignId"], "toolId": tool_id, "quantity": quantity}


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
    ledger = earnings.to_dict() if earnings.exists else {"grossToolEarningsGBP": "0.00", "referralBonusGBP": "0.00", "status": "not_started"}
    tool_earnings = money(ledger.get("grossToolEarningsGBP", "0.00"), "grossToolEarningsGBP")
    referral_bonus = money(ledger.get("referralBonusGBP", "0.00"), "referralBonusGBP")
    ledger["totalEarningsGBP"] = str((tool_earnings + referral_bonus).quantize(Decimal("0.01")))
    active_tools = [item for item in ownership if item.get("status") == "activated"]
    hourly_rate = sum((money(item.get("hourlyRateGBP", "0.00")) * int(item.get("quantity", 0)) for item in active_tools), Decimal("0.00"))
    referrals = list(db.collection(PSE_COLLECTIONS["referrals"]).where("referrerId", "==", uid).stream())
    qualified = sum(1 for item in referrals if (item.to_dict() or {}).get("status") == "qualified")
    activity = list(db.collection(PSE_COLLECTIONS["activity"]).where("userId", "==", uid).limit(5).stream())
    return {"user": user, "campaign": serialize_campaign(campaign), "ownership": ownership, "earnings": ledger,
            "capacity": {"activeTools": len(active_tools), "hourlyRateGBP": str(hourly_rate.quantize(Decimal("0.01")))},
            "referrals": {"qualified": min(qualified, 5), "maximum": 5, "hourlyBoostGBP": str((Decimal(min(qualified, 5)) * Decimal("0.30")).quantize(Decimal("0.01")))},
            "activity": [dict(item.to_dict() or {}, activityId=item.id) for item in activity]}


def safe_wallet_view(db, uid):
    wallets = []
    for doc in db.collection(PSE_COLLECTIONS["wallets"]).where("userId", "==", uid).stream():
        data = doc.to_dict() or {}
        wallets.append({"walletId": doc.id, "address": public_address(data.get("address")), "network": data.get("network"), "role": data.get("role"), "status": data.get("status")})
    return wallets


def accrue_psemine(db, now=None):
    now = now or utc_now()
    campaign = get_active_campaign(db)
    if not campaign or campaign.get('status') != 'active':
        return {'processed': 0, 'status': 'not_active'}
    processed = 0
    campaign_id = campaign.get('campaignId')
    campaign_start = campaign.get('startAt')
    campaign_end = campaign.get('endAt')
    if not hasattr(campaign_start, 'timestamp'):
        return {'processed': 0, 'status': 'campaign_start_unconfigured'}
    accrual_now = min(now, campaign_end) if hasattr(campaign_end, 'timestamp') else now
    if accrual_now <= campaign_start:
        return {'processed': 0, 'status': 'campaign_not_started'}
    for owner_doc in db.collection(PSE_COLLECTIONS['ownership']).where('status', '==', 'activated').where('campaignId', '==', campaign_id).limit(500).stream():
        owner = owner_doc.to_dict() or {}
        if not owner.get('userId') or owner.get('campaignId') != campaign_id:
            continue
        last = owner.get('lastAccruedAt')
        last_at = last if hasattr(last, 'timestamp') else campaign_start
        last_at = max(last_at, campaign_start)
        if hasattr(campaign_end, 'timestamp'):
            last_at = min(last_at, campaign_end)
        seconds = max(0, min((accrual_now - last_at).total_seconds(), 3600 * 24))
        amount = (money(owner.get('hourlyRateGBP', '0.00')) * int(owner.get('quantity', 0)) * Decimal(str(seconds)) / Decimal('3600')).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
        if amount <= 0:
            owner_doc.reference.set({'lastAccruedAt': now}, merge=True)
            continue
        entry_id = f"{owner_doc.id}_{int(now.timestamp() // 3600)}"
        entry_ref = db.collection(PSE_COLLECTIONS['activity']).document(entry_id)
        if not entry_ref.get().exists:
            entry_ref.set({'activityId': entry_id, 'userId': owner['userId'], 'campaignId': owner['campaignId'], 'type': 'earning_accrual', 'amountGBP': str(amount), 'message': 'Verified tool earnings accrued.', 'createdAt': firestore.SERVER_TIMESTAMP})
            ledger_ref = db.collection(PSE_COLLECTIONS['earnings']).document(f"{owner['userId']}_{owner['campaignId']}")
            snap = ledger_ref.get().to_dict() or {}
            total = money(snap.get('grossToolEarningsGBP', '0.00')) + amount
            ledger_ref.set({'userId': owner['userId'], 'campaignId': owner['campaignId'], 'grossToolEarningsGBP': str(total), 'status': 'accruing', 'updatedAt': firestore.SERVER_TIMESTAMP}, merge=True)
            processed += 1
        owner_doc.reference.set({'lastAccruedAt': now}, merge=True)
    return {'processed': processed, 'status': 'accrued'}


def verify_transaction_not_implemented():
    raise PSEmineError("BSC_RPC_UNAVAILABLE", "Independent BNB verification is unavailable until a configured BSC RPC provider is connected. No purchase was activated.", 503)
