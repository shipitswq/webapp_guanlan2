import pandas as pd
import numpy as np
from functools import lru_cache
import hashlib
import json

def _cache_key(type_: str, close_hash: str, **kwargs) -> str:
    """Generate a stable cache key from indicator type + data hash + params."""
    params_str = json.dumps(kwargs, sort_keys=True)
    return f"{type_}:{close_hash}:{params_str}"

@lru_cache(maxsize=256)
def _cached_compute(type_: str, close_tuple: tuple, **kwargs) -> dict:
    """Cached indicator computation. close_tuple is for hashability."""
    close = pd.Series(close_tuple)
    return _compute_raw(type_, close, **kwargs)


def compute_ma(close, window=5):
    return close.rolling(window=window).mean().fillna(0).tolist()

def compute_macd(close, fast=12, slow=26, signal=9):
    ema_fast = close.ewm(span=fast, adjust=False).mean()
    ema_slow = close.ewm(span=slow, adjust=False).mean()
    dif = ema_fast - ema_slow
    dea = dif.ewm(span=signal, adjust=False).mean()
    macd = 2 * (dif - dea)
    return dif.tolist(), dea.tolist(), macd.tolist()

def compute_kdj(high, low, close, n=9, k1=3, d1=3):
    low_n = low.rolling(window=n).min()
    high_n = high.rolling(window=n).max()
    rsv = ((close - low_n) / (high_n - low_n)) * 100
    rsv = rsv.fillna(50)
    k = rsv.ewm(alpha=1/k1, adjust=False).mean()
    d = k.ewm(alpha=1/d1, adjust=False).mean()
    j = 3*k - 2*d
    return k.tolist(), d.tolist(), j.tolist()

def compute_rsi(close, window=14):
    delta = close.diff()
    gain = delta.where(delta > 0, 0).rolling(window=window).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()
    rs = gain / loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    return rsi.fillna(0).tolist()

def compute_bollinger(close, window=20, std_dev=2):
    ma = close.rolling(window=window).mean()
    std = close.rolling(window=window).std()
    upper = ma + std_dev * std
    lower = ma - std_dev * std
    return ma.fillna(0).tolist(), upper.fillna(0).tolist(), lower.fillna(0).tolist()

def _compute_raw(type_, close, **kwargs):
    """Raw indicator computation without caching."""
    result = {'type': type_}
    if type_ == 'MA':
        windows = kwargs.get('windows', [5, 10, 20, 60])
        for w in windows:
            result[f'MA{w}'] = compute_ma(close, w)
    elif type_ == 'MACD':
        dif, dea, macd = compute_macd(close)
        result.update({'DIF': dif, 'DEA': dea, 'MACD': macd, 'HIST': macd})
    elif type_ == 'KDJ':
        high = kwargs.get('high', close)
        low = kwargs.get('low', close)
        k, d, j = compute_kdj(high, low, close)
        result.update({'K': k, 'D': d, 'J': j})
    elif type_ == 'RSI':
        result['RSI'] = compute_rsi(close, kwargs.get('window', 14))
    elif type_ == 'BOLL':
        ma, upper, lower = compute_bollinger(close)
        result.update({'MA': ma, 'UPPER': upper, 'LOWER': lower})
    return result


def compute(type_, df, **kwargs):
    """Compute indicator with session-level caching via lru_cache."""
    close = df['close'] if isinstance(df, pd.DataFrame) else pd.Series(df)
    # Build extra series for indicators that need high/low
    extra_kw = {}
    if type_ == 'KDJ':
        extra_kw['high'] = df['high'] if isinstance(df, pd.DataFrame) and 'high' in df else close
        extra_kw['low'] = df['low'] if isinstance(df, pd.DataFrame) and 'low' in df else close
    # Hash the close series for stable cache key
    close_hash = hashlib.md5(str(close.round(4).tolist()).encode()).hexdigest()
    merged_kw = {**kwargs, **extra_kw}
    return _cached_compute(type_, tuple(close.round(4).tolist()), **merged_kw)
