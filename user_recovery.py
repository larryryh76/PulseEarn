import firebase_admin
from firebase_admin import credentials, auth, firestore
from datetime import datetime, timezone

if not firebase_admin._apps:
    firebase_admin.initialize_app()

db = firestore.client()

def recover():
    print("Starting User Recovery Scan...")

    # 1. Fetch all Auth users
    auth_users = []
    page = auth.list_users()
    while page:
        for user in page.users:
            auth_users.append(user)
        page = page.get_next_page()

    print(f"Auth users found: {len(auth_users)}")

    missing_count = 0
    for user in auth_users:
        user_ref = db.collection('users').document(user.uid)
        user_snap = user_ref.get()

        if not user_snap.exists:
            print(f"MISSING PROFILE: {user.uid} ({user.email})")

            # Create minimal recovery profile
            new_user_data = {
                'uid': user.uid,
                'email': user.email,
                'username': user.display_name or f"User_{user.uid[:5]}",
                'points': 0,
                'referralCode': f"PULSE-{user.uid[:6].upper()}",
                'referredBy': None,
                'streak': 0,
                'totalEarnedToday': 0,
                'xp': 0,
                'level': 1,
                'role': 'user',
                'status': 'active',
                'isBanned': False,
                'isFlagged': False,
                'createdAt': firestore.SERVER_TIMESTAMP,
                'onboardingCompleted': False,
                'stats': {
                    'tasksCompleted': 0,
                    'referralsCount': 0,
                    'predictionsCount': 0,
                    'totalEarnings': 0,
                    'weeklyEarnings': 0
                }
            }
            user_ref.set(new_user_data)
            missing_count += 1
            print(f"RECOVERED: {user.uid}")

    print(f"Recovery scan complete. Total profiles created: {missing_count}")

if __name__ == '__main__':
    recover()
