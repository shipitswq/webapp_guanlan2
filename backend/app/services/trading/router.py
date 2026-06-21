from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.user import User
from app.models.account import Account
from app.models.position import Position
from app.models.order import TradeOrder
from app.services.user.auth import get_default_user
from app.services.market.data_source import get_realtime
from datetime import datetime

router = APIRouter(prefix="/api/v1/trading", tags=["trading"])

class OrderReq(BaseModel):
    stock_code: str; direction: str; order_type: str = "market"; price: float = 0; quantity: int = 0

async def _get_or_create_account(user_id, db):
    result = await db.execute(select(Account).where(Account.user_id == user_id))
    acc = result.scalar_one_or_none()
    if not acc:
        acc = Account(user_id=user_id, cash=100000.0); db.add(acc); await db.commit(); await db.refresh(acc)
    return acc

@router.post("/orders")
async def place_order(req: OrderReq, user: User = Depends(get_default_user), db: AsyncSession = Depends(get_db)):
    acc = await _get_or_create_account(user.id, db)
    qt = await get_realtime(req.stock_code)
    market_price = qt.get("price", 0)
    if market_price <= 0:
        return {"error": "Cannot get market price"}

    # Determine fill price based on order type
    fill_price = 0.0
    if req.order_type == "market":
        fill_price = market_price
    elif req.order_type == "limit":
        # Limit buy: only fill if market_price <= limit_price
        # Limit sell: only fill if market_price >= limit_price
        if req.price <= 0:
            return {"error": "Limit order requires a valid price"}
        if req.direction == "buy" and market_price <= req.price:
            fill_price = market_price
        elif req.direction == "sell" and market_price >= req.price:
            fill_price = market_price
        else:
            # Price condition not met — record unfilled order
            order = TradeOrder(
                user_id=user.id, stock_code=req.stock_code, direction=req.direction,
                order_type=req.order_type, price=req.price, quantity=req.quantity,
                filled_price=0, status="pending", filled_at=None,
            )
            db.add(order); await db.commit(); await db.refresh(order)
            return {"order_id": order.id, "status": "pending", "message": "Waiting for price condition"}
    else:
        return {"error": f"Unknown order type: {req.order_type}"}

    total_cost = fill_price * req.quantity
    if req.direction == "buy":
        if acc.cash < total_cost: raise HTTPException(400, "Insufficient funds")
        acc.cash -= total_cost
        result = await db.execute(select(Position).where(Position.user_id == user.id, Position.stock_code == req.stock_code))
        pos = result.scalar_one_or_none()
        if pos:
            pos.cost_price = (pos.quantity * pos.cost_price + total_cost) / (pos.quantity + req.quantity)
            pos.quantity += req.quantity
        else:
            db.add(Position(user_id=user.id, stock_code=req.stock_code, quantity=req.quantity, cost_price=fill_price))
    elif req.direction == "sell":
        result = await db.execute(select(Position).where(Position.user_id == user.id, Position.stock_code == req.stock_code))
        pos = result.scalar_one_or_none()
        if not pos or pos.quantity < req.quantity: raise HTTPException(400, "Insufficient shares")
        pos.quantity -= req.quantity; acc.cash += total_cost
        if pos.quantity == 0: await db.delete(pos)
    order = TradeOrder(user_id=user.id, stock_code=req.stock_code, direction=req.direction, order_type=req.order_type, price=req.price, quantity=req.quantity, filled_price=fill_price, status="filled", filled_at=datetime.utcnow())
    db.add(order); await db.commit(); await db.refresh(order)
    return {"order_id": order.id, "status": "filled", "filled_price": fill_price}

@router.get("/orders")
async def list_orders(user: User = Depends(get_default_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TradeOrder).where(TradeOrder.user_id == user.id).order_by(TradeOrder.created_at.desc()).limit(100))
    return {"items": [dict(id=o.id, stock_code=o.stock_code, direction=o.direction, order_type=o.order_type, price=o.price, quantity=o.quantity, filled_price=o.filled_price, status=o.status, created_at=o.created_at.isoformat() if o.created_at else "") for o in result.scalars().all()]}

@router.get("/positions")
async def get_positions(user: User = Depends(get_default_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Position).where(Position.user_id == user.id))
    items = []
    for p in result.scalars().all():
        qt = await get_realtime(p.stock_code)
        cp = qt.get("price", p.cost_price); pl = (cp - p.cost_price) * p.quantity
        items.append(dict(stock_code=p.stock_code, quantity=p.quantity, cost_price=round(p.cost_price,2), current_price=cp, float_pl=round(pl,2), float_pl_pct=round(pl/(p.cost_price*p.quantity)*100,2) if p.cost_price*p.quantity>0 else 0))
    return {"items": items}

@router.get("/account")
async def get_account(user: User = Depends(get_default_user), db: AsyncSession = Depends(get_db)):
    acc = await _get_or_create_account(user.id, db)
    result = await db.execute(select(Position).where(Position.user_id == user.id))
    pv = 0
    for p in result.scalars().all():
        qt = await get_realtime(p.stock_code); pv += qt.get("price", p.cost_price) * p.quantity
    ta = acc.cash + pv; tr = (ta / 100000 - 1) * 100
    return dict(cash=round(acc.cash,2), position_value=round(pv,2), total_assets=round(ta,2), total_return=round(tr,2))
