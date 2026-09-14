"""
Canonical PSEmine engine (Phase 1 consolidation).

This module is THE backend authority for PSEmine economics. There is exactly:
- ONE accrual writer  -> accrual_checkpoint()
- ONE ledger          -> psemine_mining_ledger (append-only, idempotent entry ids)
- ONE campaign reader -> canonical_campaign() / campaign_lifecycle_state()
- ONE referral qualification path -> settle_referral_on_activation()
- ONE payout request path -> create_payout_request()
- ONE recovery record writer -> create_payment_recovery()

Money is integer minor units (GBP pence). BNB is integer wei.
All timestamps are UTC. Frontend timing is never authoritative.

Ledger model (append-only):
  psemine_mining_ledger/{entryId}
    userId, campaignId, kind ('accrual'|'payout_debit'|'adjustment'|'maintenance'|'migration'),
    amountMinor (int, signed), source ('auto'|'maintenance'|'purchase'|'settlement'|'admin'),
    anchorFrom/anchorTo (iso), ownershipId?, purchaseId?, withdrawalId?, note?, createdAt
  Balance = sum(amountMinor). totalAccruedGBP on psemine_users is a DERIVED mirror only.
"""

import hashlib
import logging
import os
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from psemine_core import (
    LOCKED_PSEMINE_TOOLS,
    LEGACY_TOOL_ID_ALIASES,
    accrue_ownership,
    accrue_referral_capacity,
    campaign_operating_windows,
    compute_referral_capacity_minor,
    compute_tool_capacity_minor,
    compute_total_capacity_minor,
    derive_cycle,
    gbp_major_to_minor,
    is_anchorless_legacy_ownership,
    is_valid_referral_progression,
    legacy_balance_minor,
    available_balance_minor,
    canonical_net_paid_minor,
    legacy_withdrawal_paid_minor,
    normalize_tx_hash,
    referral_doc_id,
    LEGACY_REFERRAL_STAGE_ALIASES,
    MAINTENANCE_GRACE_HOURS,
    OPERATING_CYCLE_HOURS,
    PAYOUT_MIN_GBP_MINOR,
    PSEMINE_CAMPAIGN_DOC_ID,
    REFERRAL_BONUS_MINOR_PER_HOUR,
)

try:
    from firebase_admin import firestore as _firestore  # type: ignore
except Exception:  # pragma: no cover
    _firestore = None

# --- Environment-tunable (non-economic) settings -------------------------------
def _env_int(name, default):
    try:
        return max(1, int(os.environ.get(name, str(default))))
    except (TypeError, ValueError):
        return default

PAYOUT_WALLET_CUTOFF_DAYS = _env_int("PSEMINE_PAYOUT_WALLET_CUTOFF_DAYS", 7)
PAYOUT_WALLET_CUTOFF_ENABLED = os.environ.get("PSEMINE_PAYOUT_WALLET_CUTOFF", "true").lower() != "false"


def _run_transaction(db, txn_fn):
    """Run txn_fn inside a Firestore transaction AND commit it.

    B-F1 composition-audit fix: the engine previously invoked its _txn functions
    against db.transaction() without @firestore.transactional or an explicit
    commit(), so every canonical transactional write (accrual checkpoint,
    maintenance, referral qualification, payout debit) would be silently
    discarded by the real SDK. This helper restores the documented semantics:

    - production (firebase_admin present): @firestore.transactional — official
      auto-commit with retry-on-contention; on exception the transaction is
      cleaned up and nothing is committed;
    - test double / no SDK: run then explicit commit(), with no-op when the
      txn_fn returned a validation rejection before buffering any writes.
    """
    txn = db.transaction()
    if _firestore is not None and hasattr(_firestore, "transactional"):
        return _firestore.transactional(txn_fn)(txn)
    result = txn_fn(txn)
    commit = getattr(txn, "commit", None)
    if callable(commit):
        commit()
    return result
EVM_ADDRESS = "^0x[0-9a-fA-F]{40}$"


def utcnow():
    return datetime.now(timezone.utc)


def _iso(dt):
    return dt.isoformat() if dt else None


def _parse(v):
    if isinstance(v, datetime):
        dt = v
    else:
        dt = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _valid_evm(addr):
    import re
    return isinstance(addr, str) and bool(re.match(EVM_ADDRESS, addr or ""))


def _checkpoint_digest(parts):
    raw = "|".join(str(p) for p in parts)
    return hashlib.md5(raw.encode("utf-8")).hexdigest()[:16]


# ----------------------------------------------------------------------------
# Campaign authority
# ----------------------------------------------------------------------------

def canonical_campaign(db):
    """Read the single canonical campaign doc (active_campaign)."""
    snap = db.collection("psemine_campaigns").document(PSEMINE_CAMPAIGN_DOC_ID).get()
    return (snap.to_dict() or {}) if snap.exists else {}


