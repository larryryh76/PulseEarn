"""
Read-amplification regression tests for the PSEmine state path.

WHY
---
Production incident 2026-09-21 was Firestore quota exhaustion
(`ResourceExhausted`). The quota was the immediate cause, but the reason a single
dashboard poll could exhaust a project was read amplification:

  • `GET /api/mine/state` scanned the user's ENTIRE mining ledger, which is
    dominated by accrual entries, while both of its consumers
    (`canonical_net_paid_minor` via `available_balance_minor`) keep only
    `kind in (payout_debit, payout_reversal)`.
  • The campaign document was read twice per request.
  • The same ledger and withdrawal queries were issued twice per request.
  • The entitlement document (`users/{uid}`) was read up to three times.

These tests drive the REAL engine functions against the in-memory Firestore
double and count the reads that reach it, so a future edit that reintroduces a
duplicate query fails here instead of in production. The narrowed ledger query is
additionally proved EQUIVALENT: the narrowed projection must produce exactly the
balance the full projection produced.

`api/index.py` cannot be imported here (Flask and Firestore are not installed for
the test run), so its own composition rules are asserted by parsing the source
with `ast` — the technique `test_transaction_ordering.py` established.

Run: python3 -m unittest discover -s api/tests -t api/tests
"""
import ast
import os
import unittest
from datetime import timedelta

import test_payout_composition as tpc  # noqa: E402  in-memory Firestore double
import psemine_engine  # noqa: E402
from psemine_core import available_balance_minor, legacy_balance_minor  # noqa: E402

API_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


# ---------------------------------------------------------------------------
# Read counting: patch the double's two read entry points
# ---------------------------------------------------------------------------

class ReadCounter:
    """Counts Firestore read CALLS (document gets and query gets) by collection."""

    def __init__(self):
        self.calls = []

    def by_collection(self, name):
        return sum(1 for c in self.calls if c == name)


class counted:
    """Context manager that counts reads issued inside it."""

    def __enter__(self):
        self.reads = ReadCounter()
        self._orig_query = tpc._Query.get
        self._orig_doc = tpc._DocRef.get
        counter = self.reads

        def query_get(inner_self, transaction=None):
            counter.calls.append(inner_self._name)
            return self._orig_query(inner_self, transaction=transaction)

        def doc_get(inner_self, transaction=None):
            counter.calls.append(inner_self.collection)
            return self._orig_doc(inner_self, transaction=transaction)

        tpc._Query.get = query_get
        tpc._DocRef.get = doc_get
        return self.reads

    def __exit__(self, *exc):
        tpc._Query.get = self._orig_query
        tpc._DocRef.get = self._orig_doc
        return False


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

UID = "u1"


def _seed_ledger_and_payouts(db):
    """A realistic ledger: three accrual entries dominate three payout entries."""
    tpc._make_user(db, UID, accrued_minor=5000)
    tpc._ledger(db, UID, [
        ("payout_debit", -1500, "wd1"),
        ("payout_reversal", 300, "wd1"),
        ("accrual", 900, None),
        ("accrual", 800, None),
        ("accrual", 700, None),
        ("migration", 400, None),
    ])
    # canonical payout (source == "user") — excluded from the legacy sum
    tpc._withdrawal(db, UID, "wd1", 15.0, "completed", source="user")
    # genuine v1 withdrawal (no source) — counted once
    tpc._withdrawal(db, UID, "wd2", 4.0, "completed")
    return db


def _full_ledger_rows(db):
    return [r.to_dict() for r in
            db.collection("psemine_mining_ledger").where("userId", "==", UID).get()]


def _withdrawal_rows(db):
    return [r.to_dict() for r in
            db.collection("psemine_withdrawals").where("userId", "==", UID).get()]


def _state_balance(db):
    """The EXACT read composition of GET /api/mine/state's balance section."""
    u = db.collection("psemine_users").document(UID).get().to_dict() or {}
    ledger_rows = psemine_engine.payout_ledger_rows(db, UID)
    withdrawal_rows = _withdrawal_rows(db)
    debited = (psemine_engine._paid_out_minor(db, UID, rows=ledger_rows)
               + psemine_engine._legacy_paid_out_minor(db, UID, rows=withdrawal_rows))
    available = available_balance_minor(
        int(u.get("accruedMinor") or 0), ledger_rows, withdrawal_rows,
        legacy_accrued_minor=legacy_balance_minor(u),
    )
    return {"available": available, "debited": debited}


