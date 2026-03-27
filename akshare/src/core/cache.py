"""Cache and rate limiting utilities for Akshare MCP."""

import logging
import time
from collections import OrderedDict
from datetime import datetime, timedelta
from functools import wraps
from threading import Lock
from typing import Any, Callable, Optional

from cachetools import TTLCache, cached
from cachetools.keys import hashkey
from pyrate_limiter import Duration, Limiter, Rate

logger = logging.getLogger(__name__)


class RateLimiter:
    """Rate limiter using token bucket algorithm."""

    def __init__(
        self,
        calls: int = 10,
        period: int = 60,
    ):
        """
        Initialize rate limiter.

        Args:
            calls: Number of calls allowed per period
            period: Time period in seconds
        """
        self.calls = calls
        self.period = period
        self.limiter = Limiter(Rate(calls, period * Duration.SECOND))
        self._lock = Lock()
        logger.info(f"Rate limiter initialized: {calls} calls per {period} seconds")

    def acquire(self, resource: str = "default") -> bool:
        """
        Acquire a token from the rate limiter.

        Args:
            resource: Resource name for rate limiting

        Returns:
            True if token acquired, False if rate limit exceeded
        """
        with self._lock:
            try:
                self.limiter.try_acquire(resource)
                return True
            except Exception as e:
                logger.warning(f"Rate limit exceeded for {resource}: {e}")
                return False

    def wait_and_acquire(self, resource: str = "default") -> None:
        """
        Wait until a token is available and then acquire it.

        Args:
            resource: Resource name for rate limiting
        """
        with self._lock:
            try:
                self.limiter.try_acquire(resource)
            except Exception:
                # Calculate wait time
                wait_time = self.period / self.calls
                logger.info(
                    f"Rate limit exceeded, waiting {wait_time:.2f}s before retry..."
                )
                time.sleep(wait_time)
                self.limiter.try_acquire(resource)


class CacheManager:
    """Manage cache for stock data with TTL support."""

    def __init__(
        self,
        maxsize: int = 1000,
        ttl: int = 300,
    ):
        """
        Initialize cache manager.

        Args:
            maxsize: Maximum number of items in cache
            ttl: Time to live in seconds (default: 5 minutes)
        """
        self.maxsize = maxsize
        self.ttl = ttl
        self._cache = TTLCache(maxsize=maxsize, ttl=ttl)
        self._lock = Lock()
        self._stats = {
            "hits": 0,
            "misses": 0,
            "evictions": 0,
        }
        logger.info(f"Cache initialized: maxsize={maxsize}, ttl={ttl}s")

    def get(self, key: str, default: Any = None) -> Any:
        """
        Get value from cache.

        Args:
            key: Cache key
            default: Default value if key not found

        Returns:
            Cached value or default
        """
        with self._lock:
            try:
                value = self._cache.get(key, default)
                if key in self._cache:
                    self._stats["hits"] += 1
                    logger.debug(f"Cache hit: {key}")
                else:
                    self._stats["misses"] += 1
                    logger.debug(f"Cache miss: {key}")
                return value
            except Exception as e:
                logger.error(f"Cache get error: {e}")
                return default

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """
        Set value in cache.

        Args:
            key: Cache key
            value: Value to cache
            ttl: Optional custom TTL for this item
        """
        with self._lock:
            try:
                if ttl is not None:
                    # Custom TTL not directly supported by TTLCache, use default
                    self._cache[key] = value
                else:
                    self._cache[key] = value
                logger.debug(f"Cache set: {key}")
            except Exception as e:
                logger.error(f"Cache set error: {e}")

    def delete(self, key: str) -> bool:
        """
        Delete key from cache.

        Args:
            key: Cache key

        Returns:
            True if deleted, False if key not found
        """
        with self._lock:
            try:
                del self._cache[key]
                logger.debug(f"Cache delete: {key}")
                return True
            except KeyError:
                return False

    def clear(self) -> None:
        """Clear all items from cache."""
        with self._lock:
            self._cache.clear()
            logger.info("Cache cleared")

    def get_stats(self) -> dict:
        """
        Get cache statistics.

        Returns:
            Dictionary with hits, misses, and hit rate
        """
        with self._lock:
            total = self._stats["hits"] + self._stats["misses"]
            hit_rate = (
                (self._stats["hits"] / total * 100) if total > 0 else 0
            )
            return {
                "size": len(self._cache),
                "maxsize": self.maxsize,
                "hits": self._stats["hits"],
                "misses": self._stats["misses"],
                "hit_rate": f"{hit_rate:.2f}%",
                "ttl": self.ttl,
            }

    def cleanup(self) -> None:
        """Remove expired items from cache."""
        with self._lock:
            # TTLCache automatically handles expiration on access
            # This forces cleanup of all expired items
            expired_keys = [
                key
                for key in self._cache
                if self._cache.get(key) is None
            ]
            for key in expired_keys:
                try:
                    del self._cache[key]
                except KeyError:
                    pass


def cache_with_ttl(ttl: int = 300):
    """
    Decorator for caching function results with TTL.

    Args:
        ttl: Time to live in seconds

    Returns:
        Decorated function
    """

    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Create cache key from arguments
            key = f"{func.__name__}:{str(args)}:{str(sorted(kwargs.items()))}"
            
            # Check cache
            cached_value = cache_manager.get(key)
            if cached_value is not None:
                return cached_value
            
            # Call function and cache result
            result = func(*args, **kwargs)
            cache_manager.set(key, result, ttl)
            return result
        
        return wrapper
    
    return decorator


# Global cache and rate limiter instances
cache_manager = CacheManager(maxsize=1000, ttl=300)
rate_limiter = RateLimiter(calls=10, period=60)  # 10 calls per minute


def get_cache_manager() -> CacheManager:
    """Get global cache manager instance."""
    return cache_manager


def get_rate_limiter() -> RateLimiter:
    """Get global rate limiter instance."""
    return rate_limiter
