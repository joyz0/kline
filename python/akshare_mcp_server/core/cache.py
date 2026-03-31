"""Cache and rate limiting utilities for Akshare MCP."""

from __future__ import annotations

import logging
import time
from threading import Lock
from typing import Any, Optional

from cachetools import TTLCache
from pyrate_limiter import Duration, Limiter, Rate

logger = logging.getLogger(__name__)


class RateLimiter:
    """Rate limiter using token bucket algorithm."""

    def __init__(self, calls: int = 10, period: int = 60):
        self.calls = calls
        self.period = period
        self.limiter = Limiter(Rate(calls, period * Duration.SECOND))
        self._lock = Lock()
        logger.info("Rate limiter initialized: %s calls per %s seconds", calls, period)

    def acquire(self, resource: str = "default") -> bool:
        with self._lock:
            try:
                self.limiter.try_acquire(resource)
                return True
            except Exception as exc:
                logger.warning("Rate limit exceeded for %s: %s", resource, exc)
                return False

    def wait_and_acquire(self, resource: str = "default") -> None:
        with self._lock:
            try:
                self.limiter.try_acquire(resource)
            except Exception:
                wait_time = self.period / self.calls
                logger.info(
                    "Rate limit exceeded, waiting %.2fs before retry...",
                    wait_time,
                )
                time.sleep(wait_time)
                self.limiter.try_acquire(resource)


class CacheManager:
    """Manage cache for stock data with TTL support."""

    def __init__(self, maxsize: int = 1000, ttl: int = 300):
        self.maxsize = maxsize
        self.ttl = ttl
        self._cache = TTLCache(maxsize=maxsize, ttl=ttl)
        self._lock = Lock()
        self._stats = {"hits": 0, "misses": 0}
        logger.info("Cache initialized: maxsize=%s ttl=%ss", maxsize, ttl)

    def get(self, key: str, default: Any = None) -> Any:
        with self._lock:
            try:
                value = self._cache.get(key, default)
                if key in self._cache:
                    self._stats["hits"] += 1
                else:
                    self._stats["misses"] += 1
                return value
            except Exception as exc:
                logger.error("Cache get error: %s", exc)
                return default

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        del ttl
        with self._lock:
            try:
                self._cache[key] = value
            except Exception as exc:
                logger.error("Cache set error: %s", exc)

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()

    def get_stats(self) -> dict[str, Any]:
        with self._lock:
            total = self._stats["hits"] + self._stats["misses"]
            hit_rate = (self._stats["hits"] / total * 100) if total > 0 else 0
            return {
                "size": len(self._cache),
                "maxsize": self.maxsize,
                "hits": self._stats["hits"],
                "misses": self._stats["misses"],
                "hit_rate": f"{hit_rate:.2f}%",
                "ttl": self.ttl,
            }


cache_manager = CacheManager(maxsize=1000, ttl=300)
rate_limiter = RateLimiter(calls=10, period=60)


def get_cache_manager() -> CacheManager:
    return cache_manager


def get_rate_limiter() -> RateLimiter:
    return rate_limiter
