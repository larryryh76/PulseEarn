import os
import sys
import json
import html
import math
import traceback
from datetime import datetime, timezone, timedelta
from functools import wraps

# Lazy imports for stabilization
requests = None
firebase_admin = None
firestore = None
auth = None
CORS = None

def get_deps():
    global requests, firebase_admin, firestore, auth, CORS
    if requests is not None: return
    try:
        import requests as req
        import firebase_admin as fa
        from firebase_admin import firestore as fs, auth as au
        from flask_cors import CORS as cors
        requests, firebase_admin, firestore, auth, CORS = req, fa, fs, au, cors
    except Exception as e:
        print(f"BOOT_ERROR: Dependency loading failed: {str(e)}")
        sys.stdout.flush()

from flask import Flask, request, jsonify
app = Flask(__name__)

@app.errorhandler(Exception)
def handle_exception(e):
    from werkzeug.exceptions import HTTPException
    if isinstance(e, HTTPException):
        return jsonify({"success": False, "error": e.name.upper().replace(' ', '_'), "message": e.description}), e.code
    tb = traceback.format_exc()
    print(tb); sys.stdout.flush()
    return jsonify({
        "success": False, "error": "INTERNAL_SERVER_ERROR",
        "message": str(e) if os.environ.get('VERCEL_ENV') != 'production' else "An internal server error occurred."
    }), 500

def get_project_id():
    return (os.environ.get('VITE_FIREBASE_PROJECT_ID') or os.environ.get('PROJECT_ID') or
            os.environ.get('GOOGLE_CLOUD_PROJECT') or os.environ.get('FIREBASE_PROJECT_ID') or 'pulseearn-a4b16')

def get_storage_bucket_name():
    return (os.environ.get('VITE_FIREBASE_STORAGE_BUCKET') or os.environ.get('FIREBASE_STORAGE_BUCKET')
            or f"{get_project_id()}.appspot.com")

# Structured initialization state (no silent/false-positive init).
_INIT_STATE = {"ready": False, "error": None, "method": None}

def _load_service_account():
    """
    Resolve explicit service-account credentials from environment variables.
    Method A (preferred): FIREBASE_SERVICE_ACCOUNT = full JSON string.
    Method B (fallback): FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.
    Returns (service_account_dict, method_name) or (None, None) when nothing is configured.
    Raises RuntimeError when a configured credential is malformed.
    """
    raw = os.environ.get('FIREBASE_SERVICE_ACCOUNT')
    if raw:
        try:
            data = json.loads(raw)
        except Exception as e:
            raise RuntimeError(f"FIREBASE_SERVICE_ACCOUNT is not valid JSON: {e}")
        if not isinstance(data, dict) or not data.get('private_key') or not data.get('client_email'):
            raise RuntimeError("FIREBASE_SERVICE_ACCOUNT JSON is missing required fields (private_key/client_email).")
        if isinstance(data.get('private_key'), str):
            data['private_key'] = data['private_key'].replace('\\n', '\n')
        return data, 'FIREBASE_SERVICE_ACCOUNT'

    pid = os.environ.get('FIREBASE_PROJECT_ID') or os.environ.get('VITE_FIREBASE_PROJECT_ID')
    email = os.environ.get('FIREBASE_CLIENT_EMAIL')
    pk = os.environ.get('FIREBASE_PRIVATE_KEY')
    if pid and email and pk:
        return {
            "type": "service_account",
            "project_id": pid,
            "client_email": email,
            "private_key": pk.replace('\\n', '\n'),
            "token_uri": "https://oauth2.googleapis.com/token",
        }, 'SPLIT_VARS'

    return None, None

# Explicit-credential Firebase Admin initialization (ADC is NOT used as the primary method).
def init_firebase():
    get_deps()
    if firebase_admin is None:
        _INIT_STATE.update(ready=False, error="DEPENDENCIES_UNAVAILABLE", method=None)
        return False

    if firebase_admin._apps:
        _INIT_STATE.update(ready=True)
        return True

    try:
        sa, method = _load_service_account()
    except Exception as e:
        _INIT_STATE.update(ready=False, error=str(e), method="INVALID_CREDENTIALS")
        print(f"BOOT_CRITICAL: {str(e)}"); sys.stdout.flush()
        return False

    if not sa:
        _INIT_STATE.update(ready=False, error="MISSING_SERVICE_ACCOUNT_CREDENTIALS", method=None)
        print("BOOT_CRITICAL: No Firebase service-account credentials found. "
              "Set FIREBASE_SERVICE_ACCOUNT (full JSON) or FIREBASE_PROJECT_ID + "
              "FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.")
        sys.stdout.flush()
        return False

    try:
        from firebase_admin import credentials
        pid = sa.get('project_id') or get_project_id()
        cred = credentials.Certificate(sa)
        firebase_admin.initialize_app(cred, options={
            'projectId': pid,
            'storageBucket': get_storage_bucket_name(),
        })
        _INIT_STATE.update(ready=True, error=None, method=method)
        print(f"BOOT: Firebase Admin initialized with explicit credentials "
              f"(Project: {pid}, Method: {method})")
        sys.stdout.flush()
        return True
    except Exception as e:
        _INIT_STATE.update(ready=False, error=str(e), method=method)
        print(f"BOOT_CRITICAL: Firebase initialization failed: {str(e)}")
        sys.stdout.flush()
        return False

def get_db():
    if init_firebase():
        return firestore.client()
    return None

