"""
Alerts API Routes - Phase 0.5 Modified
Now supports account_id filtering and storage
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.config import get_db
from app.database import Alert, Account
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
import logging
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Alerts"])

# ==================== Pydantic Models ====================

class AlertCreate(BaseModel):
    account_id: Optional[str] = None  # ✅ ACCOUNT_ID FROM FRONTEND
    symbol: str
    action: str
    quantity: int
    order_type: Optional[str] = "MKT"
    limit_price: Optional[float] = None
    status: str = "pending"
    strategy_id: Optional[str] = None
    strategy: Optional[str] = None

# ==================== ENDPOINTS ====================

@router.post("/create")
async def create_alert(alert_data: AlertCreate, db: Session = Depends(get_db)):
    """
    ✅ MODIFIED: Now accepts account_id from frontend
    
    POST /api/v1/alerts/create
    Body:
    {
        "account_id": "uuid-of-selected-account",
        "symbol": "EURUSD",
        "action": "BUY",
        "quantity": 10000,
        "strategy_id": "strategy-1"
    }
    """
    try:
        # ✅ VALIDATE ACCOUNT EXISTS
        if alert_data.account_id:
            account = db.query(Account).filter(Account.id == alert_data.account_id).first()
            if not account:
                raise HTTPException(status_code=400, detail=f"Account {alert_data.account_id} not found")
        
        # Create alert with account_id
        alert = Alert(
            id=str(uuid.uuid4()),
            account_id=alert_data.account_id,  # ✅ NOW STORING ACCOUNT_ID
            symbol=alert_data.symbol,
            action=alert_data.action.upper(),
            quantity=alert_data.quantity,
            order_type=alert_data.order_type,
            limit_price=alert_data.limit_price,
            strategy_id=alert_data.strategy_id,
            strategy=alert_data.strategy,
            status=alert_data.status,
            created_at=datetime.utcnow()
        )
        
        db.add(alert)
        db.commit()
        db.refresh(alert)
        
        logger.info(f"✅ Alert created: {alert.id} for account {alert.account_id}")
        
        return {
            "status": "success",
            "alert_id": alert.id,
            "account_id": alert.account_id,
            "message": "Alert created"
        }
    
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error creating alert: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def list_alerts(
    account_id: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    ✅ MODIFIED: Filter alerts by account_id
    
    GET /api/v1/alerts/list?account_id=uuid&limit=100
    
    If no account_id, returns all alerts.
    If account_id provided, returns only that account's alerts.
    """
    try:
        query = db.query(Alert)
        
        # ✅ FILTER BY ACCOUNT IF PROVIDED
        if account_id:
            query = query.filter(Alert.account_id == account_id)
        
        alerts = query.order_by(Alert.created_at.desc()).limit(limit).all()
        
        return {
            "status": "success",
            "account_id": account_id,
            "count": len(alerts),
            "alerts": [
                {
                    "id": a.id,
                    "account_id": a.account_id,
                    "symbol": a.symbol,
                    "action": a.action,
                    "quantity": a.quantity,
                    "order_type": a.order_type,
                    "limit_price": a.limit_price,
                    "status": a.status,
                    "strategy_id": a.strategy_id,
                    "strategy": a.strategy,
                    "created_at": a.created_at.isoformat() if a.created_at else None,
                    "filled_at": a.filled_at.isoformat() if a.filled_at else None
                }
                for a in alerts
            ]
        }
    
    except Exception as e:
        logger.error(f"❌ Error listing alerts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{alert_id}")
async def get_alert(alert_id: str, db: Session = Depends(get_db)):
    """
    GET /api/v1/alerts/{alert_id}
    Returns a single alert with all details
    """
    try:
        alert = db.query(Alert).filter(Alert.id == alert_id).first()
        
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        return {
            "status": "success",
            "alert": {
                "id": alert.id,
                "account_id": alert.account_id,
                "symbol": alert.symbol,
                "action": alert.action,
                "quantity": alert.quantity,
                "order_type": alert.order_type,
                "limit_price": alert.limit_price,
                "status": alert.status,
                "strategy_id": alert.strategy_id,
                "strategy": alert.strategy,
                "timeframe": alert.timeframe,
                "signal_strength": alert.signal_strength,
                "error_message": alert.error_message,
                "created_at": alert.created_at.isoformat() if alert.created_at else None,
                "filled_at": alert.filled_at.isoformat() if alert.filled_at else None
            }
        }
    
    except Exception as e:
        logger.error(f"❌ Error fetching alert: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{alert_id}")
async def update_alert(alert_id: str, status: str, db: Session = Depends(get_db)):
    """
    PUT /api/v1/alerts/{alert_id}?status=filled
    Update alert status
    """
    try:
        alert = db.query(Alert).filter(Alert.id == alert_id).first()
        
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        alert.status = status
        alert.updated_at = datetime.utcnow()
        
        if status == "filled":
            alert.filled_at = datetime.utcnow()
        
        db.commit()
        
        logger.info(f"✅ Alert {alert_id} updated to {status}")
        
        return {
            "status": "success",
            "alert_id": alert.id,
            "message": f"Alert updated to {status}"
        }
    
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error updating alert: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
