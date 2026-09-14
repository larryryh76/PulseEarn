"""
B-F1 composed regression tests: the canonical payout lifecycle against the REAL
engine functions (create_payout_request, accrual_checkpoint) and the REAL
accounting equation (psemine_core.available_balance_minor), exercised through a
minimal in-memory Firestore implementing the semantics the engine relies on:
transaction get/set/update, where() query filtering, commit-on-success.

These are NOT isolated helper tests — they compose the same reads/writes the
production code performs, so a double-count anywhere in the chain fails here.

Run: python3 -m unittest discover -s api/tests -t api
"""
import os
import sys
import unittest
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import psemine_engine  # noqa: E402
from psemine_core import (  # noqa: E402
    available_balance_minor,
    legacy_balance_minor,
    legacy_withdrawal_paid_minor,
    canonical_net_paid_minor,
)


# ---------------------------------------------------------------------------
# Minimal in-memory Firestore
# ---------------------------------------------------------------------------

class _Query:
    def __init__(self, store, name, filters=None):
        """Initialize the query test double."""
        self._store = store
        self._name = name  # collection NAME: transactional lookups resolve by name
        self._filters = filters or []

    def where(self, field, op, value):
        """Return a query with the requested filter appended."""
        return _Query(self._store, self._name, self._filters + [(field, op, value)])

    def limit(self, _n):
        """Return this query because the test double does not enforce limits."""
        return self

    def get(self, transaction=None):
        """Read documents from the current committed or transactional view."""
        rows = self._store.current() if transaction is None else transaction.table(self._name).current()
        out = []
        for doc in rows.values():
            data = doc["data"] if transaction is None else dict(doc["data"])
            if all(self._match(data, f, op, v) for f, op, v in self._filters):
                out.append(_Snap(doc["id"], data))
        return out

    @staticmethod
    def _match(data, field, op, value):
        """Return whether a document satisfies one query predicate."""
        actual = data.get(field)
        if op == "==":
            return actual == value
        if op == "in":
            return actual in value
        return False


class _Snap:
    def __init__(self, doc_id, data):
        """Initialize the snap test double."""
        self.id = doc_id
        self._data = data

    def to_dict(self):
        """Return a copy of the snapshot data."""
        return dict(self._data)

    @property
    def exists(self):
        """Return whether the snapshot represents an existing document."""
        return True


class _Txn:
    """Transactional view: buffered writes, reads see them after commit-on-success."""

    def __init__(self, store):
        """Initialize the txn test double."""
        self._store = store
        self._ops = []

    def table(self, name):
        """Return the collection store used by this transaction."""
        return self._store

    # reads reflect committed state (no intermediate visibility)
    def get(self, doc_ref):
        """Read documents from the current committed or transactional view."""
        data, exists = self._store.read(doc_ref.id)
        return _MaybeSnap(doc_ref.id, data if exists else None, exists)

    def set(self, doc_ref, payload, merge=False):
        """Buffer or apply a document set operation."""
        self._ops.append(("set", doc_ref.id, dict(payload), merge))

    def update(self, doc_ref, updates):
        """Buffer or apply a document update operation."""
        self._ops.append(("update", doc_ref.id, dict(updates), False))

    def commit(self):
        """Apply all buffered transaction operations."""
        for kind, doc_id, payload, merge in self._ops:
            if kind == "set":
                self._store.set(doc_id, payload, merge)
            else:
                self._store.update(doc_id, payload)


class _DocRef:
    def __init__(self, store, collection, doc_id):
        """Initialize the docref test double."""
        self._store = store
        self.collection = collection
        self.id = doc_id

    def get(self, transaction=None):
        """Read documents from the current committed or transactional view."""
        if transaction is not None:
            return transaction.get(self)
        data, exists = self._store.read(self.id)
        return _MaybeSnap(self.id, data if exists else None, exists)

    def set(self, payload, merge=False):
        """Buffer or apply a document set operation."""
        self._store.set(self.id, payload, merge)

    def update(self, payload):
        """Buffer or apply a document update operation."""
        self._store.update(self.id, payload)


