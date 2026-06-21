import datetime
import akshare as ak
import pandas as pd
import time

# Simple in-memory cache for stock search
_search_cache = {"data": None, "timestamp": 0, "ttl": 300}  # 5 minutes
from sqlalchemy import select
from app.core.database import async_session_factory
from app.models.stock import StockDaily

async def fetch_kline(stock_code: str, start_date: str = '', end_date: str = '', period: str = 'daily') -> pd.DataFrame:
    # Try DB cache first
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
            data = {
                'date': [r.trade_date.isoformat() for r in rows],
                'open': [r.open for r in rows],
                'high': [r.high for r in rows],
                'low': [r.low for r in rows],
                'close': [r.close for r in rows],
                'volume': [r.volume for r in rows],
            }
            return pd.DataFrame(data)
    # Fall back to akshare
    try:
        df = ak.stock_zh_a_hist(symbol=stock_code, period=period, start_date=start_date or '20000101', end_date=end_date or datetime.date.today().strftime('%Y%m%d'), adjust='qfq')
    except Exception:
        return pd.DataFrame()
    if df.empty:
        return pd.DataFrame()
    # Cache to DB
    async with async_session_factory() as session:
        for _, row in df.iterrows():
            existing = await session.execute(select(StockDaily).where(StockDaily.stock_code == stock_code, StockDaily.trade_date == row['日期']))
            if not existing.scalar_one_or_none():
                daily = StockDaily(stock_code=stock_code, stock_name=row.get('名称', ''), trade_date=row['日期'], open=float(row['开盘']), high=float(row['最高']), low=float(row['最低']), close=float(row['收盘']), volume=int(row.get('成交量', 0)), amount=float(row.get('成交额', 0.0)))
                session.add(daily)
        await session.commit()
    # Normalize column names to English for consistent downstream access
    df = df.rename(columns={'日期': 'date', '开盘': 'open', '最高': 'high', '最低': 'low', '收盘': 'close', '成交量': 'volume', '成交额': 'amount', '名称': 'stock_name'})
    return df

async def search_stocks(query: str) -> list:
    try:
        df = ak.stock_zh_a_spot_em()
        mask = df['代码'].str.contains(query, case=False) | df['名称'].str.contains(query, case=False)
        result = df[mask].head(20)
        return [{'code': row['代码'], 'name': row['名称']} for _, row in result.iterrows()]
    except Exception:
        return []

async def get_realtime(stock_code: str) -> dict:
    try:
        df = ak.stock_zh_a_spot_em()
        row = df[df['代码'] == stock_code]
        if not row.empty:
            r = row.iloc[0]
            return {'code': r['代码'], 'name': r['名称'], 'price': float(r['最新价']), 'change_pct': float(r.get('涨跌幅', 0)), 'volume': int(r.get('成交量', 0))}
    except Exception:
        pass
    return {}


