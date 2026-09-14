"""Phase-1b patcher for api/index.py: v1 gates + canonical endpoint suite (EOF append).

Every replacement hunk is exact-match asserted; any mismatch aborts without writing.
The endpoint suite is appended verbatim from _suite_template.py at EOF.
Backups: /tmp/index.py.pre_phase1b.bak
Run from project root:  python3 api/tools/patch_index_b.py
"""
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TARGET = "api/index.py"
BACKUP = "/tmp/index.py.pre_phase1b.bak"
TEMPLATE = os.path.join(HERE, "_suite_template.py")

HUNKS = []

def h(old, new):
    """Register an exact source-replacement hunk."""
    HUNKS.append((old, new))

# -------------------------------------------------- 0. v1 sessions/sync: campaign gate
h('''@app.route('/api/psemine/sessions/sync', methods=['POST'])
@verify_token
@require_db
def psemine_sync_session():
    """DEPRECATED legacy endpoint. Now delegates to the canonical accrual checkpoint.
    Kept only so older clients do not hard-fail; response shape is preserved."""
    db = get_db()
    uid = request.user['uid']
''',
'''@app.route('/api/psemine/sessions/sync', methods=['POST'])
@verify_token
@require_db
def psemine_sync_session():
    """DEPRECATED legacy endpoint. Now delegates to the canonical accrual checkpoint.
    Kept only so older clients do not hard-fail; response shape is preserved."""
    db = get_db()
    uid = request.user['uid']
    import psemine_engine as _pse_engine
    _camp, _eff, _ = _pse_engine.campaign_lifecycle_state(db)
    if _eff in ('settling', 'ended', 'payout', 'closed', 'archived'):
        return jsonify({"success": False, "error": "CAMPAIGN_ENDED", "message": "Mining accrual is closed."}), 409
''')

# -------------------------------------------------- 1. v1 dashboard: campaign gate
h('''    # 3. Canonical accrual checkpoint + authoritative session view
    import psemine_engine as _pse_engine
    _pse_engine.accrual_checkpoint(db, uid, source='dashboard')
''',
'''    # 3. Canonical accrual checkpoint + authoritative session view
    import psemine_engine as _pse_engine
    _camp, _eff, _ = _pse_engine.campaign_lifecycle_state(db)
    if _eff in ('settling', 'ended', 'payout', 'closed', 'archived'):
        return jsonify({"success": False, "error": "CAMPAIGN_ENDED", "message": "Mining accrual is closed."}), 409
    _pse_engine.accrual_checkpoint(db, uid, source='dashboard')
''')

# -------------------------------------------------- 2. v1 withdrawals: ownership gate
h('''    # 2. Sum existing pending / approved / processing / completed withdrawals
''',
'''    # 1b. Balance gate: payout requests require an operating mining tool
    # (canonical rule: ownership persists, but payouts require active mining state).
    _op = db.collection('psemine_tool_ownership').where('userId', '==', uid).where('status', '==', 'active').limit(1).get()
    if not list(_op):
        return jsonify({"success": False, "error": "NO_OPERATING_TOOL", "message": "An operating mining tool is required."}), 403

    # 2. Sum existing pending / approved / processing / completed withdrawals
''')

def main():
    """Apply the asserted source replacements and write a backup."""
    with open(TARGET, "r", encoding="utf-8") as f:
        src = f.read()
    out = src
    failed = []
    for i, (old, new) in enumerate(HUNKS):
        n = out.count(old)
        if n != 1:
            failed.append((i, n, old[:90]))
            continue
        out = out.replace(old, new, 1)
    if failed:
        print("ABORT - hunks failed (index, matches, preview):")
        for i, n, prev in failed:
            print(f"  #{i}: matches={n} :: {prev!r}")
        sys.exit(1)

    # EOF append of the canonical endpoint suite
    if "CANONICAL PSEMINE ENDPOINTS (Phase 1)" in out:
        print("ABORT - suite marker already present; refusing to double-append")
        sys.exit(1)
    with open(TEMPLATE, "r", encoding="utf-8") as f:
        suite = f.read()
    if not out.endswith("\n"):
        out += "\n"
    out += "\n\n" + suite

    shutil.copyfile(TARGET, BACKUP)
    with open(TARGET, "w", encoding="utf-8") as f:
        f.write(out)
    print(f"OK: applied {len(HUNKS)} hunks + EOF suite; backup at {BACKUP}")

if __name__ == "__main__":
    main()
