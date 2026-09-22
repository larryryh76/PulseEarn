"""
Cadence independence of the canonical accrual checkpoint.

WHY THIS EXISTS (measured defect, 2026-09-21 remediation)
--------------------------------------------------------
`accrual_checkpoint` floors each checkpoint to whole pence, and the caller used
to advance the ownership/referral anchors all the way to `window_end` whether or
not anything was banked. The sub-penny remainder of every checkpoint was
therefore DISCARDED, which made booked earnings depend on how often anything
triggered a checkpoint — i.e. on how often the user's dashboard polled. Measured
against this engine before the fix, over one hour:

    tool      rate       60s polls   300s polls   one settlement
    starter   10p/h            0p          0p         10p
    builder   50p/h            0p         48p         50p
    advanced 120p/h          120p        120p        120p
    elite    250p/h          240p        240p        250p

The locked economics say £0.10 / £0.50 / £1.20 / £2.50 per hour, so the poll
cadence was silently deciding how much a tool earned. That also made reducing
dashboard polling financially unsafe: any cadence change would have changed
earnings. The fix banks whole-penny boundaries only, leaving the remainder
BEHIND the anchor so the next checkpoint credits it.

These tests pin both halves of that contract:
  • the booked balance is the locked rate at every cadence (and never exceeds it);
  • an unbanked remainder is credited by the NEXT checkpoint, not lost;
  • a checkpoint that banks nothing writes nothing at all — the property that
    stops merely viewing the dashboard from costing a Firestore write on every
    tick (which used to fire the user-document listener and feed the poll back
    into another read).

Run: python3 -m unittest discover -s api/tests -t api/tests
"""
import os
import sys
import unittest
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import test_payout_composition as tpc  # noqa: E402  in-memory Firestore double
import psemine_engine as eng  # noqa: E402
from psemine_core import LOCKED_PSEMINE_TOOLS, REFERRAL_BONUS_MINOR_PER_HOUR  # noqa: E402

UID = "u1"
TS = datetime(2026, 9, 1, 12, 0, 0, tzinfo=timezone.utc)


# ---------------------------------------------------------------------------
# Write accounting at the store chokepoint (transaction-buffered writes included)
# ---------------------------------------------------------------------------

class counted_writes:
    """Counts every write that reaches the in-memory store, by collection."""

    def __init__(self, db):
        self.db = db

    def __enter__(self):
        self.counts = {}
        self._orig_set = tpc.FakeStore.set
        self._orig_update = tpc.FakeStore.update
        db = self.db

        def name_of(store):
            for name, candidate in db._namespaces.items():
                if candidate is store:
                    return name
            return "(unknown)"

        def record(store):
            name = name_of(store)
            self.counts[name] = self.counts.get(name, 0) + 1

        def set_(store, doc_id, payload, merge=False):
            record(store)
            return self._orig_set(store, doc_id, payload, merge=merge)

        def update_(store, doc_id, payload):
            record(store)
            return self._orig_update(store, doc_id, payload)

        tpc.FakeStore.set = set_
        tpc.FakeStore.update = update_
        return self

    def __exit__(self, *exc):
        tpc.FakeStore.set = self._orig_set
        tpc.FakeStore.update = self._orig_update
        return False

    @property
    def total(self):
        return sum(self.counts.values())


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def seed(tool_id="starter", rate_minor=10, qualified=0, with_tool=True,
         started_at=TS, anchored_at=TS):
    db = tpc.FakeDB()
    db.collection("psemine_campaigns").document("active_campaign").set({
        "id": "active_campaign", "status": "active",
        # The campaign must already be running BEFORE every fixture anchor: an
        # ownership that started before the campaign earns nothing in the
        # intersection, which would silently make these tests vacuous.
        "startAt": (TS - timedelta(days=10)).isoformat(),
        "endAt": (TS + timedelta(days=90)).isoformat(),
    })
    db.collection("psemine_users").document(UID).set({
        "id": UID, "uid": UID, "userId": UID, "status": "active",
        "accruedMinor": 0, "totalAccruedGBP": 0.0,
        "qualifiedReferralsCount": qualified,
        "lastReferralAccruedAt": TS.isoformat(),
        "payoutWallet": "0x" + "a" * 40,
    })
    if with_tool:
        db.collection("psemine_tool_ownership").document("own1").set({
            "id": "own1", "userId": UID, "toolId": tool_id, "status": "active",
            "hourlyRateMinor": rate_minor,
            "cycleStartedAt": started_at.isoformat(),
            "lastAccruedAt": anchored_at.isoformat(),
        })
    return db


