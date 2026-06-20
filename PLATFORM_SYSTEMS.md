# PulseEarn Platform Architecture & Systems Documentation

## 1. Core Philosophy
PulseEarn is a high-fidelity reward ecosystem built on a "Trust-by-Verification" model. Every point earned is backed by a transactional ledger entry, an activity log, and an idempotency claim. The system is designed for high-density participation with automated and manual verification paths.

## 2. Infrastructure & Stack
- **Frontend**: React 19, Vite, Tailwind CSS (Utility-first), Framer Motion (Animations), Lucide React (Icons).
- **Backend**: Firebase (Auth, Firestore, Storage).
- **State Management**: React Context API (`AuthContext`, `TaskContext`, `AdminContext`).
- **Data Source**: CoinGecko API (Market Data).

---

## 3. Database Schema (Firestore)

### 3.1 Global Collections
- `users`: Primary identity records.
- `campaigns`: Parent containers for multiple tasks.
- `tasks`: Individual earning units (standalone or linked to campaigns).
- `task_claims`: User submissions for tasks (evidence/proof).
- `referrals`: Attribution records between referrers and referees.
- `user_predictions`: Active and resolved market forecasts.
- `withdrawals`: Payout requests and settlement status.
- `support_tickets`: User help signals and admin chat.
- `support_messages`: Sub-collection or linked collection for ticket chat.
- `system_config`: Global constants (Economy settings, thresholds).
- `system_claims`: Idempotency registry for all reward events.
- `system_task_definitions`: Template definitions for "Missions" (e.g. "Complete 5 tasks").
- `user_system_tasks`: Individual progress tracking for Missions.
- `broadcasts`: Global admin announcements.

### 3.2 User Sub-collections (`users/{userId}/...`)
- `transactions`: Immutable financial ledger.
- `notifications`: User alerts.
- `task_history`: Permanent snapshots of completed tasks.
- `activities`: Micro-event log (feed data).
- `user_tasks`: State tracking for task cooldowns and progress.

---

## 4. Core Engines

### 4.1 PointTransactionEngine (`src/engines/points/`)
The **Authoritative Ledger**. Every point mutation must pass through this engine.
- **Workflow**:
  1. Acquire transactional lock on user.
  2. Check `system_claims` for idempotency (prevents double-reward).
  3. Validate action against `EconomyAuthority`.
  4. Recalculate `level` based on the exponential x3 curve.
  5. Atomically update User points, XP, and stats.
  6. Create Transaction record.
  7. Create Task History snapshot (if applicable).
  8. Release lock.
  9. Trigger Side Effects (Notifications, Activity logs, System events).

### 4.2 TaskEngine (`src/engines/tasks/`)
Manages the lifecycle of user-initiated tasks.
- **Workflow**:
  1. Check task status (ACTIVE) and user cooldown.
  2. Create `task_claim` document.
  3. Update `user_tasks` state to 'pending' or 'completed'.
  4. If `automated`, trigger `PointTransactionEngine` immediately.
  5. If `manual`, await admin review in `OpsValidation`.

### 4.3 MarketResolutionEngine (`src/engines/predictions/`)
Processes market outcomes.
- **Workflow**:
  1. Fetch live prices from CoinGecko.
  2. Scan for expired predictions (>24h).
  3. Compare `entryPrice` vs `exitPrice` based on `direction` (UP/DOWN).
  4. Trigger `PointTransactionEngine.resolvePrediction` for atomic settlement.

### 4.4 ReferralProtectionEngine (`src/engines/system/`)
Ensures clean growth.
- **Workflow**:
  1. Detect new referee registration.
  2. Check if referrer is "Qualified" (at least 1 task completed).
  3. Verify "Sanity" via `FraudEngine` (Same device check).
  4. Issue `referral_bonus` via Ledger.
  5. Support for "Retroactive Rewards" once a referrer completes their first task.

### 4.5 SystemTaskEngine (`src/engines/tasks/`)
Drives "Missions" or Achievements.
- **Workflow**:
  1. Listen for system events (e.g., `daily_login`, `level_up`).
  2. Evaluate user stats against `system_task_definitions`.
  3. Update `user_system_tasks` progress.
  4. Allow manual claim once `targetValue` is met.

---

## 5. Security Architecture

### 5.1 Transactional Locking
Uses an `execution_lock` field on the user document to prevent race conditions during rapid API calls. The lock has a 30-second safety timeout.

### 5.2 Idempotency
Every reward uses a unique `claimId` (e.g., `daily_2026-06-20_UID`). If the Ledger sees a pre-existing claim ID, it aborts, preventing duplicate payouts.

### 5.3 FraudEngine
Evaluates "Node Integrity" by:
- Fingerprinting devices.
- Flagging multi-account usage (same fingerprint across different UIDs).
- Monitoring "Velocity" (large rewards).

---

## 6. Administrative Hub (Ops Hub)
A high-density operational dashboard for:
- **Economy Control**: Modifying multipliers and thresholds.
- **Validation**: Reviewing task evidence (screenshots/links).
- **Users**: Identity management, manual adjustments, banning.
- **Audit**: Real-time anomaly detection and system logs.
- **Health**: Infrastructure monitoring.

---

## 7. Known System Constraints
- **Price Feed**: Dependent on CoinGecko Free Tier (rate limited).
- **History Limits**: Client-side sorting on a 50-100 record limit for performance.
- **Deletion**: Admin deletion is currently non-recursive (orphans data).
- **Google Auth**: Provider configured in Firebase but UI integration is missing.
