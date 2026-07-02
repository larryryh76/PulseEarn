# PulseEarn Remediation & Stabilization Plan

## Batch 1: Backend Stabilization (Infrastructure & Reliability)
**Objective**: Fix the production 500 errors and ensure all responses are valid JSON.

1.  **Backend Initialization**: Correct the Firebase Admin initialization in `api/index.py` to robustly handle the project ID mismatch.
2.  **Environment Variable Alignment**: Ensure `VITE_FIREBASE_PROJECT_ID` is used correctly across both environments.
3.  **JSON Error Handling**: Standardize the global exception handler in Flask to return structured JSON instead of HTML on all failures.
4.  **Health Check Update**: Fix the `/api/health` endpoint to report the correct project ID and connection status.

## Batch 2: Security & Economic Hardening (Integrity)
**Objective**: Close the Mission Spoofing vulnerability and protect user balances.

1.  **Harden Firestore Rules**: Restrict write access to `user_system_tasks` and `system_claims` to Admin/Server only.
2.  **Backend Mission Validation**: Update the `mission_reward` endpoint in `api/index.py` to independently verify mission criteria (e.g., checking `stats` fields) before granting rewards.
3.  **Liability Tracking Cleanup**: Verify and fix any potential double-counting or misses in `totalPTSLiability`.

## Batch 3: Frontend Synchronization (UX & Performance)
**Objective**: Resolve stale data and memory leaks in the Dashboard.

1.  **Refactor TaskContext**: Eliminate nested `onSnapshot` listeners. Use a unified synchronization strategy with proper cleanup.
2.  **Stale Mission Logic**: Update the Dashboard rail to filter out inactive missions and correctly handle the transition from `COMPLETED` to `CLAIMED`.
3.  **Auth Context Repair**: Stabilize the identity sync and welcome bonus repair paths.

## Batch 4: UI/UX & Quality Assurance (Final Polish)
**Objective**: Eliminate console noise and improve user feedback.

1.  **Error Parsing Guard**: Update frontend `fetch` calls to check for `res.ok` and handle non-JSON responses gracefully.
2.  **Console Cleanup**: Remove diagnostic logs from production builds.
3.  **Final Verification**: Perform an end-to-end audit on the live production site to ensure all batches are correctly deployed and functional.

---

**Approval Required Before Batch 1 Execution.**
