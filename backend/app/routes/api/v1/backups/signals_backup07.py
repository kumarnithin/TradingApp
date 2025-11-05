"""
Phase 1: Updated Signals Route with ML Scoring
Location: /backend/app/routes/api/v1/signals.py (UPDATED)
"""

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from app.config import get_db
from app.database import Signal, Trade, Account, User
from app.services.feature_engineer import FeatureEngineer
from app.services.ml_model import ml_model
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
import logging
import traceback


logger = logging.getLogger(__name__)

router = APIRouter(tags=["Signals"])

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

# ==================== ENDPOINTS ====================

@router.post("/webhook")
async def receive_tradingview_signal(signal_data: SignalCreate, db: Session = Depends(get_db)):
    """
    🤖 PHASE 1: Receives signal and scores with ML model
    
    POST /api/v1/signals/webhook
    
    Workflow:
    1. Receive signal from TradingView
    2. Extract features (hour, symbol, win_rate, etc)
    3. Score with ML model (0-100%)
    4. If score ≥ 50%: Execute signal ✅
    5. If score < 50%: Reject signal ❌
    """
    try:
        # ✅ STEP 1: Validate account exists
        if signal_data.account_id:
            account = db.query(Account).filter(Account.id == signal_data.account_id).first()
            if not account:
                raise HTTPException(status_code=400, detail=f"Account {signal_data.account_id} not found")
        
        # ✅ STEP 2: Create signal record (initially pending)
        signal = Signal(
            account_id=signal_data.account_id,
            user_id=signal_data.user_id,
            strategy_id=signal_data.strategy_id,
            symbol=signal_data.symbol,
            action=signal_data.action.upper(),
            quantity=signal_data.quantity,
            order_type=signal_data.order_type,
            price=signal_data.price,
            stop_loss=signal_data.stop_loss,
            take_profit=signal_data.take_profit,
            status="pending",
            confidence_score=0,  # Will be updated
            received_at=datetime.utcnow()
        )
        
        db.add(signal)
        db.flush()  # Get signal ID without committing
        
        # ✅ STEP 3: Extract features for ML
        logger.info(f"🔍 Extracting features for {signal.symbol}...")
        fe = FeatureEngineer(db)
        features = fe.extract_features(signal)
        feature_list = fe.features_to_list(features)
        
        # ✅ STEP 4: Score signal with ML model
        logger.info(f"🤖 Scoring signal with ML model...")
        credibility_score = ml_model.score_signal(feature_list)
        signal.confidence_score = credibility_score
        
        # ✅ STEP 5: Decision engine - execute or reject
        execute_threshold = 50.0  # Can be adjusted
        should_execute = ml_model.should_execute_signal(credibility_score, execute_threshold)
        
        if should_execute:
            signal.status = "validated"
            action = "✅ ACCEPTED"
            logger.info(f"✅ Signal accepted: {signal.symbol} {signal.action} (confidence: {credibility_score:.1f}%)")
        else:
            signal.status = "rejected"
            signal.rejection_reason = f"Low credibility score: {credibility_score:.1f}% (threshold: {execute_threshold}%)"
            action = "❌ REJECTED"
            logger.warning(f"❌ Signal rejected: {signal.symbol} {signal.action} (confidence: {credibility_score:.1f}%)")
        
        db.commit()
        db.refresh(signal)
        
        return {
            "status": "success",
            "signal_id": signal.id,
            "account_id": signal.account_id,
            "symbol": signal.symbol,
            "action": signal.action,
            "confidence_score": credibility_score,
            "signal_status": signal.status,
            "ml_action": action,
            "message": f"Signal received and scored (confidence: {credibility_score:.1f}%)"
        }
    
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error processing signal: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def list_signals(
    account_id: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    GET /api/v1/signals/list?account_id=xxx
    List signals with ML credibility scores
    """
    try:
        query = db.query(Signal)
        
        if account_id:
            query = query.filter(Signal.account_id == account_id)
        
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
                    "confidence_score": s.confidence_score,  # 🤖 ML SCORE
                    "status": s.status,  # pending, validated, rejected
                    "price": s.price,
                    "stop_loss": s.stop_loss,
                    "take_profit": s.take_profit,
                    "strategy_id": s.strategy_id,
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
async def get_signal(signal_id: int, db: Session = Depends(get_db)):
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
                "confidence_score": signal.confidence_score,  # 🤖 ML SCORE
                "status": signal.status,
                "rejection_reason": signal.rejection_reason,
                "price": signal.price,
                "stop_loss": signal.stop_loss,
                "take_profit": signal.take_profit,
                "received_at": signal.received_at.isoformat() if signal.received_at else None,
            }
        }
    
    except Exception as e:
        logger.error(f"❌ Error fetching signal: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

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

@router.get("/stats/confidence")
async def confidence_stats(db: Session = Depends(get_db)):
    """
    GET /api/v1/signals/stats/confidence
    Get signal credibility statistics
    """
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
        
        accepted = sum(1 for s in signals if s.status == 'validated')
        rejected = sum(1 for s in signals if s.status == 'rejected')
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
        db.rollback()
        logger.error(f"❌ Error processing signal: {str(e)}")
        traceback.print_exc()    # THIS PRINTS THE REAL PYTHON ERROR
        raise HTTPException(status_code=500, detail=str(e))
