# ============================================================================
# CANONICAL PSEMINE ENDPOINTS (Phase 1)
# Single accrual writer, single referral qualification path, server-controlled
# wallet, backend purchase intents, operating cycles + maintenance, recovery,
# and the cron lifecycle accelerator. Appended at module EOF; all routes are
# registered before the __main__ guard.
# ============================================================================

@app.route('/api/mine/state', methods=['GET'])
@verify_token
def mine_state():
    """Canonical user state + accrual checkpoint. THE balance source for the UI."""
    db = get_db()
    if not db: return jsonify({"success": False, "error": "SERVICE_UNAVAILABLE"}), 503
    uid = request.user['uid']
    import psemine_engine as _pse_engine
    _pse_engine.ensure_psemine_user(db, uid)
    ck = _pse_engine.accrual_checkpoint(db, uid, source='state')
    u = db.collection('psemine_users').document(uid).get().to_dict() or {}
    owns = db.collection('psemine_tool_ownership').where('userId', '==', uid).get()
    now = _pse_engine.utcnow()
    tools = []
    for s in owns:
        d = {**(s.to_dict() or {}), 'id': s.id}
        c = _pse_engine.derive_cycle(d, now)
        d['cycleState'] = c.state
        d['maintenanceRequired'] = c.maintenance_required
        d['cycleEndsAt'] = c.cycle_end_iso
        tools.append(d)
    camp, eff, _ = _pse_engine.campaign_lifecycle_state(db, force_write=False)
    accrued_minor = int(u.get('accruedMinor') or 0) + _pse_engine._legacy_balance_minor(u)
    debited = _pse_engine._paid_out_minor(db, uid) + _pse_engine._legacy_paid_out_minor(db, uid)
    counts = u.get('toolOwnershipCounts') or {}
    qual = int(u.get('qualifiedReferralsCount') or 0)
    from psemine_core import compute_tool_capacity_minor, compute_referral_capacity_minor, compute_total_capacity_minor
    return jsonify({
        "success": True,
        "user": {
            "accruedMinor": accrued_minor,
            "accruedGBP": round(accrued_minor / 100.0, 6),
            "debitedMinor": debited,
            "availableMinor": max(0, accrued_minor - debited),
            "toolCapacityGBPPerHour": round(compute_tool_capacity_minor(counts) / 100.0, 2),
            "referralCapacityGBPPerHour": round(compute_referral_capacity_minor(qual) / 100.0, 2),
            "totalCapacityGBPPerHour": round(compute_total_capacity_minor(counts, qual) / 100.0, 2),
            "qualifiedReferralsCount": qual,
            "payoutWallet": u.get('payoutWallet'),
            "connectedWallet": u.get('connectedWallet'),
            "status": u.get('status'),
        },
        "tools": tools,
        "campaign": {k: v for k, v in camp.items() if not str(k).startswith('_')} if camp else None,
        "effectiveCampaignStatus": eff,
        "checkpoint": {"earnedMinor": ck.get("earnedMinor", 0), "duplicate": ck.get("duplicate", False)},
    })

@app.route('/api/mine/tools/<ownership_id>/maintain', methods=['POST'])
@verify_token
def mine_maintain(ownership_id):
    """Canonical maintenance: settle eligible time, advance the operating cycle.
    Free, idempotent per cycle; no reward is minted by maintenance."""
    db = get_db()
    if not db: return jsonify({"success": False, "error": "SERVICE_UNAVAILABLE"}), 503
    uid = request.user['uid']
    import psemine_engine as _pse_engine
    result = _pse_engine.maintain_ownership(db, uid, ownership_id)
    if not result.get("ok"):
        code = result.get("error", "MAINTENANCE_FAILED")
        status = 404 if code == "OWNERSHIP_NOT_FOUND" else 403 if code == "FORBIDDEN" else 409
        return jsonify({"success": False, "error": code, "message": code.replace('_', ' ').title()}), status
    return jsonify({"success": True, **result})

