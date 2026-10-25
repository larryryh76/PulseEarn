"""Regression tests for the scheduled PSEmine campaign lifecycle."""
import os
import sys
import unittest
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import psemine_engine  # noqa: E402
import test_payout_composition as tpc  # noqa: E402


class TestScheduledCampaignLifecycle(unittest.TestCase):
    def setUp(self):
        self.db = tpc.FakeDB()
        self.ref = self.db.collection("psemine_campaigns").document("active_campaign")
        self.now = datetime.now(timezone.utc)

    def seed(self, **overrides):
        data = {
            "id": "active_campaign",
            "name": "PSEmine 90-day campaign",
            "status": "scheduled",
            "startAt": (self.now + timedelta(days=3)).isoformat(),
            "endAt": (self.now + timedelta(days=93)).isoformat(),
            "durationDays": 90,
            "miningEnabled": False,
            "purchaseEnabled": False,
            "referralEnabled": False,
        }
        data.update(overrides)
        self.ref.set(data)

    def test_scheduled_campaign_has_no_operating_window_before_start(self):
        self.seed()
        campaign, effective, ended = psemine_engine.campaign_lifecycle_state(self.db)
        self.assertEqual(effective, "scheduled")
        self.assertFalse(ended)
        self.assertEqual(campaign["status"], "scheduled")
        self.assertEqual(
            psemine_engine.campaign_operating_windows_for(self.db, campaign, now=self.now),
            [],
        )

    def test_missing_start_date_fails_closed(self):
        self.seed(startAt=None)
        campaign, effective, _ = psemine_engine.campaign_lifecycle_state(self.db)
        self.assertEqual(effective, "scheduled")
        self.assertEqual(
            psemine_engine.campaign_operating_windows_for(self.db, campaign, now=self.now),
            [],
        )

    def test_scheduled_campaign_activates_after_start_time(self):
        self.seed(startAt=(self.now - timedelta(minutes=1)).isoformat())
        campaign, effective, ended = psemine_engine.campaign_lifecycle_state(self.db)
        self.assertEqual(effective, "active")
        self.assertFalse(ended)
        saved = self.ref.get().to_dict()
        self.assertEqual(saved["status"], "active")
        self.assertTrue(saved["miningEnabled"])
        self.assertTrue(saved["purchaseEnabled"])
        self.assertTrue(saved["referralEnabled"])
        windows = psemine_engine.campaign_operating_windows_for(self.db, campaign, now=self.now)
        self.assertEqual(len(windows), 1)
        self.assertEqual(windows[0][0], datetime.fromisoformat(saved["startAt"]))


if __name__ == "__main__":
    unittest.main()
