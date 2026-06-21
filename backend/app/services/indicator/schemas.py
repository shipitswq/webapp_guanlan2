from pydantic import BaseModel
from typing import Any, List, Optional

class IndicatorItem(BaseModel):
    type: str
    data: Any

class IndicatorResponse(BaseModel):
    code: str
    dates: List[str]
    indicators: List[IndicatorItem]
