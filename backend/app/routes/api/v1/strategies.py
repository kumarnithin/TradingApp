from fastapi import APIRouter

router = APIRouter(prefix="/strategies", tags=["Strategies"])

@router.get("/")
async def get_strategies():
    """Get strategies"""
    return {"strategies": [], "total": 0}

@router.post("/create")
async def create_strategy(data: dict):
    """Create strategy"""
    return {"status": "success"}
