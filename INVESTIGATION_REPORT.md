# PulseEarn Critical Repository Deep-Dive Investigation Report

**Date**: June 22, 2026
**Lead Investigator**: Jules (Senior Software Architect & QA Engineer)
**Objective**: Complete Platform Understanding & Audit

---

## 1. Platform Map

### PAGES & ROUTES
- **Public Domain**: `/` (Home), `/signup`, `/login`, `/verify-email`.
- **User Ecosystem (Authenticated)**:
  - `/dashboard`: Unified status and discovery engine.
  - `/tasks`: Quest hub (Active Campaigns, Standalone, Challenges).
  - `/predictions`: Market forecasting terminal.
  - `/referrals`: Invitation management and performance.
  - `/wallet`: Financial ledger and settlement requests.
  - `/me`: Profile, identity security, and preferences.
  - `/notifications`: System alerts and activity logs.
  - `/support`: Help center and ticket threading.
  - `/guide`: Platform documentation.
- **Administrative Hub (Ops Hub)**:
  - `/admin/overview`: Operational priority queues and high-level metrics.
  - `/admin/users`: Identity management, manual adjustments, and recursive purging.
  - `/admin/campaigns`: Reward campaign configuration and analytics.
  - `/admin/tasks`: Global task library and builder.
  - `/admin/validation`: Manual proof review and atomic reward authorization.
  - `/admin/withdrawals`: Settlement queue (Pending -> Approved -> Paid).
  - `/admin/economy`: Liquidity controls and global config (EconomyConfigEngine).
  - `/admin/audit`: Security anomaly detection and system logs.
  - `/admin/health`: Real-time infrastructure monitoring.
- **Legal & Policy**: `/privacy`, `/terms`, `/reward-policy`, `/fraud-policy`, `/withdrawal-policy`, etc.

### ENGINES (Core Logic)
- **PointTransactionEngine**: The authoritative ledger for all point/XP mutations. Enforces 30s locks and idempotency.
- **TaskEngine**: Manages task lifecycle, proof registration, and automated vs manual validation.
- **MarketResolutionEngine**: Scans for expired predictions and resolves them via CoinGecko API.
- **ReferralProtectionEngine**: Handles attribution, qualification checking (1 task minimum), and retroactive rewarding.
- **SystemTaskEngine**: Drives "Missions" (Achievements) via state-based synchronization.
- **FraudEngine**: Node integrity checking (fingerprinting, velocity checks).
- **Notification/ActivityEngines**: Resilient side-effect handlers for user feedback.

### FIRESTORE COLLECTIONS
- **Identity**: `users`, `system_fingerprints`.
- **Engagement**: `campaigns`, `tasks`, `task_claims`, `referrals`, `user_predictions`, `user_system_tasks`, `system_task_definitions`.
- **Finance**: `withdrawals`, `system_claims` (Idempotency), `system_config`.
- **Support**: `support_tickets`, `support_messages`.
- **Monitoring**: `system_anomalies`, `system_audit`, `broadcasts`.

---

## 2. System Relationships

- **State Management**: `AuthContext` and `TaskContext` act as the primary bridges. `AuthContext` handles the "Identity Sync" (Auth session to Firestore document handshake). `TaskContext` maintains live listeners on active tasks, campaigns, and user progress.
- **Data Flow**: UI Action -> Context Method -> Engine Static Method -> Firestore Transaction.
- **Atomic Chain**: The `PointTransactionEngine.execute` method is the system's "Neck". All economy-impacting events (Rewards, Predictions, Withdrawals) must pass through it to ensure ledger consistency and trigger side-effects (Activities/Notifications).
- **External Dependencies**: `useCryptoData` hook fetches market data with a fallback logic (CoinGecko -> CryptoCompare) and implements a circuit breaker to avoid 429 errors.

---

## 3. User Walkthrough Findings

- **Signup Friction**: The redirection chain from Signup -> Verify -> Dashboard can occasionally hang if the "Identity Sync" (Profile creation) takes longer than the Auth state change.
- **Onboarding Overlay**: Effective for new users, but can be skipped too easily, leaving users confused about the "Locked" Referral state.
- **Terminological Inconsistency**: The UI uses "Initialize Node" and "Handshake" while the codebase uses "Signup" and "Sync". This technical jargon might affect non-technical users.
- **Prediction Gating**: Users are barred from predictions until Level 5, but the progress towards this requirement is only visible inside the Prediction page, not on the main Quest hub.
- **Wallet Discoverability**: The "Withdrawal Roadmap" is excellent, but requirements (3 days age, Level 2, 5 tasks) are high for an initial trial "feel".

