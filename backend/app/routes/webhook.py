from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from ..database import get_db
from ..models import Signal
from ..schemas import SignalResponse
from ..config import settings

# Create router (like a station for webhook-related tasks)
router = APIRouter()

@router.post("/tradingview")
async def receive_tradingview_alert(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Receive webhook alerts from TradingView
    
    TradingView sends data like:
    {
        "symbol": "AAPL",
        "action": "BUY",
        "quantity": 100,
        "order_type": "MARKET",
        "price": null,
        "stop_loss": 150.0,
        "take_profit": 170.0,
        "strategy_id": "my_strategy"
    }
    """
    try:
        # Get the JSON data from the request
        body = await request.json()
        
        # Check that required fields exist
        required_fields = ["symbol", "action", "quantity"]
        for field in required_fields:
            if field not in body:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required field: {field}"
                )
        
        # Log that we received something (helpful for debugging)
        print(f"✅ [{datetime.now()}] Received signal: {body}")
        
        # For now, use default user (ID=1)
        # In production, you'd authenticate to know which user sent this
        user_id = 1
        
        # Create a Signal object (like creating a row in Excel)
        signal = Signal(
            user_id=user_id,
            symbol=body.get("symbol"),
            action=body.get("action"),
            quantity=body.get("quantity"),
            order_type=body.get("order_type", "MARKET"),
            price=body.get("price"),
            stop_loss=body.get("stop_loss"),
            take_profit=body.get("take_profit"),
            strategy_id=body.get("strategy_id"),
            status="PENDING"
        )
        
        # Save to database
        db.add(signal)  # Add to session
        db.commit()  # Save to database
        db.refresh(signal)  # Get the updated object with ID
        
        print(f"✅ Signal saved! ID: {signal.id}")
        
        # Send back a response saying "we got it!"
        return {
            "status": "received",
            "signal_id": signal.id,
            "message": f"Signal for {body.get('symbol')} received and queued",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        # If something goes wrong, log it and return error
        print(f"❌ Error processing webhook: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/signals")
async def get_signals(
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Get recent signals
    Example: http://localhost:8000/api/v1/webhook/signals?limit=10
    """
    # Query database for signals, ordered by newest first
    signals = db.query(Signal).order_by(Signal.received_at.desc()).limit(limit).all()
    return signals
