from pydantic import BaseModel
from typing import List, Optional

class OrderReq(BaseModel):
    stock_code: str
    direction: str  # buy / sell
    order_type: str = "market"  # market / limit
    price: float = 0.0
    quantity: int = 0

class PositionOut(BaseModel):
    stock_code: str
    quantity: int
    cost_price: float
    current_price: float
    float_pl: float
    float_pl_pct: float

class AccountOut(BaseModel):
    cash: float = 0.0
    position_value: float = 0.0
    total_assets: float = 0.0
    total_return: float = 0.0
