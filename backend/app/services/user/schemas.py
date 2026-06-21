from pydantic import BaseModel
from typing import Optional

class AuthReq(BaseModel):
    username: str
    password: str

class TokenOut(BaseModel):
    token: str
    user_id: int

class WatchlistReq(BaseModel):
    stock_code: str

class WatchlistOut(BaseModel):
    id: int
    stock_code: str

class ProgressOut(BaseModel):
    article_id: int
    is_read: bool = False
    read_at: Optional[str] = None
