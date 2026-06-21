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
        'dates': df['date'].astype(str).tolist(),
        'open': df['open'].astype(float).tolist(),
        'high': df['high'].astype(float).tolist(),
        'low': df['low'].astype(float).tolist(),
        'close': df['close'].astype(float).tolist(),
        'volume': df.get('volume', pd.Series([0]*len(df))).astype(int).tolist(),
    }

@router.get('/{code}/realtime')
async def realtime(code: str):
    return await get_realtime(code)

