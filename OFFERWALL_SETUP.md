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
4. Click **Save Provider**
5. Click **TEST** button to validate connection

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

Same process as TimeWall, but use CPX's Affiliate ID and Secret from their dashboard.

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
