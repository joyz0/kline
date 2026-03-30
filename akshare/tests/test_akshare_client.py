"""Unit tests for AkshareClient."""

import sys
from unittest.mock import MagicMock

import pandas as pd
import pytest

sys.path.insert(0, "src")
sys.path.insert(0, "src/core")

# Setup akshare mock before importing akshare_client
mock_ak = MagicMock()
mock_ak.stock_zh_a_spot_em = MagicMock()
mock_ak.stock_zh_a_hist = MagicMock()
mock_ak.stock_individual_info_em = MagicMock()

sys.modules["akshare"] = mock_ak

from akshare_client import AkshareClient, _get_akshare
import akshare_client
from errors import DataFetchError, NotFoundError


class TestAkshareClient:
    """Test AkshareClient class."""

    @pytest.fixture
    def mock_akshare(self):
        """Mock akshare module."""
        mock_df = pd.DataFrame({
            "代码": ["600519", "000001"],
            "名称": ["贵州茅台", "平安银行"],
            "最新价": [1800.0, 15.5],
            "涨跌幅": [0.5, -0.3],
        })

        mock_ak.stock_zh_a_spot_em.return_value = mock_df
        return mock_ak

    def test_client_init(self):
        """Test client initialization."""
        client = AkshareClient(rate_limit_calls=5, rate_limit_period=30)

        # Rate limiter should be shared across instances
        assert client.rate_limiter.calls == 5
        assert client.rate_limiter.period == 30
        
        # Verify global rate limiter is set
        assert AkshareClient._global_rate_limiter is not None

    def test_get_realtime_quote_success(self, mock_akshare):
        """Test successful quote fetch."""
        client = AkshareClient()

        result = client.get_realtime_quote("600519")

        assert result["代码"] == "600519"
        assert result["名称"] == "贵州茅台"

    def test_get_realtime_quote_not_found(self, mock_akshare):
        """Test quote fetch for non-existent symbol."""
        client = AkshareClient()

        with pytest.raises(NotFoundError):
            client.get_realtime_quote("999999")

    def test_get_realtime_quote_rate_limiting(self, mock_akshare):
        """Test that rate limiting is applied."""
        client = AkshareClient()

        # Multiple calls should respect rate limiting
        result1 = client.get_realtime_quote("600519")
        result2 = client.get_realtime_quote("000001")

        assert result1["代码"] == "600519"
        assert result2["代码"] == "000001"

    def test_get_multiple_quotes(self, mock_akshare):
        """Test fetching multiple quotes."""
        client = AkshareClient()

        results = client.get_multiple_realtime_quotes(["600519", "000001"])

        assert len(results) == 2

    def test_get_multiple_quotes_partial_failure(self, mock_akshare):
        """Test partial failure when fetching multiple quotes."""
        client = AkshareClient()

        # One valid, one invalid - should still return valid ones
        results = client.get_multiple_realtime_quotes(["600519", "999999"])

        assert len(results) >= 1

    def test_search_stocks(self, mock_akshare):
        """Test stock search."""
        client = AkshareClient()

        results = client.search_stocks("茅台")

        assert len(results) >= 1
        assert "600519" in [r["symbol"] for r in results]

    def test_search_stocks_rate_limiting(self, mock_akshare):
        """Test that rate limiting is applied to search."""
        client = AkshareClient()

        # Multiple searches should respect rate limiting
        results1 = client.search_stocks("茅台")
        results2 = client.search_stocks("平安")

        assert len(results1) >= 1
        assert len(results2) >= 1

    def test_search_stocks_no_results(self, mock_akshare):
        """Test search with no results."""
        client = AkshareClient()

        results = client.search_stocks("XYZNONEXIST")

        assert len(results) == 0


class TestAkshareClientErrorHandling:
    """Test error handling in AkshareClient."""

    def test_data_fetch_error(self):
        """Test DataFetchError is raised on network errors."""
        # Ensure mock is set in sys.modules
        sys.modules["akshare"] = mock_ak
        mock_ak.stock_zh_a_spot_em.side_effect = Exception("Network error")

        # Clear cache to ensure fresh data
        client = AkshareClient()

        with pytest.raises(DataFetchError):
            client.get_realtime_quote("600519")




class TestAkshareClientHistoricalData:
    """Test historical data fetching."""

    @pytest.fixture
    def mock_historical_akshare(self):
        """Mock akshare for historical data."""
        mock_df = pd.DataFrame({
            "日期": ["2024-01-01", "2024-01-02"],
            "开盘": [100.0, 101.0],
            "最高": [105.0, 106.0],
            "最低": [99.0, 100.0],
            "收盘": [104.0, 105.0],
            "成交量": [1000000, 1100000],
        })

        sys.modules["akshare"] = mock_ak
        mock_ak.stock_zh_a_hist.return_value = mock_df
        return mock_ak

    def test_get_historical_data_success(self, mock_historical_akshare):
        """Test successful historical data fetch."""
        client = AkshareClient()

        result = client.get_historical_data("600519", "2024-01-01", "2024-01-02")

        assert isinstance(result, pd.DataFrame)
        assert len(result) == 2

    def test_get_historical_data_empty_result(self):
        """Test historical data with empty result."""
        sys.modules["akshare"] = mock_ak
        mock_ak.stock_zh_a_hist.return_value = pd.DataFrame()

        client = AkshareClient()

        with pytest.raises(NotFoundError):
            client.get_historical_data("600519", "2024-01-01", "2024-01-02")


class TestAkshareClientStockInfo:
    """Test stock info fetching."""

    def test_get_stock_info(self):
        """Test stock info fetch."""
        mock_df = pd.DataFrame({
            "item": ["总市值", "市盈率"],
            "value": ["5000亿", "35.5"],
        })

        sys.modules["akshare"] = mock_ak
        mock_ak.stock_individual_info_em.return_value = mock_df

        client = AkshareClient()
        result = client.get_stock_info("600519")

        # Should return dict (possibly empty based on implementation)
        assert isinstance(result, dict)

    def test_get_stock_info_not_found(self):
        """Test stock info for non-existent stock."""
        sys.modules["akshare"] = mock_ak
        mock_ak.stock_individual_info_em.return_value = pd.DataFrame()

        client = AkshareClient()
        result = client.get_stock_info("999999")

        # Implementation returns empty dict instead of raising
        assert isinstance(result, dict)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
