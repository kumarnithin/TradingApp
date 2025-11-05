"""
Main FastAPI Application - Phase 0.5 Modified (Fixed for your structure)
Properly registers all routers and handles all endpoints
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import os
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Trading Automation API",
    description="TradingView to IB Automation Platform",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== IMPORT & INCLUDE ROUTERS ====================

logger.info("📦 Loading routers...")

try:
    # Import routers from v1 (only the ones that exist)
    from app.routes.api.v1 import signals, alerts, accounts, portfolio
    
    # Include routers with proper prefix
    app.include_router(accounts.router, prefix="/api/v1/accounts", tags=["Accounts"])
    app.include_router(signals.router, prefix="/api/v1/signals", tags=["Signals"])
    app.include_router(alerts.router, prefix="/api/v1/alerts", tags=["Alerts"])
    app.include_router(portfolio.router, prefix="/api/v1/portfolio", tags=["Portfolio"])

    
    logger.info("✅ All routers registered successfully")
    logger.info("   - Accounts router: /api/v1/accounts/*")
    logger.info("   - Signals router: /api/v1/signals/*")
    logger.info("   - Alerts router: /api/v1/alerts/*")
    logger.info("   - portfolio router: /api/v1/portfolio/*")
    
except Exception as e:
    logger.error(f"❌ Error importing routers: {str(e)}")
    logger.error(f"   Make sure your route files are in: /backend/app/routes/api/v1/")
    raise

# ==================== ROOT ENDPOINTS ====================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "status": "success",
        "message": "Trading Automation API is running",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "accounts": "/api/v1/accounts/list",
            "signals": "/api/v1/signals/list",
            "alerts": "/api/v1/alerts/list"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    from datetime import datetime
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "Trading Automation API"
    }

# ==================== STARTUP/SHUTDOWN EVENTS ====================

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Trading Automation API startup")
    logger.info("   Backend running on http://127.0.0.1:8000")
    logger.info("   Docs available at http://127.0.0.1:8000/docs")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("🛑 Trading Automation API shutdown")

# ==================== ERROR HANDLERS ====================

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"❌ Unhandled error: {str(exc)}")
    return {
        "status": "error",
        "detail": str(exc)
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
