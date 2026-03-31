"""Pydantic schemas for Akshare MCP server."""

from __future__ import annotations

from typing import Optional

from pydantic import AliasChoices, BaseModel, Field


class StockQuoteInput(BaseModel):
    ticker: str = Field(
        ...,
        min_length=1,
        max_length=10,
        description="Stock ticker symbol (e.g., 600519, 000001, 300750)",
    )
    fields: Optional[list[str]] = Field(
        default=None,
        description="Optional list of specific fields to return",
    )


class StockQuotesInput(BaseModel):
    tickers: list[str] = Field(
        ...,
        min_length=1,
        description="List of stock ticker symbols",
    )
    fields: Optional[list[str]] = Field(
        default=None,
        description="Optional list of specific fields to return",
    )


class StockSearchInput(BaseModel):
    query: str = Field(
        ...,
        min_length=1,
        description="Search query (company name or ticker)",
    )


class HistoricalDataInput(BaseModel):
    ticker: str = Field(
        ...,
        min_length=1,
        max_length=10,
        description="Stock ticker symbol (e.g., 600519, 000001)",
    )
    from_date: str = Field(
        ...,
        validation_alias=AliasChoices("from_date", "fromDate"),
        pattern=r"^\d{4}-\d{2}-\d{2}$",
        description="Start date in YYYY-MM-DD format",
    )
    to_date: str = Field(
        ...,
        validation_alias=AliasChoices("to_date", "toDate"),
        pattern=r"^\d{4}-\d{2}-\d{2}$",
        description="End date in YYYY-MM-DD format",
    )
    fields: Optional[list[str]] = Field(
        default=None,
        description="Optional list of specific fields to return. Valid fields: date, high, low, close, volume",
    )


class StockQuoteResponse(BaseModel):
    symbol: str
    name: Optional[str] = None
    exchange: Optional[str] = None
    currency: Optional[str] = None
    current_price: Optional[float] = None
    change: Optional[float] = None
    change_percent: Optional[float] = None
    volume: Optional[float] = None
    amount: Optional[float] = None
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    pb_ratio: Optional[float] = None
    high_52week: Optional[float] = None
    low_52week: Optional[float] = None
    open_price: Optional[float] = None
    high_price: Optional[float] = None
    low_price: Optional[float] = None
    pre_close: Optional[float] = None
    bid_price: Optional[float] = None
    ask_price: Optional[float] = None
    bid_volume: Optional[float] = None
    ask_volume: Optional[float] = None
    avg_daily_volume: Optional[float] = None
    turnover_rate: Optional[float] = None
    total_shares: Optional[float] = None
    float_shares: Optional[float] = None
    eps: Optional[float] = None
    bvps: Optional[float] = None
    dividend_yield: Optional[float] = None
    dividend: Optional[float] = None
    report_date: Optional[str] = None
    update_time: Optional[str] = None

    class Config:
        extra = "allow"


class StockSearchResult(BaseModel):
    symbol: str
    name: str
    exchange: str


class HistoricalData(BaseModel):
    date: str
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: Optional[float] = None
    volume: Optional[float] = None
    amount: Optional[float] = None
    amplitude: Optional[float] = None
    pct_change: Optional[float] = None
    change_amount: Optional[float] = None
    turnover_rate: Optional[float] = None
