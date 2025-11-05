"""
Portfolio API with Watchlist Management
Location: /backend/app/routes/api/v1/portfolio.py
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import Column, String, Float, DateTime, Integer
from app.config import get_db
from app.database import Base, Trade, Account
from datetime import datetime
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/portfolio", tags=["Portfolio"])

# ==================== Watchlist Model ====================

class Watchlist(Base):
    """SQLAlchemy model for watchlist"""
    __tablename__ = "watchlist"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, nullable=False)
    symbol = Column(String, nullable=False)
    name = Column(String, nullable=True)
    current_price = Column(Float, default=0.0)
    added_at = Column(DateTime, default=datetime.utcnow)

# ==================== WATCHLIST ENDPOINTS ====================

@router.get("/watchlist")
async def get_watchlist(user_id: int = 1, db: Session = Depends(get_db)):
    """
    GET /api/v1/portfolio/watchlist
    Get all watchlist items for user
    """
    try:
        items = db.query(Watchlist).filter(Watchlist.user_id == user_id).all()
        
        watchlist = [
            {
                "id": item.id,
                "symbol": item.symbol,
                "name": item.name or item.symbol,
                "current_price": item.current_price
            }
            for item in items
        ]
        
        logger.info(f"✅ Retrieved {len(watchlist)} watchlist items for user {user_id}")
        
        return {
            "status": "success",
            "watchlist": watchlist,
            "count": len(watchlist)
        }
    
    except Exception as e:
        logger.error(f"❌ Error fetching watchlist: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/watchlist/add")
async def add_to_watchlist(
    symbol: str,
    name: str = None,
    user_id: int = 1,
    db: Session = Depends(get_db)
):
    """
    POST /api/v1/portfolio/watchlist/add
    Add symbol to watchlist
    """
    try:
        # Check if already exists
        existing = db.query(Watchlist).filter(
            Watchlist.user_id == user_id,
            Watchlist.symbol == symbol.upper()
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Symbol {symbol} already in watchlist"
            )
        
        # Create new watchlist item
        item = Watchlist(
            user_id=user_id,
            symbol=symbol.upper(),
            name=name or symbol.upper(),
            current_price=0.0
        )
        
        db.add(item)
        db.commit()
        
        logger.info(f"✅ Added {symbol} to watchlist for user {user_id}")
        
        return {
            "status": "success",
            "message": f"Added {symbol} to watchlist",
            "item": {
                "id": item.id,
                "symbol": item.symbol,
                "name": item.name
            }
        }
    
    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error adding to watchlist: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/watchlist/{item_id}")
async def remove_from_watchlist(item_id: str, db: Session = Depends(get_db)):
    """
    DELETE /api/v1/portfolio/watchlist/{item_id}
    Remove symbol from watchlist
    """
    try:
        item = db.query(Watchlist).filter(Watchlist.id == item_id).first()
        
        if not item:
            raise HTTPException(status_code=404, detail="Watchlist item not found")
        
        symbol = item.symbol
        db.delete(item)
        db.commit()
        
        logger.info(f"✅ Removed {symbol} from watchlist")
        
        return {
            "status": "success",
            "message": f"Removed {symbol} from watchlist"
        }
    
    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error removing from watchlist: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/watchlist/{item_id}")
async def update_watchlist_item(
    item_id: str,
    name: str = None,
    db: Session = Depends(get_db)
):
    """
    PUT /api/v1/portfolio/watchlist/{item_id}
    Update watchlist item
    """
    try:
        item = db.query(Watchlist).filter(Watchlist.id == item_id).first()
        
        if not item:
            raise HTTPException(status_code=404, detail="Watchlist item not found")
        
        if name:
            item.name = name
        
        db.commit()
        
        logger.info(f"✅ Updated watchlist item {item_id}")
        
        return {
            "status": "success",
            "message": "Watchlist item updated",
            "item": {
                "id": item.id,
                "symbol": item.symbol,
                "name": item.name
            }
        }
    
    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error updating watchlist: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== POSITIONS ENDPOINTS ====================

@router.get("/positions")
async def get_positions(account_id: str = None, db: Session = Depends(get_db)):
    """
    GET /api/v1/portfolio/positions?account_id=xxx
    Get all open positions for an account
    """
    try:
        query = db.query(Trade).filter(Trade.status == "open")
        
        if account_id:
            query = query.filter(Trade.account_id == account_id)
        
        trades = query.all()
        
        # Group by symbol
        holdings_dict = {}
        
        for trade in trades:
            if trade.symbol not in holdings_dict:
                holdings_dict[trade.symbol] = {
                    "total_quantity": 0,
                    "total_cost": 0,
                }
            
            holdings_dict[trade.symbol]["total_quantity"] += trade.quantity
            holdings_dict[trade.symbol]["total_cost"] += (trade.quantity * trade.entry_price) if trade.entry_price else 0
        
        holdings = []
        for symbol, data in holdings_dict.items():
            avg_cost = (data["total_cost"] / data["total_quantity"]) if data["total_quantity"] > 0 else 0
            current_price = avg_cost * 1.02  # Placeholder
            
            holding = {
                "symbol": symbol,
                "quantity": data["total_quantity"],
                "avg_cost": avg_cost,
                "current_price": current_price,
                "market_value": data["total_quantity"] * current_price,
                "pnl": (data["total_quantity"] * current_price) - data["total_cost"],
                "pnl_percent": ((data["total_quantity"] * current_price - data["total_cost"]) / data["total_cost"] * 100) if data["total_cost"] > 0 else 0,
            }
            holdings.append(holding)
        
        logger.info(f"✅ Retrieved {len(holdings)} open positions")
        
        return {
            "status": "success",
            "holdings": holdings,
            "count": len(holdings)
        }
    
    except Exception as e:
        logger.error(f"❌ Error fetching positions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/summary")
async def get_summary(account_id: str = None, db: Session = Depends(get_db)):
    """
    GET /api/v1/portfolio/summary
    Get portfolio summary
    """
    try:
        query = db.query(Trade)
        if account_id:
            query = query.filter(Trade.account_id == account_id)
        
        all_trades = query.all()
        
        open_trades = [t for t in all_trades if t.status == "open"]
        closed_trades = [t for t in all_trades if t.status == "closed"]
        
        open_value = sum((t.quantity * (t.exit_price or t.entry_price or 0)) for t in open_trades)
        realized_pnl = sum(t.profit_loss or 0 for t in closed_trades)
        unrealized_pnl = sum(((t.exit_price or t.entry_price or 0) - t.entry_price) * t.quantity for t in open_trades) if open_trades else 0
        total_pnl = realized_pnl + unrealized_pnl
        
        return {
            "status": "success",
            "summary": {
                "open_positions_count": len(open_trades),
                "closed_positions_count": len(closed_trades),
                "open_value": open_value,
                "realized_pnl": realized_pnl,
                "unrealized_pnl": unrealized_pnl,
                "total_pnl": total_pnl,
                "total_trades": len(all_trades)
            }
        }
    
    except Exception as e:
        logger.error(f"❌ Error fetching summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))