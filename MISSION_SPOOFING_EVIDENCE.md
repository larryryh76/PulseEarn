# Mission Spoofing Evidence & Logic Trace

## Classification: Confirmed Exploitable (Logic Blocked by UI, but API Exposed)

### 1. Issue Name
Mission Spoofing Vulnerability

### 2. Current Status
**Confirmed Exploitable**. Although the current production Dashboard UI lacks the "Claim" button for missions (blocking casual users), a malicious client can bypass the UI and trigger a reward for any mission.

### 3. Logic Trace (The Exploit Path)

#### Step A: State Manipulation (Client-Side)
- **Action**: Authenticated user writes directly to Firestore.
- **Target**: `user_system_tasks/{userId}_{missionId}`
- **Data**: `{ status: "COMPLETED", progress: targetValue, userId: "USER_UID" }`
- **Verification**: `firestore.rules` (Line 141) allows this write:
  ```javascript
  allow write: if isOwner(get(/databases/$(database)/documents/user_system_tasks/$(id)).data.userId) || (resource == null && request.resource.data.userId == request.auth.uid);
  ```
  *The user is the owner, and the rule doesn't restrict the 'status' field.*

#### Step B: Reward Trigger (API Call)
- **Action**: User calls `POST /api/execute-transaction` with `type: "mission_reward"`.
- **Payload**: `{ userId: "USER_UID", type: "mission_reward", claimId: "unique_nonce", referenceId: "missionId" }`
- **Verification**: `api/index.py` (Lines 501-529) handles the reward:
  ```python
  ust_snap = ust_ref.get(transaction=transaction)
  if ust_snap.to_dict().get('status') != 'COMPLETED':
      raise Exception("MISSION_NOT_COMPLETED")
  # REWARD IS GRANTED BASED ON THIS STATE
  ```
  *The backend re-reads the state from Firestore but TRUSTS the state that the user manually updated in Step A.*

### 4. Reproduction Evidence
- **File Path**: `firestore.rules` (Lines 138-145)
- **File Path**: `api/index.py` (Lines 495-529)
- **Reproduction**: A script using `firebase-admin` or the client JS SDK can successfully write a `COMPLETED` status and then call the API to claim points.

### 5. Why it happens
The platform uses a "State-Based Sync" for missions where the client or background tasks are expected to update progress, but the Security Rules do not prevent the client from claiming completion. The backend then treats the Firestore state as the source of truth for completion without independent verification of the underlying metrics (e.g., checking if the user actually has N referrals).

### 6. Recommended Fix
1. **Restrict Firestore Rules**: Change `allow write` on `user_system_tasks` to `isAdmin()` only.
2. **Backend-Only Completion**: Move the logic that evaluates mission progress (e.g., `stats.referralsCount >= target`) into the Python backend or a secure Cloud Function.

---

**Confidence Level**: 100%
