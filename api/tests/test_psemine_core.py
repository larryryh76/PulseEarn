"""Unit tests for the canonical PSEmine core module (stdlib only, no external deps)."""
import os
import sys
import unittest
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from psemine_core import (  # noqa: E402
    LOCKED_PSEMINE_TOOLS,
    accrue_ownership,
    accrue_referral_capacity,
    bnb_to_wei_exact,
    campaign_operating_windows,
    compute_referral_capacity_minor,
    compute_tool_capacity_minor,
    compute_total_capacity_minor,
    derive_cycle,
    gbp_major_to_minor,
    is_anchorless_legacy_ownership,
    is_legal_ownership_transition,
    is_valid_referral_progression,
    legacy_balance_minor,
    normalize_tx_hash,
    referral_doc_id,
    OPERATING_CYCLE_HOURS,
    MAINTENANCE_GRACE_HOURS,
)


def iso(dt: datetime) -> str:
    """Serialize a test timestamp to ISO format."""
    return dt.isoformat()


class TestEconomy(unittest.TestCase):
    def test_locked_config_economics(self):
        """Verify locked config economics."""
        self.assertEqual(LOCKED_PSEMINE_TOOLS["starter"]["price_minor_units"], 300)
        self.assertEqual(LOCKED_PSEMINE_TOOLS["starter"]["hourly_rate_minor"], 10)
        self.assertEqual(LOCKED_PSEMINE_TOOLS["starter"]["max_per_user"], 5)
        self.assertEqual(LOCKED_PSEMINE_TOOLS["builder"]["price_minor_units"], 1000)
        self.assertEqual(LOCKED_PSEMINE_TOOLS["builder"]["hourly_rate_minor"], 50)
        self.assertEqual(LOCKED_PSEMINE_TOOLS["builder"]["max_per_user"], 3)
        self.assertEqual(LOCKED_PSEMINE_TOOLS["advanced"]["hourly_rate_minor"], 120)
        self.assertEqual(LOCKED_PSEMINE_TOOLS["advanced"]["max_per_user"], 3)
        self.assertEqual(LOCKED_PSEMINE_TOOLS["elite"]["hourly_rate_minor"], 250)
        self.assertEqual(LOCKED_PSEMINE_TOOLS["elite"]["max_per_user"], 2)

    def test_tool_capacity_additive(self):
        """Verify tool capacity additive."""
        self.assertEqual(compute_tool_capacity_minor({"starter": 5, "builder": 3, "advanced": 3, "elite": 2}), 1060)
        self.assertEqual(compute_tool_capacity_minor({"starter": 5}), 50)
        self.assertEqual(compute_tool_capacity_minor({"growth": 3}), 150)  # legacy alias -> builder
        self.assertEqual(compute_tool_capacity_minor({"bogus": 9}), 0)     # unknown ids never priced

    def test_referral_capacity(self):
        """Verify referral capacity."""
        self.assertEqual(compute_referral_capacity_minor(0), 0)
        self.assertEqual(compute_referral_capacity_minor(3), 90)
        self.assertEqual(compute_referral_capacity_minor(7), 150)  # capped at 5

    def test_total_capacity_additive_not_subtractive(self):
        # 10.60 tool + 1.50 referral = 12.10 (ADDITIVE rule)
        """Verify total capacity additive not subtractive."""
        self.assertEqual(compute_total_capacity_minor({"starter": 5, "builder": 3, "advanced": 3, "elite": 2}, 5), 1210)

    def test_money_conversions(self):
        """Verify money conversions."""
        self.assertEqual(gbp_major_to_minor("3.00"), 300)
        self.assertEqual(gbp_major_to_minor(0.10), 10)
        self.assertEqual(bnb_to_wei_exact("0.0042"), 4200000000000000)
        self.assertEqual(bnb_to_wei_exact("1.234567"), 1234567000000000000)


