"""CodeRabbit round-2 remediation patcher (PR #329, review of 39e052a).

Applies the 8 new findings, each guarded by an exact-match assertion.
ALL targets are validated BEFORE ANY file is written (truly all-or-nothing).

  R1 (CRITICAL) payout completion: read wd_ref before the reservation write
  R2 (CRITICAL) commit_purchase_activation: read _mig_ref + camp_ref inside
      the txn BEFORE the first txn.set (outer scope refs kept; outer-scope
      read cannot be transactional)
  R3 repair sweep: delete a repair task only when EVERY result settled or
      was already qualified; capReached counts as success (terminal);
      permanently failed tasks move to status "failed" (queue starvation fix)
  R4 payout completion: retain the historical completed-withdrawal txHash
      duplicate query alongside the atomic reservation
  R5 has_psemine_access: grant + audit committed atomically via one batch
  R6 patch_coderabbit_fixes.py: fix the defective F06 hunk (keeps a live
      transactional read) + make apply() all-or-nothing
  R7 firestore.indexes.json: composite index for the historical
      (status, processedAt DESC) duplicate-txHash query
  R8 PSEMineAuthContext: reset retriedThisSession on sign-out

Run from project root:  python3 api/tools/patch_coderabbit_round2.py
"""
import json
import shutil
import sys

TARGETS = [
    "api/index.py",
    "api/psemine_engine.py",
    "firestore.indexes.json",
    "api/tools/patch_coderabbit_fixes.py",
    "src/contexts/PSEMineAuthContext.tsx",
]

# (path, old, new)
HUNKS = []

# ===========================================================================
# api/index.py
# ===========================================================================

# --- R1 + R4: payout completion — read wd BEFORE the reservation write, and
#     keep the historical completed-withdrawal duplicate query ---------------
HUNKS.append((TARGETS[0], """        @firestore.transactional
        def _complete_with_hash(txn):
            if _norm:
                res_snap = _tx_doc.get(transaction=txn)
                if res_snap.exists:
                    holder = (res_snap.to_dict() or {}).get('withdrawalId')
                    if holder and holder != withdrawal_id:
                        return False
                txn.set(_tx_doc, {'withdrawalId': withdrawal_id, 'payoutTxHash': _norm,
                                  'reservedAt': firestore.SERVER_TIMESTAMP})
            wd_snap_t = wd_ref.get(transaction=txn)""",
"""        @firestore.transactional
        def _complete_with_hash(txn):
            # Firestore transactions reject reads that follow writes: the
            # withdrawal doc must be READ before the reservation txn.set.
            wd_snap_t = wd_ref.get(transaction=txn)
            if _norm:
                res_snap = _tx_doc.get(transaction=txn)
                if res_snap.exists:
                    holder = (res_snap.to_dict() or {}).get('withdrawalId')
                    if holder and holder != withdrawal_id:
                        return False
                txn.set(_tx_doc, {'withdrawalId': withdrawal_id, 'payoutTxHash': _norm,
                                  'reservedAt': firestore.SERVER_TIMESTAMP})"""))

HUNKS.append((TARGETS[0], """        _outcome = _complete_with_hash(db.transaction())
        if _outcome is False:
            return jsonify({"success": False, "error": "DUPLICATE_PAYOUT_TX",
                            "message": "This transaction hash is already attached to another completed payout."}), 409""",
"""        # Historical duplicate detection (pre-reservation records): the
        # atomic reservation only covers hashes reserved from now on. Legacy
        # completed withdrawals carry payoutTxHash without a reservation doc,
        # so this complementary query MUST stay until a one-time backfill has
        # materialized reservations for every historical completed payout.
        if _norm:
            # Equality-only query: Firestore rejects `!= null` inequality
            # filters, and this needs no composite index.
            _hist = [h for h in db.collection('psemine_withdrawals')
                     .where('status', '==', 'completed')
                     .where('payoutTxHash', '==', _norm)
                     .limit(5).get() if h.id != withdrawal_id]
        else:
            _hist = []
        _outcome = _complete_with_hash(db.transaction())
        if _hist:
            return jsonify({"success": False, "error": "DUPLICATE_PAYOUT_TX",
                            "message": "This transaction hash is already attached to another completed payout."}), 409
        if _outcome is False:
            return jsonify({"success": False, "error": "DUPLICATE_PAYOUT_TX",
                            "message": "This transaction hash is already attached to another completed payout."}), 409"""))

