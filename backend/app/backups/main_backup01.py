from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routes import webhook, orders, account
import uvicorn
import logging

logger = logging.getLogger(__name__)

# Create all database tables
# This line looks at models.py and creates corresponding tables in the database
Base.metadata.create_all(bind=engine)

# Create FastAPI app instance
# This is like opening a restaurant
app = FastAPI(
    title="Trading Automation API",
    description="Interactive Brokers + TradingView Automation Platform",
    version="1.0.0",
    docs_url="/docs",  # Where to find documentation
    redoc_url="/redoc"  # Alternative documentation
)

# Configure CORS (Cross-Origin Resource Sharing)
# This allows your frontend (on port 3000) to talk to backend (on port 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js default port
        "http://localhost:3001",  # Backup port
        "http://127.0.0.1:3000",  # Using IP instead of localhost
    ],
    allow_credentials=True,  # Allow cookies/auth
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

# Include route modules
# This is like routing customers to different stations
app.include_router(webhook.router, prefix="/api/v1/webhook", tags=["Webhook"])
app.include_router(orders.router, prefix="/api/v1/orders", tags=["Orders"])
app.include_router(account.router, prefix="/api/v1/account", tags=["Account"])

# Root endpoint - what you see at http://localhost:8000/
@app.get("/")
async def root():
    """Welcome endpoint"""
    return {
        "message": "Trading Automation API is running!",
        "status": "active",
        "version": "1.0.0",
        "docs": "Visit http://localhost:8000/docs for documentation"
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    """Check if API is healthy and running"""
    return {
        "status": "healthy",
        "service": "trading-automation-api"
    }

# Startup event - runs when app starts
@app.on_event("startup")
async def startup_event():
    """Display info when server starts"""
    logger.info("%s", "=" * 60)
    logger.info("🚀 Trading Automation API Starting...")
    logger.info("📊 API Documentation: http://localhost:8000/docs")
    logger.info("🔧 Alternative Docs: http://localhost:8000/redoc")
    logger.info("❤️  Health Check: http://localhost:8000/health")
    logger.info("%s", "=" * 60)

# Run application (for development)
if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",  # Listen on all network interfaces
        port=8000,  # Port number
        reload=True  # Auto-reload when you change code
    )
