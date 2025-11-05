from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Signal, Trade, Account, User
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/signals", tags=["Signals"])

# ==================== Pydantic Models ====================

from pydantic import BaseModel
from typing import Optional

class SignalCreate(BaseModel):
    account_id: Optional[str] = None  # ✅ ACCOUNT_ID FROM FRONTEND
    user_id: int
    strategy_id: Optional[str] = None
    symbol: str
    action: str  # BUY, SELL
    quantity: float
    order_type: str = "MKT"
    price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None

class SignalResponse(BaseModel):
    id: int
    account_id: Optional[str]
    symbol: str
    action: str
    quantity: float
    status: str
    confidence_score: float
    received_at: datetime
    
    class Config:
        from_attributes = True

# ==================== ENDPOINTS ====================

@router.post("/webhook")
async def receive_tradingview_signal(signal_data: SignalCreate, db: Session = Depends(get_db)):
    """
    ✅ MODIFIED: Now accepts account_id from frontend
    
    POST /api/v1/signals/webhook
    Body:
    {
        "account_id": "uuid-of-selected-account",
        "user_id": 1,
        "symbol": "EURUSD",
        "action": "BUY",
        "quantity": 10000,
        "strategy_id": "strategy-1"
    }
    """
    try:
        # ✅ VALIDATE ACCOUNT EXISTS
        if signal_data.account_id:
            account = db.query(Account).filter(Account.id == signal_data.account_id).first()
            if not account:
                raise HTTPException(status_code=400, detail=f"Account {signal_data.account_id} not found")
        
        # Create signal with account_id
        signal = Signal(
            account_id=signal_data.account_id,  # ✅ NOW STORING ACCOUNT_ID
            user_id=signal_data.user_id,
            strategy_id=signal_data.strategy_id,
            symbol=signal_data.symbol,
            action=signal_data.action,
            quantity=signal_data.quantity,
            order_type=signal_data.order_type,
            price=signal_data.price,
            stop_loss=signal_data.stop_loss,
            take_profit=signal_data.take_profit,
            status="pending",
            confidence_score=50  # Default, will be updated by ML in Phase 1
        )
        
        db.add(signal)
        db.commit()
        db.refresh(signal)
        
        logger.info(f"✅ Signal created: {signal.id} for account {signal.account_id}")
        
        return {
            "status": "success",
            "signal_id": signal.id,
            "account_id": signal.account_id,
            "message": "Signal received and stored"
        }
    
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error creating signal: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def list_signals(account_id: Optional[str] = None, db: Session = Depends(get_db)):
    """
    ✅ MODIFIED: Filter signals by account_id
    
    GET /api/v1/signals/list?account_id=uuid
    
    If no account_id, returns all signals.
    If account_id provided, returns only that account's signals.
    """
    try:
        query = db.query(Signal)
        
        # ✅ FILTER BY ACCOUNT IF PROVIDED
        if account_id:
            query = query.filter(Signal.account_id == account_id)
        
        signals = query.order_by(Signal.received_at.desc()).all()
        
        return {
            "status": "success",
            "account_id": account_id,
            "count": len(signals),
            "signals": [
                {
                    "id": s.id,
                    "account_id": s.account_id,
                    "symbol": s.symbol,
                    "action": s.action,
                    "quantity": s.quantity,
                    "status": s.status,
                    "confidence_score": s.confidence_score,
                    "received_at": s.received_at
                }
                for s in signals
            ]
        }
    
    except Exception as e:
        logger.error(f"❌ Error listing signals: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{signal_id}")
async def get_signal(signal_id: int, db: Session = Depends(get_db)):
    """
    GET /api/v1/signals/{signal_id}
    Returns a single signal with all details
    """
    try:
        signal = db.query(Signal).filter(Signal.id == signal_id).first()
        
        if not signal:
            raise HTTPException(status_code=404, detail="Signal not found")
        
        return {
            "status": "success",
            "signal": {
                "id": signal.id,
                "account_id": signal.account_id,
                "symbol": signal.symbol,
                "action": signal.action,
                "quantity": signal.quantity,
                "price": signal.price,
                "stop_loss": signal.stop_loss,
                "take_profit": signal.take_profit,
                "status": signal.status,
                "confidence_score": signal.confidence_score,
                "received_at": signal.received_at,
                "processed_at": signal.processed_at
            }
        }
    
    except Exception as e:
        logger.error(f"❌ Error fetching signal: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
