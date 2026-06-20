from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.user import User
from app.models.watchlist import Watchlist
from app.models.progress import LearningProgress
from app.services.user.auth import get_password_hash, verify_password, create_access_token, get_current_user
from datetime import datetime

router = APIRouter(prefix='/api/v1', tags=['user'])

class RegisterReq(BaseModel):
    username: str
    password: str

class LoginReq(BaseModel):
    username: str
    password: str

class WatchReq(BaseModel):
    stock_code: str

@router.post('/auth/register')
async def register(req: RegisterReq, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == req.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail='Username exists')
    user = User(username=req.username, hashed_password=get_password_hash(req.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {'token': create_access_token({'sub': user.id}), 'user_id': user.id}

@router.post('/auth/login')
async def login(req: LoginReq, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == req.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail='Invalid credentials')
    return {'token': create_access_token({'sub': user.id}), 'user_id': user.id}

@router.get('/watchlist')
async def get_watchlist(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Watchlist).where(Watchlist.user_id == user.id))
    return {'items': [{'id': w.id, 'stock_code': w.stock_code} for w in result.scalars().all()]}

@router.post('/watchlist')
async def add_watchlist(req: WatchReq, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    w = Watchlist(user_id=user.id, stock_code=req.stock_code)
    db.add(w)
    await db.commit()
    await db.refresh(w)
    return {'id': w.id, 'stock_code': w.stock_code}

@router.delete('/watchlist/{stock_code}')
async def del_watchlist(stock_code: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(delete(Watchlist).where(Watchlist.user_id == user.id, Watchlist.stock_code == stock_code))
    await db.commit()
    return {'status': 'deleted'}

@router.post('/progress/{article_id}/read')
async def mark_read(article_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LearningProgress).where(LearningProgress.user_id == user.id, LearningProgress.article_id == article_id))
    prog = result.scalar_one_or_none()
    if not prog:
        prog = LearningProgress(user_id=user.id, article_id=article_id, is_read=True, read_at=datetime.utcnow())
        db.add(prog)
    else:
        prog.is_read = True
        prog.read_at = datetime.utcnow()
    await db.commit()
    return {'is_read': True}

@router.get('/progress')
async def get_progress(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LearningProgress).where(LearningProgress.user_id == user.id))
    return {'items': [{'article_id': p.article_id, 'is_read': p.is_read, 'read_at': p.read_at.isoformat() if p.read_at else ''} for p in result.scalars().all()]}
