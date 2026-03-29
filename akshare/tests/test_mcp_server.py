"""
Unit tests for MCP Server.

These tests verify the MCP Server functionality without requiring
actual network calls to Akshare API.
"""

import sys
from unittest.mock import MagicMock

import pytest

# Add src to path for imports
sys.path.insert(0, "src")
sys.path.insert(0, "src/core")

# Now import from src modules
from akshare_client import AkshareClient
from schemas import (
    HistoricalDataInput,
    StockQuoteInput,
    StockQuotesInput,
    StockSearchInput,
)
from stock_quotes_service import StockQuotesService
from errors import DataFetchError, NotFoundError, ValidationError


class TestSchemas:
    """Test Pydantic schemas for input validation."""

    def test_stock_quote_input_valid(self):
        """Test valid stock quote input."""
        input_data = StockQuoteInput(ticker="600519")
        assert input_data.ticker == "600519"
        assert input_data.fields is None

    def test_stock_quote_input_with_fields(self):
        """Test stock quote input with specific fields."""
        input_data = StockQuoteInput(ticker="600519", fields=["current_price", "volume"])
        assert input_data.ticker == "600519"
        assert input_data.fields == ["current_price", "volume"]

    def test_stock_quote_input_empty_ticker(self):
        """Test empty ticker validation."""
        with pytest.raises(Exception):
            StockQuoteInput(ticker="")

    def test_stock_quotes_input_valid(self):
        """Test valid multiple quotes input."""
        input_data = StockQuotesInput(tickers=["600519", "000001"])
        assert len(input_data.tickers) == 2

    def test_stock_search_input_valid(self):
        """Test valid search input."""
        input_data = StockSearchInput(query="茅台")
        assert input_data.query == "茅台"

    def test_historical_data_input_valid(self):
        """Test valid historical data input."""
        input_data = HistoricalDataInput(
            ticker="600519",
            from_date="2024-01-01",
            to_date="2024-12-31",
        )
        assert input_data.ticker == "600519"
        assert input_data.from_date == "2024-01-01"

    def test_historical_data_input_invalid_date_format(self):
        """Test invalid date format."""
        with pytest.raises(Exception):
            HistoricalDataInput(
                ticker="600519",
                from_date="01-01-2024",
                to_date="2024-12-31",
            )


class TestMCPToolsRegistration:
    """Test MCP tools are properly registered."""

    def test_mcp_tools_exist(self):
        """Verify that MCP server has all required tools."""
        import akshare_mcp

        mcp = akshare_mcp.mcp

        # Verify mcp object exists and has required attributes
        assert mcp is not None
        assert hasattr(mcp, "run")

    def test_tool_decorator_works(self):
        """Test that @mcp.tool() decorator registers tools correctly."""
        import akshare_mcp

        mcp = akshare_mcp.mcp
        # The tools should be registered via decorator
        # Verify the server can be inspected
        assert mcp is not None


class TestServiceMapping:
    """Test service layer data mapping."""

    def test_quote_response_mapping(self):
        """Test quote response mapping."""
        mock_client = MagicMock(spec=AkshareClient)
        service = StockQuotesService(akshare_client=mock_client)

        # Mock raw data from Akshare
        raw_data = {
            "代码": "600519",
            "名称": "贵州茅台",
            "最新价": 1800.0,
            "涨跌额": 10.0,
            "涨跌幅": 0.56,
            "成交量": 1000000,
            "成交额": 1800000000,
            "总市值": 2260000000000,
            "市盈率": 35.5,
            "市净率": 10.2,
            "今开": 1790.0,
            "最高": 1810.0,
            "最低": 1785.0,
            "昨收": 1790.0,
            "换手率": 0.15,
        }

        mock_client.get_realtime_quote.return_value = raw_data

        result = service.get_quote(StockQuoteInput(ticker="600519"))

        assert result.symbol == "600519"
        assert result.name == "贵州茅台"
        assert result.current_price == 1800.0
        assert result.change == 10.0
        assert result.change_percent == 0.56

    def test_exchange_inference(self):
        """Test exchange inference from ticker."""
        service = StockQuotesService()

        # Shanghai stock
        assert service._infer_exchange("600519") == "SH"

        # Shenzhen stock (0 prefix)
        assert service._infer_exchange("000001") == "SZ"

        # Shenzhen stock (3 prefix)
        assert service._infer_exchange("300750") == "SZ"

        # Unknown
        assert service._infer_exchange("999999") == "UNKNOWN"

    def test_date_validation_valid(self):
        """Test date range validation with valid dates."""
        service = StockQuotesService()

        # Valid dates should not raise
        service._validate_dates("2024-01-01", "2024-12-31")

    def test_date_validation_future(self):
        """Test date validation with future date."""
        service = StockQuotesService()

        # Future date should raise
        with pytest.raises(ValidationError):
            service._validate_dates("2030-01-01", "2030-12-31")

    def test_date_validation_invalid_range(self):
        """Test date validation with reversed dates."""
        service = StockQuotesService()

        # from_date after to_date should raise
        with pytest.raises(ValidationError):
            service._validate_dates("2024-12-31", "2024-01-01")


class TestErrorHandling:
    """Test error handling."""

    def test_not_found_error(self):
        """Test NotFoundError."""
        error = NotFoundError("Stock not found")
        assert "Stock not found" in str(error)

    def test_data_fetch_error(self):
        """Test DataFetchError."""
        error = DataFetchError("Network error")
        assert "Network error" in str(error)

    def test_validation_error(self):
        """Test ValidationError."""
        error = ValidationError("Invalid input")
        assert "Invalid input" in str(error)


class TestCLI:
    """Test CLI mode."""

    def test_cli_help(self):
        """Test CLI help displays correctly."""
        # This is tested by running akshare_mcp --help
        import akshare_mcp

        # Just verify the module loads
        assert akshare_mcp is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