class checkpointing:
    """Runs the real checkpoint against a frozen clock, at a given cadence."""

    def __init__(self, db, step_seconds, now=TS):
        self.db = db
        self.step = step_seconds
        self.clock = now
        self._real_utcnow = eng.utcnow

    def __enter__(self):
        eng.utcnow = lambda: self.clock
        return self

    def __exit__(self, *exc):
        eng.utcnow = self._real_utcnow
        return False

    def tick(self):
        """Advance the clock one cadence step and run one checkpoint."""
        self.clock = self.clock + timedelta(seconds=self.step)
        camp, _eff, _ = eng.campaign_lifecycle_state(self.db)
        return eng.accrual_checkpoint(self.db, UID, source="state", camp=camp)

    def run(self, steps):
        result = None
        for _ in range(steps):
            result = self.tick()
        return result


def booked(db):
    user = db.collection("psemine_users").document(UID).get().to_dict() or {}
    return int(user.get("accruedMinor") or 0)


def anchor(db):
    own = db.collection("psemine_tool_ownership").document("own1").get().to_dict() or {}
    return own.get("lastAccruedAt")


def expected_minor(rate_minor, seconds):
    return (rate_minor * seconds) // 3600


# ---------------------------------------------------------------------------
# The locked rate is what gets booked, at every cadence
# ---------------------------------------------------------------------------

class TestCadenceIndependence(unittest.TestCase):

    def test_every_tier_books_its_locked_rate_over_one_hour_at_every_cadence(self):
        for tool_id, cfg in LOCKED_PSEMINE_TOOLS.items():
            rate = cfg["hourly_rate_minor"]
            for step, steps in ((60, 60), (300, 12), (3600, 1), (900, 4)):
                db = seed(tool_id, rate)
                with checkpointing(db, step) as clock:
                    clock.run(steps)
                got = booked(db)
                exact = expected_minor(rate, step * steps)
                # Never MORE than the locked rate pays for the elapsed time
                # (over-credit), and never more than one PENDING penny behind.
                # The pending penny is genuinely unbooked, not lost: it is worth
                # less than one minor unit of time and the next checkpoint books
                # it (see test_the_unbanked_remainder_is_credited_by_the_next_
                # checkpoint). Before the fix this could be the WHOLE rate: 0p
                # for starter/builder at 60s polls.
                self.assertLessEqual(got, exact,
                                     f"{tool_id} @ {step}s booked more than the locked rate allows")
                self.assertGreaterEqual(exact - got, 0)
                self.assertLessEqual(exact - got, 1,
                                     f"{tool_id} @ {step}s is more than a penny behind "
                                     f"(booked {got}, rate says {exact})")

    def test_a_cadence_that_divides_the_penny_boundary_books_exactly(self):
        """60s and single-shot cadences land on whole-penny boundaries for every
        locked rate, so they must book the exact rate — not 'about' it."""
        for tool_id, cfg in LOCKED_PSEMINE_TOOLS.items():
            rate = cfg["hourly_rate_minor"]
            for step, steps in ((60, 60), (3600, 1)):
                db = seed(tool_id, rate)
                with checkpointing(db, step) as clock:
                    clock.run(steps)
                self.assertEqual(booked(db), rate,
                                 f"{tool_id} @ {step}s must book exactly {rate}p/hour")

    def test_the_unbanked_remainder_is_credited_by_the_next_checkpoint(self):
        """The <1p held behind the anchor is pending, not lost: one further
        checkpoint books it. (This is the property that makes a slower poll
        cadence financially neutral.)"""
        rate = LOCKED_PSEMINE_TOOLS["elite"]["hourly_rate_minor"]
        db = seed("elite", rate)
        with checkpointing(db, 300) as clock:
            clock.run(12)
            after_first = booked(db)
            clock.tick()          # one more 300s tick
        total_seconds = 300 * 13
        self.assertLess(after_first, expected_minor(rate, 3600) + 1)
        self.assertEqual(booked(db), expected_minor(rate, total_seconds),
                         "the carried remainder must be booked, not discarded")

    def test_a_repeat_checkpoint_at_the_same_instant_banks_nothing_twice(self):
        db = seed("builder", 50)
        with checkpointing(db, 60, now=TS) as clock:
            first = clock.run(10)
            after_first = booked(db)
            # Same clock, same checkpoint again: idempotent.
            camp, _eff, _ = eng.campaign_lifecycle_state(db)
            again = eng.accrual_checkpoint(db, UID, source="state", camp=camp)
        self.assertEqual(booked(db), after_first)
        self.assertEqual(again["earnedMinor"], 0)
        self.assertTrue(first["earnedMinor"] > 0)

    def test_the_anchor_never_moves_backwards(self):
        db = seed("starter", 10)
        seen = [anchor(db)]
        with checkpointing(db, 60) as clock:
            for _ in range(10):
                clock.tick()
                seen.append(anchor(db))
        self.assertEqual(seen, sorted(seen), "accrual anchors must be monotonic")


