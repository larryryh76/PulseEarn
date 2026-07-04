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

# Global initialization state for accurate, false-positive-free diagnostics.
_FIREBASE_STATE = {
    "initialized": False,
    "credential_source": None,   # "FIREBASE_SERVICE_ACCOUNT" | "SPLIT_VARS" | None
    "credentials_loaded": False,
    "error": None,
}

def get_storage_bucket():
    # VITE_ prefixed vars are readable in the Vercel Python runtime (see get_project_id).
    pid = get_project_id()
    return (os.environ.get('FIREBASE_STORAGE_BUCKET') or
            os.environ.get('VITE_FIREBASE_STORAGE_BUCKET') or
            f"{pid}.appspot.com")

def load_service_account_credentials():
    """
    Build explicit service-account credentials from Vercel environment variables.

    Method A (preferred): FIREBASE_SERVICE_ACCOUNT -> full service-account JSON.
    Method B (fallback):  FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.

    Returns (cred, source) or (None, None) when neither configuration exists.
    Application Default Credentials are intentionally NOT used.
    """
    from firebase_admin import credentials

    # Method A: single full-JSON variable.
    sa_json = os.environ.get('FIREBASE_SERVICE_ACCOUNT')
    if sa_json:
        info = json.loads(sa_json)
        return credentials.Certificate(info), "FIREBASE_SERVICE_ACCOUNT"

    # Method B: split variables.
    project_id = os.environ.get('FIREBASE_PROJECT_ID')
    client_email = os.environ.get('FIREBASE_CLIENT_EMAIL')
    private_key = os.environ.get('FIREBASE_PRIVATE_KEY')
    if project_id and client_email and private_key:
        # Vercel stores multiline secrets with literal "\n"; normalise to real newlines.
        private_key = private_key.replace('\\n', '\n')
        info = {
            "type": "service_account",
            "project_id": project_id,
            "client_email": client_email,
            "private_key": private_key,
            "token_uri": "https://oauth2.googleapis.com/token",
        }
        return credentials.Certificate(info), "SPLIT_VARS"

    return None, None

# Firebase Admin initialization with explicit service-account credentials only.
def init_firebase():
    get_deps()
    if firebase_admin is None:
        _FIREBASE_STATE.update({"initialized": False, "credentials_loaded": False,
                                "error": "FIREBASE_ADMIN_IMPORT_FAILED"})
        return False

    # Already initialized in this warm invocation.
    if firebase_admin._apps:
        return True

    try:
        pid = get_project_id()
        cred, source = load_service_account_credentials()

        if cred is None:
            # Never silently initialize with Application Default Credentials. Fail clearly.
            _FIREBASE_STATE.update({
                "initialized": False,
                "credential_source": None,
                "credentials_loaded": False,
                "error": "MISSING_SERVICE_ACCOUNT_CREDENTIALS",
            })
            print("BOOT_CRITICAL: No explicit service-account credentials found. "
                  "Set FIREBASE_SERVICE_ACCOUNT (preferred) or "
                  "FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.")
            sys.stdout.flush()
            return False

        firebase_admin.initialize_app(cred, options={'projectId': pid})
        _FIREBASE_STATE.update({
            "initialized": True,
            "credential_source": source,
            "credentials_loaded": True,
            "error": None,
        })
        print(f"BOOT: Firebase Admin initialized with Service Account via {source} (Project: {pid})")
        sys.stdout.flush()
        return True
    except Exception as e:
        _FIREBASE_STATE.update({
            "initialized": False,
            "credentials_loaded": False,
            "error": f"INIT_FAILED: {str(e)}",
        })
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
        if not db: return jsonify({"success": False, "error": "DATABASE_OFFLINE",
                                   "detail": _FIREBASE_STATE.get("error")}), 503
        return f(*args, **kwargs)
    return decorated_function

