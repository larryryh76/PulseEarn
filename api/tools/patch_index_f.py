"""Phase-2d patcher: canonical admin overview, payout-rejection reversal, email gate.

1) /api/admin/mine/overview delegates to the canonical admin_overview()
   aggregator (count() queries + integer minor-unit math) instead of three
   full-collection scans; UI-compatible keys preserved.
2) Rejecting a canonical payout request now reverses its ledger debit
   (payout_reversal entry + payoutDebitedMinor decrement) inside a transaction.
3) POST /api/mine/withdrawals/request enforces a verified email (money-out path).

Run from project root:  python3 api/tools/patch_index_f.py
"""
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TARGET = "api/index.py"
BACKUP = "/tmp/index.py.pre_phase2d.bak"

HUNKS = []


def h(old, new):
    """Register an exact source-replacement hunk."""
    HUNKS.append((old, new))


# --- 0. admin overview -> canonical aggregator ---------------------------------
h("""    users_docs = db.collection('psemine_users').get()
    purchases_docs = db.collection('psemine_purchases').get()
    referrals_docs = db.collection('psemine_referrals').get()
    camp_doc = db.collection('psemine_campaigns').document('active_campaign').get()

    active_miners = sum(1 for d in users_docs if d.to_dict().get('status') == 'active')
    total_tools_sold = len([d for d in purchases_docs if d.to_dict().get('status') == 'activated'])
    total_capacity = sum(d.to_dict().get('totalCapacityGBPPerHour', 0) for d in users_docs)
    total_accrued = sum(d.to_dict().get('totalAccruedGBP', 0) for d in users_docs)
    qualified_refs = len([d for d in referrals_docs if d.to_dict().get('status') == 'qualified'])

    camp_data = camp_doc.to_dict() if camp_doc.exists else {}

    return jsonify({
        "success": True,
        "stats": {
            "activeMiners": active_miners,
            "totalMiners": len(users_docs),
            "toolsSold": total_tools_sold,
            "totalCapacityGBPPerHour": round(total_capacity, 2),
            "totalAccruedLiabilityGBP": round(total_accrued, 2),
            "totalBNBCollected": camp_data.get('totalBNBCollected', 0),
            "qualifiedReferrals": qualified_refs,
            "campaignStatus": camp_data.get('status', 'active')
        }
    })""",
  """    # (Phase 2) Delegate to the ONE canonical aggregator (count() queries,
    # integer minor-unit math). UI-compatible keys are preserved by the engine.
    import psemine_engine as _pse_engine
    ov = _pse_engine.admin_overview(db)
    camp_data = ov.get("campaign") or {}
    return jsonify({
        "success": True,
        "stats": {
            "activeMiners": ov.get("activeMiners", 0),
            "totalMiners": ov.get("totalMiners", 0),
            "toolsSold": ov.get("toolsSold", 0),
            "totalCapacityGBPPerHour": ov.get("totalCapacityGBPPerHour", 0),
            "totalAccruedLiabilityGBP": ov.get("totalAccruedLiabilityGBP", 0),
            "totalBNBCollected": camp_data.get('totalBNBCollected', 0),
            "qualifiedReferrals": ov.get("qualifiedReferrals", 0),
            "campaignStatus": ov.get("campaignStatus", "active"),
            # canonical extras (integer minor units)
            "totalAccruedMinor": ov.get("totalAccruedMinor", 0),
            "totalDebitedMinor": ov.get("totalDebitedMinor", 0),
            "openRecoveryCases": ov.get("openRecoveryCases", 0),
        }
    })""")

# --- 1. canonical payout rejection reverses the ledger debit --------------------
h("""    else:
        wd_ref.update({
            'status': 'rejected',
            'adminNotes': admin_notes or 'Request rejected during administrative review.',
            'reviewedBy': admin_id,
            'processedAt': firestore.SERVER_TIMESTAMP,
            'updatedAt': firestore.SERVER_TIMESTAMP,
        })""",
  """    else:
        wd_ref.update({
            'status': 'rejected',
            'adminNotes': admin_notes or 'Request rejected during administrative review.',
            'reviewedBy': admin_id,
            'processedAt': firestore.SERVER_TIMESTAMP,
            'updatedAt': firestore.SERVER_TIMESTAMP,
        })

        # (Phase 2) Canonical payout requests (source == 'user') debit the ledger
        # at request time; rejection MUST reverse that debit or the user's
        # balance is permanently reduced. Idempotent via deterministic entry id.
        if wd.get('source') == 'user' and wd.get('amountMinor'):
            amount_minor = int(wd.get('amountMinor') or 0)
            user_ref_rev = db.collection('psemine_users').document(user_id)

            @firestore.transactional
            def _reverse_payout_debit(txn):
                rev_ref = db.collection('psemine_mining_ledger').document(f"payout_reversal_{withdrawal_id}")
                if rev_ref.get(transaction=txn).exists:
                    return False
                u_snap = user_ref_rev.get(transaction=txn)
                if not u_snap.exists:
                    return False
                u_d = u_snap.to_dict() or {}
                txn.set(rev_ref, {
                    "id": f"payout_reversal_{withdrawal_id}",
                    "userId": user_id,
                    "campaignId": wd.get('campaignId', 'active_campaign'),
                    "kind": "payout_reversal",
                    "amountMinor": amount_minor,
                    "source": "payout_rejected",
                    "withdrawalId": withdrawal_id,
                    "createdAt": firestore.SERVER_TIMESTAMP,
                })
                txn.update(user_ref_rev, {
                    "payoutDebitedMinor": max(0, int(u_d.get('payoutDebitedMinor') or 0) - amount_minor),
                    "updatedAt": firestore.SERVER_TIMESTAMP,
                })
                return True

            try:
                _reverse_payout_debit(db.transaction())
            except Exception as _rev_err:
                logging.warning(f"[PSEmine] payout reversal failed for {withdrawal_id}: {_rev_err}")""")

# --- 2. email-verified gate on the canonical money-out path ----------------------
h("""@app.route('/api/mine/withdrawals/request', methods=['POST'])
@verify_token
def mine_create_withdrawal():
    \"\"\"Canonical payout request path (blocked during active campaign; min £10).
    Uses /request to avoid Flask route collision with the v1 legacy /create.\"\"\"
    db = get_db()
    if not db: return jsonify({"success": False, "error": "SERVICE_UNAVAILABLE"}), 503
    uid = request.user['uid']""",
  """@app.route('/api/mine/withdrawals/request', methods=['POST'])
@verify_token
def mine_create_withdrawal():
    \"\"\"Canonical payout request path (blocked during active campaign; min £10).
    Uses /request to avoid Flask route collision with the v1 legacy /create.\"\"\"
    db = get_db()
    if not db: return jsonify({"success": False, "error": "SERVICE_UNAVAILABLE"}), 503
    # (Phase 8) Money-out path requires a verified email (backend-enforced).
    if not request.user.get('email_verified', False):
        return jsonify({"success": False, "error": "EMAIL_NOT_VERIFIED",
                        "message": "Verify your email address before requesting a payout."}), 403
    uid = request.user['uid']""")


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
