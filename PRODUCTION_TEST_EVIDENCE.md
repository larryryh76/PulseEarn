# Production Test Evidence

## Admin Login & Overview
- **Action:** Login as admin@pulse.com
- **Result:** PASS (Login success)
- **Screenshot:** `investigation/admin_01_overview.png`
- **Notes:** Liability warning visible.

## User Registration
- **Action:** Signup new user
- **Result:** PASS (Redirected to dashboard)
- **Console Log:**
```
[AuthContext] Repairing Welcome Bonus...
Failed to load resource: the server responded with a status of 500 ()
[PointEngine] System Failure: Unexpected token 'A', "A server e"... is not valid JSON (Claim: welcome_I7ahQuAqBofwRMnWrTuL2MkOIo33)
```

## Email Verification (Resend)
- **Action:** Click "Resend" on verify-email page
- **Result:** FAIL (500 Error)
- **Console Log:**
```
[VerifyEmail] Resend failed: SyntaxError: Unexpected token 'A', "A server e"... is not valid JSON
```

## Admin Validation Module
- **Action:** Navigate to Approvals
- **Result:** FAIL (Missing Indexes)
- **Console Log:**
```
[OpsValidation] Fetch Failure: FirebaseError: The query requires an index. You can create it here: https://console.firebase.google.com/v1/r/project/pulseearn-a4b16/firestore/indexes?create_composite=ClNwcm9qZWN0cy9wdWxzZWVhcm4tYTRiMTYvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3Rhc2tfY2xhaW1zL2luZGV4ZXMvXxABGhMKD3ZhbGlkYXRpb25TdGF0ZRABGg0KCWNyZWF0ZWRBdBACGgwKCF9fbmFtZV9fEAI
```

## Security / Fraud Engine
- **Action:** Background fingerprinting on signup
- **Result:** FAIL (Permission Denied)
- **Console Log:**
```
[UserEngine] Fingerprint recording failed: FirebaseError: Missing or insufficient permissions.
```
