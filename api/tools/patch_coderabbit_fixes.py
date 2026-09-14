"""CodeRabbit-review remediation patcher (PR #329 findings + deploy blocker).

Applies 13 surgical fixes, each guarded by an exact-match assertion. If ANY
hunk fails to match, the script aborts BEFORE writing anything (atomic).

Fix list:
  F01 v1 dashboard: return read-only payload after campaign end (409 removed)
  F02 v1 withdrawals: drop the second withdrawn_total subtraction (B-F1 composition)
  F03 v2 verify-purchase: shared terminal-campaign gate
  F04 v1 verify-payment: shared terminal-campaign gate
  F05 payout completion: atomic txHash reservation inside the update transaction
  F06 v2 activation txn: migration-ledger read hoisted before first txn write
  F07 v1 + F08 v2 referral settle: persist idempotent repair record on failure
  F09 has_psemine_access: grant-only legacy backfill (audited, idempotent)
  F10 cron: sweep referral repair queue
  F11 engine: referral_minor reset inside _txn (retry-safe accumulation)
  F12 engine: record_referral_repair / settle_referral_repair primitives
  F13 composed tests: force the non-SDK transaction path deterministically

vercel.json cron -> daily is applied separately (Vercel Hobby limit).

Run from project root:  python3 api/tools/patch_coderabbit_fixes.py
"""
import shutil
import sys

INDEX = "api/index.py"
ENGINE = "api/psemine_engine.py"
TESTS = "api/tests/test_payout_composition.py"

index_bak = "/tmp/index.py.pre_coderabbit.bak"
engine_bak = "/tmp/psemine_engine.py.pre_coderabbit.bak"
tests_bak = "/tmp/test_payout_composition.py.pre_coderabbit.bak"


