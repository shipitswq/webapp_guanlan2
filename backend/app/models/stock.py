import datetime
from typing import Optional
from sqlalchemy import String, Integer, Float, Date, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class StockDaily(Base):
    __tablename__ = "stock_daily"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    stock_code: Mapped[str] = mapped_column(String(10), index=True, nullable=False)
    stock_name: Mapped[str] = mapped_column(String(50), default="")
    trade_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    open: Mapped[float] = mapped_column(Float, nullable=False)
    high: Mapped[float] = mapped_column(Float, nullable=False)
    low: Mapped[float] = mapped_column(Float, nullable=False)
    close: Mapped[float] = mapped_column(Float, nullable=False)
    volume: Mapped[int] = mapped_column(Integer, default=0)
    amount: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, default=datetime.datetime.utcnow)
