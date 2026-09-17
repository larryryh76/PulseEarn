"""
Final pre-merge gate tests: cron fail-closed, payer binding, public field names.

Three guarantees, each of which the previous revision left dependent on
something other than the code under test:

  1. CRON is fail-closed at EVERY layer. The request hook and the route handler
     must reach the same decision, and the handler must not be able to run the
     lifecycle sweep when no secret is configured. `if secret:` made the handler
     safe only because a middleware layer denied first.
  2. A payment is attributed to a purchase only when the payer matches the
     wallet bound to the intent. `sender_wallet or purchase['paymentWallet']`
     let the client's declaration win, so wallet B's payment could be recorded
     against wallet A's purchase with no review.
  3. The public campaign projection publishes the field names the campaign
     document actually carries. The chain id was listed as `paymentNetworkId`,
     a key no writer produces, so it was silently missing from the public
     payload for every pre-signin consumer.

api/index.py imports Flask at module scope and cannot be imported in this test
run, so the app's side is asserted against source structure while the decisions
themselves are tested directly on their pure functions.

Run: python3 -m unittest discover api/tests
"""
import os
import re
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import psemine_engine  # noqa: E402
import psemine_public  # noqa: E402

API_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ROOT_DIR = os.path.abspath(os.path.join(API_DIR, ".."))
INDEX_SRC = os.path.join(API_DIR, "index.py")
RULES_SRC = os.path.join(ROOT_DIR, "firestore.rules")

CRON_PATH = "/api/mine/cron/lifecycle"


def _read(path):
    with open(path, "r", encoding="utf-8") as fh:
        return fh.read()


def _handler_body(source, name):
    """Source of one route handler, from its `def` to the next decorator."""
    start = source.index(f"def {name}(")
    rest = source[start:]
    nxt = rest.find("\n@app.route")
    return rest if nxt == -1 else rest[:nxt]


class TestCronFailClosed(unittest.TestCase):
    """The lifecycle endpoint must refuse when it is not configured."""

    def setUp(self):
        self.source = _read(INDEX_SRC)
        self.handler = _handler_body(self.source, "mine_cron_lifecycle")
        self.hook = self.source[
            self.source.index("def _pse_before_request"):self.source.index("@app.after_request")
        ]

    def test_decision_table(self):
        cases = [
            # (provided, configured, allowed, code)
            ("", None, False, psemine_engine.CRON_NOT_CONFIGURED),
            ("anything", None, False, psemine_engine.CRON_NOT_CONFIGURED),
            (None, "", False, psemine_engine.CRON_NOT_CONFIGURED),
            (None, "s3cret", False, "FORBIDDEN"),
            ("", "s3cret", False, "FORBIDDEN"),
            ("s3crey", "s3cret", False, "FORBIDDEN"),
            ("s3cret ", "s3cret", False, "FORBIDDEN"),
            ("s3cret", "s3cret", True, "FORBIDDEN"),
        ]
        for provided, configured, allowed, code in cases:
            got_allowed, got_code = psemine_engine.cron_lifecycle_authorized(provided, configured)
            self.assertEqual(
                (allowed, code), (got_allowed, got_code),
                f"cron_lifecycle_authorized({provided!r}, {configured!r}) gave "
                f"{(got_allowed, got_code)!r}",
            )

    def test_unconfigured_secret_is_never_treated_as_authorized(self):
        for provided in (None, "", "guess", "CRON_SECRET"):
            allowed, _ = psemine_engine.cron_lifecycle_authorized(provided, None)
            self.assertFalse(allowed, f"{provided!r} was authorized with no secret configured")

    def test_handler_is_fail_closed_on_its_own(self):
        """No `if secret:` — an unset secret must deny, not skip the check."""
        self.assertNotRegex(
            self.handler,
            r"if secret:\s*\n\s*if not provided",
            "the route-level check is fail-open again: it is skipped when CRON_SECRET is unset",
        )
        self.assertIn("cron_lifecycle_authorized", self.handler)
        self.assertIn("CRON_NOT_CONFIGURED", self.handler)
        # 503 for unconfigured, 403 for a bad credential — both from the handler.
        self.assertRegex(self.handler, r"CRON_NOT_CONFIGURED[\s\S]{0,240}\}\), 503")
        self.assertRegex(self.handler, r"FORBIDDEN\"[\s\S]{0,80}\}\), 403")

    def test_hook_and_handler_share_one_decision_function(self):
        self.assertIn("cron_lifecycle_authorized", self.hook)
        self.assertIn("CRON_NOT_CONFIGURED", self.hook)
        self.assertGreaterEqual(
            self.source.count("cron_lifecycle_authorized"), 2,
            "the hook and the handler must not diverge into separate checks",
        )

    def test_handler_authorizes_before_it_mutates(self):
        """The auth decision must precede the lifecycle sweep, not follow it."""
        self.assertLess(
            self.handler.index("cron_lifecycle_authorized"),
            self.handler.index("campaign_lifecycle_state"),
        )