---

## 4. Admin Walkthrough Findings

- **Liability Discrepancy**: `OpsOverview` uses a "fixed" liability from `global_metrics`, while `OpsEconomy` attempts a live sum (limited to 1000 users). This leads to inconsistent reporting in large datasets.
- **Recursive Purge**: The User Deletion tool in `OpsUsers` is highly effective but lacks a "Soft Delete" state, making accidental administrative errors irreversible.
- **Manual Adjustments**: Admin adjustments for XP do not automatically trigger level-up notifications; they require a secondary "Reconcile Level" action or a user login event.
- **Work Authorization**: The "Assign Work" feature in User Details requires a manual task list load (`window.adminTaskList`), which is an awkward administrative UX flow.

---

## 5. Workflow Trace Findings

- **Referral Attribution**: Referral documents are created at registration (`REGISTERED`) but only rewarded when the referrer becomes "Qualified" (1 task). This "Qualified" check is re-triggered on every task completion, which is robust but intensive.
- **Task Proof Flow**: Images are stored as URLs. If a user submits a broken link, the admin has no way to request a "re-upload" other than rejecting and hoping the user tries again.
- **Withdrawal Settlement**: The 3-state flow (Pending -> Approved -> Paid) is secure, but the "Paid" state requires the admin to manually confirm the transaction happened externally, creating a trust-gap if not automated.

---

## 6. Connectivity Findings

- **Dead Ends**: Some profile settings (Rotate Credentials, Session Manager) are UI-only and do not have backend handlers implemented.
- **Empty States**: Several pages (Notifications, Support, Tasks) show generic empty states that don't guide the user toward the "Next Best Action".
- **Real-time Latency**: While Firestore is real-time, the `useCryptoData` hook has a 60s refresh interval, which can lead to "Price Drift" during high market volatility in the Prediction terminal.

---

## 7. Logic Findings

- **XP Calculation**: Level is always derived from XP (`calculateLevel`), but `PointTransactionEngine` allows `admin_adjustment` to set XPReward directly. If an admin sets a negative XP reward, the user's level could "drop" unexpectedly.
- **Locking Logic**: The 30-second `execution_lock` is a blunt instrument. It prevents double-spending but may block legitimate concurrent actions (e.g., claiming a daily reward while a prediction resolves).
- **Daily Reset**: Uses `now.toISOString().split('T')[0]`. This resets at 00:00 UTC for all users, which might be confusing for users in distant timezones who see "Today's" reward reset in the middle of their day.

---

## 8. UX Findings

- **Visual Hierarchy**: The "Authorized Reward" badges in the Quest Hub are highly effective for trust-building.
- **Mobile Responsiveness**: Stacked layouts in the Wallet ledger are well-implemented.
- **Professional Credibility**: The "System Status" and "Edge Network: Optimal" indicators in the Dashboard and Admin modules successfully mimic high-end fintech platforms (Coinbase/Binance).

---

## 9. Security Findings

- **Role Escalation**: `firestore.rules` strictly prevents users from updating their own `role`, `isRoot`, or `points` fields. This is the primary defense.
- **Counter Insecurity**: Rules allow users to update `completionCount` and `totalDistributed` on `campaigns` documents. While necessary for automated rewards, an attacker could potentially "drain" a campaign's visible pool by sending spam updates (though not the actual rewards).
- **Admin Email Fallback**: `VITE_ADMIN_EMAIL` is used in the frontend code for role determination. While secure against standard users (due to Firestore rule backups), it relies on environment variable integrity.

---

## 10. Hidden Risks

- **CoinGecko Dependency**: The system's heart (Predictions) is tied to a free-tier API. A 429 error or API change would halt market resolutions entirely.
- **Scalability of Sub-collections**: Deleting users involves fetching and deleting thousands of sub-collection docs in batches. As the platform grows, this "Recursive Purge" will become increasingly slow and potentially hit timeout limits.
- **Index Latency**: Heavy reliance on client-side sorting (to avoid "Missing Index" errors) will degrade performance as user history grows beyond 100+ records.

---

**Investigation Status**: COMPLETE
**Recommendation**: Proceed with targeted optimizations on Referral onboarding and Admin reporting consistency.
