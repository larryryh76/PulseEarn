import firebase_admin
from firebase_admin import credentials, firestore, auth
import datetime

# This script identifies users who earned points while their email was not verified.
# Usage: python3 backfill_unverified_earnings.py

def backfill():
    if not firebase_admin._apps:
        # Assumes environment already has credentials (e.g. GOOGLE_APPLICATION_CREDENTIALS)
        # or is running in a GCP environment.
        firebase_admin.initialize_app()

    db = firestore.client()
    users_ref = db.collection('users')

    print("Starting audit for unverified earnings...")

    # 1. Fetch all users
    users = users_ref.stream()
    unverified_earners = []

    for user_doc in users:
        uid = user_doc.id
        user_data = user_doc.to_dict()

        try:
            firebase_user = auth.get_user(uid)
            if not firebase_user.email_verified:
                # If they have points > 0 and are not verified
                points = user_data.get('points', 0)
                if points > 0:
                    unverified_earners.append({
                        'uid': uid,
                        'email': firebase_user.email,
                        'points': points,
                        'reason': 'Points earned while unverified'
                    })
            else:
                # Even if currently verified, we check transaction history
                # for any transactions that happened before they were verified
                # This is harder without a 'verifiedAt' field, but we can look for
                # transactions before a certain threshold or flag for manual review.
                pass

        except Exception as e:
            print(f"Error checking user {uid}: {e}")

    if unverified_earners:
        print(f"Found {len(unverified_earners)} users with unverified earnings:")
        for earner in unverified_earners:
            print(f"UID: {earner['uid']}, Email: {earner['email']}, Points: {earner['points']}")

            # Optional: Tag the user document for manual review in admin dashboard
            users_ref.document(earner['uid']).update({
                'needsAudit': True,
                'auditReason': 'UNVERIFIED_EARNINGS_DETECTED'
            })
    else:
        print("No users with unverified earnings found.")

if __name__ == "__main__":
    backfill()
