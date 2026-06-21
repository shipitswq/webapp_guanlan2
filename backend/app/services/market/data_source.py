"""Market data source — primary: mootdx (Tongdaxin TCP 7709), fallback: DB cache.

Data source priority (per a-stock-data skill):
  1. mootdx (TCP) — K-line, real-time quotes, 5-level order book (no IP blocking)
  2. Tencent Finance (HTTP) — PE/PB/market cap (not currently wired, available if needed)

mootdx TCP protocol does not get IP-blocked and works reliably in mainland China.
"""
import datetime
import time
import pandas as pd
from fastapi import HTTPException
from mootdx.quotes import Quotes
from sqlalchemy import select
from app.core.database import async_session_factory
from app.models.stock import StockDaily

# ── mootdx client (lazy init, TCP 7709) ───────────────────────────────
_quotes_client = None


def _get_client() -> Quotes:
    global _quotes_client
    if _quotes_client is None:
        _quotes_client = Quotes.factory(market='std')
    return _quotes_client


# ── Stock name cleanup ────────────────────────────────────────────────
# mootdx v2 returns UTF-8-decoded Chinese names correctly.
# Only strip trailing null bytes (padding from binary protocol).
def _clean_name(raw: str) -> str:
    if not raw:
        return raw
    return raw.strip('\x00').strip()


# ── Stock search cache (in-memory, 24h TTL) ───────────────────────────
_search_list_cache: dict = {"data": None, "timestamp": 0, "ttl": 86400}


def _load_stock_list() -> list[dict]:
    """Load full A-share list from mootdx, cached for 24h."""
    now = time.time()
    if _search_list_cache["data"] is not None and \
       (now - _search_list_cache["timestamp"]) < _search_list_cache["ttl"]:
        return _search_list_cache["data"]

    client = _get_client()
    results = []

    # A-share code ranges (per market):
    #   Shenzhen (market=0): 000001–004999, 300000–301999
    #   Shanghai (market=1): 600000–609999, 688000–689999
    def _is_a_share(code: str, market_id: int) -> bool:
        if market_id == 0:
            return (code.startswith("000") or code.startswith("001") or
                    code.startswith("002") or code.startswith("003") or
                    code.startswith("300") or code.startswith("301"))
        elif market_id == 1:
            return (code.startswith("600") or code.startswith("601") or
                    code.startswith("603") or code.startswith("605") or
                    code.startswith("688") or code.startswith("689"))
        return False

    try:
        for market_id in [0, 1]:  # 深/沪
            raw_df = client.stocks(market=market_id)
            if raw_df is None or raw_df.empty:
                continue
            for _, row in raw_df.iterrows():
                code = str(int(row["code"])).zfill(6)
                if not _is_a_share(code, market_id):
                    continue
                results.append({
                    "code": code,
                    "name": _clean_name(row["name"]),
                })
    except Exception as e:
        print(f"[data_source] mootdx stock list load failed: {e}")
        if _search_list_cache["data"] is not None:
            return _search_list_cache["data"]
        return []

    if not results:
        if _search_list_cache["data"] is not None:
            return _search_list_cache["data"]
        return []

    print(f"[data_source] loaded {len(results)} A-shares from mootdx")
    _search_list_cache["data"] = results
    _search_list_cache["timestamp"] = now
    return results


def _mootdx_frequency(period: str) -> int:
    """Map period string to mootdx bars() frequency parameter."""
    return {
        "1m": 7, "5m": 0, "15m": 1, "30m": 2, "60m": 3,
        "daily": 9, "weekly": 5, "monthly": 6,
    }.get(period, 9)


# ═══════════════════════════════════════════════════════════════════════
#  Public API
# ═══════════════════════════════════════════════════════════════════════

