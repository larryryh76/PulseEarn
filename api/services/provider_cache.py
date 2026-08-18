"""
Provider Cache Service - Single Source of Truth for Offerwall Providers

Manages in-memory caching of provider configurations loaded from Firestore.
Ensures all callback handlers use the same provider registry as the admin UI.
"""

import threading
import time
from datetime import datetime
from typing import Dict, Optional, Any
import firebase_admin
from firebase_admin import firestore

class ProviderCache:
    """Thread-safe provider configuration cache backed by Firestore."""
    
    def __init__(self, cache_ttl_seconds: int = 30):
        """
        Initialize provider cache.
        
        Args:
            cache_ttl_seconds: Time-to-live for cache entries (default 30s)
        """
        self._cache: Dict[str, Any] = {}
        self._last_refresh: float = 0
        self._cache_ttl = cache_ttl_seconds
        self._lock = threading.RLock()
        self._loading = False
        
    def get_provider(self, provider_id: str, allow_cache: bool = True) -> Optional[Dict[str, Any]]:
        """
        Get provider configuration by ID.
        
        Args:
            provider_id: The provider identifier (e.g., 'cpxresearch', 'lootably')
            allow_cache: If False, forces reload from Firestore
            
        Returns:
            Provider config dict or None if not found
        """
        with self._lock:
            # Force reload if requested
            if not allow_cache:
                self._refresh_from_firestore(force=True)
            
            # Refresh if cache expired
            elif time.time() - self._last_refresh > self._cache_ttl:
                self._refresh_from_firestore()
            
            return self._cache.get(provider_id)
    
    def get_all_providers(self, allow_cache: bool = True) -> Dict[str, Any]:
        """
        Get all provider configurations.
        
        Args:
            allow_cache: If False, forces reload from Firestore
            
        Returns:
            Dict mapping provider_id to config
        """
        with self._lock:
            if not allow_cache:
                self._refresh_from_firestore(force=True)
            elif time.time() - self._last_refresh > self._cache_ttl:
                self._refresh_from_firestore()
            
            return dict(self._cache)
    
    def invalidate(self) -> None:
        """Invalidate cache immediately."""
        with self._lock:
            self._last_refresh = 0
    
    def refresh_async(self) -> None:
        """Trigger async refresh in background."""
        def _refresh():
            self.get_all_providers(allow_cache=False)
        
        thread = threading.Thread(target=_refresh, daemon=True)
        thread.start()
    
    def _refresh_from_firestore(self, force: bool = False) -> bool:
        """
        Load provider configurations from Firestore.
        
        Args:
            force: If True, always refresh even if cache is fresh
            
        Returns:
            True if refresh succeeded, False otherwise
        """
        # Prevent concurrent refreshes
        if self._loading:
            return False
        
        try:
            self._loading = True
            
            if not firebase_admin._apps:
                return False

            db = firestore.client()
            docs = db.collection('offerwall_providers').stream()
            
            new_cache = {}
            for doc in docs:
                data = doc.to_dict()
                if data:
                    # Keep all fields from the Firestore document to prevent dropping custom configurations
                    config = dict(data)
                    config['id'] = doc.id
                    # Ensure defaults for standard fields if missing
                    config['name'] = data.get('name') or data.get('label') or doc.id
                    config['logo'] = data.get('logo') or data.get('logoUrl') or data.get('iconUrl') or ''
                    config['status'] = data.get('status') or 'active'
                    config['enabled'] = True if data.get('enabled') is None else bool(data.get('enabled'))
                    config['priority'] = int(data.get('priority')) if data.get('priority') is not None else 100
                    config['launchMethod'] = data.get('launchMethod') or 'redirect'

                    try:
                        config['rewardMultiplier'] = float(data.get('rewardMultiplier')) if data.get('rewardMultiplier') is not None else 1.0
                    except (ValueError, TypeError):
                        config['rewardMultiplier'] = 1.0

                    try:
                        config['userSharePct'] = float(data.get('userSharePct')) if data.get('userSharePct') is not None else 0.85
                    except (ValueError, TypeError):
                        config['userSharePct'] = 0.85

                    try:
                        config['platformSharePct'] = float(data.get('platformSharePct')) if data.get('platformSharePct') is not None else 0.15
                    except (ValueError, TypeError):
                        config['platformSharePct'] = 0.15

                    try:
                        config['minimumReward'] = float(data.get('minimumReward')) if data.get('minimumReward') is not None else 1.0
                    except (ValueError, TypeError):
                        config['minimumReward'] = 1.0

                    try:
                        config['maximumReward'] = float(data.get('maximumReward')) if data.get('maximumReward') is not None else 100000.0
                    except (ValueError, TypeError):
                        config['maximumReward'] = 100000.0

                    config['fraudRules'] = data.get('fraudRules') if isinstance(data.get('fraudRules'), dict) else {}
                    config['stats'] = data.get('stats') if isinstance(data.get('stats'), dict) else {}
                    new_cache[doc.id] = config
            
            self._cache = new_cache
            self._last_refresh = time.time()
            
            return True
            
        except Exception as e:
            print(f"[ProviderCache] Error refreshing from Firestore: {str(e)}")
            return False
        
        finally:
            self._loading = False
    
    def verify_against_firestore(self, provider_id: str) -> bool:
        """
        Verify that cached provider config matches Firestore.
        
        Args:
            provider_id: Provider to verify
            
        Returns:
            True if cache and Firestore match, False if mismatch detected
        """
        try:
            if not firebase_admin._apps:
                return True

            db = firestore.client()
            snap = db.collection('offerwall_providers').document(provider_id).get()
            
            if not snap.exists:
                cached = self._cache.get(provider_id)
                if cached:
                    print(f"[ProviderCache] WARNING: Provider {provider_id} in cache but not in Firestore")
                    return False
                return True
            
            firestore_data = snap.to_dict()
            cached_data = self._cache.get(provider_id)
            
            if not cached_data:
                print(f"[ProviderCache] WARNING: Provider {provider_id} in Firestore but not in cache")
                return False
            
            # Check critical fields match
            critical_fields = ['secret', 'affiliateId', 'enabled']
            for field in critical_fields:
                fs_val = firestore_data.get(field)
                if field == 'enabled' and fs_val is None:
                    fs_val = True
                if fs_val != cached_data.get(field):
                    print(f"[ProviderCache] WARNING: Provider {provider_id} field {field} mismatch")
                    return False
            
            return True
            
        except Exception as e:
            print(f"[ProviderCache] Error verifying provider {provider_id}: {str(e)}")
            return False


# Global provider cache instance
_provider_cache: Optional[ProviderCache] = None

def init_provider_cache(cache_ttl: int = 30) -> ProviderCache:
    """Initialize and return global provider cache."""
    global _provider_cache
    if _provider_cache is None:
        _provider_cache = ProviderCache(cache_ttl_seconds=cache_ttl)
        # Warm up cache on init
        _provider_cache.get_all_providers(allow_cache=False)
    return _provider_cache

def get_provider_cache() -> ProviderCache:
    """Get global provider cache instance."""
    global _provider_cache
    if _provider_cache is None:
        _provider_cache = init_provider_cache()
    return _provider_cache
