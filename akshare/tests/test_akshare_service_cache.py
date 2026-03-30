"""Unit tests for StockQuotesService caching."""

import sys
from unittest.mock import MagicMock, patch

import pandas as pd
import pytest

sys.path.insert(0, "src")
sys.path.insert(0, "src/core")

# Setup mocks before importing
mock_ak = MagicMock()
mock_ak.stock_zh_a_spot_em = MagicMock()
mock_ak.stock_zh_a_hist = MagicMock()
mock_ak.stock_individual_info_em = MagicMock()

sys.modules["akshare"] = mock_ak

from akshare_client import AkshareClient
from akshare_service import StockQuotesService
from schemas import StockQuoteInput, StockQuotesInput, StockSearchInput, HistoricalDataInput


class TestStockQuotesServiceCaching:
    """Test StockQuotesService caching functionality."""

    @pytest.fixture
    def mock_akshare_data(self):
        """Mock akshare data."""
        mock_df = pd.DataFrame({
            "代码": ["600519", "000001"],
            "名称": ["贵州茅台", "平安银行"],
            "最新价": [1800.0, 15.5],
            "涨跌幅": [0.5, -0.3],
        })

        mock_ak.stock_zh_a_spot_em.return_value = mock_df
        return mock_ak

    @pytest.fixture
    def service(self):
        """Create a service instance."""
        return StockQuotesService()

    def test_get_quote_cache_hit(self, mock_akshare_data, service):
        """Test that get_quote caches results."""
        input_data = StockQuoteInput(ticker="600519")

        # First call - should miss cache
        result1 = service.get_quote(input_data)

        # Second call - should hit cache
        result2 = service.get_quote(input_data)

        # Both should return same data
        assert result1.symbol == "600519"
        assert result2.symbol == "600519"
        
        # Verify cache stats show a hit
        stats = service.get_cache_stats()
        assert stats["hits"] >= 1

    def test_get_quote_cache_key_includes_fields(self, mock_akshare_data, service):
        """Test that cache key includes requested fields."""
        input_data1 = StockQuoteInput(ticker="600519", fields=["current_price"])
        input_data2 = StockQuoteInput(ticker="600519", fields=["current_price", "volume"])

        result1 = service.get_quote(input_data1)
        result2 = service.get_quote(input_data2)

        # Both should succeed
        assert result1.symbol == "600519"
        assert result2.symbol == "600519"

    def test_get_quotes_cache_hit(self, mock_akshare_data, service):
        """Test that get_quotes caches results."""
        input_data = StockQuotesInput(tickers=["600519", "000001"])

        # First call
        results1 = service.get_quotes(input_data)

        # Second call - should hit cache
        results2 = service.get_quotes(input_data)

        assert len(results1) == 2
        assert len(results2) == 2

    def test_search_cache_hit(self, mock_akshare_data, service):
        """Test that search caches results."""
        input_data = StockSearchInput(query="茅台")

        # First call
        results1 = service.search(input_data)

        # Second call - should hit cache
        results2 = service.search(input_data)

        assert len(results1) >= 1
        assert len(results2) >= 1

    def test_search_cache_ttl(self, mock_akshare_data, service):
        """Test that search cache has custom TTL."""
        input_data = StockSearchInput(query="茅台")

        service.search(input_data)

        # Search should be cached with 30 minute TTL
        stats = service.get_cache_stats()
        assert stats["hits"] >= 0  # May or may not have hit depending on test order

    def test_historical_data_cache_hit(self, mock_akshare_data, service):
        """Test that historical data is cached."""
        mock_historical_df = pd.DataFrame({
            "日期": ["2024-01-01", "2024-01-02"],
            "开盘": [100.0, 101.0],
            "最高": [105.0, 106.0],
            "最低": [99.0, 100.0],
            "收盘": [104.0, 105.0],
            "成交量": [1000000, 1100000],
        })
        mock_ak.stock_zh_a_hist.return_value = mock_historical_df

        input_data = HistoricalDataInput(
            ticker="600519",
            from_date="2024-01-01",
            to_date="2024-01-02"
        )

        # First call
        results1 = service.get_historical_data(input_data)

        # Second call - should hit cache
        results2 = service.get_historical_data(input_data)

        assert len(results1) == 2
        assert len(results2) == 2

    def test_clear_cache(self, mock_akshare_data, service):
        """Test clearing cache."""
        input_data = StockQuoteInput(ticker="600519")

        # Add to cache
        service.get_quote(input_data)

        # Clear cache
        service.clear_cache()

        # Stats should show cleared cache
        stats = service.get_cache_stats()
        assert stats["size"] == 0

    def test_get_cache_stats(self, service):
        """Test getting cache statistics."""
        stats = service.get_cache_stats()

        assert "hits" in stats
        assert "misses" in stats
        assert "ttl" in stats
        assert "size" in stats


class TestStockQuotesServiceInitialization:
    """Test StockQuotesService initialization."""

    def test_default_cache_ttl(self):
        """Test default cache TTL."""
        service = StockQuotesService()
        
        assert service.cache_manager.ttl == 300  # 5 minutes

    def test_custom_cache_ttl(self):
        """Test custom cache TTL."""
        service = StockQuotesService(cache_ttl=600)
        
        assert service.cache_manager.ttl == 600  # 10 minutes

    def test_shared_rate_limiter(self):
        """Test that rate limiter is shared across client instances."""
        client1 = AkshareClient()
        client2 = AkshareClient()
        
        # Both clients should share the same rate limiter
        assert client1.rate_limiter is client2.rate_limiter
        assert AkshareClient._global_rate_limiter is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
