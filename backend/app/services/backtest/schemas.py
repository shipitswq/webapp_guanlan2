from pydantic import BaseModel
from typing import Any, Dict, List, Optional

class RunBacktestReq(BaseModel):
    stock_code: str
    start_date: str = ""
    end_date: str = ""
    strategy: str = "ma_cross"
    params: Dict[str, Any] = {}

class BacktestResultOut(BaseModel):
    id: Optional[int] = None
    total_return: float = 0.0
    annual_return: float = 0.0
    max_drawdown: float = 0.0
    sharpe_ratio: float = 0.0
    trade_count: int = 0
    equity_curve: List[Dict[str, Any]] = []
    trades: List[Dict[str, Any]] = []

class SaveStrategyReq(BaseModel):
    name: str
    strategy_type: str = "ma_cross"
    params: Dict[str, Any] = {}