class TestPurchasePayerBinding(unittest.TestCase):
    """A payment may not be silently attributed to a different wallet."""

    ZERO = psemine_engine.ZERO_ADDRESS

    def setUp(self):
        self.handler = _handler_body(_read(INDEX_SRC), "verify_psemine_tool_purchase")

    def test_decision_table(self):
        cases = [
            # (declared, intent, ok, expected_sender)
            (None, None, True, ""),
            ("", "", True, ""),
            (self.ZERO, None, True, self.ZERO),
            # A zero-address intent stays bound to that placeholder rather than
            # becoming "unbound": the on-chain sender check then cannot pass, so
            # such a payment goes to manual review instead of being accepted
            # from any wallet. Fail-closed is the intended direction here.
            ("", self.ZERO, True, self.ZERO),
            ("0xAbC0000000000000000000000000000000000001", None, True,
             "0xabc0000000000000000000000000000000000001"),
            ("0xAbC0000000000000000000000000000000000001", "0xabc0000000000000000000000000000000000001",
             True, "0xabc0000000000000000000000000000000000001"),
            ("", "0xabc0000000000000000000000000000000000001", True,
             "0xabc0000000000000000000000000000000000001"),
            # the mismatch cases
            ("0xdef0000000000000000000000000000000000002", "0xabc0000000000000000000000000000000000001",
             False, "0xabc0000000000000000000000000000000000001"),
            (self.ZERO, "0xabc0000000000000000000000000000000000001", False,
             "0xabc0000000000000000000000000000000000001"),
        ]
        for declared, intent, ok, expected in cases:
            got_ok, code, got_sender = psemine_engine.purchase_sender_binding(declared, intent)
            self.assertEqual(ok, got_ok, f"declared={declared!r} intent={intent!r}")
            self.assertEqual(expected, got_sender, f"declared={declared!r} intent={intent!r}")
            self.assertEqual("WALLET_MISMATCH" if not ok else None, code)

    def test_client_declaration_cannot_override_a_bound_wallet(self):
        ok, code, _ = psemine_engine.purchase_sender_binding(
            "0xdef0000000000000000000000000000000000002",
            "0xabc0000000000000000000000000000000000001",
        )
        self.assertFalse(ok)
        self.assertEqual("WALLET_MISMATCH", code)

    def test_verification_path_uses_the_binding_helper(self):
        self.assertNotIn(
            "expected_sender = sender_wallet or purchase.get('paymentWallet')",
            self.handler,
            "verification still lets the client's declared wallet win",
        )
        self.assertIn("purchase_sender_binding", self.handler)
        self.assertIn("WALLET_MISMATCH", self.handler)
        self.assertRegex(self.handler, r"WALLET_MISMATCH\"[\s\S]{0,600}\}\), 409")

    def test_mismatch_is_recorded_for_manual_review_before_returning(self):
        """Never auto-assign: the evidence record is written first."""
        self.assertLess(
            self.handler.index("create_payment_recovery"),
            self.handler.index("WALLET_MISMATCH\""),
        )

    def test_binding_precedes_on_chain_verification(self):
        self.assertLess(
            self.handler.index("purchase_sender_binding"),
            self.handler.index("verify_bsc_transaction("),
        )

    def test_recovery_failure_cannot_abort_the_rejection(self):
        """A failed evidence write must not turn a rejection into a 500."""
        segment = self.handler[self.handler.index("purchase_sender_binding"):]
        segment = segment[: segment.index("WALLET_MISMATCH\"")]
        self.assertIn("except Exception", segment)


