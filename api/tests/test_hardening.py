"""
Hardening regression tests (remediation pass on top of 2c21191).

Covers the two defects the pre-merge review found in the backend, plus the
invariant that made the firestore transaction-ordering bug invisible to tests:

  1. Firestore transaction read/write ordering on the maintenance path
     (maintain_ownership), including the anchor-less legacy ownership branch
     that previously buffered a write BEFORE two later reads.
  2. Lifecycle (cron) authorization must FAIL CLOSED when CRON_SECRET is not
     configured, deny on a missing/incorrect credential, and allow only an
     exact constant-time match.
  3. The transaction test double itself must reject read-after-write, so the
     ordering rule can never silently regress again.

Run: python3 -m unittest discover api/tests
"""
import os
import sys
import unittest
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import psemine_engine  # noqa: E402
import test_payout_composition as tpc  # noqa: E402  (reuse the in-memory Firestore)


class TestCronFailClosed(unittest.TestCase):
    """CRON_SECRET must refuse when unconfigured, and never fail open."""

    def test_missing_configuration_denies(self):
        allowed, code = psemine_engine.cron_lifecycle_authorized("anything", None)
        self.assertFalse(allowed)
        self.assertEqual(code, psemine_engine.CRON_NOT_CONFIGURED)

    def test_empty_configuration_denies(self):
        allowed, code = psemine_engine.cron_lifecycle_authorized("anything", "")
        self.assertFalse(allowed)
        self.assertEqual(code, psemine_engine.CRON_NOT_CONFIGURED)

    def test_missing_credential_denies(self):
        allowed, code = psemine_engine.cron_lifecycle_authorized(None, "s3cret")
        self.assertFalse(allowed)
        self.assertEqual(code, "FORBIDDEN")
        allowed, code = psemine_engine.cron_lifecycle_authorized("", "s3cret")
        self.assertFalse(allowed)
        self.assertEqual(code, "FORBIDDEN")

    def test_incorrect_credential_denies(self):
        allowed, code = psemine_engine.cron_lifecycle_authorized("wrong", "s3cret")
        self.assertFalse(allowed)
        self.assertEqual(code, "FORBIDDEN")

    def test_correct_credential_allows(self):
        allowed, _ = psemine_engine.cron_lifecycle_authorized("s3cret", "s3cret")
        self.assertTrue(allowed)

    def test_non_string_credentials_deny_rather_than_raise(self):
        allowed, code = psemine_engine.cron_lifecycle_authorized({"a": 1}, "s3cret")
        self.assertFalse(allowed)
        self.assertEqual(code, "FORBIDDEN")