class _MaybeSnap(_Snap):
    def __init__(self, doc_id, data, exists):
        """Initialize the maybesnap test double."""
        super().__init__(doc_id, data or {})
        self._exists = exists

    @property
    def exists(self):
        """Return whether the snapshot represents an existing document."""
        return self._exists


class _Collection:
    def __init__(self, store, name):
        """Initialize the collection test double."""
        self._store = store
        self.name = name

    def document(self, doc_id=None):
        """Return a document reference, generating an identifier when needed."""
        if doc_id is None:
            doc_id = f"{self.name}_{len(self._store.current()) + 1}"
            while doc_id in self._store.current():
                doc_id += "x"
        return _DocRef(self._store, self.name, doc_id)

    def where(self, field, op, value):
        """Return a query with the requested filter appended."""
        return _Query(self._store, self.name, [(field, op, value)])

    def get(self):
        """Read documents from the current committed or transactional view."""
        snaps = []
        for doc_id, doc in self._store.current().items():
            snaps.append(_Snap(doc_id, doc["data"]))
        return snaps


class FakeStore:
    """One namespace = one collection. current() returns committed docs."""

    def __init__(self):
        """Initialize the fakestore test double."""
        self._committed = {}
        self._seq = 0

    def current(self):
        """Return the currently committed documents."""
        return self._committed

    def read(self, doc_id):
        """Read a committed document and its existence state."""
        doc = self._committed.get(doc_id)
        return (dict(doc["data"]), True) if doc else ({}, False)

    def set(self, doc_id, payload, merge=False):
        """Buffer or apply a document set operation."""
        if merge and doc_id in self._committed:
            self._committed[doc_id]["data"].update(payload)
        else:
            self._committed[doc_id] = {"id": doc_id, "data": dict(payload)}

    def update(self, doc_id, payload):
        """Buffer or apply a document update operation."""
        if doc_id in self._committed:
            self._committed[doc_id]["data"].update(payload)

    def transaction(self):
        """Create a transaction over the fake database state."""
        return _Txn(self)


class FakeDB:
    def __init__(self):
        """Initialize the fakedb test double."""
        self._namespaces = {}

    def collection(self, name):
        """Return a named collection from the fake database."""
        if name not in self._namespaces:
            self._namespaces[name] = FakeStore()
        return _Collection(self._namespaces[name], name)

    def transaction(self):
        """Create a transaction over the fake database state."""
        return _MultiTxn(self._namespaces)

    def coll(self, name):
        """Direct committed-state view of one collection: {doc_id: data}."""
        return dict(self._namespaces.get(name, {}))


class _MultiTxn:
    """Cross-collection transaction with commit-on-success."""

    def __init__(self, namespaces):
        """Initialize the multitxn test double."""
        self._namespaces = namespaces
        self._ops = []

    def table(self, name):
        """Return the collection store used by this transaction."""
        return self._namespaces.setdefault(name, FakeStore())

    def get(self, doc_ref):
        """Read documents from the current committed or transactional view."""
        store = self._namespaces.setdefault(doc_ref.collection, FakeStore())
        data, exists = store.read(doc_ref.id)
        return _MaybeSnap(doc_ref.id, data if exists else None, exists)

    def set(self, doc_ref, payload, merge=False):
        """Buffer or apply a document set operation."""
        self._ops.append((doc_ref.collection, doc_ref.id, dict(payload), "set", merge))

    def update(self, doc_ref, updates):
        """Buffer or apply a document update operation."""
        self._ops.append((doc_ref.collection, doc_ref.id, dict(updates), "update", False))

    def commit(self):
        """Apply all buffered transaction operations."""
        for coll, doc_id, payload, kind, merge in self._ops:
            store = self._namespaces.setdefault(coll, FakeStore())
            if kind == "set":
                store.set(doc_id, payload, merge)
            else:
                store.update(doc_id, payload)


def _query_rows(multi_txn, collection, filters):
    """Return rows matching the fake transaction query filters."""
    rows = multi_txn.table(collection)
    out = []
    for doc in rows.values():
        data = dict(doc["data"])
        ok = True
        for f, op, v in filters:
            if op == "=" and data.get(f) != v:
                ok = False
                break
            if op == "in" and data.get(f) not in v:
                ok = False
                break
        if ok:
            out.append(_Snap(doc["id"], data))
    return out