class TestPublicCampaignFieldNames(unittest.TestCase):
    """The allow-list must name fields the campaign document really carries."""

    def setUp(self):
        self.source = _read(INDEX_SRC)

    def test_chain_id_is_published_under_its_real_name(self):
        self.assertEqual("paymentChainId", psemine_public.CAMPAIGN_CHAIN_ID_FIELD)
        self.assertIn(psemine_public.CAMPAIGN_CHAIN_ID_FIELD, psemine_public.PUBLIC_CAMPAIGN_FIELDS)
        self.assertNotIn("paymentNetworkId", psemine_public.PUBLIC_CAMPAIGN_FIELDS)
        self.assertNotIn("paymentNetworkId", self.source)

    def test_the_writer_still_produces_that_name(self):
        """If the document writer is renamed, this allow-list must move with it."""
        self.assertRegex(
            self.source,
            r"['\"]paymentChainId['\"]\s*:\s*PSEMINE_BSC_CHAIN_ID",
            "the campaign document no longer writes paymentChainId",
        )

    def test_real_operational_fields_are_classified_private(self):
        for name in (
            "totalCapacitiesRegisteredGBPPerHour", "totalAccruedLiabilityGBP",
            "totalBNBCollected", "totalMinersCount", "walletChangeDeadline",
            "pauseWindows", "shutdownState",
        ):
            self.assertIn(name, psemine_public.PRIVATE_CAMPAIGN_FIELDS, f"{name} is unclassified")
            self.assertNotIn(name, psemine_public.PUBLIC_CAMPAIGN_FIELDS, f"{name} would be published")
            self.assertIn(name, self.source, f"{name} is no longer written; classification is stale")

    def test_a_realistic_document_projects_to_the_public_contract_only(self):
        camp = {
            "id": "active_campaign", "name": "PSEmine Genesis 90-Day Campaign",
            "type": "genesis", "status": "active",
            "startAt": "2026-01-01T00:00:00+00:00", "endAt": "2026-04-01T00:00:00+00:00",
            "durationDays": 90, "currencyDisplay": "GBP",
            "paymentNetwork": "BNB Smart Chain", "paymentChainId": 56,
            "paymentAsset": "BNB",
            "receiverWalletAddress": "0x8b32A461d3106B3356e9A389DfeB74aC084c8F33",
            "walletChangeDeadline": "2026-03-29T00:00:00+00:00",
            "purchaseEnabled": True, "miningEnabled": True, "referralEnabled": True,
            "totalCapacitiesRegisteredGBPPerHour": 42.5, "totalAccruedLiabilityGBP": 912.75,
            "totalBNBCollected": 3.14, "totalMinersCount": 128,
            "shutdownState": {"isArchived": False}, "pauseWindows": [],
            "description": "internal copy", "createdAt": "2026-01-01T00:00:00+00:00",
            "updatedAt": "2026-01-02T00:00:00+00:00",
        }
        view = psemine_public.public_campaign_view(camp)
        self.assertEqual(
            [f for f in psemine_public.PUBLIC_CAMPAIGN_FIELDS if f in camp], list(view)
        )
        for private in psemine_public.PRIVATE_CAMPAIGN_FIELDS:
            self.assertNotIn(private, view)
        # The chain id survives — the regression this replaced.
        self.assertEqual(56, view["paymentChainId"])


class TestCampaignReadIsScopedToTheProduct(unittest.TestCase):
    """Signing in is not the same as belonging to PSEmine."""

    def setUp(self):
        self.rules = _read(RULES_SRC)
        self.block = self.rules[self.rules.index("match /psemine_campaigns/"):]
        self.block = self.block[: self.block.index("match /psemine_tools/")]

    def test_helper_reads_backend_granted_entitlement(self):
        self.assertRegex(
            self.rules,
            r"function hasPSEMineAccess\(uid\)\s*\{[\s\S]*?productAccess\.psemine == true",
        )

    def test_campaign_read_requires_entitlement_not_just_a_session(self):
        self.assertIn("hasPSEMineAccess(request.auth.uid)", self.block)
        self.assertNotIn(
            "allow read, list: if isAuthenticated() || isModerator();",
            self.block,
            "any signed-in PulseEarn account could read the raw campaign document again",
        )

    def test_write_stays_admin_only(self):
        self.assertIn("allow write: if isAdmin();", self.block)

    def test_entitlement_cannot_be_self_granted(self):
        """The helper would be meaningless if a client could set the flag."""
        create_rule = self.rules[self.rules.index("allow create: if isOwner(userId)"):]
        create_rule = create_rule[: create_rule.index("// CRITICAL: Field-restricted updates")]
        self.assertRegex(create_rule, r"get\('psemine', false\) != true")


if __name__ == "__main__":
    unittest.main()