@app.route('/api/mine/purchases/create', methods=['POST'])
@verify_token
def mine_create_purchase():
    """Backend-authoritative purchase intent bound to a persisted server quote."""
    db = get_db()
    if not db: return jsonify({"success": False, "error": "SERVICE_UNAVAILABLE"}), 503
    uid = request.user['uid']
    data = request.get_json() or {}
    quote_id = (data.get('quoteId') or '').strip()
    payment_wallet = (data.get('paymentWallet') or '').strip().lower()

    import re as _re
    if not _re.match(r'^0x[0-9a-fA-F]{40}$', payment_wallet or ''):
        return jsonify({"success": False, "error": "INVALID_PAYMENT_WALLET"}), 400

    import psemine_engine as _pse_engine
    camp, eff, _ = _pse_engine.campaign_lifecycle_state(db)
    if eff == 'ended':
        return jsonify({"success": False, "error": "CAMPAIGN_ENDED", "message": "Campaign has ended."}), 409
    if eff != 'active' or camp.get('purchaseEnabled') is False:
        return jsonify({"success": False, "error": "PURCHASES_DISABLED", "message": "Tool purchases are currently closed."}), 403

    q_ref = db.collection('psemine_quotes').document(quote_id)
    q_snap = q_ref.get()
    if not q_snap.exists:
        return jsonify({"success": False, "error": "INVALID_QUOTE", "message": "Quote not found. Generate a new quote."}), 404
    q = q_snap.to_dict() or {}
    if q.get('userId') != uid:
        return jsonify({"success": False, "error": "INVALID_QUOTE", "message": "Quote terms do not match this account."}), 403
    try:
        exp = datetime.fromisoformat(str(q.get('expiresAt')).replace('Z', '+00:00'))
        if exp.tzinfo is None: exp = exp.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > exp:
            return jsonify({"success": False, "error": "QUOTE_EXPIRED", "message": "Quote expired. Request a new quote."}), 409
    except Exception:
        return jsonify({"success": False, "error": "INVALID_QUOTE_EXPIRY"}), 400

    tool_id = q.get('toolId')
    tool_cfg = LOCKED_PSEMINE_TOOLS_CONFIG.get(tool_id)
    if not tool_cfg:
        return jsonify({"success": False, "error": "INVALID_TOOL_TIER"}), 400

    user_ref = db.collection('psemine_users').document(uid)
    u_snap = user_ref.get()
    u = u_snap.to_dict() if u_snap.exists else {}
    counts = dict(u.get('toolOwnershipCounts') or {})
    if counts.get(tool_id, 0) >= tool_cfg['max_per_user']:
        return jsonify({"success": False, "error": "MAX_OWNERSHIP_REACHED", "message": f"Maximum ownership reached for {tool_cfg['name']}."}), 409

    # One active intent per (user, tool): return the existing one idempotently
    existing = db.collection('psemine_purchases').where('userId', '==', uid).where('toolId', '==', tool_id).where('status', '==', 'awaiting_payment').get()
    for e in existing:
        return jsonify({"success": True, "purchaseId": e.id, "existing": True, "purchase": e.to_dict()})

    now_dt = datetime.now(timezone.utc)
    purchase_id = f"pse_pur_{tool_id}_{int(now_dt.timestamp() * 1000)}_{uid[:6]}"
    payload = {
        'id': purchase_id,
        'userId': uid,
        'toolId': tool_id,
        'toolName': tool_cfg['name'],
        'toolVersion': tool_cfg['version'],
        'quoteId': quote_id,
        'quotedGBPAmount': tool_cfg['price_gbp'],
        'quotedBNBAmount': q.get('bnbAmount'),
        'quotedBNBWei': q.get('bnbAmountWei'),
        'exchangeRateBNBGBP': q.get('exchangeRateBNBGBP'),
        'receiverWallet': q.get('receiverWallet'),
        'paymentWallet': payment_wallet,
        'transactionHash': None,
        'network': 'BNB Smart Chain',
        'chainId': PSEMINE_BSC_CHAIN_ID,
        'status': 'awaiting_payment',
        'confirmations': 0,
        'requiredConfirmations': PSEMINE_MIN_CONFIRMATIONS,
        'createdAt': firestore.SERVER_TIMESTAMP,
        'expiresAt': q.get('expiresAt'),
        'confirmedAt': None,
        'activatedAt': None,
    }
    db.collection('psemine_purchases').document(purchase_id).set(payload)
    return jsonify({"success": True, "purchaseId": purchase_id, "existing": False, "purchase": payload})

