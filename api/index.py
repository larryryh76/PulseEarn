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
            transaction.update(db.collection('system_config').document('global_metrics'), {'totalPTSLiability': firestore.Increment(pts)})
            transaction.set(ut_ref, {'taskId': task_id, 'status': 'completed',
                                     'lastCompleted': firestore.SERVER_TIMESTAMP,
                                     'totalCompletions': firestore.Increment(1)}, merge=True)
            transaction.set(task_ref, {'totalClaims': firestore.Increment(1),
                                       'completionCount': firestore.Increment(1)}, merge=True)
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
            transaction.update(db.collection('system_config').document('global_metrics'),
                               {'totalPTSLiability': firestore.Increment(points_delta)})

        # Immutable ledger entry for auditability.
        transaction.set(user_ref.collection('transactions').document(), {
            'type': tx_type, 'amount': points_delta, 'xp': xp_delta,
            'source': data.get('source'), 'description': data.get('description'),
            'claimId': claim_id, 'referenceId': data.get('referenceId'),
            'balanceAfter': cur_points + points_delta,
            'createdAt': firestore.SERVER_TIMESTAMP, 'metadata': data.get('metadata') or {}
        })
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
    @firestore.transactional
    def process(transaction):
        user_ref = db.collection('users').document(user_id)
        pred_ref = db.collection('user_predictions').document(claim_id)
        # Reads before writes.
        u_data = user_ref.get(transaction=transaction).to_dict()
        # Idempotency: a given claimId may only ever create one prediction (prevents
        # replay double-debits).
        if pred_ref.get(transaction=transaction).exists: raise Exception("DUPLICATE_CLAIM")
        amt = data.get('amount', 0)
        if not isinstance(amt, (int, float)) or amt <= 0: raise Exception("INVALID_AMOUNT")
        if u_data.get('points', 0) < amt: raise Exception("INSUFFICIENT_FUNDS")
        transaction.update(user_ref, {'points': firestore.Increment(-amt)})
        transaction.update(db.collection('system_config').document('global_metrics'), {'totalPTSLiability': firestore.Increment(-amt)})
        transaction.set(pred_ref, {
            'userId': user_id, 'assetId': data.get('assetId'), 'symbol': data.get('symbol'),
            'direction': data.get('direction'), 'stakeAmount': amt, 'entryPrice': price, 'status': 'ACTIVE',
            'createdAt': firestore.SERVER_TIMESTAMP
        })
        return {"success": True}
    try:
        res = process(db.transaction()); evaluate_missions(user_id); return jsonify(res)
    except Exception as e: return jsonify({"success": False, "error": str(e)}), 400

@app.route('/api/resolve-prediction', methods=['POST'])
@verify_token
@require_db
def resolve_prediction():
    db = get_db()
    if not is_moderator(request.user['uid']): return jsonify({"success": False, "error": "Forbidden"}), 403
    pred_id = request.json.get('predictionId')
    if not pred_id: return jsonify({"success": False, "error": "MISSING_PREDICTION_ID"}), 400
    pred_ref = db.collection('user_predictions').document(pred_id)
    pred_snap = pred_ref.get()
    if not pred_snap.exists: return jsonify({"success": False, "error": "PREDICTION_NOT_FOUND"}), 404
    pred_data = pred_snap.to_dict()
    if not pred_data or 'assetId' not in pred_data: return jsonify({"success": False, "error": "INVALID_PREDICTION_DATA"}), 400
    price = fetch_market_price(pred_data['assetId'])
    if price is None: return jsonify({"success": False, "error": "PRICE_FEED_OFFLINE"}), 503
    @firestore.transactional
    def process(transaction):
        p = pred_ref.get(transaction=transaction).to_dict()
        if p['status'] != 'ACTIVE': raise Exception("ALREADY_RESOLVED")
        win = (price > p['entryPrice']) if p['direction'] == 'UP' else (price < p['entryPrice'])
        payout = p['stakeAmount'] * 2 if win else 0
        user_ref = db.collection('users').document(p['userId'])
        transaction.update(user_ref, {'points': firestore.Increment(payout)})
        transaction.update(db.collection('system_config').document('global_metrics'), {'totalPTSLiability': firestore.Increment(payout)})
        transaction.update(pred_ref, {'status': 'RESOLVED', 'exitPrice': price, 'resolvedAt': firestore.SERVER_TIMESTAMP})
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

@app.route('/api/admin/promote-moderator', methods=['POST'])
@verify_token
@require_db
def promote():
    if not is_admin(request.user['uid']): return jsonify({"success": False}), 403
    db = get_db()
    db.collection('users').document(request.json.get('userId')).update({'role': 'moderator'})
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
        for k, v in context.items(): content = content.replace(f'{{{{{k}}}}}', html.escape(str(v)))
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
        if not referrer_ref.get(transaction=transaction).exists:
            raise Exception("REFERRER_NOT_FOUND")
        transaction.update(referrer_ref, {
            'points': firestore.Increment(points),
            'xp': firestore.Increment(xp),
            'stats.referralsConverted': firestore.Increment(1)
        })
        transaction.update(db.collection('system_config').document('global_metrics'),
                           {'totalPTSLiability': firestore.Increment(points)})
        transaction.update(ref_ref, {
            'status': 'QUALIFIED', 'rewarded': True,
            'rewardPoints': points, 'rewardXP': xp,
            'qualifiedAt': firestore.SERVER_TIMESTAMP, 'updatedAt': firestore.SERVER_TIMESTAMP
        })
        return {"success": True, "alreadyRewarded": False, "points": points, "xp": xp}

    try:
        res = process(db.transaction())
        evaluate_missions(referrer_id)
        return jsonify(res)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

get_deps()
if CORS: CORS(app, resources={r"/api/*": {"origins": "*"}})
if __name__ == '__main__': app.run(debug=True, port=5000)
