"""
Canonical PSEmine backend core (Phase 1 consolidation).

Single source of truth for:
- Locked tool economics (integer minor units)
- Operating-cycle math (24h cycle, 6h grace)
- Ownership state machine + legal transitions
- Accrual window math (cycle/pause/maintenance aware)
- Referral identity + qualification ordering

PURE LOGIC ONLY: no Firestore, no Flask, no network. All monetary values are
integer minor units (pence) or integer wei. Floating point is never used for
authoritative money.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_DOWN, ROUND_HALF_UP
from typing import Dict, List, Optional, Tuple

# ----------------------------------------------------------------------------
# Canonical constants
# ----------------------------------------------------------------------------

PSEMINE_CAMPAIGN_DOC_ID = "active_campaign"

# --- Locked tool economics (DO NOT CHANGE) -----------------------------------
# price_minor_units  : GBP pence (purchase price)
# hourly_rate_minor  : GBP pence per hour of operating capacity
# max_per_user       : hard ownership cap
# version            : economics version stamp
LOCKED_PSEMINE_TOOLS: Dict[str, dict] = {
    "starter":  {"name": "Starter Miner",  "price_minor_units": 300,   "hourly_rate_minor": 10,  "max_per_user": 5, "version": 1},
    "builder":  {"name": "Builder Miner",  "price_minor_units": 1000,  "hourly_rate_minor": 50,  "max_per_user": 3, "version": 1},
    "advanced": {"name": "Advanced Miner", "price_minor_units": 5000,  "hourly_rate_minor": 120, "max_per_user": 3, "version": 1},
    "elite":    {"name": "Elite Miner",    "price_minor_units": 20000, "hourly_rate_minor": 250, "max_per_user": 2, "version": 1},
}

LEGACY_TOOL_ID_ALIASES: Dict[str, str] = {
    # legacy seeded Firestore IDs -> canonical IDs (economics equivalent)
    "growth": "builder",
    "pro": "advanced",
}

# --- Operating models (per tool; ECONOMICS UNTOUCHED) ------------------------
# The operating model decides HOW a tool runs, never how much it earns per
# hour. Hourly rates live exclusively in LOCKED_PSEMINE_TOOLS above.
#
#   session    : the tool mines for a finite operating session of
#                session_duration_hours, then stops. A manual restart is
#                required; after the restart is requested the backend keeps the
#                tool idle for restart_delay_minutes before the next session
#                begins (accrual is impossible in that window — the anchor sits
#                in the future until the session actually starts).
#   continuous : the tool runs for the active campaign with NO manual restart
#                cycle (Elite). Campaign pause/end/settlement still govern it.
#
# session_duration_hours reuses the canonical OPERATING_CYCLE_HOURS value below
# (24h) — the duration that has always governed operating cycles; it is not a
# new invented number. restart_delay_minutes is the backend-owned restart
# latency ("10 minutes or longer").
TOOL_OPERATING_MODELS: Dict[str, dict] = {
    "starter":  {"operatingModel": "session",    "sessionDurationHours": 24, "restartDelayMinutes": 10},
    "builder":  {"operatingModel": "session",    "sessionDurationHours": 24, "restartDelayMinutes": 10},
    "advanced": {"operatingModel": "session",    "sessionDurationHours": 24, "restartDelayMinutes": 10},
    "elite":    {"operatingModel": "continuous"},
}

# Unknown/legacy tools default to the session model — the behavior every
# ownership had before per-tool models existed (safe default, never a rate
# change).
def tool_operating_model(tool_id) -> dict:
    """Resolve the operating model for a tool id (legacy ids map first)."""
    raw = str(tool_id or "").strip()
    canonical = raw if raw in TOOL_OPERATING_MODELS else LEGACY_TOOL_ID_ALIASES.get(raw, raw)
    return TOOL_OPERATING_MODELS.get(canonical) or TOOL_OPERATING_MODELS["starter"]

# Maximum capacities (minor units / hour)
MAX_TOOL_CAPACITY_MINOR_PER_HOUR = 1060          # £10.60
MAX_QUALIFIED_REFERRALS = 5
REFERRAL_BONUS_MINOR_PER_HOUR = 30               # £0.30
MAX_REFERRAL_CAPACITY_MINOR_PER_HOUR = 150       # £1.50
MAX_THEORETICAL_CAPACITY_MINOR_PER_HOUR = 1210   # £12.10

# Legacy free-float rates for dual-reading (verified arithmetic only)
LEGACY_HOURLY_RATES = {"starter": 0.10, "builder": 0.50, "advanced": 1.20, "elite": 2.50}

# --- Operating cycle defaults ------------------------------------------------
OPERATING_CYCLE_HOURS = 24
MAINTENANCE_GRACE_HOURS = 6

# --- Quote / payment ----------------------------------------------------------
QUOTE_TTL_MINUTES = 15
MIN_BNB_CONFIRMATIONS = 3

# --- Payout --------------------------------------------------------------------
PAYOUT_MIN_GBP_MINOR = 1000  # £10.00

# --- Ownership state machine ----------------------------------------------------
OWNERSHIP_STATUSES = (
    "inactive", "active", "cycle_complete", "maintenance_required",
    "paused", "settling", "ended", "archived",
)

_OWNERSHIP_TRANSITIONS: Dict[str, set] = {
    "inactive":             {"active"},  # only via verified purchase activation
    "active":               {"cycle_complete", "paused", "settling"},
    "cycle_complete":       {"maintenance_required", "settling"},
    "maintenance_required": {"active", "settling"},
    "paused":               {"active", "settling"},
    "settling":             {"ended"},
    "ended":                {"archived"},
    "archived":             set(),
}


def is_legal_ownership_transition(old: Optional[str], new: str) -> bool:
    """Server-side state machine guard. `None` -> any initial (used at activation)."""
    if new not in OWNERSHIP_STATUSES:
        return False
    if old is None:
        return True  # initial creation at activation (must be 'active' by callers)
    return new in _OWNERSHIP_TRANSITIONS.get(old, set())


def illegal_transition_error(old: Optional[str], new: str) -> str:
    """Build the canonical error code for an illegal ownership transition."""
    return f"ILLEGAL_OWNERSHIP_TRANSITION:{old or 'NONE'}->{new}"


# ----------------------------------------------------------------------------
# Money helpers (integer minor units)
# ----------------------------------------------------------------------------

def gbp_minor_to_major(minor: int) -> float:
    """Convert integer pence to a GBP major-unit float."""
    return float(Decimal(minor) / Decimal(100))


def gbp_major_to_minor(major) -> int:
    """Convert a GBP major-unit value to integer pence with half-up rounding."""
    return int((Decimal(str(major)) * 100).to_integral_value(rounding=ROUND_HALF_UP))


def wei_to_bnb_float(wei: int) -> float:
    """Convert integer wei to a BNB float for display."""
    return float(Decimal(wei) / Decimal(10) ** 18)


def bnb_to_wei_exact(bnb_str: str) -> int:
    """Exact BNB string -> integer wei using Decimal (no binary float)."""
    d = Decimal(str(bnb_str).strip())
    if d <= 0:
        raise ValueError("BNB amount must be positive")
    return int((d * (Decimal(10) ** 18)).to_integral_value(rounding=ROUND_DOWN))


def compute_tool_capacity_minor(tool_counts: Dict[str, int]) -> int:
    """ADDITIVE tool capacity in minor units/hour. Legacy IDs are mapped, never priced."""
    total = 0
    for tool_id, count in (tool_counts or {}).items():
        canonical = tool_id if tool_id in LOCKED_PSEMINE_TOOLS else LEGACY_TOOL_ID_ALIASES.get(tool_id)
        if not canonical or count <= 0:
            continue
        total += LOCKED_PSEMINE_TOOLS[canonical]["hourly_rate_minor"] * int(count)
    return total  # tool capacity is additive; cap applied at total level


def compute_referral_capacity_minor(qualified_count: int) -> int:
    """Calculate capped referral capacity in minor units per hour."""
    n = max(0, min(int(qualified_count or 0), MAX_QUALIFIED_REFERRALS))
    return n * REFERRAL_BONUS_MINOR_PER_HOUR


def compute_total_capacity_minor(tool_counts: Dict[str, int], qualified_count: int) -> int:
    """Calculate capped combined tool and referral capacity."""
    tool_cap = compute_tool_capacity_minor(tool_counts)
    ref_cap = compute_referral_capacity_minor(qualified_count)
    total = tool_cap + ref_cap  # ADDITIVE: tool + referral
    return min(total, MAX_THEORETICAL_CAPACITY_MINOR_PER_HOUR)


# ----------------------------------------------------------------------------
# Operating cycles
# ----------------------------------------------------------------------------

@dataclass
class OwnershipCycle:
    """Derived (never stored as truth) operating cycle view of one ownership doc."""
    cycle_index: int = 0
    cycle_start_iso: Optional[str] = None
    cycle_end_iso: Optional[str] = None
    state: str = "active"
    maintenance_required: bool = False


def derive_cycle(ownership: dict, now: datetime) -> OwnershipCycle:
    """
    Derive the real-time operating cycle from persisted ownership fields.
    Backend fields expected on ownership docs:
      cycleIndex, cycleStartedAt (iso), status
    Session tools: cycle length OPERATING_CYCLE_HOURS; grace MAINTENANCE_GRACE_HOURS.
    Continuous tools (Elite): never enter the cycle-complete/maintenance cycle —
    they stay 'active' while the ownership itself is active; campaign state and
    settlement govern them instead.
    A session tool whose cycleStartedAt lies in the FUTURE is mid-restart: the
    restart was requested and the next session begins at that timestamp. Until
    then the tool mines nothing (state 'restarting').
    """
    idx = int(ownership.get("cycleIndex") or 0)
    # B2 consistency: no activatedAt fallback — anchor-less legacy ownerships
    # have no canonical cycle until the engine reconciles their anchor.
    started_raw = ownership.get("cycleStartedAt")
    status = ownership.get("status") or "inactive"
    if not started_raw or status not in ("active",):
        return OwnershipCycle(cycle_index=idx, state=status)

    try:
        started = _parse_iso(started_raw)
    except Exception:
        return OwnershipCycle(cycle_index=idx, state=status)

    model = tool_operating_model(ownership.get("toolId"))
    if model.get("operatingModel") == "continuous":
        # Continuous operation: no session end, no maintenance requirement.
        # cycle_end_iso stays None — the UI must not show a session countdown.
        return OwnershipCycle(
            cycle_index=idx,
            cycle_start_iso=started.isoformat(),
            state="active",
        )

    elapsed = now - started
    cycle_len = timedelta(hours=float(model.get("sessionDurationHours") or OPERATING_CYCLE_HOURS))
    grace = timedelta(hours=MAINTENANCE_GRACE_HOURS)

    if elapsed < timedelta(0):
        # Restart requested; the next session begins at `started` (future).
        return OwnershipCycle(
            cycle_index=idx,
            cycle_start_iso=started.isoformat(),
            cycle_end_iso=(started + cycle_len).isoformat(),
            state="restarting",
        )
    if elapsed < cycle_len:
        return OwnershipCycle(
            cycle_index=idx,
            cycle_start_iso=started.isoformat(),
            cycle_end_iso=(started + cycle_len).isoformat(),
            state="active",
        )
    if elapsed < cycle_len + grace:
        # within grace window: no longer accruing, but maintenance still allowed
        return OwnershipCycle(
            cycle_index=idx,
            cycle_start_iso=started.isoformat(),
            cycle_end_iso=(started + cycle_len).isoformat(),
            state="cycle_complete",
            maintenance_required=True,
        )
    return OwnershipCycle(
        cycle_index=idx,
        cycle_start_iso=started.isoformat(),
        cycle_end_iso=(started + cycle_len).isoformat(),
        state="maintenance_required",
        maintenance_required=True,
    )


def maintenance_window_open(ownership: dict, now: datetime) -> bool:
    """Return whether an ownership is currently awaiting maintenance."""
    c = derive_cycle(ownership, now)
    return c.maintenance_required


# ----------------------------------------------------------------------------
# Accrual windows (authoritative math)
# ----------------------------------------------------------------------------

@dataclass
class AccrualSegment:
    start: datetime
    end: datetime
    rate_minor_per_hour: int
    kind: str  # "tool" | "referral"
    source_id: str = ""


@dataclass
class AccrualWindowResult:
    total_minor: int = 0
    tool_minor: int = 0
    referral_minor: int = 0
    segments: List[AccrualSegment] = field(default_factory=list)


def legacy_balance_minor(user: dict) -> int:
    """
    B1/B-F1: THE single legacy-accrual reconciliation rule (pure).

    Mirror-coherence rule: the legacy (pre-ledger) value is whatever the
    legacy mirror (totalAccruedGBP) knows that the canonical ledger
    (accruedMinor) does NOT. Composed test fixture: mirror=accrued/100 for
    every Phase-1+ user => 0; pre-ledger docs have mirror > accrued => the
    residual is the genuine legacy value, available exactly once.

    After absorption (legacyBalanceAbsorbedMinor recorded, even 0), the legacy
    value lives inside accruedMinor and contributes 0 — never counted twice.
    """
    if user.get("legacyBalanceAbsorbedMinor") is not None:
        return 0
    try:
        mirror_minor = int((Decimal(str(user.get("totalAccruedGBP") or 0)) * 100).to_integral_value(rounding=ROUND_DOWN))
    except Exception:
        mirror_minor = 0
    try:
        accrued = int(user.get("accruedMinor") or 0)
    except Exception:
        accrued = 0
    return max(0, mirror_minor - accrued)


def is_anchorless_legacy_ownership(ownership: dict) -> bool:
    """
    B2: a pre-canonical ownership has activatedAt but neither canonical anchor.
    Its historical period is represented by the legacy balance; the engine must
    reconcile the anchor at current server time and accrue NOTHING historically.
    """
    return bool(ownership.get("activatedAt")) and not ownership.get("lastAccruedAt") and not ownership.get("cycleStartedAt")


LEGACY_WITHDRAWAL_ACTIVE_STATUSES = ("pending", "under_review", "processing", "approved", "completed")


def legacy_withdrawal_paid_minor(rows) -> int:
    """
    B-F1: THE withdrawal-debit classification rule (pure, composed-testable).

    Rows WITHOUT a `source` field are genuine legacy (v1) withdrawals — they
    never had a canonical ledger debit, so they are summed here.
    Rows WITH `source == "user"` are canonical payouts created by
    create_payout_request, which wrote the deterministic `payout_{withdrawalId}`
    ledger debit in the SAME transaction — they MUST be excluded or the debit
    is counted twice.
    Canonical/legacy rows are structurally distinguishable (v1 never wrote a
    source field), so no data migration is required.
    """
    total = Decimal(0)
    for w in rows or []:
        d = w if isinstance(w, dict) else {}
        if (d.get("source") or "") == "user":
            continue  # canonical payout — already represented by its ledger debit
        if (d.get("status") or "") in LEGACY_WITHDRAWAL_ACTIVE_STATUSES:
            try:
                total += Decimal(str(d.get("amountGbp") or 0))
            except Exception:
                continue
    return int((total * 100).to_integral_value(rounding=ROUND_DOWN))


PAYOUT_DEBIT_KIND = "payout_debit"
PAYOUT_REVERSAL_KIND = "payout_reversal"


def canonical_net_paid_minor(ledger_rows) -> int:
    """
    B-F1: canonical payout debits NET of reversals, in minor units.
    Debits are stored negative (kind=payout_debit); reversals positive
    (kind=payout_reversal). Net paid-out = -(sum) so a rejected payout
    returns the reserved funds exactly once.
    """
    total = 0
    for r in ledger_rows or []:
        d = r if isinstance(r, dict) else {}
        if d.get("kind") not in (PAYOUT_DEBIT_KIND, PAYOUT_REVERSAL_KIND):
            continue
        try:
            total += int(d.get("amountMinor") or 0)
        except Exception:
            continue
    return -total


def available_balance_minor(accrued_minor: int, ledger_rows, withdrawal_rows,
                            legacy_accrued_minor: int = 0) -> int:
    """
    B-F1: THE available-balance equation — the single composition point.

    available = canonical accrual (ledger-backed, absorbed legacy included)
              + legacy accrued (exactly once; 0 after absorption)
              - canonical payout debits NET of reversals (one per payout)
              - genuine legacy withdrawal debits (source-less rows only)

    Every economic event contributes exactly once; canonical rows carry a
    ledger debit, legacy rows carry a withdrawal doc, never both.
    """
    return max(0, int(accrued_minor or 0) + int(legacy_accrued_minor or 0)
               - canonical_net_paid_minor(ledger_rows)
               - legacy_withdrawal_paid_minor(withdrawal_rows))


def normalize_tx_hash(tx_hash: str) -> str:
    """B6: consistent lowercase/trimmed hash comparison across payout records."""
    return (tx_hash or "").strip().lower()


# ----------------------------------------------------------------------------
# Accrual banking: whole-penny anchors (cadence independence)
# ----------------------------------------------------------------------------

def earnable_seconds(
    window_start: datetime,
    window_end: datetime,
    campaign_windows: List[Tuple[datetime, datetime, bool]],
) -> Decimal:
    """Operating seconds inside [window_start, window_end) (Decimal, never float)."""
    total = Decimal(0)
    for w_start, w_end, is_operating in campaign_windows or []:
        if not is_operating:
            continue
        seg_start = max(window_start, w_start)
        seg_end = min(window_end, w_end)
        if seg_end <= seg_start:
            continue
        total += Decimal((seg_end - seg_start).total_seconds())
    return total


def accrual_banked_boundary(
    window_start: datetime,
    window_end: datetime,
    campaign_windows: List[Tuple[datetime, datetime, bool]],
    rate_minor: int,
    earned_minor: int,
) -> datetime:
    """The instant up to which EXACTLY `earned_minor` whole pence have been banked.

    WHY THIS EXISTS (and why it is not just `window_end`)
    ----------------------------------------------------
    Accrual is floored to whole pence per checkpoint. If the caller advances the
    anchor all the way to `window_end` — which is what every implementation did
    before this helper — the sub-penny remainder of each checkpoint is DISCARDED.
    Earnings then depend on how often anything triggers a checkpoint, i.e. on how
    often the user's dashboard polls: measured against this engine, a Starter
    tool (10p/h) earned 0p in an hour at 60-second polls, a Builder tool (50p/h)
    earned 0p, and an Elite tool (250p/h) earned 240p instead of 250p — where the
    locked rates say £0.10 / £0.50 / £2.50 per hour.

    Returning the whole-penny boundary keeps the unbanked remainder BEHIND the
    anchor, so the next checkpoint credits it. The booked balance is then
    identical at every cadence (60s, 300s, or one settlement an hour later),
    which is what makes reducing dashboard polling financially safe.

    Rounding is deliberately downward (to the microsecond): a boundary may never
    represent MORE banked time than the whole pence it is derived from, or the
    next checkpoint would bank part of that period twice.
    """
    if earned_minor <= 0 or rate_minor <= 0:
        return window_start
    remaining = (Decimal(int(earned_minor)) * Decimal(3600)) / Decimal(int(rate_minor))
    for w_start, w_end, is_operating in campaign_windows or []:
        if not is_operating:
            continue
        seg_start = max(window_start, w_start)
        seg_end = min(window_end, w_end)
        if seg_end <= seg_start:
            continue
        seg = Decimal((seg_end - seg_start).total_seconds())
        if remaining > seg:
            remaining -= seg
            continue
        micros = int((remaining * Decimal(1000000)).to_integral_value(rounding=ROUND_DOWN))
        return seg_start + timedelta(microseconds=micros)
    return window_end


def accrue_ownership(
    ownership: dict,
    window_start: datetime,
    window_end: datetime,
    campaign_windows: List[Tuple[datetime, datetime, bool]],
) -> Tuple[int, datetime]:
    """
    Accrue GBP minor units for ONE ownership over [window_start, window_end).

    Returns (earned_minor, next_anchor) where next_anchor is the instant the
    caller must move the ownership accrual anchor to. It is `window_start`
    itself when nothing was banked — meaning "leave the anchor alone" — so a
    checkpoint that earns nothing is a pure read and never rewrites the tool
    document (the dashboard must not write merely because it is being viewed).

    Two boundaries exist, and they differ in purpose:
      • TERMINAL — the accrual of this window is completely determined and no
        later checkpoint can add to it: the session cycle ended inside the
        window, or the campaign is not earning (caller passes no windows). The
        anchor moves all the way to that boundary. At most a sub-penny tail is
        left unbanked per session, which is unavoidable at penny resolution.
      • WHOLE-PENNY — the window is still open (a running session, a continuous
        tool). The anchor moves only as far as whole pence were banked, so the
        remainder carries forward (see accrual_banked_boundary).

    Either way the operation is idempotent: re-running it with the same window
    returns 0 and never moves the anchor backwards.

    Eligible time excludes:
      - time before the current operating cycle started
      - time after the operating cycle end (grace/maintenance periods never accrue)
      - campaign paused windows
      - time after campaign endAt (caller pre-clips; we intersect again)
    """
    zero = (0, window_start)
    if ownership.get("status") != "active":
        return zero

    started_raw = ownership.get("cycleStartedAt")
    if not started_raw:
        # B2: anchor-less (legacy/unreconciled) ownership — no canonical cycle
        # anchor exists. Historical time is represented by the legacy balance;
        # the engine initializes the anchor at the reconciliation point. No
        # historical accrual may be derived from activatedAt.
        return zero
    try:
        started = _parse_iso(started_raw)
    except Exception:
        return zero

    rate_minor = int(ownership.get("hourlyRateMinor") or 0)
    if rate_minor <= 0:
        # canonical rate resolution: legacy docs may carry only floats
        legacy = ownership.get("hourlyRateGBP")
        if legacy:
            try:
                rate_minor = gbp_major_to_minor(float(legacy))
            except Exception:
                return zero
        else:
            return zero

    model = tool_operating_model(ownership.get("toolId"))
    if model.get("operatingModel") == "continuous":
        # Continuous tool: no operating-cycle clipping. Eligible time is simply
        # the requested window intersected with the campaign operating windows
        # below; pause/end remain enforced by those windows (and by the caller).
        effective_end = window_end
        effective_start = max(window_start, started)
        if effective_end <= effective_start:
            return (0, window_start)
    else:
        # Session tool: operating portion of the CURRENT session only — a future
        # session start (restart pending) and the post-session window never
        # accrue.
        session_len = timedelta(hours=float(model.get("sessionDurationHours") or OPERATING_CYCLE_HOURS))
        cycle_end = started + session_len
        effective_end = min(window_end, cycle_end)
        effective_start = max(window_start, started)
        if effective_end <= effective_start:
            # Session over (or not started): nothing banked, anchor untouched.
            return (0, window_start)

    total_minor = 0
    for w_start, w_end, is_operating in campaign_windows or []:
        if not is_operating:
            continue
        seg_start = max(effective_start, w_start)
        seg_end = min(effective_end, w_end)
        if seg_end <= seg_start:
            continue
        hours = Decimal((seg_end - seg_start).total_seconds()) / Decimal(3600)
        earned = int((Decimal(rate_minor) * hours).to_integral_value(rounding=ROUND_DOWN))
        total_minor += earned

    if not campaign_windows or effective_end < window_end:
        # TERMINAL: campaign not earning, or the session ends inside this window.
        return (total_minor, effective_end)
    return (total_minor, accrual_banked_boundary(
        effective_start, effective_end, campaign_windows, rate_minor, total_minor,
    ))


def referral_capacity_rate_minor(
    qualified_referral_count: int,
    has_operating_tool: bool = True,
) -> int:
    """Effective referral rate for a referral window, in minor units per hour.

    Zero when no capacity qualifies (no qualified referral, or no operating
    tool) — the two cases the anchor rules in `accrue_referral_capacity_banked`
    have to tell apart from "capacity exists but this window banked less than a
    penny".
    """
    if not has_operating_tool:
        return 0
    n = compute_referral_capacity_minor(qualified_referral_count) // REFERRAL_BONUS_MINOR_PER_HOUR
    if n <= 0:
        return 0
    return n * REFERRAL_BONUS_MINOR_PER_HOUR


def accrue_referral_capacity_banked(
    qualified_referral_count: int,
    window_start: datetime,
    window_end: datetime,
    campaign_windows: List[Tuple[datetime, datetime, bool]],
    has_operating_tool: bool = True,
) -> Tuple[int, datetime]:
    """Referral capacity accrual + the anchor the caller must advance to.

    Returns (earned_minor, next_anchor):
      • rate > 0   — the anchor advances only as far as whole pence were banked,
                     so the sub-penny remainder carries forward instead of being
                     discarded by the next checkpoint. (The same cadence bug
                     `accrue_ownership` was fixed for: 30p/h per referral never
                     reached a whole penny inside one 60-second checkpoint, so
                     referral capacity paid £0 however long it ran.)
      • rate == 0  — no capacity can accrue in this window at all, because the
                     referrer has no operating tool or no qualified referral.
                     The anchor is still consumed (advanced to window_end):
                     that is what stops a LATER qualification or restart from
                     retro-crediting a period that accrued nothing. The engine
                     re-anchors to the qualification moment when the count
                     itself changes, so a zero-count user writes nothing.
    """
    rate = referral_capacity_rate_minor(qualified_referral_count, has_operating_tool)
    if rate <= 0:
        return (0, window_end)
    total = 0
    for w_start, w_end, is_operating in campaign_windows or []:
        if not is_operating:
            continue
        seg_start = max(window_start, w_start)
        seg_end = min(window_end, w_end)
        if seg_end <= seg_start:
            continue
        hours = Decimal((seg_end - seg_start).total_seconds()) / Decimal(3600)
        total += int((Decimal(rate) * hours).to_integral_value(rounding=ROUND_DOWN))
    return (total, accrual_banked_boundary(
        window_start, window_end, campaign_windows, rate, total,
    ))


def accrue_referral_capacity(
    qualified_referral_count: int,
    window_start: datetime,
    window_end: datetime,
    campaign_windows: List[Tuple[datetime, datetime, bool]],
    has_operating_tool: bool = True,
) -> int:
    """
    Referral capacity accrues only while referrer has >=1 operating tool
    (per canonical rule). Rate: 30 minor/hour per qualified referral, max 5.
    When the user has no operating tool, nothing accrues (anchor still advances
    at the caller so missed time is never retro-credited).
    """
    return accrue_referral_capacity_banked(
        qualified_referral_count, window_start, window_end,
        campaign_windows, has_operating_tool,
    )[0]


# ----------------------------------------------------------------------------
# Referral identity + qualification ordering
# ----------------------------------------------------------------------------

def referral_doc_id(referrer_id: str, referred_user_id: str) -> str:
    """Deterministic referral doc id — structurally prevents duplicates."""
    return f"ref_{referrer_id}_{referred_user_id}"


REFERRAL_STAGES = ("registered", "wallet_connected", "tool_purchased", "mining_active", "qualified")

# Legacy vocabulary found in production docs (v1/v2 writers used both).
LEGACY_REFERRAL_STAGE_ALIASES = {"pending": "registered"}


def _canonical_referral_stage(stage: str) -> str:
    """Map a legacy referral stage to its canonical stage."""
    return LEGACY_REFERRAL_STAGE_ALIASES.get(stage, stage)


def referral_stage_rank(stage: str) -> int:
    """Return the ordering rank for a referral stage."""
    try:
        return REFERRAL_STAGES.index(_canonical_referral_stage(stage))
    except ValueError:
        return -1


def is_valid_referral_progression(current: str, new: str) -> bool:
    """Stages may only advance forward (never backwards). Legacy 'pending' == 'registered'."""
    if new not in REFERRAL_STAGES:
        return False
    if current not in REFERRAL_STAGES and current not in LEGACY_REFERRAL_STAGE_ALIASES:
        return new == "registered"
    return referral_stage_rank(new) > referral_stage_rank(current)


# ----------------------------------------------------------------------------
# Internal parsing
# ----------------------------------------------------------------------------

def _parse_iso(v) -> datetime:
    """Parse an ISO timestamp and normalize it to UTC."""
    if isinstance(v, datetime):
        dt = v
    else:
        dt = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def campaign_operating_windows(
    status: str,
    start_at: datetime,
    end_at: datetime,
    pause_windows: List[Tuple[datetime, datetime]],
    now: datetime,
) -> List[Tuple[datetime, datetime, bool]]:
    """
    Build campaign operating windows from campaign state.
    status: active | paused | ended-like; pauses subtract from operating time.
    """
    eff_end = min(end_at, now)
    if status in ("paused",):
        windows: List[Tuple[datetime, datetime, bool]] = []
        cursor = start_at
        for p_start, p_end in sorted((p[0], p[1]) for p in pause_windows):
            if p_end <= cursor or p_start >= eff_end:
                continue
            if p_start > cursor:
                windows.append((cursor, min(p_start, eff_end), True))
            cursor = max(cursor, p_end)
        if cursor < eff_end:
            windows.append((cursor, eff_end, False))  # currently paused tail
        return windows
    if status in ("settling", "ended", "payout", "closed", "archived"):
        end_boundary = min(end_at, now)
        if end_boundary > start_at:
            return [(start_at, end_boundary, True)]
        return []
    # active
    return [(start_at, eff_end, True)]


# ----------------------------------------------------------------------------
# Upstream capacity classification (pure)
# ----------------------------------------------------------------------------

# Exception class names that mean "a dependency is out of capacity or
# unavailable" — i.e. RETRYABLE, not an application defect.
UPSTREAM_UNAVAILABLE_NAMES = frozenset({
    "ResourceExhausted",
    "ServiceUnavailable",
    "DeadlineExceeded",
    "TooManyRequests",
    "RetryError",
})


def upstream_unavailable_kind(exc, extra_types=()) -> Optional[str]:
    """Return the exception class name when `exc` denotes exhausted capacity or
    an unavailable dependency, else None.

    WHY THIS IS A PURE RULE: production incident 2026-09-21 was a Firestore quota
    exhaustion (`ResourceExhausted`) that the API reported as
    `500 INTERNAL_SERVER_ERROR`. That is a lie with a cost — it sends operators
    hunting for a code regression and shows users a failure that looks permanent.
    Capacity failures are retryable, so the edge maps this decision to 503. The
    rule lives here, with the other pure decision functions, so it can be tested
    without Flask or Firestore.

    The walk follows `__cause__`/`__context__`, so a wrapped or
    `raise ... from` error (how google.api_core re-raises a gRPC status) is still
    recognised. `extra_types` lets the caller pass the real dependency exception
    classes for `isinstance` precision; the class-name set is the fallback that
    is always available, including where those packages are not installed.

    Classification is never done by matching message text.
    """
    types = tuple(t for t in (extra_types or ()) if isinstance(t, type))
    seen = set()
    pending = [exc]
    while pending:
        cur = pending.pop()
        if cur is None or id(cur) in seen:
            continue
        seen.add(id(cur))
        if types and isinstance(cur, types):
            return type(cur).__name__
        name = type(cur).__name__
        if name in UPSTREAM_UNAVAILABLE_NAMES:
            return name
        pending.append(getattr(cur, "__cause__", None))
        pending.append(getattr(cur, "__context__", None))
    return None
