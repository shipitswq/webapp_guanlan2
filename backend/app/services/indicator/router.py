from fastapi import APIRouter
from app.services.market.data_source import fetch_kline
from app.services.indicator.compute import compute
router = APIRouter(prefix='/api/v1/stocks', tags=['indicators'])

@router.get('/{code}/indicators')
async def get_indicators(code: str, types: str = 'MA', period: str = 'daily', start: str = '', end: str = ''):
    df = await fetch_kline(code, start, end, period)
    if df.empty:
        return {'code': code, 'indicators': []}

    type_list = [t.strip() for t in types.split(',')]
    indicators = []
    for t in type_list:
        ut = t.upper()
        if ut == 'MA':
            indicators.append(compute('MA', df, windows=[5, 10, 20, 60]))
        elif ut == 'MACD':
            indicators.append(compute('MACD', df))
        elif ut == 'KDJ':
            indicators.append(compute('KDJ', df))
        elif ut == 'RSI':
            indicators.append(compute('RSI', df, window=14))
        elif ut in ('BOLL', 'BOLLINGER'):
            indicators.append(compute('BOLL', df))
    return {'code': code, 'dates': df.get('date', []).tolist(), 'indicators': indicators}


