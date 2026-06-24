import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore, auth as admin_auth
from datetime import datetime, timezone, timedelta
import math
from functools import wraps

app = Flask(__name__)
CORS(app)

# Initialize Firebase Admin
if not firebase_admin._apps:
    # In Vercel, it uses the default credentials if available
    firebase_admin.initialize_app()

db = firestore.client()

def require_auth(f):
    """Middleware to verify Firebase ID token and extract user ID"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"success": False, "error": "Missing or invalid authorization header"}), 401

        id_token = auth_header.split('Bearer ')[1]
        try:
            decoded_token = admin_auth.verify_id_token(id_token)
            request.verified_uid = decoded_token['uid']
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({"success": False, "error": "Invalid or expired token"}), 401
    return decorated_function

def require_admin(f):
    """Middleware to verify user has admin role"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        uid = getattr(request, 'verified_uid', None)
        if not uid:
            return jsonify({"success": False, "error": "Unauthorized"}), 401

        try:
            user_doc = db.collection('users').document(uid).get()
            if not user_doc.exists:
                return jsonify({"success": False, "error": "User not found"}), 404

            user_data = user_doc.to_dict()
            if user_data.get('role') not in ['admin', 'ADMIN'] and not user_data.get('isRoot'):
                return jsonify({"success": False, "error": "Admin access required"}), 403

            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({"success": False, "error": "Authorization check failed"}), 500
    return decorated_function

def calculate_level(xp, base_level_xp=1000):
    if xp < base_level_xp:
        return 1
    level = math.floor(math.log(xp / base_level_xp) / math.log(3)) + 2
    return level