class TestStateMachines(unittest.TestCase):
    def test_legal_transitions(self):
        """Verify legal transitions."""
        self.assertTrue(is_legal_ownership_transition(None, "active"))
        self.assertTrue(is_legal_ownership_transition("active", "cycle_complete"))
        self.assertTrue(is_legal_ownership_transition("cycle_complete", "maintenance_required"))
        self.assertTrue(is_legal_ownership_transition("maintenance_required", "active"))
        self.assertTrue(is_legal_ownership_transition("active", "paused"))
        self.assertTrue(is_legal_ownership_transition("paused", "active"))
        self.assertTrue(is_legal_ownership_transition("active", "settling"))
        self.assertTrue(is_legal_ownership_transition("settling", "ended"))
        self.assertTrue(is_legal_ownership_transition("ended", "archived"))

    def test_illegal_transitions(self):
        """Verify illegal transitions."""
        self.assertFalse(is_legal_ownership_transition("archived", "active"))
        self.assertFalse(is_legal_ownership_transition("settling", "active"))
        self.assertTrue(is_legal_ownership_transition("inactive", "active"))  # legal via verified-purchase activation
        self.assertFalse(is_legal_ownership_transition("ended", "active"))

    def test_referral_progression(self):
        """Verify referral progression."""
        self.assertTrue(is_valid_referral_progression("registered", "wallet_connected"))
        self.assertTrue(is_valid_referral_progression("pending", "qualified"))  # legacy vocabulary upgrades
        self.assertTrue(is_valid_referral_progression("registered", "qualified"))
        self.assertFalse(is_valid_referral_progression("qualified", "registered"))
        self.assertFalse(is_valid_referral_progression("nope", "qualified"))
        self.assertEqual(referral_doc_id("abc", "xyz"), "ref_abc_xyz")