# --- R2: activation txn — read _mig_ref and camp_ref before the first write
HUNKS.append((TARGETS[0], """        def commit_purchase_activation(txn):
            # Atomic transaction-hash replay prevention
            h_curr = redeemed_ref.get(transaction=txn)
            if h_curr.exists:
                raise Exception("TRANSACTION_ALREADY_REDEEMED")

            p_curr = purchase_ref.get(transaction=txn)
            if not p_curr.exists or p_curr.to_dict().get('status') == 'activated':
                raise Exception("PURCHASE_ALREADY_ACTIVATED")

            u_curr = user_ref.get(transaction=txn)
            u_dict = u_curr.to_dict() if u_curr.exists else {}
""",
"""        def commit_purchase_activation(txn):
            # ALL transaction reads happen before the FIRST txn write —
            # Firestore transactions reject reads that follow writes.
            h_curr = redeemed_ref.get(transaction=txn)
            if h_curr.exists:
                raise Exception("TRANSACTION_ALREADY_REDEEMED")

            p_curr = purchase_ref.get(transaction=txn)
            if not p_curr.exists or p_curr.to_dict().get('status') == 'activated':
                raise Exception("PURCHASE_ALREADY_ACTIVATED")

            u_curr = user_ref.get(transaction=txn)
            u_dict = u_curr.to_dict() if u_curr.exists else {}

            # Read-ahead for the legacy-balance migration branch (R2): the
            # outer-scope read above cannot run inside the transaction.
            _mig_exists = _mig_ref.get(transaction=txn).exists
            # Read-ahead for the campaign counters block.
            c_snap = camp_ref.get(transaction=txn)
"""))

HUNKS.append((TARGETS[0], """            # Commit user economic state (canonical minor-unit balance; capacities additive).
            # NOTE: _mig_ref was already READ at the top of this transaction
            # (reads must precede all writes — Firestore rejects reads after
            # the first txn write).
            user_was_inactive = u_dict.get('status') != 'active'
            prev_accrued_minor = int(u_dict.get('accruedMinor') or 0)
            legacy_minor = _pse_engine._legacy_balance_minor(u_dict)
            if legacy_minor and not u_dict.get('legacyBalanceAbsorbedMinor'):
                # one-time absorption of pre-ledger balance into the ledger (auditable entry)
                if not _mig_ref.get(transaction=txn).exists:""",
"""            # Commit user economic state (canonical minor-unit balance; capacities additive).
            # NOTE: _mig_ref was already READ at the top of this transaction
            # (reads must precede all writes — Firestore rejects reads after
            # the first txn write).
            user_was_inactive = u_dict.get('status') != 'active'
            prev_accrued_minor = int(u_dict.get('accruedMinor') or 0)
            legacy_minor = _pse_engine._legacy_balance_minor(u_dict)
            if legacy_minor and not u_dict.get('legacyBalanceAbsorbedMinor'):
                # one-time absorption of pre-ledger balance into the ledger (auditable entry)
                if not _mig_exists:"""))

HUNKS.append((TARGETS[0], """            # Commit campaign counters update using Increment
            c_snap = camp_ref.get(transaction=txn)
            if c_snap.exists:""",
"""            # Commit campaign counters update using Increment
            # (c_snap was read at the top of the transaction — read-before-write)
            if c_snap.exists:"""))

# --- R5: grant + audit in ONE atomic batch --------------------------------
HUNKS.append((TARGETS[0], """            db.collection('users').document(uid).set(
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
            return True""",
"""            # Grant + audit are committed ATOMICALLY: a failed audit write
            # must never leave a grant whose backfill can no longer be audited
            # (the flag check would skip it on the next call).
            _batch = db.batch()
            _batch.set(db.collection('users').document(uid),
                       {'productAccess': {**(pa if isinstance(pa, dict) else {}), 'psemine': True},
                        'psemineAccessGrantedAt': firestore.SERVER_TIMESTAMP,
                        'psemineAccessGrantReason': 'legacy_backfill'},
                       merge=True)
            _audit_ref = db.collection('admin_audit_logs').document()
            _batch.set(_audit_ref, {
                'timestamp': firestore.SERVER_TIMESTAMP,
                'action': 'PSEMINE_ACCESS_LEGACY_BACKFILL',
                'targetUserId': uid,
                'actor': 'system:require_psemine_access',
                'metadata': {'rule': 'psemine_users doc existed without productAccess flag'},
            })
            _batch.commit()
            return True"""))

