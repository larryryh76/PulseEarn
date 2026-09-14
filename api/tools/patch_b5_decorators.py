"""B5: apply the centralized @require_psemine_access decorator to every
authenticated /api/mine/* user endpoint (after @verify_token). Campaign status
is intentionally public; the cron endpoint is secret-protected, not user-facing.

Run from project root:  python3 api/tools/patch_b5_decorators.py
"""
import os
import shutil
import sys

TARGET = "api/index.py"
BACKUP = "/tmp/index.py.pre_b5.bak"

ENDPOINTS = [
    "tools/quote",
    "tools/verify-purchase",
    "state",
    "purchases/create",
    "wallet",
    "referrals/register",
    "withdrawals/request",
    # tools/<ownership_id>/maintain handled separately (dynamic segment)
]

HUNKS = []


def h(old, new):
    HUNKS.append((old, new))


# static routes
for ep in ENDPOINTS:
    old = f"@app.route('/api/mine/{ep}', methods=[{{METHODS}}])\n@verify_token\n"
    # we can't template like that here; build per-endpoint below instead
    pass

# Build per-endpoint hunks with their literal decorator blocks:
h("""@app.route('/api/mine/tools/quote', methods=['POST'])
@verify_token
def generate_psemine_tool_quote():""",
  """@app.route('/api/mine/tools/quote', methods=['POST'])
@verify_token
@require_psemine_access
def generate_psemine_tool_quote():""")

h("""@app.route('/api/mine/tools/verify-purchase', methods=['POST'])
@verify_token
def verify_psemine_tool_purchase():""",
  """@app.route('/api/mine/tools/verify-purchase', methods=['POST'])
@verify_token
@require_psemine_access
def verify_psemine_tool_purchase():""")

h("""@app.route('/api/mine/state', methods=['GET'])
@verify_token
def mine_state():""",
  """@app.route('/api/mine/state', methods=['GET'])
@verify_token
@require_psemine_access
def mine_state():""")

h("""@app.route('/api/mine/tools/<ownership_id>/maintain', methods=['POST'])
@verify_token
def mine_maintain(ownership_id):""",
  """@app.route('/api/mine/tools/<ownership_id>/maintain', methods=['POST'])
@verify_token
@require_psemine_access
def mine_maintain(ownership_id):""")

h("""@app.route('/api/mine/purchases/create', methods=['POST'])
@verify_token
def mine_create_purchase():""",
  """@app.route('/api/mine/purchases/create', methods=['POST'])
@verify_token
@require_psemine_access
def mine_create_purchase():""")

h("""@app.route('/api/mine/wallet', methods=['POST'])
@verify_token
def mine_set_wallet():""",
  """@app.route('/api/mine/wallet', methods=['POST'])
@verify_token
@require_psemine_access
def mine_set_wallet():""")

h("""@app.route('/api/mine/referrals/register', methods=['POST'])
@verify_token
def mine_register_referral():""",
  """@app.route('/api/mine/referrals/register', methods=['POST'])
@verify_token
@require_psemine_access
def mine_register_referral():""")

h("""@app.route('/api/mine/withdrawals/request', methods=['POST'])
@verify_token
def mine_create_withdrawal():""",
  """@app.route('/api/mine/withdrawals/request', methods=['POST'])
@verify_token
@require_psemine_access
def mine_create_withdrawal():""")


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
    print(f"OK: applied {applied} B5 decorators; backup at {BACKUP}")


if __name__ == "__main__":
    main()
