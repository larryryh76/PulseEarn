import firebase_admin
from firebase_admin import credentials, firestore

if not firebase_admin._apps:
    firebase_admin.initialize_app()

db = firestore.client()

def migrate():
    doc_ref = db.collection('system_config').document('global_v1')
    snap = doc_ref.get()
    if not snap.exists:
        print("Config doc not found")
        return

    data = snap.to_dict()
    rewards = data.get('rewards', {})
    thresholds = data.get('thresholds', {})

    # Renames
    if 'dailyLoginPTS' in rewards:
        rewards['dailyLoginPoints'] = rewards.pop('dailyLoginPTS')
    if 'referralBonusPTS' in rewards:
        rewards['referralBonusPoints'] = rewards.pop('referralBonusPTS')
    if 'minWithdrawalPTS' in thresholds:
        thresholds['minWithdrawalPoints'] = thresholds.pop('minWithdrawalPTS')

    # Add missing
    if 'welcomeBonusPoints' not in rewards: rewards['welcomeBonusPoints'] = 30
    if 'welcomeBonusXP' not in rewards: rewards['welcomeBonusXP'] = 50
    if 'minPredictionStake' not in rewards: rewards['minPredictionStake'] = 10
    if 'maxPredictionStake' not in rewards: rewards['maxPredictionStake'] = 10000
    if 'xpPerLevel' not in thresholds: thresholds['xpPerLevel'] = 1000

    # Security
    security = data.get('security', {})
    if 'maxSingleReward' not in security: security['maxSingleReward'] = 5000
    if 'dailyRewardCap' not in security: security['dailyRewardCap'] = 5000

    doc_ref.update({
        'rewards': rewards,
        'thresholds': thresholds,
        'security': security
    })
    print("Migration complete")

if __name__ == '__main__':
    migrate()
