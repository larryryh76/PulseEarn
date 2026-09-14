"""Remediation patcher: B1 readers, B2 cron chain, B3 v1 gates, B5 entitlement decorator, B6 payout dup guard.

Every hunk is exact-match asserted; any mismatch aborts without writing.
Run from project root:  python3 api/tools/patch_index_remediation.py
"""
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TARGET = "api/index.py"
BACKUP = "/tmp/index.py.pre_remediation.bak"

HUNKS = []


def h(old, new):
    """Register an exact source-replacement hunk."""
    HUNKS.append((old, new))


# --- 0. B5: centralized product-entitlement decorator ---------------------------
h('''def is_moderator(uid):''',
  '''def has_psemine_access(uid):
    """B5: backend PSEmine entitlement check — THE authoritative source is the
    same users/{uid}.productAccess.psemine boolean the frontend gate reads.
    Admin/root users are not exempt: PSEmine is a product, not a role.
    Returns True only on an explicit true flag; missing docs/fields deny."""
    db = get_db()
    if not db:
        return False
    user_doc = db.collection('users').document(uid).get()
    if not user_doc.exists:
        return False
    pa = user_doc.to_dict().get('productAccess') or {}
    return pa.get('psemine') is True


def require_psemine_access(f):
    """Centralized entitlement decorator for every /api/mine/* money endpoint.
    Must run AFTER verify_token (reads request.user['uid'])."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not has_psemine_access(request.user['uid']):
            return jsonify({"success": False, "error": "PSEMINE_ACCESS_DENIED",
                            "message": "PSEmine access is not enabled for this account."}), 403
        return f(*args, **kwargs)
    return decorated_function


def is_moderator(uid):''')

# --- 1. B1 reader: v1 withdrawals ------------------------------------------------
h('''    # 1. Canonical ledger balance (accruedMinor) + legacy read-model, minus payouts
    _u = db.collection('psemine_users').document(uid).get().to_dict() or {}
    _ledger_minor = int(_u.get('accruedMinor') or 0)
    _legacy_minor = _pse_engine._legacy_balance_minor(_u)
    _debited_minor = _pse_engine._paid_out_minor(db, uid) + _pse_engine._legacy_paid_out_minor(db, uid)
    accumulated_output = max(0.0, (_ledger_minor + _legacy_minor - _debited_minor) / 100.0)''',
  '''    # 1. Canonical ledger balance (accruedMinor) + legacy read-model, minus payouts.
    # (B1) _legacy_balance_minor returns 0 once absorbed — legacy counted EXACTLY ONCE.
    _u = db.collection('psemine_users').document(uid).get().to_dict() or {}
    _ledger_minor = int(_u.get('accruedMinor') or 0)
    _legacy_minor = _pse_engine._legacy_balance_minor(_u)
    _debited_minor = _pse_engine._paid_out_minor(db, uid) + _pse_engine._legacy_paid_out_minor(db, uid)
    accumulated_output = max(0.0, (_ledger_minor + _legacy_minor - _debited_minor) / 100.0)''')

# --- 2. B3: v1 orders/create campaign gate ---------------------------------------
h('''        if not tool_id:
            return jsonify({"success": False, "error": "MISSING_TOOL_ID", "message": "Please specify a tool ID."}), 400''',
  '''        # (B3) Legacy purchase path respects the canonical campaign lifecycle.
        import psemine_engine as _pse_engine
        _camp, _eff, _ = _pse_engine.campaign_lifecycle_state(db)
        if _eff == 'ended':
            return jsonify({"success": False, "error": "CAMPAIGN_ENDED", "message": "Campaign has ended."}), 409
        if _eff != 'active' or _camp.get('purchaseEnabled') is False:
            return jsonify({"success": False, "error": "PURCHASES_DISABLED", "message": "Tool purchases are currently closed."}), 403

        if not tool_id:
            return jsonify({"success": False, "error": "MISSING_TOOL_ID", "message": "Please specify a tool ID."}), 400''')

# --- 3. B3: v1 verify-payment campaign gate + recovery evidence ------------------
h('''    if order.get('status') == 'confirmed':
        return jsonify({"success": False, "error": "ORDER_ALREADY_CONFIRMED", "message": "This order has already been verified and paid."}), 409''',
  '''    if order.get('status') == 'confirmed':
        return jsonify({"success": False, "error": "ORDER_ALREADY_CONFIRMED", "message": "This order has already been verified and paid."}), 409

    # (B3) Campaign lifecycle gate at verification time. NO activation after end.
    import psemine_engine as _pse_engine
    _camp, _eff, _ = _pse_engine.campaign_lifecycle_state(db)
    if _eff == 'ended':
        _pse_engine.create_payment_recovery(db, uid, tx_hash=tx_hash,
            quote_id=order_id, reason='CAMPAIGN_ENDED_AT_VERIFICATION_LEGACY')
        return jsonify({"success": False, "error": "CAMPAIGN_ENDED", "message": "Campaign has ended; this payment was recorded for manual review."}), 409
    if _camp.get('purchaseEnabled') is False:
        _pse_engine.create_payment_recovery(db, uid, tx_hash=tx_hash,
            quote_id=order_id, reason='PURCHASES_DISABLED_AT_VERIFICATION_LEGACY')
        return jsonify({"success": False, "error": "PURCHASES_DISABLED", "message": "Tool purchases are currently closed."}), 403''')

