from fastapi import APIRouter
import pandas as pd
from app.services.market.data_source import fetch_kline, search_stocks, get_realtime
router = APIRouter(prefix='/api/v1/stocks', tags=['market'])

@router.get('/search')
async def search(q: str = ''):
    items = await search_stocks(q)
    return {'items': items}

@router.get('/{code}/kline')
async def kline(code: str, period: str = 'daily', start: str = '', end: str = ''):
    df = await fetch_kline(code, start, end, period)
    if df.empty:
        return {'dates': [], 'open': [], 'high': [], 'low': [], 'close': [], 'volume': []}
    return {
        'dates': df['日期'].astype(str).tolist(),
        'open': df['开盘'].astype(float).tolist(),
        'high': df['最高'].astype(float).tolist(),
        'low': df['最低'].astype(float).tolist(),
        'close': df['收盘'].astype(float).tolist(),
        'volume': df.get('成交量', pd.Series([0]*len(df))).astype(int).tolist(),
    }

@router.get('/{code}/realtime')
async def realtime(code: str):
    return await get_realtime(code)
