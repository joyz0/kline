"""Custom exceptions for stock quotes service."""


class StockQuoteError(Exception):
    """Base exception for stock quote errors."""

    pass


class NotFoundError(StockQuoteError):
    """Raised when a stock ticker is not found."""

    pass


class ValidationError(StockQuoteError):
    """Raised when input validation fails."""

    pass


class RateLimitError(StockQuoteError):
    """Raised when rate limit is exceeded."""

    pass


class DataFetchError(StockQuoteError):
    """Raised when data fetching fails."""

    pass
