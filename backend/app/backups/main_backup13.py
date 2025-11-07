"""
Main FastAPI Application - CORRECTED (Phase 0.5+)
Complete with all routers properly registered
Location: /backend/app/main.py
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
    # Import all routers
    from app.routes.api.v1 import signals, alerts, accounts, portfolio
    
    # Include routers with correct prefixes
    app.include_router(accounts.router, prefix="/api/v1/accounts", tags=["Accounts"])
    app.include_router(signals.router, prefix="/api/v1/signals", tags=["Signals"])
    app.include_router(alerts.router, prefix="/api/v1/alerts", tags=["Alerts"])
    app.include_router(portfolio.router, prefix="/api/v1/portfolio", tags=["Portfolio"])
    
    logger.info("✅ All routers registered successfully")
    logger.info("   - Accounts router: /api/v1/accounts/*")
    logger.info("   - Signals router: /api/v1/signals/*")
    logger.info("   - Alerts router: /api/v1/alerts/*")
    logger.info("   - Portfolio router: /api/v1/portfolio/*")

except Exception as e:
    logger.error(f"❌ Error importing routers: {str(e)}")
    logger.error("   Make sure your route files are in: /backend/app/routes/api/v1/")
    raise

# ==================== STARTUP & SHUTDOWN ====================

@app.on_event("startup")
async def startup_event():
    """Application startup"""
    logger.info("🚀 Trading Automation API startup")
    logger.info(f"   Backend running on http://127.0.0.1:8000")
    logger.info(f"   Docs available at http://127.0.0.1:8000/docs")

@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown"""
    logger.info("🛑 Trading Automation API shutdown")

# ==================== HEALTH CHECK ====================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": __import__('datetime').datetime.utcnow().isoformat(),
        "service": "Trading Automation API"
    }

# ==================== ROOT ====================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Trading Automation API",
        "docs": "/docs",
        "health": "/health"
    }