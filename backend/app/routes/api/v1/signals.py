"""
SIGNALS.PY - FINAL CORRECTED VERSION
Imports SessionLocal from app.database (NOT app.models)
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/signals", tags=["TradingView Signals"])

# Import IB client
from app.services.ib_client import ib_client

# ✅ CORRECT: Import from app.database, NOT app.models!
from app.database import SessionLocal
from app.models import Alert

# Store signal history
signal_history = []

# ============ DATA MODELS ============

class SignalData(BaseModel):
    """TradingView webhook signal data"""
    symbol: str
    action: str
    contract_type: str
    quantity: Optional[float] = None
    order_type: str = "MKT"
    limit_price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    strategy: Optional[str] = None
    timeframe: Optional[str] = None
    exchange: Optional[str] = None
    comment: Optional[str] = None
    api_key: Optional[str] = None


class SignalConfig(BaseModel):
    """Signal auto-trading configuration"""
    enabled: bool = True
    default_quantity: float = 10
    strategy_name: str = "TradingView"
    auto_execute: bool = True
    max_daily_trades: int = 50
    risk_per_trade: float = 0.02
    stop_loss_percent: Optional[float] = None
    take_profit_percent: Optional[float] = None


# Global config
signal_config = SignalConfig()
daily_trade_count = 0

# ============ SIGNAL ENDPOINTS ============

@router.post("/webhook")
async def receive_tradingview_signal(signal: SignalData):
    """Receive TradingView webhook signals and auto-execute trades"""
    db = SessionLocal()
    
    try:
        if not ib_client.is_connected():
            logger.error("IB not connected - signal rejected")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="IB not connected. Connect first!"
            )
        
        # Validate signal
        if not signal.symbol or not signal.action:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="symbol and action are required"
            )
        
        if signal.action.upper() not in ["BUY", "SELL"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="action must be BUY or SELL"
            )
        
        # Check daily trade limit
        global daily_trade_count
        if daily_trade_count >= signal_config.max_daily_trades:
            logger.warning(f"Daily trade limit reached")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Daily trade limit reached"
            )
        
        logger.info(f"📨 Signal: {signal.action} {signal.quantity or signal_config.default_quantity} {signal.symbol}")
        add_to_history('info', f"📨 Signal: {signal.action} {signal.symbol}")
        
        # Get quantity
        quantity = signal.quantity or signal_config.default_quantity
        
        # ✅ SAVE TO DATABASE
        db_alert = Alert(
            symbol=signal.symbol,
            action=signal.action.upper(),
            quantity=int(quantity) if signal.contract_type != "crypto" else quantity,
            contract_type=signal.contract_type,
            order_type=signal.order_type,
            limit_price=signal.limit_price,
            stop_loss=signal.stop_loss,
            take_profit=signal.take_profit,
            strategy=signal.strategy,
            strategy_id=signal.api_key,
            timeframe=signal.timeframe,
            comment=signal.comment,
            status="PENDING"
        )
        db.add(db_alert)
        db.commit()
        db.refresh(db_alert)
        logger.info(f"💾 Alert saved: {db_alert.id}")
        
        # Auto-execute if enabled
        if signal_config.auto_execute and signal_config.enabled:
            logger.info(f"⚙️ Executing: {signal.action} {quantity} {signal.symbol}")
            
            exchange = "SMART"
            if signal.contract_type.lower() == "forex":
                exchange = None
            elif signal.contract_type.lower() == "future":
                exchange = "CME"
            elif signal.contract_type.lower() == "crypto":
                exchange = "PAXOS"
            
            # Place order
            result = await ib_client.place_order(
                signal.contract_type,
                signal.action.upper(),
                int(quantity) if signal.contract_type != "crypto" else quantity,
                order_type=signal.order_type,
                limit_price=signal.limit_price,
                symbol=signal.symbol,
                exchange=exchange
            )
            
            if result and isinstance(result, dict) and result.get("status") == "success":
                daily_trade_count += 1
                order_id = result.get("order_id")
                
                # Update database
                db_alert.status = "SUBMITTED"
                db_alert.order_id = order_id
                db_alert.submitted_at = datetime.utcnow()
                db.commit()
                
                add_to_history('success', f"✅ Order: {order_id}")
                logger.info(f"✅ Order executed: {order_id}")
                
                return {
                    "status": "success",
                    "alert_id": db_alert.id,
                    "order_id": order_id,
                    "symbol": signal.symbol,
                    "action": signal.action,
                    "quantity": quantity,
                    "timestamp": datetime.now().isoformat()
                }
            else:
                error_msg = result.get("error") if result else "Unknown error"
                db_alert.status = "REJECTED"
                db_alert.error_message = error_msg
                db.commit()
                
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)
        else:
            return {
                "status": "logged",
                "alert_id": db_alert.id,
                "symbol": signal.symbol,
                "action": signal.action,
                "quantity": quantity,
                "timestamp": datetime.now().isoformat()
            }
    
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        db.close()

# ============ CONFIG ENDPOINTS ============

@router.get("/config")
async def get_signal_config():
    """Get signal configuration"""
    return {
        "status": "success",
        "config": signal_config.dict(),
        "daily_trades_today": daily_trade_count,
        "remaining_trades": signal_config.max_daily_trades - daily_trade_count
    }

@router.post("/config")
async def update_signal_config(config: SignalConfig):
    """Update signal configuration"""
    global signal_config
    signal_config = config
    logger.info("✅ Config updated")
    
    return {
        "status": "success",
        "config": signal_config.dict()
    }

@router.post("/config/toggle")
async def toggle_auto_execute():
    """Toggle auto-execute"""
    global signal_config
    signal_config.auto_execute = not signal_config.auto_execute
    state = "ENABLED" if signal_config.auto_execute else "DISABLED"
    
    logger.info(f"🔄 Auto-execute: {state}")
    add_to_history('info', f"🔄 Auto-execute {state}")
    
    return {
        "status": "success",
        "auto_execute": signal_config.auto_execute,
        "message": f"Auto-execute {state}"
    }

@router.post("/config/reset-daily-count")
async def reset_daily_trade_count():
    """Reset daily trade counter"""
    global daily_trade_count
    old_count = daily_trade_count
    daily_trade_count = 0
    
    logger.info(f"🔄 Daily counter reset")
    
    return {
        "status": "success",
        "previous_count": old_count,
        "new_count": 0
    }

# ============ HISTORY & STATUS ============

@router.get("/history")
async def get_signal_history():
    """Get signal history"""
    return {
        "status": "success",
        "history": signal_history[-100:],
        "count": len(signal_history)
    }

@router.get("/status")
async def get_signal_status():
    """Get system status"""
    return {
        "status": "success",
        "system": {
            "connected_to_ib": ib_client.is_connected(),
            "auto_execute_enabled": signal_config.auto_execute,
            "daily_trades": daily_trade_count,
            "max_daily_trades": signal_config.max_daily_trades,
            "remaining_trades": signal_config.max_daily_trades - daily_trade_count
        },
        "timestamp": datetime.now().isoformat()
    }

@router.delete("/history")
async def clear_signal_history():
    """Clear history"""
    global signal_history
    count = len(signal_history)
    signal_history = []
    
    return {
        "status": "success",
        "deleted": count
    }

# ============ UTILITY ============

def add_to_history(event_type: str, message: str):
    """Add to history"""
    global signal_history
    signal_history.append({
        "id": len(signal_history),
        "type": event_type,
        "message": message,
        "timestamp": datetime.now().isoformat()
    })
    if len(signal_history) > 500:
        signal_history = signal_history[-500:]

@router.post("/test")
async def test_signal():
    """Test signal"""
    db = SessionLocal()
    try:
        db_alert = Alert(
            symbol="AAPL",
            action="BUY",
            quantity=1,
            contract_type="stock",
            strategy="Test",
            status="TEST"
        )
        db.add(db_alert)
        db.commit()
        
        logger.info("🧪 Test signal saved")
        
        return {
            "status": "success",
            "alert_id": db_alert.id,
            "message": "Test signal saved"
        }
    finally:
        db.close()
