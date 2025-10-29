from fastapi import APIRouter

router = APIRouter(prefix="/portfolio", tags=["Portfolio"])

@router.get("/positions")
async def get_positions():
    """Get positions"""
    return {"positions": [], "total": 0}

@router.get("/summary")
async def get_summary():
    """Get portfolio summary"""
    return {
        "total_value": 0,
        "total_pnl": 0,
        "cash": 0
    }
