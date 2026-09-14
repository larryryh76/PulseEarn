"""Phase-2 patcher: cron registration + vercel.json crons + withdrawal route conflict fix.

Every hunk is exact-match asserted; any mismatch aborts without writing.
Run from project root:  python3 api/tools/patch_index_c.py
"""
import json
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TARGET = "api/index.py"
VERCEL = "vercel.json"
BACKUP = "/tmp/index.py.pre_phase2.bak"

HUNKS = []


def h(old, new):
    HUNKS.append((old, new))


# --- 0. mine_create_withdrawal: rename route to /api/mine/withdrawals/request ---
h('''@app.route('/api/mine/withdrawals/create', methods=['POST'])
@verify_token
def mine_create_withdrawal():
    """Canonical payout request path (blocked during active campaign; min £10)."""''',
  '''@app.route('/api/mine/withdrawals/request', methods=['POST'])
@verify_token
def mine_create_withdrawal():
    """Canonical payout request path (blocked during active campaign; min £10).
    Uses /request to avoid Flask route collision with the v1 legacy /create."""''')

# --- 1. cron: also accept Authorization: Bearer <CRON_SECRET> ---
h('''    secret = os.environ.get('CRON_SECRET')
    provided = request.headers.get('X-Cron-Secret') or request.args.get('secret')
    if secret:
        if not provided or provided != secret:
            return jsonify({"success": False, "error": "FORBIDDEN"}), 403''',
  '''    secret = os.environ.get('CRON_SECRET')
    provided = request.headers.get('X-Cron-Secret') or request.args.get('secret')
    if not provided:
        _authz = (request.headers.get('Authorization') or '')
        if _authz.startswith('Bearer '):
            provided = _authz.split(' ', 1)[1].strip()
    if secret:
        if not provided or not hmac.compare_digest(str(provided), str(secret)):
            return jsonify({"success": False, "error": "FORBIDDEN"}), 403''')


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

    # vercel.json: register the lifecycle cron (free-plan hourly cadence)
    with open(VERCEL, "r", encoding="utf-8") as f:
        vj = json.load(f)
    crons = vj.get("crons") or []
    if not any("mine/cron/lifecycle" in c.get("path", "") for c in crons):
        crons.append({
            "path": "/api/mine/cron/lifecycle",
            "schedule": "0 * * * *",
        })
    vj["crons"] = crons
    with open(VERCEL, "w", encoding="utf-8") as f:
        json.dump(vj, f, indent=2)
        f.write("\n")

    shutil.copyfile(TARGET, BACKUP)
    with open(TARGET, "w", encoding="utf-8") as f:
        f.write(out)
    print(f"OK: applied {applied} hunks + vercel.json cron; backup at {BACKUP}")


if __name__ == "__main__":
    main()
