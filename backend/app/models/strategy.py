import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from app.core.database import Base


class BacktestStrategy(Base):
    __tablename__ = "backtest_strategies"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    name = Column(String(100), nullable=False)
    strategy_type = Column(String(50), nullable=False)  # ma_cross, macd, bollinger
    params = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
