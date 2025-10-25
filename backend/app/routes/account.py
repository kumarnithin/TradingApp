from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import User, Trade
from ..schemas import AccountStats
from datetime import datetime

router = APIRouter()

@router.get("/stats", response_model=AccountStats)
async def get_account_stats(
    user_id: int = 1,  # Default user for testing
    db: Session = Depends(get_db)
):
    """
    Get account statistics
    Example: http://localhost:8000/api/v1/account/stats
    """
    
    # Get the user from database
    user = db.query(User).filter(User.id == user_id).first()
    
    # If user doesn't exist, create a demo user
    if not user:
        user = User(
            email="demo@tradingapp.com",
            username="demo_user",
            password_hash="demo_hash_for_testing",
            account_balance=100000.0,  # Start with $100,000
            paper_trading=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # Count total trades
    total_trades = db.query(Trade).filter(Trade.user_id == user_id).count()
    
    # Count winning trades (profit_loss > 0)
    winning_trades = db.query(Trade).filter(
        Trade.user_id == user_id,
        Trade.profit_loss > 0
    ).count()
    
    # Calculate win rate (percentage)
    if total_trades > 0:
        win_rate = (winning_trades / total_trades) * 100
    else:
        win_rate = 0
    
    # Calculate today's profit
    today = datetime.now().date()
    daily_profit = db.query(func.sum(Trade.profit_loss)).filter(
        Trade.user_id == user_id,
        func.date(Trade.created_at) == today
    ).scalar() or 0.0
    
    # Count open positions (trades not yet closed)
    open_positions = db.query(Trade).filter(
        Trade.user_id == user_id,
        Trade.status == "FILLED"
    ).count()
    
    # Return the statistics
    return AccountStats(
        balance=user.account_balance,
        daily_profit=daily_profit,
        win_rate=win_rate,
        total_trades=total_trades,
        open_positions=open_positions
    )
