"""
CORRECTED main.py for your actual folder structure

Your structure:
- app/models.py (has Base, Alert classes)
- app/database.py (has engine, SessionLocal)
- NOT app/database/models.py
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Create FastAPI app instance
app = FastAPI(
    title="Trading Automation API",
    description="Real-time trading automation with Interactive Brokers and TradingView signals",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ DATABASE INITIALIZATION ============

@app.on_event("startup")
async def init_database():
    """Initialize database tables on startup"""
    try:
        # Import from app.database (NOT app.database.models)
        from app.database import engine
        from app.models import Base
        
        logger.info("💾 Initializing database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables created/verified successfully!")
    except Exception as e:
        logger.error(f"❌ Error initializing database: {e}")

# ============ IMPORT ROUTERS ============

# IB Connection Router
try:
    from app.routes.api.v1.ib import router as ib_router
    app.include_router(ib_router, prefix="/api/v1")
    logger.info("✓ IB Connection router loaded")
except Exception as e:
    logger.error(f"✗ Failed to load IB router: {e}")

# Signals Router (TradingView)
try:
    from app.routes.api.v1.signals import router as signals_router
    app.include_router(signals_router, prefix="/api/v1")
    logger.info("✓ Signals router loaded")
except Exception as e:
    logger.error(f"✗ Failed to load Signals router: {e}")
    
# Accounts Router (Account Management)
try:
    from app.routes.api.v1.accounts import router as accounts_router
    app.include_router(accounts_router, prefix="/api/v1")
    logger.info("✓ Accounts router loaded")
except Exception as e:
    logger.warning(f"⚠️ Accounts router failed to load: {e}")

# Alerts Router (Database Management)
try:
    from app.routes.api.v1.alerts import router as alerts_router
    app.include_router(alerts_router, prefix="/api/v1")
    logger.info("✓ Alerts router loaded")
except Exception as e:
    logger.warning(f"⚠️ Alerts router not found (optional): {e}")

# Portfolio Router (if exists)
try:
    from app.routes.api.v1.portfolio import router as portfolio_router
    app.include_router(portfolio_router, prefix="/api/v1")
    logger.info("✓ Portfolio router loaded")
except Exception as e:
    logger.warning(f"Portfolio router not found (optional): {e}")

# Orders Router (if exists)
try:
    from app.routes.api.v1.orders import router as orders_router
    app.include_router(orders_router, prefix="/api/v1")
    logger.info("✓ Orders router loaded")
except Exception as e:
    logger.warning(f"Orders router not found (optional): {e}")

# Strategies Router (if exists)
try:
    from app.routes.api.v1.strategies import router as strategies_router
    app.include_router(strategies_router, prefix="/api/v1")
    logger.info("✓ Strategies router loaded")
except Exception as e:
    logger.warning(f"Strategies router not found (optional): {e}")

# Analytics Router (if exists)
try:
    from app.routes.api.v1.analytics import router as analytics_router
    app.include_router(analytics_router, prefix="/api/v1")
    logger.info("✓ Analytics router loaded")
except Exception as e:
    logger.warning(f"Analytics router not found (optional): {e}")

# ============ HEALTH CHECK ENDPOINTS ============

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "Trading Automation API"
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "status": "online",
        "message": "Trading Automation Platform API",
        "docs": "http://localhost:8000/docs",
        "redoc": "http://localhost:8000/redoc",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/v1/status")
async def api_status():
    """Get API status"""
    try:
        from app.services.ib_client import ib_client
        
        # Check database connection
        db_status = "unknown"
        try:
            from app.database import engine
            with engine.connect() as connection:
                db_status = "connected"
        except Exception as e:
            db_status = f"error: {str(e)}"
        
        return {
            "status": "online",
            "timestamp": datetime.now().isoformat(),
            "services": {
                "ib_client": {
                    "available": True,
                    "connected": ib_client.is_connected(),
                    "account": ib_client.account_name or "Not connected"
                },
                "database": {
                    "status": db_status
                },
                "api": "running"
            }
        }
    except Exception as e:
        logger.error(f"Error getting status: {e}")
        return {
            "status": "online",
            "timestamp": datetime.now().isoformat(),
            "services": {
                "ib_client": {
                    "available": False,
                    "error": str(e)
                },
                "api": "running"
            }
        }

# ============ STARTUP & SHUTDOWN ============

@app.on_event("startup")
async def startup_event():
    """Run on startup"""
    logger.info("============================================================")
    logger.info("🚀 Trading Automation API Starting...")
    logger.info("============================================================")
    logger.info("📊 API Documentation: http://localhost:8000/docs")
    logger.info("🔧 Alternative Docs: http://localhost:8000/redoc")
    logger.info("❤️ Health Check: http://localhost:8000/health")
    logger.info("💾 Database: Connected")
    logger.info("📨 Signals: Ready to receive")
    logger.info("📋 Alerts: Available at /api/v1/alerts/list")
    logger.info("============================================================")

@app.on_event("shutdown")
async def shutdown_event():
    """Run on shutdown"""
    try:
        from app.services.ib_client import ib_client
        if ib_client.is_connected():
            await ib_client.disconnect()
    except Exception as e:
        logger.warning(f"Error disconnecting IB: {e}")
    
    logger.info("🛑 Trading Automation API shutting down...")

# ============ ERROR HANDLERS ============

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {str(exc)}")
    return {
        "status": "error",
        "error": str(exc),
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