def _legacy_state_balance(db):
    """The pre-fix read shape, kept only to measure the reduction."""
    u = db.collection("psemine_users").document(UID).get().to_dict() or {}
    ledger_rows = _full_ledger_rows(db)
    withdrawal_rows = _withdrawal_rows(db)
    debited = psemine_engine._paid_out_minor(db, UID) + psemine_engine._legacy_paid_out_minor(db, UID)
    available = available_balance_minor(
        int(u.get("accruedMinor") or 0), ledger_rows, withdrawal_rows,
        legacy_accrued_minor=legacy_balance_minor(u),
    )
    return {"available": available, "debited": debited}


class TestStateReadComposition(unittest.TestCase):
    def setUp(self):
        self.db = _seed_ledger_and_payouts(tpc.FakeDB())

    def test_state_reads_the_ledger_once_and_withdrawals_once(self):
        with counted() as reads:
            _state_balance(self.db)
        self.assertEqual(reads.by_collection("psemine_mining_ledger"), 1,
                         "the state path must issue exactly ONE ledger query")
        self.assertEqual(reads.by_collection("psemine_withdrawals"), 1,
                         "the state path must issue exactly ONE withdrawal query")

    def test_pre_fix_shape_issued_four_queries_and_the_fix_is_equivalent(self):
        """Historical shape: 2 ledger + 2 withdrawal queries. The narrowed shape
        is 1 + 1 and MUST compute the same numbers."""
        with counted() as before:
            legacy = _legacy_state_balance(self.db)
        self.assertEqual(before.by_collection("psemine_mining_ledger"), 2)
        self.assertEqual(before.by_collection("psemine_withdrawals"), 2)

        with counted() as after:
            current = _state_balance(self.db)
        self.assertEqual(after.by_collection("psemine_mining_ledger"), 1)
        self.assertEqual(after.by_collection("psemine_withdrawals"), 1)
        # users/{uid} + one ledger query + one withdrawal query. Nothing else.
        self.assertEqual(len(after.calls), 3)
        self.assertEqual(current, legacy)

    def test_expected_balance_from_the_seeded_ledger(self):
        """Absolute check: the equation is unchanged, not merely self-consistent."""
        result = _state_balance(self.db)
        # accrued 5000 · canonical payout debits net of reversals = 1200
        # · genuine legacy withdrawal = 400
        self.assertEqual(result["debited"], 1600)
        self.assertEqual(result["available"], 3400)

    def test_ledger_projection_is_narrowed_to_the_payout_kinds(self):
        rows = psemine_engine.payout_ledger_rows(self.db, UID)
        self.assertEqual({r.get("kind") for r in rows}, {"payout_debit", "payout_reversal"},
                         "only the kinds the balance equation consumes may be read")
        self.assertLess(len(rows), len(_full_ledger_rows(self.db)),
                        "the narrowing must actually reduce documents read")

    def test_narrowed_projection_is_equivalent_to_the_full_ledger(self):
        narrow = psemine_engine.payout_ledger_rows(self.db, UID)
        full = _full_ledger_rows(self.db)
        withdrawals = _withdrawal_rows(self.db)
        self.assertEqual(
            available_balance_minor(5000, narrow, withdrawals, legacy_accrued_minor=0),
            available_balance_minor(5000, full, withdrawals, legacy_accrued_minor=0),
            "dropping rows no consumer reads must not change the balance",
        )

    def test_transactional_reads_keep_the_unfiltered_query(self):
        """A transaction must not depend on the new index. Inside a transaction
        the original query is used, so the row set is the full ledger."""
        txn = self.db.transaction()
        rows = psemine_engine.payout_ledger_rows(self.db, UID, txn=txn)
        self.assertIn("accrual", {r.get("kind") for r in rows})

    def test_rows_passed_in_issue_no_further_reads(self):
        rows = psemine_engine.payout_ledger_rows(self.db, UID)
        withdrawals = _withdrawal_rows(self.db)
        with counted() as reads:
            self.assertEqual(psemine_engine._paid_out_minor(self.db, UID, rows=rows), 1200)
            self.assertEqual(psemine_engine._legacy_paid_out_minor(self.db, UID, rows=withdrawals), 400)
        self.assertEqual(reads.calls, [], "reusing rows must not re-query")

    def test_missing_index_falls_back_to_the_full_ledger(self):
        """FAILED_PRECONDITION means the composite index is absent. The request
        must still succeed (exactly the previous behaviour)."""
        class FailedPrecondition(Exception):
            """google.api_core.exceptions.FailedPrecondition."""

        original_where = tpc._Query.where

        def where(inner_self, field, op, value):
            if op == "in":
                raise FailedPrecondition("no composite index for (userId, kind)")
            return original_where(inner_self, field, op, value)

        tpc._Query.where = where
        try:
            rows = psemine_engine.payout_ledger_rows(self.db, UID)
        finally:
            tpc._Query.where = original_where
        self.assertIn("accrual", {r.get("kind") for r in rows},
                      "the fallback must return the full ledger")

    def test_other_query_failures_propagate(self):
        """Capacity and outage failures must NOT be swallowed into a fallback:
        that would double the load exactly when the dependency is exhausted."""
        class ResourceExhausted(Exception):
            """google.api_core.exceptions.ResourceExhausted."""

        original_where = tpc._Query.where

        def where(inner_self, field, op, value):
            if op == "in":
                raise ResourceExhausted("429 Quota exceeded.")
            return original_where(inner_self, field, op, value)

        tpc._Query.where = where
        try:
            with self.assertRaises(ResourceExhausted):
                psemine_engine.payout_ledger_rows(self.db, UID)
        finally:
            tpc._Query.where = original_where