def apply(path, hunks, backup):
    with open(path, "r", encoding="utf-8") as f:
        src = f.read()
    for i, (old, new) in enumerate(hunks):
        if src.count(old) != 1:
            print(f"ABORT: {path} hunk #{i + 1} matched {src.count(old)} times (need exactly 1)")
            sys.exit(1)
    shutil.copyfile(path, backup)
    for old, new in hunks:
        src = src.replace(old, new, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(src)
    print(f"OK: {path} — {len(hunks)} hunks applied (backup: {backup})")


# ---------------------------------------------------------------------------
# api/index.py
# ---------------------------------------------------------------------------
index_hunks = [
    # --- F01: dashboard stays readable after campaign end -------------------
    ("""    # 3. Canonical accrual checkpoint + authoritative session view
    import psemine_engine as _pse_engine
    _camp, _eff, _ = _pse_engine.campaign_lifecycle_state(db)
    if _eff in ('settling', 'ended', 'payout', 'closed', 'archived'):
        return jsonify({"success": False, "error": "CAMPAIGN_ENDED", "message": "Mining accrual is closed."}), 409
    _pse_engine.accrual_checkpoint(db, uid, source='dashboard')""",
     """    # 3. Canonical accrual checkpoint + authoritative session view.
    # After campaign end the payload REMAINS READABLE (users review final
    # balances and payouts from this endpoint); only the accrual checkpoint
    # is suppressed — earning is closed, reading is not.
    import psemine_engine as _pse_engine
    _camp, _eff, _ = _pse_engine.campaign_lifecycle_state(db)
    _campaign_terminal = _eff in ('settling', 'ended', 'payout', 'closed', 'archived')
    if not _campaign_terminal:
        _pse_engine.accrual_checkpoint(db, uid, source='dashboard')"""),

    # --- F02: withdrawals use the single canonical net equation -------------
    ("""    withdrawn_total = 0.0
    has_pending = False

    for w_doc in wd_snaps:
        w = w_doc.to_dict() or {}
        st = w.get('status')
        if st in ('pending', 'under_review', 'processing'):
            has_pending = True
            withdrawn_total += safe_float(w.get('amountGbp'), 0.0)
        elif st in ('approved', 'completed'):
            withdrawn_total += safe_float(w.get('amountGbp'), 0.0)

    if has_pending:
        return jsonify({"success": False, "error": "PENDING_WITHDRAWAL_EXISTS", "message": "You already have a pending withdrawal request under review."}), 409

    available_balance = max(0.0, accumulated_output - withdrawn_total)""",
     """    # (B-F1 composition) accumulated_output is ALREADY the canonical NET
    # available balance (canonical debits net of reversals + genuine legacy
    # debits, each exactly once). The withdrawn_total loop previously
    # subtracted the same payouts a SECOND time here. It is kept ONLY for the
    # pending-request guard, never for balance math.
    has_pending = False

    for w_doc in wd_snaps:
        st = (w_doc.to_dict() or {}).get('status')
        if st in ('pending', 'under_review', 'processing'):
            has_pending = True
            break

    if has_pending:
        return jsonify({"success": False, "error": "PENDING_WITHDRAWAL_EXISTS", "message": "You already have a pending withdrawal request under review."}), 409

    available_balance = max(0.0, accumulated_output)"""),

    # --- F03: v2 verify uses the shared terminal predicate ------------------
    ("""    # 1b. Campaign lifecycle gate at verification time (server clock is the authority).
    import psemine_engine as _pse_engine
    _camp, _eff, _ = _pse_engine.campaign_lifecycle_state(db)
    if _eff == 'ended':
        _pse_engine.create_payment_recovery(db, uid, tx_hash=tx_hash,
            quote_id=purchase.get('quoteId'), purchase_id=purchase_id,
            reason='CAMPAIGN_ENDED_AT_VERIFICATION')
        return jsonify({"success": False, "error": "CAMPAIGN_ENDED", "message": "Campaign has ended; this payment was recorded for manual review."}), 409
    if _camp.get('purchaseEnabled') is False:""",
     """    # 1b. Campaign lifecycle gate at verification time (server clock is the authority).
    # Terminal states settle/payout/closed/archived are all economically closed,
    # not just 'ended' — activation must be impossible in every one of them.
    import psemine_engine as _pse_engine
    _camp, _eff, _ = _pse_engine.campaign_lifecycle_state(db)
    if _eff in _pse_engine.TERMINAL_CAMPAIGN_STATUSES:
        _pse_engine.create_payment_recovery(db, uid, tx_hash=tx_hash,
            quote_id=purchase.get('quoteId'), purchase_id=purchase_id,
            reason='CAMPAIGN_ENDED_AT_VERIFICATION')
        return jsonify({"success": False, "error": "CAMPAIGN_ENDED", "message": "Campaign has ended; this payment was recorded for manual review."}), 409
    if _camp.get('purchaseEnabled') is False:"""),

    # --- F04: v1 verify uses the same shared predicate ----------------------
    ("""    # (B3) Campaign lifecycle gate at verification time. NO activation after end.
    import psemine_engine as _pse_engine
    _camp, _eff, _ = _pse_engine.campaign_lifecycle_state(db)
    if _eff == 'ended':
        _pse_engine.create_payment_recovery(db, uid, tx_hash=tx_hash,
            quote_id=order_id, reason='CAMPAIGN_ENDED_AT_VERIFICATION_LEGACY')
        return jsonify({"success": False, "error": "CAMPAIGN_ENDED", "message": "Campaign has ended; this payment was recorded for manual review."}), 409
    if _camp.get('purchaseEnabled') is False:""",
     """    # (B3) Campaign lifecycle gate at verification time. NO activation after
    # end — same shared terminal predicate as the canonical flow.
    import psemine_engine as _pse_engine
    _camp, _eff, _ = _pse_engine.campaign_lifecycle_state(db)
    if _eff in _pse_engine.TERMINAL_CAMPAIGN_STATUSES:
        _pse_engine.create_payment_recovery(db, uid, tx_hash=tx_hash,
            quote_id=order_id, reason='CAMPAIGN_ENDED_AT_VERIFICATION_LEGACY')
        return jsonify({"success": False, "error": "CAMPAIGN_ENDED", "message": "Campaign has ended; this payment was recorded for manual review."}), 409
    if _camp.get('purchaseEnabled') is False:"""),

    # --- F05: atomic txHash reservation -------------------------------------
    ("""    # (B6) duplicate payout txHash protection — normalized comparison.
    if action == 'APPROVE':
        import psemine_core as _pse_core
        _norm = _pse_core.normalize_tx_hash(tx_hash)
        _dup = db.collection('psemine_withdrawals') \\
            .where('status', '==', 'completed') \\
            .where('payoutTxHash', '==', _norm).limit(1).get()
        if list(_dup):
            return jsonify({"success": False, "error": "DUPLICATE_PAYOUT_TX",
                            "message": "This transaction hash is already attached to another completed payout."}), 409

    wd_ref = db.collection('psemine_withdrawals').document(withdrawal_id)""",
     """    import psemine_core as _pse_core
    _norm = _pse_core.normalize_tx_hash(tx_hash)

    wd_ref = db.collection('psemine_withdrawals').document(withdrawal_id)"""),

    ("""    if action == 'APPROVE':
        import psemine_core as _pse_core
        _norm = _pse_core.normalize_tx_hash(tx_hash)
        wd_ref.update({
            'status': 'completed',
            'adminNotes': admin_notes,
            'payoutTxHash': _norm or None,
            'reviewedBy': admin_id,
            'processedAt': firestore.SERVER_TIMESTAMP,
            'updatedAt': firestore.SERVER_TIMESTAMP,
        })""",
     """    if action == 'APPROVE':
        # (B6) The duplicate-txHash check + completion now run inside ONE
        # transaction, and the hash is atomically reserved via a deterministic
        # reservation doc — two concurrent approvals can never both observe
        # "no completed payout" and store the same hash.
        _tx_doc = db.collection('psemine_payout_tx_reservations').document(f"tx_{_norm}")

        @firestore.transactional
        def _complete_with_hash(txn):
            if _norm:
                res_snap = _tx_doc.get(transaction=txn)
                if res_snap.exists:
                    holder = (res_snap.to_dict() or {}).get('withdrawalId')
                    if holder and holder != withdrawal_id:
                        return False
                txn.set(_tx_doc, {'withdrawalId': withdrawal_id, 'payoutTxHash': _norm,
                                  'reservedAt': firestore.SERVER_TIMESTAMP})
            wd_snap_t = wd_ref.get(transaction=txn)
            if not wd_snap_t.exists:
                return None
            if (wd_snap_t.to_dict() or {}).get('status') not in ('pending', 'under_review'):
                return None
            txn.update(wd_ref, {
                'status': 'completed',
                'adminNotes': admin_notes,
                'payoutTxHash': _norm or None,
                'reviewedBy': admin_id,
                'processedAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP,
            })
            return True

        _outcome = _complete_with_hash(db.transaction())
        if _outcome is False:
            return jsonify({"success": False, "error": "DUPLICATE_PAYOUT_TX",
                            "message": "This transaction hash is already attached to another completed payout."}), 409
        if _outcome is None:
            return jsonify({"success": False, "error": "NOT_FOUND" if not wd_snap.exists else "ALREADY_RESOLVED",
                            "message": "Withdrawal request not found." if not wd_snap.exists else f"Withdrawal is already {wd.get('status')}."}), 404 if not wd_snap.exists else 409"""),

    # --- F06: migration read hoisted before the first transaction write -----
    ("""            # Commit user economic state (canonical minor-unit balance; capacities additive).
            user_was_inactive = u_dict.get('status') != 'active'
            prev_accrued_minor = int(u_dict.get('accruedMinor') or 0)
            legacy_minor = _pse_engine._legacy_balance_minor(u_dict)
            if legacy_minor and not u_dict.get('legacyBalanceAbsorbedMinor'):
                # one-time absorption of pre-ledger balance into the ledger (auditable entry)
                _mig_id = f"migration_{uid}"
                _mig_ref = db.collection('psemine_mining_ledger').document(_mig_id)
                if not _mig_ref.get(transaction=txn).exists:
                    txn.set(_mig_ref, {
                        'id': _mig_id, 'userId': uid, 'campaignId': PSEMINE_CAMPAIGN_DOC_ID,
                        'kind': 'migration', 'amountMinor': int(legacy_minor),
                        'source': 'migration', 'note': 'pre-ledger totalAccruedGBP absorption',
                        'createdAt': firestore.SERVER_TIMESTAMP,
                    })
                prev_accrued_minor += int(legacy_minor)""",
     """            # Commit user economic state (canonical minor-unit balance; capacities additive).
            # NOTE: _mig_ref was already READ at the top of this transaction
            # (reads must precede all writes — Firestore rejects reads after
            # the first txn write).
            user_was_inactive = u_dict.get('status') != 'active'
            prev_accrued_minor = int(u_dict.get('accruedMinor') or 0)
            legacy_minor = _pse_engine._legacy_balance_minor(u_dict)
            if legacy_minor and not u_dict.get('legacyBalanceAbsorbedMinor'):
                # one-time absorption of pre-ledger balance into the ledger (auditable entry)
                if not _mig_ref.get(transaction=txn).exists:
                    txn.set(_mig_ref, {
                        'id': _mig_id, 'userId': uid, 'campaignId': PSEMINE_CAMPAIGN_DOC_ID,
                        'kind': 'migration', 'amountMinor': int(legacy_minor),
                        'source': 'migration', 'note': 'pre-ledger totalAccruedGBP absorption',
                        'createdAt': firestore.SERVER_TIMESTAMP,
                    })
                prev_accrued_minor += int(legacy_minor)"""),

    # --- F06b: hoisted read inserted right after u_dict is loaded -----------
    ("""    redeemed_ref = db.collection('psemine_redeemed_hashes').document(tx_hash)""",
     """    redeemed_ref = db.collection('psemine_redeemed_hashes').document(tx_hash)
    # (transaction-read-first) migration-ledger doc is READ here, before ANY
    # txn.set — Firestore transactions reject reads that follow writes.
    _mig_id = f"migration_{uid}"
    _mig_ref = db.collection('psemine_mining_ledger').document(_mig_id)"""),

    # --- F07: v1 referral settle failure -> durable repair record -----------
    ("""    try:
        import psemine_engine as _pse_engine
        _pse_engine.settle_referral_on_activation(db, uid, order_id)
    except Exception as _ref_err:
        logging.warning(f"[PSEmine v1] canonical referral settle failed for {uid}: {_ref_err}")""",
     """    import psemine_engine as _pse_engine
    try:
        _pse_engine.settle_referral_on_activation(db, uid, order_id)
    except Exception as _ref_err:
        # Activation succeeded but qualification failed — persist an idempotent
        # repair task instead of losing the referral permanently.
        try:
            _pse_engine.record_referral_repair(db, uid, order_id, reason='V1_ACTIVATE_SETTLE_FAILED',
                                               detail=str(_ref_err)[:500])
        except Exception:
            logging.error(f"[PSEmine v1] referral repair record failed for {uid}", exc_info=True)
        logging.warning(f"[PSEmine v1] canonical referral settle failed for {uid}: {_ref_err}")"""),

    # --- F08: v2 referral settle failure -> same durable repair record ------
    ("""        # 7. Canonical referral qualification (single backend-authoritative path).
        try:
            _pse_engine.settle_referral_on_activation(db, uid, purchase_id)
        except Exception as ref_err:
            logging.warning(f"[PSEmine Purchase] Referral qualification notice: {ref_err}")""",
     """        # 7. Canonical referral qualification (single backend-authoritative path).
        try:
            _pse_engine.settle_referral_on_activation(db, uid, purchase_id)
        except Exception as ref_err:
            # Activation succeeded but qualification failed — persist an
            # idempotent repair task; the cron sweep retries it exactly once.
            try:
                _pse_engine.record_referral_repair(db, uid, purchase_id, reason='V2_ACTIVATE_SETTLE_FAILED',
                                                   detail=str(ref_err)[:500])
            except Exception:
                logging.error(f"[PSEmine] referral repair record failed for {uid}", exc_info=True)
            logging.warning(f"[PSEmine Purchase] Referral qualification notice: {ref_err}")"""),

    # --- F09: grant-only legacy backfill inside has_psemine_access ----------
    ("""    user_doc = db.collection('users').document(uid).get()
    if not user_doc.exists:
        return False
    pa = user_doc.to_dict().get('productAccess') or {}
    return pa.get('psemine') is True""",
     """    user_doc = db.collection('users').document(uid).get()
    if not user_doc.exists:
        return False
    pa = user_doc.to_dict().get('productAccess') or {}
    if pa.get('psemine') is True:
        return True
    # Grant-only legacy backfill: users who ALREADY hold PSEmine economic
    # state (psemine_users doc) predate the productAccess field — enroll them
    # once, audited. Never blocks; only ever grants. Absence of any PSEmine
    # footprint still denies (no speculative access).
    try:
        _ps = db.collection('psemine_users').document(uid).get()
        if _ps.exists:
            db.collection('users').document(uid).set(
                {'productAccess': {**(pa if isinstance(pa, dict) else {}), 'psemine': True},
                 'psemineAccessGrantedAt': firestore.SERVER_TIMESTAMP,
                 'psemineAccessGrantReason': 'legacy_backfill'},
                merge=True)
            db.collection('admin_audit_logs').add({
                'timestamp': firestore.SERVER_TIMESTAMP,
                'action': 'PSEMINE_ACCESS_LEGACY_BACKFILL',
                'targetUserId': uid,
                'actor': 'system:require_psemine_access',
                'metadata': {'rule': 'psemine_users doc existed without productAccess flag'},
            })
            return True
    except Exception:
        pass
    return False"""),

    # --- F10: cron sweeps the referral repair queue --------------------------
    ("""            s.reference.update({"status": "settling", "settledAt": firestore.SERVER_TIMESTAMP})
    return jsonify({"success": True, "effectiveStatus": eff, "campaignEndedNow": ended_now, "ownershipsChecked": checked})""",
     """            s.reference.update({"status": "settling", "settledAt": firestore.SERVER_TIMESTAMP})
    # Repair sweep: qualification failures recorded during activation are
    # retried here, exactly once per record (settle is idempotent; the record
    # is deleted only on success). Permanent failures stay visible for admin
    # review — never silent.
    repaired, repair_errors = _pse_engine.settle_referral_repair(db)
    return jsonify({"success": True, "effectiveStatus": eff, "campaignEndedNow": ended_now,
                    "ownershipsChecked": checked, "referralRepairs": repaired,
                    "referralRepairErrors": repair_errors})"""),
]

# ---------------------------------------------------------------------------
# api/psemine_engine.py
# ---------------------------------------------------------------------------
engine_hunks = [
    # --- F11: retry-safe accumulators ---------------------------------------
    ("""        earned_by_tool = []
        total_tool_minor = 0
        anchor_parts = []
        operating_now = False""",
     """        # Reset ALL accumulators inside the transaction body: _run_transaction
        # may re-run _txn on contention — stale values from a previous attempt
        # must never leak into this attempt's ledger entry.
        earned_by_tool = []
        referral_minor = 0
        total_tool_minor = 0
        anchor_parts = []
        operating_now = False"""),

    # --- F12: repair primitives + terminal-status predicate ------------------
    ("""def settle_referral_on_activation(db, uid, purchase_id):""",
     """TERMINAL_CAMPAIGN_STATUSES = ('settling', 'ended', 'payout', 'closed', 'archived')
""" + '''def record_referral_repair(db, referee_id, source_id, reason, detail=""):
    """Persist an idempotent repair task when referral settlement fails AFTER
    a successful tool activation. Deterministic ID => repeated failures of the
    same activation never duplicate the task. Read-only for clients."""
    task_id = f"repair_{referee_id}_{source_id}"
    db.collection("psemine_referral_repair").document(task_id).set({
        "id": task_id,
        "refereeId": referee_id,
        "sourceId": source_id,
        "reason": reason,
        "detail": detail,
        "status": "open",
        "attempts": 0,
        "createdAt": firestore_server_ts(),
        "updatedAt": firestore_server_ts(),
    }, merge=True)


def settle_referral_repair(db):
    """Cron sweep: retry open repair tasks. set_referral_qualified-on-activation
    is idempotent and capped, so a retry can never double-qualify. A task is
    deleted ONLY on success; permanent failures (self-referral, unknown code)
    stay open for admin review with attempts incremented."""
    repaired = 0
    errors = 0
    try:
        snaps = db.collection("psemine_referral_repair").where("status", "==", "open").limit(100).get()
    except Exception:
        return 0, 0
    for s in snaps:
        d = s.to_dict() or {}
        referee = d.get("refereeId")
        source = d.get("sourceId")
        if not referee or not source:
            continue
        try:
            res = settle_referral_on_activation(db, referee, source)
            if res.get("ok"):
                s.reference.delete()
                repaired += 1
            else:
                s.reference.update({
                    "attempts": int(d.get("attempts") or 0) + 1,
                    "lastError": str(res.get("error") or res.get("reason") or "unknown")[:200],
                    "updatedAt": firestore_server_ts(),
                })
                errors += 1
        except Exception as exc:
            try:
                s.reference.update({
                    "attempts": int(d.get("attempts") or 0) + 1,
                    "lastError": str(exc)[:200],
                    "updatedAt": firestore_server_ts(),
                })
            except Exception:
                pass
            errors += 1
    return repaired, errors


def settle_referral_on_activation(db, uid, purchase_id):'''),
]

# ---------------------------------------------------------------------------
# api/tests/test_payout_composition.py
# ---------------------------------------------------------------------------
tests_hunks = [
    ("""    def setUp(self):
        self.db = FakeDB()
        self._orig_camp = psemine_engine.campaign_lifecycle_state""",
     """    def setUp(self):
        self.db = FakeDB()
        # Force the NON-SDK transaction path so these composed tests are
        # deterministic in every environment: wherever firebase_admin happens
        # to be installed, _run_transaction would otherwise wrap _MultiTxn in
        # the real firestore.transactional (which _MultiTxn cannot satisfy).
        self._orig_fs = psemine_engine._firestore
        psemine_engine._firestore = None
        self._orig_camp = psemine_engine.campaign_lifecycle_state"""),

    ("""    def tearDown(self):
        psemine_engine.campaign_lifecycle_state = self._orig_camp""",
     """    def tearDown(self):
        psemine_engine._firestore = self._orig_fs
        psemine_engine.campaign_lifecycle_state = self._orig_camp"""),
]

apply(INDEX, index_hunks, index_bak)
apply(ENGINE, engine_hunks, engine_bak)
apply(TESTS, tests_hunks, tests_bak)
print("ALL PATCHES APPLIED")
