from fastapi import APIRouter

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("/")
async def get_alerts():
    """Get alerts"""
    return {"alerts": [], "total": 0}

@router.post("/create")
async def create_alert(data: dict):
    """Create alert"""
    return {"status": "success"}