def campaign_lifecycle_state(db, force_write=True):
    """
    Lazy, server-time campaign lifecycle enforcement. Cron is an accelerator;
    this is the authority. Returns (campaign_dict, effective_status, ended_now).

    effective_status: 'active' | 'paused' | 'ended'
    ended_now is True when this call transitioned doc -> 'ended' (or observed it).
    """
    ref = db.collection("psemine_campaigns").document(PSEMINE_CAMPAIGN_DOC_ID)
    snap = ref.get()
    camp = snap.to_dict() or {}
    if not snap.exists:
        return camp, "active", False

    now = utcnow()
    status = (camp.get("status") or "active").lower()
    start_at = None
    end_at = None
    try:
        if camp.get("startAt"):
            start_at = _parse(camp.get("startAt"))
        if camp.get("endAt"):
            end_at = _parse(camp.get("endAt"))
    except Exception:
        logging.warning("[PSEmine Campaign] Unparseable start/end; treating as active", exc_info=True)

    effective = status
    ended_now = False

    # endAt is absolute authority: no status override can extend earning past it.
    if end_at and now >= end_at and status not in ("ended", "settling", "payout", "closed", "archived"):
        effective = "ended"
        if force_write:
            ref.update({
                "status": "ended",
                "miningEnabled": False,
                "purchaseEnabled": False,
                "referralEnabled": False,
                "endedAt": firestore_server_ts(),
                "endReason": "END_AT_REACHED_AUTOMATIC",
                "updatedAt": firestore_server_ts(),
            })
            db.collection("admin_audit_logs").add({
                "timestamp": firestore_server_ts(),
                "adminId": "system:lifecycle",
                "action": "PSEMINE_CAMPAIGN_AUTO_END",
                "targetEntity": f"psemine_campaigns/{PSEMINE_CAMPAIGN_DOC_ID}",
                "metadata": {"endAt": _iso(end_at), "observedAt": _iso(now)},
            })
        ended_now = True
    elif status == "paused":
        effective = "paused"

    camp["status"] = effective if effective == "ended" else status
    camp["_effectiveStatus"] = effective
    return camp, effective, ended_now


def campaign_operating_windows_for(db, camp, now=None):
    """Build operating windows from canonical campaign doc (uses recorded pauseWindows)."""
    now = now or utcnow()
    status = (camp.get("_effectiveStatus") or camp.get("status") or "active").lower()
    start_at = _parse(camp["startAt"]) if camp.get("startAt") else (now - timedelta(days=1))
    end_at = _parse(camp["endAt"]) if camp.get("endAt") else (now + timedelta(days=90))
    pause_windows = []
    for p in (camp.get("pauseWindows") or []):
        try:
            pause_windows.append((_parse(p.get("startedAt")), _parse(p.get("endedAt") or p.get("endedAtIso") or now)))
        except Exception:
            continue
    # A currently-paused campaign has an open-ended pause running to now.
    if status == "paused":
        pause_windows.append((now, now))
    return campaign_operating_windows(status, start_at, end_at, pause_windows, now)


def is_campaign_earning_open(db):
    """True when accrual may occur right now (active or paused-with-windows is fine;
    the windows themselves exclude paused time). Ended/settling/archived => closed."""
    camp, effective, _ = campaign_lifecycle_state(db)
    return effective in ("active", "paused") and bool(campaign_operating_windows_for(db, camp))


def firestore_server_ts():
    return _firestore.SERVER_TIMESTAMP if _firestore else utcnow()


# ----------------------------------------------------------------------------
# Canonical user doc
# ----------------------------------------------------------------------------

def ensure_psemine_user(db, uid, email=None, username=None):
    ref = db.collection("psemine_users").document(uid)
    snap = ref.get()
    if snap.exists:
        return snap.to_dict() or {}
    now_iso = _iso(utcnow())
    payload = {
        "id": uid, "uid": uid, "userId": uid,
        "email": email, "username": username,
        "campaignId": PSEMINE_CAMPAIGN_DOC_ID,
        "status": "inactive",
        # Canonical balance (integer minor units). totalAccruedGBP is a mirror only.
        "accruedMinor": 0,
        "payoutDebitedMinor": 0,
        "legacyAccruedGBP": 0,
        "totalAccruedGBP": 0,
        "toolCapacityGBPPerHour": 0,
        "referralCapacityGBPPerHour": 0,
        "totalCapacityGBPPerHour": 0,
        "qualifiedReferralsCount": 0,
        "toolOwnershipCounts": {},
        "lastReferralAccruedAt": now_iso,
        "connectedWallet": None,
        "payoutWallet": None,
        "payoutWalletUpdatedAt": None,
        "onboardingCompleted": False,
        "createdAt": now_iso,
        "updatedAt": now_iso,
    }
    ref.set(payload)
    return payload


def _legacy_balance_minor(user):
    """B1: single reconciliation rule. After absorption (legacyBalanceAbsorbedMinor
    present), the legacy value lives in accruedMinor and returns 0 — readers must
    never add it again."""
    return legacy_balance_minor(user)


# ----------------------------------------------------------------------------
# THE accrual writer (single source of truth)
# ----------------------------------------------------------------------------

