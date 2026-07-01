import hashlib
import hmac

def verify_provider_signature(payload_bytes, signature, secret):
    """
    Verify provider signature using raw request bytes.
    """
    if not secret:
        return False
    expected = hmac.new(secret.encode(), payload_bytes, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
