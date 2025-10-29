from fastapi import APIRouter

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/metrics")
async def get_metrics():
    """Get analytics metrics"""
    return {"metrics": {}}

@router.get("/charts")
async def get_charts():
    """Get charts data"""
    return {"charts": []}