class TestMaintenanceTransactionOrdering(unittest.TestCase):
    """maintain_ownership must read-then-write on every exit path."""

    def setUp(self):
        """Wire the engine to the in-memory Firestore with an active campaign."""
        self.db = tpc.FakeDB()
        self._orig_fs = psemine_engine._firestore
        self._orig_camp = psemine_engine.campaign_lifecycle_state
        self._orig_ts = psemine_engine.firestore_server_ts
        psemine_engine._firestore = None  # force the explicit-commit code path
        psemine_engine.firestore_server_ts = lambda: tpc.TS
        now = datetime.now(timezone.utc)
        self.now = now
        self.camp = {
            "id": "active_campaign",
            "status": "active",
            "_effectiveStatus": "active",
            "startAt": (now - timedelta(days=2)).isoformat(),
            "endAt": (now + timedelta(days=88)).isoformat(),
        }
        psemine_engine.campaign_lifecycle_state = (
            lambda db, force_write=True: (self.camp, "active", False)
        )

    def tearDown(self):
        """Restore the dependencies replaced by the fixture."""
        psemine_engine._firestore = self._orig_fs
        psemine_engine.campaign_lifecycle_state = self._orig_camp
        psemine_engine.firestore_server_ts = self._orig_ts

    # -- the transaction double really enforces the ordering rule ------------
    def test_transaction_double_rejects_read_after_write(self):
        """Guard liveness: the fake must raise on read-after-write, or these
        ordering tests would be worthless."""
        db = self.db
        ref = db.collection("psemine_tool_ownership").document("own1")
        txn = db.transaction()
        txn.update(ref, {"status": "active"})
        with self.assertRaises(AssertionError):
            ref.get(transaction=txn)

    # -- B2 anchor-less legacy path: previously write-then-read -------------
    def test_anchorless_legacy_maintenance_reconciles_without_ordering_violation(self):
        """The exact path the review flagged: reconciliation must be buffered
        last, and the call must complete without a read-after-write failure."""
        uid = "u-legacy"
        own_id = "own-legacy"
        self.db.collection("psemine_tool_ownership").document(own_id).set({
            "id": own_id,
            "userId": uid,
            "toolId": "starter",
            "toolName": "Starter Miner",
            "status": "active",
            "hourlyRateMinor": 10,
            "activatedAt": (self.now - timedelta(days=5)).isoformat(),
            # deliberately NO cycleStartedAt / lastAccruedAt -> anchor-less
        })
        tpc._make_user(self.db, uid=uid, accrued_minor=0)

        result = psemine_engine.maintain_ownership(self.db, uid, own_id)

        # Anchor-less ownership has no canonical cycle to complete: the engine
        # reconciles the anchor and defers maintenance to the next call.
        self.assertFalse(result.get("ok"))
        self.assertEqual(result.get("error"), "CYCLE_NOT_COMPLETE")
        doc = self.db.collection("psemine_tool_ownership").document(own_id).get().to_dict()
        self.assertTrue(doc.get("accrualAnchorReconciled"))
        self.assertTrue(doc.get("cycleStartedAt"))

    # -- settle path: reads first, writes last ------------------------------
    def test_cycle_complete_maintenance_settles_with_strict_ordering(self):
        """A completed cycle must settle its eligible time, and the write phase
        must not be followed by any read."""
        uid = "u-canon"
        own_id = "own-canon"
        started = self.now - timedelta(hours=31)  # past cycle + grace -> maintenance
        self.db.collection("psemine_tool_ownership").document(own_id).set({
            "id": own_id,
            "userId": uid,
            "toolId": "starter",
            "toolName": "Starter Miner",
            "status": "active",
            "hourlyRateMinor": 10,           # £0.10/hour
            "cycleIndex": 0,
            "cycleStartedAt": started.isoformat(),
            "lastAccruedAt": started.isoformat(),
        })
        tpc._make_user(self.db, uid=uid, accrued_minor=0)

        result = psemine_engine.maintain_ownership(self.db, uid, own_id)

        self.assertTrue(result.get("ok"), result)
        # The anchor was never advanced, so the whole eligible cycle settles:
        # OPERATING_CYCLE_HOURS (24h) at £0.10/hr = £2.40 = 240 minor.
        self.assertEqual(result.get("settledMinor"), 240)
        user = self.db.collection("psemine_users").document(uid).get().to_dict()
        self.assertEqual(int(user.get("accruedMinor") or 0), 240)
        ledger = self.db.collection("psemine_mining_ledger").get()
        self.assertEqual(len(list(ledger)), 1)
        doc = self.db.collection("psemine_tool_ownership").document(own_id).get().to_dict()
        self.assertEqual(doc.get("status"), "active")
        self.assertEqual(int(doc.get("cycleIndex") or 0), 1)

    # -- accrual checkpoint keeps its ordering too --------------------------
    def test_accrual_checkpoint_has_no_ordering_violation(self):
        """The accrual writer is the other transaction body; it must stay
        strictly read-then-write (this is what produced the production 500)."""
        uid = "u-accrual"
        own_id = "own-accrual"
        started = self.now - timedelta(hours=2)
        self.db.collection("psemine_tool_ownership").document(own_id).set({
            "id": own_id,
            "userId": uid,
            "toolId": "builder",
            "status": "active",
            "hourlyRateMinor": 50,           # £0.50/hour
            "cycleIndex": 0,
            "cycleStartedAt": started.isoformat(),
            "lastAccruedAt": started.isoformat(),
        })
        tpc._make_user(self.db, uid=uid, accrued_minor=0, wallet="0x" + "a" * 40)

        ck = psemine_engine.accrual_checkpoint(self.db, uid, source="state")

        # 2 eligible hours at £0.50/hr
        self.assertEqual(ck.get("earnedMinor"), 100)
        user = self.db.collection("psemine_users").document(uid).get().to_dict()
        self.assertEqual(int(user.get("accruedMinor") or 0), 100)

    def test_accrual_checkpoint_is_idempotent_on_repeat(self):
        """A second checkpoint over the same window earns nothing new."""
        uid = "u-accrual-2"
        own_id = "own-accrual-2"
        started = self.now - timedelta(hours=2)
        self.db.collection("psemine_tool_ownership").document(own_id).set({
            "id": own_id, "userId": uid, "toolId": "builder", "status": "active",
            "hourlyRateMinor": 50, "cycleIndex": 0,
            "cycleStartedAt": started.isoformat(), "lastAccruedAt": started.isoformat(),
        })
        tpc._make_user(self.db, uid=uid, accrued_minor=0, wallet="0x" + "a" * 40)

        first = psemine_engine.accrual_checkpoint(self.db, uid, source="state")
        second = psemine_engine.accrual_checkpoint(self.db, uid, source="state")
        self.assertEqual(first.get("earnedMinor"), 100)
        # The anchor advanced to the same window end, so no further eligible time.
        self.assertEqual(second.get("earnedMinor"), 0)
        user = self.db.collection("psemine_users").document(uid).get().to_dict()
        self.assertEqual(int(user.get("accruedMinor") or 0), 100)


if __name__ == "__main__":
    unittest.main()
