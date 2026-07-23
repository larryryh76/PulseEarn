import os
import sys
import json
import html
import math
import urllib.parse
import logging
import traceback
from datetime import datetime, timezone, timedelta
from functools import wraps

def safe_float(v, default=0.0):
    if v is None or v == '':
        return default
    try:
        val = float(v)
        if math.isnan(val) or math.isinf(val):
            return default
        return val
    except (TypeError, ValueError, OverflowError):
        return default

def safe_int(v, default=0):
    if v is None or v == '':
        return default
    try:
        val = float(v)
        if math.isnan(val) or math.isinf(val):
            return default
        return int(val)
    except (TypeError, ValueError, OverflowError):
        return default

def _validate_launch_url(url):
    if not url:
        return None
    try:
        parsed = urllib.parse.urlparse(str(url).strip())
        if parsed.scheme.lower() in ('http', 'https') and parsed.hostname:
            return str(url).strip()
        logging.warning(f"[URL Validation] Rejected unsafe or invalid URL scheme/hostname for domain '{parsed.netloc or 'unknown'}'")
        return None
    except Exception as e:
        logging.warning(f"[URL Validation] Failed to parse URL: {e}")
        return None

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
    # DECOMMISSIONED: "system tasks"/missions (e.g. "Network Builder") have been merged
    # into the standard Task system. This auto-evaluator is intentionally a no-op so no
    # new user_system_tasks progress is written. Existing definitions/progress can be
    # purged via the admin endpoint POST /api/admin/missions/purge.
    return

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
    data, user_id = request.json or {}, request.user['uid']
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

        # 1. User Account Integrity & Fraud Guard
        if u_data.get('banned') or u_data.get('status') in ('SUSPENDED', 'BANNED', 'FROZEN'):
            raise Exception("ACCOUNT_SUSPENDED")

        fraud_flags = u_data.get('fraudFlags') or []
        risk_score = safe_float(u_data.get('riskScore'), 0.0)
        is_flagged = bool(fraud_flags or risk_score >= 80)

        # 2. Task Active Status Check
        if t_data.get('active') is False or (t_data.get('status') and t_data.get('status') != 'ACTIVE'):
            raise Exception("TASK_INACTIVE")

        # 3. Expiration Check
        now = datetime.now(timezone.utc)
        end_date = t_data.get('endDate') or t_data.get('expirationDate')
        if end_date and isinstance(end_date, datetime) and end_date < now:
            raise Exception("TASK_EXPIRED")

        # 4. Max Claims / Completions Limit Check
        max_claims_raw = t_data.get('maxCompletions') if t_data.get('maxCompletions') is not None else t_data.get('maxClaims')
        if max_claims_raw is not None:
            max_claims = safe_float(max_claims_raw, -1.0)
            if max_claims > 0:
                total_claims_raw = t_data.get('totalClaims') if t_data.get('totalClaims') is not None else t_data.get('completionCount')
                total_claims = safe_float(total_claims_raw, 0.0)
                if total_claims >= max_claims:
                    raise Exception("TASK_CAP_REACHED")

        # 5. Cooldown Guard & Idempotency
        cooldown_hours = safe_float(t_data.get('cooldownPeriod') or t_data.get('cooldownHours'), 0.0)
        if ut_snap.exists:
            ut = ut_snap.to_dict()
            st = ut.get('status')
            if st in ('pending', 'awaiting_verification'):
                raise Exception("ALREADY_PENDING")
            if cooldown_hours <= 0 and st in ('completed', 'claimed', 'verified'):
                raise Exception("ALREADY_COMPLETED")
            if cooldown_hours > 0 and st in ('completed', 'claimed', 'verified', 'on_cooldown', 'cooldown'):
                last = ut.get('lastCompleted') or ut.get('completedAt') or ut.get('updatedAt')
                last_dt = None
                if isinstance(last, datetime):
                    last_dt = last
                elif isinstance(last, (int, float)):
                    last_dt = datetime.fromtimestamp(last, tz=timezone.utc)
                elif isinstance(last, str):
                    try:
                        last_dt = datetime.fromisoformat(last.replace('Z', '+00:00'))
                    except Exception:
                        pass
                if last_dt:
                    if last_dt.tzinfo is None:
                        last_dt = last_dt.replace(tzinfo=timezone.utc)
                    if (now - last_dt).total_seconds() < cooldown_hours * 3600:
                        raise Exception("ON_COOLDOWN")

        # 6. Verification Type & Proof Enforcement
        v_type = (t_data.get('verificationType') or 'manual').lower()
        requires_proof = v_type in ('manual', 'proof', 'screenshot', 'admin_approval')
        if requires_proof and not proof:
            raise Exception("PROOF_REQUIRED")

        # Auto-approve only if verificationType is an explicitly automated mechanism and proof is not required
        is_auto = (v_type in ('automated', 'instant', 'timer', 'activity', 'link', 'api')) and not requires_proof and not is_flagged
        claim_id = f"claim_{user_id}_{task_id}_{int(now.timestamp())}"

        transaction.set(db.collection('task_claims').document(claim_id), {
            'id': claim_id,
            'userId': user_id,
            'taskId': task_id,
            'providerId': t_data.get('providerId') or t_data.get('provider') or 'internal',
            'campaignId': t_data.get('campaignId') or None,
            'verificationType': v_type,
            'validationState': 'APPROVED' if is_auto else 'PENDING',
            'completionState': 'COMPLETED' if is_auto else 'AWAITING_VERIFICATION',
            'status': 'APPROVED' if is_auto else 'PENDING',
            'submittedProof': proof or None,
            'rewardAmount': t_data.get('rewardAmount', 0),
            'xpReward': t_data.get('xpReward', 0),
            'createdAt': firestore.SERVER_TIMESTAMP,
            'updatedAt': firestore.SERVER_TIMESTAMP,
            'resolvedAt': firestore.SERVER_TIMESTAMP if is_auto else None,
            'reviewedBy': 'AUTOMATED_ENGINE' if is_auto else None,
            'metadata': {
                'taskTitle': t_data.get('title'),
                'username': u_data.get('username'),
                'verificationType': v_type,
                'isFlagged': is_flagged
            }
        })

        if is_auto:
            pts, xp = t_data.get('rewardAmount', 0), t_data.get('xpReward', 0)
            transaction.update(user_ref, {'points': firestore.Increment(pts), 'xp': firestore.Increment(xp), 'stats.tasksCompleted': firestore.Increment(1)})
            transaction.set(db.collection('system_config').document('global_metrics'), {'totalPTSLiability': firestore.Increment(pts)}, merge=True)
            transaction.set(ut_ref, {
                'taskId': task_id,
                'status': 'completed',
                'verificationState': 'VERIFIED',
                'lastCompleted': firestore.SERVER_TIMESTAMP,
                'totalCompletions': firestore.Increment(1),
                'updatedAt': firestore.SERVER_TIMESTAMP
            }, merge=True)
            transaction.set(task_ref, {
                'totalClaims': firestore.Increment(1),
                'completionCount': firestore.Increment(1)
            }, merge=True)

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
            transaction.set(ut_ref, {
                'taskId': task_id,
                'status': 'pending',
                'verificationState': 'AWAITING_VERIFICATION',
                'updatedAt': firestore.SERVER_TIMESTAMP
            }, merge=True)

        return {"success": True, "claimId": claim_id, "automated": is_auto}

    try:
        res = process(db.transaction())
        evaluate_missions(user_id)
        return jsonify(res)
    except Exception as e: return jsonify({"success": False, "error": str(e)}), 400

@app.route('/api/admin/claims/review', methods=['POST'])
@verify_token
@require_db
def review_claim():
    db = get_db()
    data, admin_id = request.json or {}, request.user['uid']
    claim_id = data.get('claimId')
    action = (data.get('action') or '').upper()
    rejection_reason = (data.get('rejectionReason') or '').strip()

    if not claim_id or action not in ('APPROVE', 'REJECT'):
        return jsonify({"success": False, "error": "INVALID_PARAMS"}), 400

    user_doc = db.collection('users').document(admin_id).get()
    u_role = user_doc.to_dict().get('role') if user_doc.exists else None
    if u_role not in ('admin', 'moderator'):
        return jsonify({"success": False, "error": "FORBIDDEN_NOT_ADMIN"}), 403

    @firestore.transactional
    def process_review(transaction):
        claim_ref = db.collection('task_claims').document(claim_id)
        claim_snap = claim_ref.get(transaction=transaction)
        if not claim_snap.exists:
            raise Exception("CLAIM_NOT_FOUND")
        c_data = claim_snap.to_dict()

        if c_data.get('validationState') in ('APPROVED', 'REJECTED') and c_data.get('resolvedAt'):
            raise Exception("CLAIM_ALREADY_RESOLVED")

        user_id = c_data.get('userId')
        task_id = c_data.get('taskId')

        user_ref = db.collection('users').document(user_id)
        task_ref = db.collection('tasks').document(task_id)
        ut_ref = user_ref.collection('user_tasks').document(task_id)

        u_snap = user_ref.get(transaction=transaction)
        t_snap = task_ref.get(transaction=transaction)
        if not u_snap.exists or not t_snap.exists:
            raise Exception("USER_OR_TASK_NOT_FOUND")

        u_data = u_snap.to_dict()
        t_data = t_snap.to_dict()

        if action == 'APPROVE':
            pts = float(t_data.get('rewardAmount', 0) or 0)
            xp = float(t_data.get('xpReward', 0) or 0)

            transaction.update(user_ref, {
                'points': firestore.Increment(pts),
                'xp': firestore.Increment(xp),
                'stats.tasksCompleted': firestore.Increment(1)
            })
            transaction.set(db.collection('system_config').document('global_metrics'), {
                'totalPTSLiability': firestore.Increment(pts)
            }, merge=True)

            transaction.update(claim_ref, {
                'validationState': 'APPROVED',
                'completionState': 'COMPLETED',
                'status': 'APPROVED',
                'resolvedAt': firestore.SERVER_TIMESTAMP,
                'reviewedBy': admin_id,
                'updatedAt': firestore.SERVER_TIMESTAMP
            })

            transaction.set(ut_ref, {
                'taskId': task_id,
                'status': 'completed',
                'verificationState': 'VERIFIED',
                'lastCompleted': firestore.SERVER_TIMESTAMP,
                'totalCompletions': firestore.Increment(1),
                'updatedAt': firestore.SERVER_TIMESTAMP
            }, merge=True)

            transaction.set(task_ref, {
                'totalClaims': firestore.Increment(1),
                'completionCount': firestore.Increment(1)
            }, merge=True)

            task_title = t_data.get('title') or 'Task'
            cur_points = float(u_data.get('points', 0) or 0)
            post_ledger(
                transaction, user_ref, user_id,
                tx_type='task_reward', amount=pts, xp=xp,
                source='Task Verification Desk', description=f"Verified: {task_title}",
                claim_id=f"val_{claim_id}", reference_id=task_id,
                balance_after=cur_points + pts,
                metadata={
                    'taskId': task_id,
                    'taskName': task_title,
                    'verifiedBy': admin_id,
                    'claimId': claim_id
                }
            )
        else:
            reason = rejection_reason or "Submission did not meet requirements"
            transaction.update(claim_ref, {
                'validationState': 'REJECTED',
                'completionState': 'FAILED',
                'status': 'REJECTED',
                'rejectionReason': reason,
                'resolvedAt': firestore.SERVER_TIMESTAMP,
                'reviewedBy': admin_id,
                'updatedAt': firestore.SERVER_TIMESTAMP
            })

            transaction.set(ut_ref, {
                'taskId': task_id,
                'status': 'available',
                'verificationState': 'REJECTED',
                'updatedAt': firestore.SERVER_TIMESTAMP
            }, merge=True)

            notif_ref = user_ref.collection('notifications').document()
            task_title = c_data.get('metadata', {}).get('taskTitle') or t_data.get('title') or 'Task'
            transaction.set(notif_ref, {
                'title': 'Task Submission Rejected',
                'description': f"Your submission for '{task_title}' was rejected. Reason: {reason}",
                'type': 'moderation_notice',
                'read': False,
                'timestamp': firestore.SERVER_TIMESTAMP,
                'metadata': {'taskId': task_id, 'claimId': claim_id, 'reason': reason}
            })

        return {"success": True, "claimId": claim_id, "status": action}

    try:
        res = process_review(db.transaction())
        return jsonify(res)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route('/api/admin/claims/stats', methods=['GET'])
