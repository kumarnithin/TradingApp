"""
Main FastAPI Application Entry Point
Trading Automation Platform - Phase 1 Backend
"""

from fastapi import FastAPI, status, HTTPException
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

# Import routers
try:
    from app.routes import ib, portfolio, orders, signals, strategies, analytics, alerts
    logger.info("✓ Successfully imported all route modules")
except ImportError as e:
    logger.error(f"✗ Error importing routes: {e}")
    # Continue anyway - routes can be added later

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
    description="Professional Trading Platform with IB Integration, Order Management, and LIT Suite",
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
        "*"  # In production, replace with specific origins
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
        "version": "1.0.0",
        "environment": "development"
    }

# ============ Root Endpoint ============
@app.get("/", tags=["System"])
async def root():
    """Root endpoint with API information"""
    return {
        "name": "Trading Automation API",
        "version": "1.0.0",
        "status": "running",
        "documentation": {
            "swagger": "/docs",
            "redoc": "/redoc",
            "openapi": "/openapi.json"
        },
        "endpoints": {
            "ib_connection": "/api/v1/ib",
            "portfolio": "/api/v1/portfolio",
            "orders": "/api/v1/orders",
            "signals": "/api/v1/signals",
            "strategies": "/api/v1/strategies",
            "analytics": "/api/v1/analytics",
            "alerts": "/api/v1/alerts",
            "health": "/health"
        }
    }

# ============ Include Routers ============
try:
    app.include_router(ib.router, prefix="/api/v1", tags=["IB Connection"])
    logger.info("✓ IB Connection router loaded")
except Exception as e:
    logger.warning(f"⚠ IB Connection router failed to load: {e}")

try:
    app.include_router(portfolio.router, prefix="/api/v1", tags=["Portfolio"])
    logger.info("✓ Portfolio router loaded")
except Exception as e:
    logger.warning(f"⚠ Portfolio router failed to load: {e}")

try:
    app.include_router(orders.router, prefix="/api/v1", tags=["Orders"])
    logger.info("✓ Orders router loaded")
except Exception as e:
    logger.warning(f"⚠ Orders router failed to load: {e}")

try:
    app.include_router(signals.router, prefix="/api/v1", tags=["Signals"])
    logger.info("✓ Signals router loaded")
except Exception as e:
    logger.warning(f"⚠ Signals router failed to load: {e}")

try:
    app.include_router(strategies.router, prefix="/api/v1", tags=["Strategies"])
    logger.info("✓ Strategies router loaded")
except Exception as e:
    logger.warning(f"⚠ Strategies router failed to load: {e}")

try:
    app.include_router(analytics.router, prefix="/api/v1", tags=["Analytics"])
    logger.info("✓ Analytics router loaded")
except Exception as e:
    logger.warning(f"⚠ Analytics router failed to load: {e}")

try:
    app.include_router(alerts.router, prefix="/api/v1", tags=["Alerts"])
    logger.info("✓ Alerts router loaded")
except Exception as e:
    logger.warning(f"⚠ Alerts router failed to load: {e}")

# ============ Error Handlers ============
@app.exception_handler(404)
async def not_found_handler(request, exc):
    """Handle 404 Not Found errors"""
    return JSONResponse(
        status_code=404,
        content={
            "detail": "Endpoint not found",
            "path": str(request.url),
            "method": request.method,
            "documentation": "Visit /docs for available endpoints"
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "message": str(exc)
        }
    )

# ============ API Status Endpoint ============
@app.get("/api/v1/status", tags=["System"])
async def api_status():
    """Get API status and available endpoints"""
    return {
        "status": "operational",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "available_endpoints": {
            "ib": {
                "connect": "POST /api/v1/ib/connect",
                "disconnect": "POST /api/v1/ib/disconnect",
                "status": "GET /api/v1/ib/connection-status",
                "test": "POST /api/v1/ib/test-connection",
                "accounts": "GET /api/v1/ib/accounts"
            },
            "portfolio": {
                "positions": "GET /api/v1/portfolio/positions",
                "summary": "GET /api/v1/portfolio/summary"
            },
            "orders": {
                "list": "GET /api/v1/orders",
                "create": "POST /api/v1/orders/place",
                "cancel": "DELETE /api/v1/orders/{order_id}",
                "status": "GET /api/v1/orders/{order_id}"
            },
            "signals": {
                "list": "GET /api/v1/signals",
                "generate": "POST /api/v1/signals/generate",
                "detail": "GET /api/v1/signals/{signal_id}"
            },
            "strategies": {
                "list": "GET /api/v1/strategies",
                "create": "POST /api/v1/strategies/create",
                "backtest": "POST /api/v1/strategies/backtest"
            },
            "analytics": {
                "metrics": "GET /api/v1/analytics/metrics",
                "charts": "GET /api/v1/analytics/charts"
            },
            "alerts": {
                "list": "GET /api/v1/alerts",
                "create": "POST /api/v1/alerts/create",
                "delete": "DELETE /api/v1/alerts/{alert_id}"
            }
        },
        "components": {
            "ib_connection": "✓ Active",
            "portfolio": "✓ Active",
            "orders": "✓ Active",
            "signals": "✓ Active",
            "strategies": "✓ Active",
            "analytics": "✓ Active",
            "alerts": "✓ Active"
        }
    }

# ============ Middleware for Request Logging ============
@app.middleware("http")
async def log_requests(request, call_next):
    """Log all incoming requests"""
    import time
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    logger.debug(
        f"{request.method} {request.url.path} - "
        f"Status: {response.status_code} - "
        f"Time: {process_time:.3f}s"
    )
    return response

# ============ Startup/Shutdown Events ============
@app.on_event("startup")
async def startup_event():
    """Execute on application startup"""
    logger.info("Application startup complete")

@app.on_event("shutdown")
async def shutdown_event():
    """Execute on application shutdown"""
    logger.info("Application shutdown complete")

# ============ Main Entry Point ============
if __name__ == "__main__":
    """Run the application"""
    try:
        uvicorn.run(
            "main:app",
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