# ---------------------------------------------------------------------------
# One campaign read per accrual checkpoint
# ---------------------------------------------------------------------------

class TestAccrualCheckpointCampaignReuse(unittest.TestCase):
    """The state handler needs the campaign document for its response and the
    checkpoint needs it for its operating windows. One read, not two."""

    def setUp(self):
        self.campaign_calls = 0
        self._orig_fs = psemine_engine._firestore
        psemine_engine._firestore = None          # deterministic non-SDK path
        self._orig_ts = psemine_engine.firestore_server_ts
        psemine_engine.firestore_server_ts = lambda: tpc.TS
        self._orig_camp = psemine_engine.campaign_lifecycle_state

        now = psemine_engine.utcnow()
        self.camp = {
            "status": "active",
            "_effectiveStatus": "active",
            "startAt": (now - timedelta(days=1)).isoformat(),
            "endAt": (now + timedelta(days=30)).isoformat(),
        }

        def _stub(db, force_write=True):
            self.campaign_calls += 1
            return dict(self.camp), "active", False

        psemine_engine.campaign_lifecycle_state = _stub

    def tearDown(self):
        psemine_engine._firestore = self._orig_fs
        psemine_engine.firestore_server_ts = self._orig_ts
        psemine_engine.campaign_lifecycle_state = self._orig_camp

    def _seed(self):
        """A user with one operating tool that has genuinely accrued."""
        db = tpc.FakeDB()
        now = psemine_engine.utcnow()
        tpc._make_user(db, UID, accrued_minor=0)
        db.collection("psemine_tool_ownership").document("own1").set({
            "id": "own1", "userId": UID, "toolId": "elite", "status": "active",
            "cycleIndex": 1,
            "cycleStartedAt": (now - timedelta(hours=2)).isoformat(),
            "lastAccruedAt": (now - timedelta(hours=2)).isoformat(),
            "hourlyRateMinor": 10,
        })
        return db

    def test_supplied_campaign_snapshot_avoids_the_second_read(self):
        without = psemine_engine.accrual_checkpoint(self._seed(), UID, source="state")
        self.assertEqual(self.campaign_calls, 1)
        self.assertGreater(without["earnedMinor"], 0,
                           "the fixture must actually accrue, or equivalence proves nothing")

        self.campaign_calls = 0
        with_camp = psemine_engine.accrual_checkpoint(
            self._seed(), UID, source="state", camp=dict(self.camp))
        self.assertEqual(self.campaign_calls, 0,
                         "a supplied campaign snapshot must not be re-read")
        self.assertEqual(with_camp["earnedMinor"], without["earnedMinor"])

    def test_snapshot_without_the_derived_status_is_not_trusted(self):
        """Only a dict produced by campaign_lifecycle_state carries the derived
        effective status; anything else is re-read rather than guessed."""
        psemine_engine.accrual_checkpoint(
            self._seed(), UID, source="state", camp={"status": "active"})
        self.assertEqual(self.campaign_calls, 1)


# ---------------------------------------------------------------------------
# Structural enforcement inside api/index.py
# ---------------------------------------------------------------------------

def _functions(tree):
    return {n.name: n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)}


def _parents(tree):
    out = {}
    for parent in ast.walk(tree):
        for child in ast.iter_child_nodes(parent):
            out[id(child)] = parent
    return out


def _calls(fn):
    """Every call made in `fn`, as (unparsed source, lineno)."""
    out = []
    for node in ast.walk(fn):
        if isinstance(node, ast.Call):
            try:
                out.append((ast.unparse(node), node.lineno))
            except Exception:
                continue
    return out


