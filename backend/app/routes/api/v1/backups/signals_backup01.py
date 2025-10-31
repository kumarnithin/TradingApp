"""
TradingView Signal Handler - Auto Trading Integration
Receives webhooks from TradingView alerts and auto-executes trades on IB
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
import logging
from datetime import datetime
from typing import Optional
import asyncio
import json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/signals", tags=["TradingView Signals"])

# Import IB client
from app.services.ib_client import ib_client

# Store signal history
signal_history = []

# ============ DATA MODELS ============

class SignalData(BaseModel):
    """TradingView webhook signal data"""
    symbol: str              # e.g., "AAPL"
    action: str              # "BUY" or "SELL"
    contract_type: str       # "stock", "forex", "future", "crypto", "option"
    quantity: Optional[float] = None  # If None, use default
    order_type: str = "MKT"  # "MKT" or "LMT"
    limit_price: Optional[float] = None  # For limit orders
    strategy: Optional[str] = None  # Strategy name
    timeframe: Optional[str] = None  # e.g., "1H", "4H", "D"
    exchange: Optional[str] = "SMART"  # For stocks
    comment: Optional[str] = None  # Additional info
    api_key: Optional[str] = None  # For security


class SignalConfig(BaseModel):
    """Signal auto-trading configuration"""
    enabled: bool = True
    default_quantity: float = 10  # Default shares/units to trade
    strategy_name: str = "TradingView"
    auto_execute: bool = True  # Auto execute or just log
    max_daily_trades: int = 50
    risk_per_trade: float = 0.02  # 2% risk per trade
    stop_loss_percent: Optional[float] = None  # Auto-set stop loss
    take_profit_percent: Optional[float] = None  # Auto-set take profit


# Global config
signal_config = SignalConfig()
daily_trade_count = 0

# ============ SIGNAL ENDPOINTS ============

@router.post("/webhook")
async def receive_tradingview_signal(signal: SignalData):
    """
    Receive TradingView webhook signals and auto-execute trades
    
    TradingView Alert URL Format:
    http://your-server.com/api/v1/signals/webhook
    
    TradingView Alert Message:
    {
        "symbol": "AAPL",
        "action": "BUY",
        "contract_type": "stock",
        "quantity": 10,
        "order_type": "MKT",
        "strategy": "My Strategy",
        "timeframe": "1H",
        "exchange": "NASDAQ"
    }
    """
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
            logger.warning(f"Daily trade limit ({signal_config.max_daily_trades}) reached")
            add_to_history('warning', f"Daily trade limit reached - signal ignored")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Daily trade limit ({signal_config.max_daily_trades}) reached"
            )
        
        # Log signal
        logger.info(f"📨 Signal received: {signal.action} {signal.quantity or signal_config.default_quantity} {signal.symbol}")
        logger.info(f"   Strategy: {signal.strategy}")
        logger.info(f"   Timeframe: {signal.timeframe}")
        logger.info(f"   Comment: {signal.comment}")
        
        add_to_history('info', f"📨 Signal received: {signal.action} {signal.symbol} from {signal.strategy}")
        
        # Get quantity
        quantity = signal.quantity or signal_config.default_quantity
        
        # Auto-execute if enabled
        if signal_config.auto_execute and signal_config.enabled:
            logger.info(f"⚙️ Auto-executing: {signal.action} {quantity} {signal.symbol}")
            
            # Place order
            order_data = {
                "contract_type": signal.contract_type,
                "symbol": signal.symbol,
                "action": signal.action.upper(),
                "quantity": int(quantity) if signal.contract_type != "crypto" else quantity,
                "order_type": signal.order_type,
                "exchange": signal.exchange or "NASDAQ"
            }
            
            if signal.limit_price:
                order_data["limit_price"] = signal.limit_price
            
            result = await ib_client.place_order(
                signal.contract_type,
                signal.action.upper(),
                int(quantity) if signal.contract_type != "crypto" else quantity,
                order_type=signal.order_type,
                limit_price=signal.limit_price,
                **{k: v for k, v in order_data.items() if k not in ['contract_type', 'action', 'quantity', 'order_type', 'limit_price']}
            )
            
            if result["status"] == "success":
                daily_trade_count += 1
                add_to_history('success', f"✅ Order executed! ID: {result['order_id']} - {signal.symbol}")
                logger.info(f"✅ Order placed: ID {result['order_id']}")
                
                return {
                    "status": "success",
                    "message": "Signal received and order executed",
                    "order_id": result.get("order_id"),
                    "symbol": signal.symbol,
                    "action": signal.action,
                    "quantity": quantity,
                    "strategy": signal.strategy,
                    "timestamp": datetime.now().isoformat()
                }
            else:
                add_to_history('error', f"❌ Order failed: {result.get('error')}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Order execution failed: {result.get('error')}"
                )
        else:
            # Just log if auto-execute disabled
            add_to_history('info', f"📝 Signal logged (auto-execute disabled): {signal.action} {signal.symbol}")
            logger.info("ℹ️ Auto-execute disabled - signal logged only")
            
            return {
                "status": "logged",
                "message": "Signal received and logged (auto-execute disabled)",
                "symbol": signal.symbol,
                "action": signal.action,
                "strategy": signal.strategy,
                "timestamp": datetime.now().isoformat()
            }
    
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error processing signal: {str(e)}")
        add_to_history('error', f"❌ Signal error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Signal processing failed: {str(e)}"
        )

# ============ CONFIGURATION ENDPOINTS ============

@router.get("/config")
async def get_signal_config():
    """Get current signal configuration"""
    try:
        logger.info("📤 GET /signals/config")
        return {
            "status": "success",
            "config": signal_config.dict(),
            "daily_trades_today": daily_trade_count,
            "remaining_trades": signal_config.max_daily_trades - daily_trade_count,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/config")
async def update_signal_config(config: SignalConfig):
    """Update signal configuration"""
    try:
        global signal_config
        signal_config = config
        
        logger.info(f"✅ Signal config updated")
        logger.info(f"   Auto-execute: {config.auto_execute}")
        logger.info(f"   Default quantity: {config.default_quantity}")
        logger.info(f"   Max daily trades: {config.max_daily_trades}")
        
        add_to_history('info', f"⚙️ Config updated: auto_execute={config.auto_execute}, qty={config.default_quantity}")
        
        return {
            "status": "success",
            "message": "Signal config updated",
            "config": signal_config.dict(),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/config/toggle")
async def toggle_auto_execute():
    """Toggle auto-execute on/off"""
    try:
        global signal_config
        signal_config.auto_execute = not signal_config.auto_execute
        state = "ENABLED" if signal_config.auto_execute else "DISABLED"
        
        logger.info(f"🔄 Auto-execute: {state}")
        add_to_history('info', f"🔄 Auto-execute {state}")
        
        return {
            "status": "success",
            "auto_execute": signal_config.auto_execute,
            "message": f"Auto-execute {state}",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/config/reset-daily-count")
async def reset_daily_trade_count():
    """Reset daily trade counter (call at start of day)"""
    try:
        global daily_trade_count
        old_count = daily_trade_count
        daily_trade_count = 0
        
        logger.info(f"🔄 Daily trade count reset: {old_count} → 0")
        add_to_history('info', f"🔄 Daily counter reset (was {old_count})")
        
        return {
            "status": "success",
            "message": "Daily trade count reset",
            "previous_count": old_count,
            "new_count": daily_trade_count,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# ============ HISTORY & STATUS ============

@router.get("/history")
async def get_signal_history():
    """Get signal history"""
    try:
        logger.info("📤 GET /signals/history")
        return {
            "status": "success",
            "history": signal_history[-100:],  # Last 100 signals
            "count": len(signal_history),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/status")
async def get_signal_status():
    """Get overall signal system status"""
    try:
        logger.info("📤 GET /signals/status")
        return {
            "status": "success",
            "system": {
                "connected_to_ib": ib_client.is_connected(),
                "auto_execute_enabled": signal_config.auto_execute,
                "signals_enabled": signal_config.enabled,
                "daily_trades": daily_trade_count,
                "max_daily_trades": signal_config.max_daily_trades,
                "remaining_trades": signal_config.max_daily_trades - daily_trade_count,
                "account": {
                    "name": ib_client.account_name,
                    "type": ib_client.account_type
                }
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.delete("/history")
async def clear_signal_history():
    """Clear signal history"""
    try:
        global signal_history
        count = len(signal_history)
        signal_history = []
        
        logger.info(f"🗑️ Signal history cleared ({count} entries)")
        add_to_history('info', f"🗑️ History cleared ({count} entries)")
        
        return {
            "status": "success",
            "message": f"Cleared {count} signal history entries",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# ============ UTILITY FUNCTIONS ============

def add_to_history(event_type: str, message: str):
    """Add event to signal history"""
    global signal_history
    entry = {
        "id": len(signal_history),
        "type": event_type,
        "message": message,
        "timestamp": datetime.now().isoformat()
    }
    signal_history.append(entry)
    if len(signal_history) > 500:  # Keep last 500
        signal_history = signal_history[-500:]

@router.post("/test")
async def test_signal():
    """Test signal endpoint (for development)"""
    try:
        test_signal = SignalData(
            symbol="AAPL",
            action="BUY",
            contract_type="stock",
            quantity=1,
            strategy="Test Strategy",
            timeframe="1H",
            comment="Test signal"
        )
        
        logger.info("🧪 Test signal received")
        add_to_history('info', "🧪 Test signal received")
        
        return {
            "status": "success",
            "message": "Test signal received",
            "signal": test_signal.dict(),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
