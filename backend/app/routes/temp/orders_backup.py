from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Trade
from ..schemas import TradeResponse

router = APIRouter()

@router.get("/", response_model=List[TradeResponse])
async def get_orders(
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get recent trades"""
    trades = db.query(Trade).order_by(Trade.created_at.desc()).limit(limit).all()
    return trades


@router.get("/{trade_id}", response_model=TradeResponse)
async def get_order(
    trade_id: int,
    db: Session = Depends(get_db)
):
    """Get specific trade by ID"""
    trade = db.query(Trade).filter(Trade.id == trade_id).first()
    
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    return trade


@router.get("/status/open", response_model=List[TradeResponse])
async def get_open_orders(
    db: Session = Depends(get_db)
):
    """Get all open trades"""
    trades = db.query(Trade).filter(
        Trade.status.in_(["PENDING", "FILLED"])
    ).all()
    
    return trades
