# Mission Security Analysis: Client-Side Usage Audit

## Objective
Determine if any legitimate client operations write to the `user_system_tasks` collection before hardening Firestore rules.

## Findings
A comprehensive grep of the codebase (`src/`) was performed for:
- `user_system_tasks`
- `setDoc`, `addDoc`, `updateDoc`
- `collection(db, 'user_system_tasks')`

### 1. Read Operations
- **File**: `src/contexts/TaskContext.tsx` (Line 126)
  - **Action**: `onSnapshot` listener to display mission progress to the user.
  - **Status**: Legitimate.

### 2. Write Operations
- **Direct Writes**: **ZERO** (0).
- No file in the `src/` directory attempts to write, update, or delete documents in the `user_system_tasks` collection via the Firestore Client SDK.

### 3. Authoritative Writes
- **File**: `api/index.py` (Lines 524-528)
  - **Action**: Updates `rewarded: True`, `rewardTransactionId`, and `claimedAt` after a successful `mission_reward` transaction.
  - **Status**: Authoritative.

## Conclusion
The client currently **never** writes to `user_system_tasks`. The mission progress evaluation and document creation appear to be missing from both the frontend and the backend API (aside from the reward update).

**Critical Gap**: There is no code in the repository that actually increments mission progress (e.g., "Complete 5 tasks"). The missions are currently static or managed by external/manual processes not visible in the source.

## Hardening Recommendation
Since the client has no legitimate reason to write to this collection, Batch 2 can safely restrict `write` access to `isAdmin()` or strictly server-side (using Admin SDK). This will effectively close the Mission Spoofing vulnerability without breaking existing functionality.
