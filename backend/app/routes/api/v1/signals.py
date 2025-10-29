from fastapi import APIRouter

router = APIRouter(prefix="/signals", tags=["Signals"])

@router.get("/")
async def get_signals():
    """Get signals"""
    return {"signals": [], "total": 0}

@router.post("/generate")
async def generate_signal(data: dict):
    """Generate signal"""
    return {"status": "success"}
