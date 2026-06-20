import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from app.core.database import Base


class TradeOrder(Base):
    __tablename__ = "trade_orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    stock_code = Column(String(10), nullable=False)
    direction = Column(String(4), nullable=False)  # buy / sell
    order_type = Column(String(10), nullable=False)  # market / limit
    price = Column(Float, nullable=False)
    quantity = Column(Integer, nullable=False)
    filled_price = Column(Float, default=0.0)
    status = Column(String(10), default="pending")  # pending / filled / cancelled
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    filled_at = Column(DateTime, nullable=True)
