"""Custom exceptions for Akshare MCP server."""


class StockQuoteError(Exception):
    """Base exception for stock quote errors."""


class NotFoundError(StockQuoteError):
    """Raised when a stock ticker is not found."""


class ValidationError(StockQuoteError):
    """Raised when input validation fails."""


class RateLimitError(StockQuoteError):
    """Raised when rate limit is exceeded."""


class DataFetchError(StockQuoteError):
    """Raised when data fetching fails."""
