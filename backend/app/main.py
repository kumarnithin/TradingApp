"""
Main FastAPI Application - CORRECTED with IB Router
Complete with all routers properly registered including IB Connection
Location: /backend/app/main.py
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import os
from dotenv import load_dotenv
from app.routes.api.v1 import tools

from app.services import advanced_tools
from app.routes.api.v1 import advanced_tools as adv_tools_routes
# In /backend/app/main.py
from app.routes.api.v1 import pretrade




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
    description="TradingView to IB Automation Platform with Portfolio Management",
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
    from app.routes.api.v1 import signals, alerts, accounts, portfolio, ib, trades, tools
    
    # Include routers with correct prefixes
    app.include_router(accounts.router, prefix="/api/v1/accounts", tags=["Accounts"])
    app.include_router(signals.router, prefix="/api/v1/signals", tags=["Signals"])
    app.include_router(alerts.router, prefix="/api/v1/alerts", tags=["Alerts"])
    app.include_router(portfolio.router, prefix="/api/v1/portfolio", tags=["Portfolio"])
    app.include_router(ib.router, prefix="/api/v1/ib", tags=["IB Connection"])  # ✅ ADDED!
    app.include_router(trades.router, prefix="/api/v1/trades")
    app.include_router(tools.router, prefix="/api/v1/tools")
    app.include_router(adv_tools_routes.router, prefix="/api/v1/advanced-tools")
    app.include_router(pretrade.router, prefix="/api/v1/pretrade")
    

    
    logger.info("✅ All routers registered successfully")
    logger.info(" - Accounts router: /api/v1/accounts/*")
    logger.info(" - Signals router: /api/v1/signals/*")
    logger.info(" - Alerts router: /api/v1/alerts/*")
    logger.info(" - Portfolio router: /api/v1/portfolio/*")
    logger.info(" - IB Connection router: /api/v1/ib/*")  # ✅ ADDED!
    logger.info(" - Trades router: /api/v1/trades/*")  # ✅ ADDED!
    logger.info(" - Tools router: /api/v1/tools/*")  
    logger.info(" - Advanced Tools router: /api/v1/advanced-tools/*")
    logger.info(" - Pretrade Tools router: /api/v1/pretrade/*")
    
except Exception as e:
    logger.error(f"❌ Error importing routers: {str(e)}")
    logger.error(" Make sure your route files are in: /backend/app/routes/api/v1/")
    raise

# ==================== STARTUP & SHUTDOWN ====================

@app.on_event("startup")
async def startup_event():
    """Application startup"""
    logger.info("🚀 Trading Automation API startup")
    logger.info(f" Backend running on http://127.0.0.1:8000")
    logger.info(f" Docs available at http://127.0.0.1:8000/docs")
    logger.info(" Available endpoints:")
    logger.info("   - /api/v1/accounts/* (Account management)")
    logger.info("   - /api/v1/signals/* (TradingView signals)")
    logger.info("   - /api/v1/alerts/* (Price alerts)")
    logger.info("   - /api/v1/trades/* (Trades management)")
    logger.info("   - /api/v1/portfolio/* (Watchlist management)")
    logger.info("   - /api/v1/ib/* (Interactive Brokers connection)")

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
        "health": "/health",
        "available_endpoints": {
            "accounts": "/api/v1/accounts/",
            "signals": "/api/v1/signals/",
            "alerts": "/api/v1/alerts/",
            "portfolio": "/api/v1/portfolio/",
            "ib_connection": "/api/v1/ib/",
            "trades": "/api/v1/trades/",
        }
    }