@app.route('/api/mine/wallet', methods=['POST'])
@verify_token
def mine_set_wallet():
    """Server-controlled wallet write (payout + connected) with campaign cutoff."""
    db = get_db()
    if not db: return jsonify({"success": False, "error": "SERVICE_UNAVAILABLE"}), 503
    uid = request.user['uid']
    data = request.get_json() or {}
    wallet = (data.get('wallet') or '').strip()
    import psemine_engine as _pse_engine
    result = _pse_engine.update_payout_wallet(db, uid, wallet)
    if not result.get("ok"):
        code = result.get("error", "WALLET_UPDATE_FAILED")
        status = 400 if code == "INVALID_ADDRESS" else 409
        return jsonify({"success": False, "error": code, "message": code.replace('_', ' ').title()}), status
    return jsonify({"success": True, "payoutWallet": result.get("payoutWallet")})

@app.route('/api/mine/referrals/register', methods=['POST'])
@verify_token
def mine_register_referral():
    """Backend referral registration (deterministic identity, self/circular/dup safe)."""
    db = get_db()
    if not db: return jsonify({"success": False, "error": "SERVICE_UNAVAILABLE"}), 503
    uid = request.user['uid']
    data = request.get_json() or {}
    code = (data.get('referralCode') or '').strip()
    if not code:
        return jsonify({"success": False, "error": "MISSING_REFERRAL_CODE"}), 400
    import psemine_engine as _pse_engine
    camp, eff, _ = _pse_engine.campaign_lifecycle_state(db)
    if eff in ('settling', 'ended', 'payout', 'closed', 'archived') or camp.get('referralEnabled') is False:
        return jsonify({"success": False, "error": "REFERRALS_DISABLED"}), 403
    result = _pse_engine.register_referral(db, uid, code)
    if not result.get("ok"):
        code_map = {"REFERRER_NOT_FOUND": 404, "SELF_REFERRAL": 409, "CIRCULAR_REFERRAL": 409}
        return jsonify({"success": False, "error": result.get("error")}), code_map.get(result.get("error"), 400)
    return jsonify({"success": True, "referralId": result.get("referralId"), "existing": result.get("existing", False)})

@app.route('/api/mine/withdrawals/create', methods=['POST'])
@verify_token
def mine_create_withdrawal():
    """Canonical payout request path (blocked during active campaign; min £10)."""
    db = get_db()
    if not db: return jsonify({"success": False, "error": "SERVICE_UNAVAILABLE"}), 503
    uid = request.user['uid']
    data = request.get_json() or {}
    amount = data.get('amountGbp')
    try:
        amount = float(amount)
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "INVALID_AMOUNT"}), 400
    import psemine_engine as _pse_engine
    result = _pse_engine.create_payout_request(db, uid, amount)
    if not result.get("ok"):
        status = {"BELOW_MINIMUM": 400, "CAMPAIGN_ACTIVE": 403, "NO_PAYOUT_WALLET": 400,
                  "INSUFFICIENT_BALANCE": 400, "PENDING_PAYOUT_EXISTS": 409}.get(result.get("error"), 400)
        return jsonify({"success": False, "error": result.get("error"), "message": result.get("message", str(result.get("error", "")).replace('_', ' ').title())}), status
    return jsonify({"success": True, "withdrawalId": result.get("withdrawalId")})

