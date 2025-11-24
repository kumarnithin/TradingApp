"""
🔧 CORRECTED trades.py - FIXES IB CONNECTION CHECK

Location: /backend/app/routes/api/v1/trades.py

✅ FIXED:
1. Checks is_ib_connected flag in DATABASE (not ib_client)
2. Removed wrong ib_client.isConnected() calls
3. Only fetches from IB if account has flag set
"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.orm import Session
from app.config import get_db
from app.database import Trade, Account, Signal, User, AuditLog
from app.services.risk_manager import risk_manager
from app.services.order_executor import OrderExecutor
import json
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel
import logging
import uuid

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Trades"])

class TradeCreate(BaseModel):
    user_id: int
    account_id: str
    symbol: str
    action: str
    entry_price: float
    quantity: int
    trade_type: str = "Market"
    commission: Optional[float] = 0.0
    notes: Optional[str] = None
    simulate: Optional[bool] = False

class TradeUpdate(BaseModel):
    exit_price: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    commission: Optional[float] = None

def calculate_profit_loss(entry_price: float, exit_price: Optional[float], quantity: int, action: str, commission: float = 0.0):
    if not exit_price:
        return 0.0, 0.0
    if action.upper() == "BUY":
        profit_loss = (exit_price - entry_price) * quantity - commission
    else:
        profit_loss = (entry_price - exit_price) * quantity - commission
    entry_cost = entry_price * quantity
    win_percentage = (profit_loss / entry_cost) * 100 if entry_cost > 0 else 0
    return profit_loss, win_percentage

@router.post("/create")
async def create_trade(trade_data: TradeCreate, db: Session = Depends(get_db)):
    try:
        # Validate account
        account = db.query(Account).filter(Account.id == trade_data.account_id).first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

        # Validate user exists
        user = db.query(User).filter(User.id == trade_data.user_id).first()
        if not user:
            raise HTTPException(status_code=400, detail="Invalid user_id: user not found")

        # Run lightweight risk checks
        try:
            risk_result = risk_manager.perform_all_risk_checks(
                trade_data.account_id,
                0,  # stop_loss_pips unknown at create time
                trade_data.symbol,
                trade_data.quantity,
                50,  # default confidence
                db
            )
        except Exception as re:
            risk_result = {"approved": True}

        if not risk_result.get("approved", True):
            # Create a rejected trade record for auditing and visibility
            trade = Trade(
                id=str(uuid.uuid4()),
                account_id=trade_data.account_id,
                user_id=trade_data.user_id,
                symbol=trade_data.symbol.upper(),
                action=trade_data.action.upper(),
                entry_price=trade_data.entry_price,
                quantity=trade_data.quantity,
                trade_type=trade_data.trade_type,
                commission=trade_data.commission or 0.0,
                notes=(trade_data.notes or "") + " | RISK_REJECT: " + ",".join(risk_result.get("reasons_rejected", [])),
                status="REJECTED",
                entry_at=datetime.utcnow(),
                created_at=datetime.utcnow(),
                is_active=False
            )
            db.add(trade)
            db.commit()
            db.refresh(trade)

            # Audit log
            audit = AuditLog(
                user_id=trade_data.user_id,
                account_id=trade_data.account_id,
                signal_id=None,
                action="RISK_REJECT",
                payload=risk_result,
                simulated=bool(trade_data.simulate),
                status="REJECTED",
                message="Pre-trade risk checks failed"
            )
            db.add(audit)
            db.commit()

            logger.warning(f"❌ Trade rejected by risk manager: {risk_result}")
            return {"status": "rejected", "reason": risk_result}

        trade = Trade(
            id=str(uuid.uuid4()),
            account_id=trade_data.account_id,
            user_id=trade_data.user_id,
            symbol=trade_data.symbol.upper(),
            action=trade_data.action.upper(),
            entry_price=trade_data.entry_price,
            quantity=trade_data.quantity,
            trade_type=trade_data.trade_type,
            commission=trade_data.commission or 0.0,
            notes=trade_data.notes,
            status="OPEN",
            entry_at=datetime.utcnow(),
            created_at=datetime.utcnow(),
            is_active=True
        )
        db.add(trade)
        db.commit()
        db.refresh(trade)
        logger.info(f"✅ Trade record created: {trade.id}")

        # Execute order (or simulate)
        try:
            executor = OrderExecutor()
            result = await executor.execute_market_order(trade.symbol, trade.action, trade.quantity, simulate=bool(trade_data.simulate))
        except Exception as ex:
            result = {"status": "error", "message": str(ex)}

        # Persist audit log for the order attempt
        audit = AuditLog(
            user_id=trade_data.user_id,
            account_id=trade_data.account_id,
            signal_id=None,
            action="PLACE_ORDER",
            payload=result,
            simulated=bool(trade_data.simulate),
            status=("SUCCESS" if result.get("status") == "success" else ("SIMULATED" if result.get("status") == "simulated" else "ERROR")),
            message=result.get("message") or result.get("status")
        )
        db.add(audit)

        # Record IB order id if present
        try:
            if result.get("order_id"):
                trade.ibkr_order_id = str(result.get("order_id"))
                trade.updated_at = datetime.utcnow()
                db.add(trade)
        except Exception:
            pass

        db.commit()
        db.refresh(trade)
        logger.info(f"✅ Trade created: {trade.id} - {trade.symbol}")
        return {"status": "success", "trade_id": trade.id, "message": "Trade created successfully", "order_result": result}
        logger.info(f"✅ Trade created: {trade.id} - {trade.symbol}")
        return {"status": "success", "trade_id": trade.id, "message": "Trade created successfully"}
    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error creating trade: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def list_trades(
    account_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    symbol: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    try:
        query = db.query(Trade).filter(Trade.is_active == True)
        if account_id:
            query = query.filter(Trade.account_id == account_id)
            logger.info(f"🔍 Filtering trades by account: {account_id}")
        if status_filter:
            query = query.filter(Trade.status == status_filter.upper())
        if symbol:
            query = query.filter(Trade.symbol == symbol.upper())
        
        trades = query.order_by(Trade.created_at.desc()).all()
        return {
            "status": "success",
            "count": len(trades),
            "trades": [{
                "id": t.id,
                "account_id": t.account_id,
                "symbol": t.symbol,
                "action": t.action,
                "entry_price": t.entry_price,
                "exit_price": t.exit_price,
                "quantity": t.quantity,
                "trade_type": t.trade_type,
                "status": t.status,
                "profit_loss": t.profit_loss,
                "win_percentage": t.win_percentage,
                "commission": t.commission,
                "notes": t.notes,
                "entry_at": t.entry_at.isoformat() if t.entry_at else None,
                "exit_at": t.exit_at.isoformat() if t.exit_at else None,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            } for t in trades]
        }
    except Exception as e:
        logger.error(f"❌ Error listing trades: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list-from-signals")
async def list_trades_from_signals(
    account_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    symbol: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Fetch trades from TradingView signals only"""
    try:
        query = db.query(Signal).filter(Signal.status == "FILLED", Signal.is_active == True)
        if account_id:
            query = query.filter(Signal.account_id == account_id)
        
        filled_signals = query.order_by(Signal.filled_at.desc()).all()
        trades = []
        for signal in filled_signals:
            trade = {
                "id": f"SIGNAL-{signal.id}",
                "signal_id": signal.id,
                "account_id": signal.account_id,
                "symbol": signal.symbol,
                "action": signal.action,
                "quantity": signal.quantity,
                "entry_price": signal.entry_price,
                "exit_price": None,
                "profit_loss": None,
                "win_percentage": None,
                "status": "OPEN",
                "trade_type": "Market",
                "commission": 0.0,
                "entry_at": signal.filled_at.isoformat() if signal.filled_at else None,
                "exit_at": None,
                "created_at": signal.received_at.isoformat() if signal.received_at else None,
                "notes": "From TradingView Signal",
                "source": "TradingView"
            }
            trades.append(trade)
        
        if status_filter:
            trades = [t for t in trades if t.get("status", "").upper() == status_filter.upper()]
        if symbol:
            trades = [t for t in trades if symbol.upper() in t.get("symbol", "").upper()]
        
        return {"status": "success", "count": len(trades), "account_id": account_id, "trades": trades}
    except Exception as e:
        logger.error(f"❌ Error listing trades from signals: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ✅ ONLY IB POSITIONS - NO SIGNALS!
@router.get("/list-from-ib")
async def list_trades_from_ib(
    account_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    symbol: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Fetch ONLY open positions from Interactive Brokers - NO SIGNALS!
    Pure IB live positions data.
    """
    try:
        if not account_id:
            raise HTTPException(status_code=400, detail="account_id required")
        
        account = db.query(Account).filter(Account.id == account_id).first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        
        logger.info(f"📡 [IB Positions] Fetching for account: {account.account_name}")
        
        # ✅ CHECK DATABASE FLAG (not ib_client!)
        is_ib_connected = getattr(account, 'is_ib_connected', False)
        
        trades = []
        
        # ONLY fetch from IB if connected (check database flag)
        if is_ib_connected:
            try:
                from app.routes.api.v1.ib import ib_client

                if not ib_client:
                    logger.warning(f"⚠️  [IB] ib_client is None")
                    raise HTTPException(status_code=503, detail="IB client not available")

                logger.info(f"🔗 [IB] Fetching open positions for {account.ib_account_number}")

                # Prefer service async helper when available
                positions = []
                try:
                    if hasattr(ib_client, 'get_positions'):
                        # get_positions() in service returns a list of simple dicts
                        positions = await ib_client.get_positions()
                        logger.info(f"📊 [IB] get_positions() returned {len(positions)} items (service)")
                    elif hasattr(ib_client, 'ib'):
                        # Fallback to underlying IB object's positions
                        positions = list(ib_client.ib.positions())
                        logger.info(f"📊 [IB] ib.positions() returned {len(positions)} items (ib_insync)")
                    else:
                        positions = []
                except Exception as pos_e:
                    logger.warning(f"⚠️ [IB] Error fetching positions via client: {pos_e}")
                    positions = []

                # Normalize and build trades from positions supporting both service dicts and ib_insync objects
                position_count = 0
                for position in positions:
                    try:
                        # service format: dict with keys 'symbol','position','avgCost','account'
                        if isinstance(position, dict):
                            symbol = position.get('symbol')
                            quantity = position.get('position', 0)
                            avg_cost = position.get('avgCost') or position.get('averageCost') or 0
                            account_name = position.get('account') or account.account_name
                            market_price = None
                            entry_price = (avg_cost / abs(quantity)) if quantity else (market_price or 0)
                        else:
                            # ib_insync Position object
                            contract = getattr(position, 'contract', None)
                            symbol = contract.symbol if contract else getattr(position, 'symbol', None)
                            quantity = getattr(position, 'position', 0)
                            market_price = getattr(position, 'marketPrice', None) or getattr(position, 'marketPrice', 0)
                            avg_cost = getattr(position, 'averageCost', None) or getattr(position, 'avgCost', None) or 0
                            entry_price = (avg_cost / abs(quantity)) if quantity else (market_price or 0)

                        action = "BUY" if quantity > 0 else "SELL"
                        trade = {
                            "id": f"IB-{symbol}-{account.id}-{position_count}",
                            "account_id": account.id,
                            "symbol": symbol,
                            "action": action,
                            "quantity": abs(int(quantity)),
                            "entry_price": float(entry_price or 0),
                            "exit_price": None,
                            "market_price": float(market_price) if market_price is not None else None,
                            "profit_loss": None,
                            "win_percentage": None,
                            "status": "OPEN",
                            "trade_type": "Market",
                            "commission": 0.0,
                            "entry_at": None,
                            "exit_at": None,
                            "created_at": datetime.utcnow().isoformat(),
                            "notes": "IB Live Position",
                            "source": "Interactive Brokers"
                        }
                        trades.append(trade)
                        position_count += 1
                    except Exception as pe:
                        logger.warning(f"⚠️  [IB] Error processing position: {str(pe)}")
                        continue

                logger.info(f"✅ [IB] Fetched {position_count} open positions from IB")
                    
            except HTTPException as he:
                raise he
            except Exception as e:
                logger.error(f"❌ [IB] Error fetching positions: {str(e)}")
                # Don't fail completely, just log and return empty list
                logger.warning(f"⚠️  Returning empty positions list due to error")
                trades = []
        else:
            logger.warning(f"⚠️  [IB] Account not IB-connected: {account.account_name}")
            raise HTTPException(status_code=400, detail="Account is not connected to Interactive Brokers")
        
        # Apply filters
        if status_filter:
            trades = [t for t in trades if t.get("status", "").upper() == status_filter.upper()]
        
        if symbol:
            trades = [t for t in trades if symbol.upper() in t.get("symbol", "").upper()]
        
        return {
            "status": "success",
            "count": len(trades),
            "account_id": account_id,
            "account_name": account.account_name,
            "is_ib_connected": is_ib_connected,
            "trades": trades,
            "source": "Interactive Brokers Live Positions"
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error listing trades from IB: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{trade_id}")
async def get_trade(trade_id: str, db: Session = Depends(get_db)):
    try:
        trade = db.query(Trade).filter(Trade.id == trade_id).first()
        if not trade:
            raise HTTPException(status_code=404, detail="Trade not found")
        return {
            "status": "success",
            "trade": {
                "id": trade.id,
                "account_id": trade.account_id,
                "symbol": trade.symbol,
                "action": trade.action,
                "entry_price": trade.entry_price,
                "exit_price": trade.exit_price,
                "quantity": trade.quantity,
                "trade_type": trade.trade_type,
                "status": trade.status,
                "profit_loss": trade.profit_loss,
                "win_percentage": trade.win_percentage,
                "commission": trade.commission,
                "notes": trade.notes,
                "entry_at": trade.entry_at.isoformat() if trade.entry_at else None,
                "exit_at": trade.exit_at.isoformat() if trade.exit_at else None,
                "created_at": trade.created_at.isoformat() if trade.created_at else None,
            }
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error fetching trade: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{trade_id}")
async def update_trade(trade_id: str, trade_data: TradeUpdate, db: Session = Depends(get_db)):
    try:
        trade = db.query(Trade).filter(Trade.id == trade_id).first()
        if not trade:
            raise HTTPException(status_code=404, detail="Trade not found")
        
        if trade_data.exit_price is not None:
            trade.exit_price = trade_data.exit_price
            trade.exit_at = datetime.utcnow()
            profit_loss, win_percentage = calculate_profit_loss(
                trade.entry_price,
                trade.exit_price,
                trade.quantity,
                trade.action,
                trade.commission
            )
            trade.profit_loss = profit_loss
            trade.win_percentage = win_percentage
        
        if trade_data.status is None and trade_data.exit_price:
            trade.status = "CLOSED"
        if trade_data.status:
            trade.status = trade_data.status.upper()
        if trade_data.notes is not None:
            trade.notes = trade_data.notes
        if trade_data.commission is not None:
            trade.commission = trade_data.commission
        
        if trade.exit_price:
            profit_loss, win_percentage = calculate_profit_loss(
                trade.entry_price,
                trade.exit_price,
                trade.quantity,
                trade.action,
                trade.commission
            )
            trade.profit_loss = profit_loss
            trade.win_percentage = win_percentage
        
        trade.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(trade)
        logger.info(f"✅ Trade updated: {trade.id}")
        return {"status": "success", "trade_id": trade.id, "message": "Trade updated successfully"}
    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error updating trade: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{trade_id}")
async def delete_trade(trade_id: str, db: Session = Depends(get_db)):
    try:
        trade = db.query(Trade).filter(Trade.id == trade_id).first()
        if not trade:
            raise HTTPException(status_code=404, detail="Trade not found")
        trade.is_active = False
        trade.status = "DELETED"
        trade.updated_at = datetime.utcnow()
        db.commit()
        logger.info(f"✅ Trade deleted: {trade.id}")
        return {"status": "success", "message": "Trade deleted successfully"}
    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error deleting trade: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))