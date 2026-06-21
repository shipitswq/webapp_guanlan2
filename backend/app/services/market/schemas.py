from pydantic import BaseModel
from typing import List, Optional

class StockInfo(BaseModel):
    code: str
    name: str

class KlineResponse(BaseModel):
    dates: List[str] = []
    open: List[float] = []
    high: List[float] = []
    low: List[float] = []
    close: List[float] = []
    volume: List[int] = []

class RealtimeQuote(BaseModel):
    code: str = ""
    name: str = ""
    price: float = 0.0
    change_pct: float = 0.0
    volume: int = 0
