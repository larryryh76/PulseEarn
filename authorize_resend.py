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

        transaction.set(cooldown_ref, {
            'userId': caller_uid,
            'updatedAt': firestore.SERVER_TIMESTAMP
        }, merge=True)
        return True

    try:
        transaction = db.transaction()
        check_cooldown(transaction)

        # SEND EMAIL VIA ADMIN SDK
        # In a real environment, we'd use generate_email_verification_link
        # and then send it via a mail provider (SendGrid/Mailgun)
        # For this sandbox, we generate the link and "send" it (log/return)
        action_settings = auth.ActionCodeSettings(
            url=f"https://pulseearn.online/auth/action",
            handle_code_in_app=True
        )
        link = auth.generate_email_verification_link(caller_email, action_settings)

        # Conceptual mail dispatch
        print(f"DISPATCHING VERIFICATION TO {caller_email}: {link}")

        return jsonify({"success": True})
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
