import os, asyncio
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool
from app.core.database import Base, get_db
from app.main import app

TEST_DB = os.path.join(os.path.dirname(__file__), "test_guanlan.db")


@pytest.fixture(autouse=True)
def setup_db():
    engine = create_async_engine(f"sqlite+aiosqlite:///{TEST_DB}", echo=False, poolclass=NullPool)

    async def init():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    asyncio.run(init())

    async def override_get_db():
        s = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)()
        try:
            yield s
        finally:
            await s.close()

    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(app)
