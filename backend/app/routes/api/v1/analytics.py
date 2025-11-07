"""
🚀 ANALYTICS API - Complete Trading Analytics Backend
Location: /backend/app/routes/api/v1/analytics.py

Features:
✅ Trade performance metrics
✅ Signal statistics
✅ Daily P&L analysis
✅ Symbol performance
✅ Win/Loss statistics
✅ Equity curve tracking
✅ Account summaries
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from app.config import get_db
from app.database import Trade, Signal, Account
from datetime import datetime, timedelta
from typing import Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Analytics"])

# ==================== TRADE ANALYTICS ====================

@router.get("/trades/stats")
async def get_trade_stats(account_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """GET /api/v1/analytics/trades/stats - Get comprehensive trade statistics"""
    try:
        query = db.query(Trade)
        if account_id:
            query = query.filter(Trade.account_id == account_id)
        
        trades = query.all()
        
        if not trades:
            return {
                "status": "success",
                "stats": {
                    "total_trades": 0,
                    "winning_trades": 0,
                    "losing_trades": 0,
                    "total_pnl": 0,
                    "win_rate": 0,
                    "avg_win": 0,
                    "avg_loss": 0,
                    "profit_factor": 0,
                    "largest_win": 0,
                    "largest_loss": 0,
                    "consecutive_wins": 0,
                    "consecutive_losses": 0,
                }
            }

        # Calculate metrics
        total_trades = len(trades)
        pnl_values = [getattr(t, 'profit_loss', 0) or 0 for t in trades]
        
        winning_trades = len([p for p in pnl_values if p > 0])
        losing_trades = len([p for p in pnl_values if p < 0])
        total_pnl = sum(pnl_values)
        
        win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0
        
        winning_amounts = [p for p in pnl_values if p > 0]
        losing_amounts = [p for p in pnl_values if p < 0]
        
        avg_win = sum(winning_amounts) / len(winning_amounts) if winning_amounts else 0
        avg_loss = sum(losing_amounts) / len(losing_amounts) if losing_amounts else 0
        
        profit_factor = avg_win / abs(avg_loss) if avg_loss != 0 else (avg_win if avg_win > 0 else 0)
        
        largest_win = max(pnl_values) if pnl_values else 0
        largest_loss = min(pnl_values) if pnl_values else 0
        
        # Calculate consecutive wins/losses
        consecutive_wins = 0
        consecutive_losses = 0
        max_consecutive_wins = 0
        max_consecutive_losses = 0
        
        for pnl in pnl_values:
            if pnl > 0:
                consecutive_wins += 1
                consecutive_losses = 0
                max_consecutive_wins = max(max_consecutive_wins, consecutive_wins)
            elif pnl < 0:
                consecutive_losses += 1
                consecutive_wins = 0
                max_consecutive_losses = max(max_consecutive_losses, consecutive_losses)

        logger.info(f"✅ Trade stats calculated: {winning_trades}W/{losing_trades}L, WR: {win_rate:.1f}%")

        return {
            "status": "success",
            "stats": {
                "total_trades": total_trades,
                "winning_trades": winning_trades,
                "losing_trades": losing_trades,
                "total_pnl": round(total_pnl, 2),
                "win_rate": round(win_rate, 2),
                "avg_win": round(avg_win, 2),
                "avg_loss": round(avg_loss, 2),
                "profit_factor": round(profit_factor, 2),
                "largest_win": round(largest_win, 2),
                "largest_loss": round(largest_loss, 2),
                "max_consecutive_wins": max_consecutive_wins,
                "max_consecutive_losses": max_consecutive_losses,
            }
        }

    except Exception as e:
        logger.error(f"❌ Error calculating trade stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== SIGNAL ANALYTICS ====================

@router.get("/signals/stats")
async def get_signal_stats(account_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """GET /api/v1/analytics/signals/stats - Get signal statistics"""
    try:
        query = db.query(Signal).filter(Signal.is_active == True)
        if account_id:
            query = query.filter(Signal.account_id == account_id)
        
        signals = query.all()
        
        if not signals:
            return {
                "status": "success",
                "stats": {
                    "total_signals": 0,
                    "pending": 0,
                    "filled": 0,
                    "cancelled": 0,
                    "average_confidence": 0,
                    "fill_rate": 0,
                }
            }

        total = len(signals)
        pending = len([s for s in signals if getattr(s, 'status', 'PENDING') == 'PENDING'])
        filled = len([s for s in signals if getattr(s, 'status', 'PENDING') == 'FILLED'])
        cancelled = len([s for s in signals if getattr(s, 'status', 'PENDING') == 'CANCELLED'])
        
        avg_confidence = sum(getattr(s, 'confidence_score', 0) or 0 for s in signals) / total if total > 0 else 0
        fill_rate = (filled / total * 100) if total > 0 else 0

        return {
            "status": "success",
            "stats": {
                "total_signals": total,
                "pending": pending,
                "filled": filled,
                "cancelled": cancelled,
                "average_confidence": round(avg_confidence, 2),
                "fill_rate": round(fill_rate, 2),
            }
        }

    except Exception as e:
        logger.error(f"❌ Error calculating signal stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== PERFORMANCE CHARTS ====================

@router.get("/daily-pnl")
async def get_daily_pnl(account_id: Optional[str] = Query(None), days: int = Query(7), db: Session = Depends(get_db)):
    """GET /api/v1/analytics/daily-pnl - Get daily P&L data"""
    try:
        query = db.query(Trade)
        if account_id:
            query = query.filter(Trade.account_id == account_id)
        
        since_date = datetime.utcnow() - timedelta(days=days)
        trades = query.filter(Trade.created_at >= since_date).all()
        
        # Group by date
        daily_data = {}
        for trade in trades:
            date_key = trade.created_at.strftime('%Y-%m-%d') if trade.created_at else 'Unknown'
            if date_key not in daily_data:
                daily_data[date_key] = {'pnl': 0, 'trades': 0, 'wins': 0}
            
            pnl = getattr(trade, 'profit_loss', 0) or 0
            daily_data[date_key]['pnl'] += pnl
            daily_data[date_key]['trades'] += 1
            if pnl > 0:
                daily_data[date_key]['wins'] += 1

        result = [
            {'date': date, **data}
            for date, data in sorted(daily_data.items())
        ]

        return {
            "status": "success",
            "data": result
        }

    except Exception as e:
        logger.error(f"❌ Error calculating daily PnL: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== SYMBOL PERFORMANCE ====================

@router.get("/symbol-performance")
async def get_symbol_performance(account_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """GET /api/v1/analytics/symbol-performance - Get performance by symbol"""
    try:
        query = db.query(Trade)
        if account_id:
            query = query.filter(Trade.account_id == account_id)
        
        trades = query.all()
        
        # Group by symbol
        symbol_data = {}
        for trade in trades:
            symbol = trade.symbol
            if symbol not in symbol_data:
                symbol_data[symbol] = {'trades': 0, 'pnl': 0, 'wins': 0}
            
            symbol_data[symbol]['trades'] += 1
            pnl = getattr(trade, 'profit_loss', 0) or 0
            symbol_data[symbol]['pnl'] += pnl
            if pnl > 0:
                symbol_data[symbol]['wins'] += 1

        result = [
            {
                'symbol': symbol,
                'trades': data['trades'],
                'pnl': round(data['pnl'], 2),
                'wins': data['wins'],
                'win_rate': round((data['wins'] / data['trades'] * 100), 1) if data['trades'] > 0 else 0,
            }
            for symbol, data in sorted(symbol_data.items(), key=lambda x: x[1]['pnl'], reverse=True)
        ]

        return {
            "status": "success",
            "data": result
        }

    except Exception as e:
        logger.error(f"❌ Error calculating symbol performance: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== EQUITY CURVE ====================

@router.get("/equity-curve")
async def get_equity_curve(account_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """GET /api/v1/analytics/equity-curve - Get equity curve over time"""
    try:
        query = db.query(Trade)
        if account_id:
            query = query.filter(Trade.account_id == account_id)
        
        trades = query.order_by(Trade.created_at).all()
        
        # Get account balance
        account = None
        if account_id:
            account = db.query(Account).filter(Account.id == account_id).first()
        
        initial_equity = account.account_balance if account else 100000
        
        # Build equity curve
        equity = initial_equity
        curve = []
        
        for i, trade in enumerate(trades, 1):
            pnl = getattr(trade, 'profit_loss', 0) or 0
            equity += pnl
            curve.append({
                'trade': i,
                'equity': round(equity, 2),
                'date': trade.created_at.isoformat() if trade.created_at else None
            })

        return {
            "status": "success",
            "initial_equity": initial_equity,
            "current_equity": equity,
            "data": curve
        }

    except Exception as e:
        logger.error(f"❌ Error calculating equity curve: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== DRAWDOWN ANALYSIS ====================

@router.get("/drawdown")
async def get_drawdown(account_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """GET /api/v1/analytics/drawdown - Analyze drawdown statistics"""
    try:
        query = db.query(Trade)
        if account_id:
            query = query.filter(Trade.account_id == account_id)
        
        trades = query.order_by(Trade.created_at).all()
        account = db.query(Account).filter(Account.id == account_id).first() if account_id else None
        
        initial_equity = account.account_balance if account else 100000
        equity = initial_equity
        peak = initial_equity
        max_drawdown = 0
        current_drawdown = 0
        
        for trade in trades:
            pnl = getattr(trade, 'profit_loss', 0) or 0
            equity += pnl
            
            if equity > peak:
                peak = equity
            
            drawdown = (peak - equity) / peak * 100 if peak > 0 else 0
            if drawdown > max_drawdown:
                max_drawdown = drawdown
            current_drawdown = drawdown

        return {
            "status": "success",
            "max_drawdown": round(max_drawdown, 2),
            "current_drawdown": round(current_drawdown, 2),
            "recovery_rate": 100 - round(current_drawdown, 2),
        }

    except Exception as e:
        logger.error(f"❌ Error calculating drawdown: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== RISK METRICS ====================

@router.get("/risk-metrics")
async def get_risk_metrics(account_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """GET /api/v1/analytics/risk-metrics - Get risk assessment metrics"""
    try:
        query = db.query(Trade)
        if account_id:
            query = query.filter(Trade.account_id == account_id)
        
        trades = query.all()
        pnl_values = [getattr(t, 'profit_loss', 0) or 0 for t in trades]
        
        if not pnl_values:
            return {
                "status": "success",
                "metrics": {
                    "sharpe_ratio": 0,
                    "sortino_ratio": 0,
                    "calmar_ratio": 0,
                    "volatility": 0,
                }
            }

        # Calculate volatility (simplified)
        mean_pnl = sum(pnl_values) / len(pnl_values)
        variance = sum((x - mean_pnl) ** 2 for x in pnl_values) / len(pnl_values)
        volatility = variance ** 0.5
        
        # Sharpe Ratio (simplified)
        sharpe = mean_pnl / volatility if volatility > 0 else 0
        
        # Downside deviation
        negative_pnls = [x for x in pnl_values if x < 0]
        downside_variance = sum(x ** 2 for x in negative_pnls) / len(negative_pnls) if negative_pnls else 0
        downside_dev = downside_variance ** 0.5
        
        # Sortino Ratio
        sortino = mean_pnl / downside_dev if downside_dev > 0 else 0

        return {
            "status": "success",
            "metrics": {
                "sharpe_ratio": round(sharpe, 2),
                "sortino_ratio": round(sortino, 2),
                "volatility": round(volatility, 2),
                "mean_return": round(mean_pnl, 2),
            }
        }

    except Exception as e:
        logger.error(f"❌ Error calculating risk metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== ACCOUNT SUMMARY ====================

@router.get("/account-summary")
async def get_account_summary(db: Session = Depends(get_db)):
    """GET /api/v1/analytics/account-summary - Get all accounts summary"""
    try:
        accounts = db.query(Account).all()
        
        summaries = []
        for account in accounts:
            trades = db.query(Trade).filter(Trade.account_id == account.id).all()
            pnl_values = [getattr(t, 'profit_loss', 0) or 0 for t in trades]
            
            summaries.append({
                'id': account.id,
                'account_name': account.account_name,
                'account_type': getattr(account, 'account_type', 'DEMO'),
                'balance': getattr(account, 'account_balance', 0),
                'buying_power': getattr(account, 'buying_power', 0),
                'total_pnl': sum(pnl_values),
                'trades_count': len(trades),
                'unrealized_pnl': getattr(account, 'unrealized_pnl', 0) or sum(pnl_values),
            })

        return {
            "status": "success",
            "accounts": summaries
        }

    except Exception as e:
        logger.error(f"❌ Error fetching account summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))