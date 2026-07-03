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

_firebase_initialized = False
_db = None

def get_db():
    global _firebase_initialized, _db
    if _firebase_initialized: return _db
    get_deps()
    if firebase_admin is None: return None
    try:
        try: firebase_admin.get_app()
        except ValueError:
            pid = get_project_id()
            firebase_admin.initialize_app(options={'projectId': pid})
            print(f"BOOT: Firebase Admin initialized for project: {pid}")
            sys.stdout.flush()
        _db = firestore.client()
        _firebase_initialized = True
        print("BOOT: Firestore client established."); sys.stdout.flush()
        return _db
    except Exception as e:
        print(f"BOOT_CRITICAL: Firebase initialization failed: {str(e)}"); sys.stdout.flush()
        return None

def require_db(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        database = get_db()
        if not database: return jsonify({"success": False, "error": "DATABASE_OFFLINE"}), 503
        return f(*args, **kwargs)
    return decorated_function

def verify_token(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        get_deps()
        if auth is None: return jsonify({"success": False, "error": "AUTH_SERVICE_OFFLINE"}), 503
        id_token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '): id_token = auth_header.split(' ')[1]
        if not id_token: return jsonify({"success": False, "error": "Missing authorization token"}), 401
        try:
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
    try:
        res = requests.get("https://api.coingecko.com/api/v3/simple/price", params={'ids': asset_id, 'vs_currencies': 'usd'}, timeout=10)
        return res.json().get(asset_id, {}).get('usd')
    except:
        try:
            sym = SYMBOL_MAP.get(asset_id)
            if sym:
                res = requests.get("https://min-api.cryptocompare.com/data/price", params={'fsym': sym, 'tsyms': 'USD'}, timeout=10)
                return res.json().get('USD')
        except: pass
    return None

@app.route('/api/ping', methods=['GET'])
def ping():
    return jsonify({"success": True, "message": "PONG", "timestamp": datetime.now(timezone.utc).isoformat()})

@app.route('/api/health', methods=['GET'])
def health_check():
    db_conn = get_db()
    return jsonify({
        "success": True, "status": "ONLINE", "version": "7.7.0-AUTHORITATIVE",
        "firebase": "CONNECTED" if db_conn else "DISCONNECTED",
        "diagnostics": {"projectId": get_project_id(), "db": db_conn is not None}
    })

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

        amount = data.get('amount', 0)
        if tx_type == 'mission_reward':
            mid = data.get('referenceId')
            def_snap = db.collection('system_task_definitions').document(mid).get(transaction=transaction)
            ust_snap = db.collection('user_system_tasks').document(f"{user_id}_{mid}").get(transaction=transaction)
            if not def_snap.exists or not ust_snap.exists or ust_snap.to_dict().get('status') != 'COMPLETED': raise Exception("INVALID_MISSION_STATE")
            if ust_snap.to_dict().get('rewarded'): raise Exception("ALREADY_REWARDED")
            amount = def_snap.to_dict().get('rewardPoints', 0)
            transaction.update(db.collection('user_system_tasks').document(f"{user_id}_{mid}"), {'rewarded': True, 'claimedAt': firestore.SERVER_TIMESTAMP})

        transaction.update(user_ref, {'points': firestore.Increment(amount)})
        transaction.update(db.collection('system_config').document('global_metrics'), {'totalPTSLiability': firestore.Increment(amount)})
        transaction.set(db.collection('system_claims').document(data.get('claimId')), {'userId': user_id, 'executedAt': firestore.SERVER_TIMESTAMP})
        return {"success": True}

    try:
        res = process(db.transaction())
        evaluate_missions(user_id)
        return jsonify(res)
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
    pred_ref = db.collection('user_predictions').document(pred_id)
    pred_data = pred_ref.get().to_dict()
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
    get_deps(); auth.delete_user(request.json.get('userId'))
    return jsonify({"success": True})

@app.route('/api/admin/verify-user', methods=['POST'])
@verify_token
@require_db
def verify_user():
    if not is_moderator(request.user['uid']): return jsonify({"success": False}), 403
    get_deps(); auth.update_user(request.json.get('userId'), email_verified=True)
    return jsonify({"success": True})

def send_branded_email(to, template, context, subject):
    get_deps()
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