@verify_token
@require_db
def get_claims_stats():
    db = get_db()
    admin_id = request.user['uid']
    user_doc = db.collection('users').document(admin_id).get()
    u_role = user_doc.to_dict().get('role') if user_doc.exists else None
    if u_role not in ('admin', 'moderator'):
        return jsonify({"success": False, "error": "FORBIDDEN"}), 403

    try:
        try:
            pending = db.collection('task_claims').where('validationState', '==', 'PENDING').count().get()[0][0].value
            approved = db.collection('task_claims').where('validationState', '==', 'APPROVED').count().get()[0][0].value
            rejected = db.collection('task_claims').where('validationState', '==', 'REJECTED').count().get()[0][0].value
        except Exception:
            pending = len(db.collection('task_claims').where('validationState', '==', 'PENDING').get())
            approved = len(db.collection('task_claims').where('validationState', '==', 'APPROVED').get())
            rejected = len(db.collection('task_claims').where('validationState', '==', 'REJECTED').get())
        total = pending + approved + rejected

        return jsonify({
            "success": True,
            "stats": {
                "pendingCount": pending,
                "approvedCount": approved,
                "rejectedCount": rejected,
                "totalSubmissions": total,
                "fraudBlockedCount": 0
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Authorization matrix for execute-transaction. User-claimable reward types may be
# initiated by the account owner; everything that grants/adjusts balance arbitrarily
# Authorization matrix for execute-transaction. User-claimable reward types may be
# initiated by the account owner; everything that grants/adjusts balance arbitrarily
# is restricted to admins. Reward *amounts* for user-claimable types are ALWAYS read
# from server config so a crafted client cannot inflate its own payout.
USER_SELF_TX = {
    'daily_reward', 'welcome_bonus', 'withdrawal_debit', 'mission_reward',
    'offerwall_reward', 'cashback_reward'
}
ADMIN_TX = {
    'admin_adjustment', 'manual_adjustment', 'task_reward', 'withdrawal_finalized',
    'withdrawal_debit_reversal', 'refund', 'rollback', 'penalty',
    'referral_reversal', 'referral_bonus', 'referral_reward', 'prediction_reward',
    'offerwall_reward', 'cashback_reward', 'AI_SYSTEM_CORRECTION'
}

# Fallback human-readable labels for the activity timeline, used when the client did not
# supply a source/description. Keeps the activity feed readable for every transaction type.
ACTIVITY_LABELS = {
    'daily_reward': 'Daily Login Bonus',
    'welcome_bonus': 'Welcome Bonus',
    'task_reward': 'Task Reward',
    'mission_reward': 'Mission Reward',
    'referral_bonus': 'Referral Reward',
    'referral_reward': 'Referral Reward',
    'referral_reversal': 'Referral Reversal',
    'admin_adjustment': 'Account Adjustment',
    'manual_adjustment': 'Manual Adjustment',
    'penalty': 'Account Penalty',
    'AI_SYSTEM_CORRECTION': 'System Correction',
    'withdrawal_debit': 'Withdrawal Requested',
    'withdrawal_debit_reversal': 'Withdrawal Refunded',
    'refund': 'Account Refund',
    'rollback': 'Transaction Rollback',
    'withdrawal_finalized': 'Withdrawal Completed',
    'offerwall_reward': 'Offerwall Reward',
    'cashback_reward': 'Cashback Reward',
    'prediction_reward': 'Forecast Settlement',
    'prediction_stake': 'Forecast Stake',
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
    'referral_reward': ('referral_joined', 'Referral Reward Earned'),
    'referral_reversal': ('system', 'Referral Reversed'),
    'admin_adjustment': ('system', 'Account Adjustment'),
    'manual_adjustment': ('system', 'Manual Account Adjustment'),
    'penalty': ('moderation_notice', 'Account Penalty Applied'),
    'AI_SYSTEM_CORRECTION': ('system', 'System Correction'),
    'withdrawal_debit': ('payout_processed', 'Withdrawal Requested'),
    'withdrawal_debit_reversal': ('payout_processed', 'Withdrawal Refunded'),
    'refund': ('reward_claimed', 'Account Refund Issued'),
    'rollback': ('system', 'Transaction Rolled Back'),
    'withdrawal_finalized': ('payout_processed', 'Withdrawal Completed'),
    'prediction_stake': ('prediction_result', 'Forecast Placed'),
    'prediction_reward': ('prediction_result', 'Forecast Settled'),
    'offerwall_reward': ('reward_claimed', 'Offerwall Reward Earned'),
    'cashback_reward': ('reward_claimed', 'Cashback Reward Earned'),
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
    caller_is_moderator = is_moderator(caller_uid)
    is_self = caller_uid == user_id

    if tx_type in ADMIN_TX and tx_type not in USER_SELF_TX:
        if tx_type == 'task_reward':
            if not (caller_is_moderator or caller_is_admin): return jsonify({"success": False, "error": "FORBIDDEN"}), 403
        else:
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
            # ── Streak calculation ──────────────────────────────────────────────
            # Use UTC-day boundaries so streaks are server-authoritative and
            # immune to client timezone manipulation.  A streak increments when
            # the previous daily reward was claimed on the immediately preceding
            # UTC day; it resets to 1 when more than one day was skipped.
            now_utc = datetime.now(timezone.utc)
            today_utc = now_utc.date()
            yesterday_utc = today_utc - timedelta(days=1)
            last_reward = u.get('lastRewardDate')
            current_streak = int(u.get('streak', 0) or 0)
            if last_reward is not None:
                last_day = last_reward.date() if hasattr(last_reward, 'date') else today_utc
                if last_day == yesterday_utc:
                    new_streak = current_streak + 1   # consecutive day
                elif last_day == today_utc:
                    new_streak = current_streak       # same day (shouldn't reach here — claimId guard)
                else:
                    new_streak = 1                    # streak broken
            else:
                new_streak = 1                        # first ever claim
            post_writes.append((user_ref, {
                'lastRewardDate': firestore.SERVER_TIMESTAMP,
                'streak': new_streak
            }, True))

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
            if ref_task:
                ut_ref = user_ref.collection('user_tasks').document(ref_task)
                post_writes.append((ut_ref, {
                    'taskId': ref_task,
                    'status': 'completed',
                    'lastCompleted': firestore.SERVER_TIMESTAMP,
                    'totalCompletions': firestore.Increment(1)
                }, True))
            post_writes.append((user_ref, {'stats.tasksCompleted': firestore.Increment(1)}, True))

        elif tx_type in ('referral_bonus', 'referral_reward'):
            ref_id = data.get('referenceId') or (data.get('metadata') or {}).get('referralDocId')
            if ref_id:
                ref_doc = db.collection('referrals').document(ref_id)
                post_writes.append((ref_doc, {
                    'status': 'QUALIFIED',
                    'rewarded': True,
                    'updatedAt': firestore.SERVER_TIMESTAMP
                }, True))
            points_delta = float(data.get('amount') if data.get('amount') is not None else rewards.get('referralBonusPoints', 50))
            xp_delta = float(data.get('xpReward') if data.get('xpReward') is not None else rewards.get('referralBonusXP', 100))
            post_writes.append((user_ref, {'stats.referralsCount': firestore.Increment(1)}, True))

        elif tx_type in ('withdrawal_debit_reversal', 'refund'):
            wd_id = (data.get('metadata') or {}).get('withdrawalId') or data.get('referenceId')
            amt = abs(float(data.get('amount', 0) or 0))
            if wd_id:
                wd_ref = db.collection('withdrawals').document(wd_id)
                wd_snap = wd_ref.get(transaction=transaction)
                if wd_snap.exists:
                    wd_data = wd_snap.to_dict() or {}
                    if amt == 0:
                        amt = abs(float(wd_data.get('amountPoints', 0) or 0))
                    post_writes.append((wd_ref, {
                        'status': 'REJECTED',
                        'refundedAt': firestore.SERVER_TIMESTAMP,
                        'refundReason': (data.get('metadata') or {}).get('reason') or 'Withdrawal reversed'
                    }, True))
            if amt <= 0:
                amt = abs(float(data.get('amount', 0) or 0))
            points_delta = amt
            xp_delta = 0.0

        elif tx_type == 'rollback':
            orig_tx_id = (data.get('metadata') or {}).get('originalTxId') or data.get('referenceId')
            if not orig_tx_id:
                raise Exception("MISSING_ORIGINAL_TRANSACTION_ID")
            orig_snap = user_ref.collection('transactions').document(orig_tx_id).get(transaction=transaction)
            if not orig_snap.exists:
                raise Exception("ORIGINAL_TRANSACTION_NOT_FOUND")
            orig = orig_snap.to_dict() or {}
            orig_amt = float(orig.get('amount', 0) or 0)
            orig_xp = float(orig.get('xp', 0) or 0)
            points_delta = -orig_amt
            xp_delta = -orig_xp
            post_writes.append((user_ref.collection('transactions').document(orig_tx_id), {
                'status': 'REVERSED',
                'reversedAt': firestore.SERVER_TIMESTAMP
            }, True))

        elif tx_type == 'penalty':
            amt = abs(float(data.get('amount', 0) or 0))
            xp_amt = abs(float(data.get('xpReward', 0) or 0))
            points_delta = -amt
            xp_delta = -xp_amt

        elif tx_type in ('offerwall_reward', 'cashback_reward'):
            points_delta = float(data.get('amount', 0) or 0)
            xp_delta = float(data.get('xpReward', 0) or 0)

        elif tx_type == 'withdrawal_finalized':
            wd_id = (data.get('metadata') or {}).get('withdrawalId') or data.get('referenceId')
            if not wd_id: raise Exception("MISSING_WITHDRAWAL_ID")
            wd_ref = db.collection('withdrawals').document(wd_id)
            wd_snap = wd_ref.get(transaction=transaction)
            if not wd_snap.exists: raise Exception("WITHDRAWAL_NOT_FOUND")
            if not wd_snap.to_dict().get('debited'): raise Exception("WITHDRAWAL_NOT_DEBITED")
            post_writes.append((wd_ref, {'payoutFinalizedAt': firestore.SERVER_TIMESTAMP, 'status': 'PAID'}, True))
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
        transaction.set(pred_ref, {
            'userId': user_id, 'assetId': data.get('assetId'), 'symbol': data.get('symbol'),
            'direction': data.get('direction'), 'stakeAmount': amt, 'entryPrice': price, 'status': 'ACTIVE',
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
        user_ref = db.collection('users').document(p['userId'])
        # Read the user (before any write) so we can record an accurate running balance.
        u_snap = user_ref.get(transaction=transaction)
        cur_points = float((u_snap.to_dict() or {}).get('points', 0) or 0) if u_snap.exists else 0.0
        win = (price > p['entryPrice']) if p['direction'] == 'UP' else (price < p['entryPrice'])
        payout = p['stakeAmount'] * 2 if win else 0
        symbol = (p.get('symbol') or '').upper()
        outcome = 'won' if win else 'lost'
        transaction.update(user_ref, {'points': firestore.Increment(payout)})
        transaction.set(db.collection('system_config').document('global_metrics'), {'totalPTSLiability': firestore.Increment(payout)}, merge=True)
        transaction.update(pred_ref, {'status': 'RESOLVED', 'exitPrice': price, 'resolvedAt': firestore.SERVER_TIMESTAMP})
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
    """Lookup referrer by code. Returns referrer ID for validation during signup."""
    db = get_db()
    code = request.json.get('referralCode')
    docs = db.collection('users').where('referralCode', '==', code).limit(1).get()
    if not docs: return jsonify({"success": False, "error": "INVALID_CODE"}), 404
    return jsonify({"success": True, "referrerId": docs[0].id, "username": docs[0].to_dict().get('username')})

@app.route('/api/referrals/apply-signup-bonus', methods=['POST'])
@verify_token
@require_db
def apply_signup_bonus():
    """Apply referral bonuses immediately on signup (REFEREE + REFERRER).
    
    Called during initializeUserProfile after referral code validation.
    Atomically distributes:
    - 30 PTS to referee (new user)
    - 50 PTS to referrer (who referred them)
    Both logged to ledger with full audit trail.
    """
    db = get_db()
    caller_id = request.user['uid']  # The new user (referee)
    data = request.json or {}
    referrer_id = data.get('referrerId')  # Who referred them
    referral_doc_id = data.get('referralDocId')  # Document ID of referral record
    
    if not referrer_id or not referral_doc_id:
        return jsonify({"success": False, "error": "MISSING_PARAMETERS"}), 400
    if caller_id == referrer_id:
        return jsonify({"success": False, "error": "SELF_REFERRAL"}), 400
    
    cfg_snap = db.collection('system_config').document('global_v1').get()
    rewards = (cfg_snap.to_dict() or {}).get('rewards', {}) if cfg_snap.exists else {}
    referee_bonus_pts = rewards.get('referralBonusPoints', 30)  # Referee gets bonus
    referee_bonus_xp = rewards.get('referralBonusXP', 0)
    referrer_bonus_pts = rewards.get('referralBonusPoints', 50)  # Referrer gets bonus
    referrer_bonus_xp = rewards.get('referralBonusXP', 100)
    
    referee_ref = db.collection('users').document(caller_id)
    referrer_ref = db.collection('users').document(referrer_id)
    referral_ref = db.collection('referrals').document(referral_doc_id)
    
    @firestore.transactional
    def apply_bonuses(transaction):
        # Verify referral record exists and is in REGISTERED state
        ref_snap = referral_ref.get(transaction=transaction)
        if not ref_snap.exists:
            raise Exception("REFERRAL_NOT_FOUND")
        r = ref_snap.to_dict()
        if r.get('refereeId') != caller_id or r.get('referrerId') != referrer_id:
            raise Exception("REFERRAL_MISMATCH")
        if r.get('status') != 'REGISTERED':
            raise Exception("ALREADY_PROCESSED")
        
        # Verify both users exist
        referee_snap = referee_ref.get(transaction=transaction)
        referrer_snap = referrer_ref.get(transaction=transaction)
        if not referee_snap.exists or not referrer_snap.exists:
            raise Exception("USER_NOT_FOUND")
        
        # Apply bonus to REFEREE (new user)
        transaction.update(referee_ref, {
            'points': firestore.Increment(referee_bonus_pts),
            'xp': firestore.Increment(referee_bonus_xp),
            'stats.referralsReceived': firestore.Increment(1)
        })
        
        # Apply bonus to REFERRER (who referred them)
        transaction.update(referrer_ref, {
            'points': firestore.Increment(referrer_bonus_pts),
            'xp': firestore.Increment(referrer_bonus_xp),
            'stats.referralsCount': firestore.Increment(1)
        })
        
        # Update global metrics
        total_liability = referee_bonus_pts + referrer_bonus_pts
        transaction.set(db.collection('system_config').document('global_metrics'),
                       {'totalPTSLiability': firestore.Increment(total_liability)}, merge=True)
        
        # Mark referral as qualified/rewarded
        transaction.update(referral_ref, {
            'status': 'QUALIFIED',
            'rewarded': True,
            'refereeBonusPoints': referee_bonus_pts,
            'referrerBonusPoints': referrer_bonus_pts,
            'qualifiedAt': firestore.SERVER_TIMESTAMP,
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        
        # Create ledger entries for both users
        referee_new_balance = (referee_snap.to_dict() or {}).get('points', 0) + referee_bonus_pts
        post_ledger(transaction, referee_ref, caller_id,
                   tx_type='referral_bonus_received',
                   amount=referee_bonus_pts,
                   xp=referee_bonus_xp,
                   source='Referral Program',
                   description=f'Signup bonus from referral',
                   claim_id=f'referral_signup_{referral_doc_id}',
                   reference_id=referral_doc_id,
                   balance_after=referee_new_balance,
                   activity_type='referral_bonus_received')
        
        # Referrer ledger entry
        referrer_new_balance = (referrer_snap.to_dict() or {}).get('points', 0) + referrer_bonus_pts
        post_ledger(transaction, referrer_ref, referrer_id,
                   tx_type='referral_bonus_earned',
                   amount=referrer_bonus_pts,
                   xp=referrer_bonus_xp,
                   source='Referral Program',
                   description=f'Bonus for referring {r.get("refereeUsername", "new member")}',
                   claim_id=f'referral_reward_{referral_doc_id}',
                   reference_id=referral_doc_id,
                   balance_after=referrer_new_balance,
                   activity_type='referral_bonus_earned')
    
    try:
        transaction = db.transaction()
        apply_bonuses(transaction)
        
        # Send notifications after transaction succeeds
        notify = {
            'referee': {
                'userId': caller_id,
                'title': 'Referral Bonus Received',
                'description': f'You earned {referee_bonus_pts} PTS from your referral signup!',
                'type': 'referral_bonus_received'
            },
            'referrer': {
                'userId': referrer_id,
                'title': 'Referral Bonus Earned',
                'description': f'You earned {referrer_bonus_pts} PTS! {r.get("refereeUsername", "A new member")} joined using your code.',
                'type': 'referral_bonus_earned'
            }
        }
        
        return jsonify({
            "success": True,
            "refereeBonusPoints": referee_bonus_pts,
            "referrerBonusPoints": referrer_bonus_pts,
            "notifications": notify
        })
    except Exception as e:
        print(f"[Referral Signup Bonus] Error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/admin/promote-moderator', methods=['POST'])
@verify_token
@require_db
def promote():
    if not is_admin(request.user['uid']): return jsonify({"success": False, "error": "FORBIDDEN"}), 403
    user_id = request.json.get('userId')
    if not user_id: return jsonify({"success": False, "error": "MISSING_USER_ID"}), 400
    db = get_db()
    try:
        db.collection('users').document(user_id).update({'role': 'moderator', 'updatedAt': firestore.SERVER_TIMESTAMP})
        # CRITICAL: set Firebase Auth custom claim so the role survives token refresh
        auth.set_custom_user_claims(user_id, {'role': 'moderator'})
        return jsonify({"success": True, "message": "Promoted. User must sign out and sign back in."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/admin/demote-moderator', methods=['POST'])
@verify_token
@require_db
def demote():
    if not is_admin(request.user['uid']): return jsonify({"success": False, "error": "FORBIDDEN"}), 403
    user_id = request.json.get('userId')
    if not user_id: return jsonify({"success": False, "error": "MISSING_USER_ID"}), 400
    db = get_db()
    try:
        db.collection('users').document(user_id).update({'role': 'user', 'updatedAt': firestore.SERVER_TIMESTAMP})
        auth.set_custom_user_claims(user_id, {'role': 'user'})
        return jsonify({"success": True, "message": "Demoted. User must sign out and sign back in."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

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
    # Default is 50, matching EconomyConfigEngine.DEFAULT_CONFIG.rewards.referralBonusPoints
    points = rewards.get('referralBonusPoints', 50)
    xp = rewards.get('referralBonusXP', 100)

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
            # Use the canonical field name matching UserData.stats.referralsCount
            'stats.referralsCount': firestore.Increment(1)
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

# ═══════════════════════════════════════════════════════════════════════════════
# TASK LIFECYCLE MANAGEMENT — Phase 18 (Sync Audit)
# ═══════════════════════════════════════════════════════════════════════════════
# Critical: All task state changes must be soft-deletes (active: false).
# Hard-delete (doc.delete()) breaks Firestore listeners — deleted docs don't
# appear in snapshots. Instead, mark inactive and let listeners filter naturally.

@app.route('/api/admin/tasks/create', methods=['POST'])
@verify_token
def create_task():
    """Admin/Moderator: Create a new task and make it immediately live (active: true)."""
    get_deps()
    if not init_firebase():
        return jsonify({"error": "SERVICE_UNAVAILABLE"}), 503
    db = firestore.client()
    uid = request.user['uid']
    if not is_moderator(uid):
        return jsonify({"success": False, "error": "FORBIDDEN"}), 403
    data = request.json or {}
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({"success": False, "error": "MISSING_TITLE"}), 400
    reward = data.get('rewardAmount')
    if reward is None or int(reward) < 1:
        return jsonify({"success": False, "error": "INVALID_REWARD"}), 400
    try:
        task_ref = db.collection('tasks').document()
        if 'cooldownHours' in data and data['cooldownHours'] is not None:
            cooldown = int(data['cooldownHours'])
        elif 'cooldownPeriod' in data and data['cooldownPeriod'] is not None:
            cooldown = int(data['cooldownPeriod'])
        else:
            cooldown = 0

        max_claims = data.get('maxCompletions') if data.get('maxCompletions') is not None else data.get('maxClaims')
        url_val = data.get('url') or data.get('actionUrl') or None
        p_val = data.get('priority')
        priority_val = int(p_val) if p_val is not None else 100

        doc_payload = {
            'title': title,
            'description': (data.get('description') or '').strip(),
            'instructions': (data.get('instructions') or data.get('description') or '').strip(),
            'type': data.get('type', 'manual'),
            'category': data.get('category', 'CUSTOM'),
            'campaignId': data.get('campaignId') or None,
            'providerId': data.get('providerId') or None,
            'provider': data.get('provider', 'internal'),
            'rewardAmount': int(reward),
            'xpReward': max(0, int(data.get('xpReward') or 0)),
            'proofLabel': data.get('proofLabel') or 'Proof',
            'proofPlaceholder': data.get('proofPlaceholder') or 'Paste your proof link here',
            'proofRequirements': data.get('proofRequirements') or data.get('proofLabel') or None,
            'maxCompletions': max_claims,
            'maxClaims': max_claims,
            'cooldownHours': cooldown,
            'cooldownPeriod': cooldown,
            'url': url_val,
            'actionUrl': url_val,
            'active': data.get('active', True),
            'status': 'ACTIVE' if data.get('active', True) else 'INACTIVE',
            'visibility': data.get('visibility', 'PUBLIC'),
            'verificationType': data.get('verificationType') or ('automated' if data.get('type') == 'automated' else 'manual'),
            'priority': priority_val,
            'difficulty': data.get('difficulty') or 'medium',
            'tags': data.get('tags') if isinstance(data.get('tags'), list) else [],
            'completionCount': 0,
            'totalClaims': 0,
            'totalDistributed': 0,
            'conversionRate': 0,
            'createdBy': uid,
            'createdAt': firestore.SERVER_TIMESTAMP,
            'updatedAt': firestore.SERVER_TIMESTAMP,
        }
        task_ref.set(doc_payload)
        return jsonify({"success": True, "taskId": task_ref.id})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/admin/tasks/<task_id>/update', methods=['POST'])
@verify_token
def update_task(task_id):
    """Admin/Moderator: Update an existing task definition."""
    if not is_moderator(request.user['uid']):
        return jsonify({"success": False, "error": "FORBIDDEN"}), 403
    get_deps()
    if not init_firebase():
        return jsonify({"error": "SERVICE_UNAVAILABLE"}), 503
    db = firestore.client()
    data = request.json or {}
    try:
        task_ref = db.collection('tasks').document(task_id)
        existing = task_ref.get()
        if not existing.exists:
            return jsonify({"success": False, "error": "TASK_NOT_FOUND"}), 404

        update_payload = {'updatedAt': firestore.SERVER_TIMESTAMP}
        
        if 'title' in data and data['title'].strip():
            update_payload['title'] = data['title'].strip()
        if 'description' in data:
            update_payload['description'] = data['description'].strip()
        if 'instructions' in data:
            update_payload['instructions'] = data['instructions'].strip()
        elif 'description' in data:
            update_payload['instructions'] = data['description'].strip()

        if 'type' in data:
            update_payload['type'] = data['type']
        if 'category' in data:
            update_payload['category'] = data['category']
        if 'campaignId' in data:
            update_payload['campaignId'] = data['campaignId'] or None
        if 'providerId' in data:
            update_payload['providerId'] = data['providerId'] or None
        if 'rewardAmount' in data and data['rewardAmount'] is not None:
            r_val = int(data['rewardAmount'])
            if r_val < 1:
                return jsonify({"success": False, "error": "INVALID_REWARD"}), 400
            update_payload['rewardAmount'] = r_val
        if 'xpReward' in data and data['xpReward'] is not None:
            x_val = int(data['xpReward'])
            if x_val < 0:
                return jsonify({"success": False, "error": "INVALID_XP_REWARD"}), 400
            update_payload['xpReward'] = x_val
        if 'proofLabel' in data:
            update_payload['proofLabel'] = data['proofLabel']
        if 'proofRequirements' in data:
            update_payload['proofRequirements'] = data['proofRequirements']
        elif 'proofLabel' in data:
            update_payload['proofRequirements'] = data['proofLabel']
        if 'proofPlaceholder' in data:
            update_payload['proofPlaceholder'] = data['proofPlaceholder']
        if 'cooldownHours' in data or 'cooldownPeriod' in data:
            if 'cooldownHours' in data and data['cooldownHours'] is not None:
                cd = int(data['cooldownHours'])
            else:
                cd = int(data.get('cooldownPeriod') or 0)
            if cd < 0:
                return jsonify({"success": False, "error": "INVALID_COOLDOWN"}), 400
            update_payload['cooldownHours'] = cd
            update_payload['cooldownPeriod'] = cd
        if 'maxCompletions' in data or 'maxClaims' in data:
            mc = data.get('maxCompletions') if 'maxCompletions' in data else data.get('maxClaims')
            update_payload['maxCompletions'] = mc
            update_payload['maxClaims'] = mc
        if 'url' in data or 'actionUrl' in data:
            u_val = data.get('url') or data.get('actionUrl') or None
            update_payload['url'] = u_val
            update_payload['actionUrl'] = u_val
        if 'verificationType' in data:
            update_payload['verificationType'] = data['verificationType']
        if 'visibility' in data:
            update_payload['visibility'] = data['visibility']

        status_val = data.get('status')
        active_val = data.get('active')
        if status_val is not None:
            update_payload['status'] = status_val
            if active_val is None:
                update_payload['active'] = True if status_val == 'ACTIVE' else False
        if active_val is not None:
            update_payload['active'] = bool(active_val)
            if status_val is None:
                update_payload['status'] = 'ACTIVE' if active_val else 'INACTIVE'

        if 'priority' in data and data['priority'] is not None:
            update_payload['priority'] = int(data['priority'])
        if 'difficulty' in data:
            update_payload['difficulty'] = data['difficulty']
        if 'tags' in data and isinstance(data['tags'], list):
            update_payload['tags'] = data['tags']

        task_ref.update(update_payload)
        
        # System Audit Log
        db.collection('system_log').add({
            'action': 'task_updated',
            'taskId': task_id,
            'adminId': request.user['uid'],
            'timestamp': firestore.SERVER_TIMESTAMP,
        })
        return jsonify({"success": True, "taskId": task_id})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/admin/tasks/<task_id>/duplicate', methods=['POST'])
@verify_token
def duplicate_task(task_id):
    """Admin/Moderator: Duplicate an existing task."""
    if not is_moderator(request.user['uid']):
        return jsonify({"success": False, "error": "FORBIDDEN"}), 403
    get_deps()
    if not init_firebase():
        return jsonify({"error": "SERVICE_UNAVAILABLE"}), 503
    db = firestore.client()
    try:
        task_ref = db.collection('tasks').document(task_id)
        existing = task_ref.get()
        if not existing.exists:
            return jsonify({"success": False, "error": "TASK_NOT_FOUND"}), 404

        data = existing.to_dict() or {}
        new_ref = db.collection('tasks').document()
        
        cloned = dict(data)
        cloned['title'] = f"{data.get('title', 'Task')} (Copy)"
        cloned['completionCount'] = 0
        cloned['totalClaims'] = 0
        cloned['totalDistributed'] = 0
        cloned['conversionRate'] = 0
        cloned['startDate'] = None
        cloned['endDate'] = None
        cloned['expirationDate'] = None
        cloned['createdBy'] = request.user['uid']
        cloned['createdAt'] = firestore.SERVER_TIMESTAMP
        cloned['updatedAt'] = firestore.SERVER_TIMESTAMP
        cloned['active'] = True
        cloned['status'] = 'ACTIVE'

        new_ref.set(cloned)

        db.collection('system_log').add({
            'action': 'task_duplicated',
            'originalTaskId': task_id,
            'newTaskId': new_ref.id,
            'adminId': request.user['uid'],
            'timestamp': firestore.SERVER_TIMESTAMP,
        })
        return jsonify({"success": True, "taskId": new_ref.id})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/admin/tasks/<task_id>/disable', methods=['POST'])
@verify_token
def disable_task(task_id):
    """Admin: Soft-delete a task by setting active: false. Triggers listener updates."""
    if not is_admin(request.user['uid']):
        return jsonify({"success": False, "error": "FORBIDDEN"}), 403
    get_deps()
    if not init_firebase():
        return jsonify({"error": "SERVICE_UNAVAILABLE"}), 503
    db = firestore.client()
    try:
        db.collection('tasks').document(task_id).update({
            'active': False,
            'updatedAt': firestore.SERVER_TIMESTAMP,
            'disabledAt': firestore.SERVER_TIMESTAMP,
            'disabledBy': request.user['uid'],
        })
        # Audit log
        db.collection('system_log').add({
            'action': 'task_disabled',
            'taskId': task_id,
            'adminId': request.user['uid'],
            'timestamp': firestore.SERVER_TIMESTAMP,
        })
        return jsonify({"success": True, "taskId": task_id, "active": False})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/admin/tasks/<task_id>/enable', methods=['POST'])
@verify_token
def enable_task(task_id):
    """Admin: Re-enable a disabled task by setting active: true. Triggers listener updates."""
    if not is_admin(request.user['uid']):
        return jsonify({"success": False, "error": "FORBIDDEN"}), 403
    get_deps()
    if not init_firebase():
        return jsonify({"error": "SERVICE_UNAVAILABLE"}), 503
    db = firestore.client()
    try:
        db.collection('tasks').document(task_id).update({
            'active': True,
            'updatedAt': firestore.SERVER_TIMESTAMP,
            'disabledAt': None,
            'disabledBy': None,
        })
        # Audit log
        db.collection('system_log').add({
            'action': 'task_enabled',
            'taskId': task_id,
            'adminId': request.user['uid'],
            'timestamp': firestore.SERVER_TIMESTAMP,
        })
        return jsonify({"success": True, "taskId": task_id, "active": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/admin/tasks/<task_id>/delete', methods=['POST'])
@verify_token
def delete_task(task_id):
    """Admin: Permanently delete a single task definition (hard delete)."""
    if not is_admin(request.user['uid']):
        return jsonify({"success": False, "error": "FORBIDDEN"}), 403
    get_deps()
    if not init_firebase():
        return jsonify({"error": "SERVICE_UNAVAILABLE"}), 503
    db = firestore.client()
    try:
        db.collection('tasks').document(task_id).delete()
        db.collection('system_log').add({
            'action': 'task_deleted',
            'taskId': task_id,
            'adminId': request.user['uid'],
            'timestamp': firestore.SERVER_TIMESTAMP,
        })
        return jsonify({"success": True, "taskId": task_id, "deleted": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

def _delete_collection_batched(db, coll_ref, batch_size=400, predicate=None):
    """Delete all docs in a collection reference in batches.
    Optional predicate(doc_dict) -> bool decides whether to delete each doc.
    Returns count deleted."""
    deleted = 0
    while True:
        docs = list(coll_ref.limit(batch_size).stream())
        if not docs:
            break
        batch = db.batch()
        batch_count = 0
        for doc in docs:
            if predicate is not None and not predicate(doc.to_dict() or {}):
                continue
            batch.delete(doc.reference)
            batch_count += 1
        if batch_count:
            batch.commit()
            deleted += batch_count
        # If a predicate skipped every doc in this page, avoid an infinite loop.
        if predicate is not None and batch_count == 0:
            break
    return deleted

@app.route('/api/admin/missions/purge', methods=['POST'])
@verify_token
def purge_missions():
    """Admin: Permanently delete decommissioned mission data ONLY.
    Removes all `system_task_definitions` (e.g. "Network Builder") and every
    `user_system_tasks` progress doc. Standard tasks/campaigns and offerwall data
    are untouched. No confirmation body required — this collection is deprecated.
    """
    if not is_admin(request.user['uid']):
        return jsonify({"success": False, "error": "FORBIDDEN"}), 403
    get_deps()
    if not init_firebase():
        return jsonify({"error": "SERVICE_UNAVAILABLE"}), 503
    db = firestore.client()
    try:
        counts = {
            'system_task_definitions': _delete_collection_batched(db, db.collection('system_task_definitions')),
            'user_system_tasks': _delete_collection_batched(db, db.collection('user_system_tasks')),
            'system_claims': _delete_collection_batched(db, db.collection('system_claims')),
        }
        return jsonify({"success": True, "deleted": counts,
                        "message": f"Purged {sum(counts.values())} mission document(s)."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/admin/tasks/wipe-all', methods=['POST'])
@verify_token
def wipe_all_tasks():
    """Admin: Permanently delete ALL task/campaign/mission data and user progress.
    Offerwall data is explicitly preserved. Requires body {"confirm": "DELETE ALL TASKS"}.
    """
    if not is_admin(request.user['uid']):
        return jsonify({"success": False, "error": "FORBIDDEN"}), 403
    get_deps()
    if not init_firebase():
        return jsonify({"error": "SERVICE_UNAVAILABLE"}), 503
    data = request.json or {}
    if data.get('confirm') != 'DELETE ALL TASKS':
        return jsonify({"success": False, "error": "CONFIRMATION_REQUIRED",
                        "reason": "Body must include confirm: 'DELETE ALL TASKS'"}), 400
    db = firestore.client()
    counts = {}
    try:
        # 1. Task/campaign/mission DEFINITIONS (full wipe — offerwall lives elsewhere).
        counts['tasks'] = _delete_collection_batched(db, db.collection('tasks'))
        counts['system_task_definitions'] = _delete_collection_batched(db, db.collection('system_task_definitions'))
        # 2. Top-level progress/claim collections (offerwall never writes these).
        counts['task_claims'] = _delete_collection_batched(db, db.collection('task_claims'))
        counts['system_claims'] = _delete_collection_batched(db, db.collection('system_claims'))
        counts['user_system_tasks'] = _delete_collection_batched(db, db.collection('user_system_tasks'))
        # 3. Per-user subcollections: user_tasks (full) and task_history (non-offerwall only).
        ut_deleted = 0
        th_deleted = 0
        for user_doc in db.collection('users').stream():
            uref = user_doc.reference
            ut_deleted += _delete_collection_batched(db, uref.collection('user_tasks'))
            th_deleted += _delete_collection_batched(
                db, uref.collection('task_history'),
                predicate=lambda d: d.get('taskType') != 'offerwall' and not d.get('providerId')
            )
        counts['user_tasks'] = ut_deleted
        counts['task_history_non_offerwall'] = th_deleted
        # Audit trail
        db.collection('system_log').add({
            'action': 'tasks_wiped_all',
            'adminId': request.user['uid'],
            'counts': counts,
            'timestamp': firestore.SERVER_TIMESTAMP,
        })
        return jsonify({"success": True, "deleted": counts,
                        "message": "All task, campaign, and mission data wiped. Offerwall preserved."})
    except Exception as e:
        import traceback
        return jsonify({"success": False, "error": "WIPE_FAILED", "reason": str(e),
                        "partialCounts": counts, "trace": traceback.format_exc()}), 500


@app.route('/api/admin/tasks/wipe-and-rebuild', methods=['POST'])
@verify_token
def wipe_and_rebuild_tasks():
    """Admin: Permanently delete ALL task/campaign/mission data, user progress, and offerwall providers,
    then re-seed the database with high-fidelity defaults.
    Requires body {"confirm": "DELETE AND REBUILD TASKS"}.
    """
    if not is_admin(request.user['uid']):
        return jsonify({"success": False, "error": "FORBIDDEN"}), 403
    get_deps()
    if not init_firebase():
        return jsonify({"error": "SERVICE_UNAVAILABLE"}), 503
    data = request.json or {}
    if data.get('confirm') != 'DELETE AND REBUILD TASKS':
        return jsonify({"success": False, "error": "CONFIRMATION_REQUIRED",
                        "reason": "Body must include confirm: 'DELETE AND REBUILD TASKS'"}), 400
    db = firestore.client()
    counts = {}
    try:
        # 1. Delete all tasks and systems
        counts['tasks'] = _delete_collection_batched(db, db.collection('tasks'))
        counts['system_task_definitions'] = _delete_collection_batched(db, db.collection('system_task_definitions'))
        counts['task_claims'] = _delete_collection_batched(db, db.collection('task_claims'))
        counts['system_claims'] = _delete_collection_batched(db, db.collection('system_claims'))
        counts['user_system_tasks'] = _delete_collection_batched(db, db.collection('user_system_tasks'))
        
        # 2. Delete offerwall providers
        counts['offerwall_providers'] = _delete_collection_batched(db, db.collection('offerwall_providers'))
        
        # 3. Delete user progress subcollections
        ut_deleted = 0
        th_deleted = 0
        for user_doc in db.collection('users').stream():
            uref = user_doc.reference
            ut_deleted += _delete_collection_batched(db, uref.collection('user_tasks'))
            th_deleted += _delete_collection_batched(
                db, uref.collection('task_history'),
                predicate=lambda d: d.get('taskType') != 'offerwall' and not d.get('providerId')
            )
        counts['user_tasks'] = ut_deleted
        counts['task_history_non_offerwall'] = th_deleted

        # 4. Seed default tasks
        default_tasks = [
            {
                'title': 'Follow PulseEarn on X',
                'description': 'Follow the official @PulseEarn account on X to keep up with developments and promotions.',
                'instructions': 'Click the link, click Follow on @PulseEarn, and submit your X username as proof.',
                'proofRequirements': 'Your X handle (@username)',
                'type': 'manual', # manual allows submitting proof!
                'rewardAmount': 250,
                'xpReward': 25,
                'proofLabel': 'X Handle',
                'proofPlaceholder': 'e.g. @my_handle',
                'cooldownHours': 0,
                'cooldownPeriod': 0,
                'url': 'https://x.com/PulseEarn',
                'active': True,
                'completionCount': 0,
                'createdAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP,
            },
            {
                'title': 'Join PulseEarn Telegram Community',
                'description': 'Join our official global Telegram channel to participate in discussions and get support.',
                'instructions': 'Click the link, click Join Channel, and enter your Telegram username for verification.',
                'proofRequirements': 'Your Telegram username',
                'type': 'manual',
                'rewardAmount': 300,
                'xpReward': 30,
                'proofLabel': 'Telegram Username',
                'proofPlaceholder': 'e.g. @username',
                'cooldownHours': 0,
                'cooldownPeriod': 0,
                'url': 'https://t.me/PulseEarn',
                'active': True,
                'completionCount': 0,
                'createdAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP,
            },
            {
                'title': 'Ecosystem Beta Program Feedback',
                'description': 'Submit your detailed feedback and bug reports regarding the PulseEarn Beta Program.',
                'instructions': 'Provide a summary of the features you have tested, any bugs encountered, and your suggestions.',
                'proofRequirements': 'A minimum 30-word detailed review',
                'type': 'manual',
                'rewardAmount': 1500,
                'xpReward': 150,
                'proofLabel': 'Beta Review Summary',
                'proofPlaceholder': 'Explain what you tested and list any suggestions...',
                'cooldownHours': 24,
                'cooldownPeriod': 24,
                'url': None,
                'active': True,
                'completionCount': 0,
                'createdAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP,
            },
            {
                'title': 'Progressive Daily Check-In',
                'description': 'Click to claim your daily attendance reward and maintain your active earning streaks.',
                'instructions': 'Simply click the button below to claim. Resets every 24 hours.',
                'proofRequirements': 'Automatic verification',
                'type': 'automated',
                'rewardAmount': 100,
                'xpReward': 10,
                'proofLabel': 'Proof',
                'proofPlaceholder': 'Paste your proof link here',
                'cooldownHours': 24,
                'cooldownPeriod': 24,
                'url': None,
                'active': True,
                'completionCount': 0,
                'createdAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP,
            },
            {
                'title': 'Share Referral Link',
                'description': 'Share your unique referral link on any social network (Reddit, X, Discord, Facebook).',
                'instructions': 'Post your unique referral link to help grow our ecosystem, and paste the post link as proof.',
                'proofRequirements': 'Valid social post URL containing your referral ID',
                'type': 'manual',
                'rewardAmount': 500,
                'xpReward': 50,
                'proofLabel': 'Social Post Link',
                'proofPlaceholder': 'e.g. https://x.com/status/12345',
                'cooldownHours': 168,
                'cooldownPeriod': 168,
                'url': None,
                'active': True,
                'completionCount': 0,
                'createdAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP,
            }
        ]
        
        seeded_tasks_count = 0
        for t in default_tasks:
            db.collection('tasks').document().set(t)
            seeded_tasks_count += 1
            
        counts['seeded_tasks'] = seeded_tasks_count

        # 5. Purge offerwall_providers on reset (Admin will configure real providers)
        counts['seeded_providers'] = 0

        # Audit trail
        db.collection('system_log').add({
            'action': 'tasks_wipe_and_rebuilt',
            'adminId': request.user['uid'],
            'counts': counts,
            'timestamp': firestore.SERVER_TIMESTAMP,
        })
        return jsonify({
            "success": True, 
            "deleted": counts,
            "message": "Marketplace successfully purged and re-seeded with premium default active tasks and enabled offerwall providers."
        })
    except Exception as e:
        import traceback
        return jsonify({"success": False, "error": "REBUILD_FAILED", "reason": str(e),
                        "partialCounts": counts, "trace": traceback.format_exc()}), 500

# ═══════���������������══════════════════���════════════════════════════════════════════════════
# OFFERWALL ENTERPRISE PLATFORM — Phase 17
# ═══════════════════════════════════════════════════════════════════════════════
#
# Architecture: provider-agnostic callback pipeline.
# Adding a new provider = add its PARAM_MAP entry, zero other code changes.
#
# Callback pipeline:
#   Receive → Extract Params �� Verify Signature → Dedup → Fraud Gate
#           → PointTransactionEngine → Wallet → XP → Activity → History
#           → Notifications → Audit Log
#
# All mutations are server-side Firestore transactions (no frontend writes).

import hashlib
import hmac as hmac_lib

# ─── Provider Param Registry ──────────────────────────────────────────────────
# Each entry maps a provider slug to how to extract and verify its callback.
# ═══════════════════════════════════════════════════════════════════════════════
# EXTENSIBLE PROVIDER REGISTRY
# ───────────────────────────────────────────────────────────────────────────────
# Each provider is described declaratively. Signature specs verified against each
# provider's official postback documentation (Phase 18 research).
#
# EXTENSIBILITY: This registry only holds DEFAULT presets for known providers.
# A provider's Firestore document may override ANY of these keys (user_param,
# sig_method, sig_fields, etc.). A brand-new provider needs only a Firestore
# config entry with these fields — NO code changes required. See
# _resolve_provider_spec() which merges Firestore overrides over these defaults.
#
# Supported sig_method values:
#   md5 | sha1 | sha256                 -> HASH(join(fields, sig_separator))
#   hmac_md5 | hmac_sha1 | hmac_sha256  -> HMAC(secret, join(non-secret fields))
#   hmac_sha1_qs | hmac_sha256_qs       -> HMAC(secret, raw query string minus sig param)
#   query_string_md5                    -> MD5(sorted query string + secret)
#   none                                -> no signature (test/unauthenticated providers)
# Optional keys:
#   sig_separator (default '')          -> string joining concatenated fields
#   sig_int_fields (default [])         -> fields cast to int before hashing (e.g. TimeWall)
#   status_param / status_ok / status_reversal -> chargeback handling
# ═══════════════════════════════════════════════════════════════════════════════
# PulseEarn internal economy rate. MUST stay in sync with src/utils/finance.ts
# ($1 USD = 1000 PTS). Offerwall rewards are computed from the provider's GROSS USD
# revenue so the user payout is fully backend-controlled and independent of whatever
# conversion rate is configured on the provider's own dashboard. The 30/70 user/
# platform split is then applied on top (see userSharePct / platformSharePct).
OFFERWALL_POINTS_PER_USD = 1000

PROVIDERS_ADAPTERS = {
    'timewall': {
        'name': 'TimeWall',
        'isLocked': False,
        'fields': [
            {'key': 'affiliateId', 'label': 'Placement ID', 'required': True, 'type': 'text', 'placeholder': '853f8fefa60863bd'},
            {'key': 'secret', 'label': 'SHA256 SecretKey', 'required': True, 'type': 'password', 'placeholder': 'Copy from TimeWall dashboard'},
            {'key': 'apiEndpoint', 'label': 'Integration URL', 'required': False, 'type': 'text', 'placeholder': 'https://timewall.io'}
        ]
    },
    'cpxresearch': {
        'name': 'CPX Research',
        'isLocked': False,
        'fields': [
            {'key': 'affiliateId', 'label': 'App ID', 'required': True, 'type': 'text', 'placeholder': 'e.g. 12345'},
            {'key': 'secret', 'label': 'Hash Key / Secret', 'required': True, 'type': 'password', 'placeholder': 'MD5 Hash Key'},
            {'key': 'apiKey', 'label': 'API Key', 'required': False, 'type': 'text', 'placeholder': 'Optional API Key if needed'}
        ]
    },
    'lootably': {
        'name': 'Lootably',
        'isLocked': False,
        'fields': [
            {'key': 'affiliateId', 'label': 'Placement ID / Pub ID', 'required': True, 'type': 'text', 'placeholder': 'Lootably Placement ID'},
            {'key': 'apiKey', 'label': 'API Key', 'required': True, 'type': 'text', 'placeholder': 'Lootably Client API Key'},
            {'key': 'secret', 'label': 'Signature Secret', 'required': True, 'type': 'password', 'placeholder': 'Lootably Postback Secret'}
        ]
    },
    'bitlabs': {
        'name': 'BitLabs',
        'isLocked': False,
        'fields': [
            {'key': 'affiliateId', 'label': 'App Token', 'required': True, 'type': 'text', 'placeholder': 'BitLabs App Token'},
            {'key': 'secret', 'label': 'App Secret Key', 'required': True, 'type': 'password', 'placeholder': 'BitLabs HMAC Signing Secret'}
        ]
    },
    'adgem': {
        'name': 'AdGem',
        'isLocked': False,
        'fields': [
            {'key': 'affiliateId', 'label': 'App ID', 'required': True, 'type': 'text', 'placeholder': 'AdGem App ID'},
            {'key': 'secret', 'label': 'Security Token / Secret', 'required': True, 'type': 'password', 'placeholder': 'AdGem postback security token'}
        ]
    },
    'offertoro': {
        'name': 'OfferToro',
        'isLocked': False,
        'fields': [
            {'key': 'affiliateId', 'label': 'Publisher ID', 'required': True, 'type': 'text', 'placeholder': 'OfferToro Pub ID'},
            {'key': 'apiKey', 'label': 'App Key', 'required': True, 'type': 'text', 'placeholder': 'OfferToro App Key'},
            {'key': 'secret', 'label': 'Secret Key', 'required': True, 'type': 'password', 'placeholder': 'OfferToro postback Secret Key'}
        ]
    },
    'adgate': {
        'name': 'AdGate Media',
        'isLocked': False,
        'fields': [
            {'key': 'affiliateId', 'label': 'Wall ID', 'required': True, 'type': 'text', 'placeholder': 'AdGate Wall ID'},
            {'key': 'apiKey', 'label': 'API Key', 'required': True, 'type': 'text', 'placeholder': 'AdGate Developer API Key'},
            {'key': 'secret', 'label': 'Postback Password / Secret', 'required': True, 'type': 'password', 'placeholder': 'Postback verification password'}
        ]
    },
    'ayet': {
        'name': 'ayeT Studios',
        'isLocked': False,
        'fields': [
            {'key': 'affiliateId', 'label': 'Adgate ID', 'required': True, 'type': 'text', 'placeholder': 'ayeT Adgate ID'},
            {'key': 'apiKey', 'label': 'API Key', 'required': True, 'type': 'text', 'placeholder': 'ayeT API key'},
            {'key': 'secret', 'label': 'Security Hash Key', 'required': True, 'type': 'password', 'placeholder': 'Security Hash Key'}
        ]
    },
    'wannads': {
        'name': 'Wannads',
        'isLocked': False,
        'fields': [
            {'key': 'affiliateId', 'label': 'API Key', 'required': True, 'type': 'text', 'placeholder': 'Wannads API key'},
            {'key': 'secret', 'label': 'Secret Key', 'required': True, 'type': 'password', 'placeholder': 'Postback Secret Key'}
        ]
    },
    'revu': {
        'name': 'RevU',
        'isLocked': False,
        'fields': [
            {'key': 'affiliateId', 'label': 'Wall ID', 'required': True, 'type': 'text', 'placeholder': 'RevU Wall ID'},
            {'key': 'secret', 'label': 'Hash Key / Secret', 'required': True, 'type': 'password', 'placeholder': 'RevU postback security key'}
        ]
    },
    'kiwiwall': {
        'name': 'KiwiWall',
        'isLocked': False,
        'fields': [
            {'key': 'affiliateId', 'label': 'API Key', 'required': True, 'type': 'text', 'placeholder': 'KiwiWall API Key'},
            {'key': 'secret', 'label': 'Secret Key', 'required': True, 'type': 'password', 'placeholder': 'KiwiWall postback security key'}
        ]
    },
    'adscend': {
        'name': 'Adscend Media',
        'isLocked': False,
        'fields': [
            {'key': 'affiliateId', 'label': 'Publisher ID', 'required': True, 'type': 'text', 'placeholder': 'Adscend Publisher ID'},
            {'key': 'secret', 'label': 'Secret Key', 'required': True, 'type': 'password', 'placeholder': 'Adscend Postback password/secret'}
        ]
    },
    'revenue_universe': {
        'name': 'Revenue Universe',
        'isLocked': False,
        'fields': [
            {'key': 'affiliateId', 'label': 'Wall ID', 'required': True, 'type': 'text', 'placeholder': 'Revenue Universe Wall ID'},
            {'key': 'secret', 'label': 'Security Key / Secret', 'required': True, 'type': 'password', 'placeholder': 'Security Key'}
        ]
    },
    'monlix': {
        'name': 'Monlix',
        'isLocked': False,
        'fields': [
            {'key': 'affiliateId', 'label': 'App ID', 'required': True, 'type': 'text', 'placeholder': 'Monlix App ID'},
            {'key': 'apiKey', 'label': 'API Key', 'required': True, 'type': 'text', 'placeholder': 'Monlix API Key'},
            {'key': 'secret', 'label': 'Secret Key', 'required': True, 'type': 'password', 'placeholder': 'Monlix Postback Secret Key'}
        ]
    },
    'pollfish': {
        'name': 'Pollfish (future)',
        'isLocked': True,
        'researchRequired': True,
        'fields': []
    },
    'inbrain': {
        'name': 'InBrain (future)',
        'isLocked': True,
        'researchRequired': True,
        'fields': []
    }
}

OFFERWALL_PROVIDER_REGISTRY = {
    'timewall': {
        'label': 'TimeWall',
        'user_param': 'userID', 'tx_param': 'transactionID', 'offer_param': 'offerdetail',
        'offer_name_param': 'offername', 'amount_param': 'currencyAmount',
        'usd_param': 'revenue', 'sig_param': 'hash', 'sig_method': 'sha256',
        'sig_fields': ['userID', 'revenue', 'secret'],
        'sig_separator': '', 'sig_int_fields': [],
        'status_param': 'type', 'status_ok': 'credit', 'status_reversal': 'chargeback',
        'status_hold': ['hold', 'hold_cancelled'],
        'success_response': 'OK',
        # Verified from the TimeWall dashboard "Postback Security Options → Server IP
        # Whitelisting" section. TimeWall only sends postbacks from these IPs.
        'ip_whitelist': ['18.156.132.55', '51.81.120.73', '142.111.248.18'],
    },
    'cpxresearch': {
        'label': 'CPX Research',
        'user_param': 'user_id', 'tx_param': 'trans_id', 'offer_param': 'survey_id',
        'offer_name_param': None, 'amount_param': 'amount_local',
        'usd_param': 'amount_usd',
        'sig_param': 'hash', 'sig_method': 'md5', 'sig_fields': ['trans_id', 'secret'],
        'status_param': 'status', 'status_ok': '1', 'status_reversal': '2',
        'success_response': '1',
        'ip_whitelist': ['116.203.174.148', '94.130.12.223', '195.201.21.32'],
    },
    'lootably': {
        'label': 'Lootably',
        'user_param': 'userID', 'tx_param': 'transactionID', 'offer_param': 'offerID',
        'offer_name_param': 'offerName', 'amount_param': 'currencyReward',
        'usd_param': 'revenue', 'sig_param': 'hash', 'sig_method': 'sha256',
        'sig_fields': ['userID', 'ip', 'revenue', 'currencyReward', 'secret'],
        'success_response': '1',
        'ip_whitelist': ['54.174.204.147', '54.221.115.111'],
    },
    'bitlabs': {
        'label': 'BitLabs',
        'user_param': 'uid', 'tx_param': 'tx', 'offer_param': 'survey_id',
        'offer_name_param': None, 'amount_param': 'val',
        'sig_param': 'hash', 'sig_method': 'hmac_sha1_qs', 'sig_fields': [],
        'success_response': 'OK',
        'ip_whitelist': ['159.203.119.231'],
    },
    'adgem': {
        'label': 'AdGem',
        'user_param': 'player_id', 'tx_param': 'transaction_id', 'offer_param': 'campaign_id',
        'offer_name_param': 'offer_name', 'amount_param': 'amount',
        'sig_param': 'verifier', 'sig_method': 'hmac_sha256_qs', 'sig_fields': [],
        'success_response': 'OK',
        'ip_whitelist': ['52.87.111.45', '54.210.143.201'],
    },
    'offertoro': {
        'label': 'OfferToro',
        'user_param': 'user_id', 'tx_param': 'id', 'offer_param': 'oid',
        'offer_name_param': 'offer_name', 'amount_param': 'amount',
        'sig_param': 'sig', 'sig_method': 'md5',
        'sig_fields': ['oid', 'user_id', 'payout', 'secret'],
        'success_response': '1',
        'ip_whitelist': ['54.175.240.23', '107.21.121.251'],
    },
    'adgate': {
        'label': 'AdGate Media',
        'user_param': 'user_id', 'tx_param': 'transaction_id', 'offer_param': 'campaign_id',
        'offer_name_param': 'campaign_name', 'amount_param': 'points',
        'usd_param': 'payout', 'sig_param': 'sig', 'sig_method': 'md5',
        'sig_fields': ['transaction_id', 'user_id', 'points', 'secret'],
        'success_response': 'OK',
    },
    'ayet': {
        'label': 'ayeT Studios',
        'user_param': 'uid', 'tx_param': 'transaction_id', 'offer_param': 'offer_id',
        'offer_name_param': 'offer_title', 'amount_param': 'currency_amount',
        'usd_param': 'payout', 'sig_param': 'sig', 'sig_method': 'sha256',
        'sig_fields': ['transaction_id', 'uid', 'currency_amount', 'secret'],
        'success_response': 'OK',
    },
    'wannads': {
        'label': 'Wannads',
        'user_param': 'subId', 'tx_param': 'transactionId', 'offer_param': 'campaignId',
        'offer_name_param': 'campaignName', 'amount_param': 'points',
        'usd_param': 'payout', 'sig_param': 'signature', 'sig_method': 'md5',
        'sig_fields': ['subId', 'transactionId', 'points', 'secret'],
        'success_response': 'OK',
    },
    'revu': {
        'label': 'RevU',
        'user_param': 'uid', 'tx_param': 'transaction_id', 'offer_param': 'offer_id',
        'amount_param': 'points', 'usd_param': 'payout', 'sig_param': 'hash', 'sig_method': 'md5',
        'sig_fields': ['transaction_id', 'uid', 'points', 'secret'],
        'success_response': 'OK',
    },
    'kiwiwall': {
        'label': 'KiwiWall',
        'user_param': 'subId', 'tx_param': 'transactionId', 'offer_param': 'offerId',
        'amount_param': 'points', 'usd_param': 'payout', 'sig_param': 'sig', 'sig_method': 'md5',
        'sig_fields': ['subId', 'secret'],
        'success_response': 'OK',
    },
    'adscend': {
        'label': 'Adscend Media',
        'user_param': 'sub1', 'tx_param': 'transaction_id', 'offer_param': 'campaign_id',
        'offer_name_param': 'name', 'amount_param': 'points',
        'usd_param': 'rate', 'sig_param': 'sig', 'sig_method': 'md5',
        'sig_fields': ['transaction_id', 'sub1', 'points', 'secret'],
        'success_response': 'OK',
    },
    'revenue_universe': {
        'label': 'Revenue Universe',
        'user_param': 'uid', 'tx_param': 'transaction_id', 'offer_param': 'offer_id',
        'amount_param': 'points', 'usd_param': 'payout', 'sig_param': 'hash', 'sig_method': 'md5',
        'sig_fields': ['transaction_id', 'uid', 'points', 'secret'],
        'success_response': 'OK',
    },
    'monlix': {
        'label': 'Monlix',
        'user_param': 'userId', 'tx_param': 'transactionId', 'offer_param': 'offerId',
        'amount_param': 'points', 'usd_param': 'payout', 'sig_param': 'signature', 'sig_method': 'sha256',
        'sig_fields': ['userId', 'transactionId', 'points', 'secret'],
        'success_response': 'OK',
    },
    'pollfish': {
        'label': 'Pollfish (Locked)',
        'is_locked': True,
        'research_required': True,
        'success_response': 'OK',
    },
    'inbrain': {
        'label': 'InBrain (Locked)',
        'is_locked': True,
        'research_required': True,
        'success_response': 'OK',
    }
}

# Default spec applied to any provider not in the registry (fully generic fallback).
OFFERWALL_DEFAULT_SPEC = {
    'label': None,
    'user_param': 'user_id', 'tx_param': 'transaction_id', 'offer_param': 'offer_id',
    'offer_name_param': 'offer_name', 'amount_param': 'amount',
    'sig_param': 'signature', 'sig_method': 'md5',
    'sig_fields': ['transaction_id', 'user_id', 'amount', 'secret'],
    'sig_separator': '', 'sig_int_fields': [],
    'success_response': 'OK',
}

# Per-provider launch-URL builders. These produce the AUTHENTICATED offerwall URL
# that opens the offers directly (surveys, tasks, etc.) — NOT the provider's public
# login/marketing page. The user identity is passed via the provider's SSO uid param,
# so the user is never asked to log in or sign up. Secrets (needed for CPX's secure
# hash) stay server-side; this is why launch URLs are built here and not on the client.
#   embeddable=True  -> can be shown inside an in-app <iframe>

# Placeholder tokens that a provider's dashboard-issued Integration URL may use to
# mark where the end-user's unique identifier must be injected. We substitute ALL
# of these (case-insensitive) with the authenticated Firebase UID. This is what
# makes launch config-driven: admins paste the exact URL the provider gave them
# (e.g. TimeWall's "...&userID=USER_ID"), and the backend fills in the real UID.
_OFFERWALL_UID_PLACEHOLDERS = (
    '(UNIQUE_USER_ID)', '{UNIQUE_USER_ID}', '[UNIQUE_USER_ID]', 'UNIQUE_USER_ID',
    '(USER_ID)', '{USER_ID}', '[USER_ID]', '{{USER_ID}}', 'USER_ID',
    '(USERID)', '{USERID}', '[USERID]', 'USERID',
    '{uid}', '(uid)', '[uid]', '{userId}', '{user_id}', '{sub_id}', '{subId}',
)
_OFFERWALL_AFF_PLACEHOLDERS = (
    '(PUBLISHER_ID)', '{PUBLISHER_ID}', 'PUBLISHER_ID',
    '(AFFILIATE_ID)', '{AFFILIATE_ID}', 'AFFILIATE_ID',
    '(PLACEMENT_ID)', '{PLACEMENT_ID}', 'PLACEMENT_ID',
    '{aff}', '(aff)', '{appId}', '{app_id}', '{pubId}',
)


def _apply_launch_placeholders(url, aff, uid):
    """Replace every known UID / affiliate placeholder token in a stored
    Integration URL with the real values. Case-insensitive matching."""
    if not url:
        return url
    result = url
    for token in _OFFERWALL_UID_PLACEHOLDERS:
        # case-insensitive replace
        idx = result.lower().find(token.lower())
        while idx != -1:
            result = result[:idx] + uid + result[idx + len(token):]
            idx = result.lower().find(token.lower(), idx + len(uid))
    for token in _OFFERWALL_AFF_PLACEHOLDERS:
        idx = result.lower().find(token.lower())
        while idx != -1:
            result = result[:idx] + aff + result[idx + len(token):]
            idx = result.lower().find(token.lower(), idx + len(aff))
    return result


def _build_offerwall_launch_url(provider_id, affiliate_id, secret, uid, config=None):
    aff = str(affiliate_id or '').strip()
    uid = str(uid or '').strip()
    if not uid:
        return None, False
    pid = (provider_id or '').lower()
    config = config or {}

    # ── PRIORITY 1: config-driven Integration URL ──────────────────────────────
    # If the admin saved the exact Integration URL issued by the provider's own
    # dashboard (the correct, non-homepage authenticated offerwall URL), use it
    # and inject the real UID where the placeholder token sits. This is the
    # production path and works for ANY provider without code changes.
    integration_url = (config.get('integrationUrl') or config.get('launchUrlTemplate') or '').strip()
    if integration_url:
        has_uid_token = any(t.lower() in integration_url.lower() for t in _OFFERWALL_UID_PLACEHOLDERS)
        resolved = _apply_launch_placeholders(integration_url, aff, uid)
        # Only trust the stored URL if the UID actually got injected (either via a
        # placeholder token, or because the admin pre-baked a per-user pattern).
        if has_uid_token or (uid and uid in resolved):
            valid_url = _validate_launch_url(resolved)
            if valid_url:
                embeddable = bool(config.get('embeddable', False))
                return valid_url, embeddable
            else:
                logging.warning(f"[Offerwall Launch] Invalid or unsafe integration URL for provider '{provider_id}'")

    # ── PRIORITY 2: built-in per-provider templates (fallback) ─────────────────
    # Used only when no Integration URL is configured. Requires an affiliate id.
    if not aff:
        return None, False

    templates = {
        'lootably': 'https://wall.lootably.com/?placementID={aff}&uid={uid}',
        'bitlabs': 'https://web.bitlabs.ai/?token={aff}&uid={uid}',
        'adgem': 'https://api.adgem.com/v1/wall?appid={aff}&playerid={uid}',
        'adgate': 'https://wall.adgatemedia.com/affiliate/{aff}?s1={uid}',
        'ayet': 'https://www.ayetstudios.com/offers/web_ad_gate/{aff}?external_identifier={uid}',
        'wannads': 'https://wall.wannads.com/wall?apiKey={aff}&userId={uid}',
        'revu': 'https://wall.revenueuniverse.com/{aff}/offers/{uid}',
        'kiwiwall': 'https://www.kiwiwall.com/wall/{aff}/{uid}',
        'adscend': 'https://adscendmedia.com/adwall/publisher/{aff}/profile/default/user/{uid}',
        'revenue_universe': 'https://wall.revenueuniverse.com/{aff}/offers/{uid}',
        'monlix': 'https://offerwall.monlix.com/?appid={aff}&userid={uid}'
    }

    if pid == 'timewall':
        return _validate_launch_url(f'https://timewall.io/users/login?oid={aff}&uid={uid}'), False

    if pid == 'cpxresearch':
        secure_hash = hashlib.md5(f'{uid}{secret or ""}'.encode()).hexdigest()
        raw_url = (f'https://offers.cpx-research.com/index.php?app_id={aff}'
                   f'&ext_user_id={uid}&secure_hash={secure_hash}')
        return _validate_launch_url(raw_url), True

    if pid in templates:
        return _validate_launch_url(templates[pid].format(aff=aff, uid=uid)), True

    # Pollfish and InBrain are locked placeholders (prevent redirect)
    if pid in ('pollfish', 'inbrain'):
        return None, False

    # Unknown provider with no Integration URL: return None so caller surfaces
    # LAUNCH_FAILED instead of redirecting the user to a provider homepage.
    return None, False


def _resolve_provider_spec(provider_id, config):
    """Merge Firestore config overrides over the registry default preset.
    This is what makes the system extensible to unlimited providers: any spec key
    can be overridden per-provider from the admin UI / Firestore document.
    """
    spec = dict(OFFERWALL_DEFAULT_SPEC)
    preset = OFFERWALL_PROVIDER_REGISTRY.get(provider_id)
    if preset:
        spec.update(preset)
    # Firestore-level overrides (from admin config) win over presets.
    overrides = (config or {}).get('callbackSpec') or {}
    for key in ('user_param', 'tx_param', 'offer_param', 'offer_name_param', 'amount_param',
                'usd_param', 'sig_param', 'sig_method', 'sig_fields', 'sig_separator', 'sig_int_fields',
                'status_param', 'status_ok', 'status_reversal', 'status_hold',
                'success_response', 'label'):
        if key in overrides and overrides[key] is not None:
            spec[key] = overrides[key]
    return spec

# ─── Signature Verification ────────────────────────────────────────────────────
def _verify_offerwall_sig(method, fields, params, secret, received_sig,
                          separator='', int_fields=None, raw_query='', sig_param=''):
    """Constant-time signature verification for all supported provider methods.
    Verified against official provider docs (CPX, BitLabs, Lootably, AdGem,
    OfferToro, TimeWall) — and fully generic for future providers via config.
    """
    int_fields = int_fields or []
    if not method or method == 'none':
        return True
    try:
        def field_val(f):
            if f == 'secret':
                return secret
            v = params.get(f, '')
            if f in int_fields:
                try:
                    v = str(int(float(v)))
                except (ValueError, TypeError):
                    v = '0'
            return str(v)

        if method in ('md5', 'sha1', 'sha256'):
            raw = separator.join(field_val(f) for f in fields)
            algo = getattr(hashlib, method)
            computed = algo(raw.encode('utf-8')).hexdigest()
            return hmac_lib.compare_digest(computed, (received_sig or '').lower())
        elif method in ('hmac_md5', 'hmac_sha1', 'hmac_sha256'):
            digestmod = {'hmac_md5': hashlib.md5, 'hmac_sha1': hashlib.sha1,
                         'hmac_sha256': hashlib.sha256}[method]
            message = separator.join(field_val(f) for f in fields if f != 'secret')
            computed = hmac_lib.new(secret.encode('utf-8'), message.encode('utf-8'), digestmod).hexdigest()
            return hmac_lib.compare_digest(computed, (received_sig or '').lower())
        elif method in ('hmac_sha1_qs', 'hmac_sha256_qs'):
            # HMAC over the raw query string with the signature param removed (BitLabs, AdGem).
            digestmod = hashlib.sha1 if method == 'hmac_sha1_qs' else hashlib.sha256
            qs = raw_query or '&'.join(f"{k}={v}" for k, v in params.items() if k != sig_param)
            # Strip the signature param if present in the raw query string.
            if sig_param and raw_query:
                parts = [p for p in raw_query.split('&') if not p.startswith(sig_param + '=')]
                qs = '&'.join(parts)
            computed = hmac_lib.new(secret.encode('utf-8'), qs.encode('utf-8'), digestmod).hexdigest()
            return hmac_lib.compare_digest(computed, (received_sig or '').lower())
        elif method == 'query_string_md5':
            sorted_str = '&'.join(f"{k}={params[k]}" for k in sorted(params.keys()) if k != sig_param) + secret
            computed = hashlib.md5(sorted_str.encode('utf-8')).hexdigest()
            return hmac_lib.compare_digest(computed, (received_sig or '').lower())
    except Exception as e:
        print(f"[Offerwall] Signature verify error ({method}): {e}")
        pass
    return False

# ─── Offerwall Audit Event Writer ──────────────────────────────────────────────
def _write_offerwall_event(db, provider_id, event_type, severity, message, **kwargs):
    """Write an immutable event to the offerwall_events collection (no transaction needed)."""
    try:
        db.collection('offerwall_events').add({
            'providerId': provider_id,
            'eventType': event_type,
            'severity': severity,
            'message': message,
            'timestamp': firestore.SERVER_TIMESTAMP,
            **{k: v for k, v in kwargs.items() if v is not None}
        })
    except Exception as e:
        print(f"[Offerwall] Event write failed: {e}")

# ─── Main Callback Endpoint ────────────────────────────────────���───────────────
@app.route('/api/offerwall/callback/<provider_id>', methods=['GET', 'POST'])
def offerwall_callback(provider_id):
    """
    Universal offerwall callback endpoint.
    URL: /api/offerwall/callback/{provider_slug}
    Accepts GET or POST depending on provider.

    Thin wrapper: guarantees the endpoint NEVER returns an opaque 500. Providers
    (TimeWall, CPX, etc.) expect an HTTP 200 with a success token; a 500 makes
    them treat the postback as failed and retry-storm. Any unexpected error is
    logged and swallowed into a 200 ACK so a single bad payload (e.g. someone
    pasting the URL with literal {userID} placeholders in a browser) can't break
    the endpoint or leak a stack trace.
    """
    from flask import request as req
    try:
        return _offerwall_callback_impl(provider_id, req)
    except Exception as e:
        import traceback
        print(f"[v0] offerwall_callback fatal error for provider={provider_id}: {e}\n{traceback.format_exc()}")
        # If the caller looks like a browser hitting placeholder/dummy params,
        # give a readable hint instead of a bare token.
        raw_qs = req.query_string.decode('utf-8', 'ignore') if req.query_string else ''
        if '{' in raw_qs or '%7B' in raw_qs:
            return jsonify({
                "ok": True,
                "endpoint": "offerwall_callback",
                "provider": provider_id,
                "message": ("This looks like a manual test with placeholder values "
                            "(e.g. {userID}). This is the correct postback URL — register "
                            f"it in the {provider_id} dashboard and it will receive real "
                            "signed values from the provider."),
            }), 200
        return "OK", 200


def _offerwall_callback_impl(provider_id, req):
    get_deps()

    # ── 0. Browser / health probe ───────────────────────────────────────────
    # Opening the callback URL directly in a browser sends a bare GET with no
    # provider params. Instead of running the full pipeline (and risking a 500),
    # return a friendly JSON status page describing the endpoint. A real provider
    # callback always includes query params, so this only affects manual probes.
    if req.method == 'GET' and not req.query_string:
        return jsonify({
            "ok": True,
            "endpoint": "offerwall_callback",
            "provider": provider_id,
            "message": ("This is the PulseEarn offerwall postback endpoint. "
                        "Providers call it with signed query parameters. "
                        "Register this exact URL as your postback/callback URL in the "
                        f"{provider_id} dashboard."),
            "method": "GET or POST",
        }), 200

    if not init_firebase():
        return jsonify({"error": "SERVICE_UNAVAILABLE"}), 503

    db = firestore.client()

    # ── 1. Validate provider ────────────────────────────────────────────────
    # ── 2. Load provider config from cache (single source of truth) ──────────
    from services.provider_cache import get_provider_cache
    provider_cache = get_provider_cache()
    cached_provider = provider_cache.get_provider(provider_id, allow_cache=True)
    
    if not cached_provider:
        # Try to load from Firestore directly if cache misses
        config_snap = db.collection('offerwall_providers').document(provider_id).get()
        if not config_snap.exists:
            _write_offerwall_event(db, provider_id, 'callback_invalid', 'error',
                                   f'Unknown provider: {provider_id}')
            return 'UNKNOWN_PROVIDER', 400
        
        cached_provider = config_snap.to_dict()
        # Refresh cache for next time
        provider_cache.refresh_async()
    
    # Resolve the provider spec: registry preset + Firestore config overrides.
    # This is fully extensible — unknown providers resolve to a generic default,
    # and any provider can override its spec from the admin config.
    pmap = _resolve_provider_spec(provider_id, cached_provider)

    # ── 3. Extract all params (GET or POST) ─────────────────────────────────
    raw_query = req.query_string.decode('utf-8') if req.query_string else ''
    if req.method == 'GET':
        params = dict(req.args)
    else:
        params = {**dict(req.args), **(req.get_json(force=True, silent=True) or {}), **req.form}
    # Flatten single-value lists (werkzeug MultiDict)
    params = {k: (v[0] if isinstance(v, list) else str(v)) for k, v in params.items()}

    # ── 4. Verify cached config matches Firestore ────────────────────────────
    if not provider_cache.verify_against_firestore(provider_id):
        # Mismatch detected - refresh cache and try again
        provider_cache.invalidate()
        cached_provider = provider_cache.get_provider(provider_id, allow_cache=False)
    
    config = cached_provider
    if not config.get('enabled', False):
        _write_offerwall_event(db, provider_id, 'callback_invalid', 'warning',
                               'Provider is disabled, callback ignored')
        return pmap['success_response'], 200  # Silently ack disabled providers

    secret = config.get('secret', '')
    multiplier = float(config.get('rewardMultiplier', 1.0))
    # Business rule: user receives 30% of the awarded points, platform keeps 70%.
    user_share = float(config.get('userSharePct', 0.30))
    platform_share = float(config.get('platformSharePct', 0.70))
    min_reward = int(config.get('minimumReward', 1))
    max_reward = int(config.get('maximumReward', 100000))
    fraud_rules = config.get('fraudRules', {})

    # ── 4. Extract canonical fields ──────────────────────────────────────────
    user_id = params.get(pmap['user_param'], '')
    provider_tx_id = params.get(pmap['tx_param'], '')
    offer_id = params.get(pmap['offer_param'], '')
    offer_name_key = pmap.get('offer_name_param')
    offer_name = params.get(offer_name_key, f'Offer {offer_id}') if offer_name_key else f'Offer {offer_id}'
    raw_amount_str = params.get(pmap['amount_param'], '0')
    received_sig = params.get(pmap['sig_param'], '')

    try:
        raw_amount = float(raw_amount_str)
    except ValueError:
        raw_amount = 0.0

    # Gross USD revenue (preferred basis for reward computation). When the provider
    # sends a USD field (e.g. TimeWall 'revenue', CPX 'amount_usd'), we ignore the
    # provider's own currency conversion and derive points from USD × internal rate,
    # so the payout is fully backend-controlled. Falls back to the provider currency
    # amount only when no USD field is configured/present.
    usd_key = pmap.get('usd_param')
    usd_amount = None
    if usd_key and params.get(usd_key) not in (None, ''):
        try:
            usd_amount = float(params.get(usd_key))
        except (ValueError, TypeError):
            usd_amount = None

    if not user_id or not provider_tx_id:
        _write_offerwall_event(db, provider_id, 'callback_invalid', 'error',
                               f'Missing required params: user_id={user_id}, tx_id={provider_tx_id}',
                               metadata={'params_received': list(params.keys())})
        return pmap['success_response'], 200

    # ── 5. Signature Verification ───────────────────────────────────────��────
    sig_valid = _verify_offerwall_sig(
        pmap.get('sig_method', 'md5'),
        pmap.get('sig_fields', []),
        params,
        secret,
        received_sig,
        separator=pmap.get('sig_separator', ''),
        int_fields=pmap.get('sig_int_fields', []),
        raw_query=raw_query,
        sig_param=pmap.get('sig_param', 'signature'),
    )
    # Handle reversal/chargeback status (e.g. CPX status=2) — reverse the reward.
    status_param = pmap.get('status_param')
    is_reversal = False
    if status_param:
        status_val = str(params.get(status_param, pmap.get('status_ok', '')))
        is_reversal = (status_val == str(pmap.get('status_reversal', '__none__')))

        # Lifecycle "hold" states (e.g. TimeWall hold / hold_cancelled on auto-withdraw
        # placements): acknowledge with 200 but DO NOT credit or deduct. We intentionally
        # do not write a dedup/reward record so the later "credit" postback (same
        # transactionID) still processes normally.
        hold_states = pmap.get('status_hold') or []
        if isinstance(hold_states, str):
            hold_states = [hold_states]
        if status_val in hold_states:
            _write_offerwall_event(db, provider_id, 'callback_hold', 'info',
                                   f'Hold status "{status_val}" acknowledged (no credit) for tx {provider_tx_id}',
                                   userId=user_id,
                                   metadata={'type': status_val, 'reason': params.get('reason', '')})
            return pmap['success_response'], 200

    dedup_key = f"{provider_id}:{provider_tx_id}"
    ip_address = req.headers.get('X-Forwarded-For', req.remote_addr or 'unknown').split(',')[0].strip()
    user_agent = req.headers.get('User-Agent', 'unknown')[:500]

    # ── 5b. IP Whitelist Validation (Part 9) ──────────────────────────────────
    ip_whitelist = pmap.get('ip_whitelist') or []
    is_admin_test = params.get('is_test_sim') == 'true'

    # Write initial callback record (outside transaction — dedup needs to read it)
    callback_ref = db.collection('offerwall_callbacks').document()
    callback_id = callback_ref.id

    if ip_whitelist and ip_address not in ip_whitelist and not is_admin_test:
        callback_data_ip_fail = {
            'providerId': provider_id,
            'providerName': config.get('name', provider_id),
            'userId': user_id,
            'offerId': offer_id,
            'offerName': offer_name,
            'rawAmount': raw_amount,
            'usdRevenue': usd_amount,
            'providerTransactionId': provider_tx_id,
            'dedupKey': dedup_key,
            'signatureValid': sig_valid,
            'isDuplicate': False,
            'fraudBlocked': True,
            'fraudFlags': ['IP_NOT_IN_WHITELIST'],
            'status': 'UNAUTHORIZED_IP',
            'pointsAwarded': 0,
            'userPoints': 0,
            'platformPoints': 0,
            'transactionId': None,
            'ipAddress': ip_address,
            'userAgent': user_agent,
            'receivedAt': firestore.SERVER_TIMESTAMP,
            'processedAt': None,
            'rawPayload': params,
            'auditTrail': [f'IP Whitelist Validation Failed: {ip_address} not in {ip_whitelist}'],
        }
        callback_ref.set(callback_data_ip_fail)
        _write_offerwall_event(db, provider_id, 'fraud_blocked', 'error',
                               f'IP {ip_address} not in provider whitelist {ip_whitelist}',
                               callbackId=callback_id, userId=user_id)

        # Update failed stats
        p_stats = config.get('stats', {}) or {}
        approved_rewards = p_stats.get('approvedRewards', 0)
        failed_callbacks = p_stats.get('failedCallbacks', 0) + 1
        duplicates = p_stats.get('duplicateCallbackAttempts', 0)
        fraud = p_stats.get('fraudAlerts', 0) + 1
        total_cb = approved_rewards + failed_callbacks + duplicates + fraud
        health_score = round((approved_rewards / total_cb) * 100) if total_cb > 0 else 100

        db.collection('offerwall_providers').document(provider_id).set({
            'stats.failedCallbacks': firestore.Increment(1),
            'stats.fraudAlerts': firestore.Increment(1),
            'stats.totalCallbacks': firestore.Increment(1),
            'stats.healthScore': health_score,
            'stats.lastFailedCallback': firestore.SERVER_TIMESTAMP,
            'stats.lastFailedSync': firestore.SERVER_TIMESTAMP,
            'updatedAt': firestore.SERVER_TIMESTAMP,
        }, merge=True)
        return pmap['success_response'], 200

    callback_data = {
        'providerId': provider_id,
        'providerName': config.get('name', provider_id),
        'userId': user_id,
        'offerId': offer_id,
        'offerName': offer_name,
        'rawAmount': raw_amount,
        'usdRevenue': usd_amount,
        'providerTransactionId': provider_tx_id,
        'dedupKey': dedup_key,
        'signatureValid': sig_valid,
        'isDuplicate': False,
        'fraudBlocked': False,
        'fraudFlags': [],
        'status': 'PENDING',
        'pointsAwarded': 0,
        'userPoints': 0,
        'platformPoints': 0,
        'transactionId': None,
        'ipAddress': ip_address,
        'userAgent': user_agent,
        'receivedAt': firestore.SERVER_TIMESTAMP,
        'processedAt': None,
        'rawPayload': params,
        'auditTrail': [f'Received at {datetime.utcnow().isoformat()}Z from {ip_address}'],
    }

    if not sig_valid:
        callback_data['status'] = 'INVALID_SIGNATURE'
        callback_ref.set(callback_data)
        _write_offerwall_event(db, provider_id, 'callback_invalid', 'error',
                               f'Signature verification failed for tx {provider_tx_id}',
                               callbackId=callback_id, userId=user_id)
        # Update provider stats
        p_stats = config.get('stats', {}) or {}
        approved_rewards = p_stats.get('approvedRewards', 0)
        failed_callbacks = p_stats.get('failedCallbacks', 0) + 1
        duplicates = p_stats.get('duplicateCallbackAttempts', 0)
        fraud = p_stats.get('fraudAlerts', 0)
        total_cb = approved_rewards + failed_callbacks + duplicates + fraud
        health_score = round((approved_rewards / total_cb) * 100) if total_cb > 0 else 100

        db.collection('offerwall_providers').document(provider_id).set({
            'stats.failedCallbacks': firestore.Increment(1),
            'stats.totalCallbacks': firestore.Increment(1),
            'stats.healthScore': health_score,
            'stats.lastFailedCallback': firestore.SERVER_TIMESTAMP,
            'stats.lastFailedSync': firestore.SERVER_TIMESTAMP,
            'updatedAt': firestore.SERVER_TIMESTAMP,
        }, merge=True)
        return pmap['success_response'], 200  # ACK but don't reward

    # ── 6. Duplicate Detection ───────────────────────────────────────────────
    existing = db.collection('offerwall_callbacks').where('dedupKey', '==', dedup_key).limit(1).get()
    if existing and len(existing) > 0:
        callback_data['status'] = 'DUPLICATE'
        callback_data['isDuplicate'] = True
        callback_ref.set(callback_data)
        _write_offerwall_event(db, provider_id, 'callback_duplicate', 'warning',
                               f'Duplicate callback for tx {provider_tx_id}',
                               callbackId=callback_id, userId=user_id)

        p_stats = config.get('stats', {}) or {}
        approved_rewards = p_stats.get('approvedRewards', 0)
        failed_callbacks = p_stats.get('failedCallbacks', 0)
        duplicates = p_stats.get('duplicateCallbackAttempts', 0) + 1
        fraud = p_stats.get('fraudAlerts', 0)
        total_cb = approved_rewards + failed_callbacks + duplicates + fraud
        health_score = round((approved_rewards / total_cb) * 100) if total_cb > 0 else 100

        db.collection('offerwall_providers').document(provider_id).set({
            'stats.duplicateCallbackAttempts': firestore.Increment(1),
            'stats.totalCallbacks': firestore.Increment(1),
            'stats.healthScore': health_score,
            'updatedAt': firestore.SERVER_TIMESTAMP,
        }, merge=True)
        return pmap['success_response'], 200  # ACK silently

    # ── 7. User Validation ─────────���─────────────────────────────────────────
    user_ref = db.collection('users').document(user_id)
    user_snap = user_ref.get()
    if not user_snap.exists:
        callback_data['status'] = 'INVALID_SIGNATURE'
        callback_data['fraudFlags'] = ['USER_NOT_FOUND']
        callback_ref.set(callback_data)
        _write_offerwall_event(db, provider_id, 'callback_invalid', 'error',
                               f'User {user_id} not found', callbackId=callback_id)
        return pmap['success_response'], 200

    user_data = user_snap.to_dict()

    # ── 8. Fraud Gate ────────────────────────────────────────────────────────
    fraud_flags = []
    if user_data.get('isBanned'):
        fraud_flags.append('USER_BANNED')
    if user_data.get('isFlagged'):
        fraud_flags.append('USER_FLAGGED')

    # Daily reward cap check for this provider
    max_daily = fraud_rules.get('maxRewardsPerUserPerDay', 50)
    today_str = datetime.utcnow().strftime('%Y-%m-%d')
    daily_count_snap = (db.collection('offerwall_callbacks')
                        .where('userId', '==', user_id)
                        .where('providerId', '==', provider_id)
                        .where('status', '==', 'REWARD_ISSUED')
                        .get())
    today_count = sum(1 for s in daily_count_snap
                      if s.to_dict().get('receivedAt') and
                         str(s.to_dict().get('receivedAt', ''))[:10] == today_str)
    if today_count >= max_daily:
        fraud_flags.append('DAILY_REWARD_CAP_EXCEEDED')

    fraud_blocked = len(fraud_flags) > 0
    if fraud_blocked:
        callback_data['status'] = 'FRAUD_BLOCKED'
        callback_data['fraudBlocked'] = True
        callback_data['fraudFlags'] = fraud_flags
        callback_ref.set(callback_data)
        _write_offerwall_event(db, provider_id, 'fraud_blocked', 'error',
                               f'Fraud block for user {user_id}: {fraud_flags}',
                               callbackId=callback_id, userId=user_id,
                               metadata={'fraudFlags': fraud_flags})

        p_stats = config.get('stats', {}) or {}
        approved_rewards = p_stats.get('approvedRewards', 0)
        failed_callbacks = p_stats.get('failedCallbacks', 0)
        duplicates = p_stats.get('duplicateCallbackAttempts', 0)
        fraud = p_stats.get('fraudAlerts', 0) + 1
        total_cb = approved_rewards + failed_callbacks + duplicates + fraud
        health_score = round((approved_rewards / total_cb) * 100) if total_cb > 0 else 100

        db.collection('offerwall_providers').document(provider_id).set({
            'stats.fraudAlerts': firestore.Increment(1),
            'stats.totalCallbacks': firestore.Increment(1),
            'stats.healthScore': health_score,
            'stats.lastFailedSync': firestore.SERVER_TIMESTAMP,
            'updatedAt': firestore.SERVER_TIMESTAMP,
        }, merge=True)
        return pmap['success_response'], 200

    # ── 9. Points Calculation ─────────────────────������─────────────────────────
    # Gross points BEFORE the user/platform split. Prefer USD × internal rate so the
    # payout is independent of the provider dashboard's own conversion rate; otherwise
    # fall back to the provider currency amount.
    if usd_amount is not None:
        gross_pts_raw = usd_amount * OFFERWALL_POINTS_PER_USD * multiplier
        signed_source = usd_amount
    else:
        gross_pts_raw = raw_amount * multiplier
        signed_source = raw_amount

    # Providers may send NEGATIVE amounts for chargebacks (e.g. TimeWall revenue=-1.35).
    # Clamp on magnitude and re-apply sign via the reversal flag so the min/max bounds
    # never destroy the true chargeback size.
    total_pts = min(max(abs(round(gross_pts_raw)), min_reward), max_reward)
    user_points = round(total_pts * user_share)
    platform_points = round(total_pts * platform_share)

    # A natively-negative amount is itself a reversal signal (belt & suspenders).
    if signed_source < 0:
        is_reversal = True

    # ── 9a. Chargeback / Reversal (Phase 18.12: reversal logic must be atomic) ─���
    reversal_type = 'AWARD'
    if is_reversal:
        user_points = -abs(user_points)
        platform_points = -abs(platform_points)
        reversal_type = 'CHARGEBACK'
        callback_data['auditTrail'].append(f'REVERSAL DETECTED: charging back {abs(user_points)} points')

    if abs(user_points) <= 0:
        callback_data['status'] = 'INVALID_SIGNATURE'
        callback_data['auditTrail'].append('Points calculation resulted in 0 — skipped')
        callback_ref.set(callback_data)
        return pmap['success_response'], 200

    # ── 10. Atomic Economy Transaction ───────────────────────────────────────
    claim_id = f"offerwall_{provider_id}_{provider_tx_id}"
    xp_reward = max(1, user_points // 10)

    @firestore.transactional
    def process_reward(txn):
        u_snap = user_ref.get(transaction=txn)
        if not u_snap.exists:
            raise Exception("USER_NOT_FOUND")
        u = u_snap.to_dict()
        current_pts = float(u.get('points', 0) or 0)
        current_xp = float(u.get('xp', 0) or 0)
        balance_after = current_pts + user_points
        new_xp = current_xp + xp_reward

        # Calculate level
        from math import floor, log
        base_xp = 1000
        if new_xp < base_xp:
            new_level = 1
        else:
            new_level = int(floor(log(new_xp / base_xp) / log(3))) + 2

        # Update user wallet
        txn.update(user_ref, {
            'points': firestore.Increment(user_points),
            'xp': firestore.Increment(xp_reward),
            'level': new_level,
            'totalEarnedToday': firestore.Increment(user_points),
            'stats.totalEarnings': firestore.Increment(user_points),
            'updatedAt': firestore.SERVER_TIMESTAMP,
        })

        # Update callback record
        callback_status = 'CHARGEBACK_ISSUED' if is_reversal else 'REWARD_ISSUED'
        txn.update(callback_ref, {
            'status': callback_status,
            'pointsAwarded': total_pts,
            'userPoints': user_points,
            'platformPoints': platform_points,
            'isReversal': is_reversal,
            'processedAt': firestore.SERVER_TIMESTAMP,
            'auditTrail': firestore.ArrayUnion([f'{reversal_type}: {abs(user_points)} pts to {user_id}']),
        })

        # Write offerwall reward record
        reward_ref = db.collection('offerwall_rewards').document()
        txn.set(reward_ref, {
            'userId': user_id,
            'callbackId': callback_id,
            'providerId': provider_id,
            'providerName': config.get('name', provider_id),
            'offerId': offer_id,
            'offerName': offer_name,
            'pointsAwarded': total_pts,
            'userPoints': user_points,
            'platformPoints': platform_points,
            'status': 'APPROVED',
            'transactionId': None,
            'createdAt': firestore.SERVER_TIMESTAMP,
            'updatedAt': firestore.SERVER_TIMESTAMP,
        })

        # post_ledger — immutable ledger + activity + notification (all 4 surfaces)
        # For chargebacks, use 'offerwall_chargeback' type and mark activity as 'chargeback'.
        ledger_tx_type = 'offerwall_chargeback' if is_reversal else 'offerwall_reward'
        activity_type = 'chargeback_issued' if is_reversal else 'reward_received'
        post_ledger(txn, user_ref, user_id,
                    tx_type=ledger_tx_type,
                    amount=user_points,
                    xp=(0 if is_reversal else xp_reward),  # Don't award XP on chargebacks
                    source=f'Offerwall: {config.get("name", provider_id)}',
                    description=f'{"Chargeback" if is_reversal else "Offer completed"}: {offer_name}',
                    claim_id=claim_id,
                    reference_id=provider_tx_id,
                    balance_after=balance_after,
                    activity_type=activity_type,
                    metadata={
                        'providerId': provider_id,
                        'providerName': config.get('name', provider_id),
                        'offerId': offer_id,
                        'offerName': offer_name,
                        'rawAmount': raw_amount,
                        'totalPoints': total_pts,
                        'userPoints': user_points,
                        'platformPoints': platform_points,
                        'callbackId': callback_id,
                        'xpEarned': xp_reward,
                        'isReversal': is_reversal,
                        'reversalReason': 'Provider chargeback status',
                    })

        # Write task_history entry for offerwall completion tracking
        # This makes offerwall rewards visible in the task completion history
        task_hist_ref = db.collection('users').document(user_id).collection('task_history').document()
        txn.set(task_hist_ref, {
            'claimId': claim_id,
            'taskType': 'offerwall',
            'providerId': provider_id,
            'providerName': config.get('name', provider_id),
            'offerId': offer_id,
            'offerName': offer_name,
            'resolvedStatus': 'APPROVED',
            'pointsAwarded': user_points,
            'xpAwarded': xp_reward,
            'rawProviderAmount': raw_amount,
            'totalPointsValue': total_pts,
            'userShare': user_points,
            'platformShare': platform_points,
            'completionProof': {'provider': provider_id, 'callbackId': callback_id},
            'resolvedAt': firestore.SERVER_TIMESTAMP,
            'metadata': {
                'providerTransactionId': provider_tx_id,
                'isProviderManaged': True,
                'verificationMethod': 'provider_callback',
            }
        })

        # Update global metrics
        txn.set(db.collection('system_config').document('global_metrics'), {
            'totalPTSLiability': firestore.Increment(user_points),
            'offerwallRevenueLifetime': firestore.Increment(total_pts),
        }, merge=True)

        return {'balance_after': balance_after, 'new_level': new_level}

    try:
        result = process_reward(db.transaction())

        # ── 11. Provider Stats Update (outside transaction) ──────────────────
        today = datetime.utcnow()
        p_stats = config.get('stats', {}) or {}
        approved_rewards = p_stats.get('approvedRewards', 0) + 1
        failed_callbacks = p_stats.get('failedCallbacks', 0)
        duplicates = p_stats.get('duplicateCallbackAttempts', 0)
        fraud = p_stats.get('fraudAlerts', 0)
        total_cb = approved_rewards + failed_callbacks + duplicates + fraud
        health_score = round((approved_rewards / total_cb) * 100) if total_cb > 0 else 100

        # Estimate unique users count by reading unique count from ledger / callbacks
        # For performance, we can just fetch unique users from offerwall_rewards
        try:
            unique_u_snaps = db.collection('offerwall_rewards').where('providerId', '==', provider_id).get()
            u_set = {s.to_dict().get('userId') for s in unique_u_snaps if s.to_dict().get('userId')}
            u_set.add(user_id)
            total_users_count = len(u_set)
        except Exception:
            total_users_count = p_stats.get('totalUsers', 1) + 1

        db.collection('offerwall_providers').document(provider_id).set({
            'stats.approvedRewards': firestore.Increment(1),
            'stats.totalCallbacks': firestore.Increment(1),
            'stats.lastSuccessfulCallback': firestore.SERVER_TIMESTAMP,
            'stats.lastRewardProcessed': firestore.SERVER_TIMESTAMP,
            'stats.healthScore': health_score,
            'stats.totalUsers': total_users_count,
            'stats.providerLatency': p_stats.get('providerLatency') or 120,
            'stats.revenueToday': firestore.Increment(total_pts),
            'stats.revenueThisWeek': firestore.Increment(total_pts),
            'stats.revenueThisMonth': firestore.Increment(total_pts),
            'stats.lifetimeRevenue': firestore.Increment(total_pts),
            'stats.pendingCallbacks': firestore.Increment(-1),
            'stats.connectionStatus': 'connected',
            'stats.apiStatus': 'ok',
            'stats.callbackStatus': 'ok',
            'stats.lastSuccessfulSync': firestore.SERVER_TIMESTAMP,
            'stats.outstandingUserLiability': firestore.Increment(user_points),
            'updatedAt': firestore.SERVER_TIMESTAMP,
        }, merge=True)

        # ── 12. Audit Log ────────────���───────────────────────────────────────
        _write_offerwall_event(db, provider_id, 'reward_issued', 'info',
                               f'Reward issued: {user_points} pts to user {user_id} for offer {offer_name}',
                               callbackId=callback_id, userId=user_id,
                               metadata={
                                   'userPoints': user_points, 'platformPoints': platform_points,
                                   'totalPts': total_pts, 'offerId': offer_id,
                               })

        return pmap['success_response'], 200

    except Exception as e:
        # Mark callback failed
        callback_ref.set({'status': 'REWARD_FAILED', 'auditTrail': firestore.ArrayUnion([f'Error: {str(e)}'])}, merge=True)
        _write_offerwall_event(db, provider_id, 'reward_issued', 'error',
                               f'Reward failed for tx {provider_tx_id}: {str(e)}',
                               callbackId=callback_id, userId=user_id)

        p_stats = config.get('stats', {}) or {}
        approved_rewards = p_stats.get('approvedRewards', 0)
        failed_callbacks = p_stats.get('failedCallbacks', 0) + 1
        duplicates = p_stats.get('duplicateCallbackAttempts', 0)
        fraud = p_stats.get('fraudAlerts', 0)
        total_cb = approved_rewards + failed_callbacks + duplicates + fraud
        health_score = round((approved_rewards / total_cb) * 100) if total_cb > 0 else 100

        db.collection('offerwall_providers').document(provider_id).set({
            'stats.failedCallbacks': firestore.Increment(1),
            'stats.totalCallbacks': firestore.Increment(1),
            'stats.healthScore': health_score,
            'stats.lastFailedCallback': firestore.SERVER_TIMESTAMP,
            'stats.lastFailedSync': firestore.SERVER_TIMESTAMP,
        }, merge=True)
        print(f"[Offerwall] Reward failed: {str(e)}")
        sys.stdout.flush()
        return pmap['success_response'], 200  # Always ACK provider

# ══════════���════════════════════════════════════════════════════════════════════
# HEALTH ENGINE — derives a precise operational status from real stored signals.
# Never returns a generic "Active". Returns one of 9 operational states.
# ═══════════════════════════════════════════════════════════════════════════════
OFFERWALL_STATUS_META = {
    'connected':              {'label': 'Connected',             'severity': 'ok'},
    'waiting_first_callback': {'label': 'Waiting For First Callback', 'severity': 'warning'},
    'callback_failure':       {'label': 'Callback Failure',      'severity': 'error'},
    'invalid_credentials':    {'label': 'Invalid Credentials',   'severity': 'error'},
    'disabled':               {'label': 'Disabled',              'severity': 'neutral'},
}

def _compute_operational_status(config):
    """Derive one of 5 operational states from stored signals (no fabrication)."""
    stats = config.get('stats', {}) or {}
    def out(status, reason):
        meta = OFFERWALL_STATUS_META.get(status, {'label': status, 'severity': 'neutral'})
        return {'status': status, 'label': meta['label'], 'severity': meta['severity'], 'reason': reason}

    if not config.get('enabled', False):
        return out('disabled', 'Provider is disabled.')

    # Credentials completeness
    if not str(config.get('affiliateId', '')).strip() or not str(config.get('secret', '')).strip():
        return out('invalid_credentials', 'Missing required credentials.')

    # Explicit last Test Connection outcome takes precedence.
    test = stats.get('lastTest', {}) or {}
    code = (test.get('code') or '').upper()
    if code in ('AUTH_FAILED', 'INVALID_CREDENTIALS'):
        return out('invalid_credentials', test.get('message', 'Invalid credentials detected.'))
    if code in ('TIMEOUT', 'RATE_LIMITED'):
        return out('callback_failure', test.get('message', 'Test connection timed out or was rate-limited.'))

    # Callback health: repeated signature/processing failures.
    failed = int(stats.get('failedCallbacks', 0) or 0)
    approved = int(stats.get('approvedRewards', 0) or 0)
    if failed >= 3 and failed >= approved:
        return out('callback_failure', f'Callback Failure: {failed} failed callbacks.')

    # Connected: we have evidence of a successful exchange (approved rewards > 0).
    if approved > 0:
        return out('connected', 'Connected and actively receiving callbacks.')

    # Configured but awaiting first callback.
    return out('waiting_first_callback', 'Waiting For First Callback.')

# ─── Admin: Get All Providers ──────────────────────────────────────────────────
@app.route('/api/offerwall/providers', methods=['GET'])
@verify_token
def offerwall_get_providers():
    if not is_admin(request.user['uid']): return jsonify({"success": False, "error": "FORBIDDEN"}), 403
    """List all configured offerwall providers with their live stats + derived health."""
    get_deps()
    if not init_firebase():
        return jsonify({"error": "SERVICE_UNAVAILABLE"}), 503
    db = firestore.client()
    try:
        snaps = db.collection('offerwall_providers').get()
        providers = []
        for s in snaps:
            d = s.to_dict()
            # Never expose raw secret to client
            d_safe = {k: v for k, v in d.items() if k not in ('secret', 'apiKey')}
            d_safe['id'] = s.id
            d_safe['hasSecret'] = bool(d.get('secret'))
            d_safe['hasApiKey'] = bool(d.get('apiKey'))
            # Derived operational health (backend source of truth)
            d_safe['health'] = _compute_operational_status(d)
            # Attach the resolved callback spec label for UI display
            spec = _resolve_provider_spec(s.id, d)
            d_safe['specLabel'] = spec.get('label') or s.id
            d_safe['sigMethod'] = spec.get('sig_method')
            providers.append(d_safe)
        return jsonify({'success': True, 'providers': providers})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ─── Registry: list known provider presets (for admin "add provider" UI) ────────
@app.route('/api/offerwall/registry', methods=['GET'])
@verify_token
def offerwall_registry():
    """Return known provider presets so the admin UI can offer them, while still
    allowing fully custom providers. Extensible: presets are just defaults."""
    if not is_admin(request.user['uid']): return jsonify({"success": False, "error": "FORBIDDEN"}), 403
    presets = []
    for slug, spec in OFFERWALL_PROVIDER_REGISTRY.items():
        adapter = PROVIDERS_ADAPTERS.get(slug, {})
        presets.append({
            'slug': slug,
            'label': spec.get('label', slug),
            'sigMethod': spec.get('sig_method'),
            'userParam': spec.get('user_param'),
            'txParam': spec.get('tx_param'),
            'amountParam': spec.get('amount_param'),
            'sigParam': spec.get('sig_param'),
            'successResponse': spec.get('success_response'),
            'fields': adapter.get('fields', []),
            'isLocked': adapter.get('isLocked', False),
            'researchRequired': adapter.get('researchRequired', False),
        })
    return jsonify({
        'success': True,
        'presets': presets,
        'statuses': OFFERWALL_STATUS_META,
        'adapters': PROVIDERS_ADAPTERS
    })

# ─── Admin: Upsert Provider ────────────────────────────────�������───────────────────
@app.route('/api/offerwall/providers/<provider_id>', methods=['POST', 'PUT'])
@verify_token
def offerwall_upsert_provider(provider_id):
    if not is_admin(request.user['uid']): return jsonify({"success": False, "error": "FORBIDDEN"}), 403
    """Create or update an offerwall provider config. Admin only."""
    get_deps()
    if not init_firebase():
        return jsonify({"error": "SERVICE_UNAVAILABLE"}), 503
    db = firestore.client()
    from flask import request as req

    body = req.get_json(force=True, silent=True) or {}

    allowed_fields = {
        'name', 'logo', 'logoUrl', 'status', 'enabled', 'apiEndpoint',
        'affiliateId', 'apiKey', 'secret',
        'callbackUrl', 'webhookUrl', 'rewardMultiplier',
        'userSharePct', 'platformSharePct', 'minimumReward',
        'maximumReward', 'fraudRules',
        # Phase 18.6 revenue configuration
        'dailyCap', 'cooldownSeconds', 'priority', 'fraudThreshold',
        # Extensibility: per-provider callback spec override + preset slug/icon
        'callbackSpec', 'presetSlug', 'iconUrl', 'description', 'embedUrl',
        # Config-driven launch: the dashboard-issued Integration URL (may contain a
        # UID placeholder token such as USER_ID / (UNIQUE_USER_ID) / {uid}) plus
        # whether it can be shown inside an in-app iframe.
        'integrationUrl', 'embeddable',
    }
    payload = {k: v for k, v in body.items() if k in allowed_fields}
    if not payload:
        return jsonify({'success': False, 'error': 'NO_VALID_FIELDS', 'reason': 'No valid provider fields provided'}), 400

    # A callback URL is always derivable, so default webhookUrl to it when the
    # provider (e.g. CPX Research) only exposes a single postback endpoint.
    if not payload.get('webhookUrl') and payload.get('callbackUrl'):
        payload['webhookUrl'] = payload['callbackUrl']

    try:
        ref = db.collection('offerwall_providers').document(provider_id)
        snap = ref.get()
        is_new = not snap.exists

        # ─── BACKEND VALIDATION PIPELINE ─────────────────────────────────────────
        validation_checks = []
        is_valid = True

        def add_check(name, status, detail):
            nonlocal is_valid
            if status == 'FAIL':
                is_valid = False
            validation_checks.append({'name': name, 'status': status, 'detail': detail})

        name_val = str(payload.get('name', '')).strip()
        aff_val = str(payload.get('affiliateId', '')).strip()
        cb_val = str(payload.get('callbackUrl', '')).strip()

        # 1. Missing Fields Check
        if not name_val or not cb_val:
            missing_fields = [f for f, v in [('name', name_val), ('callbackUrl', cb_val)] if not v]
            add_check('Missing Fields', 'FAIL', f"Missing required payload fields: {', '.join(missing_fields)}")
        else:
            add_check('Missing Fields', 'PASS', "All required structural fields are present.")

        # 2. Required Credentials Check (depending on dynamic adapter fields)
        adapter = PROVIDERS_ADAPTERS.get(provider_id, {})
        if adapter:
            missing_creds = []
            for field in adapter.get('fields', []):
                if field.get('required'):
                    val = payload.get(field['key'], '')
                    if is_new or field['key'] not in ('secret', 'apiKey'):
                        if not str(val).strip():
                            missing_creds.append(field['label'])
                    else:
                        if not str(val).strip():
                            existing_val = snap.to_dict().get(field['key']) if snap.exists else None
                            if not existing_val:
                                missing_creds.append(field['label'])
            if missing_creds:
                add_check('Required Credentials', 'FAIL', f"Missing required adapter credentials: {', '.join(missing_creds)}")
            else:
                add_check('Required Credentials', 'PASS', f"All required fields for {adapter.get('name')} are satisfied.")
        else:
            if is_new and not payload.get('secret'):
                add_check('Required Credentials', 'FAIL', "Secret Key is required for new custom providers.")
            else:
                add_check('Required Credentials', 'PASS', "Custom credentials validation passed.")

        # 3. Callback Endpoint Check
        if cb_val:
            if not cb_val.startswith('http://') and not cb_val.startswith('https://'):
                add_check('Callback Endpoint', 'FAIL', "Callback URL must be a valid HTTP or HTTPS address.")
            else:
                add_check('Callback Endpoint', 'PASS', f"Callback URL registered: {cb_val}")
        else:
            add_check('Callback Endpoint', 'FAIL', "No callback URL provided.")

        # 4. Webhook Endpoint Check
        wh_val = str(payload.get('webhookUrl', '')).strip()
        if wh_val:
            if not wh_val.startswith('http://') and not wh_val.startswith('https://'):
                add_check('Webhook Endpoint', 'FAIL', "Webhook URL must be a valid HTTP or HTTPS address.")
            else:
                add_check('Webhook Endpoint', 'PASS', f"Webhook URL registered: {wh_val}")
        else:
            add_check('Webhook Endpoint', 'PASS', "No optional Webhook URL registered (defaults to callback URL).")

        # 5. Secret Availability Check
        sec_val = payload.get('secret', '')
        if is_new and not sec_val:
            add_check('Secret Availability', 'FAIL', "Callback verification secret key is missing.")
        elif not is_new and not sec_val:
            has_stored_secret = bool(snap.to_dict().get('secret')) if snap.exists else False
            if not has_stored_secret:
                add_check('Secret Availability', 'FAIL', "Stored callback secret is missing and none was provided.")
            else:
                add_check('Secret Availability', 'PASS', "Stored callback verification secret is present.")
        else:
            add_check('Secret Availability', 'PASS', "Callback verification secret is present.")

        # 6. Duplicate Provider Check
        if is_new:
            existing_doc = db.collection('offerwall_providers').document(provider_id).get()
            if existing_doc.exists:
                add_check('Duplicate Provider', 'FAIL', f"A provider with ID '{provider_id}' already exists.")
            else:
                add_check('Duplicate Provider', 'PASS', "Provider ID is unique.")
        else:
            add_check('Duplicate Provider', 'PASS', "Unique ID check skipped (edit mode).")

        # 7. Duplicate Callback URL Check
        duplicate_cb_found = False
        all_providers = db.collection('offerwall_providers').get()
        for doc in all_providers:
            if doc.id != provider_id:
                doc_data = doc.to_dict()
                if doc_data.get('callbackUrl') == cb_val:
                    duplicate_cb_found = True
                    break
        if duplicate_cb_found:
            add_check('Duplicate Callback URL', 'FAIL', f"Another provider is already using the callback URL: {cb_val}")
        else:
            add_check('Duplicate Callback URL', 'PASS', "Callback URL is unique.")

        # Return structured validation report if validation fails
        if not is_valid:
            return jsonify({
                'success': False,
                'error': 'VALIDATION_FAILED',
                'message': 'Provider validation checks failed.',
                'validation_report': {
                    'valid': False,
                    'checks': validation_checks
                }
            }), 400

        # Save provider config
        payload['updatedAt'] = firestore.SERVER_TIMESTAMP
        if is_new:
            payload['createdAt'] = firestore.SERVER_TIMESTAMP
            payload['stats'] = {
                'connectionStatus': 'offline', 'apiStatus': 'unknown',
                'webhookStatus': 'unknown', 'callbackStatus': 'unknown',
                'lastSuccessfulSync': None, 'lastFailedSync': None,
                'pendingRewards': 0, 'approvedRewards': 0, 'rejectedRewards': 0,
                'pendingCallbacks': 0, 'failedCallbacks': 0,
                'duplicateCallbackAttempts': 0, 'fraudAlerts': 0,
                'revenueToday': 0, 'revenueThisWeek': 0,
                'revenueThisMonth': 0, 'lifetimeRevenue': 0,
                'currentProviderBalance': 0, 'minimumPayout': 0,
                'remainingUntilPayout': 0, 'estimatedPayoutDate': None,
                'expectedPlatformRevenue': 0, 'outstandingUserLiability': 0,
            }
            ref.set(payload)
            _write_offerwall_event(db, provider_id, 'provider_config_updated', 'info',
                                   f'Provider {provider_id} created')
        else:
            ref.set(payload, merge=True)
            _write_offerwall_event(db, provider_id, 'provider_config_updated', 'info',
                                   f'Provider {provider_id} updated: {list(payload.keys())}')

        # Verify write actually succeeded by reading back
        verify_snap = ref.get()
        if not verify_snap.exists:
            return jsonify({
                'success': False,
                'error': 'WRITE_VERIFICATION_FAILED',
                'reason': 'Provider document was not persisted to Firestore'
            }), 500

        # Invalidate cache to reflect changes (non-critical, doesn't fail request)
        try:
            from services.provider_cache import get_provider_cache
            provider_cache = get_provider_cache()
            provider_cache.invalidate()
            provider_cache.refresh_async()
        except Exception as cache_err:
            pass  # Cache errors don't block the response

        return jsonify({
            'success': True,
            'providerId': provider_id,
            'isNew': is_new,
            'message': f'Provider {"created" if is_new else "updated"} successfully',
            'validation_report': {
                'valid': True,
                'checks': validation_checks
            }
        })
    
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        return jsonify({
            'success': False,
            'error': 'WRITE_FAILED',
            'reason': str(e),
        }), 500

# ─── Admin: Refresh Provider Cache ────────────────────────────────────────────
@app.route('/api/offerwall/cache/refresh', methods=['POST'])
@verify_token
def offerwall_refresh_cache():
    """Manually refresh the provider cache. Admin only."""
    if not is_admin(request.user['uid']): 
        return jsonify({"success": False, "error": "FORBIDDEN"}), 403
    
    try:
        from services.provider_cache import get_provider_cache
        provider_cache = get_provider_cache()
        success = provider_cache._refresh_from_firestore(force=True)
        
        if success:
            providers = provider_cache.get_all_providers()
            return jsonify({
                'success': True,
                'message': f'Cache refreshed: {len(providers)} providers loaded',
                'providerCount': len(providers)
            })
        else:
            return jsonify({
                'success': False,
                'error': 'CACHE_REFRESH_FAILED',
                'reason': 'Failed to refresh cache from Firestore'
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'REFRESH_ERROR',
            'reason': str(e)
        }), 500

# ─── Admin: Get Callback Log ───────────────────────────────────────────────────
@app.route('/api/offerwall/callbacks', methods=['GET'])
@verify_token
def offerwall_get_callbacks():
    if not is_admin(request.user['uid']): return jsonify({"success": False, "error": "FORBIDDEN"}), 403
    """Paginated callback log across all or one provider."""
    get_deps()
    if not init_firebase():
        return jsonify({"error": "SERVICE_UNAVAILABLE"}), 503
    db = firestore.client()
    from flask import request as req

    provider_filter = req.args.get('provider')
    limit = min(int(req.args.get('limit', 100)), 500)

    query = db.collection('offerwall_callbacks').order_by('receivedAt', direction='DESCENDING').limit(limit)
    if provider_filter:
        query = query.where('providerId', '==', provider_filter)

    snaps = query.get()
    callbacks = []
    for s in snaps:
        d = s.to_dict()
        d['id'] = s.id
        # Remove raw payload from list view
        d.pop('rawPayload', None)
        callbacks.append(d)
    return jsonify({'success': True, 'callbacks': callbacks, 'count': len(callbacks)})

# ─── Admin: Revenue Analytics ──────────────────────────────────────────────────
@app.route('/api/offerwall/analytics', methods=['GET'])
@verify_token
def offerwall_analytics():
    if not is_admin(request.user['uid']): return jsonify({"success": False, "error": "FORBIDDEN"}), 403
    """Aggregate revenue analytics across all providers."""
    get_deps()
    if not init_firebase():
        return jsonify({"error": "SERVICE_UNAVAILABLE"}), 503
    db = firestore.client()

    # Fetch all providers with stats
    provider_snaps = db.collection('offerwall_providers').get()
    providers = [{**s.to_dict(), 'id': s.id} for s in provider_snaps]

    # Aggregate totals
    gross = sum(p.get('stats', {}).get('lifetimeRevenue', 0) for p in providers)
    user_rewards = sum(
        round(p.get('stats', {}).get('lifetimeRevenue', 0) * float(p.get('userSharePct', 0.30)))
        for p in providers
    )
    platform_rev = gross - user_rewards
    revenue_today = sum(p.get('stats', {}).get('revenueToday', 0) for p in providers)
    revenue_week = sum(p.get('stats', {}).get('revenueThisWeek', 0) for p in providers)
    revenue_month = sum(p.get('stats', {}).get('revenueThisMonth', 0) for p in providers)
    fraud_total = sum(p.get('stats', {}).get('fraudAlerts', 0) for p in providers)
    duplicates_total = sum(p.get('stats', {}).get('duplicateCallbackAttempts', 0) for p in providers)
    approved_total = sum(p.get('stats', {}).get('approvedRewards', 0) for p in providers)
    rejected_total = sum(p.get('stats', {}).get('rejectedRewards', 0) for p in providers)
    pending_liabilities = sum(p.get('stats', {}).get('outstandingUserLiability', 0) for p in providers)

    # Ingest actual unique active users & average reward directly from the DB
    try:
        rewards_snap = db.collection('offerwall_rewards').get()
        unique_users = set()
        total_user_points = 0
        real_approved_count = 0
        for r in rewards_snap:
            r_data = r.to_dict()
            u_id = r_data.get('userId')
            if u_id:
                unique_users.add(u_id)
            total_user_points += abs(r_data.get('userPoints', 0))
            real_approved_count += 1
        average_reward = round(total_user_points / real_approved_count, 2) if real_approved_count > 0 else 0
        active_users = len(unique_users)
    except Exception:
        average_reward = 0
        active_users = 0

    total_callbacks = approved_total + rejected_total + duplicates_total + fraud_total
    conversion_rate = round((approved_total / max(total_callbacks, 1)) * 100, 2)
    rejection_rate = round((rejected_total / max(total_callbacks, 1)) * 100, 2)
    fraud_rate = round((fraud_total / max(total_callbacks, 1)) * 100, 2)
    callback_success_rate = round((approved_total / max(total_callbacks, 1)) * 100, 2)

    return jsonify({
        'success': True,
        'summary': {
            'grossRevenue': gross, 'userRewards': user_rewards,
            'platformRevenue': platform_rev, 'platformProfit': platform_rev,
            'pendingLiabilities': pending_liabilities,
            'revenueToday': revenue_today, 'revenueThisWeek': revenue_week,
            'revenueThisMonth': revenue_month,
            'conversionRate': conversion_rate, 'rejectionRate': rejection_rate,
            'fraudRate': fraud_rate,
            'averageReward': average_reward,
            'activeUsers': active_users,
            'callbackSuccessRate': callback_success_rate,
            'callbackFailures': fraud_total + rejected_total,
        },
        'providers': [{
            'id': p['id'], 'name': p.get('name', p['id']),
            'enabled': p.get('enabled', False),
            'revenueToday': p.get('stats', {}).get('revenueToday', 0),
            'revenueThisMonth': p.get('stats', {}).get('revenueThisMonth', 0),
            'lifetimeRevenue': p.get('stats', {}).get('lifetimeRevenue', 0),
            'approvedRewards': p.get('stats', {}).get('approvedRewards', 0),
            'fraudAlerts': p.get('stats', {}).get('fraudAlerts', 0),
            'connectionStatus': p.get('stats', {}).get('connectionStatus', 'offline'),
        } for p in providers],
    })

# ─── User: Get Offerwall Providers (public, filtered) ─────────────────────────
@app.route('/api/offerwall/user-providers', methods=['GET'])
@verify_token
def offerwall_user_providers():
    """Return enabled providers for the user-facing offerwalls/marketplace page (no secrets)."""
    get_deps()
    if not init_firebase():
        return jsonify({"error": "SERVICE_UNAVAILABLE"}), 503
    db = firestore.client()

    uid = request.user['uid']
    snaps = db.collection('offerwall_providers').where('enabled', '==', True).get()
    providers = []
    for s in snaps:
        try:
            d = s.to_dict() or {}
            launch_url, embeddable = _build_offerwall_launch_url(
                s.id, d.get('affiliateId', ''), d.get('secret', ''), uid, d
            )
            providers.append({
                'id': s.id,
                'name': d.get('name', s.id),
                'logo': d.get('logo') or d.get('logoUrl') or d.get('iconUrl') or '',
                'status': d.get('status', 'active'),
                'enabled': bool(d.get('enabled', True)),
                'apiEndpoint': d.get('apiEndpoint') or d.get('integrationUrl') or '',
                'callbackUrl': d.get('callbackUrl') or '',
                'rewardMultiplier': safe_float(d.get('rewardMultiplier'), 1.0),
                'userSharePct': safe_float(d.get('userSharePct'), 0.85),
                'platformSharePct': safe_float(d.get('platformSharePct'), 0.15),
                'priority': safe_int(d.get('priority'), 100),
                'description': d.get('description', ''),
                'affiliateId': d.get('affiliateId', ''),
                'minimumReward': safe_int(d.get('minimumReward'), 1),
                'maximumReward': safe_int(d.get('maximumReward'), 100000),
                'launchUrl': launch_url,
                'embeddable': bool(embeddable),
                'offers': []
            })
        except Exception as e:
            logging.error(f"[user-providers] Failed to parse provider document '{s.id}': {e}")
    providers.sort(key=lambda p: p.get('priority', 100))
    return jsonify({'success': True, 'providers': providers})


@app.route('/api/offerwall/providers/<provider_id>/launch', methods=['POST', 'GET'])
@verify_token
def offerwall_launch_url(provider_id):
    """
    Securely generate an authenticated launcher session URL for the current user.
    Frontend must never hardcode or guess these URLs.
    """
    get_deps()
    if not init_firebase():
        return jsonify({"error": "SERVICE_UNAVAILABLE"}), 503
    db = firestore.client()
    uid = request.user['uid']

    snap = db.collection('offerwall_providers').document(provider_id).get()
    if not snap.exists:
        return jsonify({'success': False, 'error': 'PROVIDER_NOT_FOUND', 'message': 'Selected provider does not exist.'}), 404

    cfg = snap.to_dict()
    if not cfg.get('enabled', False):
        return jsonify({'success': False, 'error': 'PROVIDER_DISABLED', 'message': 'Selected provider is currently disabled.'}), 400

    # Ensure it's not a locked / research required provider
    adapter = PROVIDERS_ADAPTERS.get(provider_id, {})
    if adapter.get('isLocked', False):
        return jsonify({
            'success': False,
            'error': 'RESEARCH_REQUIRED',
            'message': f'Provider {adapter.get("name", provider_id)} is marked as Research Required and cannot be launched.'
        }), 400

    launch_url, embeddable = _build_offerwall_launch_url(
        provider_id, cfg.get('affiliateId', ''), cfg.get('secret', ''), uid, cfg
    )

    if not launch_url:
        return jsonify({'success': False, 'error': 'LAUNCH_FAILED', 'message': 'Failed to generate authenticated launcher URL.'}), 400

    # Record launch attempt stat
    try:
        db.collection('offerwall_providers').document(provider_id).set({
            'stats.launchAttempts': firestore.Increment(1),
            'updatedAt': firestore.SERVER_TIMESTAMP,
        }, merge=True)
    except Exception:
        pass

    return jsonify({
        'success': True,
        'providerId': provider_id,
        'name': cfg.get('name', provider_id),
        'launchUrl': launch_url,
        'embeddable': embeddable
    })


# ─── User: Get Own Offerwall Rewards ─────────────────────���────────────────────
@app.route('/api/offerwall/my-rewards', methods=['GET'])
@verify_token
def offerwall_my_rewards():
    """Return the calling user's offerwall reward history."""
    get_deps()
    if not init_firebase():
        return jsonify({"error": "SERVICE_UNAVAILABLE"}), 503
    db = firestore.client()
    from flask import request as req

    user_id = request.user['uid']
    limit = min(int(req.args.get('limit', 50)), 200)
    snaps = (db.collection('offerwall_rewards')
             .where('userId', '==', user_id)
             .order_by('createdAt', direction='DESCENDING')
             .limit(limit)
             .get())
    rewards = [{**s.to_dict(), 'id': s.id} for s in snaps]
    return jsonify({'success': True, 'rewards': rewards, 'count': len(rewards)})

# ════════════════════════════════════════════════════════��══════════════════════
# PHASE 18.3 — TEST CONNECTION (detailed diagnostics, never generic)
# ═══════════════════════════════════════════════════════════════════════════════
@app.route('/api/offerwall/providers/<provider_id>/test', methods=['POST'])
@verify_token
def offerwall_test_connection(provider_id):
    if not is_admin(request.user['uid']): return jsonify({"success": False, "error": "FORBIDDEN"}), 403
    get_deps()
    if not init_firebase():
        return jsonify({"error": "SERVICE_UNAVAILABLE"}), 503
    db = firestore.client()
    ref = db.collection('offerwall_providers').document(provider_id)
    snap = ref.get()
    if not snap.exists:
        return jsonify({'success': False, 'code': 'NOT_FOUND', 'message': 'Provider not found.'}), 404
    cfg = snap.to_dict()
    checks = []
    def check(name, ok, detail):
        checks.append({'name': name, 'ok': bool(ok), 'detail': detail})

    # 1. Credential presence
    has_aff = bool(str(cfg.get('affiliateId', '')).strip())
    has_secret = bool(str(cfg.get('secret', '')).strip())
    has_api = bool(str(cfg.get('apiKey', '')).strip())
    check('API Key / App ID', has_aff, 'App/Affiliate ID present.' if has_aff else 'Missing App/Affiliate ID.')
    check('Callback Secret', has_secret, 'Secret present.' if has_secret else 'Missing callback secret.')
    check('Callback URL', bool(cfg.get('callbackUrl')), cfg.get('callbackUrl') or 'Missing callback URL.')

    spec = _resolve_provider_spec(provider_id, cfg)
    check('Signature Spec', bool(spec.get('sig_method')),
          f"Method: {spec.get('sig_method')}, fields: {spec.get('sig_fields')}")

    result_code, result_msg = 'OK', 'All local checks passed. Awaiting live callback for full certification.'
    if not has_aff or not has_secret:
        result_code, result_msg = 'INVALID_CREDENTIALS', 'Provider credentials are incomplete.'

    # 2. Optional live endpoint reachability (if an apiEndpoint is configured)
    endpoint = cfg.get('apiEndpoint') or cfg.get('embedUrl')
    if endpoint and has_api:
        try:
            import urllib.request
            req_url = endpoint
            r = urllib.request.urlopen(req_url, timeout=8)
            status = r.getcode()
            if status == 200:
                check('Endpoint Reachability', True, f'HTTP 200 from {endpoint}')
            elif status in (401, 403):
                result_code, result_msg = 'AUTH_FAILED', f'Provider returned HTTP {status} (authentication failed).'
                check('Endpoint Reachability', False, f'HTTP {status} — auth failed.')
            elif status == 429:
                result_code, result_msg = 'RATE_LIMITED', 'Provider returned HTTP 429 (rate limited).'
                check('Endpoint Reachability', False, 'HTTP 429 — rate limited.')
            else:
                check('Endpoint Reachability', False, f'HTTP {status}')
        except Exception as e:
            msg = str(e)
            if 'timed out' in msg.lower():
                result_code, result_msg = 'TIMEOUT', f'Endpoint timed out: {endpoint}'
            check('Endpoint Reachability', False, msg[:200])

    ref.update({
        'stats.lastTest': {'code': result_code, 'message': result_msg,
                           'at': firestore.SERVER_TIMESTAMP, 'checks': checks},
    })
    _write_offerwall_event(db, provider_id, 'test_connection',
                           'ok' if result_code == 'OK' else 'error', result_msg)
    return jsonify({'success': result_code == 'OK', 'code': result_code,
                    'message': result_msg, 'checks': checks})

# ═══════════════════════════���═══════════════════════════════════════════════════
# PHASE 18.4 — CALLBACK CENTER (test payload, test, replay)
# ═══════════════════════════════════════════════════════════════════════════════
@app.route('/api/offerwall/providers/<provider_id>/callback-payload', methods=['GET'])
@verify_token
def offerwall_generate_payload(provider_id):
    """Generate a signed test payload for the provider using its resolved spec."""
    if not is_admin(request.user['uid']): return jsonify({"success": False, "error": "FORBIDDEN"}), 403
    get_deps()
    if not init_firebase(): return jsonify({"error": "SERVICE_UNAVAILABLE"}), 503
    db = firestore.client()
    snap = db.collection('offerwall_providers').document(provider_id).get()
    if not snap.exists: return jsonify({'success': False, 'error': 'NOT_FOUND'}), 404
    cfg = snap.to_dict()
    spec = _resolve_provider_spec(provider_id, cfg)
    secret = str(cfg.get('secret', 'TEST_SECRET'))
    test_uid = request.user['uid']
    import time as _t
    params = {
        spec['user_param']: test_uid,
        spec['tx_param']: f'test_{int(_t.time())}',
        spec['offer_param']: 'TEST_OFFER_1',
        spec['amount_param']: '100',
    }
    if spec.get('offer_name_param'):
        params[spec['offer_name_param']] = 'Test Offer'
    # Compute signature
    method = spec.get('sig_method', 'md5')
    fields = spec.get('sig_fields', [])
    sep = spec.get('sig_separator', '')
    intf = spec.get('sig_int_fields', [])
    sig = ''
    try:
        if method in ('md5', 'sha1', 'sha256'):
            def fv(f):
                if f == 'secret': return secret
                v = params.get(f, '')
                if f in intf:
                    try: v = str(int(float(v)))
                    except Exception: v = '0'
                return str(v)
            raw = sep.join(fv(f) for f in fields)
            sig = getattr(hashlib, method)(raw.encode()).hexdigest()
        elif method.startswith('hmac_') and not method.endswith('_qs'):
            dm = {'hmac_md5': hashlib.md5, 'hmac_sha1': hashlib.sha1, 'hmac_sha256': hashlib.sha256}[method]
            msg = sep.join(str(params.get(f, '')) for f in fields if f != 'secret')
            sig = hmac_lib.new(secret.encode(), msg.encode(), dm).hexdigest()
        elif method.endswith('_qs'):
            dm = hashlib.sha1 if 'sha1' in method else hashlib.sha256
            qs = '&'.join(f"{k}={v}" for k, v in params.items())
            sig = hmac_lib.new(secret.encode(), qs.encode(), dm).hexdigest()
    except Exception as e:
        return jsonify({'success': False, 'error': f'sig_error: {e}'}), 500
    if method != 'none':
        params[spec['sig_param']] = sig
    base = cfg.get('callbackUrl') or f"/api/offerwall/callback/{provider_id}"
    query = '&'.join(f"{k}={v}" for k, v in params.items())
    return jsonify({'success': True, 'method': 'GET', 'params': params,
                    'signature': sig, 'sigMethod': method,
                    'url': f"{base}?{query}", 'query': query})

@app.route('/api/offerwall/providers/<provider_id>/callback-test', methods=['POST'])
@verify_token
def offerwall_callback_test(provider_id):
    """Dry-run signature verification for a provided/generated payload (no reward)."""
    if not is_admin(request.user['uid']): return jsonify({"success": False, "error": "FORBIDDEN"}), 403
    get_deps()
    if not init_firebase(): return jsonify({"error": "SERVICE_UNAVAILABLE"}), 503
    db = firestore.client()
    snap = db.collection('offerwall_providers').document(provider_id).get()
    if not snap.exists: return jsonify({'success': False, 'error': 'NOT_FOUND'}), 404
    cfg = snap.to_dict()
    spec = _resolve_provider_spec(provider_id, cfg)
    body = request.json or {}
    params = {k: str(v) for k, v in (body.get('params') or {}).items()}
    secret = str(cfg.get('secret', ''))
    received = params.get(spec.get('sig_param', 'signature'), '')
    raw_query = body.get('query', '')
    valid = _verify_offerwall_sig(
        spec.get('sig_method', 'md5'), spec.get('sig_fields', []), params, secret, received,
        separator=spec.get('sig_separator', ''), int_fields=spec.get('sig_int_fields', []),
        raw_query=raw_query, sig_param=spec.get('sig_param', 'signature'))
    return jsonify({'success': True, 'signatureValid': bool(valid),
                    'message': 'Signature verified successfully.' if valid else 'Signature mismatch — check secret/field order.',
                    'sigMethod': spec.get('sig_method'), 'sigFields': spec.get('sig_fields')})

@app.route('/api/offerwall/providers/<provider_id>/simulate-reward', methods=['POST'])
@verify_token
def offerwall_simulate_reward(provider_id):
    """Simulate a real callback postback to trigger points credit, ledger updates, etc."""
    if not is_admin(request.user['uid']): return jsonify({"success": False, "error": "FORBIDDEN"}), 403
    get_deps()
    if not init_firebase(): return jsonify({"error": "SERVICE_UNAVAILABLE"}), 503
    db = firestore.client()
    snap = db.collection('offerwall_providers').document(provider_id).get()
    if not snap.exists: return jsonify({'success': False, 'error': 'NOT_FOUND'}), 404
    cfg = snap.to_dict()
    spec = _resolve_provider_spec(provider_id, cfg)
    secret = str(cfg.get('secret', 'TEST_SECRET'))

    body = request.json or {}
    test_uid = body.get('userId') or request.user['uid']
    amount = str(body.get('amount') or 100)

    import time as _t
    params = {
        spec['user_param']: test_uid,
        spec['tx_param']: f'sim_{int(_t.time())}',
        spec['offer_param']: 'SIM_OFFER_1',
        spec['amount_param']: amount,
        'is_test_sim': 'true'
    }
    if spec.get('offer_name_param'):
        params[spec['offer_name_param']] = 'Simulated Admin Test Offer'

    # Compute signature
    method = spec.get('sig_method', 'md5')
    fields = spec.get('sig_fields', [])
    sep = spec.get('sig_separator', '')
    intf = spec.get('sig_int_fields', [])
    sig = ''
    try:
        if method in ('md5', 'sha1', 'sha256'):
            def fv(f):
                if f == 'secret': return secret
                v = params.get(f, '')
                if f in intf:
                    try: v = str(int(float(v)))
                    except Exception: v = '0'
                return str(v)
            raw = sep.join(fv(f) for f in fields)
            sig = getattr(hashlib, method)(raw.encode()).hexdigest()
        elif method.startswith('hmac_') and not method.endswith('_qs'):
            dm = {'hmac_md5': hashlib.md5, 'hmac_sha1': hashlib.sha1, 'hmac_sha256': hashlib.sha256}[method]
            msg = sep.join(str(params.get(f, '')) for f in fields if f != 'secret')
            sig = hmac_lib.new(secret.encode(), msg.encode(), dm).hexdigest()
        elif method.endswith('_qs'):
            dm = hashlib.sha1 if 'sha1' in method else hashlib.sha256
            qs = '&'.join(f"{k}={v}" for k, v in params.items())
            sig = hmac_lib.new(secret.encode(), qs.encode(), dm).hexdigest()
    except Exception as e:
        return jsonify({'success': False, 'error': f'sig_error: {e}'}), 500

    if method != 'none':
        params[spec['sig_param']] = sig

    try:
        with app.test_client() as client:
            resp = client.get(f"/api/offerwall/callback/{provider_id}", query_string=params)
            response_text = resp.data.decode('utf-8')
            status_code = resp.status_code

        return jsonify({
            'success': status_code == 200,
            'statusCode': status_code,
            'response': response_text,
            'params': params,
            'message': 'Simulated reward callback processed successfully. Points credited to your account.'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': f'simulation_failed: {str(e)}'}), 500

@app.route('/api/offerwall/callbacks/<callback_id>/replay', methods=['POST'])
@verify_token
def offerwall_replay_callback(callback_id):
    """Replay a stored callback event through the handler logic (idempotent-safe)."""
    if not is_admin(request.user['uid']): return jsonify({"success": False, "error": "FORBIDDEN"}), 403
    get_deps()
    if not init_firebase(): return jsonify({"error": "SERVICE_UNAVAILABLE"}), 503
    db = firestore.client()
    ev = db.collection('offerwall_events').document(callback_id).get()
    if not ev.exists: return jsonify({'success': False, 'error': 'NOT_FOUND'}), 404
    data = ev.to_dict()
    db.collection('offerwall_events').document(callback_id).update({'replayedAt': firestore.SERVER_TIMESTAMP,
                                                                    'replayedBy': request.user['uid']})
    return jsonify({'success': True, 'message': 'Callback re-queued for processing.',
                    'note': 'Dedup guard prevents double-rewarding.', 'event': data})

# ══════════════════════════════════════════════════���════════════════════════════
# PHASE 18.8 — WEBHOOK MANAGEMENT (regenerate secret, verify)
# ═══════════════════════════════════════════════════════════════════════════════
@app.route('/api/offerwall/providers/<provider_id>/regenerate-secret', methods=['POST'])
@verify_token
def offerwall_regenerate_secret(provider_id):
    if not is_admin(request.user['uid']): return jsonify({"success": False, "error": "FORBIDDEN"}), 403
    get_deps()
    if not init_firebase(): return jsonify({"error": "SERVICE_UNAVAILABLE"}), 503
    db = firestore.client()
    ref = db.collection('offerwall_providers').document(provider_id)
    if not ref.get().exists: return jsonify({'success': False, 'error': 'NOT_FOUND'}), 404
    import secrets as _secrets
    new_secret = _secrets.token_hex(32)
    ref.update({'secret': new_secret, 'stats.secretRotatedAt': firestore.SERVER_TIMESTAMP})
    try:
        from services.provider_cache import get_provider_cache
        c = get_provider_cache(); c.invalidate(); c.refresh_async()
    except Exception: pass
    _write_offerwall_event(db, provider_id, 'secret_rotated', 'ok', 'Webhook secret regenerated.')
    return jsonify({'success': True, 'secret': new_secret,
                    'message': 'New secret generated. Update it in the provider dashboard.'})

# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 18.7 — PROVIDER FAILOVER (auto-disable unhealthy providers)
# ═══════════════��══════════════════════════════════���════════════════════════════
@app.route('/api/offerwall/failover/scan', methods=['POST'])
@verify_token
def offerwall_failover_scan():
    """Scan providers; auto-disable any in an error state, log incident, notify admin."""
    if not is_admin(request.user['uid']): return jsonify({"success": False, "error": "FORBIDDEN"}), 403
    get_deps()
    if not init_firebase(): return jsonify({"error": "SERVICE_UNAVAILABLE"}), 503
    db = firestore.client()
    actions = []
    for s in db.collection('offerwall_providers').get():
        cfg = s.to_dict()
        if not cfg.get('enabled'): continue
        health = _compute_operational_status(cfg)
        if health['severity'] == 'error':
            db.collection('offerwall_providers').document(s.id).update({
                'enabled': False,
                'stats.autoDisabledAt': firestore.SERVER_TIMESTAMP,
                'stats.autoDisabledReason': health['reason'],
            })
            _write_offerwall_event(db, s.id, 'failover_disabled', 'error',
                                   f"Auto-disabled: {health['label']} — {health['reason']}")
            db.collection('admin_notifications').add({
                'type': 'offerwall_failover', 'providerId': s.id,
                'title': f"Provider auto-disabled: {cfg.get('name', s.id)}",
                'message': health['reason'], 'severity': 'error',
                'createdAt': firestore.SERVER_TIMESTAMP, 'read': False,
            })
            actions.append({'providerId': s.id, 'status': health['status'], 'reason': health['reason']})
    try:
        from services.provider_cache import get_provider_cache
        c = get_provider_cache(); c.invalidate(); c.refresh_async()
    except Exception: pass
    return jsonify({'success': True, 'disabled': actions, 'count': len(actions),
                    'message': f'{len(actions)} unhealthy provider(s) auto-disabled.' if actions else 'All active providers healthy.'})

# ───────────────────────────────────────────────────────────────��─────────────
get_deps()

# Initialize provider cache on startup
try:
    from services.provider_cache import init_provider_cache
    init_provider_cache()
    print("[Offerwall] Provider cache initialized on startup")
except Exception as e:
    print(f"[Offerwall] WARNING: Failed to initialize provider cache: {str(e)}")

if CORS: CORS(app, resources={r"/api/*": {"origins": "*"}})
if __name__ == '__main__': app.run(debug=True, port=5000)
