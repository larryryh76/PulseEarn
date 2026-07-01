# Production Fix Log

| Date | Fix | Root Cause | Retest Status |
|------|-----|------------|---------------|
| 2025-05-22 | Fixed Security Rules for Fingerprinting | User updates were locked down too tightly; missing 'fingerprint', 'lastSeen', 'lastActionTimestamp' in allowed keys. | PENDING |
| 2025-05-22 | Added /api/health endpoint | No reliable way to verify deployment version. | PENDING |
| 2025-05-22 | Hardened API Startup & Diagnostics | API was crashing on startup due to Firebase initialization failures. Added guards and diagnostic health check. | PENDING |

## Ongoing Investigations

### Resend 500 Internal Server Error
The API returns a 500 error when attempting to send emails. This is typically due to a missing `RESEND_API_KEY` in the production environment.
- **Action:** Added logging and health check to confirm key presence.
- **Inference:** If logging confirms "RESEND_API_KEY not set", manual intervention in Vercel Dashboard is required.

### Firestore Missing Indexes
The admin panel and task history require composite indexes.
- **Action:** Identified exact index URLs from production logs.
- **Inference:** Indexes must be created manually in Firebase Console as they cannot be deployed via code.