def accrual_checkpoint(db, uid, source="auto"):
    """
    THE single authoritative accrual writer.

    Per-ownership integer anchors (ownership.lastAccruedAt) make each tool's
    accrual idempotent and independent; the user referral anchor is separate.
    Every state transition writes exactly one ledger entry (deterministic id).
    Campaign pause/end are enforced via operating windows; after campaign end
    the anchors settle once to endAt and produce nothing further.
    """
    camp, effective, _ = campaign_lifecycle_state(db)
    now = utcnow()
    windows = campaign_operating_windows_for(db, camp, now)
    if effective not in ("active", "paused"):
        # settling / ended / payout / closed / archived: earning is closed.
        # Anchors settle once to min(now, endAt) so nothing accrues afterwards.
        windows = []
        window_end = min(now, _parse(camp["endAt"])) if camp.get("endAt") else now
    elif not windows:
        window_end = _parse(camp.get("endAt")) if camp.get("endAt") else now
        if window_end > now:
            window_end = now
    else:
        window_end = now

    user_ref = db.collection("psemine_users").document(uid)
    ownership_ref = db.collection("psemine_tool_ownership")

    earned_by_tool = []
    referral_minor = 0
    max_anchor = None

    def _txn(txn):
        nonlocal earned_by_tool, referral_minor, max_anchor
        user_snap = user_ref.get(transaction=txn)
        user = user_snap.to_dict() or {}

        # B1 (root cause): absorb the pre-ledger legacy balance ONCE, at the
        # FIRST canonical accrual touch — not only at tool activation. Without
        # this, the derived totalAccruedGBP mirror overwrites the legacy value
        # and the legacy balance is destroyed from every read path. The flag
        # makes this idempotent and mutually safe with the activation-time
        # absorption (whichever runs first wins; both check the same flag).
        legacy_minor_now = legacy_balance_minor(user)
        if legacy_minor_now > 0 and user.get("legacyBalanceAbsorbedMinor") is None:
            mig_ref = db.collection("psemine_mining_ledger").document(f"migration_{uid}")
            if not mig_ref.get(transaction=txn).exists:
                txn.set(mig_ref, {
                    "id": f"migration_{uid}", "userId": uid,
                    "campaignId": PSEMINE_CAMPAIGN_DOC_ID,
                    "kind": "migration", "amountMinor": int(legacy_minor_now),
                    "source": "migration",
                    "note": "pre-ledger totalAccruedGBP absorption at first canonical accrual",
                    "createdAt": firestore_server_ts(),
                })
            absorbed_base = int(user.get("accruedMinor") or 0) + int(legacy_minor_now)
            user["accruedMinor"] = absorbed_base
            user["legacyBalanceAbsorbedMinor"] = int(legacy_minor_now)
            txn.update(user_ref, {
                "accruedMinor": absorbed_base,
                "legacyBalanceAbsorbedMinor": int(legacy_minor_now),
                "totalAccruedGBP": float(Decimal(absorbed_base) / 100),
                "updatedAt": firestore_server_ts(),
            })

        owns = ownership_ref.where("userId", "==", uid).where("status", "==", "active").get(transaction=txn)

        earned_by_tool = []
        total_tool_minor = 0
        anchor_parts = []
        operating_now = False

        for own in owns:
            d = own.to_dict() or {}
            # B2: anchor-less legacy ownerships (activatedAt but no canonical
            # anchors) reconcile HERE at current server time — no historical
            # accrual for a period the legacy balance already represented.
            if is_anchorless_legacy_ownership(d):
                txn.update(own.reference, {
                    "lastAccruedAt": _iso(window_end),
                    "cycleStartedAt": _iso(window_end),
                    "accrualAnchorReconciledAt": firestore_server_ts(),
                    "accrualAnchorReconciled": True,
                    "updatedAt": firestore_server_ts(),
                })
                continue
            anchor_raw = d.get("lastAccruedAt") or d.get("cycleStartedAt")
            if not anchor_raw:
                continue
            anchor = _parse(anchor_raw)
            if anchor >= window_end:
                continue
            earned_i, eff_end = accrue_ownership(d, anchor, window_end, windows)
            if eff_end > anchor:
                txn.update(own.reference, {
                    "lastAccruedAt": _iso(eff_end),
                    "accrualAnchorUpdatedAt": firestore_server_ts(),
                })
                anchor_parts.append(f"{own.id}:{int(eff_end.timestamp())}")
            if earned_i > 0:
                earned_by_tool.append({"ownershipId": own.id, "toolId": d.get("toolId"), "minor": earned_i})
                total_tool_minor += earned_i
            # operating NOW = within current operating cycle
            c = derive_cycle(d, now)
            if c.state == "active":
                operating_now = True

        # Referral capacity accrual (requires >=1 tool operating now)
        ref_anchor_raw = user.get("lastReferralAccruedAt")
        ref_anchor = _parse(ref_anchor_raw) if ref_anchor_raw else window_end
        if ref_anchor < window_end:
            qual = int(user.get("qualifiedReferralsCount") or 0)
            referral_minor = accrue_referral_capacity(
                qual, ref_anchor, window_end, windows, has_operating_tool=operating_now
            )
            txn.update(user_ref, {"lastReferralAccruedAt": _iso(window_end)})

        total_minor = total_tool_minor + referral_minor

        # deterministic ledger id from the exact anchor transition
        digest = _checkpoint_digest([uid, window_end.isoformat(), *sorted(anchor_parts), referral_minor])
        entry_id = f"accrual_{uid[:28]}_{digest}"

        updates = {"updatedAt": firestore_server_ts()}
        if total_minor > 0:
            entry_ref = db.collection("psemine_mining_ledger").document(entry_id)
            entry = entry_ref.get(transaction=txn)
            if entry.exists:
                return {"earnedMinor": 0, "duplicate": True, "entryId": entry_id}
            txn.set(entry_ref, {
                "id": entry_id,
                "userId": uid,
                "campaignId": PSEMINE_CAMPAIGN_DOC_ID,
                "kind": "accrual",
                "amountMinor": int(total_minor),
                "source": source,
                "tools": earned_by_tool,
                "referralMinor": int(referral_minor),
                "anchorTo": _iso(window_end),
                "createdAt": firestore_server_ts(),
            })
            new_accrued = int(user.get("accruedMinor") or 0) + total_minor
            counts = user.get("toolOwnershipCounts") or {}
            qual = int(user.get("qualifiedReferralsCount") or 0)
            updates.update({
                "accruedMinor": new_accrued,
                "totalAccruedGBP": float(Decimal(new_accrued) / 100),  # derived mirror
                "toolCapacityGBPPerHour": float(Decimal(compute_tool_capacity_minor(counts)) / 100),
                "referralCapacityGBPPerHour": float(Decimal(compute_referral_capacity_minor(qual)) / 100),
                "totalCapacityGBPPerHour": float(Decimal(compute_total_capacity_minor(counts, qual)) / 100),
            })
        # Display-continuity mirrors (server-owned): lastAccruedAt always advances so
        # the client's server-anchored accrual animation stays meaningful; balances
        # themselves remain ledger-authoritative (accruedMinor).
        updates["lastAccruedAt"] = _iso(window_end)
        txn.update(user_ref, updates)
        return {"earnedMinor": int(total_minor), "duplicate": False, "entryId": entry_id if total_minor > 0 else None}

    return _run_transaction(db, _txn)