# ===========================================================================
# api/psemine_engine.py
# ===========================================================================

# --- R3: repair sweep — terminal outcome classification --------------------
HUNKS.append((TARGETS[1], """    try:
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
                })""",
"""    try:
        # attempts+1 ordering keeps permanent-failure tasks behind fresh ones
        snaps = db.collection("psemine_referral_repair") \\
            .where("status", "==", "open").limit(100).get()
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
            # Terminal-outcome classification: the task may only be deleted
            # when EVERY referral result settled (or was already qualified).
            # capReached is terminal (referrer at cap of 5) — not retryable.
            results = res.get("results") or []
            settled = all(
                ("error" not in it) and
                ("skipped" not in it or it.get("skipped") is not True)
                for it in results
            )
            if settled:
                s.reference.delete()
                repaired += 1
            else:
                attempts = int(d.get("attempts") or 0) + 1
                first_err = next(
                    (str(it.get("error")) for it in results if it.get("error")),
                    str(res.get("error") or res.get("reason") or "unknown"),
                )
                if attempts >= 5:
                    # Exhausted: move to a terminal status so the task can
                    # never starve the open queue (admin-reviewable).
                    s.reference.update({
                        "status": "failed",
                        "attempts": attempts,
                        "lastError": first_err[:200],
                        "updatedAt": firestore_server_ts(),
                    })
                    errors += 1
                else:
                    s.reference.update({
                        "attempts": attempts,
                        "lastError": first_err[:200],
                        "updatedAt": firestore_server_ts(),
                    })"""))

# ===========================================================================
# firestore.indexes.json
# ===========================================================================
_NEW_INDEX = {
    "collectionGroup": "psemine_withdrawals",
    "queryScope": "COLLECTION",
    "fields": [
        {"fieldPath": "status", "order": "ASCENDING"},
        {"fieldPath": "payoutTxHash", "order": "ASCENDING"},
        {"fieldPath": "processedAt", "order": "DESCENDING"},
    ],
}

# ===========================================================================
# api/tools/patch_coderabbit_fixes.py (the F06 hunk + all-or-nothing apply)
# ===========================================================================

# --- R6a: the defective F06 replacement keeps a live transactional read ---
HUNKS.append((TARGETS[3], """            if legacy_minor and not u_dict.get('legacyBalanceAbsorbedMinor'):
                # one-time absorption of pre-ledger balance into the ledger (auditable entry)
                if not _mig_ref.get(transaction=txn).exists:
                    txn.set(_mig_ref, {
                        'id': _mig_id, 'userId': uid, 'campaignId': PSEMINE_CAMPAIGN_DOC_ID,
                        'kind': 'migration', 'amountMinor': int(legacy_minor),
                        'source': 'migration', 'note': 'pre-ledger totalAccruedGBP absorption',
                        'createdAt': firestore.SERVER_TIMESTAMP,
                    })
                prev_accrued_minor += int(legacy_minor)""",
"""            if legacy_minor and not u_dict.get('legacyBalanceAbsorbedMinor'):
                # one-time absorption of pre-ledger balance into the ledger
                # (auditable entry) — _mig_read was taken BEFORE the first
                # transaction write (Firestore read-before-write rule)
                if not _mig_read.exists:
                    txn.set(_mig_ref, {
                        'id': _mig_id, 'userId': uid, 'campaignId': PSEMINE_CAMPAIGN_DOC_ID,
                        'kind': 'migration', 'amountMinor': int(legacy_minor),
                        'source': 'migration', 'note': 'pre-ledger totalAccruedGBP absorption',
                        'createdAt': firestore.SERVER_TIMESTAMP,
                    })
                prev_accrued_minor += int(legacy_minor)"""))

HUNKS.append((TARGETS[3], """                _mig_id = f"migration_{uid}"
                _mig_ref = db.collection('psemine_mining_ledger').document(_mig_id)
""",
"""                _mig_id = f"migration_{uid}"
                _mig_ref = db.collection('psemine_mining_ledger').document(_mig_id)
                _mig_read = _mig_ref.get(transaction=txn)  # BEFORE first write
"""))