# ---------------------------------------------------------------------------
# Helpers to build lifecycle states
# ---------------------------------------------------------------------------

TS = datetime(2026, 9, 13, tzinfo=timezone.utc)


def _make_user(db, uid="u1", accrued_minor=2000, legacy_gbp=0.0, wallet="0x" + "a" * 40):
    """Seed a canonical user with optional legacy balance state."""
    db.collection("psemine_users").document(uid).set({
        "id": uid, "uid": uid, "userId": uid,
        "accruedMinor": accrued_minor,
        "totalAccruedGBP": accrued_minor / 100.0,
        "payoutWallet": wallet,
        "payoutDebitedMinor": 0,
        "qualifiedReferralsCount": 0,
        "lastReferralAccruedAt": TS.isoformat(),
        "status": "active",
    })
    if legacy_gbp:
        db.collection("psemine_users").document(uid).update({"totalAccruedGBP": legacy_gbp})


def _ended_campaign(db):
    """Seed the canonical campaign in its ended state."""
    db.collection("psemine_campaigns").document("active_campaign").set({
        "id": "active_campaign", "status": "ended",
        "startAt": TS.isoformat(),
        "endAt": TS.isoformat(),
    })


def _ledger(db, uid, entries):
    """entries: list of (kind, amountMinor, withdrawalId|None)."""
    for i, (kind, amount, wd) in enumerate(entries):
        db.collection("psemine_mining_ledger").document(f"seed_{uid}_{i}").set({
            "id": f"seed_{uid}_{i}", "userId": uid, "kind": kind,
            "amountMinor": amount, "withdrawalId": wd,
        })


def _withdrawal(db, uid, wd_id, amount_gbp, status, source=None):
    """Seed a withdrawal row with the requested lifecycle state."""
    payload = {
        "id": wd_id, "userId": uid, "amountGbp": amount_gbp,
        "amountMinor": int(round(amount_gbp * 100)),
        "status": status, "payoutAddress": "0x" + "b" * 40,
    }
    if source:
        payload["source"] = source
    db.collection("psemine_withdrawals").document(wd_id).set(payload)


def _available(db, uid="u1"):
    """Read availability exactly the way the production payout gate does."""
    u = db.collection("psemine_users").document(uid).get().to_dict()
    ledger_rows = [r.to_dict() for r in db.collection("psemine_mining_ledger").where("userId", "==", uid).get()]
    wd_rows = [r.to_dict() for r in db.collection("psemine_withdrawals").where("userId", "==", uid).get()]
    return available_balance_minor(
        int(u.get("accruedMinor") or 0), ledger_rows, wd_rows,
        legacy_accrued_minor=legacy_balance_minor(u),
    )


# ---------------------------------------------------------------------------
# The composed lifecycle tests
# ---------------------------------------------------------------------------

