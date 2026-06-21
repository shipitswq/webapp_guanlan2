from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.services.knowledge.router import router as knowledge_router
from app.services.market.router import router as market_router
from app.services.indicator.router import router as indicator_router
from app.services.backtest.router import router as backtest_router
from app.services.trading.router import router as trading_router
from app.services.user.router import router as user_router


@asynccontextmanager
async def lifespan(app):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(title=settings.app_name, version=settings.app_version, lifespan=lifespan)

app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://localhost:3000"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(knowledge_router)
app.include_router(market_router)
app.include_router(indicator_router)
app.include_router(backtest_router)
app.include_router(trading_router)
app.include_router(user_router)


@app.get("/api/v1/health")
async def health():
    return {"status": "ok", "version": settings.app_version}


import os as _os
_spa_dist = _os.environ.get("FRONTEND_DIST")
if _spa_dist and _os.path.isdir(_spa_dist):
    app.mount("/assets", StaticFiles(directory=_os.path.join(_spa_dist, "assets")), name="assets")


@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    import os as _os2
    d = _os2.environ.get("FRONTEND_DIST")
    if d and _os2.path.isdir(d):
        idx = _os2.path.join(d, "index.html")
        if _os2.path.isfile(idx):
            return FileResponse(idx, media_type="text/html")
    return JSONResponse({"error": "not found"}, status_code=404)