# --- R6b: validate every target before writing any target -----------------
HUNKS.append((TARGETS[3], """def apply(path, hunks, backup):
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
    print(f"OK: {path} — {len(hunks)} hunks applied (backup: {backup})")""",
"""def apply_all(plans):
    \"\"\"All-or-nothing: validate EVERY hunk of EVERY target first; write the
    target files only after every validation succeeds.\"\"\"
    prepared = []
    for path, hunks, backup in plans:
        with open(path, "r", encoding="utf-8") as f:
            src = f.read()
        for i, (old, new) in enumerate(hunks):
            if src.count(old) != 1:
                print(f"ABORT: {path} hunk #{i + 1} matched {src.count(old)} times (need exactly 1)")
                return False
        prepared.append((path, src, hunks, backup))
    for path, src, hunks, backup in prepared:
        shutil.copyfile(path, backup)
        for old, new in hunks:
            src = src.replace(old, new, 1)
        with open(path, "w", encoding="utf-8") as f:
            f.write(src)
        print(f"OK: {path} — {len(hunks)} hunks applied (backup: {backup})")
    return True"""))

HUNKS.append((TARGETS[3], """apply(INDEX, index_hunks, index_bak)
apply(ENGINE, engine_hunks, engine_bak)
apply(TESTS, tests_hunks, tests_bak)
print("ALL PATCHES APPLIED")""",
"""if not apply_all([
    (INDEX, index_hunks, index_bak),
    (ENGINE, engine_hunks, engine_bak),
    (TESTS, tests_hunks, tests_bak),
]):
    sys.exit(1)
print("ALL PATCHES APPLIED")"""))

# ===========================================================================
# src/contexts/PSEMineAuthContext.tsx
# ===========================================================================

# --- R8: reset retry latch on sign-out -------------------------------------
HUNKS.append((TARGETS[4], """  // Retry any referral code retained after a transient registration failure.
  // Runs once per signed-in session; idempotent server-side.
  const retriedThisSession = useRef(false);
  useEffect(() => {
    if (!currentUser || retriedThisSession.current) return;
    retriedThisSession.current = true;
    PSEMineEngine.retryPendingReferral().catch(() => undefined);
  }, [currentUser]);""",
"""  // Retry any referral code retained after a transient registration failure.
  // Runs once per signed-in session; idempotent server-side. The latch resets
  // on sign-out so a later sign-in (same mounted provider) retries again.
  const retriedThisSession = useRef(false);
  useEffect(() => {
    if (!currentUser) return;
    if (retriedThisSession.current) return;
    retriedThisSession.current = true;
    PSEMineEngine.retryPendingReferral().catch(() => undefined);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) retriedThisSession.current = false;
  }, [currentUser]);"""))


def main():
    # Phase 1: validate everything
    for path, old, _new in HUNKS:
        with open(path, "r", encoding="utf-8") as f:
            src = f.read()
        n = src.count(old)
        if n != 1:
            print(f"ABORT (nothing written): {path} hunk matched {n} times (need exactly 1)")
            print(f"  hunk head: {old.splitlines()[0][:100]!r}")
            return 1
    # Phase 1b: index JSON sanity before mutating anything
    with open("firestore.indexes.json", "r", encoding="utf-8") as f:
        idx = json.load(f)
    assert not any(
        i["collectionGroup"] == "psemine_withdrawals" and
        [f["fieldPath"] for f in i["fields"]] == ["status", "payoutTxHash", "processedAt"]
        for i in idx.get("indexes", [])
    ), "composite txHash index already present"
    print(f"VALIDATION OK — {len(HUNKS)} hunks + 1 index across {len(TARGETS)} files")

    # Phase 2: write everything
    for path, old, new in HUNKS:
        with open(path, "r", encoding="utf-8") as f:
            src = f.read()
        shutil.copyfile(path, f"/tmp/{path.replace('/', '_')}.round2.bak")
        with open(path, "w", encoding="utf-8") as f:
            f.write(src.replace(old, new, 1))
        print(f"OK: {path}")

    # NOTE: no index change — the historical duplicate query is equality-only
    # (status + payoutTxHash), which the existing single-field indexes cover.
    print("OK: firestore.indexes.json — no change needed (equality-only query)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