# --- 4. B2/B1: v1 verify-payment ownership hydration + absorption flag ------------
h('''        own_payload = {
            'id': own_ref.id,
            'userId': uid,
            'toolId': order['toolId'],
            'orderId': order_id,
            'paymentId': pay_doc_id,
            'txHash': tx_hash,
            'purchasePriceGbp': order['priceGbp'],
            'miningRateGbpPerHour': tool.get('miningRateGbpPerHour', 0.10),
            'campaignId': tool.get('campaignId', PSEMINE_CAMPAIGN_DOC_ID),
            'status': 'active',
            'acquiredAt': now_iso,
            'createdAt': firestore.SERVER_TIMESTAMP,
        }
        txn.set(own_ref, own_payload)''',
  '''        own_payload = {
            'id': own_ref.id,
            'userId': uid,
            'toolId': order['toolId'],
            'orderId': order_id,
            'paymentId': pay_doc_id,
            'txHash': tx_hash,
            'purchasePriceGbp': order['priceGbp'],
            'miningRateGbpPerHour': tool.get('miningRateGbpPerHour', 0.10),
            'campaignId': tool.get('campaignId', PSEMINE_CAMPAIGN_DOC_ID),
            'status': 'active',
            'acquiredAt': now_iso,
            # (B1/B2) canonical balance anchor + cycle fields so v1-created
            # ownerships never become anchor-less and never double-count the
            # legacy balance at first checkpoint.
            'accruedBalanceAbsorbed': True,
            'cycleIndex': 0,
            'cycleStartedAt': now_iso,
            'lastAccruedAt': now_iso,
            'createdAt': firestore.SERVER_TIMESTAMP,
        }
        txn.set(own_ref, own_payload)''')

# --- 5. B2: cron settlement chain (no activatedAt fallback) ----------------------
h('''            anchor_raw = d.get('lastAccruedAt') or d.get('cycleStartedAt') or d.get('activatedAt')''',
  '''            # (B2) no activatedAt fallback: anchor-less legacy ownerships are
            # reconciled by the engine at reconciliation time, not by cron.
            anchor_raw = d.get('lastAccruedAt') or d.get('cycleStartedAt')''')

# --- 6. B6: duplicate payout txHash guard ----------------------------------------
h('''    if action == 'APPROVE' and not tx_hash:
        return jsonify({"success": False, "error": "MISSING_TX_HASH", "message": "Valid payout txHash is required to approve withdrawal."}), 400''',
  '''    if action == 'APPROVE' and not tx_hash:
        return jsonify({"success": False, "error": "MISSING_TX_HASH", "message": "Valid payout txHash is required to approve withdrawal."}), 400

    # (B6) duplicate payout txHash protection — normalized comparison.
    if action == 'APPROVE':
        import psemine_core as _pse_core
        _norm = _pse_core.normalize_tx_hash(tx_hash)
        _dup = db.collection('psemine_withdrawals') \\
            .where('status', '==', 'completed') \\
            .where('payoutTxHash', '==', _norm).limit(1).get()
        if list(_dup):
            return jsonify({"success": False, "error": "DUPLICATE_PAYOUT_TX",
                            "message": "This transaction hash is already attached to another completed payout."}), 409''')

# --- 7. B6 consistency: store the normalized hash --------------------------------
h('''    if action == 'APPROVE':
        wd_ref.update({
            'status': 'completed',
            'adminNotes': admin_notes,
            'payoutTxHash': tx_hash or None,''',
  '''    if action == 'APPROVE':
        import psemine_core as _pse_core
        _norm = _pse_core.normalize_tx_hash(tx_hash)
        wd_ref.update({
            'status': 'completed',
            'adminNotes': admin_notes,
            'payoutTxHash': _norm or None,''')


def main():
    """Apply the asserted source replacements and write a backup."""
    with open(TARGET, "r", encoding="utf-8") as f:
        out = f.read()

    applied = 0
    failed = []
    for i, (old, new) in enumerate(HUNKS):
        n = out.count(old)
        if n != 1:
            failed.append((i, n, old[:90]))
            continue
        out = out.replace(old, new, 1)
        applied += 1

    if failed:
        print("ABORT - hunks failed (index, matches, preview):")
        for i, n, prev in failed:
            print(f"  #{i}: matches={n} :: {prev!r}")
        sys.exit(1)

    shutil.copyfile(TARGET, BACKUP)
    with open(TARGET, "w", encoding="utf-8") as f:
        f.write(out)
    print(f"OK: applied {applied} hunks; backup at {BACKUP}")


if __name__ == "__main__":
    main()
