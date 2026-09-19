"""
Regression tests for two production-proven defects (2026-09-19):

1. purchase_intent_reuse_decision: a SAME-payer re-create used to return
   'reuse' unconditionally, even when the stored quote had already lapsed.
   Verified on production: an intent created 16:36 (quote expired 16:51) was
   handed back at 16:53 with existing=true — dead-ending the (user, tool)
   pair behind a quote no payment could ever satisfy (verification always
   QUOTE_EXPIRED). The fix: same-payer reuse is idempotent ONLY inside the
   quote window; a lapsed quote supersedes to a fresh intent.

2. register_referral: an unresolvable referral code used to fall through with
   the raw code as referrer_id, creating an ORPHAN referral row (referring to
   a non-existent account) and returning HTTP 200 with a phantom invite
   activity/notification. The fix: unresolvable codes are a hard
   REFERRER_NOT_FOUND error — no row, no activity, no notification.

Run: python3 -m pytest api/tests -q   (from repo root or api/tests)
"""
import os
import sys
import unittest
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import psemine_engine  # noqa: E402
from psemine_engine import (  # noqa: E402
    register_referral,
    purchase_intent_reuse_decision,
)

# Reuse the minimal in-memory Firestore from the composed payout tests.
try:
    from test_payout_composition import FakeDB  # noqa: E402
except ImportError:  # pytest run from inside api/tests (sibling import)
    from tests.test_payout_composition import FakeDB  # noqa: E402

WALLET_A = "0x1111111111111111111111111111111111111111"
WALLET_B = "0x2222222222222222222222222222222222222222"
NOW = datetime(2026, 9, 19, 16, 50, 0, tzinfo=timezone.utc)
LIVE_QUOTE = (NOW + timedelta(minutes=10)).isoformat()
LAPSED_QUOTE = (NOW - timedelta(minutes=10)).isoformat()


def _referrals(db):
    """Committed psemine_referrals documents as {doc_id: data}."""
    return db.coll("psemine_referrals")


# ---------------------------------------------------------------------------
# 1. purchase_intent_reuse_decision
# ---------------------------------------------------------------------------

