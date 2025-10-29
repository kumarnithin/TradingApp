"""
Main FastAPI Application - WORKING VERSION
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Trading Automation API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ Health Check ============
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/")
async def root():
    return {"message": "Trading API running"}

# ============ Import Routers ============
logger.info("=" * 60)
logger.info("Loading routers...")
logger.info("=" * 60)

try:
    from app.routes.api.v1.ib import router as ib_router
    app.include_router(ib_router, prefix="/api/v1")
    logger.info("✓ IB router loaded at /api/v1/ib")
except Exception as e:
    logger.error(f"✗ Failed to load IB router: {e}")

try:
    from app.routes.api.v1.portfolio import router as portfolio_router
    app.include_router(portfolio_router, prefix="/api/v1")
    logger.info("✓ Portfolio router loaded at /api/v1/portfolio")
except Exception as e:
    logger.error(f"✗ Failed to load Portfolio router: {e}")

try:
    from app.routes.api.v1.orders import router as orders_router
    app.include_router(orders_router, prefix="/api/v1")
    logger.info("✓ Orders router loaded at /api/v1/orders")
except Exception as e:
    logger.error(f"✗ Failed to load Orders router: {e}")

try:
    from app.routes.api.v1.signals import router as signals_router
    app.include_router(signals_router, prefix="/api/v1")
    logger.info("✓ Signals router loaded at /api/v1/signals")
except Exception as e:
    logger.error(f"✗ Failed to load Signals router: {e}")

try:
    from app.routes.api.v1.strategies import router as strategies_router
    app.include_router(strategies_router, prefix="/api/v1")
    logger.info("✓ Strategies router loaded at /api/v1/strategies")
except Exception as e:
    logger.error(f"✗ Failed to load Strategies router: {e}")

try:
    from app.routes.api.v1.analytics import router as analytics_router
    app.include_router(analytics_router, prefix="/api/v1")
    logger.info("✓ Analytics router loaded at /api/v1/analytics")
except Exception as e:
    logger.error(f"✗ Failed to load Analytics router: {e}")

try:
    from app.routes.api.v1.alerts import router as alerts_router
    app.include_router(alerts_router, prefix="/api/v1")
    logger.info("✓ Alerts router loaded at /api/v1/alerts")
except Exception as e:
    logger.error(f"✗ Failed to load Alerts router: {e}")

logger.info("=" * 60)
logger.info("🚀 Trading Automation API Ready!")
logger.info("📊 Docs: http://localhost:8000/docs")
logger.info("=" * 60)
