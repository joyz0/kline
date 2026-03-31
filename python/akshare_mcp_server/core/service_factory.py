"""Service factory helpers for Akshare MCP server."""

from __future__ import annotations

from .akshare_client import AkshareClient
from .akshare_service import StockQuotesService

_stock_service: StockQuotesService | None = None


def get_stock_service() -> StockQuotesService:
    global _stock_service
    if _stock_service is None:
        _stock_service = StockQuotesService(akshare_client=AkshareClient())
    return _stock_service
