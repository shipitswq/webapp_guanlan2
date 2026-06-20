import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime
from app.core.database import Base


class BacktestResult(Base):
    __tablename__ = "backtest_results"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    strategy_name = Column(String(100), nullable=False)
    stock_code = Column(String(10), nullable=False)
    start_date = Column(String(10), nullable=False)
    end_date = Column(String(10), nullable=False)
    params = Column(Text, default="{}")
    total_return = Column(Float, default=0.0)
    annual_return = Column(Float, default=0.0)
    max_drawdown = Column(Float, default=0.0)
    sharpe_ratio = Column(Float, default=0.0)
    trade_count = Column(Integer, default=0)
    equity_curve = Column(Text, default="[]")
    trades = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