class TestCycles(unittest.TestCase):
    def setUp(self):
        """Create shared test fixtures and deterministic dependencies."""
        self.t0 = datetime(2026, 9, 1, 12, 0, tzinfo=timezone.utc)

    def test_active_within_cycle(self):
        """Verify active within cycle."""
        own = {"status": "active", "cycleStartedAt": iso(self.t0), "hourlyRateMinor": 10}
        c = derive_cycle(own, self.t0 + timedelta(hours=10))
        self.assertEqual(c.state, "active")
        self.assertFalse(c.maintenance_required)

    def test_cycle_complete_grace(self):
        """Verify cycle complete grace."""
        own = {"status": "active", "cycleStartedAt": iso(self.t0), "hourlyRateMinor": 10}
        c = derive_cycle(own, self.t0 + timedelta(hours=OPERATING_CYCLE_HOURS + 1))
        self.assertEqual(c.state, "cycle_complete")
        self.assertTrue(c.maintenance_required)

    def test_maintenance_required_after_grace(self):
        """Verify maintenance required after grace."""
        own = {"status": "active", "cycleStartedAt": iso(self.t0), "hourlyRateMinor": 10}
        c = derive_cycle(own, self.t0 + timedelta(hours=OPERATING_CYCLE_HOURS + MAINTENANCE_GRACE_HOURS + 1))
        self.assertEqual(c.state, "maintenance_required")

    def test_accrual_stops_at_cycle_end(self):
        """Verify accrual stops at cycle end."""
        t0 = self.t0
        own = {"status": "active", "cycleStartedAt": iso(t0), "hourlyRateMinor": 100}  # £1.00/hr
        windows = [(t0, t0 + timedelta(days=10), True)]
        got, anchor = accrue_ownership(own, t0, t0 + timedelta(hours=30), windows)
        self.assertEqual(got, 2400)  # 24h eligible only -> £24.00
        self.assertEqual(anchor, t0 + timedelta(hours=OPERATING_CYCLE_HOURS))

    def test_accrual_idempotent_on_repeat(self):
        """Verify accrual idempotent on repeat."""
        t0 = self.t0
        own = {"status": "active", "cycleStartedAt": iso(t0), "hourlyRateMinor": 100}
        windows = [(t0, t0 + timedelta(days=10), True)]
        # first checkpoint at +5h, then repeat with window starting at the anchor
        got1, anchor1 = accrue_ownership(own, t0, t0 + timedelta(hours=5), windows)
        got2, anchor2 = accrue_ownership(own, anchor1, t0 + timedelta(hours=5), windows)
        self.assertEqual(got1, 500)
        self.assertEqual(got2, 0)

    def test_accrual_multi_cycle_after_maintenance(self):
        # maintenance advanced cycleStartedAt forward by 30h -> a NEW single cycle runs +30h..+54h.
        # Accrual covers only the current operating cycle; the next cycle needs another maintenance.
        """Verify accrual multi cycle after maintenance."""
        t0 = self.t0
        own = {"status": "active", "cycleStartedAt": iso(t0 + timedelta(hours=30)), "hourlyRateMinor": 100}
        windows = [(t0, t0 + timedelta(days=3), True)]
        got, anchor = accrue_ownership(own, t0, t0 + timedelta(days=3), windows)
        self.assertEqual(got, 2400)  # 24h of the new cycle
        self.assertEqual(anchor, t0 + timedelta(hours=54))  # cycle end, not window end

    def test_accrual_excludes_pause(self):
        """Verify accrual excludes pause."""
        own = {"status": "active", "cycleStartedAt": iso(self.t0), "hourlyRateMinor": 100}
        windows = [
            (self.t0, self.t0 + timedelta(hours=10), True),
            (self.t0 + timedelta(hours=10), self.t0 + timedelta(hours=20), False),
        ]
        got, anchor = accrue_ownership(own, self.t0, self.t0 + timedelta(hours=20), windows)
        self.assertEqual(got, 1000)
        # The anchor is banked exactly where the LAST whole penny was earned, not
        # at window_end. Before the 2026-09-21 remediation the anchor jumped to
        # the end of the window unconditionally, which discarded the sub-penny
        # remainder of every checkpoint; where a window ends in non-operating
        # time the anchor now parks at the operating boundary and the dead tail
        # simply re-evaluates to zero on the next checkpoint.
        self.assertEqual(anchor, self.t0 + timedelta(hours=10))

    def test_campaign_windows_active(self):
        """Verify campaign windows active."""
        w = campaign_operating_windows("active", self.t0, self.t0 + timedelta(days=90), [], self.t0 + timedelta(days=10))
        self.assertEqual(w[0][2], True)

    def test_campaign_windows_paused_tail(self):
        # status 'paused' => open pause extends to now: prefix before pause operates, tail does not
        """Verify campaign windows paused tail."""
        w = campaign_operating_windows(
            "paused",
            self.t0,
            self.t0 + timedelta(days=90),
            [(self.t0 + timedelta(hours=2), self.t0 + timedelta(hours=5), None)],
            self.t0 + timedelta(days=10),
        )
        self.assertEqual(len(w), 2)
        self.assertEqual(w[0], (self.t0, self.t0 + timedelta(hours=2), True))
        self.assertEqual(w[1][2], False)
        self.assertEqual(w[1][0], self.t0 + timedelta(hours=5))

    def test_campaign_windows_ended(self):
        # an ended campaign retains its historical operating window [startAt, endAt)
        """Verify campaign windows ended."""
        w = campaign_operating_windows("ended", self.t0, self.t0 + timedelta(days=90), [], self.t0 + timedelta(days=95))
        self.assertEqual(w, [(self.t0, self.t0 + timedelta(days=90), True)])


class TestReferralAccrual(unittest.TestCase):
    def test_referral_capacity_requires_operating_tool(self):
        """Verify referral capacity requires operating tool."""
        t0 = datetime(2026, 9, 1, tzinfo=timezone.utc)
        got = accrue_referral_capacity(
            3, t0, t0 + timedelta(hours=10), [(t0, t0 + timedelta(hours=10), True)], has_operating_tool=False
        )
        self.assertEqual(got, 0)
        got = accrue_referral_capacity(
            3, t0, t0 + timedelta(hours=10), [(t0, t0 + timedelta(hours=10), True)], has_operating_tool=True
        )
        self.assertEqual(got, 900)  # 3 * 30 minor/h * 10h


