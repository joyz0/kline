"""Unit tests for CLI module (__main__.py)."""

import json
import sys
from io import StringIO
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, "src")
sys.path.insert(0, "src/core")


class TestCLI:
    """Test CLI entry point."""

    def test_cli_help(self, capsys):
        """Test --help displays usage information."""
        test_args = ["__main__.py", "--help"]

        with patch.object(sys, "argv", test_args):
            try:
                from __main__ import main
                main()
            except SystemExit:
                pass

        captured = capsys.readouterr()
        assert "Akshare Data Retrieval Service" in captured.out
        assert "python -m akshare quote" in captured.out

    def test_cli_no_args(self, capsys):
        """Test running with no arguments."""
        test_args = ["__main__.py"]

        with patch.object(sys, "argv", test_args):
            from __main__ import main
            main()

        captured = capsys.readouterr()
        assert "Akshare Data Retrieval Service" in captured.out

    def test_cli_quote_command(self, capsys):
        """Test quote command with mocked client."""
        test_args = ["__main__.py", "quote", "600519"]

        mock_quote = {
            "symbol": "600519",
            "name": "贵州茅台",
            "current_price": 1800.0,
        }

        with patch.object(sys, "argv", test_args):
            with patch("core.stock_quotes_service.StockQuotesService.get_quote") as mock_get:
                mock_get.return_value = MagicMock(
                    model_dump=MagicMock(return_value=mock_quote)
                )
                from __main__ import main
                main()

        captured = capsys.readouterr()
        assert "600519" in captured.out

    def test_cli_search_command(self, capsys):
        """Test search command with mocked client."""
        test_args = ["__main__.py", "search", "茅台"]

        mock_results = [
            {"symbol": "600519", "name": "贵州茅台"},
        ]

        with patch.object(sys, "argv", test_args):
            with patch("core.stock_quotes_service.StockQuotesService.search") as mock_search:
                mock_search.return_value = [
                    MagicMock(model_dump=MagicMock(return_value=r))
                    for r in mock_results
                ]
                from __main__ import main
                main()

        captured = capsys.readouterr()
        assert "茅台" in captured.out

    def test_cli_history_command(self, capsys):
        """Test history command with mocked client."""
        test_args = ["__main__.py", "history", "600519", "2024-01-01", "2024-12-31"]

        mock_data = [
            {"date": "2024-01-01", "close": 1800.0},
        ]

        with patch.object(sys, "argv", test_args):
            with patch(
                "core.stock_quotes_service.StockQuotesService.get_historical_data"
            ) as mock_history:
                mock_history.return_value = [
                    MagicMock(model_dump=MagicMock(return_value=d))
                    for d in mock_data
                ]
                from __main__ import main
                main()

        captured = capsys.readouterr()
        assert "2024-01-01" in captured.out

    def test_cli_quote_missing_ticker(self, capsys):
        """Test quote command without ticker."""
        test_args = ["__main__.py", "quote"]

        with patch.object(sys, "argv", test_args):
            from __main__ import main
            main()

        captured = capsys.readouterr()
        # Should show help or error
        assert "error" in captured.out.lower() or "usage" in captured.out.lower()

    def test_cli_invalid_command(self, capsys):
        """Test invalid command."""
        test_args = ["__main__.py", "invalid_command"]

        with patch.object(sys, "argv", test_args):
            from __main__ import main
            main()

        captured = capsys.readouterr()
        assert "error" in captured.out.lower() or "usage" in captured.out.lower()

    def test_cli_quote_error_handling(self, capsys):
        """Test quote command error handling."""
        test_args = ["__main__.py", "quote", "INVALID"]

        with patch.object(sys, "argv", test_args):
            with patch("core.stock_quotes_service.StockQuotesService.get_quote") as mock_get:
                mock_get.side_effect = Exception("Network error")
                from __main__ import main
                main()

        captured = capsys.readouterr()
        # Should output JSON error
        assert "error" in captured.out


class TestCLIOutputFormat:
    """Test CLI output formatting."""

    def test_quote_output_is_valid_json(self, capsys):
        """Test that quote command outputs valid JSON."""
        test_args = ["__main__.py", "quote", "600519"]

        mock_quote = {
            "symbol": "600519",
            "name": "贵州茅台",
            "current_price": 1800.0,
        }

        with patch.object(sys, "argv", test_args):
            with patch("core.stock_quotes_service.StockQuotesService.get_quote") as mock_get:
                mock_get.return_value = MagicMock(
                    model_dump=MagicMock(return_value=mock_quote)
                )
                from __main__ import main
                main()

        captured = capsys.readouterr()
        # Should be valid JSON
        data = json.loads(captured.out)
        assert data["symbol"] == "600519"

    def test_search_output_is_valid_json(self, capsys):
        """Test that search command outputs valid JSON."""
        test_args = ["__main__.py", "search", "茅台"]

        mock_results = [{"symbol": "600519", "name": "贵州茅台"}]

        with patch.object(sys, "argv", test_args):
            with patch("core.stock_quotes_service.StockQuotesService.search") as mock_search:
                mock_search.return_value = [
                    MagicMock(model_dump=MagicMock(return_value=r))
                    for r in mock_results
                ]
                from __main__ import main
                main()

        captured = capsys.readouterr()
        data = json.loads(captured.out)
        assert "results" in data
        assert len(data["results"]) == 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
