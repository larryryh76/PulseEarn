import os
import sys
import hashlib
import logging

# Add parent directory of 'api' to path if needed
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(os.path.dirname(__file__))

from index import (
    _apply_launch_placeholders,
    _build_offerwall_launch_url,
    _is_provider_gated,
    PROVIDERS_ADAPTERS
)

def test_apply_launch_placeholders_generic():
    # Test substitution of standard UID
    url = "https://example.com/earn?userID=USER_ID&aff={aff}"
    res = _apply_launch_placeholders(url, "aff_999", "user456")
    assert res == "https://example.com/earn?userID=user456&aff=aff_999"

def test_build_offerwall_launch_url_dynamic():
    # CPX dynamic launch url testing with dynamic identity
    config = {
        "enabled": True,
        "embeddable": True,
        "identity": {
            "appId": {"fieldName": "App ID", "value": "cpx_app_123", "required": True},
            "secret": {"fieldName": "Secret", "value": "cpx_secret_abc", "required": True}
        }
    }
    url, embed = _build_offerwall_launch_url("cpxresearch", "cpx_app_123", "cpx_secret_abc", "user456", config)
    assert embed is True

    # Verify MD5 secure hash in URL
    expected_hash = hashlib.md5("user456cpx_secret_abc".encode()).hexdigest()
    assert "secure_hash=" + expected_hash in url
    assert "app_id=cpx_app_123" in url

def test_unresolved_placeholder_fails():
    # If user ID is empty, launch URL generation must fail
    url, embed = _build_offerwall_launch_url("bitlabs", "aff123", "secret123", "", {})
    assert url is None
    assert embed is False

def test_is_provider_gated():
    # Test enabled active provider
    cfg_active = {"enabled": True, "status": "active"}
    gated, status = _is_provider_gated(cfg_active)
    assert gated is False
    assert status == "active"

    # Test maintenance provider
    cfg_maint = {"enabled": True, "status": "maintenance"}
    gated, status = _is_provider_gated(cfg_maint)
    assert gated is True
    assert status == "maintenance"

    # Test locked provider
    cfg_locked = {"enabled": True, "status": "locked"}
    gated, status = _is_provider_gated(cfg_locked)
    assert gated is True
    assert status == "locked"

    # Test disabled provider
    cfg_disabled = {"enabled": False, "status": "active"}
    gated, status = _is_provider_gated(cfg_disabled)
    assert gated is True

def test_provider_specific_resolving():
    # BitLabs built-in template
    url, embed = _build_offerwall_launch_url("bitlabs", "token_bitlabs_abc", "secret123", "user456", {"enabled": True})
    assert "token=token_bitlabs_abc" in url
    assert "uid=user456" in url

    # Wannads built-in template
    url2, embed2 = _build_offerwall_launch_url("wannads", "key_wannads_xyz", "secret123", "user456", {"enabled": True})
    assert "apiKey=key_wannads_xyz" in url2
    assert "userId=user456" in url2


def test_cpagrip_preset_launch_and_callback():
    # CPAGrip presets: launch template, and callback mapping
    url, embed = _build_offerwall_launch_url("cpagrip", "123456", "secret_postback_xyz", "user789", {"enabled": True})
    assert "u=123456" in url
    assert "tracking_id=user789" in url
    assert "cpagrip.com" in url


def test_cpagrip_postback_points_calculation_and_extraction():
    # CPAGrip postback parameters: user_id, tracking_id, payout, offer_id, offer_title
    from index import OFFERWALL_PROVIDER_REGISTRY

    spec = OFFERWALL_PROVIDER_REGISTRY.get('cpagrip')
    assert spec is not None
    assert spec['user_param'] == 'user_id'
    assert spec['tx_param'] == 'tracking_id'
    assert spec['amount_param'] == 'payout'
    assert spec['usd_param'] == 'payout'
    assert spec['offer_param'] == 'offer_id'
    assert spec['offer_name_param'] == 'offer_title'

    # Simulate extraction and points calculation on CPAGrip payload
    params = {
        'user_id': 'pulseuser101',
        'tracking_id': 'grip_lead_9999',
        'payout': '1.50',
        'offer_id': 'cpagrip_offer_77',
        'offer_title': 'Test CPAGrip Survey'
    }

    user_id = params.get(spec['user_param'])
    tx_id = params.get(spec['tx_param'])
    payout_usd = float(params.get(spec['usd_param']))

    assert user_id == 'pulseuser101'
    assert tx_id == 'grip_lead_9999'
    assert payout_usd == 1.50

    # Authoritative points multiplier: $1 USD = 1000 Points
    from index import OFFERWALL_POINTS_PER_USD
    gross_points = payout_usd * OFFERWALL_POINTS_PER_USD
    assert gross_points == 1500.0

    # User share percentage (e.g. standard 30% user share)
    user_share_pct = 0.30
    user_payout_points = round(gross_points * user_share_pct)
    assert user_payout_points == 450


if __name__ == '__main__':
    for name, func in list(globals().items()):
        if name.startswith('test_') and callable(func):
            print(f"Running {name}...")
            func()
            print(f"PASS: {name}")
    print("\nAll provider identity tests passed successfully!")