def verify_token(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not init_firebase(): return jsonify({"success": False, "error": "AUTH_SERVICE_OFFLINE",
                                                 "detail": _FIREBASE_STATE.get("error")}), 503
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
    has_sdk = init_firebase()
    creds_ok = _FIREBASE_STATE.get("credentials_loaded", False)
    db_ok = False
    auth_ok = False
    storage_ok = False
    storage_error = None
    try:
        if has_sdk:
            db = get_db()
            # Real validation: credentialed Firestore read.
            db.collection('system_config').document('global_v1').get()
            db_ok = True
            # Real validation: credentialed Auth Admin operation.
            try:
                auth.get_user('non-existent-user')
                auth_ok = True
            except auth.UserNotFoundError:
                # Reaching "user not found" proves the credentialed call succeeded.
                auth_ok = True
            # Real validation: credentialed Storage bucket reachability.
            try:
                from firebase_admin import storage
                bucket = storage.bucket(get_storage_bucket())
                bucket.exists()
                storage_ok = True
            except Exception as se:
                storage_error = str(se)
                print(f"HEALTH_STORAGE_FAILURE: {storage_error}")
    except Exception as e:
        print(f"HEALTH_FAILURE: {str(e)}")

    # No false positives: healthy only when credentials load AND every credentialed
    # dependency actually responds.
    is_healthy = has_sdk and creds_ok and db_ok and auth_ok and storage_ok
    status_code = 200 if is_healthy else 503

    return jsonify({
        "success": is_healthy,
        "status": "ONLINE" if is_healthy else "DEGRADED",
        "version": "8.1.0-PRO-CERTIFIED",
        "firebase": "ADMIN_SDK_INITIALIZED" if has_sdk else "ADMIN_SDK_OFFLINE",
        "credentials": "LOADED" if creds_ok else "MISSING",
        "credential_source": _FIREBASE_STATE.get("credential_source"),
        "database": "CONNECTED" if db_ok else "DISCONNECTED",
        "auth_service": "OPERATIONAL" if auth_ok else "DEGRADED",
        "storage": "REACHABLE" if storage_ok else "UNREACHABLE",
        "diagnostics": {
            "projectId": get_project_id(),
            "adminSdkInit": has_sdk,
            "credentialsLoaded": creds_ok,
            "credentialSource": _FIREBASE_STATE.get("credential_source"),
            "firestoreReachable": db_ok,
            "authReachable": auth_ok,
            "storageReachable": storage_ok,
            "storageBucket": get_storage_bucket(),
            "initError": _FIREBASE_STATE.get("error"),
            "storageError": storage_error,
        }
    }), status_code

@app.route('/api/tasks/submit', methods=['POST'])
@verify_token
@require_db
def submit_task():
    db = get_db()
    data, user_id = request.json, request.user['uid']
    task_id = data.get('taskId')
    if not task_id: return jsonify({"success": False, "error": "MISSING_TASK_ID"}), 400

    @firestore.transactional
    def process(transaction):
        user_ref, task_ref = db.collection('users').document(user_id), db.collection('tasks').document(task_id)
        u_snap, t_snap = user_ref.get(transaction=transaction), task_ref.get(transaction=transaction)
        if not u_snap.exists or not t_snap.exists: raise Exception("NOT_FOUND")
        t_data = t_snap.to_dict()
        if t_data.get('status') != 'ACTIVE': raise Exception("TASK_INACTIVE")

        is_auto = t_data.get('verificationType') == 'automated'
        claim_id = f"claim_{user_id}_{task_id}_{int(datetime.now(timezone.utc).timestamp())}"
        transaction.set(db.collection('task_claims').document(claim_id), {
            'id': claim_id, 'userId': user_id, 'taskId': task_id, 'validationState': 'APPROVED' if is_auto else 'PENDING',
            'createdAt': firestore.SERVER_TIMESTAMP, 'metadata': {'taskTitle': t_data.get('title')}
        })
        if is_auto:
            pts, xp = t_data.get('rewardAmount', 0), t_data.get('xpReward', 0)
            transaction.update(user_ref, {'points': firestore.Increment(pts), 'xp': firestore.Increment(xp), 'stats.tasksCompleted': firestore.Increment(1)})
            transaction.update(db.collection('system_config').document('global_metrics'), {'totalPTSLiability': firestore.Increment(pts)})
        return {"success": True, "claimId": claim_id, "automated": is_auto}

    try:
        res = process(db.transaction())
        evaluate_missions(user_id)
        return jsonify(res)
    except Exception as e: return jsonify({"success": False, "error": str(e)}), 400

@app.route('/api/execute-transaction', methods=['POST'])
@verify_token
@require_db
def execute_transaction():
    db = get_db()
    data, user_id, tx_type = request.json, request.json.get('userId'), request.json.get('type')
    caller_uid = request.user['uid']
    if caller_uid != user_id and not is_admin(caller_uid): return jsonify({"success": False, "error": "Unauthorized"}), 403

    @firestore.transactional
    def process(transaction):
        user_ref = db.collection('users').document(user_id)
        u_snap = user_ref.get(transaction=transaction)
        if not u_snap.exists: raise Exception("USER_NOT_FOUND")

        if tx_type == 'mission_reward':
            mid = data.get('referenceId')
            def_snap = db.collection('system_task_definitions').document(mid).get(transaction=transaction)
            ust_snap = db.collection('user_system_tasks').document(f"{user_id}_{mid}").get(transaction=transaction)
            if not def_snap.exists or not ust_snap.exists or ust_snap.to_dict().get('status') != 'COMPLETED': raise Exception("INVALID_MISSION_STATE")
            if ust_snap.to_dict().get('rewarded'): raise Exception("ALREADY_REWARDED")
            amount = def_snap.to_dict().get('rewardPoints', 0)
            transaction.update(db.collection('user_system_tasks').document(f"{user_id}_{mid}"), {'rewarded': True, 'claimedAt': firestore.SERVER_TIMESTAMP})
        elif tx_type in ['daily_reward', 'welcome_bonus']:
            # Guard against duplicate claims by checking if claim already exists
            claim_id = data.get('claimId')
            if not claim_id:
                raise Exception("MISSING_CLAIM_ID")
            claim_ref = db.collection('system_claims').document(claim_id)
            claim_snap = claim_ref.get(transaction=transaction)
            if claim_snap.exists:
                raise Exception("ALREADY_REWARDED")
            cfg_snap = db.collection('system_config').document('global_v1').get(transaction=transaction)
            cfg = cfg_snap.to_dict() if cfg_snap.exists else {}
            rewards = cfg.get('rewards', {})
            amount = rewards.get('dailyLoginPoints', 50) if tx_type == 'daily_reward' else rewards.get('welcomeBonusPoints', 30)
        elif tx_type == 'admin_adjustment':
            if not is_admin(caller_uid): raise Exception("FORBIDDEN")
            amount = data.get('amount', 0)
        elif tx_type == 'withdrawal_finalized':
            amount = 0
        else:
            raise Exception("UNSUPPORTED_TRANSACTION_TYPE")

        transaction.update(user_ref, {'points': firestore.Increment(amount)})
        transaction.update(db.collection('system_config').document('global_metrics'), {'totalPTSLiability': firestore.Increment(amount)})
        transaction.set(db.collection('system_claims').document(data.get('claimId')), {'userId': user_id, 'executedAt': firestore.SERVER_TIMESTAMP})
        return {"success": True}

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
    @firestore.transactional
    def process(transaction):
        user_ref = db.collection('users').document(user_id)
        u_data = user_ref.get(transaction=transaction).to_dict()
        amt = data.get('amount', 0)
        if u_data.get('points', 0) < amt: raise Exception("INSUFFICIENT_FUNDS")
        transaction.update(user_ref, {'points': firestore.Increment(-amt)})
        transaction.update(db.collection('system_config').document('global_metrics'), {'totalPTSLiability': firestore.Increment(-amt)})
        transaction.set(db.collection('user_predictions').document(data.get('claimId')), {
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

@app.route('/api/process-referral-reward', methods=['POST'])
@verify_token
@require_db
def process_referral():
    db = get_db()
    data = request.json
    ref_id, provided_referrer_id = data.get('referralDocId'), data.get('referrerId')

    @firestore.transactional
    def process(transaction):
        ref_ref = db.collection('referrals').document(ref_id)
        r_snap = ref_ref.get(transaction=transaction)
        if not r_snap.exists or r_snap.to_dict().get('status') != 'REGISTERED':
            return {"success": False, "error": "INVALID_REFERRAL_STATE"}

        # Load referrer from the referral document itself, not from request body
        referral_data = r_snap.to_dict()
        actual_referrer_id = referral_data.get('referrerId')
        if not actual_referrer_id:
            return {"success": False, "error": "REFERRER_NOT_FOUND"}

        # Validate against provided referrerId if present
        if provided_referrer_id and provided_referrer_id != actual_referrer_id:
            return {"success": False, "error": "REFERRER_MISMATCH"}

        cfg_snap = db.collection('system_config').document('global_v1').get(transaction=transaction)
        cfg = cfg_snap.to_dict() if cfg_snap.exists else {}
        bonus = cfg.get('rewards', {}).get('referralBonusPoints', 500)

        referrer_ref = db.collection('users').document(actual_referrer_id)
        transaction.update(referrer_ref, {
            'points': firestore.Increment(bonus),
            'stats.referralsCount': firestore.Increment(1)
        })
        transaction.update(ref_ref, {'status': 'SUCCESSFUL', 'rewardedAt': firestore.SERVER_TIMESTAMP})
        transaction.update(db.collection('system_config').document('global_metrics'), {
            'totalPTSLiability': firestore.Increment(bonus)
        })
        return {"success": True}

    try:
        return jsonify(process(db.transaction()))
    except Exception as e: return jsonify({"success": False, "error": str(e)}), 400

@app.route('/api/evaluate-user-integrity', methods=['POST'])
@verify_token
@require_db
def evaluate_integrity():
    db = get_db()
    data = request.json
    uid, fp = data.get('userId'), data.get('fingerprint')
    if not uid or not fp: return jsonify({"success": False}), 400

    # Authorization check: caller can only act on their own account unless admin
    caller_uid = request.user['uid']
    if caller_uid != uid and not is_admin(caller_uid):
        return jsonify({"success": False, "error": "UNAUTHORIZED"}), 403

    # Use FieldFilter API instead of deprecated positional where()
    from google.cloud.firestore_v1.base_query import FieldFilter
    dupes = db.collection('users').where(filter=FieldFilter('fingerprint', '==', fp)).get()
    is_multi = len([d for d in dupes if d.id != uid]) > 0

    if is_multi:
        db.collection('users').document(uid).update({
            'isFlagged': True,
            'fraudFlags': firestore.ArrayUnion(['MULTI_ACCOUNT_FINGERPRINT'])
        })
    return jsonify({"success": True, "flagged": is_multi})

@app.route('/api/authorize-resend', methods=['POST'])
@verify_token
@require_db
def authorize_resend():
    has_key = os.environ.get('RESEND_API_KEY') is not None
    return jsonify({
        "success": True,
        "dispatchMethod": "branded" if has_key else "client_fallback"
    })

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
    auth.delete_user(request.json.get('userId'))
    return jsonify({"success": True})

@app.route('/api/admin/verify-user', methods=['POST'])
@verify_token
@require_db
def verify_user():
    if not is_moderator(request.user['uid']): return jsonify({"success": False}), 403
    auth.update_user(request.json.get('userId'), email_verified=True)
    return jsonify({"success": True})

def send_branded_email(to, template, context, subject):
    init_firebase()
    key = os.environ.get('RESEND_API_KEY')
    if not key: return False
    try:
        path = os.path.join(os.path.dirname(__file__), 'templates', f'{template}.html')
        with open(path, 'r') as f: content = f.read()
        for k, v in context.items(): content = content.replace(f'{{{{{k}}}}}', html.escape(str(v)))
        res = requests.post("https://api.resend.com/emails", headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"}, json={"from": "PulseEarn <hello@pulseearn.online>", "to": [to], "subject": subject, "html": content}, timeout=15)
        return res.status_code in [200, 201]
    except: return False

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

get_deps()
if CORS: CORS(app, resources={r"/api/*": {"origins": "*"}})
if __name__ == '__main__': app.run(debug=True, port=5000)
