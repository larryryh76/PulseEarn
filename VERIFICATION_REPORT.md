# PulseEarn Verification & Fix Plan Report

**Date**: June 22, 2026
**Status**: Comprehensive Audit Complete

---

## 1. Confirmed Findings

### F21: CoinGecko Dependency
- **Status**: Confirmed
- **Evidence**: `src/hooks/useCryptoData.ts`, `src/engines/predictions/MarketResolutionEngine.ts`, and `src/pages/predictions/components/PredictionChart.tsx` rely exclusively on CoinGecko.
- **Reproduction**: Trigger multiple refreshes or wait for 429 rate limit. Market resolutions and charts will fail or display fallback data.
- **Risk**: High (Core feature functionality)
- **Fix Required**: Yes

### F07: Irreversible Recursive Purge
- **Status**: Confirmed
- **Evidence**: `src/pages/admin/modules/OpsUsers.tsx:handleDeleteUser` performs `deleteDoc` on primary and sub-collections immediately after confirmation.
- **Reproduction**: Delete a user in Ops Hub; all ledger, history, and identity data is permanently removed from Firestore.
- **Risk**: High (Data Loss)
- **Fix Required**: Yes (Implement 'Soft Delete' or 'Archive' state)

### F24: Landing Page Connectivity Gaps
- **Status**: Confirmed
- **Evidence**: `MainLayout.tsx` footer links for Privacy and Terms exist but were not detectable by automated audit in some states. `SignupCTA.tsx` and `Hero.tsx` use different wording for signup ("Get Started" vs "Create Account").
- **Risk**: High (Trust & Professionalism)
- **Fix Required**: Yes

### F06: Liability Reporting Discrepancy
- **Status**: Confirmed
- **Evidence**: `OpsOverview.tsx` fetches from `global_metrics` doc. `OpsEconomy.tsx` attempts a live sum limited to 1000 users.
- **Risk**: Medium (Reporting Accuracy)
- **Fix Required**: Yes

### F13: Profile Settings Dead Ends
- **Status**: Confirmed
- **Evidence**: `src/pages/Profile.tsx` contains buttons for "Rotate Credentials" and "Session Manager" that only log to console or have no handlers.
- **Risk**: Medium (Professionalism)
- **Fix Required**: Yes

---

## 2. False Positives

### F16: Negative XP Adjustment Impact
- **Status**: False Positive / Low Risk
- **Reason**: The `PointTransactionEngine` uses `Math.max(0, currentXp + xpDelta)` and levels are recalculated. While a level *could* drop, this is the intended behavior for administrative corrections of erroneously granted XP.

---

## 3. Findings Already Fixed

### F15: Prediction Price Drift / Settlement Inconsistency
- **Status**: Already Fixed
- **Evidence**: `PointTransactionEngine.executePrediction` now calculates and stores an immutable `rewardAmount` at the time of entry. `resolvePrediction` uses this stored amount rather than recalculating based on dynamic multipliers.

---

## 4. New Findings

### N01: Google Auth Authorized Domains
- **Status**: Confirmed
- **Finding**: `src/firebase/config.ts` uses `auth.pulseearn.online` as the `authDomain`. This is correctly configured for branding but requires the custom domain SSL and Firebase DNS records to be perfectly synchronized.

### N02: 'Handshake' Terminology
- **Status**: Confirmed
- **Finding**: The term "Handshake" is used in the Dashboard UI (`userData ? 'Verified' : 'Handshake...'`), which may be too technical for the target demographic.

---

## 5. Critical Risks

1. **API Reliability**: Reliance on CoinGecko free tier for financial settlements (Predictions).
2. **Administrative Safety**: Lack of a "Trash/Bin" state for deleted users.
3. **Data Integrity**: Scalability limit (1000 users) in `OpsEconomy` live liability sum.
4. **Security**: Users can update global campaign counters (`completionCount`) via Firestore rules.

---

## 6. Recommended Fix Order

1. **Immediate (Trust)**: Restore missing footer links and fix landing page CTA consistency.
2. **Security (Integrity)**: Patch Firestore rules for campaign counters to prevent spoofing.
3. **Stability (Core)**: Implement robust fallback/circuit-breaker logic for CoinGecko in all 3 entry points.
4. **Safety (Admin)**: Convert User Deletion to a "Suspended/Archived" flow.
5. **UI/UX (Clarity)**: Update technical terminology ("Handshake" -> "Sync") and fix profile dead ends.
6. **Scalability**: Move liability reporting to a scheduled Cloud Function for global aggregation.
