"""Phase-2b patcher: kill the last dual-ledger writer + payout-safe wallet connect.

1) recalculate_psemine_user_mining_state must no longer self-accumulate
   accumulatedOutputGbp (competing with the canonical ledger). It now derives
   the displayed balance from psemine_users.accruedMinor (+ legacy read-model).
2) /api/mine/wallet honors updatePayout=false: recording a connected viewing
   wallet must never silently overwrite the settlement payout destination.

Run from project root:  python3 api/tools/patch_index_d.py
"""
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TARGET = "api/index.py"
BACKUP = "/tmp/index.py.pre_phase2b.bak"

HUNKS = []


def h(old, new):
    HUNKS.append((old, new))


# --- 0. recalculate_psemine_user_mining_state: source-of-truth fix -------------
# The old body self-accumulated accumulatedOutputGbp = prev + elapsed*rate, which
# was the last competing balance writer. Replace the accumulation block with a
# read-through of the canonical ledger-backed user balance.
h("""    if session_snap.exists:
        s_data = session_snap.to_dict() or {}
        started_at = s_data.get('startedAt') or now_iso
        prev_output = safe_float(s_data.get('accumulatedOutputGbp'), 0.0)
        prev_rate = safe_float(s_data.get('totalMiningRateGbpPerHour'), 0.0)
        last_calc = s_data.get('lastCalculatedAt')

        if s_data.get('state') == 'active' and last_calc:
            try:
                if isinstance(last_calc, datetime):
                    last_dt = last_calc
                else:
                    last_dt = datetime.fromisoformat(str(last_calc).replace('Z', '+00:00'))
                if last_dt.tzinfo is None:
                    last_dt = last_dt.replace(tzinfo=timezone.utc)

                bounded_now = min(now_dt, campaign_end_dt)
                elapsed_hours = max(0.0, (bounded_now - last_dt).total_seconds() / 3600.0)
                accumulated_output = prev_output + (elapsed_hours * prev_rate)
            except Exception:
                accumulated_output = prev_output
        else:
            accumulated_output = prev_output""",
  """    if session_snap.exists:
        s_data = session_snap.to_dict() or {}
        started_at = s_data.get('startedAt') or now_iso
        prev_output = safe_float(s_data.get('accumulatedOutputGbp'), 0.0)

        # (Phase 2) SINGLE SOURCE OF TRUTH: this legacy read-model used to
        # self-accumulate accumulatedOutputGbp = prev + elapsed * rate, which
        # competed with the canonical ledger. It now only ever READS the
        # canonical balance (psemine_users.accruedMinor + legacy read-model)
        # and never advances its own economics.
        try:
            import psemine_engine as _pse_engine
            _u = db.collection('psemine_users').document(user_id).get().to_dict() or {}
            _ledger_minor = int(_u.get('accruedMinor') or 0)
            _legacy_minor = _pse_engine._legacy_balance_minor(_u)
            accumulated_output = max(prev_output, (_ledger_minor + _legacy_minor) / 100.0)
        except Exception:
            accumulated_output = prev_output""")

# --- 1. /api/mine/wallet: honor updatePayout=false -----------------------------
h("""    uid = request.user['uid']
    data = request.get_json() or {}
    wallet = (data.get('wallet') or '').strip()
    import psemine_engine as _pse_engine
    result = _pse_engine.update_payout_wallet(db, uid, wallet)
    if not result.get("ok"):
        code = result.get("error", "WALLET_UPDATE_FAILED")
        status = 400 if code == "INVALID_ADDRESS" else 409
        return jsonify({"success": False, "error": code, "message": code.replace('_', ' ').title()}), status
    return jsonify({"success": True, "payoutWallet": result.get("payoutWallet")})""",
  """    uid = request.user['uid']
    data = request.get_json() or {}
    wallet = (data.get('wallet') or '').strip()
    update_payout = bool(data.get('updatePayout', True))
    import psemine_engine as _pse_engine
    if not update_payout:
        # Recording a connected viewing wallet must never silently change the
        # settlement payout destination.
        if not _pse_engine._valid_evm(wallet):
            return jsonify({"success": False, "error": "INVALID_ADDRESS",
                            "message": "Invalid Address"}), 400
        import psemine_core as _pse_core
        _wl = wallet.strip().lower()
        _u_ref = db.collection('psemine_users').document(uid)
        _u_ref.set({"id": uid, "uid": uid, "userId": uid}, merge=True)
        _u_ref.update({
            "connectedWallet": _wl,
            "connectedWalletUpdatedAt": datetime.now(timezone.utc).isoformat(),
            "updatedAt": firestore.SERVER_TIMESTAMP,
        })
        _u_now = _u_ref.get().to_dict() or {}
        return jsonify({
            "success": True,
            "payoutWallet": _u_now.get("payoutWallet"),
            "connectedWallet": _u_now.get("connectedWallet"),
        })

    result = _pse_engine.update_payout_wallet(db, uid, wallet)
    if not result.get("ok"):
        code = result.get("error", "WALLET_UPDATE_FAILED")
        status = 400 if code == "INVALID_ADDRESS" else 409
        return jsonify({"success": False, "error": code, "message": code.replace('_', ' ').title()}), status
    return jsonify({"success": True, "payoutWallet": result.get("payoutWallet")})""")


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