async def fetch_kline(
    stock_code: str,
    start_date: str = "",
    end_date: str = "",
    period: str = "daily",
) -> pd.DataFrame:
    """Fetch K-line data.

    Priority: DB cache → mootdx TCP (with DB write-back).
    Raises HTTPException on failure (no silent empty returns).
    """
    category = _mootdx_frequency(period)

    # 1. Try DB cache first (only for daily — minute/weekly/monthly not cached)
    if period == "daily":
        async with async_session_factory() as session:
            stmt = select(StockDaily).where(StockDaily.stock_code == stock_code)
            if start_date:
                stmt = stmt.where(StockDaily.trade_date >= datetime.date.fromisoformat(start_date))
            if end_date:
                stmt = stmt.where(StockDaily.trade_date <= datetime.date.fromisoformat(end_date))
            stmt = stmt.order_by(StockDaily.trade_date)
            result = await session.execute(stmt)
            rows = result.scalars().all()
            if rows:
                df_cached = pd.DataFrame({
                    "date": [r.trade_date.isoformat() for r in rows],
                    "open": [r.open for r in rows],
                    "high": [r.high for r in rows],
                    "low": [r.low for r in rows],
                    "close": [r.close for r in rows],
                    "volume": [r.volume for r in rows],
                })
                df_cached = df_cached.drop_duplicates(subset=['date'], keep='last').reset_index(drop=True)
                return df_cached

    # 2. Fetch from mootdx TCP
    client = _get_client()
    try:
        df = client.bars(symbol=stock_code, frequency=category, offset=250)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"通达信数据源不可用 (K线 {stock_code}): {e}",
        )

    if df is None or df.empty:
        raise HTTPException(
            status_code=404,
            detail=f"未找到 {stock_code} 的K线数据，请确认代码是否正确（如：000001 平安银行）",
        )

    # 3. Normalize fields from mootdx format
    #    mootdx bars() columns: open, close, high, low, vol, amount, datetime, ...
    #    Daily/weekly/monthly → date only (YYYY-MM-DD)
    #    Minute-level → keep full datetime (YYYY-MM-DD HH:MM:SS) for chart time axis
    is_intraday = period in ("1m", "5m", "15m", "30m", "60m")
    if is_intraday:
        df["trade_date"] = pd.to_datetime(df["datetime"])
    else:
        df["trade_date"] = pd.to_datetime(df["datetime"]).dt.date

    # 4. Write back to DB cache (daily only — minute data not persisted)
    if period == "daily":
        async with async_session_factory() as session:
            for _, row in df.iterrows():
                td = row["trade_date"]
                existing = await session.execute(
                    select(StockDaily).where(
                        StockDaily.stock_code == stock_code,
                        StockDaily.trade_date == td,
                    )
                )
                if existing.scalar_one_or_none():
                    continue
                session.add(StockDaily(
                    stock_code=stock_code,
                    stock_name="",
                    trade_date=td,
                    open=float(row["open"]),
                    high=float(row["high"]),
                    low=float(row["low"]),
                    close=float(row["close"]),
                    volume=int(row["vol"]),
                    amount=float(row["amount"]),
                ))
            await session.commit()

    # 5. Build result
    out = pd.DataFrame({
        "date": df["trade_date"].astype(str).tolist(),
        "open": df["open"].astype(float).tolist(),
        "high": df["high"].astype(float).tolist(),
        "low": df["low"].astype(float).tolist(),
        "close": df["close"].astype(float).tolist(),
        "volume": df["vol"].astype(int).tolist(),
    })
    if start_date:
        out = out[out["date"] >= start_date]
    if end_date:
        out = out[out["date"] <= end_date]
    out = out.drop_duplicates(subset=['date'], keep='last').reset_index(drop=True)
    return out


async def search_stocks(query: str = "") -> list:
    """Search A-shares by code or name.

    Loads full A-share list from mootdx (cached 24h), filters client-side.
    Raises HTTPException if data source is unavailable and cache is cold.
    """
    if not query or len(query) < 1:
        return []

    stocks = _load_stock_list()
    if not stocks:
        raise HTTPException(
            status_code=502,
            detail="通达信数据源不可用：无法加载A股列表，请稍后重试",
        )

    q = query.strip().lower()
    matched = [s for s in stocks if q in s["code"] or q in s["name"].lower()]
    return matched[:20]


async def get_realtime(stock_code: str) -> dict:
    """Get real-time quote via mootdx TCP."""
    client = _get_client()
    try:
        quotes = client.quotes(symbol=[stock_code])
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"通达信数据源不可用 (实时行情 {stock_code}): {e}",
        )

    if quotes is None or quotes.empty:
        raise HTTPException(
            status_code=404,
            detail=f"未获取到 {stock_code} 的实时行情",
        )

    row = quotes.iloc[0]
    return {
        "code": stock_code,
        "price": float(row["price"]),
        "open": float(row["open"]),
        "high": float(row["high"]),
        "low": float(row["low"]),
        "last_close": float(row["last_close"]),
        "volume": int(row["vol"]),
        "amount": float(row["amount"]),
    }