class IntentReuseDecisionTests(unittest.TestCase):
    """The create endpoint must never hand back an intent that cannot verify."""

    def test_same_wallet_live_quote_reuses(self):
        """Idempotent re-create inside the quote window keeps the same intent."""
        action, code = purchase_intent_reuse_decision(
            WALLET_A, WALLET_A, LIVE_QUOTE, now=NOW
        )
        self.assertEqual((action, code), ("reuse", None))

    def test_same_wallet_lapsed_quote_supersedes(self):
        """THE REGRESSION: same payer + expired quote must NOT reuse forever."""
        action, code = purchase_intent_reuse_decision(
            WALLET_A, WALLET_A, LAPSED_QUOTE, now=NOW
        )
        self.assertEqual(action, "supersede")
        self.assertIsNone(code)

    def test_same_wallet_missing_expiry_supersedes(self):
        """A missing expiry counts as lapsed (never lock the tier)."""
        action, code = purchase_intent_reuse_decision(
            WALLET_A, WALLET_A, None, now=NOW
        )
        self.assertEqual((action, code), ("supersede", None))

    def test_same_wallet_unparseable_expiry_supersedes(self):
        """An unparseable expiry counts as lapsed rather than dead-ending."""
        action, code = purchase_intent_reuse_decision(
            WALLET_A, WALLET_A, "not-a-timestamp", now=NOW
        )
        self.assertEqual((action, code), ("supersede", None))

    def test_different_wallet_live_quote_is_rebind_forbidden(self):
        """A live intent is never re-pointed at another payer."""
        action, code = purchase_intent_reuse_decision(
            WALLET_A, WALLET_B, LIVE_QUOTE, now=NOW
        )
        self.assertEqual((action, code), ("rebind_forbidden", "WALLET_MISMATCH"))

    def test_different_wallet_lapsed_quote_supersedes(self):
        """Cross-payer supersede on a lapsed quote (pre-existing behavior)."""
        action, code = purchase_intent_reuse_decision(
            WALLET_A, WALLET_B, LAPSED_QUOTE, now=NOW
        )
        self.assertEqual((action, code), ("supersede", None))

    def test_legacy_empty_binding_same_empty_reuses(self):
        """Legacy intent with no payer: identical empty binding is idempotent."""
        action, code = purchase_intent_reuse_decision("", "", LIVE_QUOTE, now=NOW)
        self.assertEqual((action, code), ("reuse", None))

    def test_legacy_empty_binding_named_wallet_supersedes(self):
        """Legacy intent with no payer: a named wallet supersedes it."""
        action, code = purchase_intent_reuse_decision("", WALLET_A, LIVE_QUOTE, now=NOW)
        self.assertEqual((action, code), ("supersede", None))

    def test_zero_address_binding_named_wallet_supersedes(self):
        """The ZERO_ADDRESS sentinel behaves like the empty legacy binding."""
        action, code = purchase_intent_reuse_decision(
            psemine_engine.ZERO_ADDRESS, WALLET_A, LIVE_QUOTE, now=NOW
        )
        self.assertEqual((action, code), ("supersede", None))

    def test_wallet_normalization_case_and_space(self):
        """Payer comparisons are case/whitespace-insensitive."""
        action, code = purchase_intent_reuse_decision(
            f" {WALLET_A.upper()} ", WALLET_A.lower(), LIVE_QUOTE, now=NOW
        )
        self.assertEqual((action, code), ("reuse", None))

    def test_wallet_normalization_lapsed_still_supersedes(self):
        """Normalization must not accidentally resurrect a lapsed intent."""
        action, _ = purchase_intent_reuse_decision(
            WALLET_A.upper(), WALLET_A, LAPSED_QUOTE, now=NOW
        )
        self.assertEqual(action, "supersede")

    # -- Quote coherence (2026-09-19, production QA finding) ----------------

    def test_same_wallet_same_quote_id_reuses(self):
        """Same payer + same quote + live window = idempotent reuse."""
        action, code = purchase_intent_reuse_decision(
            WALLET_A, WALLET_A, LIVE_QUOTE, now=NOW,
            stored_quote_id="quote_1", requested_quote_id="quote_1",
        )
        self.assertEqual((action, code), ("reuse", None))

    def test_same_wallet_different_quote_id_supersedes(self):
        """THE COHERENCE DEFECT: a re-quoted bind must never receive the old
        intent — the UI would pay the NEW wei while verification checks the
        OLD quote (guaranteed AMOUNT_MISMATCH after funds move)."""
        action, code = purchase_intent_reuse_decision(
            WALLET_A, WALLET_A, LIVE_QUOTE, now=NOW,
            stored_quote_id="quote_1", requested_quote_id="quote_2",
        )
        self.assertEqual((action, code), ("supersede", None))

    def test_different_wallet_different_quote_id_live_still_forbidden(self):
        """A re-quote must NOT open a rebind path while the intent is live."""
        action, code = purchase_intent_reuse_decision(
            WALLET_A, WALLET_B, LIVE_QUOTE, now=NOW,
            stored_quote_id="quote_1", requested_quote_id="quote_2",
        )
        self.assertEqual((action, code), ("rebind_forbidden", "WALLET_MISMATCH"))

    def test_legacy_binding_without_quote_ids_reuses_unchanged(self):
        """Callers not passing quote ids keep the pre-coherence semantics."""
        action, code = purchase_intent_reuse_decision(
            WALLET_A, WALLET_A, LIVE_QUOTE, now=NOW,
        )
        self.assertEqual((action, code), ("reuse", None))


# ---------------------------------------------------------------------------
# 2. register_referral — orphan-row guard
# ---------------------------------------------------------------------------

