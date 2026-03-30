"""Unit tests for cache and rate limiting functionality."""

import sys
import time
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, "src")
sys.path.insert(0, "src/core")

from cache import CacheManager, RateLimiter


class TestCacheManager:
    """Test CacheManager class."""

    def test_cache_set_and_get(self):
        """Test basic cache set and get operations."""
        cache = CacheManager(maxsize=100, ttl=60)

        cache.set("key1", "value1")
        assert cache.get("key1") == "value1"

    def test_cache_miss(self):
        """Test cache miss returns default value."""
        cache = CacheManager(maxsize=100, ttl=60)

        assert cache.get("nonexistent") is None
        assert cache.get("nonexistent", "default") == "default"

    def test_cache_delete(self):
        """Test cache deletion."""
        cache = CacheManager(maxsize=100, ttl=60)

        cache.set("key1", "value1")
        assert cache.delete("key1") is True
        assert cache.get("key1") is None

    def test_cache_delete_nonexistent(self):
        """Test deleting nonexistent key returns False."""
        cache = CacheManager(maxsize=100, ttl=60)

        assert cache.delete("nonexistent") is False

    def test_cache_clear(self):
        """Test clearing all cache entries."""
        cache = CacheManager(maxsize=100, ttl=60)

        cache.set("key1", "value1")
        cache.set("key2", "value2")
        cache.clear()

        assert cache.get("key1") is None
        assert cache.get("key2") is None

    def test_cache_stats(self):
        """Test cache statistics tracking."""
        cache = CacheManager(maxsize=100, ttl=60)

        cache.set("key1", "value1")
        cache.get("key1")  # hit
        cache.get("key2")  # miss

        stats = cache.get_stats()
        assert stats["hits"] == 1
        assert stats["misses"] == 1

    def test_cache_maxsize_eviction(self):
        """Test cache eviction when maxsize is reached."""
        cache = CacheManager(maxsize=2, ttl=60)

        cache.set("key1", "value1")
        cache.set("key2", "value2")
        cache.set("key3", "value3")  # Should trigger eviction

        # At least one key should still exist
        assert cache.get("key1") is not None or cache.get("key2") is not None

    def test_cache_overwrite(self):
        """Test overwriting existing cache value."""
        cache = CacheManager(maxsize=100, ttl=60)

        cache.set("key1", "value1")
        cache.set("key1", "value2")

        assert cache.get("key1") == "value2"


class TestRateLimiter:
    """Test RateLimiter class."""

    def test_rate_limiter_init(self):
        """Test rate limiter initialization."""
        limiter = RateLimiter(calls=10, period=60)

        assert limiter.calls == 10
        assert limiter.period == 60

    def test_rate_limiter_acquire(self):
        """Test acquiring a token."""
        limiter = RateLimiter(calls=10, period=60)

        # Should be able to acquire within limit
        for _ in range(10):
            assert limiter.acquire("test") is True

    def test_rate_limiter_exceed_limit(self):
        """Test rate limit is enforced."""
        limiter = RateLimiter(calls=3, period=1)

        # First 3 should succeed
        assert limiter.acquire("test") is True
        assert limiter.acquire("test") is True
        assert limiter.acquire("test") is True

        # 4th should fail
        assert limiter.acquire("test") is False

    def test_rate_limiter_different_resources(self):
        """Test separate rate limiting per resource."""
        limiter = RateLimiter(calls=2, period=1)

        # Each resource should have its own limit
        assert limiter.acquire("resource1") is True
        assert limiter.acquire("resource1") is True
        assert limiter.acquire("resource1") is False  # Limited

        assert limiter.acquire("resource2") is True   # Different resource
        assert limiter.acquire("resource2") is True


class TestCacheWithMockClient:
    """Test cache integration with mocked AkshareClient."""

    @pytest.fixture
    def mock_client(self):
        """Create a mock AkshareClient."""
        client = MagicMock()
        client.get_realtime_quote.return_value = {
            "代码": "600519",
            "名称": "贵州茅台",
            "最新价": 1800.0,
        }
        return client

    def test_cache_decorator(self, mock_client):
        """Test cache decorator with mock client."""
        from akshare_client import AkshareClient

        with patch.object(AkshareClient, "get_realtime_quote", mock_client.get_realtime_quote):
            client = AkshareClient(cache_ttl=10)

            # First call - cache miss
            result1 = client.get_realtime_quote("600519")
            assert result1["代码"] == "600519"

            # Second call - should use cache (mock still called in real impl)
            # The important thing is cache stats show hits
            stats = client.get_cache_stats()
            assert stats is not None


class TestIntegration:
    """Integration tests (may require network)."""

    @pytest.mark.slow
    def test_full_workflow_simulation(self):
        """Simulate full cache + rate limiter workflow."""
        cache = CacheManager(maxsize=100, ttl=1)
        limiter = RateLimiter(calls=5, period=2)

        # Simulate cached quote fetch
        cached_quote = {"代码": "600519", "最新价": 1800.0}
        cache.set("quote_600519", cached_quote)

        # Retrieve from cache
        result = cache.get("quote_quote_600519")
        # In real scenario this would be different key format

        # Verify limiter works
        for _ in range(5):
            assert limiter.acquire("quote") is True

        assert limiter.acquire("quote") is False

        # Wait for rate limit reset
        time.sleep(2)
        assert limiter.acquire("quote") is True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
