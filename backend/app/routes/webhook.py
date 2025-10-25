from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from ..database import get_db
from ..models import Signal
from ..schemas import SignalCreate, SignalResponse
from ..config import settings

# Create router
router = APIRouter()

@router.post("/tradingview", response_model=dict)
async def receive_tradingview_alert(
    signal: SignalCreate,  # Changed: Now uses SignalCreate schema
    db: Session = Depends(get_db)
):
    """
    Receive webhook alerts from TradingView
    
    Example request body:
    {
        "symbol": "AAPL",
        "action": "BUY",
        "quantity": 100,
        "order_type": "MARKET",
        "price": 150.0,
        "stop_loss": 145.0,
        "take_profit": 160.0,
        "strategy_id": "test_strategy"
    }
    """
    try:
        # Log incoming signal
        print(f"✅ [{datetime.now()}] Received signal: {signal.dict()}")
        
        # For now, use default user (ID=1)
        user_id = 1
        
        # Create Signal object in database
        db_signal = Signal(
            user_id=user_id,
            symbol=signal.symbol,
            action=signal.action,
            quantity=signal.quantity,
            order_type=signal.order_type,
            price=signal.price,
            stop_loss=signal.stop_loss,
            take_profit=signal.take_profit,
            strategy_id=signal.strategy_id,
            status="PENDING"
        )
        
        # Save to database
        db.add(db_signal)
        db.commit()
        db.refresh(db_signal)
        
        print(f"✅ Signal saved! ID: {db_signal.id}")
        
        # Return success response
        return {
            "status": "received",
            "signal_id": db_signal.id,
            "message": f"Signal for {signal.symbol} received and queued",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Error processing webhook: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/signals", response_model=list[SignalResponse])
async def get_signals(
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Get recent signals
    Example: http://localhost:8000/api/v1/webhook/signals?limit=10
    """
    signals = db.query(Signal).order_by(Signal.received_at.desc()).limit(limit).all()
    return signals