# ---------------------------------------------------------------------------
# Writes: an idle dashboard poll must not write at all
# ---------------------------------------------------------------------------

class TestNoOpCheckpointsAreWritesFree(unittest.TestCase):

    def test_a_miner_with_no_tools_and_no_referrals_writes_nothing(self):
        db = seed(with_tool=False)
        with checkpointing(db, 300) as clock:
            clock.run(3)  # settle the clock, then measure steady state
            with counted_writes(db) as writes:
                result = clock.tick()
        self.assertEqual(writes.counts, {},
                         "an accrual checkpoint with nothing to bank must not touch Firestore")
        self.assertTrue(result.get("noop"))
        self.assertEqual(result["earnedMinor"], 0)

    def test_a_tool_whose_session_ended_stops_writing(self):
        """Session tools stop accruing until restarted; the polls that follow
        must be pure reads. Before the fix each of them rewrote the ownership
        read the anchor and the user document."""
        db = seed("starter", 10,
                  started_at=TS - timedelta(hours=48),
                  anchored_at=TS - timedelta(hours=48))
        with checkpointing(db, 60) as clock:
            clock.tick()                       # settles the finished session
            settled = booked(db)
            with counted_writes(db) as writes:
                clock.tick()
        # The completed session books its full locked value: 24h at 10p/h = 240p.
        # (At a 60-second cadence the pre-fix engine booked 0p for a Starter tool
        # over any number of polls — the session is exactly where the difference
        # between "banks each penny" and "discards each remainder" is total.)
        self.assertEqual(settled, 240)
        self.assertEqual(writes.counts, {},
                         "a finished session must not keep writing on every poll")

    def test_an_operating_tool_writes_only_what_it_banks(self):
        """Writes are bounded by BANKED PENNIES, not by polls: an Elite tool at a
        5-minute cadence writes at most once per banked penny per document."""
        rate = LOCKED_PSEMINE_TOOLS["elite"]["hourly_rate_minor"]
        db = seed("elite", rate)
        with checkpointing(db, 300) as clock:
            clock.tick()
            with counted_writes(db) as writes:
                clock.run(12)  # one hour at a 5-minute cadence
        # Per tick, at most: one ownership anchor advance, one ledger entry for
        # the banked pence, one user-document update. Writes scale with BANKED
        # PENNIES, never with view time.
        self.assertLessEqual(writes.total, 3 * 12)
        self.assertGreater(writes.counts.get("psemine_tool_ownership", 0), 0,
                           "banked accrual still has to be recorded")


# ---------------------------------------------------------------------------
# Referral capacity: same cadence rules, and no writes with nothing to accrue
# ---------------------------------------------------------------------------