def require_db(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        db = get_db()
        if not db: return jsonify({"success": False, "error": "DATABASE_OFFLINE"}), 503
        return f(*args, **kwargs)
    return decorated_function

def verify_token(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not init_firebase():
            return jsonify({
                "success": False, "error": "AUTH_SERVICE_OFFLINE",
                "reason": _INIT_STATE.get("error") or "ADMIN_SDK_NOT_INITIALIZED"
            }), 503
        id_token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '): id_token = auth_header.split(' ')[1]
        if not id_token: return jsonify({"success": False, "error": "Missing authorization token"}), 401
        try:
            # Using current auth context
            decoded_token = auth.verify_id_token(id_token)
            request.user = decoded_token
        except Exception as e: return jsonify({"success": False, "error": f"Invalid token: {str(e)}"}), 401
        return f(*args, **kwargs)
    return decorated_function

def calculate_level(xp, base_level_xp=1000):
    if xp < base_level_xp: return 1
    return math.floor(math.log(xp / base_level_xp) / math.log(3)) + 2

def evaluate_missions(user_id):
    db = get_db()
    if not db or not user_id: return
    try:
        user_ref = db.collection('users').document(user_id)
        user_snap = user_ref.get()
        if not user_snap.exists: return
        user_data = user_snap.to_dict()
        definitions = db.collection('system_task_definitions').where('active', '==', True).get()
        for d_doc in definitions:
            d = d_doc.to_dict()
            field = d.get('conditionField')
            if not field: continue
            target = d.get('targetValue', 1)
            ptr = user_data
            if '.' in field:
                for p in field.split('.'):
                    if isinstance(ptr, dict): ptr = ptr.get(p, 0)
                    else: ptr = 0; break
                current_value = ptr
            else: current_value = user_data.get(field, 0)
            try:
                progress = min(float(current_value or 0), float(target))
                is_completed = progress >= float(target)
            except: progress = 0; is_completed = False
            ust_id = f"{user_id}_{d_doc.id}"
            db.collection('user_system_tasks').document(ust_id).set({
                'userId': user_id, 'systemTaskId': d_doc.id, 'category': d.get('category'),
                'progress': progress, 'target': target, 'status': 'COMPLETED' if is_completed else 'IN_PROGRESS',
                'updatedAt': firestore.SERVER_TIMESTAMP
            }, merge=True)
    except Exception as e:
        print(f"ERROR: Mission Evaluation Failed: {str(e)}"); sys.stdout.flush()

def is_admin(uid):
    db = get_db()
    if not db: return False
    user_doc = db.collection('users').document(uid).get()
    if user_doc.exists:
        d = user_doc.to_dict()
        return d.get('role') in ['admin', 'ADMIN'] or d.get('isRoot') == True
    return False

def is_moderator(uid):
    db = get_db()
    if not db: return False
    user_doc = db.collection('users').document(uid).get()
    if user_doc.exists:
        d = user_doc.to_dict()
        return d.get('role') in ['admin', 'ADMIN', 'moderator'] or d.get('isRoot') == True
    return False

def fetch_market_price(asset_id):
    SYMBOL_MAP = {'bitcoin':'BTC','ethereum':'ETH','solana':'SOL','binancecoin':'BNB','ripple':'XRP','cardano':'ADA','dogecoin':'DOGE','the-open-network':'TON','avalanche-2':'AVAX','chainlink':'LINK','sui':'SUI','tron':'TRX','shiba-inu':'SHIB','pepe':'PEPE','litecoin':'LTC','polkadot':'DOT','cosmos':'ATOM','arbitrum':'ARB','optimism':'OP','near':'NEAR'}
    get_deps()
    price = None
    try:
        res = requests.get("https://api.coingecko.com/api/v3/simple/price", params={'ids': asset_id, 'vs_currencies': 'usd'}, timeout=10)
        price = res.json().get(asset_id, {}).get('usd')
    except: pass

    if price is None:
        try:
            sym = SYMBOL_MAP.get(asset_id)
            if sym:
                res = requests.get("https://min-api.cryptocompare.com/data/price", params={'fsym': sym, 'tsyms': 'USD'}, timeout=10)
                price = res.json().get('USD')
        except: pass
    return price

@app.route('/api/ping', methods=['GET'])
def ping():
    return jsonify({"success": True, "message": "PONG", "timestamp": datetime.now(timezone.utc).isoformat()})

@app.route('/api/health', methods=['GET'])
def health_check():
    # No false positives: every check below reflects a real, credentialed operation.
    result = {
        "success": False,
        "status": "OFFLINE",
        "version": "8.0.0-VERIFIED",
        "projectId": get_project_id(),
        "credentialMethod": None,
        "checks": {
            "adminSdkInitialized": False,
            "credentialsLoaded": False,
            "firestoreReachable": False,
            "storageReachable": False,
        },
    }

    initialized = init_firebase()
    result["checks"]["adminSdkInitialized"] = initialized
    result["credentialMethod"] = _INIT_STATE.get("method")

    if not initialized:
        result["error"] = _INIT_STATE.get("error") or "ADMIN_SDK_OFFLINE"
        result["message"] = ("Firebase Admin SDK is not initialized. Verify service-account "
                             "credentials (FIREBASE_SERVICE_ACCOUNT or split FIREBASE_* vars).")
        return jsonify(result), 503

    # Credentials were accepted by credentials.Certificate() during init.
    result["checks"]["credentialsLoaded"] = True

    # Real credentialed Firestore read (requires a valid signed token exchange).
    try:
        db = firestore.client()
        list(db.collection('system_config').limit(1).get())
        result["checks"]["firestoreReachable"] = True
    except Exception as e:
        result["error"] = "FIRESTORE_UNREACHABLE"
        result["message"] = str(e)
        return jsonify(result), 503

    # Storage reachability (non-fatal; reported explicitly).
    try:
        from firebase_admin import storage
        bucket = storage.bucket(get_storage_bucket_name())
        bucket.exists()
        result["checks"]["storageReachable"] = True
    except Exception as e:
        result["checks"]["storageReachable"] = False
        result["storageError"] = str(e)

    # Opt-in email deliverability check (?deep=email): reports whether the sending domain
    # is DNS-verified in Resend. No secrets are exposed — only domain verification status.
    if request.args.get('deep') == 'email':
        email_status = {"resendKeyConfigured": bool(os.environ.get('RESEND_API_KEY')),
                        "fromAddress": EMAIL_FROM, "domainVerified": None}
        key = os.environ.get('RESEND_API_KEY')
        if key:
            try:
                dr = requests.get("https://api.resend.com/domains",
                                  headers={"Authorization": f"Bearer {key}"}, timeout=10)
                if dr.status_code == 200:
                    domains = dr.json().get('data', []) or []
                    send_domain = EMAIL_FROM.split('@')[-1].rstrip('>').strip()
                    match = next((d for d in domains if d.get('name') == send_domain), None)
                    email_status["sendingDomain"] = send_domain
                    email_status["domainVerified"] = (match or {}).get('status') == 'verified'
                    email_status["domainStatus"] = (match or {}).get('status') if match else 'NOT_FOUND'
                    email_status["templatesPresent"] = os.path.isdir(os.path.join(os.path.dirname(__file__), 'templates'))
                else:
                    email_status["error"] = f"resend_api_status_{dr.status_code}"
            except Exception as e:
                email_status["error"] = str(e)
        result["email"] = email_status

    result["success"] = True
    result["status"] = "ONLINE"
    return jsonify(result)

@app.route('/api/tasks/submit', methods=['POST'])
@verify_token
@require_db
def submit_task():
    db = get_db()
    data, user_id = request.json, request.user['uid']
    task_id = data.get('taskId')
    proof = (data.get('proof') or '').strip()
    if not task_id: return jsonify({"success": False, "error": "MISSING_TASK_ID"}), 400

    @firestore.transactional
    def process(transaction):
        user_ref = db.collection('users').document(user_id)
        task_ref = db.collection('tasks').document(task_id)
        ut_ref = user_ref.collection('user_tasks').document(task_id)
        # All reads must precede writes in a Firestore transaction.
        u_snap = user_ref.get(transaction=transaction)
        t_snap = task_ref.get(transaction=transaction)
        ut_snap = ut_ref.get(transaction=transaction)
        if not u_snap.exists or not t_snap.exists: raise Exception("NOT_FOUND")
        t_data = t_snap.to_dict()
        u_data = u_snap.to_dict()

        # Task must be active (support both boolean 'active' and 'status' schemas).
        if t_data.get('active') is False or (t_data.get('status') and t_data.get('status') != 'ACTIVE'):
            raise Exception("TASK_INACTIVE")

        # SEC: server-authoritative idempotency + cooldown guard (prevents reward farming / replay).
        cooldown_hours = float(t_data.get('cooldownPeriod') or 0)
        now = datetime.now(timezone.utc)
        if ut_snap.exists:
            ut = ut_snap.to_dict()
            st = ut.get('status')
            if st == 'pending':
                raise Exception("ALREADY_PENDING")
            if cooldown_hours <= 0 and st == 'completed':
                raise Exception("ALREADY_COMPLETED")
            if cooldown_hours > 0:
                last = ut.get('lastCompleted')
                if isinstance(last, datetime) and (now - last).total_seconds() < cooldown_hours * 3600:
                    raise Exception("ON_COOLDOWN")

        is_auto = t_data.get('verificationType') == 'automated'
        claim_id = f"claim_{user_id}_{task_id}_{int(now.timestamp())}"
        transaction.set(db.collection('task_claims').document(claim_id), {
            'id': claim_id, 'userId': user_id, 'taskId': task_id,
            'validationState': 'APPROVED' if is_auto else 'PENDING',
            'completionState': 'COMPLETED' if is_auto else 'IN_PROGRESS',
            'submittedProof': proof or None,
            'createdAt': firestore.SERVER_TIMESTAMP,
            'metadata': {'taskTitle': t_data.get('title'), 'username': u_data.get('username')}
        })
        if is_auto:
            pts, xp = t_data.get('rewardAmount', 0), t_data.get('xpReward', 0)
            transaction.update(user_ref, {'points': firestore.Increment(pts), 'xp': firestore.Increment(xp), 'stats.tasksCompleted': firestore.Increment(1)})
            transaction.set(db.collection('system_config').document('global_metrics'), {'totalPTSLiability': firestore.Increment(pts)}, merge=True)
            transaction.set(ut_ref, {'taskId': task_id, 'status': 'completed',
                                     'lastCompleted': firestore.SERVER_TIMESTAMP,
                                     'totalCompletions': firestore.Increment(1)}, merge=True)
            transaction.set(task_ref, {'totalClaims': firestore.Increment(1),
                                       'completionCount': firestore.Increment(1)}, merge=True)
            # Ledger + activity + notification for instant/automated tasks (manual tasks are
            # recorded later via /api/execute-transaction). Written atomically so an
            # auto-approved task reward is consistent across Wallet, activity feed, and
            # Notifications the instant it is granted.
            task_title = t_data.get('title') or 'Task'
            cur_points = float(u_data.get('points', 0) or 0)
            post_ledger(transaction, user_ref, user_id,
                        tx_type='task_reward', amount=float(pts or 0), xp=float(xp or 0),
                        source='Task Reward', description=f"Completed: {task_title}",
                        claim_id=claim_id, reference_id=task_id,
                        balance_after=cur_points + float(pts or 0),
                        metadata={'taskId': task_id, 'taskName': task_title, 'xpEarned': xp,
                                  'verificationStatus': 'automated'})
        else:
            transaction.set(ut_ref, {'taskId': task_id, 'status': 'pending',
                                     'updatedAt': firestore.SERVER_TIMESTAMP}, merge=True)
        return {"success": True, "claimId": claim_id, "automated": is_auto}

    try:
        res = process(db.transaction())
        evaluate_missions(user_id)
        return jsonify(res)
    except Exception as e: return jsonify({"success": False, "error": str(e)}), 400

# Authorization matrix for execute-transaction. User-claimable reward types may be
# initiated by the account owner; everything that grants/adjusts balance arbitrarily
# is restricted to admins. Reward *amounts* for user-claimable types are ALWAYS read
# from server config so a crafted client cannot inflate its own payout.
USER_SELF_TX = {'daily_reward', 'welcome_bonus', 'withdrawal_debit', 'mission_reward'}
ADMIN_TX = {'admin_adjustment', 'task_reward', 'withdrawal_finalized', 'withdrawal_debit_reversal',
            'penalty', 'referral_reversal', 'referral_bonus', 'AI_SYSTEM_CORRECTION'}

# Fallback human-readable labels for the activity timeline, used when the client did not
# supply a source/description. Keeps the activity feed readable for every transaction type.
ACTIVITY_LABELS = {
    'daily_reward': 'Daily Login Bonus',
    'welcome_bonus': 'Welcome Bonus',
    'task_reward': 'Task Reward',
    'mission_reward': 'Mission Reward',
    'referral_bonus': 'Referral Reward',
    'referral_reversal': 'Referral Reversal',
    'admin_adjustment': 'Account Adjustment',
    'penalty': 'Account Penalty',
    'AI_SYSTEM_CORRECTION': 'System Correction',
    'withdrawal_debit': 'Withdrawal Requested',
    'withdrawal_debit_reversal': 'Withdrawal Refunded',
    'withdrawal_finalized': 'Withdrawal Completed',
}

# Notification presentation per transaction type: (Notification['type'], title).
# The Notifications page reads users/{uid}/notifications; 'type' MUST be one of the union
# defined in src/types/index.ts (task_completed | reward_claimed | referral_joined |
# streak_bonus | system | prediction_result | subtask_update | moderation_notice |
# payout_processed).
NOTIFICATION_META = {
    'daily_reward': ('reward_claimed', 'Daily Reward Claimed'),
    'welcome_bonus': ('reward_claimed', 'Welcome Bonus'),
    'task_reward': ('reward_claimed', 'Task Reward Earned'),
    'mission_reward': ('reward_claimed', 'Mission Reward Earned'),
    'referral_bonus': ('referral_joined', 'Referral Reward Earned'),
    'referral_reversal': ('system', 'Referral Reversed'),
    'admin_adjustment': ('system', 'Account Adjustment'),
    'penalty': ('moderation_notice', 'Account Penalty Applied'),
    'AI_SYSTEM_CORRECTION': ('system', 'System Correction'),
    'withdrawal_debit': ('payout_processed', 'Withdrawal Requested'),
    'withdrawal_debit_reversal': ('payout_processed', 'Withdrawal Refunded'),
    'withdrawal_finalized': ('payout_processed', 'Withdrawal Completed'),
    'prediction_stake': ('prediction_result', 'Forecast Placed'),
    'prediction_reward': ('prediction_result', 'Forecast Settled'),
}

def post_ledger(transaction, user_ref, user_id, *, tx_type, amount, xp, source,
                description, claim_id, reference_id, balance_after,
                activity_type=None, metadata=None, notify=True):
    """Write the transaction ledger entry, the activity-feed entry, and (optionally) a
    notification ATOMICALLY within the caller's Firestore transaction.

    This is the single source of truth that keeps four surfaces in lockstep with every
    balance change:
      - Wallet / Transaction History  -> users/{uid}/transactions  (reads 'timestamp' + 'status')
      - Dashboard activity feed        -> users/{uid}/activities    (reads 'timestamp')
      - Notifications page             -> users/{uid}/notifications  (reads 'timestamp')
    Previously each caller wrote these ad hoc (or not at all), and the ledger used
    'createdAt' while the client read 'timestamp', so entries were invisible or mis-sorted.
    """
    metadata = metadata or {}
    base_meta = {**metadata, 'transactionReference': claim_id, 'loggedBy': 'ServerLedger_V1'}

    # 1. Immutable ledger entry. Writes BOTH 'timestamp' (what the client sorts/renders on)
    #    and 'createdAt' (legacy/audit), plus the 'status' the Transaction type expects.
    transaction.set(user_ref.collection('transactions').document(), {
        'userId': user_id,
        'type': tx_type, 'amount': amount, 'xp': xp,
        'source': source, 'description': description,
        'claimId': claim_id, 'referenceId': reference_id,
        'balanceAfter': balance_after,
        'status': 'COMPLETED',
        'timestamp': firestore.SERVER_TIMESTAMP,
        'createdAt': firestore.SERVER_TIMESTAMP,
        'processedAt': firestore.SERVER_TIMESTAMP,
        'metadata': base_meta,
    })

    # 2. Activity timeline entry.
    act_ref = user_ref.collection('activities').document()
    transaction.set(act_ref, {
        'id': act_ref.id, 'userId': user_id,
        'type': activity_type or tx_type, 'points': amount,
        'description': description, 'referenceId': reference_id,
        'timestamp': firestore.SERVER_TIMESTAMP,
        'metadata': base_meta,
    })

    # 3. Notification.
    if notify:
        n_type, n_title = NOTIFICATION_META.get(tx_type, ('system', 'Account Update'))
        notif_ref = user_ref.collection('notifications').document()
        transaction.set(notif_ref, {
            'title': n_title, 'description': description,
            'type': n_type, 'read': False,
            'timestamp': firestore.SERVER_TIMESTAMP,
            'metadata': {**base_meta, 'points': amount},
        })

@app.route('/api/execute-transaction', methods=['POST'])
@verify_token
@require_db
def execute_transaction():
    db = get_db()
    data = request.json or {}
    user_id, tx_type, claim_id = data.get('userId'), data.get('type'), data.get('claimId')
    caller_uid = request.user['uid']
    if not user_id or not tx_type or not claim_id:
        return jsonify({"success": False, "error": "MISSING_FIELDS"}), 400

    caller_is_admin = is_admin(caller_uid)
    is_self = caller_uid == user_id

    if tx_type in ADMIN_TX and tx_type not in USER_SELF_TX:
        if not caller_is_admin: return jsonify({"success": False, "error": "FORBIDDEN"}), 403
    elif tx_type in USER_SELF_TX:
        if not is_self and not caller_is_admin: return jsonify({"success": False, "error": "Unauthorized"}), 403
    else:
        return jsonify({"success": False, "error": "UNSUPPORTED_TRANSACTION_TYPE"}), 400

    # Server-side economy config (authoritative reward values + safety caps).
    cfg_snap = db.collection('system_config').document('global_v1').get()
    cfg = cfg_snap.to_dict() if cfg_snap.exists else {}
    rewards = cfg.get('rewards', {}) or {}
    security = cfg.get('security', {}) or {}
    max_single = float(security.get('maxSingleReward', 5000) or 5000)

    @firestore.transactional
    def process(transaction):
        user_ref = db.collection('users').document(user_id)
        claim_ref = db.collection('system_claims').document(claim_id)
        # ---- READS (must precede all writes) ----
        u_snap = user_ref.get(transaction=transaction)
        if not u_snap.exists: raise Exception("USER_NOT_FOUND")
        u = u_snap.to_dict()
        if claim_ref.get(transaction=transaction).exists: raise Exception("REWARD_ALREADY_CLAIMED")

        points_delta = 0.0
        xp_delta = 0.0
        post_writes = []  # deferred writes executed after user update

        if tx_type == 'mission_reward':
            mid = data.get('referenceId')
            def_ref = db.collection('system_task_definitions').document(mid)
            ust_ref = db.collection('user_system_tasks').document(f"{user_id}_{mid}")
            def_snap = def_ref.get(transaction=transaction)
            ust_snap = ust_ref.get(transaction=transaction)
            if not def_snap.exists or not ust_snap.exists or ust_snap.to_dict().get('status') != 'COMPLETED':
                raise Exception("INVALID_MISSION_STATE")
            if ust_snap.to_dict().get('rewarded'): raise Exception("ALREADY_REWARDED")
            points_delta = float(def_snap.to_dict().get('rewardPoints', 0) or 0)
            xp_delta = float(def_snap.to_dict().get('rewardXP', 0) or 0)
            post_writes.append((ust_ref, {'rewarded': True, 'claimedAt': firestore.SERVER_TIMESTAMP}, True))

        elif tx_type == 'daily_reward':
            points_delta = float(rewards.get('dailyLoginPoints', 50) or 0)
            xp_delta = float(rewards.get('dailyLoginXP', 20) or 0)
            post_writes.append((user_ref, {'lastRewardDate': firestore.SERVER_TIMESTAMP}, True))

        elif tx_type == 'welcome_bonus':
            points_delta = float(rewards.get('welcomeBonusPoints', 30) or 0)
            xp_delta = float(rewards.get('welcomeBonusXP', 50) or 0)

        elif tx_type == 'withdrawal_debit':
            amt = abs(float(data.get('amount', 0) or 0))
            if amt <= 0: raise Exception("INVALID_AMOUNT")
            min_wd = float((cfg.get('thresholds', {}) or {}).get('minWithdrawalPoints', 10000) or 10000)
            if amt < min_wd: raise Exception("BELOW_MIN_WITHDRAWAL")
            # SEC: enforce ALL withdrawal eligibility gates server-side (mirrors
            # src/utils/eligibility.ts) so a crafted client cannot bypass anti-fraud rules.
            if float(u.get('level', 1) or 1) < 2: raise Exception("LEVEL_TOO_LOW")
            if float(u.get('points', 0) or 0) < amt: raise Exception("INSUFFICIENT_FUNDS")
            if int((u.get('stats') or {}).get('tasksCompleted', 0) or 0) < 5:
                raise Exception("INSUFFICIENT_TASKS")
            if str(u.get('riskLevel') or 'LOW').upper() == 'HIGH':
                raise Exception("ACCOUNT_UNDER_REVIEW")
            created = u.get('createdAt')
            if isinstance(created, datetime):
                age_days = (datetime.now(timezone.utc) - created).total_seconds() / 86400.0
                if age_days < 3: raise Exception("ACCOUNT_TOO_NEW")
            meta = data.get('metadata') or {}
            addr = (meta.get('walletAddress') or '').strip()
            network = (meta.get('network') or '').strip()
            if not addr or not network: raise Exception("MISSING_PAYOUT_DETAILS")
            points_delta = -amt
            # Create the withdrawal request server-side, atomically with the debit, so an
            # unfunded (never-debited) payout request can never exist. Client cannot create
            # withdrawals directly (see firestore.rules).
            wd_ref = db.collection('withdrawals').document(claim_id)
            post_writes.append((wd_ref, {
                'userId': user_id, 'userEmail': u.get('email'), 'username': u.get('username'),
                'amountPoints': amt, 'amountUSD': meta.get('amountUSD'),
                'walletAddress': addr, 'network': network,
                'status': 'PENDING', 'claimId': claim_id, 'debited': True,
                'debitedAt': firestore.SERVER_TIMESTAMP, 'createdAt': firestore.SERVER_TIMESTAMP
            }, False))

        elif tx_type == 'task_reward':
            ref_task = data.get('referenceId')
            t_snap = db.collection('tasks').document(ref_task).get(transaction=transaction) if ref_task else None
            if t_snap is not None and t_snap.exists:
                points_delta = float(t_snap.to_dict().get('rewardAmount', 0) or 0)
                xp_delta = float(t_snap.to_dict().get('xpReward', 0) or 0)
            else:
                points_delta = float(data.get('amount', 0) or 0)
                xp_delta = float(data.get('xpReward', 0) or 0)
            tclaim = data.get('taskClaimId')
            if tclaim:
                post_writes.append((db.collection('task_claims').document(tclaim),
                                    {'validationState': 'APPROVED', 'completionState': 'COMPLETED',
                                     'reviewedAt': firestore.SERVER_TIMESTAMP, 'reviewedBy': caller_uid}, True))
            post_writes.append((user_ref, {'stats.tasksCompleted': firestore.Increment(1)}, True))

        elif tx_type == 'withdrawal_finalized':
            wd_id = (data.get('metadata') or {}).get('withdrawalId') or data.get('referenceId')
            if not wd_id: raise Exception("MISSING_WITHDRAWAL_ID")
            wd_ref = db.collection('withdrawals').document(wd_id)
            wd_snap = wd_ref.get(transaction=transaction)
            if not wd_snap.exists: raise Exception("WITHDRAWAL_NOT_FOUND")
            if not wd_snap.to_dict().get('debited'): raise Exception("WITHDRAWAL_NOT_DEBITED")
            post_writes.append((wd_ref, {'payoutFinalizedAt': firestore.SERVER_TIMESTAMP}, True))
            # No balance change: points were already debited at request time.

        else:  # admin adjustments / reversals / penalties / bonuses (admin authority already enforced)
            points_delta = float(data.get('amount', 0) or 0)
            xp_delta = float(data.get('xpReward', 0) or 0)

        # Safety cap for non-admin-initiated positive rewards.
        if not caller_is_admin and points_delta > max_single:
            points_delta = max_single

        # Never drive balance below zero.
        cur_points = float(u.get('points', 0) or 0)
        if cur_points + points_delta < 0:
            points_delta = -cur_points
        cur_xp = float(u.get('xp', 0) or 0)
        if cur_xp + xp_delta < 0:
            xp_delta = -cur_xp

        # ---- WRITES ----
        user_updates = {}
        if points_delta != 0: user_updates['points'] = firestore.Increment(points_delta)
        if xp_delta != 0: user_updates['xp'] = firestore.Increment(xp_delta)
        old_level = int(u.get('level', 1) or 1)
        new_level = calculate_level(cur_xp + xp_delta)
        if new_level != old_level: user_updates['level'] = new_level
        if user_updates:
            transaction.update(user_ref, user_updates)

        for ref, payload, merge in post_writes:
            transaction.set(ref, payload, merge=merge)

        if points_delta != 0:
            transaction.set(db.collection('system_config').document('global_metrics'),
                            {'totalPTSLiability': firestore.Increment(points_delta)}, merge=True)

        # Ledger + activity + notification written ATOMICALLY via the shared helper so all
        # four surfaces (Wallet, activity feed, Notifications, balance) stay in lockstep and
        # can never drift. Previously the ledger used 'createdAt' while the client reads
        # 'timestamp', and no activity/notification was written server-side at all.
        act_desc = data.get('description') or data.get('source') or ACTIVITY_LABELS.get(tx_type, 'Account Update')
        post_ledger(transaction, user_ref, user_id,
                    tx_type=tx_type, amount=points_delta, xp=xp_delta,
                    source=data.get('source') or ACTIVITY_LABELS.get(tx_type, 'Account Update'),
                    description=act_desc,
                    claim_id=claim_id, reference_id=data.get('referenceId'),
                    balance_after=cur_points + points_delta,
                    metadata=data.get('metadata') or {})

        transaction.set(claim_ref, {'userId': user_id, 'type': tx_type, 'amount': points_delta,
                                    'executedAt': firestore.SERVER_TIMESTAMP})
        return {"success": True, "oldLevel": old_level, "newLevel": new_level}

    try:
        res = process(db.transaction()); evaluate_missions(user_id); return jsonify(res)
    except Exception as e: return jsonify({"success": False, "error": str(e)}), 400

@app.route('/api/execute-prediction', methods=['POST'])
@verify_token
@require_db
def execute_prediction():
    db = get_db()
    data, user_id = request.json, request.json.get('userId')
    if request.user['uid'] != user_id and not is_admin(request.user['uid']): return jsonify({"success": False, "error": "Unauthorized"}), 403
    price = fetch_market_price(data.get('assetId'))
    if price is None: return jsonify({"success": False, "error": "PRICE_FEED_OFFLINE"}), 503
    claim_id = data.get('claimId')
    if not claim_id: return jsonify({"success": False, "error": "MISSING_CLAIM_ID"}), 400
    # Read win multiplier from economy config (server-authoritative, not client-sent).
    cfg_snap = db.collection('system_config').document('global_v1').get()
    cfg = cfg_snap.to_dict() if cfg_snap.exists else {}
    win_multiplier = float((cfg.get('rewards') or {}).get('predictionWinMultiplier', 2.0) or 2.0)
    @firestore.transactional
    def process(transaction):
        user_ref = db.collection('users').document(user_id)
        pred_ref = db.collection('user_predictions').document(claim_id)
        # Reads before writes.
        u_snap = user_ref.get(transaction=transaction)
        if not u_snap.exists: raise Exception("USER_NOT_FOUND")
        u_data = u_snap.to_dict() or {}
        # Idempotency: a given claimId may only ever create one prediction (prevents
        # replay double-debits).
        if pred_ref.get(transaction=transaction).exists: raise Exception("DUPLICATE_CLAIM")
        amt = data.get('amount', 0)
        if not isinstance(amt, (int, float)) or amt <= 0: raise Exception("INVALID_AMOUNT")
        cur_points = float(u_data.get('points', 0) or 0)
        if cur_points < amt: raise Exception("INSUFFICIENT_FUNDS")
        symbol = (data.get('symbol') or '').upper()
        transaction.update(user_ref, {'points': firestore.Increment(-amt)})
        transaction.set(db.collection('system_config').document('global_metrics'), {'totalPTSLiability': firestore.Increment(-amt)}, merge=True)
        # Server-authoritative reward calculation — win_multiplier read from config above.
        transaction.set(pred_ref, {
            'userId': user_id, 'assetId': data.get('assetId'), 'symbol': data.get('symbol'),
            'direction': data.get('direction'), 'stakeAmount': amt, 'entryPrice': price,
            'rewardAmount': round(amt * win_multiplier), 'status': 'ACTIVE',
            'createdAt': firestore.SERVER_TIMESTAMP
        })
        # Ledger + activity written atomically so the stake debit is visible in the Wallet
        # (transactions) and the activity feed. notify=False: the user just placed this bet
        # themselves, so a push notification would be redundant noise (settlement DOES notify).
        post_ledger(transaction, user_ref, user_id,
                    tx_type='prediction_stake', amount=-amt, xp=0,
                    source='Forecast Stake', description=f"Placed forecast on {symbol}",
                    claim_id=claim_id, reference_id=claim_id,
                    balance_after=cur_points - amt,
                    activity_type='prediction_placed',
                    metadata={'assetId': data.get('assetId'), 'symbol': data.get('symbol'),
                              'direction': data.get('direction'), 'entryPrice': price,
                              'stakeAmount': amt, 'predictionStatus': 'ACTIVE'},
                    notify=False)
        return {"success": True}
    try:
        res = process(db.transaction()); evaluate_missions(user_id); return jsonify(res)
    except Exception as e: return jsonify({"success": False, "error": str(e)}), 400

@app.route('/api/resolve-prediction', methods=['POST'])
@verify_token
@require_db
def resolve_prediction():
    # Market resolution credits points to users — admin authority required.
    # Moderators can view predictions but cannot settle them.
    db = get_db()
    if not is_admin(request.user['uid']): return jsonify({"success": False, "error": "Forbidden"}), 403
    pred_id = request.json.get('predictionId')
    if not pred_id: return jsonify({"success": False, "error": "MISSING_PREDICTION_ID"}), 400
    pred_ref = db.collection('user_predictions').document(pred_id)
    pred_snap = pred_ref.get()
    if not pred_snap.exists: return jsonify({"success": False, "error": "PREDICTION_NOT_FOUND"}), 404
    pred_data = pred_snap.to_dict()
    if not pred_data or 'assetId' not in pred_data: return jsonify({"success": False, "error": "INVALID_PREDICTION_DATA"}), 400
    price = fetch_market_price(pred_data['assetId'])
    if price is None: return jsonify({"success": False, "error": "PRICE_FEED_OFFLINE"}), 503
    # Read win multiplier from authoritative config (same source as placement).
    cfg_snap = db.collection('system_config').document('global_v1').get()
    cfg = cfg_snap.to_dict() if cfg_snap.exists else {}
    win_multiplier = float((cfg.get('rewards') or {}).get('predictionWinMultiplier', 2.0) or 2.0)
    @firestore.transactional
    def process(transaction):
        p = pred_ref.get(transaction=transaction).to_dict()
        if p['status'] != 'ACTIVE': raise Exception("ALREADY_RESOLVED")
        user_ref = db.collection('users').document(p['userId'])
        # Read the user (before any write) so we can record an accurate running balance.
        u_snap = user_ref.get(transaction=transaction)
        cur_points = float((u_snap.to_dict() or {}).get('points', 0) or 0) if u_snap.exists else 0.0
        win = (price > p['entryPrice']) if p['direction'] == 'UP' else (price < p['entryPrice'])
        payout = p['stakeAmount'] * win_multiplier if win else 0
        symbol = (p.get('symbol') or '').upper()
        outcome = 'won' if win else 'lost'
        transaction.update(user_ref, {'points': firestore.Increment(payout)})
        transaction.set(db.collection('system_config').document('global_metrics'), {'totalPTSLiability': firestore.Increment(payout)}, merge=True)
        transaction.update(pred_ref, {
            'status': 'RESOLVED', 'exitPrice': price,
            'rewardAmount': payout, 'resolvedAt': firestore.SERVER_TIMESTAMP
        })
        # Settlement ledger + activity + notification written atomically. The user is not
        # watching when a moderator resolves the market, so a notification IS appropriate here.
        post_ledger(transaction, user_ref, p['userId'],
                    tx_type='prediction_reward', amount=payout, xp=0,
                    source='Forecast Settlement', description=f"Forecast {outcome} on {symbol}",
                    claim_id=f"resolve_{pred_id}", reference_id=pred_id,
                    balance_after=cur_points + payout,
                    activity_type='prediction_settled',
                    metadata={'win': win, 'exitPrice': price, 'entryPrice': p.get('entryPrice'),
                              'stakeAmount': p.get('stakeAmount'), 'symbol': p.get('symbol'),
                              'predictionStatus': 'RESOLVED'})
        return {"success": True, "win": win, "userId": p['userId']}
    try:
        res = process(db.transaction()); evaluate_missions(res['userId']); return jsonify(res)
    except Exception as e: return jsonify({"success": False, "error": str(e)}), 400

@app.route('/api/referrals/lookup', methods=['POST'])
@verify_token
@require_db
def lookup():
    db = get_db()
    code = request.json.get('referralCode')
    docs = db.collection('users').where('referralCode', '==', code).limit(1).get()
    if not docs: return jsonify({"success": False, "error": "INVALID_CODE"}), 404
    return jsonify({"success": True, "referrerId": docs[0].id, "username": docs[0].to_dict().get('username')})

@app.route('/api/check-referral-sanity', methods=['POST'])
@verify_token
@require_db
def check_referral_sanity():
    """Server-side referral sanity check. Writes fraudFlags/riskScore via Admin SDK only."""
    db = get_db()
    referrer_id = request.json.get('referrerId')
    referee_id = request.json.get('refereeId')
    if not referrer_id or not referee_id:
        return jsonify({"success": True, "passed": True})
    try:
        referrer_snap = db.collection('users').document(referrer_id).get()
        referee_snap = db.collection('users').document(referee_id).get()
        if not referrer_snap.exists or not referee_snap.exists:
            return jsonify({"success": True, "passed": False})
        referrer = referrer_snap.to_dict() or {}
        referee = referee_snap.to_dict() or {}
        # Same-device check — written server-side so Firestore rules are satisfied
        if (referrer.get('fingerprint') and referee.get('fingerprint') and
                referrer['fingerprint'] == referee['fingerprint']):
            db.collection('users').document(referee_id).update({
                'fraudFlags': firestore.ArrayUnion(['SAME_DEVICE_REFERRAL']),
                'riskScore': firestore.Increment(30)
            })
            db.collection('system_anomalies').add({
                'type': 'SAME_DEVICE_REFERRAL',
                'referrerId': referrer_id,
                'refereeId': referee_id,
                'timestamp': firestore.SERVER_TIMESTAMP
            })
            return jsonify({"success": True, "passed": False})
        return jsonify({"success": True, "passed": True})
    except Exception as e:
        return jsonify({"success": True, "passed": True, "error": str(e)})


@app.route('/api/admin/promote-moderator', methods=['POST'])
@verify_token
@require_db
def promote():
    if not is_admin(request.user['uid']): return jsonify({"success": False}), 403
    db = get_db()
    target_id = request.json.get('userId')
    if not target_id:
        return jsonify({"success": False, "error": "MISSING_USER_ID"}), 400
    target_snap = db.collection('users').document(target_id).get()
    if not target_snap.exists:
        return jsonify({"success": False, "error": "USER_NOT_FOUND"}), 404
    target_data = target_snap.to_dict() or {}
    if target_data.get('role') == 'admin':
        return jsonify({"success": False, "error": "CANNOT_DEMOTE_ADMIN"}), 400
    db.collection('users').document(target_id).update({'role': 'moderator'})
    # Audit log
    try:
        db.collection('system_audit').add({
            'action': 'MODERATOR_PROMOTED',
            'targetUserId': target_id,
            'targetUsername': target_data.get('username', ''),
            'performedBy': request.user['uid'],
            'timestamp': firestore.SERVER_TIMESTAMP
        })
    except Exception:
        pass
    return jsonify({"success": True})

@app.route('/api/admin/demote-moderator', methods=['POST'])
@verify_token
@require_db
def demote():
    """Revoke moderator access — admin only. Cannot demote another admin."""
    if not is_admin(request.user['uid']): return jsonify({"success": False}), 403
    db = get_db()
    target_id = request.json.get('userId')
    if not target_id:
        return jsonify({"success": False, "error": "MISSING_USER_ID"}), 400
    target_snap = db.collection('users').document(target_id).get()
    if not target_snap.exists:
        return jsonify({"success": False, "error": "USER_NOT_FOUND"}), 404
    target_data = target_snap.to_dict() or {}
    if target_data.get('role') == 'admin':
        return jsonify({"success": False, "error": "CANNOT_DEMOTE_ADMIN"}), 400
    db.collection('users').document(target_id).update({'role': 'user'})
    # Audit log
    try:
        db.collection('system_audit').add({
            'action': 'MODERATOR_DEMOTED',
            'targetUserId': target_id,
            'targetUsername': target_data.get('username', ''),
            'performedBy': request.user['uid'],
            'timestamp': firestore.SERVER_TIMESTAMP
        })
    except Exception:
        pass
    return jsonify({"success": True})

@app.route('/api/admin/delete-user', methods=['POST'])
@verify_token
@require_db
def delete_user():
    if not is_admin(request.user['uid']): return jsonify({"success": False}), 403
    target = request.json.get('userId')
    if not target: return jsonify({"success": False, "error": "MISSING_USER_ID"}), 400
    db = get_db()
    errors = {}
    # Remove the Firestore profile so no orphaned/ghost user document remains.
    try:
        db.collection('users').document(target).delete()
    except Exception as e:
        errors['firestore'] = str(e)
    # Remove the Auth account (tolerate a missing account so cleanup is idempotent).
    try:
        auth.delete_user(target)
    except Exception as e:
        msg = str(e)
        if 'USER_NOT_FOUND' not in msg and 'no user record' not in msg.lower():
            errors['auth'] = msg
    if errors:
        return jsonify({"success": False, "error": "PARTIAL_DELETE", "details": errors}), 500
    return jsonify({"success": True})

@app.route('/api/admin/verify-user', methods=['POST'])
@verify_token
@require_db
def verify_user():
    if not is_moderator(request.user['uid']): return jsonify({"success": False}), 403
    auth.update_user(request.json.get('userId'), email_verified=True)
    return jsonify({"success": True})

EMAIL_FROM = "PulseEarn <hello@pulseearn.online>"

def send_branded_email(to, template, context, subject):
    init_firebase()
    key = os.environ.get('RESEND_API_KEY')
    if not key:
        print("[email] RESEND_API_KEY missing; cannot send", flush=True)
        return False
    try:
        path = os.path.join(os.path.dirname(__file__), 'templates', f'{template}.html')
        with open(path, 'r') as f: content = f.read()
        # 'link' values are Firebase-signed URLs — do NOT html.escape them as that converts
        # '&' → '&amp;' and breaks the URL. Only escape plaintext values (username, etc.).
        for k, v in context.items():
            safe_v = str(v) if k == 'link' else html.escape(str(v))
            content = content.replace(f'{{{{{k}}}}}', safe_v)
        res = requests.post("https://api.resend.com/emails",
                            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                            json={"from": EMAIL_FROM, "to": [to], "subject": subject, "html": content}, timeout=15)
        if res.status_code in (200, 201):
            return True
        # Surface the real failure (e.g. unverified domain, invalid key) instead of swallowing it.
        print(f"[email] Resend send failed template={template} status={res.status_code} body={res.text[:300]}", flush=True)
        return False
    except Exception as e:
        print(f"[email] Resend send exception template={template}: {e}", flush=True)
        return False

@app.route('/api/auth/send-verification', methods=['POST'])
@verify_token
@require_db
def send_v():
    u = request.user
    db = get_db(); user_data = db.collection('users').document(u['uid']).get().to_dict()
    link = auth.generate_email_verification_link(u['email'], auth.ActionCodeSettings(url='https://pulseearn.online/auth/action', handle_code_in_app=True))
    if send_branded_email(u['email'], 'VerifyEmail', {'username': user_data.get('username','Member'), 'link': link}, "Verify your PulseEarn account"):
        return jsonify({"success": True})
    return jsonify({"success": False}), 500

# --- Frontend-contract endpoints (previously missing -> 404) ---

@app.route('/api/authorize-resend', methods=['POST'])
@verify_token
@require_db
def authorize_resend():
    """Server-authoritative resend of the email-verification link with a cooldown.
    Matches VerifyEmail.tsx contract: success / dispatchMethod / COOLDOWN_ACTIVE+retryAfter."""
    db = get_db()
    u = request.user
    uid = u['uid']
    email = u.get('email')
    user_ref = db.collection('users').document(uid)
    snap = user_ref.get()
    user_data = snap.to_dict() if snap.exists else {}

    COOLDOWN = 60
    last = user_data.get('lastVerificationSentAt')
    now = datetime.now(timezone.utc)
    if isinstance(last, datetime):
        try:
            elapsed = (now - last).total_seconds()
            if 0 <= elapsed < COOLDOWN:
                retry = int(COOLDOWN - elapsed)
                return jsonify({
                    "success": False, "error": "COOLDOWN_ACTIVE",
                    "retryAfter": str(retry),
                    "message": f"Please wait {retry}s before resending."
                }), 429
        except Exception:
            pass

    if not email:
        return jsonify({"success": False, "error": "NO_EMAIL", "message": "No email on account."}), 400

    # No Resend key configured -> instruct client to dispatch via Firebase client SDK.
    if not os.environ.get('RESEND_API_KEY'):
        user_ref.set({'lastVerificationSentAt': firestore.SERVER_TIMESTAMP}, merge=True)
        return jsonify({"success": True, "dispatchMethod": "client_fallback"})

    try:
        link = auth.generate_email_verification_link(
            email, auth.ActionCodeSettings(url='https://pulseearn.online/auth/action', handle_code_in_app=True))
        sent = send_branded_email(email, 'VerifyEmail',
                                  {'username': user_data.get('username', 'Member'), 'link': link},
                                  "Verify your PulseEarn account")
        if sent:
            user_ref.set({'lastVerificationSentAt': firestore.SERVER_TIMESTAMP}, merge=True)
            return jsonify({"success": True, "dispatchMethod": "server"})
        return jsonify({"success": False, "error": "DISPATCH_FAILED",
                        "message": "Failed to send verification email."}), 500
    except Exception as e:
        return jsonify({"success": False, "error": "DISPATCH_ERROR", "message": str(e)}), 500

@app.route('/api/request-password-reset', methods=['POST'])
@require_db
def request_password_reset():
    """Server-authoritative password reset that sends the BRANDED PulseEarn email via Resend
    instead of Firebase's default template (which leaked the raw project id, e.g.
    'Reset your password for project-867830834697', and a firebaseapp.com link).

    Runs UNAUTHENTICATED (the user is logged out) and is hardened against account enumeration:
    it always returns success=True regardless of whether the address exists, and only actually
    dispatches an email when a matching user is found. A per-user cooldown throttles abuse.
    """
    db = get_db()
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    # Generic response reused everywhere so callers cannot distinguish existing vs unknown emails.
    generic_ok = {"success": True,
                  "message": "If an account exists for that address, a reset link has been sent."}

    if not email or '@' not in email:
        return jsonify({"success": False, "error": "INVALID_EMAIL",
                        "message": "Please enter a valid email address."}), 400

    # No Resend key -> tell the client to dispatch via the Firebase client SDK (keeps reset
    # working even if branded email is unavailable). Still generic to avoid enumeration.
    if not os.environ.get('RESEND_API_KEY'):
        return jsonify({"success": True, "dispatchMethod": "client_fallback", **generic_ok})

    try:
        user_record = auth.get_user_by_email(email)
    except Exception:
        # Unknown address (or lookup error): pretend success, send nothing.
        return jsonify(generic_ok)

    # Per-user cooldown (best-effort; never blocks the generic response contract).
    uid = user_record.uid
    user_ref = db.collection('users').document(uid)
    snap = user_ref.get()
    user_data = snap.to_dict() if snap.exists else {}
    COOLDOWN = 60
    last = user_data.get('lastPasswordResetSentAt')
    if isinstance(last, datetime):
        try:
            elapsed = (datetime.now(timezone.utc) - last).total_seconds()
            if 0 <= elapsed < COOLDOWN:
                return jsonify({"success": True, "throttled": True, **generic_ok})
        except Exception:
            pass

    try:
        link = auth.generate_password_reset_link(
            email, auth.ActionCodeSettings(url='https://pulseearn.online/auth/action',
                                           handle_code_in_app=True))
        username = user_data.get('username') or (user_record.display_name or 'Member')
        sent = send_branded_email(email, 'ResetPassword',
                                  {'username': username, 'link': link},
                                  "Reset your PulseEarn password")
        if sent:
            user_ref.set({'lastPasswordResetSentAt': firestore.SERVER_TIMESTAMP}, merge=True)
            return jsonify({"success": True, "dispatchMethod": "server", **generic_ok})
        # Branded send failed -> let the client fall back to Firebase so the user is never stuck.
        return jsonify({"success": True, "dispatchMethod": "client_fallback", **generic_ok})
    except Exception:
        return jsonify({"success": True, "dispatchMethod": "client_fallback", **generic_ok})

@app.route('/api/evaluate-user-integrity', methods=['POST'])
@verify_token
@require_db
def evaluate_user_integrity():
    """Server-side fraud/integrity scoring. Matches FraudEngine.evaluateUserIntegrity contract."""
    db = get_db()
    data = request.json or {}
    user_id = data.get('userId')
    fingerprint = data.get('fingerprint')
    caller = request.user['uid']
    if not user_id:
        return jsonify({"success": False, "error": "MISSING_USER_ID"}), 400
    if caller != user_id and not is_admin(caller):
        return jsonify({"success": False, "error": "Unauthorized"}), 403

    user_ref = db.collection('users').document(user_id)
    if not user_ref.get().exists:
        return jsonify({"success": False, "error": "USER_NOT_FOUND"}), 404

    risk_added, flags = 0, []
    try:
        if fingerprint:
            dupes = db.collection('users').where('fingerprint', '==', fingerprint).limit(10).get()
            others = [d.id for d in dupes if d.id != user_id]
            if others:
                risk_added = 25
                flags.append('SHARED_DEVICE_FINGERPRINT')
        update = {'lastIntegrityCheck': firestore.SERVER_TIMESTAMP}
        if fingerprint:
            update['fingerprint'] = fingerprint
        if risk_added:
            update['riskScore'] = firestore.Increment(risk_added)
            update['fraudFlags'] = firestore.ArrayUnion(flags)
        user_ref.set(update, merge=True)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

    return jsonify({"success": True, "riskAdded": risk_added, "flags": flags})

@app.route('/api/process-referral-reward', methods=['POST'])
@verify_token
@require_db
def process_referral_reward():
    """Server-authoritative referral reward. Matches ReferralProtectionEngine contract.
    Idempotent: transitions the referral REGISTERED -> QUALIFIED exactly once."""
    db = get_db()
    data = request.json or {}
    referral_doc_id = data.get('referralDocId')
    referrer_id = data.get('referrerId')
    referee_id = data.get('refereeId')
    caller = request.user['uid']

    if not referral_doc_id or not referrer_id or not referee_id:
        return jsonify({"success": False, "error": "MISSING_PARAMETERS"}), 400
    if caller not in (referrer_id, referee_id) and not is_admin(caller):
        return jsonify({"success": False, "error": "Unauthorized"}), 403

    cfg_snap = db.collection('system_config').document('global_v1').get()
    rewards = (cfg_snap.to_dict() or {}).get('rewards', {}) if cfg_snap.exists else {}
    points = rewards.get('referralBonusPoints', 50)
    xp = rewards.get('referralBonusXP', 50)

    ref_ref = db.collection('referrals').document(referral_doc_id)
    referrer_ref = db.collection('users').document(referrer_id)

    @firestore.transactional
    def process(transaction):
        ref_snap = ref_ref.get(transaction=transaction)
        if not ref_snap.exists: raise Exception("REFERRAL_NOT_FOUND")
        r = ref_snap.to_dict()
        if r.get('refereeId') != referee_id or r.get('referrerId') != referrer_id:
            raise Exception("REFERRAL_MISMATCH")
        if r.get('rewarded') or r.get('status') == 'QUALIFIED':
            return {"success": True, "alreadyRewarded": True}
        if r.get('status') != 'REGISTERED':
            raise Exception("INVALID_REFERRAL_STATE")
        referrer_snap = referrer_ref.get(transaction=transaction)
        if not referrer_snap.exists:
            raise Exception("REFERRER_NOT_FOUND")
        referrer_points = float((referrer_snap.to_dict() or {}).get('points', 0) or 0)
        transaction.update(referrer_ref, {
            'points': firestore.Increment(points),
            'xp': firestore.Increment(xp),
            'stats.referralsConverted': firestore.Increment(1)
        })
        transaction.set(db.collection('system_config').document('global_metrics'),
                        {'totalPTSLiability': firestore.Increment(points)}, merge=True)
        transaction.update(ref_ref, {
            'status': 'QUALIFIED', 'rewarded': True,
            'rewardPoints': points, 'rewardXP': xp,
            'qualifiedAt': firestore.SERVER_TIMESTAMP, 'updatedAt': firestore.SERVER_TIMESTAMP
        })
        # Ledger + activity + notification for the referrer, written atomically so the referral
        # bonus shows up in the Wallet, activity feed, and Notifications. Previously the balance
        # moved with no ledger trail, timeline entry, or alert.
        referee_name = r.get('refereeUsername') or r.get('refereeEmail') or 'a new member'
        post_ledger(transaction, referrer_ref, referrer_id,
                    tx_type='referral_bonus', amount=points, xp=xp,
                    source='Referral Reward', description=f"Referral bonus for {referee_name}",
                    claim_id=f"referral_{referral_doc_id}", reference_id=referral_doc_id,
                    balance_after=referrer_points + points,
                    activity_type='referral_reward_earned',
                    metadata={'refereeId': referee_id, 'referralDocId': referral_doc_id, 'xpEarned': xp})
        return {"success": True, "alreadyRewarded": False, "points": points, "xp": xp}

    try:
        res = process(db.transaction())
        evaluate_missions(referrer_id)
        return jsonify(res)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route('/api/internal/deploy-firebase-config', methods=['POST'])
@require_db
def deploy_firebase_config():
    """
    ONE-TIME ENDPOINT — deploys Firestore rules, indexes, and Storage rules
    via Firebase Management REST API using the already-initialized service account.
    Protected by a deploy secret. REMOVE THIS ENDPOINT AFTER USE.
    """
    import time, base64

    # Validate deploy secret header
    deploy_secret = os.environ.get('DEPLOY_SECRET', '')
    provided = request.headers.get('X-Deploy-Secret', '')
    if not deploy_secret or provided != deploy_secret:
        return jsonify({"success": False, "error": "Forbidden"}), 403

    results = {}
    project_id = get_project_id()

    try:
        # Get an access token from the service account using google-auth
        import google.auth
        import google.auth.transport.requests
        from google.oauth2 import service_account as sa_module

        sa_data, _ = _load_service_account()
        if not sa_data:
            return jsonify({"success": False, "error": "No service account credentials found"}), 500

        scopes = [
            'https://www.googleapis.com/auth/cloud-platform',
            'https://www.googleapis.com/auth/firebase',
        ]
        credentials = sa_module.Credentials.from_service_account_info(sa_data, scopes=scopes)
        auth_req = google.auth.transport.requests.Request()
        credentials.refresh(auth_req)
        token = credentials.token

        headers_auth = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
            'x-goog-user-project': project_id,
        }

        # ── 1. Deploy Firestore Rules ─────────────────────────────────────
        firestore_rules_source = r"""rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() { return request.auth != null; }
    function isOwner(userId) { return isAuthenticated() && request.auth.uid == userId; }
    function isAdmin() {
      return isAuthenticated() && (
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'ADMIN' ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isRoot == true
      );
    }
    function isModerator() {
      return isAuthenticated() && (
        isAdmin() ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'moderator'
      );
    }
    match /users/{userId} {
      allow read: if isOwner(userId) || isModerator();
      allow list: if isModerator();
      allow create: if isOwner(userId) && request.resource.data.role == 'user' && request.resource.data.points == 0 && request.resource.data.xp == 0 && request.resource.data.isBanned == false;
      allow update: if isAdmin() || (isOwner(userId) && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['username','avatarUrl','bio','preferences','onboardingCompleted','avatar','fingerprint','lastSeen','lastActionTimestamp']));
      allow delete: if isAdmin();
      match /transactions/{txId} { allow read: if isOwner(userId) || isAdmin(); allow write: if isAdmin(); }
      match /notifications/{notifId} { allow read: if isOwner(userId) || isAdmin(); allow write: if isOwner(userId) || isAdmin(); }
      match /task_history/{histId} { allow read: if isOwner(userId) || isAdmin(); allow write: if isAdmin(); }
      match /activities/{actId} { allow read: if isOwner(userId) || isAdmin(); allow write: if isAdmin(); }
      match /user_tasks/{taskId} { allow read: if isOwner(userId) || isAdmin(); allow write: if isAdmin(); }
      match /campaign_participation/{campaignId} { allow read: if isOwner(userId) || isAdmin(); allow write: if isOwner(userId) || isAdmin(); }
    }
    match /system_config/{configId} { allow read: if isAuthenticated(); allow write: if isAdmin(); }
    match /system_claims/{claimId} {
      allow read: if isAuthenticated() && (resource == null || resource.data.userId == request.auth.uid || isAdmin());
      allow create: if isAdmin(); allow list: if isAdmin(); allow update, delete: if isAdmin();
    }
    match /campaigns/{campaignId} {
      allow read, list: if isAuthenticated();
      allow update: if isAdmin() || (isAuthenticated() && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['participantsCount']) && request.time > resource.data.updatedAt + duration.value(5,'s'));
      allow write: if isAdmin();
    }
    match /tasks/{taskId} {
      allow read, list: if isAuthenticated();
      allow update: if isAdmin() || (isAuthenticated() && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['completionCount','totalDistributed','totalClaims']) && request.time > resource.data.updatedAt + duration.value(5,'s'));
      allow write: if isAdmin();
    }
    match /task_claims/{claimId} {
      allow read: if isAuthenticated(); allow list: if isModerator();
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid && request.resource.data.validationState == 'PENDING';
      allow update, delete: if isModerator();
    }
    match /system_task_definitions/{id} { allow read, list: if isAuthenticated(); allow write: if isAdmin(); }
    match /user_system_tasks/{id} {
      allow read: if isAuthenticated() && (resource == null || resource.data.userId == request.auth.uid || isAdmin());
      allow list: if isAdmin() || (isAuthenticated() && request.query.filters.userId == request.auth.uid);
      allow write: if isAdmin();
    }
    match /user_predictions/{predictionId} {
      allow read: if isAuthenticated() && (resource == null || resource.data.userId == request.auth.uid || isAdmin());
      allow list: if isAdmin() || (isAuthenticated() && request.query.filters.userId == request.auth.uid);
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update: if isAdmin(); allow delete: if isAdmin();
    }
    match /referrals/{referralId} {
      allow read: if isAuthenticated() && (resource == null || resource.data.referrerId == request.auth.uid || resource.data.refereeId == request.auth.uid || isAdmin());
      allow list: if isAdmin() || (isAuthenticated() && (request.query.filters.referrerId == request.auth.uid || request.query.filters.refereeId == request.auth.uid));
      allow create: if isAuthenticated() && request.resource.data.refereeId == request.auth.uid;
      allow update: if isAdmin() || (isAuthenticated() && (resource.data.referrerId == request.auth.uid || resource.data.refereeId == request.auth.uid) && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['updatedAt','metadata']));
      allow delete: if isAdmin();
    }
    match /support_tickets/{ticketId} {
      allow read: if isAuthenticated() && (resource == null || resource.data.userId == request.auth.uid || isAdmin());
      allow list: if isAuthenticated() && (request.query.filters.userId == request.auth.uid || isAdmin());
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update: if isAdmin() || (isAuthenticated() && resource.data.userId == request.auth.uid && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['lastMessage','updatedAt','attachments']));
      allow delete: if isAdmin();
      match /support_messages/{msgId} {
        allow read: if isAuthenticated() && (get(/databases/$(database)/documents/support_tickets/$(ticketId)).data.userId == request.auth.uid || isAdmin());
        allow create: if isAuthenticated() && (get(/databases/$(database)/documents/support_tickets/$(ticketId)).data.userId == request.auth.uid || isAdmin());
      }
    }
    match /withdrawals/{withdrawalId} {
      allow read: if isAuthenticated() && (resource == null || resource.data.userId == request.auth.uid || isAdmin());
      allow list: if isAdmin(); allow create: if false; allow update: if isAdmin(); allow delete: if isAdmin();
    }
    match /system_anomalies/{id} { allow read, list: if isAdmin(); allow create: if false; allow update, delete: if false; }
    match /system_audit/{id} { allow read, list: if isAdmin(); allow create: if isAdmin(); allow update, delete: if false; }
    match /system_security/{id} { allow read, write: if isAdmin(); }
    match /system_uploads/{id} { allow read: if isAuthenticated() && (resource == null || resource.data.userId == request.auth.uid || isAdmin()); allow create: if isAuthenticated(); }
    match /system_fingerprints/{id} { allow read, list: if isAdmin(); allow create, update: if isAuthenticated() && id.startsWith(request.auth.uid); allow delete: if isAdmin(); }
    match /broadcasts/{id} { allow read, list: if isAuthenticated(); allow write: if isAdmin(); }
  }
}"""

        rules_payload = {
            "source": {
                "files": [{"name": "firestore.rules", "content": firestore_rules_source}]
            }
        }
        r1 = requests.post(
            f'https://firebaserules.googleapis.com/v1/projects/{project_id}/rulesets',
            headers=headers_auth,
            json=rules_payload,
            timeout=30
        )
        results['rules_create'] = r1.status_code

        if r1.status_code in (200, 201):
            ruleset_name = r1.json().get('name', '')
            # Apply the new ruleset to the Firestore release
            release_payload = {"rulesetName": ruleset_name}
            r2 = requests.patch(
                f'https://firebaserules.googleapis.com/v1/projects/{project_id}/releases/cloud.firestore',
                headers=headers_auth,
                json=release_payload,
                timeout=30
            )
            results['rules_release'] = r2.status_code
            results['rules_ok'] = r2.status_code in (200, 201)
        else:
            results['rules_error'] = r1.text[:300]
            results['rules_ok'] = False

        # ── 2. Deploy Storage Rules ───────────────────────────────────────
        storage_rules_source = r"""rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isAuthenticated() { return request.auth != null; }
    function getUserData() { return firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data; }
    function isAdmin() { return isAuthenticated() && (getUserData().role == 'admin' || getUserData().role == 'ADMIN' || getUserData().isRoot == true); }
    function isModerator() { return isAuthenticated() && (isAdmin() || getUserData().role == 'moderator'); }
    function isOwner(userId) { return isAuthenticated() && request.auth.uid == userId; }
    match /users/{userId}/avatars/{allPaths=**} {
      allow read: if isAuthenticated();
      allow write: if (isOwner(userId) || isAdmin()) && request.resource.size < 2 * 1024 * 1024 && request.resource.contentType.matches('image/.*');
    }
    match /support_tickets/{ticketId}/{allPaths=**} {
      allow read: if isAuthenticated() && (firestore.get(/databases/(default)/documents/support_tickets/$(ticketId)).data.userId == request.auth.uid || isModerator());
      allow write: if isAuthenticated() && (firestore.get(/databases/(default)/documents/support_tickets/$(ticketId)).data.userId == request.auth.uid || isModerator()) && request.resource.size < 5 * 1024 * 1024 && request.resource.contentType.matches('image/.*|application/pdf');
    }
    match /task_claims/{claimId}/{allPaths=**} {
      allow read: if isModerator() || (isAuthenticated() && firestore.get(/databases/(default)/documents/task_claims/$(claimId)).data.userId == request.auth.uid);
      allow write: if isAuthenticated() && (firestore.get(/databases/(default)/documents/task_claims/$(claimId)).data.userId == request.auth.uid || isModerator()) && request.resource.size < 5 * 1024 * 1024 && request.resource.contentType.matches('image/.*');
    }
    match /campaigns/{campaignId}/{allPaths=**} {
      allow read: if isAuthenticated();
      allow write: if isAdmin() && request.resource.size < 10 * 1024 * 1024 && request.resource.contentType.matches('image/.*');
    }
    match /system/{allPaths=**} { allow read: if isAuthenticated(); allow write: if isAdmin(); }
  }
}"""

        storage_rules_payload = {
            "source": {
                "files": [{"name": "storage.rules", "content": storage_rules_source}]
            }
        }
        r3 = requests.post(
            f'https://firebaserules.googleapis.com/v1/projects/{project_id}/rulesets',
            headers=headers_auth,
            json=storage_rules_payload,
            timeout=30
        )
        results['storage_rules_create'] = r3.status_code

        if r3.status_code in (200, 201):
            storage_ruleset_name = r3.json().get('name', '')
            bucket = get_storage_bucket_name()
            encoded_bucket = bucket.replace('.', '%2E').replace('/', '%2F')
            r4 = requests.patch(
                f'https://firebaserules.googleapis.com/v1/projects/{project_id}/releases/firebase.storage%2F{encoded_bucket}',
                headers=headers_auth,
                json={"rulesetName": storage_ruleset_name},
                timeout=30
            )
            # If the specific bucket release doesn't exist, create it
            if r4.status_code == 404:
                r4 = requests.post(
                    f'https://firebaserules.googleapis.com/v1/projects/{project_id}/releases',
                    headers=headers_auth,
                    json={"name": f"projects/{project_id}/releases/firebase.storage/{bucket}", "rulesetName": storage_ruleset_name},
                    timeout=30
                )
            results['storage_release'] = r4.status_code
            results['storage_ok'] = r4.status_code in (200, 201)
        else:
            results['storage_error'] = r3.text[:300]
            results['storage_ok'] = False

        # ── 3. Deploy Firestore Indexes ───────────────────────────────────
        indexes_to_create = [
            {"collectionGroup":"task_claims","queryScope":"COLLECTION","fields":[{"fieldPath":"userId","order":"ASCENDING"},{"fieldPath":"createdAt","order":"DESCENDING"}]},
            {"collectionGroup":"task_claims","queryScope":"COLLECTION","fields":[{"fieldPath":"validationState","order":"ASCENDING"},{"fieldPath":"createdAt","order":"DESCENDING"}]},
            {"collectionGroup":"user_predictions","queryScope":"COLLECTION","fields":[{"fieldPath":"userId","order":"ASCENDING"},{"fieldPath":"createdAt","order":"DESCENDING"}]},
            {"collectionGroup":"user_predictions","queryScope":"COLLECTION","fields":[{"fieldPath":"taskId","order":"ASCENDING"},{"fieldPath":"status","order":"ASCENDING"}]},
            {"collectionGroup":"referrals","queryScope":"COLLECTION","fields":[{"fieldPath":"referrerId","order":"ASCENDING"},{"fieldPath":"createdAt","order":"DESCENDING"}]},
            {"collectionGroup":"referrals","queryScope":"COLLECTION","fields":[{"fieldPath":"refereeId","order":"ASCENDING"},{"fieldPath":"status","order":"ASCENDING"}]},
            {"collectionGroup":"withdrawals","queryScope":"COLLECTION","fields":[{"fieldPath":"status","order":"ASCENDING"},{"fieldPath":"createdAt","order":"DESCENDING"}]},
            {"collectionGroup":"users","queryScope":"COLLECTION","fields":[{"fieldPath":"role","order":"ASCENDING"},{"fieldPath":"createdAt","order":"DESCENDING"}]},
            {"collectionGroup":"system_audit","queryScope":"COLLECTION","fields":[{"fieldPath":"action","order":"ASCENDING"},{"fieldPath":"timestamp","order":"DESCENDING"}]},
            {"collectionGroup":"system_anomalies","queryScope":"COLLECTION","fields":[{"fieldPath":"userId","order":"ASCENDING"},{"fieldPath":"timestamp","order":"DESCENDING"}]},
        ]

        index_results = []
        for idx in indexes_to_create:
            ri = requests.post(
                f'https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/collectionGroups/{idx["collectionGroup"]}/indexes',
                headers=headers_auth,
                json={"queryScope": idx["queryScope"], "fields": idx["fields"]},
                timeout=20
            )
            # 200/201 = created, 409 = already exists (fine)
            index_results.append({
                "collection": idx["collectionGroup"],
                "fields": [f["fieldPath"] for f in idx["fields"]],
                "status": ri.status_code,
                "ok": ri.status_code in (200, 201, 409)
            })

        results['indexes'] = index_results
        results['indexes_ok'] = all(i['ok'] for i in index_results)
        results['success'] = results.get('rules_ok') and results.get('storage_ok') and results.get('indexes_ok')

    except Exception as e:
        return jsonify({"success": False, "error": str(e), "partial": results}), 500

    return jsonify(results)


get_deps()
if CORS: CORS(app, resources={r"/api/*": {"origins": "*"}})
if __name__ == '__main__': app.run(debug=True, port=5000)