class RegisterReferralGuardTests(unittest.TestCase):
    """Unresolvable codes must fail closed: no referral row, no activity."""

    def setUp(self):
        """Fresh fake database; a real referrer seeded by referralCode."""
        self.db = FakeDB()
        self.referrer_uid = "referrer_uid_123"
        self.referee_uid = "referee_uid_456"
        self.db.collection("users").document(self.referrer_uid).set(
            {"referralCode": "ABCD1234"}
        )

    def test_unresolvable_code_is_rejected(self):
        """A typo'd code must be REFERRER_NOT_FOUND, not HTTP 200."""
        result = register_referral(self.db, self.referee_uid, "TYPO_CODE_XZ")
        self.assertFalse(result.get("ok"))
        self.assertEqual(result.get("error"), "REFERRER_NOT_FOUND")

    def test_unresolvable_code_creates_no_referral_row(self):
        """THE PRODUCTION DEFECT: no orphan psemine_referrals document."""
        register_referral(self.db, self.referee_uid, "TYPO_CODE_XZ")
        self.assertEqual(_referrals(self.db), {})

    def test_unresolvable_code_writes_no_activity(self):
        """No phantom 'New Miner Invited' activity to nobody."""
        register_referral(self.db, self.referee_uid, "TYPO_CODE_XZ")
        self.assertEqual(self.db.coll("psemine_activities"), {})

    def test_unresolvable_code_writes_no_notification(self):
        """No phantom invite notification."""
        register_referral(self.db, self.referee_uid, "TYPO_CODE_XZ")
        self.assertEqual(self.db.coll("psemine_notifications"), {})

    def test_empty_code_is_rejected(self):
        """Empty input fails closed."""
        result = register_referral(self.db, self.referee_uid, "")
        self.assertFalse(result.get("ok"))
        self.assertEqual(result.get("error"), "REFERRER_NOT_FOUND")

    def test_none_code_is_rejected(self):
        """None input fails closed."""
        result = register_referral(self.db, self.referee_uid, None)
        self.assertFalse(result.get("ok"))
        self.assertEqual(result.get("error"), "REFERRER_NOT_FOUND")

    def test_valid_referral_code_resolves_and_registers(self):
        """The happy path still works: code resolves, row created."""
        result = register_referral(self.db, self.referee_uid, "abcd1234")
        self.assertTrue(result.get("ok"))
        self.assertFalse(result.get("existing"))
        rows = _referrals(self.db)
        self.assertEqual(len(rows), 1)
        row = next(iter(rows.values()))
        self.assertEqual(row["referrerId"], self.referrer_uid)
        self.assertEqual(row["refereeId"], self.referee_uid)
        self.assertEqual(row["status"], "registered")

    def test_valid_registration_notifies_the_referrer(self):
        """A GENUINE registration still writes the referrer notification."""
        register_referral(self.db, self.referee_uid, "ABCD1234")
        notifs = self.db.coll("psemine_notifications")
        self.assertEqual(len(notifs), 1)
        notif = next(iter(notifs.values()))
        self.assertEqual(notif["userId"], self.referrer_uid)

    def test_reregistration_is_idempotent(self):
        """Re-registering the same pair returns the existing record."""
        first = register_referral(self.db, self.referee_uid, "ABCD1234")
        second = register_referral(self.db, self.referee_uid, "ABCD1234")
        self.assertTrue(first.get("ok"))
        self.assertTrue(second.get("ok"))
        self.assertTrue(second.get("existing"))
        self.assertEqual(len(_referrals(self.db)), 1)

    def test_unknown_ref_id_is_rejected(self):
        """Canonical ref_ ids must also resolve — no orphan from a stale id."""
        result = register_referral(self.db, self.referee_uid, "ref_ghost_000")
        self.assertFalse(result.get("ok"))
        self.assertEqual(result.get("error"), "REFERRER_NOT_FOUND")
        self.assertEqual(_referrals(self.db), {})

    def test_valid_ref_id_resolves_directly(self):
        """A ref_ id that EXISTS in users resolves without referralCode."""
        ghost = "ref_real_999"
        self.db.collection("users").document(ghost).set({"referralCode": "ZZZ9999"})
        result = register_referral(self.db, self.referee_uid, ghost)
        self.assertTrue(result.get("ok"))
        rows = _referrals(self.db)
        self.assertEqual(len(rows), 1)
        self.assertEqual(next(iter(rows.values()))["referrerId"], ghost)

    def test_self_code_is_rejected(self):
        """Registering with your own referral code is SELF_REFERRAL, no row."""
        result = register_referral(self.db, self.referrer_uid, "ABCD1234")
        self.assertFalse(result.get("ok"))
        self.assertEqual(result.get("error"), "SELF_REFERRAL")
        self.assertEqual(_referrals(self.db), {})

    def test_self_ref_id_is_rejected(self):
        """Your own ref_ id is SELF_REFERRAL, no row."""
        ghost = "ref_self_001"
        self.db.collection("users").document(ghost).set({"referralCode": "SELF0001"})
        result = register_referral(self.db, ghost, ghost)
        self.assertFalse(result.get("ok"))
        self.assertEqual(result.get("error"), "SELF_REFERRAL")
        self.assertEqual(_referrals(self.db), {})


if __name__ == "__main__":
    unittest.main()
