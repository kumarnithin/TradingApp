"""
🚀 FINAL SIGNALS ROUTE - Phase 1 + Phase 2 + Phase 3 Complete
✅ All fixes applied: Safe attribute access, proper error handling
Location: /backend/app/routes/api/v1/signals.py
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from app.config import get_db
from app.database import Signal, Trade, Account, User
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
import logging
import uuid

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Signals"])

# Try to import services if available, otherwise skip
try:
    from app.services.feature_engineer import FeatureEngineer
    from app.services.ml_model import ml_model
    from app.services.risk_manager import RiskManager
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False
    logger.warning("⚠️  ML services not available - webhook will work in manual mode")

if ML_AVAILABLE:
    risk_manager = RiskManager()

# ==================== Pydantic Models ====================

class SignalCreate(BaseModel):
    account_id: Optional[str] = None
    user_id: int = 1
    strategy_id: Optional[str] = None
    symbol: str
    action: str
    quantity: float
    order_type: str = "MKT"
    price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None

class SignalUpdate(BaseModel):
    status: Optional[str] = None
    entry_price: Optional[float] = None
    profit_loss: Optional[float] = None

class SignalManualCreate(BaseModel):
    account_id: str
    symbol: str
    action: str
    quantity: int
    strategy: Optional[str] = None
    strategy_id: Optional[str] = None

# ==================== WEBHOOK ENDPOINT ====================

@router.post("/webhook")
async def receive_tradingview_signal(signal_data: SignalCreate, db: Session = Depends(get_db)):
    """
    POST /api/v1/signals/webhook
    Receive TradingView signals with ML scoring & risk management
    """
    try:
        # Validate account
        if signal_data.account_id:
            account = db.query(Account).filter(Account.id == signal_data.account_id).first()
            if not account:
                raise HTTPException(status_code=400, detail=f"Account {signal_data.account_id} not found")
        else:
            raise HTTPException(status_code=400, detail="account_id is required")

        # Create signal record
        signal = Signal(
            id=str(uuid.uuid4()),
            account_id=signal_data.account_id,
            user_id=signal_data.user_id,
            strategy_id=signal_data.strategy_id,
            symbol=signal_data.symbol.upper(),
            action=signal_data.action.upper(),
            quantity=signal_data.quantity,
            order_type=signal_data.order_type,
            price=signal_data.price,
            stop_loss=signal_data.stop_loss,
            take_profit=signal_data.take_profit,
            status="pending",
            received_at=datetime.utcnow(),
            is_active=True
        )
        
        db.add(signal)
        db.flush()

        # ML Scoring (if available)
        credibility_score = 100.0  # Default high score if ML not available
        
        if ML_AVAILABLE:
            try:
                logger.info(f"🔍 Extracting features for {signal.symbol}...")
                fe = FeatureEngineer(db)
                features = fe.extract_features(signal)
                feature_list = fe.features_to_list(features)
                
                logger.info(f"🤖 Scoring signal with ML model...")
                credibility_score = ml_model.score_signal(feature_list)
                signal.confidence_score = credibility_score

                # Check ML threshold
                ml_threshold = 50.0
                if credibility_score < ml_threshold:
                    signal.status = "rejected"
                    signal.rejection_reason = f"ML confidence too low: {credibility_score:.1f}%"
                    db.commit()
                    logger.warning(f"❌ Signal rejected by ML: {signal.symbol} {signal.action}")
                    return {
                        "status": "rejected",
                        "signal_id": signal.id,
                        "reason": "ML validation failed",
                        "confidence_score": credibility_score,
                        "message": f"Low ML confidence: {credibility_score:.1f}%"
                    }
            except Exception as ml_error:
                logger.warning(f"⚠️  ML scoring error: {ml_error} - continuing with signal")
                signal.confidence_score = 100.0

        # Risk Management (if available)
        if ML_AVAILABLE:
            try:
                logger.info(f"🛡️ Performing risk management checks...")
                stop_loss_pips = signal_data.stop_loss or 50
                
                risk_assessment = risk_manager.perform_all_risk_checks(
                    account_id=signal_data.account_id,
                    stop_loss_pips=stop_loss_pips,
                    symbol=signal_data.symbol,
                    position_size=signal_data.quantity,
                    confidence_score=credibility_score,
                    db=db
                )

                if not risk_assessment.get("approved"):
                    signal.status = "rejected"
                    rejection_reasons = risk_assessment.get("reasons_rejected", [])
                    signal.rejection_reason = f"Risk checks failed: {', '.join(rejection_reasons)}"
                    db.commit()
                    logger.warning(f"❌ Signal rejected by risk manager")
                    return {
                        "status": "rejected",
                        "signal_id": signal.id,
                        "reason": "Risk checks failed",
                        "confidence_score": credibility_score,
                        "message": "Position sizing or risk limits exceeded"
                    }

                optimized_position_size = risk_assessment.get("final_position_size", signal_data.quantity)
                signal.quantity = optimized_position_size
            except Exception as risk_error:
                logger.warning(f"⚠️  Risk check error: {risk_error} - continuing with signal")

        # Mark as validated & save
        signal.status = "validated"
        signal.processed_at = datetime.utcnow()
        db.commit()
        db.refresh(signal)

        logger.info(f"✅ Signal APPROVED: {signal.symbol} {signal.action}")

        return {
            "status": "success",
            "signal_id": signal.id,
            "account_id": signal.account_id,
            "symbol": signal.symbol,
            "action": signal.action,
            "quantity": signal_data.quantity,
            "optimized_quantity": signal.quantity,
            "confidence_score": credibility_score,
            "signal_status": signal.status,
            "message": f"Signal validated successfully"
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error processing signal: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== CRUD ENDPOINTS ====================

@router.post("/create")
async def create_signal_manual(signal_data: SignalManualCreate, db: Session = Depends(get_db)):
    """POST /api/v1/signals/create - Create manual signal from UI"""
    try:
        account = db.query(Account).filter(Account.id == signal_data.account_id).first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

        signal = Signal(
            id=str(uuid.uuid4()),
            account_id=signal_data.account_id,
            symbol=signal_data.symbol.upper(),
            action=signal_data.action.upper(),
            quantity=signal_data.quantity,
            strategy=signal_data.strategy,
            strategy_id=signal_data.strategy_id,
            status="PENDING",
            confidence_score=100.0,
            received_at=datetime.utcnow(),
            is_active=True
        )

        db.add(signal)
        db.commit()
        db.refresh(signal)

        logger.info(f"✅ Manual signal created: {signal.id} - {signal.symbol} ({signal.action})")

        return {
            "status": "success",
            "signal_id": signal.id,
            "message": "Signal created successfully"
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error creating signal: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def list_signals(
    account_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    symbol: Optional[str] = Query(None),
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """GET /api/v1/signals/list - List all signals with filters ✅ SAFE ATTRIBUTE ACCESS"""
    try:
        query = db.query(Signal).filter(Signal.is_active == True)
        
        if account_id:
            query = query.filter(Signal.account_id == account_id)
            logger.info(f"🔍 Filtering signals by account: {account_id}")
        
        if status:
            query = query.filter(Signal.status == status.upper())
        
        if symbol:
            query = query.filter(Signal.symbol == symbol.upper())

        signals = query.order_by(Signal.received_at.desc()).limit(limit).all()

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
                    "quantity": getattr(s, 'quantity', 0),
                    "confidence_score": getattr(s, 'confidence_score', 0),
                    "status": getattr(s, 'status', 'PENDING'),
                    "price": getattr(s, 'price', None),
                    "stop_loss": getattr(s, 'stop_loss', None),
                    "take_profit": getattr(s, 'take_profit', None),
                    "strategy_id": getattr(s, 'strategy_id', None),
                    "strategy": getattr(s, 'strategy', None),
                    "order_type": getattr(s, 'order_type', None),
                    "entry_price": getattr(s, 'entry_price', None),
                    "profit_loss": getattr(s, 'profit_loss', None),
                    "received_at": getattr(s, 'received_at', None).isoformat() if getattr(s, 'received_at', None) else None,
                    "processed_at": getattr(s, 'processed_at', None).isoformat() if getattr(s, 'processed_at', None) else None,
                    "filled_at": getattr(s, 'filled_at', None).isoformat() if getattr(s, 'filled_at', None) else None,
                    "created_at": getattr(s, 'created_at', None).isoformat() if getattr(s, 'created_at', None) else None,
                }
                for s in signals
            ]
        }

    except Exception as e:
        logger.error(f"❌ Error listing signals: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{signal_id}")
async def get_signal(signal_id: str, db: Session = Depends(get_db)):
    """GET /api/v1/signals/{signal_id} - Get specific signal"""
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
                "quantity": getattr(signal, 'quantity', 0),
                "confidence_score": getattr(signal, 'confidence_score', 0),
                "status": getattr(signal, 'status', 'PENDING'),
                "rejection_reason": getattr(signal, 'rejection_reason', None),
                "price": getattr(signal, 'price', None),
                "stop_loss": getattr(signal, 'stop_loss', None),
                "take_profit": getattr(signal, 'take_profit', None),
                "strategy": getattr(signal, 'strategy', None),
                "strategy_id": getattr(signal, 'strategy_id', None),
                "received_at": getattr(signal, 'received_at', None).isoformat() if getattr(signal, 'received_at', None) else None,
                "processed_at": getattr(signal, 'processed_at', None).isoformat() if getattr(signal, 'processed_at', None) else None,
            }
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error fetching signal: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{signal_id}")
async def update_signal(signal_id: str, signal_data: SignalUpdate, db: Session = Depends(get_db)):
    """PUT /api/v1/signals/{signal_id} - Update signal"""
    try:
        signal = db.query(Signal).filter(Signal.id == signal_id).first()

        if not signal:
            raise HTTPException(status_code=404, detail="Signal not found")

        if signal_data.status:
            signal.status = signal_data.status.upper()
            if signal_data.status.upper() == "FILLED":
                signal.filled_at = datetime.utcnow()

        if signal_data.entry_price is not None:
            signal.price = signal_data.entry_price

        if signal_data.profit_loss is not None:
            signal.profit_loss = signal_data.profit_loss

        signal.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(signal)

        logger.info(f"✅ Signal updated: {signal.id} → Status: {signal.status}")

        return {
            "status": "success",
            "signal_id": signal.id,
            "message": "Signal updated successfully"
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error updating signal: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{signal_id}")
async def delete_signal(signal_id: str, db: Session = Depends(get_db)):
    """DELETE /api/v1/signals/{signal_id} - Cancel signal (soft delete)"""
    try:
        signal = db.query(Signal).filter(Signal.id == signal_id).first()

        if not signal:
            raise HTTPException(status_code=404, detail="Signal not found")

        signal.is_active = False
        signal.status = "CANCELLED"
        signal.updated_at = datetime.utcnow()

        db.commit()

        logger.info(f"✅ Signal cancelled: {signal.id}")

        return {
            "status": "success",
            "message": "Signal cancelled successfully"
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error deleting signal: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== STATISTICS ENDPOINTS ====================

@router.get("/stats/{account_id}")
async def get_signal_stats(account_id: str, db: Session = Depends(get_db)):
    """GET /api/v1/signals/stats/{account_id} - Get statistics"""
    try:
        signals = db.query(Signal).filter(
            Signal.account_id == account_id,
            Signal.is_active == True
        ).all()

        if not signals:
            return {
                "status": "success",
                "account_id": account_id,
                "stats": {
                    "total_signals": 0,
                    "pending": 0,
                    "filled": 0,
                    "cancelled": 0,
                    "buy_signals": 0,
                    "sell_signals": 0,
                    "average_confidence": 0
                }
            }

        pending = len([s for s in signals if getattr(s, 'status', 'PENDING') == "PENDING"])
        filled = len([s for s in signals if getattr(s, 'status', 'PENDING') == "FILLED"])
        cancelled = len([s for s in signals if getattr(s, 'status', 'PENDING') == "CANCELLED"])
        buy = len([s for s in signals if s.action == "BUY"])
        sell = len([s for s in signals if s.action == "SELL"])
        avg_confidence = sum(getattr(s, 'confidence_score', 0) for s in signals) / len(signals) if signals else 0

        return {
            "status": "success",
            "account_id": account_id,
            "stats": {
                "total_signals": len(signals),
                "pending": pending,
                "filled": filled,
                "cancelled": cancelled,
                "buy_signals": buy,
                "sell_signals": sell,
                "average_confidence": round(avg_confidence, 2)
            }
        }

    except Exception as e:
        logger.error(f"❌ Error getting signal stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))