# ----------------------------------------------------------------------------
# Operating cycles + maintenance
# ----------------------------------------------------------------------------

def maintain_ownership(db, uid, ownership_id, source_ip=None):
    """
    Canonical maintenance: validates cycle completion, settles any unsettled
    eligible time (idempotently via per-tool anchor), advances the cycle.
    No economic reward is minted by maintenance itself. Idempotent per cycle.
    """
    camp, effective, _ = campaign_lifecycle_state(db)
    if effective == "ended":
        return {"ok": False, "error": "CAMPAIGN_ENDED"}

    own_ref = db.collection("psemine_tool_ownership").document(ownership_id)

    def _txn(txn):
        snap = own_ref.get(transaction=txn)
        if not snap.exists:
            return {"ok": False, "error": "OWNERSHIP_NOT_FOUND"}
        d = snap.to_dict() or {}
        if d.get("userId") != uid:
            return {"ok": False, "error": "FORBIDDEN"}
        if d.get("status") not in ("active", "cycle_complete", "maintenance_required"):
            return {"ok": False, "error": "INVALID_STATE"}

        now = utcnow()
        # B2: reconcile anchor-less legacy ownerships at first canonical touch.
        # This starts their first canonical cycle WITHOUT granting any historical
        # earnings, and unblocks the maintenance path (no anchor -> no cycle ->
        # CYCLE_NOT_COMPLETE forever).
        if is_anchorless_legacy_ownership(d):
            txn.update(own_ref, {
                "cycleStartedAt": _iso(now),
                "lastAccruedAt": _iso(now),
                "accrualAnchorReconciledAt": firestore_server_ts(),
                "accrualAnchorReconciled": True,
                "updatedAt": firestore_server_ts(),
            })
            d = {**d, "cycleStartedAt": _iso(now), "lastAccruedAt": _iso(now)}
        c = derive_cycle(d, now)
        if not c.maintenance_required:
            return {"ok": False, "error": "CYCLE_NOT_COMPLETE", "state": c.state}

        cycle_end = _parse(c.cycle_end_iso)
        windows = campaign_operating_windows_for(db, camp, now)

        # settle any uncheckpointed eligible time for THIS tool (anchor -> cycle_end)
        anchor_raw = d.get("lastAccruedAt") or d.get("cycleStartedAt")
        settle_minor = 0
        if anchor_raw:
            anchor = _parse(anchor_raw)
            if anchor < cycle_end:
                settle_minor, _eff = accrue_ownership(d, anchor, cycle_end, windows)
                if settle_minor > 0:
                    user_ref = db.collection("psemine_users").document(uid)
                    user_snap = user_ref.get(transaction=txn)
                    user = user_snap.to_dict() or {}
                    new_accrued = int(user.get("accruedMinor") or 0) + settle_minor
                    digest = _checkpoint_digest([uid, "maintenance_settle", ownership_id, _iso(cycle_end)])
                    entry_id = f"accrual_{uid[:28]}_{digest}"
                    entry_ref = db.collection("psemine_mining_ledger").document(entry_id)
                    if not entry_ref.get(transaction=txn).exists:
                        txn.set(entry_ref, {
                            "id": entry_id, "userId": uid, "campaignId": PSEMINE_CAMPAIGN_DOC_ID,
                            "kind": "accrual", "amountMinor": int(settle_minor), "source": "maintenance",
                            "ownershipId": ownership_id, "anchorTo": _iso(cycle_end),
                            "createdAt": firestore_server_ts(),
                        })
                        txn.update(user_ref, {
                            "accruedMinor": new_accrued,
                            "totalAccruedGBP": float(Decimal(new_accrued) / 100),
                            "updatedAt": firestore_server_ts(),
                        })
                    txn.update(own_ref, {"lastAccruedAt": _iso(cycle_end)})

        # cycle advancement: within grace -> next cycle starts at cycle_end (full time kept);
        # after grace -> lost time is lost, next cycle starts now.
        now_in_grace = now <= cycle_end + timedelta(hours=MAINTENANCE_GRACE_HOURS)
        next_start = cycle_end if now_in_grace else now

        txn.update(own_ref, {
            "cycleIndex": int(d.get("cycleIndex") or 0) + 1,
            "cycleStartedAt": _iso(next_start),
            "lastMaintenanceAt": _iso(now),
            "maintenanceCount": int(d.get("maintenanceCount") or 0) + 1,
            "status": "active",
            "lastAccruedAt": _iso(next_start),
            "updatedAt": firestore_server_ts(),
        })

        act_ref = db.collection("psemine_activities").document()
        txn.set(act_ref, {
            "id": act_ref.id, "userId": uid, "type": "TOOL_MAINTAINED",
            "title": "Maintenance Completed",
            "description": f"Operating cycle {int(d.get('cycleIndex') or 0) + 1} started for {d.get('toolName') or d.get('toolId')}.",
            "metadata": {"ownershipId": ownership_id, "cycleIndex": int(d.get("cycleIndex") or 0) + 1},
            "createdAt": firestore_server_ts(),
        })

        return {
            "ok": True,
            "cycleIndex": int(d.get("cycleIndex") or 0) + 1,
            "nextCycleStartedAt": _iso(next_start),
            "settledMinor": int(settle_minor),
        }

    return _run_transaction(db, _txn)


