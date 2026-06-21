from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.user import User


async def get_default_user(db: AsyncSession = Depends(get_db)):
    """Return the default shared user (id=1), creating it if it doesn't exist."""
    result = await db.execute(select(User).where(User.id == 1))
    user = result.scalar_one_or_none()
    if not user:
        user = User(id=1, username="default", hashed_password="")
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user