class TestLegacyReconciliation(unittest.TestCase):
    """B1/B2/B6 remediation regressions."""

    def test_b1_legacy_balance_counted_once_after_absorption(self):
        # Legacy balance £5.00 pre-absorption: readable.
        """Verify b1 legacy balance counted once after absorption."""
        pre = {"totalAccruedGBP": 5.0}
        self.assertEqual(legacy_balance_minor(pre), 500)
        # After absorption the SAME £5.00 lives inside accruedMinor (750 now):
        # the legacy contribution must drop to 0 so it is counted EXACTLY ONCE.
        post = {"totalAccruedGBP": 7.50, "legacyBalanceAbsorbedMinor": 500}
        self.assertEqual(legacy_balance_minor(post), 0)
        # available = accruedMinor (750, includes the 500) + legacy (0) = £7.50

    def test_b1_absorbed_flag_with_zero_is_still_absorbed(self):
        """Verify b1 absorbed flag with zero is still absorbed."""
        post = {"totalAccruedGBP": 9.99, "legacyBalanceAbsorbedMinor": 0}
        self.assertEqual(legacy_balance_minor(post), 0)

    def test_b1_repeated_absorption_does_not_double_count(self):
        """Verify b1 repeated absorption does not double count."""
        user = {"totalAccruedGBP": 5.0}
        first = legacy_balance_minor(user)
        # simulate absorption event + canonical accrual
        user["accruedMinor"] = first + 250
        user["legacyBalanceAbsorbedMinor"] = first
        second = legacy_balance_minor(user)
        self.assertEqual(second, 0)
        # available after repeated absorption attempts stays 750, never 1250
        self.assertEqual(user["accruedMinor"] + second, 750)

    def test_b2_anchorless_legacy_ownership_accrues_nothing(self):
        """Verify b2 anchorless legacy ownership accrues nothing."""
        t0 = datetime(2026, 9, 1, tzinfo=timezone.utc)
        legacy_own = {
            "status": "active",
            "activatedAt": (t0 - timedelta(days=30)).isoformat(),  # 30 days old
            "hourlyRateMinor": 10,
        }
        self.assertTrue(is_anchorless_legacy_ownership(legacy_own))
        earned, _eff = accrue_ownership(
            legacy_own, t0 - timedelta(days=30), t0, [(t0 - timedelta(days=30), t0, True)]
        )
        self.assertEqual(earned, 0)  # NO historical accrual for pre-ledger time
        # ownership stays valid (status untouched by accrual math)
        self.assertEqual(legacy_own["status"], "active")

    def test_b2_canonical_ownership_with_cycle_still_accrues(self):
        """Verify b2 canonical ownership with cycle still accrues."""
        t0 = datetime(2026, 9, 1, tzinfo=timezone.utc)
        canonical = {
            "status": "active",
            "activatedAt": t0.isoformat(),
            "cycleStartedAt": t0.isoformat(),
            "lastAccruedAt": t0.isoformat(),
            "hourlyRateMinor": 10,
        }
        self.assertFalse(is_anchorless_legacy_ownership(canonical))
        earned, _eff = accrue_ownership(canonical, t0, t0 + timedelta(hours=2), [(t0, t0 + timedelta(hours=2), True)])
        self.assertEqual(earned, 20)

    def test_b6_tx_hash_normalization(self):
        """Verify b6 tx hash normalization."""
        self.assertEqual(normalize_tx_hash("  0xABCDEF1234 "), "0xabcdef1234")
        self.assertEqual(normalize_tx_hash(None), "")
        self.assertEqual(normalize_tx_hash(""), "")


if __name__ == "__main__":
    unittest.main()
