import os
import sys
import hashlib
import logging
import pytest

# Add parent directory of 'api' to path if needed
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(os.path.dirname(__file__))

from index import (
    _apply_launch_placeholders,
    _build_offerwall_launch_url,
    _is_provider_gated,
    _normalize_and_migrate_provider_config,
    PROVIDERS_ADAPTERS
)

def test_apply_launch_placeholders_generic():
    # Test substitution of standard UID
    url = "https://example.com/earn?userID=USER_ID"
    res = _apply_launch_placeholders(url, "user456", {}, "cpxresearch")
    assert res == "https://example.com/earn?userID=user456"

    # Test substitution of generic identity fields
    identity = {
        "publisherId": {"fieldName": "Publisher ID", "value": "pub_999", "required": True},
        "appId": {"fieldName": "Application ID", "value": "app_888", "required": True}
    }
    url2 = "https://example.com/earn?pub={publisherId}&app=[appId]&uid={uid}"
    res2 = _apply_launch_placeholders(url2, "user456", identity, "offertoro")
    assert res2 == "https://example.com/earn?pub=pub_999&app=app_888&uid=user456"

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
    url, embed = _build_offerwall_launch_url("cpxresearch", "", "", "user456", config)
    assert embed is True

    # Verify MD5 secure hash in URL
    expected_hash = hashlib.md5("user456cpx_secret_abc".encode()).hexdigest()
    assert "secure_hash=" + expected_hash in url
    assert "app_id=cpx_app_123" in url

def test_unresolved_placeholder_fails():
    # If any placeholder remains unreplaced, it must fail launch url generation!
    config_bitlabs = {
        "enabled": True,
        "integrationUrl": "https://example.com/earn?token={token}&uid={uid}",
        "identity": {
            "appId": {"fieldName": "App ID", "value": "app123", "required": True},
            # Missing required token!
        }
    }
    url, embed = _build_offerwall_launch_url("bitlabs", "", "", "user456", config_bitlabs)
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
    # BitLabs: primaryLaunchField is token
    config_bitlabs = {
        "enabled": True,
        "identity": {
            "appId": {"fieldName": "App ID", "value": "app_bitlabs", "required": True},
            "token": {"fieldName": "App Token", "value": "token_bitlabs_abc", "required": True},
            "secret": {"fieldName": "Secret Key", "value": "secret_bitlabs_123", "required": True}
        }
    }
    url, embed = _build_offerwall_launch_url("bitlabs", "", "", "user456", config_bitlabs)
    assert "token=token_bitlabs_abc" in url
    assert "uid=user456" in url

    # Wannads: primaryLaunchField is apiKey
    config_wannads = {
        "enabled": True,
        "identity": {
            "publisherId": {"fieldName": "Publisher ID", "value": "pub_wannads", "required": True},
            "apiKey": {"fieldName": "API Key", "value": "key_wannads_xyz", "required": True},
            "secret": {"fieldName": "Secret Key", "value": "secret_wannads_789", "required": True}
        }
    }
    url2, embed2 = _build_offerwall_launch_url("wannads", "", "", "user456", config_wannads)
    assert "apiKey=key_wannads_xyz" in url2
    assert "userId=user456" in url2

def test_legacy_provider_migration():
    # Verify legacy configuration without identity map gets migrated cleanly and launches correctly
    legacy_config = {
        "enabled": True,
        "affiliateId": "legacy_aff_123",
        "secret": "legacy_secret_456",
        "apiKey": "legacy_key_789"
    }

    # Run in-memory normalization
    migrated = _normalize_and_migrate_provider_config("lootably", legacy_config)
    assert "identity" in migrated
    assert migrated["identity"]["publisherId"]["value"] == "legacy_aff_123"
    assert migrated["identity"]["apiKey"]["value"] == "legacy_key_789"
    assert migrated["identity"]["secret"]["value"] == "legacy_secret_456"

    # Test launching from migrated config
    url, embed = _build_offerwall_launch_url("lootably", "", "", "user456", legacy_config)
    assert "placementID=legacy_aff_123" in url
    assert "uid=user456" in url

def test_sensitive_bare_words_not_substituted():
    # Make sure words like SECRET or TOKEN are NOT replaced by bare-word substitution in URL paths
    config = {
        "enabled": True,
        "integrationUrl": "https://example.com/SECRET/api/TOKEN?token={token}&uid={uid}",
        "identity": {
            "appId": {"fieldName": "App ID", "value": "app123", "required": True},
            "token": {"fieldName": "Token", "value": "my_token_abc", "required": True},
            "secret": {"fieldName": "Secret", "value": "my_secret_xyz", "required": True}
        }
    }
    url, embed = _build_offerwall_launch_url("bitlabs", "", "", "user456", config)
    assert url is not None
    assert "/SECRET/" in url
    assert "/TOKEN" in url
    assert "token=my_token_abc" in url

def test_credential_leak_prevention_in_logs(caplog):
    # If placeholder substitution fails, the logged error must NOT contain the fully resolved URL
    config_failed = {
        "enabled": True,
        "integrationUrl": "https://example.com/earn?secret={secret}&apiKey={apiKey}&token={token}&uid={uid}",
        "identity": {
            "appId": {"fieldName": "App ID", "value": "app123", "required": True},
            "token": {"fieldName": "Token", "value": "sensitive_token_leak", "required": True},
            "secret": {"fieldName": "Secret Key", "value": "secret_bitlabs_123", "required": True}
            # Missing apiKey!
        }
    }

    with caplog.at_level(logging.ERROR):
        url, embed = _build_offerwall_launch_url("bitlabs", "", "", "user456", config_failed)
        assert url is None

        # Verify the logs contain the missing placeholder but NOT the sensitive_token_leak value
        log_text = caplog.text
        assert "Validation Failed" in log_text
        assert "bitlabs" in log_text
        assert "sensitive_token_leak" not in log_text
