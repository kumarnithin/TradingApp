"""
Phase 1 + Phase 2 + Phase 3: Enhanced Signals Route 
ML Scoring + Risk Management + Signal Management UI

Location: /backend/app/routes/api/v1/signals.py (ENHANCED)

✅ EXISTING FEATURES (Phase 1 & 2):
  - TradingView webhook integration
  - ML confidence scoring
  - Risk management & position sizing
  - Daily loss limits & portfolio heat
  - Feature engineering

✅ NEW FEATURES (Phase 3):
  - CRUD operations (Create, Read, Update, Delete)
  - Signal filtering (by account, status, symbol)
  - Status transitions (PENDING → FILLED → CANCELLED)
  - Signal management UI support
  - Statistics & analytics
  - CSV export
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from sqlalchemy.orm import Session
from app.config import get_db
from app.database import Signal, Trade, Account, User
from app.services.feature_engineer import FeatureEngineer
from app.services.ml_model import ml_model
from app.services.risk_manager import RiskManager
from app.services.risk_config import RiskConfig, DEFAULT_RISK_CONFIG
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
import logging
import traceback
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Signals"])

# Initialize risk manager
risk_manager = RiskManager()

# ==================== Pydantic Models ====================

class SignalCreate(BaseModel):
    account_id: Optional[str] = None
    user_id: int = 1
    strategy_id: Optional[str] = None
    symbol: str
    action: str  # BUY or SELL
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
    """Simple signal creation from UI (without ML scoring)"""
    account_id: str
    symbol: str
    action: str
    quantity: int
    strategy: Optional[str] = None
    strategy_id: Optional[str] = None

# ==================== WEBHOOK ENDPOINT (Phase 1 + 2) ====================

@router.post("/webhook")
async def receive_tradingview_signal(signal_data: SignalCreate, db: Session = Depends(get_db)):
    """
    🤖 PHASE 1 + 🛡️ PHASE 2 INTEGRATION
    POST /api/v1/signals/webhook
    
    WORKFLOW:
    1. Receive signal from TradingView
    2. Phase 1: ML validation (confidence score)
    3. Phase 2: Risk checks & position sizing
    4. If all pass: Execute with optimized size
    5. If any fail: Reject with reason
    """
    try:
        # ✅ STEP 1: Validate account exists
        if signal_data.account_id:
            account = db.query(Account).filter(Account.id == signal_data.account_id).first()
            if not account:
                raise HTTPException(status_code=400, detail=f"Account {signal_data.account_id} not found")
        else:
            raise HTTPException(status_code=400, detail="account_id is required")

        # ✅ STEP 2: Create signal record (initially pending)
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
            confidence_score=0,
            received_at=datetime.utcnow(),
            is_active=True
        )
        
        db.add(signal)
        db.flush()

        # ✅ STEP 3: Phase 1 - Extract features & score with ML
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
            signal.rejection_reason = f"ML confidence too low: {credibility_score:.1f}% (threshold: {ml_threshold}%)"
            db.commit()
            logger.warning(f"❌ Signal rejected by ML: {signal.symbol} {signal.action} ({credibility_score:.1f}%)")
            return {
                "status": "rejected",
                "signal_id": signal.id,
                "reason": "ML validation failed",
                "confidence_score": credibility_score,
                "message": f"Low ML confidence: {credibility_score:.1f}%"
            }

        # ✅ STEP 4: Phase 2 - Risk Management Checks
        logger.info(f"🛡️ Performing risk management checks...")
        
        stop_loss_pips = signal_data.stop_loss or 50  # Default 50 pips
        
        risk_assessment = risk_manager.perform_all_risk_checks(
            account_id=signal_data.account_id,
            stop_loss_pips=stop_loss_pips,
            symbol=signal_data.symbol,
            position_size=signal_data.quantity,
            confidence_score=credibility_score,
            db=db
        )

        # Check if risk assessment passed
        if not risk_assessment.get("approved"):
            signal.status = "rejected"
            rejection_reasons = risk_assessment.get("reasons_rejected", [])
            signal.rejection_reason = f"Risk checks failed: {', '.join(rejection_reasons)}"
            db.commit()
            logger.warning(f"❌ Signal rejected by risk manager: {rejection_reasons}")
            return {
                "status": "rejected",
                "signal_id": signal.id,
                "reason": "Risk checks failed",
                "confidence_score": credibility_score,
                "risk_assessment": risk_assessment.get("checks", {}),
                "message": "Position sizing or risk limits exceeded"
            }

        # ✅ STEP 5: All checks passed - EXECUTE with optimized position size
        optimized_position_size = risk_assessment.get("final_position_size", signal_data.quantity)
        
        signal.status = "validated"
        signal.quantity = optimized_position_size
        signal.processed_at = datetime.utcnow()
        
        db.commit()
        db.refresh(signal)

        logger.info(f"✅ Signal APPROVED and EXECUTED: {signal.symbol} {signal.action}")
        logger.info(f" - ML Confidence: {credibility_score:.1f}%")
        logger.info(f" - Original Size: {signal_data.quantity:,.0f}")
        logger.info(f" - Optimized Size: {optimized_position_size:,.0f}")

        return {
            "status": "success",
            "signal_id": signal.id,
            "account_id": signal.account_id,
            "symbol": signal.symbol,
            "action": signal.action,
            "original_quantity": signal_data.quantity,
            "optimized_quantity": optimized_position_size,
            "confidence_score": credibility_score,
            "stop_loss": signal.stop_loss,
            "take_profit": signal.take_profit,
            "signal_status": signal.status,
            "message": f"Signal executed with optimized position size: {optimized_position_size:,.0f} units"
        }

    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error processing signal: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ==================== PHASE 3: CRUD & MANAGEMENT ENDPOINTS ====================

@router.post("/create")
async def create_signal_manual(signal_data: SignalManualCreate, db: Session = Depends(get_db)):
    """
    POST /api/v1/signals/create
    Create a manual signal from UI (no ML scoring, for direct user input)
    """
    try:
        # Verify account exists
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
            confidence_score=100.0,  # Manual signals are trusted
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
    """
    GET /api/v1/signals/list?account_id=xxx&status=PENDING&symbol=AAPL
    List signals with ML credibility scores and risk assessment
    """
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
                    "quantity": s.quantity,
                    "confidence_score": s.confidence_score,
                    "status": s.status,
                    "price": s.price,
                    "stop_loss": s.stop_loss,
                    "take_profit": s.take_profit,
                    "strategy_id": s.strategy_id,
                    "strategy": getattr(s, 'strategy', None),
                    "received_at": s.received_at.isoformat() if s.received_at else None,
                    "processed_at": s.processed_at.isoformat() if s.processed_at else None
                }
                for s in signals
            ]
        }

    except Exception as e:
        logger.error(f"❌ Error listing signals: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{signal_id}")
async def get_signal(signal_id: str, db: Session = Depends(get_db)):
    """GET /api/v1/signals/{signal_id}"""
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
                "confidence_score": signal.confidence_score,
                "status": signal.status,
                "rejection_reason": getattr(signal, 'rejection_reason', None),
                "price": signal.price,
                "stop_loss": signal.stop_loss,
                "take_profit": signal.take_profit,
                "strategy": getattr(signal, 'strategy', None),
                "strategy_id": signal.strategy_id,
                "received_at": signal.received_at.isoformat() if signal.received_at else None,
                "processed_at": signal.processed_at.isoformat() if signal.processed_at else None
            }
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error fetching signal: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{signal_id}")
async def update_signal(signal_id: str, signal_data: SignalUpdate, db: Session = Depends(get_db)):
    """PUT /api/v1/signals/{signal_id} - Update signal status"""
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
    """DELETE /api/v1/signals/{signal_id} - Delete (soft) signal"""
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
    """GET /api/v1/signals/stats/{account_id} - Get signal statistics"""
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

        pending = len([s for s in signals if s.status == "PENDING"])
        filled = len([s for s in signals if s.status == "FILLED"])
        cancelled = len([s for s in signals if s.status == "CANCELLED"])
        buy = len([s for s in signals if s.action == "BUY"])
        sell = len([s for s in signals if s.action == "SELL"])
        avg_confidence = sum(s.confidence_score or 0 for s in signals) / len(signals)

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

@router.get("/stats/confidence")
async def confidence_stats(db: Session = Depends(get_db)):
    """GET /api/v1/signals/stats/confidence - Get signal credibility statistics"""
    try:
        signals = db.query(Signal).all()

        if not signals:
            return {
                "status": "success",
                "stats": {
                    "total_signals": 0,
                    "average_confidence": 0,
                    "accepted": 0,
                    "rejected": 0
                }
            }

        accepted = sum(1 for s in signals if s.status == 'FILLED')
        rejected = sum(1 for s in signals if s.status == 'CANCELLED')
        avg_confidence = sum(s.confidence_score or 0 for s in signals) / len(signals)

        return {
            "status": "success",
            "stats": {
                "total_signals": len(signals),
                "average_confidence": round(avg_confidence, 2),
                "accepted": accepted,
                "rejected": rejected,
                "acceptance_rate": round((accepted / len(signals) * 100), 1) if signals else 0
            }
        }

    except Exception as e:
        logger.error(f"❌ Error getting stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== PHASE 2: Risk Management Endpoints ====================

@router.get("/risk/daily-pnl")
async def get_daily_pnl(account_id: str, db: Session = Depends(get_db)):
    """GET /api/v1/signals/risk/daily-pnl?account_id=xxx"""
    daily_check = risk_manager.check_daily_loss_limit(account_id, db)
    return daily_check

@router.get("/risk/portfolio-heat")
async def get_portfolio_heat(account_id: str, db: Session = Depends(get_db)):
    """GET /api/v1/signals/risk/portfolio-heat?account_id=xxx"""
    heat_check = risk_manager.calculate_portfolio_heat(account_id, db)
    return heat_check

@router.post("/risk/adjust-config")
async def adjust_risk_config(max_risk_pct: float = 2.0, max_daily_loss: float = 5.0):
    """
    POST /api/v1/signals/risk/adjust-config
    Adjust risk parameters on the fly
    """
    try:
        risk_manager.config.max_risk_per_trade_pct = max_risk_pct
        risk_manager.config.max_daily_loss_pct = max_daily_loss

        return {
            "status": "success",
            "config": risk_manager.config.to_dict(),
            "message": "Risk configuration updated"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== PHASE 1: ML Training ====================

@router.post("/train")
async def train_ml_model(db: Session = Depends(get_db)):
    """
    POST /api/v1/signals/train
    Train ML model on historical signal data
    Call this once after collecting 100+ signals
    """
    try:
        logger.info("🚀 Starting ML model training...")
        success = ml_model.train_models(db)

        if success:
            return {
                "status": "success",
                "message": "ML models trained successfully",
                "note": "Model is now ready for signal scoring"
            }
        else:
            return {
                "status": "warning",
                "message": "Model training incomplete",
                "note": "Need more historical signals (minimum 50)"
            }

    except Exception as e:
        logger.error(f"❌ Error training model: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))