def hydrate_ownership_for_activation(ownership_id, uid, tool_id, tool_cfg, purchase_id, now):
    """Ownership payload with canonical cycle + anchor fields (minor-unit rates)."""
    return {
        "id": ownership_id,
        "userId": uid,
        "toolId": tool_id,
        "toolName": tool_cfg["name"],
        "toolVersion": tool_cfg.get("version", 1),
        "purchaseId": purchase_id,
        "hourlyRateMinor": tool_cfg["hourly_rate_minor"],
        "hourlyRateGBP": tool_cfg["hourly_rate_minor"] / 100.0,  # display only
        "purchasePriceGBP": tool_cfg["price_minor_units"] / 100.0,  # display only
        "activatedAt": _iso(now),
        "cycleIndex": 0,
        "cycleStartedAt": _iso(now),
        "lastAccruedAt": _iso(now),
        "maintenanceCount": 0,
        "operatingCycleHours": OPERATING_CYCLE_HOURS,
        "maintenanceGraceHours": MAINTENANCE_GRACE_HOURS,
        "status": "active",
        "createdAt": firestore_server_ts(),
    }


# ----------------------------------------------------------------------------
# Referrals (backend-only creation + qualification)
# ----------------------------------------------------------------------------

def _resolve_referrer(db, referral_code):
    snap = db.collection("users").where("referralCode", "==", (referral_code or "").upper().strip()).limit(1).get()
    if snap:
        return snap[0].id
    return None


def _has_referral_cycle(db, start_uid, target_uid, max_depth=10):
    """True if target_uid is in start_uid's referrer ancestry (circular referral)."""
    current = start_uid
    seen = set()
    depth = 0
    while current and depth < max_depth:
        if current == target_uid:
            return True
        if current in seen:
            return True
        seen.add(current)
        q = db.collection("psemine_referrals").where("refereeId", "==", current).limit(1).get()
        current = q[0].to_dict().get("referrerId") if q else None
        depth += 1
    return False


def register_referral(db, uid, referral_code_or_referrer):
    """Backend-side referral record creation with deterministic identity.
    Idempotent: re-registration returns the existing record."""
    referrer_id = referral_code_or_referrer
    if not (referral_code_or_referrer or "").startswith("ref_") and len(referral_code_or_referrer or "") != 28:
        resolved = _resolve_referrer(db, referral_code_or_referrer)
        if resolved:
            referrer_id = resolved
    if not referrer_id:
        return {"ok": False, "error": "REFERRER_NOT_FOUND"}
    if referrer_id == uid:
        return {"ok": False, "error": "SELF_REFERRAL"}
    if _has_referral_cycle(db, referrer_id, uid):
        return {"ok": False, "error": "CIRCULAR_REFERRAL"}

    doc_id = referral_doc_id(referrer_id, uid)
    ref = db.collection("psemine_referrals").document(doc_id)
    snap = ref.get()
    if snap.exists:
        return {"ok": True, "referralId": doc_id, "existing": True}

    now_iso = _iso(utcnow())
    ref.set({
        "id": doc_id,
        "referrerId": referrer_id,
        "refereeId": uid,
        "status": "registered",
        "stageHistory": {"registeredAt": now_iso},
        "bonusRateMinorPerHour": REFERRAL_BONUS_MINOR_PER_HOUR,
        "campaignId": PSEMINE_CAMPAIGN_DOC_ID,
        "createdAt": now_iso,
        "updatedAt": now_iso,
    })

    act_ref = db.collection("psemine_activities").document()
    act_ref.set({
        "id": act_ref.id, "userId": referrer_id, "type": "REFERRAL_REGISTERED",
        "title": "New Miner Invited",
        "description": "A new miner registered with your referral code.",
        "metadata": {"referralId": doc_id, "refereeId": uid},
        "createdAt": firestore_server_ts(),
    })
    return {"ok": True, "referralId": doc_id, "existing": False}


