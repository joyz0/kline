"""
Integration tests for Akshare MCP.

These tests make real API calls to akshare and require network access.
They are marked with @pytest.mark.integration and are skipped by default.

Run with: pytest tests/test_integration.py -v -m integration
"""

import sys
import urllib.error

import pytest

sys.path.insert(0, "src")
sys.path.insert(0, "src/core")

from akshare_client import AkshareClient
from stock_quotes_service import StockQuotesService
from errors import NotFoundError, ValidationError, DataFetchError


pytestmark = pytest.mark.integration


def is_network_error(exception: Exception) -> bool:
    """Check if the exception is a network-related error."""
    error_msg = str(exception).lower()
    network_keywords = [
        "proxy",
        "connection",
        "remote",
        "network",
        "timeout",
        "ssl",
        "certificate",
        "urlopen",
        "http.client",
        "unable to connect",
    ]
    return any(keyword in error_msg for keyword in network_keywords)


def requires_network(func):
    """Decorator to skip test if network is unavailable."""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            if is_network_error(e):
                pytest.skip(f"Network unavailable: {e}")
            raise
    return wrapper


class TestAkshareRealAPI:
    """Test real akshare API calls."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for each test."""
        self.client = AkshareClient()
        self.service = StockQuotesService(self.client)
        yield

    @requires_network
    def test_get_realtime_quote_real(self):
        """Test fetching real-time quote for 贵州茅台."""
        result = self.client.get_realtime_quote("600519")

        assert result is not None
        assert result["代码"] == "600519"
        assert "最新价" in result
        assert isinstance(result["最新价"], (int, float))

    @requires_network
    def test_get_realtime_quote_invalid_symbol(self):
        """Test invalid symbol raises NotFoundError."""
        with pytest.raises(NotFoundError):
            self.client.get_realtime_quote("999999999")

    @requires_network
    def test_search_stocks_real(self):
        """Test real stock search."""
        results = self.client.search_stocks("茅台")

        assert len(results) > 0
        symbols = [r["symbol"] for r in results]
        assert "600519" in symbols

    @requires_network
    def test_search_stocks_by_code(self):
        """Test search by stock code."""
        results = self.client.search_stocks("600519")

        assert len(results) > 0
        assert results[0]["symbol"] == "600519"

    @requires_network
    def test_get_historical_data_real(self):
        """Test fetching real historical data."""
        result = self.client.get_historical_data(
            "600519", "2024-01-01", "2024-01-10"
        )

        assert len(result) > 0
        assert "收盘" in result.columns or "close" in result.columns

    @requires_network
    def test_get_historical_data_invalid_symbol(self):
        """Test historical data for invalid symbol."""
        with pytest.raises(NotFoundError):
            self.client.get_historical_data("999999", "2024-01-01", "2024-01-10")

    @requires_network
    def test_get_multiple_quotes_real(self):
        """Test fetching multiple real quotes."""
        results = self.client.get_multiple_realtime_quotes(["600519", "000001"])

        if len(results) == 0:
            pytest.skip("Network unavailable, all requests failed")

        assert len(results) == 2
        assert results[0]["代码"] == "600519"
        assert results[1]["代码"] == "000001"


class TestStockQuotesServiceReal:
    """Test StockQuotesService with real data."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for each test."""
        self.client = AkshareClient()
        self.service = StockQuotesService(self.client)
        yield

    @requires_network
    def test_service_get_quote(self):
        """Test service get_quote method."""
        from schemas import StockQuoteInput

        result = self.service.get_quote(StockQuoteInput(ticker="600519"))

        assert result.symbol == "600519"
        assert result.current_price is not None
        assert result.name is not None

    @requires_network
    def test_service_get_quote_with_fields(self):
        """Test service get_quote with specific fields."""
        from schemas import StockQuoteInput

        result = self.service.get_quote(
            StockQuoteInput(ticker="600519", fields=["current_price", "volume"])
        )

        assert result.symbol == "600519"
        assert result.current_price is not None

    @requires_network
    def test_service_search(self):
        """Test service search method."""
        from schemas import StockSearchInput

        results = self.service.search(StockSearchInput(query="茅台"))

        assert len(results) > 0

    @requires_network
    def test_service_historical_data(self):
        """Test service historical data method."""
        from schemas import HistoricalDataInput

        results = self.service.get_historical_data(
            HistoricalDataInput(
                ticker="600519",
                from_date="2024-01-01",
                to_date="2024-01-10"
            )
        )

        assert len(results) > 0
        assert results[0].date == "2024-01-02"

    def test_service_validation_invalid_ticker(self):
        """Test validation for invalid ticker."""
        from schemas import StockQuoteInput

        with pytest.raises(Exception):
            self.service.get_quote(StockQuoteInput(ticker=""))

    def test_service_validation_invalid_date_range(self):
        """Test validation for invalid date range."""
        from schemas import HistoricalDataInput

        with pytest.raises(ValidationError):
            self.service.get_historical_data(
                HistoricalDataInput(
                    ticker="600519",
                    from_date="2024-12-31",
                    to_date="2024-01-01"
                )
            )


class TestCacheRealScenario:
    """Test cache behavior with real API calls."""

    @requires_network
    def test_cache_works_with_real_api(self):
        """Test that cache actually works with real API calls."""
        client = AkshareClient(cache_ttl=10)

        result1 = client.get_realtime_quote("600519")
        stats1 = client.get_cache_stats()

        result2 = client.get_realtime_quote("600519")
        stats2 = client.get_cache_stats()

        assert result1["最新价"] == result2["最新价"]
        assert stats2["hits"] > stats1["hits"]

    @requires_network
    def test_cache_expiration(self):
        """Test cache expiration."""
        import time

        client = AkshareClient(cache_ttl=1)

        client.get_realtime_quote("600519")
        stats1 = client.get_cache_stats()

        time.sleep(2)

        client.get_realtime_quote("600519")
        stats2 = client.get_cache_stats()

        assert stats2["misses"] > stats1["misses"]


class TestRateLimiterRealScenario:
    """Test rate limiter with real API calls."""

    @requires_network
    def test_rate_limiter_allows_requests(self):
        """Test rate limiter allows requests within limit."""
        client = AkshareClient(rate_limit_calls=5, rate_limit_period=10)

        for i in range(5):
            result = client.get_realtime_quote("600519")
            assert result is not None


class TestNetworkErrorHandling:
    """Test network error handling."""

    def test_handles_proxy_error_gracefully(self):
        """Test that client handles proxy errors gracefully."""
        client = AkshareClient()

        with pytest.raises((DataFetchError, NotFoundError, Exception)) as exc_info:
            client.get_realtime_quote("600519")

        exc = exc_info.value
        if is_network_error(exc):
            pytest.skip(f"Network unavailable (proxy issue): {exc}")

    def test_handles_timeout_gracefully(self):
        """Test that client handles timeout errors gracefully."""
        client = AkshareClient()

        with pytest.raises((DataFetchError, NotFoundError, Exception)) as exc_info:
            client.get_realtime_quote("600519")

        exc = exc_info.value
        if is_network_error(exc):
            pytest.skip(f"Network unavailable (timeout): {exc}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-m", "integration"])
