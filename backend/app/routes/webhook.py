from fastapi import APIRouter, Depends, HTTPException
import logging
from sqlalchemy.orm import Session
from datetime import datetime
from ..database import get_db
logger = logging.getLogger(__name__)
from ..models import Signal, Trade, User
from ..schemas import SignalCreate, SignalResponse
from ..services.risk_manager import RiskManager
from ..services.order_executor import OrderExecutor
from ..config import settings

router = APIRouter()

@router.post("/tradingview", response_model=dict)
async def receive_tradingview_alert(
    signal: SignalCreate,
    db: Session = Depends(get_db)
):
    """
    Receive webhook alerts from TradingView and execute trades
    """
    try:
        # Log incoming signal
        logger.info(f"✅ [{datetime.now()}] Received signal: {signal.dict()}")
        
        # Get or create demo user
        user = db.query(User).filter(User.id == 1).first()
        if not user:
            user = User(
                email="demo@tradingapp.com",
                username="demo_user",
                password_hash="demo_hash",
                account_balance=1000000.0,
                paper_trading=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        # Save signal to database
        db_signal = Signal(
            user_id=user.id,
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
        db.add(db_signal)
        db.commit()
        db.refresh(db_signal)
        
        logger.info(f"✅ Signal saved! ID: {db_signal.id}")
        
        # Validate with risk manager
        risk_check = RiskManager.validate_trade(
            account_balance=user.account_balance,
            symbol=signal.symbol,
            action=signal.action,
            quantity=signal.quantity,
            price=signal.price
        )
        
        if not risk_check["approved"]:
            logger.warning(f"❌ Risk check failed: {risk_check['errors']}")
            db_signal.status = "REJECTED"
            db_signal.rejection_reason = "; ".join(risk_check["errors"])
            db.commit()
            
            return {
                "status": "rejected",
                "signal_id": db_signal.id,
                "reason": risk_check["errors"],
                "timestamp": datetime.now().isoformat()
            }
        
        if risk_check["warnings"]:
            logger.warning(f"⚠️ Warnings: {risk_check['warnings']}")
        
        # Execute trade on IBKR
        logger.info(f"🚀 Executing trade on IBKR...")
        executor = OrderExecutor(
            host=settings.ibkr_host,
            port=settings.ibkr_port,
            client_id=settings.ibkr_client_id
        )
        
        # Connect to IBKR
        connected = await executor.connect()
        
        if not connected:
            logger.error("❌ Failed to connect to IBKR")
            db_signal.status = "REJECTED"
            db_signal.rejection_reason = "Could not connect to IBKR"
            db.commit()
            
            return {
                "status": "error",
                "signal_id": db_signal.id,
                "message": "Could not connect to IBKR. Is TWS running?",
                "timestamp": datetime.now().isoformat()
            }
        
        # Place order
        order_result = await executor.execute_market_order(
            symbol=signal.symbol,
            action=signal.action,
            quantity=signal.quantity
        )
        
        await executor.disconnect()
        
        if order_result["status"] == "success":
            # Create trade record
            trade = Trade(
                user_id=user.id,
                signal_id=db_signal.id,
                symbol=signal.symbol,
                action=signal.action,
                quantity=signal.quantity,
                order_type=signal.order_type,
                entry_price=signal.price,
                ibkr_order_id=str(order_result.get("order_id", "")),
                status="FILLED"
            )
            db.add(trade)
            
            # Update signal status
            db_signal.status = "EXECUTED"
            db_signal.processed_at = datetime.now()
            
            db.commit()
            
            logger.info(f"✅ Trade executed! Order ID: {order_result.get('order_id')}")
            
            return {
                "status": "executed",
                "signal_id": db_signal.id,
                "order_id": order_result.get("order_id"),
                "message": f"Order for {signal.symbol} executed successfully",
                "timestamp": datetime.now().isoformat()
            }
        else:
            logger.error(f"❌ Order execution failed: {order_result.get('message')}")
            db_signal.status = "REJECTED"
            db_signal.rejection_reason = order_result.get("message", "Unknown error")
            db.commit()
            
            return {
                "status": "error",
                "signal_id": db_signal.id,
                "message": order_result.get("message", "Order execution failed"),
                "timestamp": datetime.now().isoformat()
            }
        
    except Exception as e:
        logger.exception(f"❌ Error processing webhook: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/signals", response_model=list[SignalResponse])
async def get_signals(
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get recent signals"""
    signals = db.query(Signal).order_by(Signal.received_at.desc()).limit(limit).all()
    return signals