def settle_referral_on_activation(db, uid, purchase_id):
    """
    THE referral qualification path. Called inside the canonical purchase
    activation flow. Idempotent, capped at 5, backend-only.
    """
    q = db.collection("psemine_referrals").where("refereeId", "==", uid).limit(5).get()
    if not q:
        return {"ok": True, "qualified": False, "reason": "NO_REFERRAL_RECORD"}
    now_iso = _iso(utcnow())
    results = []
    for r in q:
        d = r.to_dict() or {}
        referrer_id = d.get("referrerId")
        if not referrer_id or referrer_id == uid:
            continue
        current = d.get("status") or "registered"
        if current == "qualified":
            results.append({"referralId": r.id, "alreadyQualified": True})
            continue
        if not is_valid_referral_progression(current, "qualified"):
            results.append({"referralId": r.id, "skipped": True})
            continue

        referrer_ref = db.collection("psemine_users").document(referrer_id)

        def _txn(txn, referrer_ref=referrer_ref, r=r, d=d, referrer_id=referrer_id):
            rs = r.reference.get(transaction=txn)
            rd = rs.to_dict() or {}
            if rd.get("status") == "qualified":
                return {"referralId": r.id, "alreadyQualified": True}
            us = referrer_ref.get(transaction=txn)
            ud = us.to_dict() or {"qualifiedReferralsCount": 0}
            curr = int(ud.get("qualifiedReferralsCount") or 0)
            if curr >= 5:
                txn.update(r.reference, {
                    "status": "tool_purchased",
                    "stageHistory.toolPurchasedAt": now_iso,
                    "capReached": True,
                    "updatedAt": firestore_server_ts(),
                })
                return {"referralId": r.id, "capReached": True}
            new_count = curr + 1
            txn.update(r.reference, {
                "status": "qualified",
                "qualifiedAt": now_iso,
                "purchaseId": purchase_id,
                "stageHistory.qualifiedAt": now_iso,
                "updatedAt": firestore_server_ts(),
            })
            if us.exists:
                counts = ud.get("toolOwnershipCounts") or {}
                txn.update(referrer_ref, {
                    "qualifiedReferralsCount": new_count,
                    "referralCapacityGBPPerHour": float(Decimal(compute_referral_capacity_minor(new_count)) / 100),
                    "totalCapacityGBPPerHour": float(Decimal(compute_total_capacity_minor(counts, new_count)) / 100),
                    "updatedAt": firestore_server_ts(),
                })
            else:
                txn.set(referrer_ref, {
                    "id": referrer_id, "uid": referrer_id, "userId": referrer_id,
                    "status": "inactive", "accruedMinor": 0, "payoutDebitedMinor": 0,
                    "qualifiedReferralsCount": new_count,
                    "referralCapacityGBPPerHour": float(Decimal(compute_referral_capacity_minor(new_count)) / 100),
                    "totalCapacityGBPPerHour": float(Decimal(compute_referral_capacity_minor(new_count)) / 100),
                    "toolOwnershipCounts": {},
                    "lastReferralAccruedAt": now_iso,
                    "createdAt": now_iso, "updatedAt": now_iso,
                })
            return {"referralId": r.id, "qualified": True, "referrerNewCount": new_count}

        try:
            # B4: settle the referrer's PREVIOUS accrual period at the OLD
            # capacity BEFORE the +1 bump. The next checkpoint then applies the
            # new referral rate only from the qualification timestamp onward —
            # never retroactively. Runs outside the qualification transaction
            # (Firestore transactions cannot nest).
            try:
                accrual_checkpoint(db, referrer_id, source="referral_qualify")
            except Exception as settle_err:
                logging.warning(
                    f"[PSEmine Referral] pre-qualification accrual settle failed for {referrer_id}: {settle_err}"
                )
            results.append(_run_transaction(db, _txn))
            act_ref = db.collection("psemine_activities").document()
            act_ref.set({
                "id": act_ref.id, "userId": referrer_id, "type": "REFERRAL_QUALIFIED",
                "title": "Referral Qualified!",
                "description": "Your referred miner deployed a tool. +£0.30/hr referral capacity.",
                "metadata": {"refereeId": uid, "purchaseId": purchase_id},
                "createdAt": firestore_server_ts(),
            })
        except Exception as e:
            logging.warning(f"[PSEmine Referral] qualification failed for {r.id}: {e}")
            results.append({"referralId": r.id, "error": str(e)})
    return {"ok": True, "results": results}


# ----------------------------------------------------------------------------
# Payout wallet (server-controlled) + payout requests (canonical path)
# ----------------------------------------------------------------------------

def update_payout_wallet(db, uid, new_wallet):
    if not _valid_evm(new_wallet):
        return {"ok": False, "error": "INVALID_ADDRESS"}
    camp, effective, _ = campaign_lifecycle_state(db)
    wallet = new_wallet.strip().lower()
    now = utcnow()
    if PAYOUT_WALLET_CUTOFF_ENABLED and camp.get("walletChangeDeadline"):
        try:
            deadline = _parse(camp["walletChangeDeadline"])
            if now > deadline:
                return {"ok": False, "error": "WALLET_CHANGE_CUTOFF_PASSED"}
        except Exception:
            pass
    user_ref = db.collection("psemine_users").document(uid)
    user_ref.set({"id": uid, "uid": uid, "userId": uid}, merge=True)
    user_ref.update({
        "payoutWallet": wallet,
        "connectedWallet": wallet,
        "payoutWalletUpdatedAt": _iso(now),
        "updatedAt": firestore_server_ts(),
    })
    act_ref = db.collection("psemine_activities").document()
    act_ref.set({
        "id": act_ref.id, "userId": uid, "type": "WALLET_UPDATED",
        "title": "Payout Wallet Updated",
        "description": f"Payout destination set to {wallet[:6]}...{wallet[-4:]}.",
        "metadata": {"payoutWallet": wallet},
        "createdAt": firestore_server_ts(),
    })
    return {"ok": True, "payoutWallet": wallet}


