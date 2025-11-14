"""
🚀 FINAL SIGNALS.PY - COMPLETE & WORKING
✅ Supports account_id (UUID) OR account_name (IB account name)
✅ All CRUD endpoints working
✅ TradingView webhook fully functional
Location: /backend/app/routes/api/v1/signals.py
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.config import get_db
from app.database import Signal, Account
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Signals"])

try:
    from app.services.feature_engineer import FeatureEngineer
    from app.services.ml_model import ml_model
    from app.services.risk_manager import RiskManager
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False
    logger.warning("⚠️ ML services not available")

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

# ==================== WEBHOOK - TRADINGVIEW ✅ ====================

@router.post("/webhook")
async def receive_tradingview_signal(
    request: Request,
    db: Session = Depends(get_db),
    user_id: int = Query(default=1),
    account_id: str = Query(default=""),
    account_name: str = Query(default="")
):
    """📨 RECEIVE TRADINGVIEW WEBHOOK ALERTS
    
    Supports both:
    1. account_id (UUID): ?account_id=cc1c1462-df92-42cc-8943-14393cbc5e49
    2. account_name (IB name): ?account_name=DU2348080
    """
    
    print("\n" + "=" * 60)
    print("🚨 TRADINGVIEW ALERT RECEIVED!")
    print("=" * 60)
    
    TRADINGVIEW_PASSPHRASE = "Nits@signal"
    
    try:
        body = await request.json()
        print(f"📨 Body: {body}")
        
        passphrase = body.get("passphrase", "")
        print(f"🔐 Passphrase: {passphrase}")
        
        if passphrase != TRADINGVIEW_PASSPHRASE:
            print(f"❌ MISMATCH!")
            raise HTTPException(status_code=401, detail="Invalid passphrase")
        
        print("✅ Passphrase OK!")
        
        ticker = body.get("ticker", "UNKNOWN")
        action = body.get("action", "").upper()
        quantity = int(float(body.get("quantity", 1)))
        price = float(body.get("price", 0))
        
        print(f"📊 Signal: {action} {quantity} {ticker} @ {price}")
        
        # ✅ Support both account_id and account_name
        final_account_id = account_id
        final_account_name = account_name
        
        # If account_name provided, look it up
        if account_name and not account_id:
            print(f"🔍 Looking up account by name: {account_name}")
            account = db.query(Account).filter(Account.account_name == account_name).first()
            if account:
                final_account_id = account.id
                print(f"✅ Found account: {account_name} = {final_account_id}")
            else:
                print(f"❌ Account not found: {account_name}")
                raise HTTPException(status_code=400, detail=f"Account not found: {account_name}")
        
        if not final_account_id:
            print("❌ account_id or account_name required!")
            raise HTTPException(status_code=400, detail="account_id or account_name required")
        
        # Verify account exists
        account = db.query(Account).filter(Account.id == final_account_id).first()
        if not account:
            print(f"❌ Account not found: {final_account_id}")
            raise HTTPException(status_code=400, detail="Account not found")
        
        print(f"✅ Account found: {final_account_id}")
        
        # ✅ USE RAW SQL INSERT with ALL required fields
        now = datetime.utcnow()
        
        result = db.execute(text("""
            INSERT INTO signals (
                user_id, account_id, symbol, action, quantity, 
                status, entry_price, is_active, created_at, received_at
            ) VALUES (
                :user_id, :account_id, :symbol, :action, :quantity,
                :status, :entry_price, :is_active, :created_at, :received_at
            ) RETURNING id
        """), {
            "user_id": user_id,
            "account_id": final_account_id,
            "symbol": ticker.upper(),
            "action": action,
            "quantity": quantity,
            "status": "PENDING",
            "entry_price": price,
            "is_active": True,
            "created_at": now,
            "received_at": now
        })
        
        signal_id = result.scalar()
        db.commit()
        
        print(f"💾 Signal saved: {signal_id}")
        print(f"✅ SUCCESS!")
        print("=" * 60 + "\n")
        
        return {
            "status": "success",
            "signal_id": signal_id,
            "symbol": ticker.upper(),
            "action": action,
            "quantity": quantity,
            "account_id": final_account_id,
            "account_name": final_account_name or account.account_name,
            "message": "Signal received from TradingView"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ ERROR: {str(e)}")
        print("=" * 60 + "\n")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== CRUD ENDPOINTS ====================

@router.post("/create")
async def create_signal_manual(signal_data: SignalManualCreate, db: Session = Depends(get_db)):
    """POST /api/v1/signals/create"""
    try:
        account = db.query(Account).filter(Account.id == signal_data.account_id).first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

        signal = Signal(
            account_id=signal_data.account_id,
            symbol=signal_data.symbol.upper(),
            action=signal_data.action.upper(),
            quantity=signal_data.quantity,
            strategy=signal_data.strategy,
            strategy_id=signal_data.strategy_id,
            status="PENDING",
            is_active=True,
            created_at=datetime.utcnow(),
            received_at=datetime.utcnow()
        )
        
        signal.user_id = 1

        db.add(signal)
        db.commit()
        db.refresh(signal)

        logger.info(f"✅ Signal created: {signal.id}")

        return {
            "status": "success",
            "signal_id": signal.id,
            "message": "Signal created successfully"
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def list_signals(
    account_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    symbol: Optional[str] = Query(None),
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """GET /api/v1/signals/list"""
    try:
        query = db.query(Signal).filter(Signal.is_active == True)

        if account_id:
            query = query.filter(Signal.account_id == account_id)

        if status:
            query = query.filter(Signal.status == status.upper())

        if symbol:
            query = query.filter(Signal.symbol == symbol.upper())

        signals = query.order_by(Signal.created_at.desc()).limit(limit).all()

        return {
            "status": "success",
            "count": len(signals),
            "signals": [
                {
                    "id": s.id,
                    "user_id": s.user_id if hasattr(s, 'user_id') else None,
                    "account_id": s.account_id,
                    "symbol": s.symbol,
                    "action": s.action,
                    "quantity": s.quantity,
                    "status": s.status,
                    "entry_price": s.entry_price,
                    "profit_loss": s.profit_loss,
                    "strategy_id": s.strategy_id,
                    "created_at": s.created_at.isoformat() if s.created_at else None,
                }
                for s in signals
            ]
        }

    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
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
                "user_id": signal.user_id if hasattr(signal, 'user_id') else None,
                "account_id": signal.account_id,
                "symbol": signal.symbol,
                "action": signal.action,
                "quantity": signal.quantity,
                "status": signal.status,
                "entry_price": signal.entry_price,
                "profit_loss": signal.profit_loss,
                "created_at": signal.created_at.isoformat() if signal.created_at else None,
            }
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{signal_id}")
async def update_signal(signal_id: int, signal_data: SignalUpdate, db: Session = Depends(get_db)):
    """PUT /api/v1/signals/{signal_id}"""
    try:
        signal = db.query(Signal).filter(Signal.id == signal_id).first()
        if not signal:
            raise HTTPException(status_code=404, detail="Signal not found")

        if signal_data.status:
            signal.status = signal_data.status.upper()
            if signal_data.status.upper() == "FILLED":
                signal.filled_at = datetime.utcnow()

        if signal_data.entry_price is not None:
            signal.entry_price = signal_data.entry_price

        if signal_data.profit_loss is not None:
            signal.profit_loss = signal_data.profit_loss

        db.commit()
        db.refresh(signal)

        logger.info(f"✅ Signal updated: {signal.id}")

        return {
            "status": "success",
            "signal_id": signal.id,
            "message": "Signal updated successfully"
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{signal_id}")
async def delete_signal(signal_id: int, db: Session = Depends(get_db)):
    """DELETE /api/v1/signals/{signal_id}"""
    try:
        signal = db.query(Signal).filter(Signal.id == signal_id).first()
        if not signal:
            raise HTTPException(status_code=404, detail="Signal not found")

        signal.is_active = False
        signal.status = "CANCELLED"

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
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats/{account_id}")
async def get_signal_stats(account_id: str, db: Session = Depends(get_db)):
    """GET /api/v1/signals/stats/{account_id}"""
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
                }
            }

        return {
            "status": "success",
            "account_id": account_id,
            "stats": {
                "total_signals": len(signals),
                "pending": len([s for s in signals if s.status == "PENDING"]),
                "filled": len([s for s in signals if s.status == "FILLED"]),
                "cancelled": len([s for s in signals if s.status == "CANCELLED"]),
                "buy_signals": len([s for s in signals if s.action == "BUY"]),
                "sell_signals": len([s for s in signals if s.action == "SELL"]),
            }
        }

    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))