class TestIndexStateComposition(unittest.TestCase):
    """index.py cannot be imported here, so its composition rules are asserted
    against the real source. Each assertion fails if the fix is reverted."""

    @classmethod
    def setUpClass(cls):
        with open(os.path.join(API_DIR, "index.py"), encoding="utf-8") as fh:
            cls.src = fh.read()
        cls.tree = ast.parse(cls.src)
        cls.functions = _functions(cls.tree)

    def _call_lines(self, fn_name, needle):
        return [line for src, line in _calls(self.functions[fn_name]) if needle in src]

    def test_state_reads_the_campaign_once_and_passes_it_to_the_checkpoint(self):
        state = self.functions["mine_state"]
        campaign_lines = self._call_lines("mine_state", "campaign_lifecycle_state")
        self.assertEqual(len(campaign_lines), 1,
                         "mine_state must read the campaign document exactly once")
        checkpoint_lines = [line for src, line in _calls(state) if "accrual_checkpoint" in src]
        self.assertEqual(len(checkpoint_lines), 1)
        self.assertLess(campaign_lines[0], checkpoint_lines[0],
                        "the campaign must be read BEFORE the checkpoint uses it")
        checkpoint_call = [n for n in ast.walk(state) if isinstance(n, ast.Call)
                           and isinstance(n.func, ast.Attribute)
                           and n.func.attr == "accrual_checkpoint"][0]
        self.assertIn("camp", [k.arg for k in checkpoint_call.keywords],
                      "mine_state must hand its campaign snapshot to accrual_checkpoint")

    def test_state_narrows_the_ledger_and_reuses_the_rows(self):
        state = self.functions["mine_state"]
        self.assertTrue(self._call_lines("mine_state", "payout_ledger_rows"),
                        "mine_state must read the narrowed payout projection")
        for helper in ("_paid_out_minor", "_legacy_paid_out_minor"):
            call = [n for n in ast.walk(state) if isinstance(n, ast.Call)
                    and isinstance(n.func, ast.Attribute) and n.func.attr == helper]
            self.assertEqual(len(call), 1, f"{helper} must be called exactly once")
            self.assertIn("rows", [k.arg for k in call[0].keywords],
                          f"{helper} must reuse the rows already read")

    def test_no_unfiltered_ledger_scan_remains(self):
        needle = 'psemine_mining_ledger").where("userId", "==", uid).get()'
        self.assertNotIn(needle, self.src,
                         "every user-ledger read must go through payout_ledger_rows")

    def test_entitlement_reads_the_user_document_through_the_request_cache(self):
        for fn_name in ("has_psemine_access", "is_admin", "is_moderator"):
            fn = self.functions[fn_name]
            direct = [src for src, _ in _calls(fn)
                      if "collection('users')" in src and ".get()" in src]
            self.assertEqual(direct, [],
                             f"{fn_name} must read the user document via _request_user_doc")
            self.assertTrue([src for src, _ in _calls(fn) if "_request_user_doc" in src],
                            f"{fn_name} must call _request_user_doc")

    def test_request_cache_is_per_request_keyed_by_uid_and_fails_loud(self):
        fn = self.functions["_request_user_doc"]
        source = ast.unparse(fn)
        self.assertIn("cache[uid]", source, "the cache must be keyed by the caller's uid")
        # The cache must be stored on Flask's per-request `g`, not in a module
        # global: a module-level cache would leak entitlement across callers and
        # survive past the request that read it.
        self.assertIn("_pse_user_doc_cache", source)
        # "Absent" must be cached as a distinct value, so a missing document is
        # not re-read on every check within the same request.
        self.assertIn("_USER_DOC_ABSENT", source)
        module_globals = [n for n in self.tree.body if isinstance(n, ast.Assign)]
        for node in module_globals:
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "_pse_user_doc_cache":
                    self.fail("the entitlement cache must not be a module-level global")

        # The database read itself must NOT be wrapped in try/except: an
        # exhausted or unavailable database must propagate so the request fails
        # as an upstream 503 instead of looking like an unenrolled account.
        parents = _parents(fn)
        read_calls = [node for node in ast.walk(fn) if isinstance(node, ast.Call)
                      and isinstance(node.func, ast.Attribute) and node.func.attr == "get"
                      and "collection('users')" in ast.unparse(node)]
        self.assertTrue(read_calls, "the user-document read must exist")
        for call in read_calls:
            node = call
            while id(node) in parents:
                node = parents[id(node)]
                self.assertNotIsInstance(
                    node, ast.Try,
                    "the entitlement read must not swallow an upstream failure")


if __name__ == "__main__":
    unittest.main()