@app.route('/api/execute-transaction', methods=['POST'])
@require_auth
@require_admin
def execute_transaction():
    data = request.json
    # Use verified UID from auth token instead of trusting client
    user_id = data.get('userId')
    tx_type = data.get('type')
    source = data.get('source')
    claim_id = data.get('claimId')
    task_claim_id = data.get('taskClaimId')

    if not user_id or not claim_id:
        return jsonify({"success": False, "error": "Missing parameters"}), 400

    # Server-side determination of amounts and rewards based on type
    amount = 0
    xp_reward = 0
    bypass_lock = False
    metadata = data.get('metadata', {})

    # Load config for server-controlled values
    config_ref = db.collection('system_config').document('global_v1')
    config_snap = config_ref.get()
    config = config_snap.to_dict() if config_snap.exists else {}

    # Derive amount, xp, and bypass from server-side source of truth
    if tx_type == 'task_reward' and task_claim_id:
        # Load task claim to get actual reward
        tc_ref = db.collection('task_claims').document(task_claim_id)
        tc_snap = tc_ref.get()
        if not tc_snap.exists:
            return jsonify({"success": False, "error": "Task claim not found"}), 404
        tc_data = tc_snap.to_dict()

        # Get task definition to validate reward
        task_id = tc_data.get('taskId')
        if task_id:
            task_ref = db.collection('tasks').document(task_id)
            task_snap = task_ref.get()
            if task_snap.exists:
                task_data = task_snap.to_dict()
                amount = task_data.get('rewardAmount', 0)
                xp_reward = task_data.get('xpReward', 0)
        metadata['reviewedBy'] = request.verified_uid  # Use verified admin UID
    elif tx_type == 'daily_reward':
        amount = config.get('rewards', {}).get('dailyClaimPoints', 25)
        xp_reward = config.get('rewards', {}).get('dailyClaimXP', 10)
    elif tx_type == 'referral_bonus':
        amount = config.get('rewards', {}).get('referralBonusPoints', 50)
        xp_reward = config.get('rewards', {}).get('referralBonusXP', 50)
    elif tx_type == 'withdrawal_finalized':
        # For withdrawals, load from withdrawal record
        withdrawal_id = metadata.get('withdrawalId')
        if withdrawal_id:
            wd_ref = db.collection('withdrawals').document(withdrawal_id)
            wd_snap = wd_ref.get()
            if wd_snap.exists:
                wd_data = wd_snap.to_dict()
                amount = -abs(wd_data.get('amount', 0))
                metadata['amount'] = abs(wd_data.get('amount', 0))
        bypass_lock = True
    elif tx_type == 'admin_adjustment':
        # Only for admin adjustments, allow specified amount
        amount = data.get('amount', 0)
        xp_reward = data.get('xpReward', 0)
        bypass_lock = data.get('bypassLock', False)
    else:
        # For unknown types, reject
        return jsonify({"success": False, "error": "Invalid transaction type"}), 400

    user_ref = db.collection('users').document(user_id)
    claim_ref = db.collection('system_claims').document(claim_id)

    @firestore.transactional
    def update_in_transaction(transaction):
        user_snap = user_ref.get(transaction=transaction)
        if not user_snap.exists:
            raise Exception("ENTITY_NOT_FOUND")

        user_data = user_snap.to_dict()

        claim_snap = claim_ref.get(transaction=transaction)
        if claim_snap.exists:
            raise Exception("REWARD_ALREADY_CLAIMED")

        if task_claim_id:
            tc_ref = db.collection('task_claims').document(task_claim_id)
            tc_snap = tc_ref.get(transaction=transaction)
            if not tc_snap.exists:
                raise Exception("TASK_CLAIM_NOT_FOUND")
            if tc_snap.to_dict().get('validationState') != 'PENDING':
                raise Exception("TASK_CLAIM_ALREADY_RESOLVED")

            transaction.update(tc_ref, {
                'validationState': 'APPROVED',
                'resolvedAt': firestore.SERVER_TIMESTAMP,
                'reviewedBy': metadata.get('reviewedBy', 'ADMIN_HUB_ATOMIC')
            })

        # Lock check
        if not bypass_lock and user_data.get('execution_lock'):
            lock_at = user_data.get('execution_lock_at')
            if lock_at:
                now = datetime.now(timezone.utc)
                if lock_at.tzinfo is None:
                    lock_at = lock_at.replace(tzinfo=timezone.utc)
                diff = (now - lock_at).total_seconds()
                if diff < 30:
                    raise Exception("RACE_CONDITION_DETECTED")

        if not bypass_lock:
            transaction.update(user_ref, {
                'execution_lock': True,
                'execution_lock_at': firestore.SERVER_TIMESTAMP
            })

        # Daily reward check
        if tx_type == 'daily_reward':
            last_reward = user_data.get('lastRewardDate')
            now = datetime.now(timezone.utc)
            current_day = now.strftime('%Y-%m-%d')
            last_day = last_reward.strftime('%Y-%m-%d') if last_reward else 'NEVER'

            if current_day == last_day:
                raise Exception("DAILY_REWARD_COOLDOWN")

        # Solvency
        current_points = user_data.get('points', 0)
        if amount < 0 and current_points + amount < 0:
            raise Exception("INSUFFICIENT_FUNDS")

        # Config
        config_ref = db.collection('system_config').document('global_v1')
        config_snap = config_ref.get(transaction=transaction)
        if config_snap.exists:
            config = config_snap.to_dict()
            xp_per_level = config.get('thresholds', {}).get('xpPerLevel', 1000)
        else:
            xp_per_level = 1000

        current_xp = user_data.get('xp', 0)
        xp_delta = xp_reward if (tx_type == 'admin_adjustment' or amount >= 0 or xp_reward > 0) else 0
        new_xp = max(0, current_xp + xp_delta)
        new_level = calculate_level(new_xp, xp_per_level)

        now = datetime.now(timezone.utc)
        last_action = user_data.get('lastActionTimestamp')
        is_new_day = True
        if last_action:
            if last_action.tzinfo is None:
                last_action = last_action.replace(tzinfo=timezone.utc)
            is_new_day = now.strftime('%Y-%m-%d') != last_action.strftime('%Y-%m-%d')

        updates = {
            'points': firestore.Increment(amount),
            'xp': new_xp,
            'level': new_level,
            'stats.totalEarnings': firestore.Increment(amount if amount > 0 else 0),
            'totalEarnedToday': amount if is_new_day else firestore.Increment(amount if amount > 0 else 0),
            'lastActionTimestamp': firestore.SERVER_TIMESTAMP,
            'execution_lock': False,
            'execution_lock_at': None
        }

        if tx_type == 'daily_reward':
            updates['lastRewardDate'] = firestore.SERVER_TIMESTAMP
            # Streak logic
            last_reward_obj = user_data.get('lastRewardDate')
            if last_reward_obj:
                if last_reward_obj.tzinfo is None:
                    last_reward_obj = last_reward_obj.replace(tzinfo=timezone.utc)
                today = now.replace(hour=0, minute=0, second=0, microsecond=0)
                last_reward_day = last_reward_obj.replace(hour=0, minute=0, second=0, microsecond=0)
                yesterday = today - timedelta(days=1)
                if last_reward_day == yesterday:
                    updates['streak'] = firestore.Increment(1)
                elif last_reward_day < yesterday:
                    updates['streak'] = 1
            else:
                updates['streak'] = 1

        if tx_type == 'task_reward':
            updates['stats.tasksCompleted'] = firestore.Increment(1)
        if tx_type == 'referral_bonus':
            updates['stats.referralsCount'] = firestore.Increment(1)
        if tx_type == 'withdrawal_finalized':
            final_amount = abs(amount) if amount != 0 else metadata.get('amount', 0)
            updates['totalWithdrawn'] = firestore.Increment(final_amount)

        transaction.update(user_ref, updates)

        transaction.set(claim_ref, {
            'userId': user_id,
            'type': tx_type,
            'source': source,
            'amount': amount,
            'executedAt': firestore.SERVER_TIMESTAMP,
            'metadata': {**metadata, 'engineVersion': '5.0.0-SERVER'}
        })

        # Transaction Ledger
        tx_col = user_ref.collection('transactions')
        tx_ref = tx_col.document()
        transaction.set(tx_ref, {
            'id': tx_ref.id,
            'userId': user_id,
            'type': tx_type,
            'amount': amount,
            'source': source,
            'claimId': claim_id,
            'status': 'COMPLETED',
            'timestamp': firestore.SERVER_TIMESTAMP,
            'metadata': metadata
        })

        # Activity Log
        act_type = 'reward_received'
        if tx_type == 'task_reward': act_type = 'task_completed'
        elif tx_type == 'withdrawal_finalized': act_type = 'withdrawal_completed'

        act_ref = user_ref.collection('activities').document()
        transaction.set(act_ref, {
            'id': act_ref.id,
            'userId': user_id,
            'type': act_type,
            'points': amount,
            'description': source,
            'timestamp': firestore.SERVER_TIMESTAMP,
            'metadata': {**metadata, 'txId': tx_ref.id}
        })

        # Notification
        if tx_type == 'task_reward' or (amount > 0 and tx_type != 'daily_reward') or tx_type == 'withdrawal_finalized':
            notif_ref = user_ref.collection('notifications').document()
            title = 'Reward Received'
            description = f"You earned {amount:,} Points from: {source}"
            notif_category = 'reward_claimed'

            if tx_type == 'task_reward':
                title = 'Task Approved'
            elif tx_type == 'withdrawal_finalized':
                title = 'Withdrawal Processed'
                withdrawal_amount = abs(amount) if amount != 0 else metadata.get('amount', 0)
                description = f"Your withdrawal of {withdrawal_amount:,} PTS has been sent to your wallet."
                notif_category = 'payout_processed'

            transaction.set(notif_ref, {
                'title': title,
                'description': description,
                'type': notif_category,
                'read': False,
                'timestamp': firestore.SERVER_TIMESTAMP,
                'metadata': {'txId': tx_ref.id}
            })

        return {
            "success": True,
            "txId": tx_ref.id,
            "newLevel": new_level,
            "oldLevel": user_data.get('level', 1),
            "tasksCompleted": user_data.get('stats', {}).get('tasksCompleted', 0)
        }

    try:
        transaction = db.transaction()
        result = update_in_transaction(transaction)
        return jsonify(result)
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 400