@app.route('/api/mine/cron/lifecycle', methods=['POST', 'GET'])
def mine_cron_lifecycle():
    """Lifecycle accelerator: enforces endAt, settles all active ownerships.
    Protected by CRON_SECRET header/query. Idempotent; lazily enforced anywhere."""
    import psemine_engine as _pse_engine
    db = get_db()
    if not db: return jsonify({"success": False, "error": "SERVICE_UNAVAILABLE"}), 503
    secret = os.environ.get('CRON_SECRET')
    provided = request.headers.get('X-Cron-Secret') or request.args.get('secret')
    if secret:
        if not provided or provided != secret:
            return jsonify({"success": False, "error": "FORBIDDEN"}), 403
    camp, eff, ended_now = _pse_engine.campaign_lifecycle_state(db)
    checked = 0
    if eff in ('ended', 'settling'):
        end_at = _pse_engine._parse(camp['endAt']) if camp.get('endAt') else _pse_engine.utcnow()
        owns = db.collection('psemine_tool_ownership').where('status', 'in', ['active', 'cycle_complete', 'maintenance_required']).get()
        for s in owns:
            d = s.to_dict() or {}
            uid_o = d.get('userId')
            if not uid_o: continue
            checked += 1
            anchor_raw = d.get('lastAccruedAt') or d.get('cycleStartedAt') or d.get('activatedAt')
            if anchor_raw:
                anchor = _pse_engine._parse(anchor_raw)
                if anchor < end_at:
                    _pse_engine.accrual_checkpoint(db, uid_o, source='cron_settle')
            s.reference.update({"status": "settling", "settledAt": firestore.SERVER_TIMESTAMP})
    return jsonify({"success": True, "effectiveStatus": eff, "campaignEndedNow": ended_now, "ownershipsChecked": checked})

@app.route('/api/admin/mine/payment-recovery', methods=['GET'])
@verify_token
def admin_mine_payment_recovery():
    db = get_db()
    if not db: return jsonify({"success": False, "error": "SERVICE_UNAVAILABLE"}), 503
    if not is_moderator(request.user['uid']): return jsonify({"error": "UNAUTHORIZED"}), 403
    import psemine_engine as _pse_engine
    status = (request.args.get('status') or 'open').strip()
    return jsonify({"success": True, "cases": _pse_engine.admin_list_payment_recovery(db, status=status)})

@app.route('/api/admin/mine/payment-recovery/<recovery_id>/resolve', methods=['POST'])
@verify_token
def admin_mine_payment_recovery_resolve(recovery_id):
    db = get_db()
    if not db: return jsonify({"success": False, "error": "SERVICE_UNAVAILABLE"}), 503
    uid = request.user['uid']
    if not is_admin(uid): return jsonify({"error": "SUPER_ADMIN_REQUIRED"}), 403
    data = request.get_json() or {}
    import psemine_engine as _pse_engine
    result = _pse_engine.admin_resolve_payment_recovery(
        db, recovery_id, uid,
        action=(data.get('action') or '').strip(),
        notes=(data.get('notes') or '').strip(),
        purchase_id=(data.get('purchaseId') or '').strip() or None)
    if not result.get("ok"):
        return jsonify({"success": False, "error": result.get("error")}), 404 if result.get("error") == "NOT_FOUND" else 400
    return jsonify({"success": True})

@app.route('/api/admin/mine/tools/<tool_id>/deprecate', methods=['POST'])
@verify_token
def admin_mine_deprecate_tool(tool_id):
    db = get_db()
    if not db: return jsonify({"success": False, "error": "SERVICE_UNAVAILABLE"}), 503
    uid = request.user['uid']
    if not is_admin(uid): return jsonify({"error": "SUPER_ADMIN_REQUIRED"}), 403
    data = request.get_json() or {}
    import psemine_engine as _pse_engine
    result = _pse_engine.admin_deprecate_tool(db, tool_id, uid, reason=(data.get('reason') or '').strip())
    if not result.get("ok"):
        return jsonify({"success": False, "error": result.get("error")}), 404 if result.get("error") == "NOT_FOUND" else 400
    return jsonify({"success": True})
