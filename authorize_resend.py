import os
import requests
from firebase_admin import firestore, auth
from flask import jsonify
from datetime import datetime, timezone

@app.route('/api/authorize-resend', methods=['POST'])
@verify_token
def authorize_resend():
    caller_uid = request.user['uid']
    caller_email = request.user.get('email')

    if not caller_email:
        return jsonify({"success": False, "error": "MISSING_EMAIL"}), 400

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
        resend_from = os.environ.get('RESEND_FROM_EMAIL', 'support@pulseearn.online')

        if not resend_key:
            print("WARN: RESEND_API_KEY not set. Falling back to client-side dispatch.")
            return jsonify({"success": True, "dispatchMethod": "client_fallback"})

        # Real dispatch to Resend
        payload = {
            "from": f"PulseEarn <{resend_from}>",
            "to": [caller_email],
            "subject": "Verify your PulseEarn account",
            "html": f"""
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                    <h1 style="color: #0070FF;">PulseEarn</h1>
                    <p>Welcome to the network! Please verify your email address to unlock full access to the platform.</p>
                    <div style="margin: 30px 0;">
                        <a href="{link}" style="background-color: #0070FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Verify Email Address</a>
                    </div>
                    <p style="font-size: 12px; color: #666;">If the button doesn't work, copy and paste this link: <br> {link}</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="font-size: 11px; color: #999;">If you didn't create an account, you can safely ignore this email.</p>
                </div>
            """
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

        if res.status_code not in [200, 201]:
            error_data = res.json() if res.content else {"message": "Unknown error"}
            print(f"RESEND_ERROR: {res.status_code} - {error_data}")
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
