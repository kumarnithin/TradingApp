"""
Main FastAPI Application Entry Point
Trading Automation Platform - Phase 1 Backend
SIMPLIFIED VERSION - Works with app/routes/api/v1/ structure
"""

from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
from datetime import datetime
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events"""
    # Startup
    logger.info("=" * 60)
    logger.info("🚀 Trading Automation API Starting...")
    logger.info("=" * 60)
    logger.info("📊 API Documentation: http://localhost:8000/docs")
    logger.info("🔧 Alternative Docs: http://localhost:8000/redoc")
    logger.info("❤️  Health Check: http://localhost:8000/health")
    logger.info("=" * 60)
    
    yield
    
    # Shutdown
    logger.info("=" * 60)
    logger.info("🛑 Trading Automation API Shutting Down...")
    logger.info("=" * 60)

# Create FastAPI application
app = FastAPI(
    title="Trading Automation API",
    description="Professional Trading Platform with IB Integration",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# ============ CORS Configuration ============
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://192.168.1.34:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=3600
)

# ============ Health Check ============
@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

# ============ Root Endpoint ============
@app.get("/", tags=["System"])
async def root():
    """Root endpoint"""
    return {
        "name": "Trading Automation API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

# ============ Include Routers - CORRECT IMPORTS ============
try:
    from backend.app.routes.api.v1 import ib_backup02
    app.include_router(ib_backup02.router, prefix="/api/v1", tags=["IB Connection"])
    logger.info("✓ IB Connection router loaded")
except Exception as e:
    logger.warning(f"⚠ IB Connection router failed: {e}")

try:
    from app.routes.api.v1 import portfolio
    app.include_router(portfolio.router, prefix="/api/v1", tags=["Portfolio"])
    logger.info("✓ Portfolio router loaded")
except Exception as e:
    logger.warning(f"⚠ Portfolio router failed: {e}")

try:
    from app.routes.api.v1 import orders
    app.include_router(orders.router, prefix="/api/v1", tags=["Orders"])
    logger.info("✓ Orders router loaded")
except Exception as e:
    logger.warning(f"⚠ Orders router failed: {e}")

try:
    from app.routes.api.v1 import signals
    app.include_router(signals.router, prefix="/api/v1", tags=["Signals"])
    logger.info("✓ Signals router loaded")
except Exception as e:
    logger.warning(f"⚠ Signals router failed: {e}")

try:
    from app.routes.api.v1 import strategies
    app.include_router(strategies.router, prefix="/api/v1", tags=["Strategies"])
    logger.info("✓ Strategies router loaded")
except Exception as e:
    logger.warning(f"⚠ Strategies router failed: {e}")

try:
    from app.routes.api.v1 import analytics
    app.include_router(analytics.router, prefix="/api/v1", tags=["Analytics"])
    logger.info("✓ Analytics router loaded")
except Exception as e:
    logger.warning(f"⚠ Analytics router failed: {e}")

try:
    from app.routes.api.v1 import alerts
    app.include_router(alerts.router, prefix="/api/v1", tags=["Alerts"])
    logger.info("✓ Alerts router loaded")
except Exception as e:
    logger.warning(f"⚠ Alerts router failed: {e}")

# ============ API Status Endpoint ============
@app.get("/api/v1/status", tags=["System"])
async def api_status():
    """Get API status"""
    return {
        "status": "operational",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

# ============ Error Handlers ============
@app.exception_handler(404)
async def not_found_handler(request, exc):
    """Handle 404 errors"""
    return JSONResponse(
        status_code=404,
        content={"detail": "Endpoint not found", "path": str(request.url)}
    )

# ============ Main Entry Point ============
if __name__ == "__main__":
    """Run the application"""
    try:
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info"
        )
    except KeyboardInterrupt:
        logger.info("Application stopped by user")
    except Exception as e:
        logger.error(f"Application error: {e}")
        raise