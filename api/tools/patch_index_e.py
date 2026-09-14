"""Phase-2c patcher: single referral qualification path + de-dup provider cache init.

1) v1 /api/psemine/orders/verify-payment manually qualified referrals with its
   own status logic (second qualification path). It now delegates to the
   canonical settle_referral_on_activation.
2) The provider-cache init block was duplicated by the Phase-1b EOF append;
   the second copy (tail) is removed. Route definitions after it are unaffected.

Run from project root:  python3 api/tools/patch_index_e.py
"""
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TARGET = "api/index.py"
BACKUP = "/tmp/index.py.pre_phase2c.bak"

HUNKS = []


def h(old, new):
    HUNKS.append((old, new))


# --- 0. v1 verify-payment: delegate to canonical qualification -----------------
h("""    # 6. Referral Qualification Check
    ref_snaps = db.collection('psemine_referrals') \\
        .where('refereeId', '==', uid) \\
        .where('status', '==', 'pending') \\
        .get()

    for ref_doc in ref_snaps:
        r_data = ref_doc.to_dict() or {}
        referrer_id = r_data.get('referrerId')
        if referrer_id and referrer_id != uid:
            ref_doc.reference.update({
                'status': 'qualified',
                'bonusRateGbpPerHour': 0.30,
                'qualifiedAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP,
            })

            ref_session = recalculate_psemine_user_mining_state(db, referrer_id)

            user_snap = db.collection('users').document(uid).get()
            referee_name = (user_snap.to_dict().get('username') if user_snap.exists else 'Your referral') or 'Your referral'

            ref_act = db.collection('psemine_activities').document()
            ref_act.set({
                'id': ref_act.id,
                'userId': referrer_id,
                'type': 'REFERRAL_QUALIFIED',
                'title': 'Referral Qualified!',
                'description': f"{referee_name} purchased a mining tool. Your mining bonus increased by +£0.30/hr!",
                'metadata': {'refereeId': uid, 'referralDocId': ref_doc.id},
                'createdAt': firestore.SERVER_TIMESTAMP,
            })

            ref_notif = db.collection('psemine_notifications').document()
            ref_notif.set({
                'id': ref_notif.id,
                'userId': referrer_id,
                'type': 'referral',
                'title': 'Mining Bonus Active',
                'message': f"{referee_name} qualified! Bonus rate is now +£{ref_session['referralBonusGbpPerHour']:.2f}/hr.",
                'read': False,
                'createdAt': firestore.SERVER_TIMESTAMP,
            })

    return jsonify({""",
  """    # 6. Referral Qualification — (Phase 2) delegates to the ONE canonical
    # qualification path (settle_referral_on_activation). The previous manual
    # 'pending'->'qualified' block was a second, competing qualification path.
    try:
        import psemine_engine as _pse_engine
        _pse_engine.settle_referral_on_activation(db, uid, order_id)
    except Exception as _ref_err:
        logging.warning(f"[PSEmine v1] canonical referral settle failed for {uid}: {_ref_err}")

    return jsonify({""")

# --- 1. remove duplicated provider-cache init at tail ---------------------------
h("""# Initialize provider cache on startup
try:
    from services.provider_cache import init_provider_cache
    init_provider_cache()
    print("[Offerwall] Provider cache initialized on startup")
except Exception as e:
    print(f"[Offerwall] WARNING: Failed to initialize provider cache: {str(e)}")


if CORS: CORS(app, resources={r"/api/*": {"origins": "*"}})
if __name__ == '__main__': app.run(debug=True, port=5000)""",
  """if CORS: CORS(app, resources={r"/api/*": {"origins": "*"}})
if __name__ == '__main__': app.run(debug=True, port=5000)""")


def main():
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