def _paid_out_minor(db, uid, txn=None):
    """B-F1: canonical payout debits NET of reversals (exactly-once accounting:
    a rejected payout must restore availability exactly once)."""
    snaps = db.collection("psemine_mining_ledger").where("userId", "==", uid).get(transaction=txn)
    return canonical_net_paid_minor([s.to_dict() for s in snaps])


def _legacy_paid_out_minor(db, uid):
    """B-F1: sum of GENUINE legacy (v1) withdrawal debits only.
    Canonical payouts (source == 'user') are excluded — each one already has
    its deterministic `payout_{withdrawalId}` ledger debit counted by
    _paid_out_minor. Summing both counted every canonical payout twice."""
    snaps = db.collection("psemine_withdrawals").where("userId", "==", uid).get()
    return legacy_withdrawal_paid_minor([s.to_dict() for s in snaps])


def create_payout_request(db, uid, amount_gbp, source="user"):
    """Canonical payout request. Blocks during an active/paused campaign (final
    settlement payouts are generated by the settlement system)."""
    camp, effective, _ = campaign_lifecycle_state(db)
    if effective in ("active", "paused"):
        return {"ok": False, "error": "CAMPAIGN_ACTIVE", "message": "Withdrawals open after the campaign ends and balances are finalized."}

    amount_minor = gbp_major_to_minor(amount_gbp)
    if amount_minor < PAYOUT_MIN_GBP_MINOR:
        return {"ok": False, "error": "BELOW_MINIMUM", "message": "Minimum payout is £10.00."}

    user_ref = db.collection("psemine_users").document(uid)
    user = user_ref.get().to_dict() or {}
    wallet = user.get("payoutWallet")
    if not _valid_evm(wallet or ""):
        return {"ok": False, "error": "NO_PAYOUT_WALLET", "message": "Set a valid payout wallet first."}

    def _txn(txn):
        u = user_ref.get(transaction=txn).to_dict() or {}
        ledger_rows = db.collection("psemine_mining_ledger").where("userId", "==", uid).get(transaction=txn)
        withdrawal_rows = db.collection("psemine_withdrawals").where("userId", "==", uid).get(transaction=txn)
        available = available_balance_minor(
            int(u.get("accruedMinor") or 0),
            [r.to_dict() for r in ledger_rows],
            [r.to_dict() for r in withdrawal_rows],
            legacy_accrued_minor=_legacy_balance_minor(u),
        )
        if amount_minor > available:
            return {"ok": False, "error": "INSUFFICIENT_BALANCE", "availableMinor": available}

        pending = db.collection("psemine_withdrawals").where("userId", "==", uid).where("status", "==", "pending").get(transaction=txn)
        if list(pending):
            return {"ok": False, "error": "PENDING_PAYOUT_EXISTS"}

        wd_ref = db.collection("psemine_withdrawals").document()
        wd_id = wd_ref.id
        txn.set(wd_ref, {
            "id": wd_id, "userId": uid,
            "amountGbp": float(Decimal(amount_minor) / 100),
            "amountMinor": int(amount_minor),
            "payoutAddress": u.get("payoutWallet"),
            "status": "pending",
            "source": source,
            "campaignId": PSEMINE_CAMPAIGN_DOC_ID,
            "createdAt": firestore_server_ts(),
            "updatedAt": firestore_server_ts(),
        })
        entry_ref = db.collection("psemine_mining_ledger").document(f"payout_{wd_id}")
        txn.set(entry_ref, {
            "id": f"payout_{wd_id}", "userId": uid, "campaignId": PSEMINE_CAMPAIGN_DOC_ID,
            "kind": "payout_debit", "amountMinor": -int(amount_minor), "source": "payout_request",
            "withdrawalId": wd_id, "createdAt": firestore_server_ts(),
        })
        txn.update(user_ref, {"payoutDebitedMinor": int(u.get("payoutDebitedMinor") or 0) + int(amount_minor), "updatedAt": firestore_server_ts()})
        return {"ok": True, "withdrawalId": wd_id, "amountMinor": int(amount_minor)}

    result = _run_transaction(db, _txn)
    if result.get("ok"):
        act_ref = db.collection("psemine_activities").document()
        act_ref.set({
            "id": act_ref.id, "userId": uid, "type": "WITHDRAWAL_REQUESTED",
            "title": f"Payout Requested (£{float(Decimal(amount_minor) / 100):.2f})",
            "description": "Payout request submitted for administrative review.",
            "metadata": {"withdrawalId": result["withdrawalId"]},
            "createdAt": firestore_server_ts(),
        })
    return result


# ----------------------------------------------------------------------------
# Payment recovery records
# ----------------------------------------------------------------------------

def create_payment_recovery(db, uid, *, tx_hash, quote_id=None, purchase_id=None,
                            sender=None, recipient=None, observed_wei=None,
                            chain_id=None, block_number=None, reason="", extra=None):
    """Record a payment that was submitted but could not be safely activated.
    Never auto-assigns, never refunds. Admin review is the only resolution path."""
    doc_id = f"recovery_{tx_hash[:40]}_{(quote_id or purchase_id or 'na')[:24]}"
    ref = db.collection("psemine_payment_recovery").document(doc_id)
    ref.set({
        "id": doc_id,
        "userId": uid,
        "txHash": tx_hash,
        "quoteId": quote_id,
        "purchaseId": purchase_id,
        "sender": (sender or "").lower() or None,
        "recipient": (recipient or "").lower() or None,
        "observedWei": str(observed_wei) if observed_wei is not None else None,
        "chainId": chain_id,
        "blockNumber": block_number,
        "reason": reason,
        "status": "open",
        "extra": extra or {},
        "createdAt": firestore_server_ts(),
        "updatedAt": firestore_server_ts(),
    }, merge=True)
    return doc_id


