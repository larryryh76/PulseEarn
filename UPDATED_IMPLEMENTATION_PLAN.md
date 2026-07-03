# PulseEarn Remediation & Stabilization Plan (Recovery Phase)

## Batch 1: Backend Recovery & Availability (EMERGENCY)
**Objective**: Restore access to the /api routes and eliminate the 500 crashes.

- **Status**: IMPLEMENTED (Pending Deployment)
- **Changes**:
  - Robust `get_project_id()` with authoritative production fallback.
  - Emergency boot patch with `sys.stdout.flush()` for Vercel logging.
  - Hardened `evaluate_missions` with `TypeError` guards.
  - Added `/api/ping` for infrastructure testing.
  - Standardized JSON error handler.

## Batch 2: Security Verification & Rule Audit
**Objective**: Verify the "Mission Spoofing" fix on the live site once availability is restored.

- **Changes**:
  - Audit `firestore.rules` effectiveness on production.
  - Attempt (safe) authenticated write to `user_system_tasks` via console.
  - Verify `mission_reward` backend validation rejects non-compliant claims.

## Batch 3: Dashboard & Context Verification
**Objective**: Ensure the parallel listener refactor correctly handles live data.

- **Changes**:
  - Refactor `TaskContext.tsx` (Parallelized `onSnapshot`).
  - Update Dashboard filtering for deleted/inactive missions.
  - Verify memory leak resolution.

## Batch 4: Final UI/UX Polish & Certification
**Objective**: Final cleanup and professionalization.

- **Changes**:
  - `safeFetch` implementation for all frontend callers.
  - Production console log cleanup (`import.meta.env.DEV` guards).
  - End-to-end walkthrough verification.

---

**Next Step**: Deploy Batch 1 and verify `/api/health` on https://pulseearn.online.
