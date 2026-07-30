import os
import sys
import hashlib
import pytest

# Add parent directory of 'api' to path if needed
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(os.path.dirname(__file__))

from index import _apply_launch_placeholders, _build_offerwall_launch_url

def test_apply_launch_placeholders_generic():
    # Test substitution of standard UID
    url = "https://example.com/earn?userID=USER_ID"
    res = _apply_launch_placeholders(url, "affiliate123", "user456")
    assert res == "https://example.com/earn?userID=user456"

    # Test substitution of generic identity fields
    identity = {
        "publisherId": {"fieldName": "Publisher ID", "value": "pub_999", "required": True},
        "appId": {"fieldName": "Application ID", "value": "app_888", "required": True}
    }
    url2 = "https://example.com/earn?pub={publisherId}&app=[appId]&uid={uid}"
    res2 = _apply_launch_placeholders(url2, "affiliate123", "user456", identity_fields=identity)
    assert res2 == "https://example.com/earn?pub=pub_999&app=app_888&uid=user456"

def test_build_offerwall_launch_url_dynamic():
    # CPX dynamic launch url testing with dynamic identity
    config = {
        "enabled": True,
        "identity": {
            "appId": {"fieldName": "App ID", "value": "cpx_app_123", "required": True},
            "secret": {"fieldName": "Secret", "value": "cpx_secret_abc", "required": True}
        }
    }
    url, embed = _build_offerwall_launch_url("cpxresearch", "", "", "user456", config)
    assert embed is True

    # Verify MD5 secure hash in URL
    expected_hash = hashlib.md5("user456cpx_secret_abc".encode()).hexdigest()
    assert "secure_hash=" + expected_hash in url
    assert "app_id=cpx_app_123" in url