# ----------------------------------------------------------------------------
# Admin helpers (real data only)
# ----------------------------------------------------------------------------

def admin_overview(db):
    camp, effective, _ = campaign_lifecycle_state(db, force_write=False)
    users = db.collection("psemine_users").get()
    total_accrued_minor = 0
    total_debited_minor = 0
    active_miners = 0
    for u in users:
        d = u.to_dict() or {}
        total_accrued_minor += int(d.get("accruedMinor") or 0)
        total_debited_minor += int(d.get("payoutDebitedMinor") or 0)
        if d.get("status") == "active":
            active_miners += 1
    purchases = db.collection("psemine_purchases").where("status", "==", "activated").count().get()
    try:
        activated_purchases = purchases[0][0].value
    except Exception:
        activated_purchases = 0
    qualified_refs = db.collection("psemine_referrals").where("status", "==", "qualified").count().get()
    try:
        qualified_referrals = qualified_refs[0][0].value
    except Exception:
        qualified_referrals = 0
    recovery_open = db.collection("psemine_payment_recovery").where("status", "==", "open").count().get()
    try:
        recovery_open_count = recovery_open[0][0].value
    except Exception:
        recovery_open_count = 0
    total_capacity_minor = 0
    for u in users:
        d = u.to_dict() or {}
        counts = d.get("toolOwnershipCounts") or {}
        qual = int(d.get("qualifiedReferralsCount") or 0)
        total_capacity_minor += compute_total_capacity_minor(counts, qual)
    raw_status = (camp.get("status") or "active").lower()
    return {
        "campaign": {k: v for k, v in camp.items() if not k.startswith("_")},
        "effectiveStatus": effective,
        # canonical metrics (integer minor units)
        "totalMiners": len(users),
        "activeMiners": active_miners,
        "activatedPurchases": activated_purchases,
        "totalAccruedMinor": total_accrued_minor,
        "totalDebitedMinor": total_debited_minor,
        "totalAccruedGBP": float(Decimal(total_accrued_minor) / 100),
        "totalCapacityMinorPerHour": total_capacity_minor,
        "openRecoveryCases": recovery_open_count,
        "qualifiedReferrals": qualified_referrals,
        # UI-compatible keys consumed by the existing AdminPSEmine panel
        "toolsSold": activated_purchases,
        "totalCapacityGBPPerHour": float(Decimal(total_capacity_minor) / 100),
        "totalAccruedLiabilityGBP": float(Decimal(total_accrued_minor) / 100),
        "campaignStatus": raw_status if effective != "ended" else "ended",
    }


def admin_list_payment_recovery(db, status="open", limit=100):
    snaps = db.collection("psemine_payment_recovery").where("status", "==", status).limit(limit).get()
    return [{**s.to_dict(), "id": s.id} for s in snaps]


def admin_resolve_payment_recovery(db, recovery_id, admin_uid, action, notes="", purchase_id=None):
    """Actions: mark_reviewed | attach_to_purchase | reject. Never activates a tool;
    attachment only records the linkage — activation stays with the canonical
    verify-purchase endpoint after an administrator re-runs it."""
    ref = db.collection("psemine_payment_recovery").document(recovery_id)
    snap = ref.get()
    if not snap.exists:
        return {"ok": False, "error": "NOT_FOUND"}
    if action not in ("mark_reviewed", "attach_to_purchase", "reject"):
        return {"ok": False, "error": "INVALID_ACTION"}
    ref.update({
        "status": {"mark_reviewed": "reviewed", "attach_to_purchase": "attached", "reject": "rejected"}[action],
        "attachedPurchaseId": purchase_id if action == "attach_to_purchase" else None,
        "reviewedBy": admin_uid,
        "reviewNotes": notes,
        "updatedAt": firestore_server_ts(),
    })
    db.collection("admin_audit_logs").add({
        "timestamp": firestore_server_ts(),
        "adminId": admin_uid,
        "action": f"PSEMINE_RECOVERY_{action.upper()}",
        "targetEntity": f"psemine_payment_recovery/{recovery_id}",
        "metadata": {"notes": notes, "purchaseId": purchase_id},
    })
    return {"ok": True}


def admin_deprecate_tool(db, tool_id, admin_uid, reason=""):
    """Safely deprecate a non-canonical seeded tool (growth/pro). Refuses canonical ids."""
    if tool_id in LOCKED_PSEMINE_TOOLS:
        return {"ok": False, "error": "CANONICAL_TOOL"}
    ref = db.collection("psemine_tools").document(tool_id)
    snap = ref.get()
    if not snap.exists:
        return {"ok": False, "error": "NOT_FOUND"}
    ref.update({
        "isActive": False,
        "deprecated": True,
        "deprecatedAt": firestore_server_ts(),
        "deprecationReason": reason or "Superseded by canonical tool catalog",
        "canonicalAlias": LEGACY_TOOL_ID_ALIASES.get(tool_id),
        "updatedAt": firestore_server_ts(),
    })
    db.collection("admin_audit_logs").add({
        "timestamp": firestore_server_ts(),
        "adminId": admin_uid,
        "action": "PSEMINE_TOOL_DEPRECATED",
        "targetEntity": f"psemine_tools/{tool_id}",
        "metadata": {"reason": reason},
    })
    return {"ok": True}
