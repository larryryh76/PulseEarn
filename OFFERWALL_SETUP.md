# Offerwall Setup Guide

## Why Providers Show "DISCONNECTED"

Providers display "DISCONNECTED" status when credentials are incomplete. The test endpoint checks for:
- ✓ Affiliate ID / App ID
- ✓ Callback Secret
- ✓ Callback URL (auto-generated)

**If any are missing, status stays DISCONNECTED.**

## Setting Up TimeWall

### 1. Register with TimeWall
Visit TimeWall's placement dashboard and create a placement with:
- **Public Placement Name:** PulseEarn Rewards
- **Website URL:** https://pulseearn.online
- **Currency:** PTS (300 per $1 USD)
- **Callback URL:** https://pulseearn.online/api/offerwall/callback/timewall
- **Security:** Configure IP whitelisting and SHA256 hash verification

### 2. Configure in PulseEarn Admin
1. Open **Admin Panel → Offerwall Operations Center**
2. Click the **TimeWall** provider card to edit
3. Fill **Credentials** section:
   - **Affiliate ID:** `853f8fefa60863bd` (your Placement ID from TimeWall dashboard)
   - **Secret:** [Copy from TimeWall "Your Secret Key"]
   - **Callback URL:** Auto-fills to `https://pulseearn.online/api/offerwall/callback/timewall`
4. Set **Economics** (defaults are already correct):
   - **User Share:** `30%` and **Platform Share:** `70%`
   - **Reward Multiplier:** `1.0`
   - **How the reward is computed (IMPORTANT):** PulseEarn ignores the provider's own
     currency-conversion rate and instead computes the reward from the provider's
     **gross USD** field (`revenue` for TimeWall, `amount_usd` for CPX):

     ```
     gross_points = USD_revenue × 1000 (internal $1 = 1000 PTS) × multiplier
     user_points  = gross_points × 30%
     platform     = gross_points × 70%
     ```

     Example — a $1.00 TimeWall offer → 1000 gross PTS → **user gets 300 PTS ($0.30)**,
     platform keeps 700 PTS. This is immune to whatever "Currency Conversion Rate" you
     set on the TimeWall/CPX dashboard, so you cannot accidentally double-discount users.
5. Click **Save Provider** — the connection is **auto-tested on save**, so a correctly
   configured provider flips to **Connected** immediately (no need to click TEST manually).

### Signature Spec (auto-applied for `timewall`)
The backend now matches TimeWall's official postback hash exactly:
```
hash = sha256( userID + revenue + SecretKey )    // concatenated, no separator
```
- Method: **sha256**  |  Fields: **[userID, revenue, secret]**  |  Separator: none
- Lifecycle `type` handling: `credit` → pay, `chargeback` → deduct,
  `hold`/`hold_cancelled` → acknowledged with HTTP 200 but **no credit/deduction**.
- Chargebacks arrive with negative `revenue` and are deducted from the user at the same 30%.

### 3. Expected Outcomes

**After TEST passes:**
- Status changes to "Connected" or shows operation state (e.g., "Callback Failure" if webhooks aren't working)
- Detailed diagnostic checks show which components passed/failed
- Provider is ready to earn revenue

**If TEST fails:**
- Review error codes:
  - `INVALID_CREDENTIALS` → Missing Affiliate ID or Secret
  - `AUTH_FAILED` → Wrong credentials
  - `TIMEOUT` → Provider endpoint unreachable
  - `RATE_LIMITED` → Hitting rate limits

### 4. Verify Postback Handling

After TEST passes, TimeWall will attempt to send test postbacks to:
```
https://pulseearn.online/api/offerwall/callback/timewall?userID=...&transactionID=...&hash=...
```

Check **Offerwall Callbacks** section in admin to see callback history and any validation errors.

## Setting Up CPX Research

Same process as TimeWall — enter CPX's App ID and Secret from their dashboard. CPX uses
the same USD-based economics: the reward is computed from CPX's `amount_usd` field, so the
30% user / 70% platform split is applied by PulseEarn regardless of the conversion rate you
configure on the CPX dashboard. CPX signature: `md5(trans_id + secret)`; a `status=2`
postback is treated as a chargeback and deducted from the user.

## Troubleshooting

| Status | Cause | Fix |
|--------|-------|-----|
| DISCONNECTED | Missing credentials | Fill Affiliate ID & Secret |
| AUTH_FAILED | Wrong credentials | Double-check ID/Secret |
| CALLBACK_FAILURE | Postback not working | Check callback URL and IP whitelisting |
| TIMEOUT | Provider unreachable | Verify provider status on their dashboard |
| Pending Validation | First callback received, awaiting confirmation | Run TEST again after live postback |

## Revenue Flow

1. User completes offer on TimeWall
2. TimeWall sends postback to your callback URL with `{hash}` verification
3. Your system validates hash, credits user points, stores in ledger
4. Postback logged as "APPROVED" or rejected based on fraud checks
5. Revenue attributed to provider and user