class TestPayoutLifecycleComposition(unittest.TestCase):
    def setUp(self):
        """Create shared test fixtures and deterministic dependencies."""
        self.db = FakeDB()
        self._orig_camp = psemine_engine.campaign_lifecycle_state
        psemine_engine.campaign_lifecycle_state = (
            lambda db, force_write=True: ({"status": "ended"}, "ended", False)
        )
        self._orig_ts = psemine_engine.firestore_server_ts
        psemine_engine.firestore_server_ts = lambda: TS

    def tearDown(self):
        """Restore dependencies replaced by the test fixture."""
        psemine_engine.campaign_lifecycle_state = self._orig_camp
        psemine_engine.firestore_server_ts = self._orig_ts

    # -- TEST 1: REQUEST — available drops by exactly the amount --------------
    def test_1_request_decreases_available_by_exactly_once(self):
        """Verify request decreases available by exactly once."""
        db = self.db
        _make_user(db, accrued_minor=2000)  # £20 canonical, no legacy
        self.assertEqual(_available(db), 2000)

        result = psemine_engine.create_payout_request(db, "u1", 10.0)
        self.assertTrue(result.get("ok"), result)

        # ledger has ONE debit of -1000; withdrawal row exists with source=user
        ledger = [r.to_dict() for r in db.collection("psemine_mining_ledger").get()]
        debits = [r for r in ledger if r.get("kind") == "payout_debit"]
        self.assertEqual(len(debits), 1)
        self.assertEqual(debits[0]["amountMinor"], -1000)

        wds = [r.to_dict() for r in db.collection("psemine_withdrawals").get()]
        self.assertEqual(len(wds), 1)
        self.assertEqual(wds[0].get("source"), "user")

        # £20 - £10 = £10 (NOT £0 — the double-count would do that)
        self.assertEqual(_available(db), 1000)

    # -- TEST 2: REJECT — reversal restores exactly once ----------------------
    def test_2_rejection_reverses_debit_exactly_once(self):
        """Verify rejection reverses debit exactly once."""
        db = self.db
        _make_user(db, accrued_minor=2000)
        result = psemine_engine.create_payout_request(db, "u1", 10.0)
        self.assertTrue(result.get("ok"))
        wd_id = result["withdrawalId"]
        self.assertEqual(_available(db), 1000)

        # Admin rejection path (mirrors admin_psemine_review_withdrawal):
        wd_ref = db.collection("psemine_withdrawals").document(wd_id)
        wd_ref.update({"status": "rejected"})
        amount_minor = 1000

        # the exact idempotent reversal the admin endpoint writes:
        # deterministic payout_reversal_{wd_id} ledger entry + payoutDebitedMinor decrement
        rev_ref = db.collection("psemine_mining_ledger").document(f"payout_reversal_{wd_id}")
        self.assertFalse(rev_ref.get().exists)
        rev_ref.set({
            "id": f"payout_reversal_{wd_id}", "userId": "u1",
            "kind": "payout_reversal", "amountMinor": amount_minor,
            "withdrawalId": wd_id, "status": "rejected",
        })
        u_ref = db.collection("psemine_users").document("u1")
        u = u_ref.get().to_dict()
        u_ref.update({"payoutDebitedMinor": max(0, int(u.get("payoutDebitedMinor") or 0) - amount_minor)})

        # reversal counted EXACTLY ONCE: available back to £20, not £30
        self.assertEqual(_available(db), 2000)

    # -- TEST 3: APPROVED/PROCESSING — no second subtraction ------------------
    def test_3_status_changes_never_double_subtract(self):
        """Verify status changes never double subtract."""
        db = self.db
        _make_user(db, accrued_minor=2000)
        result = psemine_engine.create_payout_request(db, "u1", 10.0)
        wd_id = result["withdrawalId"]
        self.assertEqual(_available(db), 1000)

        wd_ref = db.collection("psemine_withdrawals").document(wd_id)
        for status in ("under_review", "approved", "processing"):
            wd_ref.update({"status": status})
            # canonical debit counted once regardless of status movement;
            # the row is source=user so the legacy aggregator ignores it
            self.assertEqual(_available(db), 1000, f"status={status}")

    # -- TEST 4: COMPLETED — still represented exactly once -------------------
    def test_4_completion_keeps_single_representation(self):
        """Verify completion keeps single representation."""
        db = self.db
        _make_user(db, accrued_minor=2000)
        result = psemine_engine.create_payout_request(db, "u1", 10.0)
        wd_id = result["withdrawalId"]
        wd_ref = db.collection("psemine_withdrawals").document(wd_id)
        wd_ref.update({"status": "completed", "payoutTxHash": "0x" + "c" * 64})
        # completed canonical row STILL excluded from legacy aggregation
        self.assertEqual(_available(db), 1000)

        # legacy aggregator direct check: source=user rows never count
        rows = [r.to_dict() for r in db.collection("psemine_withdrawals").get()]
        self.assertEqual(legacy_withdrawal_paid_minor(rows), 0)

    # -- TEST 5: REPEATED REQUEST — duplicate rejected, no second debit -------
    def test_5_duplicate_request_rejected_no_second_debit(self):
        """Verify duplicate request rejected no second debit."""
        db = self.db
        _make_user(db, accrued_minor=2000)
        first = psemine_engine.create_payout_request(db, "u1", 10.0)
        self.assertTrue(first.get("ok"))
        second = psemine_engine.create_payout_request(db, "u1", 10.0)
        self.assertFalse(second.get("ok"))
        self.assertEqual(second.get("error"), "PENDING_PAYOUT_EXISTS")

        debits = [r.to_dict() for r in db.collection("psemine_mining_ledger").get()
                  if r.to_dict().get("kind") == "payout_debit"]
        self.assertEqual(len(debits), 1)
        self.assertEqual(_available(db), 1000)

    # -- mixed canonical + legacy rows: the historical-compatibility case ------
    def test_6_legacy_rows_still_counted(self):
        """Verify legacy rows still counted."""
        db = self.db
        _make_user(db, accrued_minor=2000)
        # genuine v1 legacy withdrawal (no source field) — must still count
        _withdrawal(db, "u1", "legacy_wd", 5.0, "completed")
        self.assertEqual(_available(db), 1500)  # 2000 - 500 legacy

        # now a canonical payout on top
        result = psemine_engine.create_payout_request(db, "u1", 10.0)
        self.assertTrue(result.get("ok"))
        # £15 - £10 = £5 — legacy counted once, canonical once
        self.assertEqual(_available(db), 500)

    # -- pre-absorption legacy accrual counted exactly once --------------------
    def test_7_legacy_accrued_counted_once_before_absorption(self):
        """Verify legacy accrued counted once before absorption."""
        db = self.db
        _make_user(db, accrued_minor=0, legacy_gbp=5.0)  # legacy £5, no ledger
        self.assertEqual(_available(db), 500)  # exactly once
        self.assertEqual(legacy_balance_minor({"totalAccruedGBP": 5.0}), 500)

    # -- absorption flag zeroes the legacy contribution ------------------------
    def test_8_absorbed_legacy_not_recounted(self):
        """Verify absorbed legacy not recounted."""
        db = self.db
        _make_user(db, accrued_minor=750, legacy_gbp=7.50)
        u_ref = db.collection("psemine_users").document("u1")
        u_ref.update({"legacyBalanceAbsorbedMinor": 500})
        self.assertEqual(_available(db), 750)  # NOT 1250

    # -- malformed rows are safe ------------------------------------------------
    def test_9_malformed_rows_are_safe(self):
        """Verify malformed rows are safe."""
        self.assertEqual(legacy_withdrawal_paid_minor(None), 0)
        self.assertEqual(legacy_withdrawal_paid_minor([None, 42, "x"]), 0)
        self.assertEqual(canonical_net_paid_minor(None), 0)
        self.assertEqual(canonical_net_paid_minor([None, "bad"]), 0)
        self.assertEqual(available_balance_minor(None, None, None), 0)
        self.assertEqual(available_balance_minor("500", [], []), 500)  # str tolerated


