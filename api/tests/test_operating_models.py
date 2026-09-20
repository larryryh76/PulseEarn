"""Unit tests for per-tool operating models (session vs continuous).

Economics are LOCKED — these tests pin the OPERATING MODEL without touching
rates: session tools (starter/builder/advanced) mine finite 24h sessions and
need a manual, backend-delayed restart; Elite runs continuously with no
restart cycle. No test below asserts any price or hourly rate.
"""
import os
import sys
import unittest
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from psemine_core import (  # noqa: E402
    TOOL_OPERATING_MODELS,
    accrue_ownership,
    derive_cycle,
    tool_operating_model,
    OPERATING_CYCLE_HOURS,
)


def iso(dt: datetime) -> str:
    return dt.isoformat()


NOW = datetime(2026, 9, 20, 12, 0, 0, tzinfo=timezone.utc)


def session_ownership(tool_id: str, started: datetime, **extra) -> dict:
    d = {
        "toolId": tool_id,
        "status": "active",
        "cycleIndex": 1,
        "cycleStartedAt": iso(started),
        "lastAccruedAt": iso(started),
        "hourlyRateMinor": 10,  # test-only rate; economics are not under test
    }
    d.update(extra)
    return d


class TestOperatingModelConfig(unittest.TestCase):
    def test_session_tools(self):
        for tier in ("starter", "builder", "advanced"):
            m = tool_operating_model(tier)
            self.assertEqual(m["operatingModel"], "session", tier)
            self.assertEqual(m["sessionDurationHours"], OPERATING_CYCLE_HOURS, tier)
            self.assertGreaterEqual(int(m["restartDelayMinutes"]), 10, tier)

    def test_elite_is_continuous(self):
        m = tool_operating_model("elite")
        self.assertEqual(m["operatingModel"], "continuous")
        self.assertNotIn("restartDelayMinutes", m)

    def test_legacy_ids_map_to_canonical_models(self):
        self.assertEqual(tool_operating_model("growth")["operatingModel"], "session")
        self.assertEqual(tool_operating_model("pro")["operatingModel"], "session")
        self.assertEqual(tool_operating_model("pro"), tool_operating_model("advanced"))

    def test_unknown_tool_defaults_to_session(self):
        self.assertEqual(tool_operating_model("mystery")["operatingModel"], "session")

    def test_config_covers_exactly_the_canonical_catalog(self):
        self.assertEqual(set(TOOL_OPERATING_MODELS), {"starter", "builder", "advanced", "elite"})


class TestDeriveCycleModels(unittest.TestCase):
    def test_session_active_mid_cycle(self):
        start = NOW - timedelta(hours=5)
        c = derive_cycle(session_ownership("starter", start), NOW)
        self.assertEqual(c.state, "active")
        self.assertFalse(c.maintenance_required)
        self.assertEqual(c.cycle_end_iso, iso(start + timedelta(hours=24)))

    def test_session_future_start_is_restarting(self):
        # Restart requested; the backend scheduled the next session in the future.
        start = NOW + timedelta(minutes=10)
        c = derive_cycle(session_ownership("starter", start), NOW)
        self.assertEqual(c.state, "restarting")
        self.assertFalse(c.maintenance_required)

    def test_session_complete_within_grace(self):
        start = NOW - timedelta(hours=25)
        c = derive_cycle(session_ownership("builder", start), NOW)
        self.assertEqual(c.state, "cycle_complete")
        self.assertTrue(c.maintenance_required)

    def test_session_complete_after_grace(self):
        start = NOW - timedelta(hours=31)
        c = derive_cycle(session_ownership("advanced", start), NOW)
        self.assertEqual(c.state, "maintenance_required")
        self.assertTrue(c.maintenance_required)

    def test_continuous_never_completes(self):
        for hours in (5, 24, 25, 48, 24 * 90):
            start = NOW - timedelta(hours=hours)
            c = derive_cycle(session_ownership("elite", start), NOW)
            self.assertEqual(c.state, "active", f"elite must stay active at +{hours}h")
            self.assertFalse(c.maintenance_required)
            self.assertIsNone(c.cycle_end_iso, "continuous tools expose no session end")

    def test_non_active_status_passthrough(self):
        d = session_ownership("starter", NOW - timedelta(hours=1), status="settling")
        self.assertEqual(derive_cycle(d, NOW).state, "settling")


class TestAccrualGating(unittest.TestCase):
    WINDOWS_ALL = [(NOW - timedelta(hours=100), NOW + timedelta(hours=100), True)]

    def test_continuous_accrues_across_many_sessions(self):
        start = NOW - timedelta(hours=48)
        own = session_ownership("elite", start)
        earned, eff_end = accrue_ownership(own, start, NOW, self.WINDOWS_ALL)
        self.assertEqual(eff_end, NOW)
        self.assertEqual(earned, 10 * 48)  # 10 minor/h * 48h, no cycle clipping

    def test_session_clips_at_session_end(self):
        start = NOW - timedelta(hours=48)
        own = session_ownership("starter", start)
        earned, eff_end = accrue_ownership(own, start, NOW, self.WINDOWS_ALL)
        # Only the FIRST 24h session accrues; the window since session end earns 0.
        self.assertEqual(earned, 10 * 24)
        self.assertEqual(eff_end, iso_to_dt(start + timedelta(hours=24)))

    def test_future_session_start_earns_nothing(self):
        start = NOW + timedelta(minutes=10)  # restart pending
        own = session_ownership("starter", start)
        earned, _ = accrue_ownership(own, NOW - timedelta(hours=1), NOW, self.WINDOWS_ALL)
        self.assertEqual(earned, 0)

    def test_continuous_respects_pause_windows(self):
        start = NOW - timedelta(hours=48)
        own = session_ownership("elite", start)
        windows = [
            (start, start + timedelta(hours=24), True),
            (start + timedelta(hours=24), NOW, False),  # paused tail
        ]
        earned, eff_end = accrue_ownership(own, start, NOW, windows)
        self.assertEqual(earned, 10 * 24)
        self.assertEqual(eff_end, NOW)  # anchor advances; paused time never retro-credits

    def test_session_zero_when_anchor_past_session_end(self):
        start = NOW - timedelta(hours=48)
        own = session_ownership("starter", start, lastAccruedAt=iso(start + timedelta(hours=24)))
        earned, eff_end = accrue_ownership(own, start + timedelta(hours=24), NOW, self.WINDOWS_ALL)
        self.assertEqual(earned, 0)
        self.assertEqual(eff_end, iso_to_dt(start + timedelta(hours=24)))


def iso_to_dt(v):
    return datetime.fromisoformat(str(v).replace("Z", "+00:00"))


if __name__ == "__main__":
    unittest.main()
