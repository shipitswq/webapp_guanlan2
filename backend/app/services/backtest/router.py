from fastapi import APIRouter, Depends
from pydantic import BaseModel
import json
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.market.data_source import fetch_kline
from app.services.backtest.engine import BacktestEngine
from app.models.backtest import BacktestResult
from app.models.strategy import BacktestStrategy

router = APIRouter(prefix="/api/v1/backtest", tags=["backtest"])

class RunReq(BaseModel):
    stock_code: str; start_date: str = ""; end_date: str = ""
    strategy: str = "ma_cross"; params: dict = {}

@router.post("/run")
async def run_backtest(req: RunReq, db: AsyncSession = Depends(get_db)):
    df = await fetch_kline(req.stock_code, req.start_date, req.end_date)
    if df.empty: return {"error": "No data"}
    # fetch_kline now returns English column names, no rename needed
    eng = BacktestEngine(df, req.strategy, req.params)
    result = eng.run()
    br = BacktestResult(strategy_name=req.strategy, stock_code=req.stock_code, start_date=req.start_date, end_date=req.end_date, params=json.dumps(req.params), total_return=result["total_return"], annual_return=result["annual_return"], max_drawdown=result["max_drawdown"], sharpe_ratio=result["sharpe_ratio"], trade_count=result["trade_count"], equity_curve=json.dumps(result["equity_curve"]), trades=json.dumps(result["trades"]))
    db.add(br); await db.commit(); await db.refresh(br)
    result["id"] = br.id
    return result

@router.get("/results/{result_id}")
async def get_result(result_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BacktestResult).where(BacktestResult.id == result_id))
    r = result.scalar_one_or_none()
    if not r: return {"error": "not found"}
    return {"id": r.id, "strategy_name": r.strategy_name, "stock_code": r.stock_code, "params": json.loads(r.params or "{}"), "total_return": r.total_return, "annual_return": r.annual_return, "max_drawdown": r.max_drawdown, "sharpe_ratio": r.sharpe_ratio, "trade_count": r.trade_count, "equity_curve": json.loads(r.equity_curve or "[]"), "trades": json.loads(r.trades or "[]")}

class SaveReq(BaseModel):
    name: str; strategy_type: str = "ma_cross"; params: dict = {}

@router.post("/strategies")
async def save_strategy(req: SaveReq, db: AsyncSession = Depends(get_db)):
    s = BacktestStrategy(name=req.name, strategy_type=req.strategy_type, params=json.dumps(req.params))
    db.add(s); await db.commit(); await db.refresh(s)
    return {"id": s.id, "name": s.name}

@router.get("/strategies")
async def list_strategies(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BacktestStrategy).order_by(BacktestStrategy.created_at.desc()))
    return {"items": [dict(id=s.id, name=s.name, strategy_type=s.strategy_type, params=json.loads(s.params or "{}")) for s in result.scalars().all()]}