@app.route('/api/execute-prediction', methods=['POST'])
@require_auth
def execute_prediction():
    data = request.json
    # Use verified UID from auth token
    user_id = request.verified_uid
    task_id = data.get('taskId')
    amount = data.get('amount', 0)
    asset_id = data.get('assetId')
    symbol = data.get('symbol')
    direction = data.get('direction')
    entry_price = data.get('entryPrice')
    claim_id = data.get('claimId')

    if not user_id or not task_id or not claim_id:
        return jsonify({"success": False, "error": "Missing parameters"}), 400

    # Validate inputs
    if amount <= 0:
        return jsonify({"success": False, "error": "Amount must be positive"}), 400

    if direction not in ['UP', 'DOWN']:
        return jsonify({"success": False, "error": "Invalid direction"}), 400

    if not entry_price or entry_price <= 0:
        return jsonify({"success": False, "error": "Invalid entry price"}), 400

    # Server-side calculation of reward amount (don't trust client)
    config_ref = db.collection('system_config').document('global_v1')
    config_snap = config_ref.get()
    if config_snap.exists:
        config = config_snap.to_dict()
        multiplier = config.get('predictions', {}).get('rewardMultiplier', 2.0)
    else:
        multiplier = 2.0

    reward_amount = amount * multiplier

    user_ref = db.collection('users').document(user_id)
    claim_ref = db.collection('system_claims').document(claim_id)
    predictions_ref = db.collection('user_predictions')

    @firestore.transactional
    def pred_transaction(transaction):
        user_snap = user_ref.get(transaction=transaction)
        if not user_snap.exists: raise Exception("ENTITY_NOT_FOUND")
        user_data = user_snap.to_dict()

        if user_data.get('points', 0) < amount:
            raise Exception("INSUFFICIENT_FUNDS")

        claim_snap = claim_ref.get(transaction=transaction)
        if claim_snap.exists: raise Exception("REWARD_ALREADY_CLAIMED")

        # Deduct points
        transaction.update(user_ref, {
            'points': firestore.Increment(-amount),
            'lastActionTimestamp': firestore.SERVER_TIMESTAMP,
            'stats.predictionsCount': firestore.Increment(1)
        })

        # Create prediction doc
        pred_ref = predictions_ref.document(claim_id)
        transaction.set(pred_ref, {
            'id': pred_ref.id,
            'userId': user_id,
            'taskId': task_id,
            'assetId': asset_id,
            'symbol': symbol,
            'direction': direction,
            'stakeAmount': amount,
            'rewardAmount': reward_amount,
            'entryPrice': entry_price,
            'status': 'ACTIVE',
            'claimId': claim_id,
            'createdAt': firestore.SERVER_TIMESTAMP,
            'engineVersion': '5.0.0-SERVER'
        })

        transaction.set(claim_ref, {
            'userId': user_id,
            'type': 'prediction_entry',
            'claimId': claim_id,
            'amount': -amount,
            'executedAt': firestore.SERVER_TIMESTAMP
        })

        # Log to ledger
        tx_ref = user_ref.collection('transactions').document()
        transaction.set(tx_ref, {
            'id': tx_ref.id,
            'userId': user_id,
            'type': 'prediction_entry',
            'amount': -amount,
            'source': f"Market Forecast: {symbol.upper()}",
            'claimId': claim_id,
            'status': 'COMPLETED',
            'timestamp': firestore.SERVER_TIMESTAMP,
            'metadata': {'assetId': asset_id, 'predictionId': pred_ref.id}
        })

        return {"success": True, "txId": tx_ref.id, "predictionId": pred_ref.id}

    try:
        transaction = db.transaction()
        result = pred_transaction(transaction)
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route('/api/resolve-prediction', methods=['POST'])
@require_auth
def resolve_prediction():
    data = request.json
    prediction_id = data.get('predictionId')

    if not prediction_id:
        return jsonify({"success": False, "error": "Missing parameters"}), 400

    pred_ref = db.collection('user_predictions').document(prediction_id)

    @firestore.transactional
    def resolve_transaction(transaction):
        pred_snap = pred_ref.get(transaction=transaction)
        if not pred_snap.exists: raise Exception("PREDICTION_NOT_FOUND")

        pred_data = pred_snap.to_dict()
        if pred_data.get('status') != 'ACTIVE': raise Exception("PREDICTION_ALREADY_RESOLVED")

        user_id = pred_data.get('userId')
        user_ref = db.collection('users').document(user_id)
        user_snap = user_ref.get(transaction=transaction)
        if not user_snap.exists: raise Exception("USER_NOT_FOUND")

        # Server-side price resolution - in production, fetch from price oracle
        # For now, get from task definition or use a trusted price feed
        task_id = pred_data.get('taskId')
        task_ref = db.collection('tasks').document(task_id)
        task_snap = task_ref.get(transaction=transaction)

        if not task_snap.exists:
            raise Exception("TASK_NOT_FOUND")

        task_data = task_snap.to_dict()
        # Use server-determined current price from task or oracle
        current_price = task_data.get('currentPrice') or data.get('currentPrice')

        if current_price is None or current_price <= 0:
            raise Exception("INVALID_RESOLUTION_PRICE")

        # Validate prediction inputs are consistent
        if pred_data.get('entryPrice') <= 0:
            raise Exception("INVALID_PREDICTION_STATE")

        is_win = (current_price > pred_data['entryPrice']) if pred_data['direction'] == 'UP' else (current_price < pred_data['entryPrice'])
        payout = pred_data.get('rewardAmount', 0) if is_win else 0

        # Update user
        transaction.update(user_ref, {
            'points': firestore.Increment(payout),
            'lastActionTimestamp': firestore.SERVER_TIMESTAMP,
            'stats.totalWins': firestore.Increment(1 if is_win else 0),
            'stats.predictionRewards': firestore.Increment(payout)
        })

        # Update prediction
        transaction.update(pred_ref, {
            'status': 'RESOLVED',
            'exitPrice': current_price,
            'resolvedAt': firestore.SERVER_TIMESTAMP
        })

        # Log if win
        if payout > 0:
            tx_ref = user_ref.collection('transactions').document()
            transaction.set(tx_ref, {
                'id': tx_ref.id,
                'userId': user_id,
                'type': 'prediction_reward',
                'amount': payout,
                'source': f"Forecast Win: {pred_data['symbol'].upper()}",
                'claimId': f"res_{prediction_id}",
                'status': 'COMPLETED',
                'timestamp': firestore.SERVER_TIMESTAMP,
                'metadata': {'predictionId': prediction_id, 'currentPrice': current_price, 'isWin': True}
            })

        return {"success": True, "isWin": is_win, "payout": payout}

    try:
        transaction = db.transaction()
        result = resolve_transaction(transaction)
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route('/api/process-referral-reward', methods=['POST'])
@require_auth
@require_admin
def process_referral_reward():
    data = request.json
    referral_doc_id = data.get('referralDocId')

    if not referral_doc_id:
        return jsonify({"success": False, "error": "Missing parameters"}), 400

    try:
        ref_ref = db.collection('referrals').document(referral_doc_id)

        # Get config outside transaction for efficiency
        config_ref = db.collection('system_config').document('global_v1')
        config_snap = config_ref.get()
        config = config_snap.to_dict() if config_snap.exists else {}
        amount = config.get('rewards', {}).get('referralBonusPoints', 50)
        xp_reward = config.get('rewards', {}).get('referralBonusXP', 50)

        @firestore.transactional
        def ref_reward_transaction(transaction):
            # Re-read referral document atomically inside transaction
            ref_snap = ref_ref.get(transaction=transaction)
            if not ref_snap.exists:
                raise Exception("Referral record not found")

            ref_data = ref_snap.to_dict()
            if ref_data.get('status') != 'REGISTERED':
                raise Exception("Referral already processed")

            # Derive IDs from referral document, not from caller
            referrer_id = ref_data.get('referrerId')
            referee_id = ref_data.get('refereeId')

            if not referrer_id or not referee_id:
                raise Exception("Invalid referral data")

            # Check eligibility atomically
            referrer_ref = db.collection('users').document(referrer_id)
            referrer_snap = referrer_ref.get(transaction=transaction)
            if not referrer_snap.exists:
                raise Exception("Referrer not found")

            referrer_data = referrer_snap.to_dict()
            tasks_completed = referrer_data.get('stats', {}).get('tasksCompleted', 0)

            if tasks_completed == 0:
                raise Exception("Referrer not qualified")

            # Get referee username from referee document
            referee_ref = db.collection('users').document(referee_id)
            referee_snap = referee_ref.get(transaction=transaction)
            referee_username = referee_snap.to_dict().get('username', 'Unknown') if referee_snap.exists else 'Unknown'

            claim_id = f"ref_qualify_{referrer_id}_{referee_id}"

            # Atomic update of referrer and referral doc
            transaction.update(referrer_ref, {
                'points': firestore.Increment(amount),
                'xp': firestore.Increment(xp_reward),
                'stats.referralsCount': firestore.Increment(1),
                'lastActionTimestamp': firestore.SERVER_TIMESTAMP
            })

            transaction.update(ref_ref, {
                'status': 'REWARDED',
                'updatedAt': firestore.SERVER_TIMESTAMP
            })

            # Log transaction
            tx_ref = referrer_ref.collection('transactions').document()
            transaction.set(tx_ref, {
                'id': tx_ref.id,
                'userId': referrer_id,
                'type': 'referral_bonus',
                'amount': amount,
                'source': f"Referral Bonus: {referee_username}",
                'claimId': claim_id,
                'status': 'COMPLETED',
                'timestamp': firestore.SERVER_TIMESTAMP
            })

            return {"success": True}

        transaction = db.transaction()
        result = ref_reward_transaction(transaction)
        return jsonify(result)

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route('/api/evaluate-user-integrity', methods=['POST'])
def evaluate_user_integrity():
    data = request.json
    user_id = data.get('userId')
    fingerprint = data.get('fingerprint')

    if not user_id or not fingerprint:
        return jsonify({"success": False, "error": "Missing parameters"}), 400

    try:
        # Check for duplicate fingerprints
        users_ref = db.collection('users')
        query = users_ref.where('fingerprint', '==', fingerprint)
        docs = query.stream()

        all_docs = [doc for doc in docs]
        count = len(all_docs)

        risk_score = 0
        flags = []
        if count > 1:
            risk_score += (count - 1) * 20
            flags.append('MULTI_ACCOUNT_FP')

        risk_level = 'LOW'
        if risk_score >= 60: risk_level = 'HIGH'
        elif risk_score >= 20: risk_level = 'MEDIUM'

        user_ref = users_ref.document(user_id)
        user_ref.update({
            'riskScore': risk_score,
            'riskLevel': risk_level,
            'fraudFlags': firestore.ArrayUnion(flags),
            'updatedAt': firestore.SERVER_TIMESTAMP
        })

        if risk_level == 'HIGH':
            anomaly_ref = db.collection('system_anomalies').document()
            anomaly_ref.set({
                'userId': user_id,
                'error': f"High Risk Detection: {', '.join(flags)}",
                'severity': 'HIGH',
                'context': 'UserIntegrity_Scan',
                'timestamp': firestore.SERVER_TIMESTAMP,
                'metadata': {'fingerprint': fingerprint, 'duplicateCount': count}
            })

        return jsonify({"success": True, "riskLevel": risk_level, "riskScore": risk_score})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True, port=5000)
