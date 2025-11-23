"""
🚀 MODIFIED MAIN.PY - Backend Entry Point
Location: /backend/app/main.py

✅ CHANGES:
- Added route imports for all API endpoints
- Registered all routers with FastAPI
- Added CORS middleware for frontend communication
- Added health check endpoint
- Added logging

✅ NO BREAKING CHANGES:
- All existing functionality preserved
- All existing routes still work
- Database connections unchanged
- Configuration preserved
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from datetime import datetime
from app.logging_config import setup_logging

# Configure centralized logging
setup_logging("INFO")
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Trading App API",
    description="TradingView + Interactive Brokers Automation",
    version="1.0.0"
)

# ✅ ADD CORS MIDDLEWARE - Allows frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ IMPORT ALL ROUTE MODULES - Registers API endpoints
try:
    from app.routes.api.v1 import (
        accounts,
        signals,
        trades,
        ib,
        portfolio,
    )
    logger.info("✅ All route modules imported successfully")
except ImportError as e:
    logger.error(f"❌ Error importing routes: {e}")
    raise

# ✅ REGISTER ALL ROUTERS - Makes endpoints available
try:
    app.include_router(accounts.router, prefix="/api/v1/accounts", tags=["Accounts"])
    logger.info("✅ Accounts router registered")
    
    app.include_router(signals.router, prefix="/api/v1/signals", tags=["Signals"])
    logger.info("✅ Signals router registered")
    
    app.include_router(trades.router, prefix="/api/v1/trades", tags=["Trades"])
    logger.info("✅ Trades router registered")
    
    app.include_router(ib.router, prefix="/api/v1/ib", tags=["IB Connection"])
    logger.info("✅ IB router registered")
    
    app.include_router(portfolio.router, prefix="/api/v1/portfolio", tags=["Portfolio"])
    logger.info("✅ Portfolio router registered")
    
    logger.info("✅ ALL ROUTERS REGISTERED SUCCESSFULLY")
except Exception as e:
    logger.error(f"❌ Error registering routers: {e}")
    raise

# ✅ HEALTH CHECK ENDPOINT
@app.get("/health")
async def health_check():
    """Health check endpoint to verify API is running"""
    return {
        "status": "ok",
        "message": "Trading App API is running",
        "timestamp": datetime.utcnow().isoformat()
    }

# ✅ ROOT ENDPOINT
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "name": "Trading App API",
        "version": "1.0.0",
        "description": "TradingView + Interactive Brokers Automation",
        "docs": "/docs",
        "health": "/health"
    }

# ✅ STARTUP EVENT
@app.on_event("startup")
async def startup_event():
    """Called when app starts"""
    logger.info("🚀 Trading App API starting up...")
    logger.info(f"✅ API started at {datetime.utcnow()}")

# ✅ SHUTDOWN EVENT
@app.on_event("shutdown")
async def shutdown_event():
    """Called when app shuts down"""
    logger.info(f"🛑 Trading App API shutting down at {datetime.utcnow()}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")