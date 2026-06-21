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





import random
import datetime as _dt

def _generate_mock_kline(code: str, start_date: str = '', end_date: str = '', period: str = 'daily') -> pd.DataFrame:
    """Generate mock A-share kline data when akshare is unavailable."""
    rows = 200
    sd = _dt.date.today() - _dt.timedelta(days=rows)
    if start_date:
        try: sd = _dt.date.fromisoformat(start_date)
        except: pass
    base_price = random.uniform(8, 80)
    data = {'date': [], 'open': [], 'high': [], 'low': [], 'close': [], 'volume': []}
    price = base_price
    for i in range(rows):
        d = sd + _dt.timedelta(days=i)
        if d.weekday() >= 5: continue
        change_pct = random.uniform(-0.05, 0.05)
        open_p = price * (1 + random.uniform(-0.01, 0.01))
        close = open_p * (1 + change_pct)
        high = max(open_p, close) * (1 + random.uniform(0, 0.02))
        low = min(open_p, close) * (1 - random.uniform(0, 0.02))
        vol = int(random.uniform(50000, 5000000))
        data['date'].append(d.isoformat())
        data['open'].append(round(open_p, 2))
        data['high'].append(round(high, 2))
        data['low'].append(round(low, 2))
        data['close'].append(round(close, 2))
        data['volume'].append(vol)
        price = close
    df = pd.DataFrame(data)
    if end_date:
        try: df = df[df['date'] <= end_date]
        except: pass
    return df

def _generate_mock_stocks(query: str = '') -> list:
    """Generate mock stock list when akshare is unavailable."""
    stocks = [
        {'code': '000001', 'name': '平安银行'}, {'code': '000002', 'name': '万科A'},
        {'code': '000333', 'name': '美的集团'}, {'code': '000651', 'name': '格力电器'},
        {'code': '000858', 'name': '五粮液'}, {'code': '002415', 'name': '海康威视'},
        {'code': '300750', 'name': '宁德时代'}, {'code': '600519', 'name': '贵州茅台'},
        {'code': '600036', 'name': '招商银行'}, {'code': '601318', 'name': '中国平安'},
        {'code': '600276', 'name': '恒瑞医药'}, {'code': '600887', 'name': '伊利股份'},
        {'code': '000725', 'name': '京东方A'}, {'code': '002475', 'name': '立讯精密'},
        {'code': '300059', 'name': '东方财富'}, {'code': '600030', 'name': '中信证券'},
        {'code': '601166', 'name': '兴业银行'}, {'code': '603259', 'name': '药明康德'},
        {'code': '000568', 'name': '泸州老窖'}, {'code': '002714', 'name': '牧原股份'},
    ]
    if query:
        stocks = [s for s in stocks if query in s['code'] or query in s['name']]
    return stocks[:20]