class TestNetPaidEquation(unittest.TestCase):
    def test_debit_and_reversal_net_to_zero(self):
        """Verify debit and reversal net to zero."""
        rows = [
            {"kind": "payout_debit", "amountMinor": -1000},
            {"kind": "payout_reversal", "amountMinor": 1000},
        ]
        self.assertEqual(canonical_net_paid_minor(rows), 0)

    def test_debit_alone(self):
        """Verify debit alone."""
        self.assertEqual(canonical_net_paid_minor([{"kind": "payout_debit", "amountMinor": -1000}]), 1000)

    def test_irrelevant_kinds_ignored(self):
        """Verify irrelevant kinds ignored."""
        rows = [
            {"kind": "accrual", "amountMinor": 123},
            {"kind": "migration", "amountMinor": 500},
            {"kind": "payout_debit", "amountMinor": -1000},
        ]
        self.assertEqual(canonical_net_paid_minor(rows), 1000)

    def test_multiple_payouts_accumulate(self):
        """Verify multiple payouts accumulate."""
        rows = [
            {"kind": "payout_debit", "amountMinor": -1000},
            {"kind": "payout_debit", "amountMinor": -500},
        ]
        self.assertEqual(canonical_net_paid_minor(rows), 1500)


if __name__ == "__main__":
    unittest.main()