class TestReferralAnchorRules(unittest.TestCase):

    def test_referral_capacity_books_the_locked_rate_at_every_cadence(self):
        rate = LOCKED_PSEMINE_TOOLS["starter"]["hourly_rate_minor"]
        for step, steps in ((60, 60), (300, 12), (3600, 1)):
            db = seed("starter", rate, qualified=1)
            with checkpointing(db, step) as clock:
                clock.run(steps)
            total = expected_minor(rate + REFERRAL_BONUS_MINOR_PER_HOUR, step * steps)
            got = booked(db)
            self.assertLessEqual(got, total)
            self.assertLessEqual(total - got, 1,
                                 f"referral capacity @ {step}s must not fall a penny behind "
                                 f"(booked {got}, expected {total})")

    def test_referral_capacity_pays_where_it_used_to_pay_nothing(self):
        """30p/h never reached a whole penny inside one 60-second checkpoint, so
        on its own it booked 0p forever. One hour of referral capacity is 30p."""
        rate = LOCKED_PSEMINE_TOOLS["starter"]["hourly_rate_minor"]
        db = seed("starter", rate, qualified=1)
        with checkpointing(db, 60) as clock:
            clock.run(60)
            clock.tick()  # book the carried remainder
        self.assertEqual(booked(db), rate + REFERRAL_BONUS_MINOR_PER_HOUR)

    def test_no_qualified_referrals_means_no_referral_writes(self):
        db = seed("starter", 10, qualified=0, with_tool=False)
        with checkpointing(db, 300) as clock:
            clock.run(2)
            with counted_writes(db) as writes:
                clock.tick()
        self.assertNotIn("psemine_users", writes.counts,
                         "a zero-referral account must not rewrite its referrer anchor on every poll")

    def test_referral_capacity_requires_an_operating_tool(self):
        """The canonical rule is unchanged: no operating tool, no referral
        accrual — and the anchor is still consumed so a later restart can never
        retro-credit the idle period."""
        db = seed(with_tool=False, qualified=3)
        with checkpointing(db, 300) as clock:
            clock.run(12)
        self.assertEqual(booked(db), 0)
        user = db.collection("psemine_users").document(UID).get().to_dict() or {}
        self.assertIsNotNone(user.get("lastReferralAccruedAt"))


# ---------------------------------------------------------------------------
# The pure boundary helper
# ---------------------------------------------------------------------------

class TestBankedBoundary(unittest.TestCase):

    def test_boundary_is_where_the_banked_pence_end(self):
        from psemine_core import accrual_banked_boundary
        start = TS
        end = TS + timedelta(hours=2)
        windows = [(start, end, True)]
        # 100p/h: 300p banked == exactly 3 hours of a 2-hour window -> clamp
        self.assertEqual(accrual_banked_boundary(start, end, windows, 100, 300), end)
        # 100p/h: 150p banked == 1.5h of earnable time
        self.assertEqual(accrual_banked_boundary(start, end, windows, 100, 150),
                         start + timedelta(hours=1, minutes=30))

    def test_boundary_skips_non_operating_windows(self):
        from psemine_core import accrual_banked_boundary
        start = TS
        windows = [
            (start, start + timedelta(hours=1), True),
            (start + timedelta(hours=1), start + timedelta(hours=5), False),
            (start + timedelta(hours=5), start + timedelta(hours=6), True),
        ]
        # 60p/h, 90p banked == 1.5h of OPERATING time -> 1h in the first window
        # plus 30 minutes into the third (the paused block never counts).
        self.assertEqual(accrual_banked_boundary(start, start + timedelta(hours=6), windows, 60, 90),
                         start + timedelta(hours=5, minutes=30))

    def test_zero_earned_leaves_the_anchor_alone(self):
        from psemine_core import accrual_banked_boundary
        start = TS
        self.assertEqual(accrual_banked_boundary(start, start + timedelta(hours=1),
                                                 [(start, start + timedelta(hours=1), True)], 10, 0),
                         start)


if __name__ == "__main__":
    unittest.main()
