import hashlib
import hmac

def verify_provider_signature(provider, payload_bytes, data_dict, signature, secret):
    """
    Verify provider signature using raw request bytes or data dictionary.
    """
    if not secret:
        return False

    if not signature:
        return False

    # Default: HMAC-SHA256
    try:
        if provider == 'wannads':
            # Wannads might use a simple md5 of parameters or hmac
            expected = hashlib.md5(f"{data_dict.get('userId')}{data_dict.get('transactionId')}{data_dict.get('points')}{secret}".encode()).hexdigest()
            return expected == signature

        elif provider == 'lootably':
            expected = hmac.new(secret.encode(), payload_bytes, hashlib.sha256).hexdigest()
            return hmac.compare_digest(expected, signature)

        # Add other providers here

        # Generic Fallback
        expected = hmac.new(secret.encode(), payload_bytes, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature)
    except:
        return False
