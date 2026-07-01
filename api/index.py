import os
import requests
import hashlib
import hmac
from webhook_helper import verify_provider_signature
from functools import wraps
from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore, auth
from datetime import datetime, timezone, timedelta
import math
import traceback
import logging
import html

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["https://pulseearn.online", "http://localhost:5173", "http://127.0.0.1:5173"]}})

@app.errorhandler(Exception)
def handle_exception(e):
    from werkzeug.exceptions import HTTPException
    if isinstance(e, HTTPException):
        return jsonify({
            "success": False,
            "error": e.name.upper().replace(' ', '_'),
            "message": e.description
        }), e.code

    # Standardize all other errors to JSON
    import traceback
    import logging
    logging.exception("Unhandled exception")
    print(traceback.format_exc())
    return jsonify({
        "success": False,
        "error": "INTERNAL_SERVER_ERROR",
        "message": "An internal server error occurred."
    }), 500

# Initialize Firebase Admin
try:
    if not firebase_admin._apps:
        firebase_admin.initialize_app()
    db = firestore.client()
except Exception as e:
    logging.error(f"CRITICAL: Firebase initialization failed: {str(e)}")
    db = None


def require_db(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not db:
            return jsonify({
                "success": False,
                "error": "DATABASE_OFFLINE",
                "message": "Firebase database connection is not initialized. Please check server environment variables."
            }), 503
        return f(*args, **kwargs)
    return decorated_function

def calculate_level(xp, base_level_xp=1000):
    if xp < base_level_xp:
        return 1
    level = math.floor(math.log(xp / base_level_xp) / math.log(3)) + 2
    return level

def verify_token(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        id_token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                id_token = auth_header.split(' ')[1]

        if not id_token:
            return jsonify({"success": False, "error": "Missing authorization token"}), 401

        try:
            decoded_token = auth.verify_id_token(id_token)
            request.user = decoded_token
        except Exception as e:
            return jsonify({"success": False, "error": f"Invalid token: {str(e)}"}), 401

        return f(*args, **kwargs)
    return decorated_function

def is_admin(uid):
    if not db: return False
    user_doc = db.collection('users').document(uid).get()
    if user_doc.exists:
        data = user_doc.to_dict()
        return data.get('role') in ['admin', 'ADMIN'] or data.get('isRoot') == True
    return False

def is_moderator(uid):
    if not db: return False
    user_doc = db.collection('users').document(uid).get()
    if user_doc.exists:
        data = user_doc.to_dict()
        role = data.get('role')
        return role in ['admin', 'ADMIN', 'moderator'] or data.get('isRoot') == True
    return False

@app.route('/api/admin/promote-moderator', methods=['POST'])
@verify_token
@require_db
def admin_promote_moderator():
    caller_uid = request.user['uid']
    if not is_admin(caller_uid):
        return jsonify({"success": False, "error": "Root authority required"}), 403

    data = request.json
    target_uid = data.get('userId')
    if not target_uid:
        return jsonify({"success": False, "error": "Target user ID required"}), 400

    try:
        user_ref = db.collection('users').document(target_uid)
        user_ref.update({
            'role': 'moderator',
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        return jsonify({"success": True, "message": "User promoted to moderator."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route('/api/admin/verify-user', methods=['POST'])
@verify_token
@require_db
def admin_verify_user():
    caller_uid = request.user['uid']
    if not is_moderator(caller_uid):
        return jsonify({"success": False, "error": "Moderator access required"}), 403

    data = request.json
    target_uid = data.get('userId')
    if not target_uid:
        return jsonify({"success": False, "error": "Missing userId"}), 400

    try:
        auth.update_user(target_uid, email_verified=True)
        return jsonify({"success": True, "message": f"User {target_uid} marked as verified in Auth."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route('/api/admin/delete-user', methods=['POST'])
@verify_token
@require_db
def admin_delete_user():
    caller_uid = request.user['uid']
    if not is_admin(caller_uid):
        return jsonify({"success": False, "error": "Admin access required"}), 403

    data = request.json
    target_uid = data.get('userId')
    if not target_uid:
        return jsonify({"success": False, "error": "Missing userId"}), 400

    try:
        auth.delete_user(target_uid)
        return jsonify({"success": True, "message": f"User {target_uid} deleted from Firebase Auth."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route('/api/admin/list-auth-users', methods=['GET'])
@verify_token
@require_db
def admin_list_auth_users():
    caller_uid = request.user['uid']
    if not is_moderator(caller_uid):
        return jsonify({"success": False, "error": "Moderator access required"}), 403

    try:
        users = []
        page = auth.list_users()
        while page:
            for user in page.users:
                users.append({
                    "uid": user.uid,
                    "email": user.email,
                    "displayName": user.display_name,
                    "emailVerified": user.email_verified
                })
            page = page.get_next_page()

        return jsonify({"success": True, "users": users})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route('/api/tasks/submit', methods=['POST'])
@verify_token
@require_db
def submit_task():
    data = request.json
    user_id = request.user['uid']
    task_id = data.get('taskId')
    proof = data.get('proof')

    if not task_id:
        return jsonify({"success": False, "error": "MISSING_TASK_ID"}), 400

    task_ref = db.collection('tasks').document(task_id)
    user_ref = db.collection('users').document(user_id)
    user_task_ref = user_ref.collection('user_tasks').document(task_id)

    @firestore.transactional
    def process_submission(transaction):
        user_snap = user_ref.get(transaction=transaction)
        if not user_snap.exists:
            raise Exception("USER_NOT_FOUND")
        user_data = user_snap.to_dict()

        task_snap = task_ref.get(transaction=transaction)
        if not task_snap.exists:
            raise Exception("TASK_NOT_FOUND")
        task_data = task_snap.to_dict()

        if task_data.get('status') != 'ACTIVE':
            raise Exception("TASK_INACTIVE")

        user_task_snap = user_task_ref.get(transaction=transaction)
        is_first_task = True
        if user_task_snap.exists:
            ut_data = user_task_snap.to_dict()
            if ut_data.get('status') == 'pending': raise Exception("TASK_AUDIT_IN_PROGRESS")
            if task_data.get('cooldownPeriod', 0) == 0 and ut_data.get('status') == 'completed':
                raise Exception("TASK_ALREADY_SECURED")

            # Cooldown check
            if task_data.get('cooldownPeriod', 0) > 0 and ut_data.get('lastCompleted'):
                last_time = ut_data['lastCompleted']
                if last_time.tzinfo is None: last_time = last_time.replace(tzinfo=timezone.utc)
                diff = (datetime.now(timezone.utc) - last_time).total_seconds()
                if diff < (task_data['cooldownPeriod'] * 3600):
                    raise Exception("TASK_IN_COOLDOWN")

            if ut_data.get('status') == 'completed':
                is_first_task = False
        else:
            # Check if user has ANY completed tasks to determine if this is their first
            # Simplified: if tasksCompleted in stats is 0, this is the first.
            is_first_task = user_data.get('stats', {}).get('tasksCompleted', 0) == 0

        claim_id = f"claim_{user_id}_{task_id}_{int(datetime.now(timezone.utc).timestamp())}"
        claim_ref = db.collection('task_claims').document(claim_id)

        is_automated = task_data.get('verificationType') == 'automated'

        # Require proof for non-automated tasks
        if not is_automated and not proof:
            raise Exception("PROOF_REQUIRED")

        claim_data = {
            'id': claim_id,
            'userId': user_id,
            'taskId': task_id,
            'campaignId': task_data.get('campaignId'),
            'validationState': 'APPROVED' if is_automated else 'PENDING',
            'completionState': 'COMPLETED' if is_automated else 'IN_PROGRESS',
            'submittedProof': proof,
            'createdAt': firestore.SERVER_TIMESTAMP,
            'metadata': {
                'taskTitle': task_data.get('title'),
                'engineVersion': '6.0.0-BACKEND'
            }
        }
        transaction.set(claim_ref, claim_data)

        ut_update = {
            'taskId': task_id,
            'status': 'completed' if is_automated else 'pending',
            'subtaskId': claim_id,
            'updatedAt': firestore.SERVER_TIMESTAMP
        }
        if is_automated:
            ut_update['lastCompleted'] = firestore.SERVER_TIMESTAMP
            ut_update['totalCompletions'] = firestore.Increment(1)

            # Update task counters
            transaction.update(task_ref, {
                'completionCount': firestore.Increment(1),
                'totalDistributed': firestore.Increment(task_data.get('rewardAmount', 0)),
                'updatedAt': firestore.SERVER_TIMESTAMP
            })

        transaction.set(user_task_ref, ut_update, merge=True)

        # SEC-003: Immediate Reward for Automated Tasks
        if is_automated:
            reward_amount = task_data.get('rewardAmount', 0)
            xp_reward = task_data.get('xpReward', 0)

            # Atomic point credit
            user_updates = {
                'points': firestore.Increment(reward_amount),
                'xp': firestore.Increment(xp_reward),
                'stats.totalEarnings': firestore.Increment(reward_amount),
                'stats.tasksCompleted': firestore.Increment(1)
            }
            transaction.update(user_ref, user_updates)

            # Update Liability
            metrics_ref = db.collection('system_config').document('global_metrics')
            transaction.update(metrics_ref, {
                'totalPTSLiability': firestore.Increment(reward_amount),
                'lastUpdatedAt': firestore.SERVER_TIMESTAMP
            })

            # Log to ledger
            tx_ref = user_ref.collection('transactions').document()
            transaction.set(tx_ref, {
                'id': tx_ref.id,
                'userId': user_id,
                'type': 'task_reward',
                'amount': reward_amount,
                'source': task_data.get('title'),
                'claimId': f"auto_{claim_id}",
                'status': 'COMPLETED',
                'timestamp': firestore.SERVER_TIMESTAMP,
                'metadata': {'taskId': task_id, 'campaignId': task_data.get('campaignId')}
            })

            # Internal notification
            notif_ref = user_ref.collection('notifications').document()
            transaction.set(notif_ref, {
                'type': 'reward_claimed',
                'title': 'Task Approved',
                'description': f"You earned {reward_amount:,} Points from: {task_data.get('title')}",
                'timestamp': firestore.SERVER_TIMESTAMP,
                'read': False,
                'metadata': {'txId': tx_ref.id}
            })

        return {"success": True, "claimId": claim_id, "automated": is_automated, "isFirstTask": is_first_task}

    try:
        transaction = db.transaction()
        result = process_submission(transaction)
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route('/api/execute-transaction', methods=['POST'])
@verify_token
@require_db
def execute_transaction():
    data = request.json
    user_id = data.get('userId')
    tx_type = data.get('type')

    # Auth logic: uid must match userId, OR caller must be admin/moderator (for task approvals)
    caller_uid = request.user['uid']
    is_caller_admin = is_admin(caller_uid)
    is_caller_mod = is_moderator(caller_uid)

    # Moderators can trigger task_reward for others as part of the approval process
    is_privileged_action = is_caller_admin or (is_caller_mod and tx_type == 'task_reward')

    if caller_uid != user_id and not is_privileged_action:
        return jsonify({"success": False, "error": f"Unauthorized: caller {caller_uid} does not match {user_id}"}), 403


    # Additional check for admin-only transaction types
    admin_only_types = ['admin_adjustment', 'AI_SYSTEM_CORRECTION', 'referral_reversal', 'penalty', 'withdrawal_finalized', 'referral_bonus']
    allowed_user_types = ['task_reward', 'daily_reward', 'welcome_bonus', 'withdrawal_debit', 'mission_reward']

    tx_col = db.collection('users').document(user_id).collection('transactions')
    tx_ref = tx_col.document()

    if tx_type in admin_only_types and not is_admin(caller_uid):
        return jsonify({"success": False, "error": "Restricted transaction type"}), 403

    if tx_type not in admin_only_types and tx_type not in allowed_user_types:
        return jsonify({"success": False, "error": f"Invalid transaction type: {tx_type}"}), 400

    source = data.get('source')
    claim_id = data.get('claimId')
    task_claim_id = data.get('taskClaimId')
    metadata = data.get('metadata', {})
    bypass_lock = data.get('bypassLock', False)

    if not user_id or not claim_id:
        return jsonify({"success": False, "error": "Missing parameters"}), 400

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

        # SERVER-SIDE CLAIM ID VALIDATION
        now_utc = datetime.now(timezone.utc)
        if tx_type == 'daily_reward':
            # Support client-provided local day for calendar boundary
            # Fix: extract from metadata or top level
            local_day = data.get('localDay') or metadata.get('localDay')
            if local_day:
                expected_id = f"daily_{local_day}_{user_id}"
            else:
                expected_id = f"daily_{now_utc.strftime('%Y-%m-%d')}_{user_id}"

            if claim_id != expected_id:
                raise Exception("CLAIM_ID_MISMATCH")
        elif tx_type == 'task_reward' and claim_id.startswith('auto_'):
            # Allow auto_claim prefix for automated tasks
            pass
        elif tx_type == 'welcome_bonus':
            expected_id = f"welcome_{user_id}"
            if claim_id != expected_id:
                raise Exception("CLAIM_ID_MISMATCH")

        # DERIVE AMOUNT/XP SERVER-SIDE FOR NON-ADMIN TYPES
        derived_amount = data.get('amount', 0)
        derived_xp = data.get('xpReward', 0)

        config_ref = db.collection('system_config').document('global_v1')
        config_snap = config_ref.get(transaction=transaction)
        config = config_snap.to_dict() if config_snap.exists else {}

        if tx_type not in admin_only_types:
            if tx_type == 'task_reward':
                # Fetch from tasks/{id}
                task_id = data.get('referenceId')
                if not task_id:
                    raise Exception("MISSING_TASK_ID")

                # REQUIRE AND VALIDATE TASK CLAIM
                if not task_claim_id:
                    raise Exception("MISSING_TASK_CLAIM_ID")

                tc_ref = db.collection('task_claims').document(task_claim_id)
                tc_snap = tc_ref.get(transaction=transaction)
                if not tc_snap.exists:
                    raise Exception("TASK_CLAIM_NOT_FOUND")

                tc_data = tc_snap.to_dict()
                if tc_data.get('userId') != user_id:
                    raise Exception("CLAIM_OWNERSHIP_MISMATCH")
                if tc_data.get('taskId') != task_id:
                    raise Exception("CLAIM_TASK_MISMATCH")
                # If called by admin/mod, we allow approving a PENDING claim here
                if tc_data.get('validationState') == 'PENDING' and is_privileged_action:
                    transaction.update(tc_ref, {
                        'validationState': 'APPROVED',
                        'resolvedAt': firestore.SERVER_TIMESTAMP,
                        'reviewedBy': caller_uid
                    })
                    # Update the user_tasks mirror to keep it in sync
                    user_task_ref = user_ref.collection('user_tasks').document(task_id)
                    transaction.update(user_task_ref, {
                        'status': 'completed',
                        'lastCompleted': firestore.SERVER_TIMESTAMP,
                        'totalCompletions': firestore.Increment(1),
                        'updatedAt': firestore.SERVER_TIMESTAMP
                    })
                elif tc_data.get('validationState') != 'APPROVED':
                    raise Exception(f"CLAIM_NOT_APPROVED: {tc_data.get('validationState')}")

                if tc_data.get('completionState') == 'COMPLETED' and tc_data.get('rewardTransactionId'):
                    raise Exception("CLAIM_ALREADY_REWARDED")

                task_ref = db.collection('tasks').document(task_id)
                task_snap = task_ref.get(transaction=transaction)
                if not task_snap.exists:
                    raise Exception("TASK_NOT_FOUND")
                task_data = task_snap.to_dict()
                derived_amount = task_data.get('rewardAmount', 0)
                derived_xp = task_data.get('xpReward', 0)

                # Mark claim as COMPLETED
                transaction.update(tc_ref, {
                    'completionState': 'COMPLETED',
                    'resolvedAt': firestore.SERVER_TIMESTAMP,
                    'rewardTransactionId': tx_ref.id
                })

            elif tx_type == 'mission_reward':
                # Fetch from system_task_definitions/{id}
                task_id = data.get('referenceId')
                if not task_id:
                    raise Exception("MISSING_MISSION_ID")

                # Missions use state-based sync, so we check user_system_tasks doc
                ust_id = f"{user_id}_{task_id}"
                ust_ref = db.collection('user_system_tasks').document(ust_id)
                ust_snap = ust_ref.get(transaction=transaction)
                if not ust_snap.exists:
                    raise Exception("MISSION_RECORD_NOT_FOUND")

                ust_data = ust_snap.to_dict()
                if ust_data.get('status') != 'COMPLETED':
                    raise Exception(f"MISSION_NOT_COMPLETED: {ust_data.get('status')}")
                if ust_data.get('rewarded'):
                    raise Exception("MISSION_ALREADY_REWARDED")

                def_ref = db.collection('system_task_definitions').document(task_id)
                def_snap = def_ref.get(transaction=transaction)
                if not def_snap.exists:
                    raise Exception("MISSION_DEFINITION_NOT_FOUND")

                def_data = def_snap.to_dict()
                derived_amount = def_data.get('rewardPoints', 0)
                derived_xp = def_data.get('rewardXp', 0)

                # Mark mission as REWARDED
                transaction.update(ust_ref, {
                    'rewarded': True,
                    'rewardTransactionId': tx_ref.id,
                    'claimedAt': firestore.SERVER_TIMESTAMP
                })

            elif tx_type == 'daily_reward':
                derived_amount = config.get('rewards', {}).get('dailyLoginPoints', 50)
                derived_xp = config.get('rewards', {}).get('dailyLoginXP', 50)
            elif tx_type == 'welcome_bonus':
                derived_amount = config.get('rewards', {}).get('welcomeBonusPoints', 30)
                derived_xp = config.get('rewards', {}).get('welcomeBonusXP', 50)
            elif tx_type == 'referral_bonus':
                derived_amount = config.get('rewards', {}).get('referralBonusPoints', 50)
                derived_xp = config.get('rewards', {}).get('referralBonusXP', 50)
            elif tx_type == 'withdrawal_debit':
                # FORCE NEGATIVE
                raw_amount = data.get('amount', 0)
                derived_amount = -abs(raw_amount)

                # Cross-check withdrawal doc
                wd_id = data.get('referenceId')
                if wd_id:
                    wd_ref = db.collection('withdrawals').document(wd_id)
                    wd_snap = wd_ref.get(transaction=transaction)
                    if wd_snap.exists:
                        wd_data = wd_snap.to_dict()
                        if wd_data.get('userId') != user_id:
                            raise Exception("WITHDRAWAL_OWNERSHIP_MISMATCH")
                        # Sync derived_amount to the doc amount
                        derived_amount = -abs(wd_data.get('amountPoints', 0))

            elif tx_type == 'prediction_entry':
                # FORCE NEGATIVE
                raw_amount = data.get('amount', 0)
                derived_amount = -abs(raw_amount)

                # Config validation
                min_stake = config.get('rewards', {}).get('minPredictionStake', 10)
                max_stake = config.get('rewards', {}).get('maxPredictionStake', 10000)
                if abs(derived_amount) < min_stake or abs(derived_amount) > max_stake:
                    raise Exception("INVALID_STAKE_AMOUNT")

        # Admin-only manual claim resolution block
        if tx_type in admin_only_types and task_claim_id:
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

        # Daily reward check & Advanced Streak Logic
        if tx_type == 'daily_reward':
            local_day = data.get('localDay') or metadata.get('localDay')
            if not local_day:
                raise Exception("LOCAL_DAY_REQUIRED")

            # Basic sanity check: user cannot claim for a day more than 1 day in future
            # or more than 7 days in past (preventing massive retroactive minting)
            try:
                now_utc = datetime.now(timezone.utc)
                parsed_local = datetime.strptime(local_day, '%Y-%m-%d').replace(tzinfo=timezone.utc)
                diff_now = (parsed_local - now_utc).days
                if diff_now > 1: raise Exception("FUTURE_DATE_FORBIDDEN")
                if diff_now < -7: raise Exception("STALE_DATE_FORBIDDEN")
            except ValueError:
                raise Exception("INVALID_DATE_FORMAT")

            last_day = user_data.get('lastClaimedDay')
            if local_day == last_day:
                raise Exception("DAILY_REWARD_COOLDOWN")

            # Calculate bonus multiplier based on streak
            streak = user_data.get('streak', 0)
            if last_day:
                try:
                    last_dt = datetime.strptime(last_day, '%Y-%m-%d')
                    curr_dt = datetime.strptime(local_day, '%Y-%m-%d')
                    diff = (curr_dt - last_dt).days

                    if diff == 1:
                        # Consecutive day
                        streak += 1
                    elif diff > 1:
                        # Streak broken
                        streak = 1
                    elif diff == 0:
                        raise Exception("DAILY_REWARD_COOLDOWN")
                    else:
                        # diff < 0 means they are trying to claim for a past day they already passed
                        raise Exception("TEMPORAL_ANOMALY_DETECTED")
                except ValueError:
                    streak = 1
            else:
                streak = 1

            # Industry Standard: Incremental rewards every 7 days
            bonus_multiplier = 1.0 + (min(streak, 7) - 1) * 0.1 # Max 1.6x at Day 7
            derived_amount = int(derived_amount * bonus_multiplier)

            # Record streak in user doc update block below
            user_ref_updates = {
                'streak': streak,
                'lastClaimedDay': local_day,
                'lastRewardDate': firestore.SERVER_TIMESTAMP
            }

        # Solvency
        current_points = user_data.get('points', 0)
        if derived_amount < 0 and current_points + derived_amount < 0:
            raise Exception("INSUFFICIENT_FUNDS")

        # Config
        xp_per_level = config.get('thresholds', {}).get('xpPerLevel', 1000)

        current_xp = user_data.get('xp', 0)
        xp_delta = derived_xp if (tx_type == 'admin_adjustment' or derived_amount >= 0 or derived_xp > 0) else 0
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
            'points': firestore.Increment(derived_amount),
            'xp': new_xp,
            'level': new_level,
            'stats.totalEarnings': firestore.Increment(max(derived_amount, 0)),
            'totalEarnedToday': max(derived_amount, 0) if is_new_day else firestore.Increment(max(derived_amount, 0)),
            'lastActionTimestamp': firestore.SERVER_TIMESTAMP,
            'execution_lock': False,
            'execution_lock_at': None
        }

        if tx_type == 'daily_reward':
            updates.update(user_ref_updates)

        if tx_type == 'task_reward':
            updates['stats.tasksCompleted'] = firestore.Increment(1)
        if tx_type == 'referral_bonus':
            updates['stats.referralsCount'] = firestore.Increment(1)
        if tx_type == 'withdrawal_finalized':
            final_amount = abs(derived_amount) if derived_amount != 0 else metadata.get('amount', 0)
            updates['totalWithdrawn'] = firestore.Increment(final_amount)

        transaction.update(user_ref, updates)

        # Update Liability
        metrics_ref = db.collection('system_config').document('global_metrics')
        transaction.update(metrics_ref, {
            'totalPTSLiability': firestore.Increment(derived_amount),
            'lastUpdatedAt': firestore.SERVER_TIMESTAMP
        })

        transaction.set(claim_ref, {
            'userId': user_id,
            'type': tx_type,
            'source': source,
            'amount': derived_amount,
            'executedAt': firestore.SERVER_TIMESTAMP,
            'metadata': {**metadata, 'engineVersion': '5.0.0-SERVER'}
        })

        # Transaction Ledger
        transaction.set(tx_ref, {
            'id': tx_ref.id,
            'userId': user_id,
            'type': tx_type,
            'amount': derived_amount,
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
            'points': derived_amount,
            'description': source,
            'timestamp': firestore.SERVER_TIMESTAMP,
            'metadata': {**metadata, 'txId': tx_ref.id}
        })

        # Notification
        # Fix: Removed auto-notification for withdrawal_finalized and manual task_reward
        # as these are now handled by dedicated caller-side logic in the frontend/audit flows.
        should_notify = False
        if tx_type == 'daily_reward':
             # Server remains owner of daily reward notification
             should_notify = True
             title = 'Daily Reward Claimed'
             description = f"You earned {derived_amount} Points for your daily check-in."
             notif_category = 'reward_claimed'
        elif tx_type == 'task_reward' and metadata.get('verificationType') == 'automated':
             # Server notifies for AUTOMATED tasks only; manual tasks are notified by OpsValidation
             should_notify = True
             title = 'Task Approved'
             description = f"You earned {derived_amount:,} Points from: {source}"
             notif_category = 'reward_claimed'
        elif tx_type == 'referral_bonus':
             should_notify = True
             title = 'Referral Bonus Received'
             description = f"You earned {derived_amount} Points from a qualified referral."
             notif_category = 'referral_joined'

        if should_notify:
            notif_ref = user_ref.collection('notifications').document()
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
        # Fix #19: Ensure 30-second lock is cleaned up on failure
        try:
            user_ref.update({
                'execution_lock': False,
                'execution_lock_at': None
            })
        except:
            pass
        return jsonify({"success": False, "error": str(e)}), 400

@app.route('/api/execute-prediction', methods=['POST'])
@verify_token
@require_db
def execute_prediction():
    data = request.json
    user_id = data.get('userId')

    caller_uid = request.user['uid']
    if caller_uid != user_id and not is_admin(caller_uid):
        return jsonify({"success": False, "error": f"Unauthorized: caller {caller_uid} does not match {user_id}"}), 403

    task_id = data.get('taskId')
    amount = data.get('amount', 0)
    asset_id = data.get('assetId')
    symbol = data.get('symbol')
    direction = data.get('direction')
    claim_id = data.get('claimId')

    if not all([user_id, task_id, claim_id, asset_id, symbol, direction]):
        return jsonify({"success": False, "error": "Missing parameters"}), 400

    if not isinstance(amount, (int, float)) or amount <= 0:
        return jsonify({"success": False, "error": "Invalid amount"}), 400

    if direction not in ['UP', 'DOWN']:
        return jsonify({"success": False, "error": "Invalid direction"}), 400

    # Fetch entry price server-side
    entry_price = fetch_market_price(asset_id)
    if entry_price is None:
        return jsonify({"success": False, "error": "Could not retrieve current market price"}), 503

    user_ref = db.collection('users').document(user_id)
    claim_ref = db.collection('system_claims').document(claim_id)
    predictions_ref = db.collection('user_predictions')

    @firestore.transactional
    def pred_transaction(transaction):
        user_snap = user_ref.get(transaction=transaction)
        if not user_snap.exists: raise Exception("ENTITY_NOT_FOUND")
        user_data = user_snap.to_dict()

        # SEC-002: Backend Gating - Verify Level
        config_ref = db.collection('system_config').document('global_v1')
        config_snap = config_ref.get(transaction=transaction)
        config = config_snap.to_dict() if config_snap.exists else {}
        unlock_level = config.get('thresholds', {}).get('predictionUnlockLevel', 5)

        if user_data.get('level', 1) < unlock_level:
            raise Exception(f"LEVEL_{unlock_level}_REQUIRED")

        if user_data.get('points', 0) < amount:
            raise Exception("INSUFFICIENT_FUNDS")

        # Fetch config server-side for reward multiplier and stake limits
        config_ref = db.collection('system_config').document('global_v1')
        config_snap = config_ref.get(transaction=transaction)
        config = config_snap.to_dict() if config_snap.exists else {}

        try:
            min_stake = float(config.get('rewards', {}).get('minPredictionStake', 10))
            max_stake = float(config.get('rewards', {}).get('maxPredictionStake', 10000))
            if min_stake > max_stake:
                raise ValueError("min > max")
        except (ValueError, TypeError):
            min_stake = 10
            max_stake = 10000

        if amount < min_stake or amount > max_stake:
            raise Exception(f"Stake must be between {min_stake} and {max_stake}")

        multiplier = config.get('rewards', {}).get('predictionWinMultiplier', 2.0)
        calculated_reward = amount * multiplier

        claim_snap = claim_ref.get(transaction=transaction)
        if claim_snap.exists: raise Exception("REWARD_ALREADY_CLAIMED")

        # Deduct points
        transaction.update(user_ref, {
            'points': firestore.Increment(-amount),
            'lastActionTimestamp': firestore.SERVER_TIMESTAMP,
            'stats.predictionsCount': firestore.Increment(1)
        })

        # Update Liability
        metrics_ref = db.collection('system_config').document('global_metrics')
        transaction.update(metrics_ref, {
            'totalPTSLiability': firestore.Increment(-amount),
            'lastUpdatedAt': firestore.SERVER_TIMESTAMP
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
            'rewardAmount': calculated_reward,
            'entryPrice': entry_price,
            'status': 'ACTIVE',
            'claimId': claim_id,
            'createdAt': firestore.SERVER_TIMESTAMP,
        'engineVersion': '5.0.0-SERVER',
        'auditTrail': [f"Forecast initiated: {direction} at {entry_price}. Reward calculated server-side: {calculated_reward}"]
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

def fetch_market_price(asset_id):
    # Fix #3: Reusable price fetch with fallback
    SYMBOL_MAP = {
        'bitcoin': 'BTC', 'ethereum': 'ETH', 'solana': 'SOL', 'binancecoin': 'BNB', 'ripple': 'XRP',
        'cardano': 'ADA', 'dogecoin': 'DOGE', 'the-open-network': 'TON', 'avalanche-2': 'AVAX', 'chainlink': 'LINK',
        'sui': 'SUI', 'tron': 'TRX', 'shiba-inu': 'SHIB', 'pepe': 'PEPE', 'litecoin': 'LTC',
        'polkadot': 'DOT', 'cosmos': 'ATOM', 'arbitrum': 'ARB', 'optimism': 'OP', 'near': 'NEAR'
    }

    try:
        # Primary: CoinGecko
        url = "https://api.coingecko.com/api/v3/simple/price"
        res = requests.get(url, params={'ids': asset_id, 'vs_currencies': 'usd'}, timeout=10)
        price = res.json().get(asset_id, {}).get('usd')
        if price is not None: return price
    except:
        pass

    try:
        # Fallback: CryptoCompare
        sym = SYMBOL_MAP.get(asset_id)
        if sym:
            url = "https://min-api.cryptocompare.com/data/price"
            res = requests.get(url, params={'fsym': sym, 'tsyms': 'USD'}, timeout=10)
            return res.json().get('USD')
    except:
        pass

    return None

@app.route('/api/resolve-prediction', methods=['POST'])
@verify_token
@require_db
def resolve_prediction():
    caller_uid = request.user['uid']
    if not is_moderator(caller_uid):
        return jsonify({"success": False, "error": "Moderator access required"}), 403

    data = request.json
    prediction_id = data.get('predictionId')

    if not prediction_id:
        return jsonify({"success": False, "error": "Missing parameters"}), 400

    pred_ref = db.collection('user_predictions').document(prediction_id)
    pred_snap = pred_ref.get()
    if not pred_snap.exists:
        return jsonify({"success": False, "error": "Prediction not found"}), 404

    asset_id = pred_snap.to_dict().get('assetId')
    current_price = fetch_market_price(asset_id)

    if current_price is None:
        return jsonify({"success": False, "error": "Could not retrieve market price"}), 503


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

        is_win = (current_price > pred_data['entryPrice']) if pred_data['direction'] == 'UP' else (current_price < pred_data['entryPrice'])
        payout = pred_data.get('rewardAmount', 0) if is_win else 0

        # Update user
        transaction.update(user_ref, {
            'points': firestore.Increment(payout),
            'lastActionTimestamp': firestore.SERVER_TIMESTAMP,
            'stats.totalWins': firestore.Increment(1 if is_win else 0),
            'stats.predictionRewards': firestore.Increment(payout)
        })

        # Update Liability
        metrics_ref = db.collection('system_config').document('global_metrics')
        transaction.update(metrics_ref, {
            'totalPTSLiability': firestore.Increment(payout),
            'lastUpdatedAt': firestore.SERVER_TIMESTAMP
        })

        # Update prediction with audit trail
        audit_entry = f"Settled at {current_price} server-side. Result: {'WIN' if is_win else 'LOSS'}"
        transaction.update(pred_ref, {
            'status': 'RESOLVED',
            'exitPrice': current_price,
            'resolvedAt': firestore.SERVER_TIMESTAMP,
            'auditTrail': firestore.ArrayUnion([audit_entry])
        })

        # Fix #16: Send notification on prediction result
        notif_ref = user_ref.collection('notifications').document()
        transaction.set(notif_ref, {
            'type': 'prediction_result',
            'title': 'Forecast Successful!' if is_win else 'Forecast Unsuccessful',
            'description': f"Your {pred_data['symbol'].upper()} forecast was correct. +{payout} PTS awarded." if is_win else f"Your {pred_data['symbol'].upper()} forecast was incorrect. Stake lost.",
            'predictionId': prediction_id,
            'isWin': is_win,
            'timestamp': firestore.SERVER_TIMESTAMP,
            'read': False
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
@verify_token
@require_db
def process_referral_reward():
    data = request.json
    referral_doc_id = data.get('referralDocId')
    referrer_id = data.get('referrerId')
    referee_id = data.get('refereeId')

    caller_uid = request.user['uid']
    # The referee or the referrer can trigger this, or an admin
    if caller_uid not in (referee_id, referrer_id) and not is_admin(caller_uid):
        return jsonify({"success": False, "error": "Unauthorized"}), 403

    referee_username = data.get('refereeUsername')

    if not referral_doc_id or not referrer_id or not referee_id:
        return jsonify({"success": False, "error": "Missing parameters"}), 400

    try:
        claim_id = f"ref_qualify_{referrer_id}_{referee_id}"
        ref_ref = db.collection('referrals').document(referral_doc_id)
        referrer_ref = db.collection('users').document(referrer_id)
        config_ref = db.collection('system_config').document('global_v1')
        claim_ref = db.collection('system_claims').document(claim_id)

        @firestore.transactional
        def ref_reward_transaction(transaction):
            # 1. Read everything inside transaction
            ref_snap = ref_ref.get(transaction=transaction)
            if not ref_snap.exists: raise Exception("REFERRAL_NOT_FOUND")
            ref_data = ref_snap.to_dict()
            if ref_data.get('status') != 'REGISTERED': raise Exception("REFERRAL_ALREADY_PROCESSED")

            referrer_snap = referrer_ref.get(transaction=transaction)
            if not referrer_snap.exists: raise Exception("REFERRER_NOT_FOUND")
            referrer_data = referrer_snap.to_dict()
            if referrer_data.get('stats', {}).get('tasksCompleted', 0) == 0:
                raise Exception("REFERRER_NOT_QUALIFIED")

            claim_snap = claim_ref.get(transaction=transaction)
            if claim_snap.exists: raise Exception("REWARD_ALREADY_CLAIMED")

            config_snap = config_ref.get(transaction=transaction)
            config = config_snap.to_dict() if config_snap.exists else {}
            amount = config.get('rewards', {}).get('referralBonusPoints', 50)
            xp_reward = config.get('rewards', {}).get('referralBonusXP', 50)

            # 2. Writes
            transaction.update(referrer_ref, {
                'points': firestore.Increment(amount),
                'xp': firestore.Increment(xp_reward),
                'stats.referralsCount': firestore.Increment(1),
                'lastActionTimestamp': firestore.SERVER_TIMESTAMP
            })

            # Update Liability
            metrics_ref = db.collection('system_config').document('global_metrics')
            transaction.update(metrics_ref, {
                'totalPTSLiability': firestore.Increment(amount),
                'lastUpdatedAt': firestore.SERVER_TIMESTAMP
            })

            transaction.update(ref_ref, {
                'status': 'REWARDED',
                'updatedAt': firestore.SERVER_TIMESTAMP
            })

            transaction.set(claim_ref, {
                'userId': referrer_id,
                'type': 'referral_bonus',
                'claimId': claim_id,
                'amount': amount,
                'executedAt': firestore.SERVER_TIMESTAMP
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

            # Fix: Notify referrer of reward
            notif_ref = referrer_ref.collection('notifications').document()
            transaction.set(notif_ref, {
                'type': 'referral_joined',
                'title': 'Referral Bonus Received!',
                'description': f"Your referral {referee_username} is now verified. +{amount} PTS awarded.",
                'timestamp': firestore.SERVER_TIMESTAMP,
                'read': False,
                'metadata': {'txId': tx_ref.id}
            })

            return {"success": True}

        transaction = db.transaction()
        result = ref_reward_transaction(transaction)
        return jsonify(result)

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route('/api/evaluate-user-integrity', methods=['POST'])
@verify_token
@require_db
def evaluate_user_integrity():
    data = request.json
    user_id = data.get('userId')

    caller_uid = request.user['uid']
    if caller_uid != user_id and not is_admin(caller_uid):
        return jsonify({"success": False, "error": f"Unauthorized: caller {caller_uid} does not match {user_id}"}), 403

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

@app.route('/api/webhooks/<provider>', methods=['POST'])
@require_db
def handle_provider_webhook(provider):
    # Public endpoint, uses provider-specific signature verification
    raw_payload = request.get_data()
    data = request.json
    signature = request.headers.get('X-Provider-Signature')

    if not signature:
        return jsonify({"success": False, "error": "MISSING_SIGNATURE"}), 401

    # Fetch provider config from Firestore
    provider_ref = db.collection('system_config').document(f'provider_{provider}')
    provider_snap = provider_ref.get()
    if not provider_snap.exists:
        return jsonify({"success": False, "error": "UNKNOWN_PROVIDER"}), 404

    provider_config = provider_snap.to_dict()
    if not provider_config.get('active'):
        return jsonify({"success": False, "error": "PROVIDER_INACTIVE"}), 403

    secret = provider_config.get('postbackSecret')
    if not secret:
        return jsonify({"success": False, "error": "PROVIDER_CONFIG_INCOMPLETE"}), 500

    # Verify signature using raw bytes
    if not verify_provider_signature(raw_payload, signature, secret):
        return jsonify({"success": False, "error": "INVALID_SIGNATURE"}), 403

    # Extract user and reward data
    user_id = data.get('userId')
    offer_id = data.get('offerId')
    tx_id = data.get('transactionId')
    raw_advertiser_payout = data.get('payout', 0) # The amount the advertiser paid (if provided)

    if not all([user_id, offer_id, tx_id]):
        return jsonify({"success": False, "error": "INVALID_PAYLOAD"}), 400

    # Validate against internal offer mapping, scoped by provider
    # Reject SYSTEM/internal tasks
    offer_query = db.collection('tasks').where('providerId', '==', offer_id).where('provider', '==', provider).where('active', '==', True).limit(1).get()

    if not offer_query:
        return jsonify({"success": False, "error": "OFFER_NOT_MAPPED_OR_INACTIVE"}), 404

    offer_data = offer_query[0].to_dict()
    if offer_data.get('provider') == 'internal':
        return jsonify({"success": False, "error": "RESTRICTED_OFFER_TYPE"}), 403

    # REVENUE ENGINE: Dynamic Calculation
    # First, try to get provider-specific distribution
    provider_config = provider_snap.to_dict() # Already fetched above
    dist = {
        'platformShare': provider_config.get('platformShare', 0.30),
        'userShare': provider_config.get('userShare', 0.60),
        'referralShare': provider_config.get('referralShare', 0.10)
    }

    if raw_advertiser_payout > 0:
        # If the provider sends the payout, we can calculate shares dynamically
        # This overrides the hardcoded task reward
        internal_reward = int(raw_advertiser_payout * dist.get('userShare', 0.60))
    else:
        # Fallback to hardcoded task reward
        internal_reward = offer_data.get('rewardAmount', 0)

    internal_xp = offer_data.get('xpReward', 0)

    claim_id = f"webhook_{provider}_{offer_id}_{user_id}_{tx_id}"

    user_ref = db.collection('users').document(user_id)
    claim_ref = db.collection('system_claims').document(claim_id)
    metrics_ref = db.collection('system_config').document('global_metrics')

    @firestore.transactional
    def webhook_transaction(transaction):
        user_snap = user_ref.get(transaction=transaction)
        if not user_snap.exists:
            raise Exception("USER_NOT_FOUND")

        claim_snap = claim_ref.get(transaction=transaction)
        if claim_snap.exists:
            raise Exception("ALREADY_PROCESSED")

        # Update user
        transaction.update(user_ref, {
            'points': firestore.Increment(internal_reward),
            'xp': firestore.Increment(internal_xp),
            'stats.totalEarnings': firestore.Increment(internal_reward),
            'lastActionTimestamp': firestore.SERVER_TIMESTAMP
        })

        # Update Liability
        transaction.update(metrics_ref, {
            'totalPTSLiability': firestore.Increment(internal_reward),
            'lastUpdatedAt': firestore.SERVER_TIMESTAMP
        })

        # Record claim
        transaction.set(claim_ref, {
            'userId': user_id,
            'type': f'offerwall_{provider}',
            'source': f"Offerwall: {provider}",
            'amount': internal_reward,
            'executedAt': firestore.SERVER_TIMESTAMP,
            'metadata': {**data, 'offerId': offer_id, 'engine': 'WEBHOOK_v1'}
        })

        return True

    try:
        transaction = db.transaction()
        webhook_transaction(transaction)
        return jsonify({"success": True, "message": "REWARD_PROCESSED"})
    except Exception as e:
        error_str = str(e)
        # Map known exceptions to clean responses
        if "USER_NOT_FOUND" in error_str:
            return jsonify({"success": False, "error": "USER_NOT_FOUND"}), 404
        if "ALREADY_PROCESSED" in error_str:
            return jsonify({"success": False, "error": "ALREADY_PROCESSED"}), 409

        print(f"WEBHOOK_CRITICAL_ERROR: {error_str}")
        return jsonify({"success": False, "error": "INTERNAL_TRANSACTION_ERROR"}), 500

def send_branded_email(to_email, template_name, context, subject):
    resend_key = os.environ.get('RESEND_API_KEY')
    resend_from = os.environ.get('RESEND_FROM_EMAIL', 'hello@pulseearn.online')

    if not resend_key:
        print(f"WARN: RESEND_API_KEY not set. Cannot send branded email: {template_name}")
        return False

    try:
        template_path = os.path.join(os.path.dirname(__file__), 'templates', f'{template_name}.html')
        with open(template_path, 'r') as f:
            template_content = f.read()

        # Secure string replacement with XSS sanitization
        for key, value in context.items():
            sanitized_value = html.escape(str(value))
            template_content = template_content.replace(f'{{{{{key}}}}}', sanitized_value)

        payload = {
            "from": f"PulseEarn <{resend_from}>",
            "to": [to_email],
            "subject": subject,
            "html": template_content
        }

        res = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {resend_key}",
                "Content-Type": "application/json"
            },
            json=payload,
            timeout=15
        )
        return res.status_code in [200, 201]
    except Exception as e:
        print(f"Branded email failure: {str(e)}")
        return False

@app.route('/api/referrals/lookup', methods=['POST'])
@verify_token
@require_db
def lookup_referral_code():
    # SEC-001: Secure backend-only referral lookup
    data = request.json
    code = data.get('referralCode')
    if not code:
        return jsonify({"success": False, "error": "MISSING_CODE"}), 400

    try:
        q = db.collection('users').where('referralCode', '==', code).limit(1)
        docs = q.get()
        if not docs:
            return jsonify({"success": False, "error": "INVALID_CODE"}), 404

        referrer = docs[0].to_dict()
        return jsonify({
            "success": True,
            "referrerId": docs[0].id,
            "username": referrer.get('username')
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/auth/send-verification', methods=['POST'])
@verify_token
@require_db
def send_verification_email():
    caller_uid = request.user['uid']
    caller_email = request.user.get('email')

    if not caller_email:
        return jsonify({"success": False, "error": "MISSING_EMAIL"}), 400

    # Fetch username for template
    user_doc = db.collection('users').document(caller_uid).get()
    username = user_doc.to_dict().get('username', 'Member') if user_doc.exists else 'Member'

    # Apply resend cooldown
    cooldown_ref = db.collection('email_cooldowns').document(caller_uid)

    @firestore.transactional
    def check_cooldown(transaction):
        snap = cooldown_ref.get(transaction=transaction)
        now = datetime.now(timezone.utc)
        if snap.exists:
            data = snap.to_dict()
            last_sent = data.get('updatedAt')
            if last_sent:
                if last_sent.tzinfo is None: last_sent = last_sent.replace(tzinfo=timezone.utc)
                diff = (now - last_sent).total_seconds()
                if diff < 60:
                    raise Exception(f"COOLDOWN_ACTIVE:{int(60 - diff)}")
        return True

    try:
        transaction = db.transaction()
        check_cooldown(transaction)

        action_settings = auth.ActionCodeSettings(
            url=f"https://pulseearn.online/auth/action",
            handle_code_in_app=True
        )
        link = auth.generate_email_verification_link(caller_email, action_settings)

        resend_key = os.environ.get('RESEND_API_KEY')
        if not resend_key:
            return jsonify({"success": False, "error": "SYSTEM_CONFIG_ERROR", "message": "Email dispatch unavailable."}), 500

        success = send_branded_email(
            caller_email,
            'VerifyEmail',
            {'username': username, 'link': link},
            "Verify your PulseEarn account"
        )

        if not success:
            return jsonify({"success": False, "error": "DISPATCH_FAILED"}), 502

        # Record successful dispatch for cooldown
        cooldown_ref.set({
            'userId': caller_uid,
            'updatedAt': firestore.SERVER_TIMESTAMP
        }, merge=True)

        return jsonify({"success": True, "message": "Verification email dispatched."})
    except Exception as e:
        error_msg = str(e)
        if "COOLDOWN_ACTIVE" in error_msg:
            return jsonify({
                "success": False,
                "error": "COOLDOWN_ACTIVE",
                "retryAfter": error_msg.split(':')[1]
            }), 429
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/authorize-resend', methods=['POST'])
@verify_token
@require_db
def authorize_resend():
    caller_uid = request.user['uid']
    caller_email = request.user.get('email')

    if not caller_email:
        return jsonify({"success": False, "error": "MISSING_EMAIL"}), 400

    # Fetch username for template
    user_doc = db.collection('users').document(caller_uid).get()
    username = user_doc.to_dict().get('username', 'Member') if user_doc.exists else 'Member'

    cooldown_ref = db.collection('email_cooldowns').document(caller_uid)

    @firestore.transactional
    def check_cooldown(transaction):
        snap = cooldown_ref.get(transaction=transaction)
        now = datetime.now(timezone.utc)

        if snap.exists:
            data = snap.to_dict()
            last_sent = data.get('updatedAt')
            if last_sent:
                if last_sent.tzinfo is None:
                    last_sent = last_sent.replace(tzinfo=timezone.utc)
                diff = (now - last_sent).total_seconds()
                if diff < 60:
                    raise Exception(f"COOLDOWN_ACTIVE:{int(60 - diff)}")
        return True

    try:
        transaction = db.transaction()
        check_cooldown(transaction)

        action_settings = auth.ActionCodeSettings(
            url=f"https://pulseearn.online/auth/action",
            handle_code_in_app=True
        )
        link = auth.generate_email_verification_link(caller_email, action_settings)

        resend_key = os.environ.get('RESEND_API_KEY')
        if not resend_key:
            print("WARN: RESEND_API_KEY not set. Falling back to client-side dispatch.")
            return jsonify({"success": True, "dispatchMethod": "client_fallback"})

        success = send_branded_email(
            caller_email,
            'VerifyEmail',
            {'username': username, 'link': link},
            "Verify your PulseEarn account"
        )

        if not success:
            return jsonify({"success": False, "error": "DISPATCH_FAILED", "message": "Failed to send verification email. Cooldown not applied."}), 502

        # Only update cooldown if dispatch succeeded
        cooldown_ref.set({
            'userId': caller_uid,
            'updatedAt': firestore.SERVER_TIMESTAMP
        }, merge=True)

        return jsonify({"success": True, "dispatchMethod": "branded_resend"})
    except Exception as e:
        error_msg = str(e)
        if "COOLDOWN_ACTIVE" in error_msg:
            return jsonify({
                "success": False,
                "error": "COOLDOWN_ACTIVE",
                "retryAfter": error_msg.split(':')[1],
                "message": f"Please wait {error_msg.split(':')[1]}s before resending."
            }), 429

        import traceback
        print(traceback.format_exc())
        return jsonify({"success": False, "error": "SERVER_ERROR", "message": "Something went wrong, please try again."}), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    health = {
        "success": True,
        "status": "ONLINE",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "7.1.0-STABLE",
        "firebase": "CONNECTED" if db else "DISCONNECTED",
        "env": {
            "RESEND_KEY": "PRESENT" if os.environ.get('RESEND_API_KEY') else "MISSING",
            "PROJECT_ID": os.environ.get('PROJECT_ID', 'MISSING'),
            "VERCEL_ENV": os.environ.get('VERCEL_ENV', 'LOCAL')
        }
    }
    return jsonify(health)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
