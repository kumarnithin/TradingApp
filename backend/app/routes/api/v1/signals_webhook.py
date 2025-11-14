"""
🌐 TRADINGVIEW WEBHOOK ADAPTER
Location: /backend/app/routes/api/v1/tradingview_webhook.py

Converts TradingView format → Your existing signals.py format
"""

from fastapi import APIRouter, HTTPException, Request, Query, Depends
from sqlalchemy.orm import Session
import logging
import json

logger = logging.getLogger(__name__)

from app.database import SessionLocal

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ✅ YOUR PASSPHRASE
TRADINGVIEW_PASSPHRASE = "Nits@signal"

print("=" * 60)
print("🌐 TRADINGVIEW WEBHOOK ADAPTER LOADED")
print(f"✅ Passphrase set to: {TRADINGVIEW_PASSPHRASE}")
print("=" * 60)

@router.post("/tradingview")
async def receive_tradingview_alert(
    request: Request,
    db: Session = Depends(get_db),
    account_id: str = Query(default=""),
    user_id: int = Query(default=1)
):
    """
    📨 RECEIVE TRADINGVIEW ALERT
    
    URL: https://your-ngrok-url/api/v1/signals/tradingview?account_id=YOUR_ACCOUNT&user_id=1
    
    TradingView format:
    {
        "passphrase": "Nits@signal",
        "time": "{{timenow}}",
        "ticker": "{{ticker}}",
        "action": "BUY",
        "quantity": "1.0",
        "price": "{{close}}",
        "comment": "test"
    }
    """
    
    print("\n" + "=" * 60)
    print("🚨 TRADINGVIEW ALERT RECEIVED!")
    print("=" * 60)
    
    try:
        # Parse request
        try:
            body = await request.json()
            print(f"📨 Body: {body}")
        except:
            try:
                form_data = await request.form()
                body = dict(form_data)
                print(f"📨 Form: {body}")
            except:
                print("❌ Could not parse body")
                raise HTTPException(status_code=400, detail="Invalid request format")
        
        # Check passphrase
        passphrase = body.get("passphrase", "")
        print(f"🔐 Passphrase: {passphrase}")
        
        if passphrase != TRADINGVIEW_PASSPHRASE:
            print(f"❌ MISMATCH! Expected: {TRADINGVIEW_PASSPHRASE}")
            raise HTTPException(status_code=401, detail="Invalid passphrase")
        
        print("✅ Passphrase OK!")
        
        # Extract TradingView fields
        ticker = body.get("ticker", "UNKNOWN")
        action = body.get("action", "").upper()
        quantity = float(body.get("quantity", 1))
        price = float(body.get("price", 0))
        
        print(f"📊 Signal: {action} {quantity} {ticker} @ {price}")
        
        if not account_id:
            print("❌ account_id required!")
            raise HTTPException(status_code=400, detail="account_id required in query params")
        
        # Convert to signals.py format
        signal_data = {
            "account_id": account_id,
            "user_id": user_id,
            "strategy_id": None,
            "symbol": ticker,
            "action": action,
            "quantity": quantity,
            "order_type": "MKT",
            "price": price,
            "stop_loss": None,
            "take_profit": None
        }
        
        print(f"🔄 Converting to internal format: {signal_data}")
        
        # Call your existing signals.py webhook endpoint
        from app.routes.api.v1.signals import receive_tradingview_signal as signals_webhook
        
        # Create SignalCreate object
        from pydantic import BaseModel
        
        class SignalCreate(BaseModel):
            account_id: str = None
            user_id: int = 1
            strategy_id: str = None
            symbol: str
            action: str
            quantity: float
            order_type: str = "MKT"
            price: float = None
            stop_loss: float = None
            take_profit: float = None
        
        signal_obj = SignalCreate(**signal_data)
        
        print(f"📤 Calling signals webhook...")
        
        # Call existing endpoint
        result = await signals_webhook(signal_obj, db)
        
        print(f"✅ SUCCESS! Result: {result}")
        print("=" * 60 + "\n")
        
        return result
    
    except HTTPException as e:
        print(f"❌ ERROR: {e.detail}")
        print("=" * 60 + "\n")
        raise
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        print("=" * 60 + "\n")
        raise HTTPException(status_code=500, detail=str(e))

# Health check
@router.get("/health")
async def health():
    return {"status": "online", "webhook": "/api/v1/signals/tradingview"}