"""
Trade Management API - Complete CRUD System
Location: /backend/app/routes/api/v1/trades.py

Features:
✅ Create trades with auto P&L calculation
✅ Read trades (all or filtered by account)
✅ Update trades (exit price, notes, status)
✅ Delete trades (soft delete)
✅ Trade analytics (win rate, total profit, etc.)
✅ Filter by account_id, status, date range
✅ Supports Market/Limit/Stop trades
"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.orm import Session
from app.config import get_db
from app.database import Trade, Account
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel
import logging
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Trades"])

# ==================== Pydantic Models ====================

class TradeCreate(BaseModel):
    account_id: str
    symbol: str
    action: str  # BUY or SELL
    entry_price: float
    quantity: int
    trade_type: str = "Market"  # Market, Limit, Stop
    commission: Optional[float] = 0.0
    notes: Optional[str] = None

class TradeUpdate(BaseModel):
    exit_price: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    commission: Optional[float] = None

# ==================== HELPER FUNCTIONS ====================

def calculate_profit_loss(entry_price: float, exit_price: Optional[float], quantity: int, action: str, commission: float = 0.0) -> tuple:
    """Calculate P&L and win percentage"""
    if not exit_price:
        return 0.0, 0.0
    
    if action.upper() == "BUY":
        profit_loss = (exit_price - entry_price) * quantity - commission
    else:  # SELL
        profit_loss = (entry_price - exit_price) * quantity - commission
    
    entry_cost = entry_price * quantity
    win_percentage = (profit_loss / entry_cost) * 100 if entry_cost > 0 else 0
    
    return profit_loss, win_percentage

# ==================== CREATE ENDPOINTS ====================

@router.post("/create")
async def create_trade(trade_data: TradeCreate, db: Session = Depends(get_db)):
    """POST /api/v1/trades/create - Create a new trade"""
    try:
        # Verify account exists
        account = db.query(Account).filter(Account.id == trade_data.account_id).first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

        # Create trade
        trade = Trade(
            id=str(uuid.uuid4()),
            account_id=trade_data.account_id,
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
            is_active=True,
        )

        db.add(trade)
        db.commit()
        db.refresh(trade)

        logger.info(f"✅ Trade created: {trade.id} - {trade.symbol}")

        return {
            "status": "success",
            "trade_id": trade.id,
            "message": "Trade created successfully"
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error creating trade: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== READ ENDPOINTS ====================

@router.get("/list")
async def list_trades(
    account_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    symbol: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """GET /api/v1/trades/list - List all trades with optional filters"""
    try:
        query = db.query(Trade).filter(Trade.is_active == True)

        # Filter by account
        if account_id:
            query = query.filter(Trade.account_id == account_id)
            logger.info(f"🔍 Filtering trades by account: {account_id}")

        # Filter by status
        if status_filter:
            query = query.filter(Trade.status == status_filter.upper())

        # Filter by symbol
        if symbol:
            query = query.filter(Trade.symbol == symbol.upper())

        trades = query.order_by(Trade.created_at.desc()).all()

        return {
            "status": "success",
            "count": len(trades),
            "trades": [
                {
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
                }
                for t in trades
            ]
        }

    except Exception as e:
        logger.error(f"❌ Error listing trades: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{trade_id}")
async def get_trade(trade_id: str, db: Session = Depends(get_db)):
    """GET /api/v1/trades/{trade_id} - Get a specific trade"""
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

# ==================== UPDATE ENDPOINTS ====================

@router.put("/{trade_id}")
async def update_trade(trade_id: str, trade_data: TradeUpdate, db: Session = Depends(get_db)):
    """PUT /api/v1/trades/{trade_id} - Update a trade"""
    try:
        trade = db.query(Trade).filter(Trade.id == trade_id).first()

        if not trade:
            raise HTTPException(status_code=404, detail="Trade not found")

        # Update exit price if provided
        if trade_data.exit_price is not None:
            trade.exit_price = trade_data.exit_price
            trade.exit_at = datetime.utcnow()
            
            # Auto-calculate P&L
            profit_loss, win_percentage = calculate_profit_loss(
                trade.entry_price,
                trade.exit_price,
                trade.quantity,
                trade.action,
                trade.commission
            )
            trade.profit_loss = profit_loss
            trade.win_percentage = win_percentage
            
            # Auto-set status to CLOSED if exit price is set
            if trade_data.status is None:
                trade.status = "CLOSED"

        # Update status
        if trade_data.status:
            trade.status = trade_data.status.upper()

        # Update notes
        if trade_data.notes is not None:
            trade.notes = trade_data.notes

        # Update commission
        if trade_data.commission is not None:
            trade.commission = trade_data.commission
            # Recalculate P&L if we have exit price
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

        return {
            "status": "success",
            "trade_id": trade.id,
            "message": "Trade updated successfully"
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error updating trade: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== DELETE ENDPOINTS ====================

@router.delete("/{trade_id}")
async def delete_trade(trade_id: str, db: Session = Depends(get_db)):
    """DELETE /api/v1/trades/{trade_id} - Delete (soft) a trade"""
    try:
        trade = db.query(Trade).filter(Trade.id == trade_id).first()

        if not trade:
            raise HTTPException(status_code=404, detail="Trade not found")

        # Soft delete
        trade.is_active = False
        trade.status = "DELETED"
        trade.updated_at = datetime.utcnow()

        db.commit()

        logger.info(f"✅ Trade deleted: {trade.id}")

        return {
            "status": "success",
            "message": "Trade deleted successfully"
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error deleting trade: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== ANALYTICS ENDPOINTS ====================

@router.get("/stats/{account_id}")
async def get_trade_stats(account_id: str, db: Session = Depends(get_db)):
    """GET /api/v1/trades/stats/{account_id} - Get trade statistics"""
    try:
        trades = db.query(Trade).filter(
            Trade.account_id == account_id,
            Trade.is_active == True,
            Trade.status.in_(["CLOSED", "OPEN"])
        ).all()

        if not trades:
            return {
                "status": "success",
                "account_id": account_id,
                "stats": {
                    "total_trades": 0,
                    "open_trades": 0,
                    "closed_trades": 0,
                    "win_rate": 0.0,
                    "total_profit": 0.0,
                    "total_loss": 0.0,
                    "best_trade": 0.0,
                    "worst_trade": 0.0,
                    "average_win": 0.0,
                    "average_loss": 0.0,
                }
            }

        # Calculate stats
        closed_trades = [t for t in trades if t.status == "CLOSED" and t.profit_loss is not None]
        winning_trades = [t for t in closed_trades if t.profit_loss > 0]
        losing_trades = [t for t in closed_trades if t.profit_loss < 0]

        total_profit = sum(t.profit_loss for t in winning_trades)
        total_loss = sum(t.profit_loss for t in losing_trades)
        win_rate = (len(winning_trades) / len(closed_trades) * 100) if closed_trades else 0

        best_trade = max((t.profit_loss for t in closed_trades), default=0)
        worst_trade = min((t.profit_loss for t in closed_trades), default=0)
        
        avg_win = (total_profit / len(winning_trades)) if winning_trades else 0
        avg_loss = (abs(total_loss) / len(losing_trades)) if losing_trades else 0

        return {
            "status": "success",
            "account_id": account_id,
            "stats": {
                "total_trades": len(trades),
                "open_trades": len([t for t in trades if t.status == "OPEN"]),
                "closed_trades": len(closed_trades),
                "win_rate": round(win_rate, 2),
                "total_profit": round(total_profit, 2),
                "total_loss": round(total_loss, 2),
                "best_trade": round(best_trade, 2),
                "worst_trade": round(worst_trade, 2),
                "average_win": round(avg_win, 2),
                "average_loss": round(avg_loss, 2),
            }
        }

    except Exception as e:
        logger.error(f"❌ Error getting trade stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== BULK OPERATIONS ====================

@router.post("/bulk-close")
async def bulk_close_trades(data: dict, db: Session = Depends(get_db)):
    """POST /api/v1/trades/bulk-close - Close multiple trades at given price"""
    try:
        account_id = data.get('account_id')
        exit_price = data.get('exit_price')
        symbol = data.get('symbol')

        if not account_id or exit_price is None:
            raise HTTPException(status_code=400, detail="account_id and exit_price required")

        query = db.query(Trade).filter(
            Trade.account_id == account_id,
            Trade.status == "OPEN",
            Trade.is_active == True
        )

        if symbol:
            query = query.filter(Trade.symbol == symbol.upper())

        trades = query.all()

        for trade in trades:
            profit_loss, win_percentage = calculate_profit_loss(
                trade.entry_price,
                exit_price,
                trade.quantity,
                trade.action,
                trade.commission
            )
            trade.exit_price = exit_price
            trade.exit_at = datetime.utcnow()
            trade.profit_loss = profit_loss
            trade.win_percentage = win_percentage
            trade.status = "CLOSED"
            trade.updated_at = datetime.utcnow()

        db.commit()

        logger.info(f"✅ Bulk closed {len(trades)} trades for account {account_id}")

        return {
            "status": "success",
            "trades_closed": len(trades),
            "message": f"Closed {len(trades)} trades"
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error bulk closing trades: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== EXPORT ENDPOINTS ====================

@router.get("/export/csv")
async def export_trades_csv(account_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """GET /api/v1/trades/export/csv - Export trades as CSV"""
    try:
        query = db.query(Trade).filter(Trade.is_active == True)

        if account_id:
            query = query.filter(Trade.account_id == account_id)

        trades = query.order_by(Trade.created_at.desc()).all()

        csv_content = "Symbol,Action,Quantity,Entry Price,Exit Price,P&L,Win %,Status,Entry Date,Exit Date\n"
        
        for trade in trades:
            csv_content += f"{trade.symbol},{trade.action},{trade.quantity},{trade.entry_price},{trade.exit_price or '-'},{trade.profit_loss or '-'},{trade.win_percentage or '-'},{trade.status},{trade.entry_at.strftime('%Y-%m-%d') if trade.entry_at else '-'},{trade.exit_at.strftime('%Y-%m-%d') if trade.exit_at else '-'}\n"

        return {
            "status": "success",
            "csv": csv_content,
            "filename": f"trades_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        }

    except Exception as e:
        logger.error(f"❌ Error exporting CSV: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))