from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Trading Automation API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/")
async def root():
    return {"message": "Trading API running"}

# Import and register routers
from app.routes.api.v1.ib import router as ib_router
from app.routes.api.v1.portfolio import router as portfolio_router
from app.routes.api.v1.orders import router as orders_router
from app.routes.api.v1.signals import router as signals_router
from app.routes.api.v1.strategies import router as strategies_router
from app.routes.api.v1.analytics import router as analytics_router
from app.routes.api.v1.alerts import router as alerts_router

app.include_router(ib_router, prefix="/api/v1")
app.include_router(portfolio_router, prefix="/api/v1")
app.include_router(orders_router, prefix="/api/v1")
app.include_router(signals_router, prefix="/api/v1")
app.include_router(strategies_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(alerts_router, prefix="/api/v1")

print("✓ All routers registered successfully!")
