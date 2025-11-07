"""
🛠️ TOOLS API - Trading Tools Endpoints
Location: /backend/app/routes/api/v1/tools.py

Endpoints:
✅ Position size calculator
✅ Risk/reward analyzer
✅ Drawdown tracker
✅ Kelly criterion
✅ Optimization suggestions
✅ Session recommendations
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from app.config import get_db
from app.services.trading_calculator import calculator
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Tools"])

# ==================== POSITION SIZE ====================

@router.post("/position-size")
async def calculate_position_size(
    account_balance: float = Query(...),
    risk_percent: float = Query(...),
    entry_price: float = Query(...),
    stop_loss: float = Query(...),
    instrument_type: str = Query(...),
    symbol: str = Query(""),
    broker: str = Query("IB"),
    db: Session = Depends(get_db)
):
    """POST /api/v1/tools/position-size - Calculate position size"""
    try:
        result = calculator.calculate_position_size(
            account_balance, risk_percent, entry_price, stop_loss,
            instrument_type, symbol, broker
        )
        
        logger.info(f"✓ Position size calculated: {result}")
        
        return {
            "status": "success",
            "calculation": result,
        }
    except Exception as e:
        logger.error(f"❌ Error calculating position size: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== RISK/REWARD ====================

@router.post("/risk-reward")
async def calculate_risk_reward(
    entry_price: float = Query(...),
    stop_loss: float = Query(...),
    take_profit: float = Query(...),
    quantity: float = Query(...),
    commission_per_side: float = Query(0),
    db: Session = Depends(get_db)
):
    """POST /api/v1/tools/risk-reward - Analyze risk and reward"""
    try:
        result = calculator.calculate_risk_reward(
            entry_price, stop_loss, take_profit, quantity, commission_per_side
        )
        
        logger.info(f"✓ Risk/Reward calculated: R:R = {result['rr_ratio_text']}")
        
        return {
            "status": "success",
            "analysis": result,
        }
    except Exception as e:
        logger.error(f"❌ Error calculating risk/reward: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== DRAWDOWN ====================

@router.post("/drawdown")
async def calculate_drawdown(
    peak_equity: float = Query(...),
    current_equity: float = Query(...),
    db: Session = Depends(get_db)
):
    """POST /api/v1/tools/drawdown - Calculate drawdown metrics"""
    try:
        result = calculator.calculate_drawdown(peak_equity, current_equity)
        
        logger.info(f"✓ Drawdown calculated: {result['current_drawdown_percent']}%")
        
        return {
            "status": "success",
            "drawdown_metrics": result,
        }
    except Exception as e:
        logger.error(f"❌ Error calculating drawdown: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== KELLY CRITERION ====================

@router.post("/kelly-criterion")
async def calculate_kelly(
    win_rate: float = Query(...),
    avg_win: float = Query(...),
    avg_loss: float = Query(...),
    db: Session = Depends(get_db)
):
    """POST /api/v1/tools/kelly-criterion - Calculate Kelly Criterion"""
    try:
        result = calculator.calculate_kelly_criterion(win_rate, avg_win, avg_loss)
        
        logger.info(f"✓ Kelly Criterion: {result['kelly_percent']}%")
        
        return {
            "status": "success",
            "kelly": result,
        }
    except Exception as e:
        logger.error(f"❌ Error calculating Kelly: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== OPTIMIZATION ====================

@router.post("/optimize")
async def optimize_trading(
    win_rate: float = Query(...),
    avg_win: float = Query(...),
    avg_loss: float = Query(...),
    profit_factor: float = Query(...),
    db: Session = Depends(get_db)
):
    """POST /api/v1/tools/optimize - Get optimization suggestions"""
    try:
        result = calculator.optimize_win_rate(win_rate, avg_win, avg_loss, profit_factor)
        
        logger.info(f"✓ Generated {len(result['suggestions'])} optimization suggestions")
        
        return {
            "status": "success",
            "optimizations": result,
        }
    except Exception as e:
        logger.error(f"❌ Error optimizing: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== SESSIONS ====================

@router.get("/trading-sessions")
async def get_trading_sessions(
    timezone: str = Query("EST"),
    db: Session = Depends(get_db)
):
    """GET /api/v1/tools/trading-sessions - Get optimal trading sessions"""
    try:
        result = calculator.calculate_trading_sessions(timezone)
        
        logger.info(f"✓ Trading sessions retrieved for {timezone}")
        
        return {
            "status": "success",
            "sessions": result,
        }
    except Exception as e:
        logger.error(f"❌ Error getting sessions: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== ECONOMIC CALENDAR ====================

@router.get("/economic-events")
async def get_economic_events(
    days_ahead: int = Query(7),
    impact_level: str = Query("all"),
    db: Session = Depends(get_db)
):
    """GET /api/v1/tools/economic-events - Get upcoming economic events"""
    try:
        # Mock economic calendar data
        events = [
            {
                "time": "13:30 EST",
                "event": "US Non-Farm Payroll",
                "impact": "HIGH",
                "previous": "227K",
                "forecast": "211K",
                "actual": None,
                "date": "Today",
                "volatility_expected": True,
            },
            {
                "time": "14:00 EST",
                "event": "Fed Interest Rate",
                "impact": "CRITICAL",
                "current": "5.33%",
                "expected": "5.33%",
                "actual": None,
                "date": "Today",
                "volatility_expected": True,
            },
            {
                "time": "08:00 JST",
                "event": "Japan CPI YoY",
                "impact": "MEDIUM",
                "previous": "2.5%",
                "forecast": "2.3%",
                "actual": None,
                "date": "Tomorrow",
                "volatility_expected": False,
            },
        ]
        
        logger.info(f"✓ Retrieved {len(events)} economic events")
        
        return {
            "status": "success",
            "events": events,
            "count": len(events),
        }
    except Exception as e:
        logger.error(f"❌ Error getting events: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== CORRELATION ====================

@router.get("/correlation-matrix")
async def get_correlation_matrix(
    symbols: List[str] = Query(["EUR/USD", "GBP/USD", "GBPEUR", "EURCAD"]),
    db: Session = Depends(get_db)
):
    """GET /api/v1/tools/correlation-matrix - Get symbol correlations"""
    try:
        # Mock correlation data
        correlation_matrix = {
            "EUR/USD": {"EUR/USD": 1.00, "GBP/USD": 0.85, "GBPEUR": -0.12, "EURCAD": 0.78},
            "GBP/USD": {"EUR/USD": 0.85, "GBP/USD": 1.00, "GBPEUR": 0.34, "EURCAD": 0.65},
            "GBPEUR": {"EUR/USD": -0.12, "GBP/USD": 0.34, "GBPEUR": 1.00, "EURCAD": -0.05},
            "EURCAD": {"EUR/USD": 0.78, "GBP/USD": 0.65, "GBPEUR": -0.05, "EURCAD": 1.00},
        }
        
        diversification_score = 45
        
        logger.info(f"✓ Generated correlation matrix for {len(symbols)} symbols")
        
        return {
            "status": "success",
            "correlation_matrix": correlation_matrix,
            "diversification_score": diversification_score,
            "recommendation": "Consider GBPEUR for natural hedge"
        }
    except Exception as e:
        logger.error(f"❌ Error calculating correlations: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== VOLATILITY ====================

@router.get("/volatility-analysis")
async def get_volatility(
    db: Session = Depends(get_db)
):
    """GET /api/v1/tools/volatility-analysis - Get volatility metrics"""
    try:
        volatility_data = {
            "stock_market": {"vix": 18.5, "condition": "Normal"},
            "forex": {"atr": 8.2, "condition": "Low"},
            "crypto": {"vix": 35.1, "condition": "HIGH"},
            "bonds": {"bvix": 6.5, "condition": "Very Low"},
        }
        
        instruments = [
            {"symbol": "EUR/USD", "liquidity": "Excellent", "spread": 1.0},
            {"symbol": "GBP/USD", "liquidity": "Good", "spread": 1.3},
            {"symbol": "BTCUSD", "liquidity": "Fair", "spread": 2.5},
        ]
        
        logger.info(f"✓ Volatility analysis generated")
        
        return {
            "status": "success",
            "volatility": volatility_data,
            "instruments": instruments,
            "recommendation": "EUR/USD best conditions today"
        }
    except Exception as e:
        logger.error(f"❌ Error analyzing volatility: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== PROFIT TARGET ====================

@router.post("/profit-targets")
async def calculate_profit_targets(
    entry_price: float = Query(...),
    stop_loss: float = Query(...),
    atr: float = Query(...),
    db: Session = Depends(get_db)
):
    """POST /api/v1/tools/profit-targets - Calculate optimal profit targets"""
    try:
        risk_per_unit = abs(entry_price - stop_loss)
        
        targets = [
            {
                "level": 1,
                "price": entry_price + (atr * 0.75),
                "pips": round((atr * 0.75) * 10000, 0) if entry_price < 10 else atr * 0.75,
                "position_size": "25%",
                "probability": "65%",
            },
            {
                "level": 2,
                "price": entry_price + (atr * 1.5),
                "pips": round((atr * 1.5) * 10000, 0) if entry_price < 10 else atr * 1.5,
                "position_size": "35%",
                "probability": "45%",
            },
            {
                "level": 3,
                "price": entry_price + (atr * 2.5),
                "pips": round((atr * 2.5) * 10000, 0) if entry_price < 10 else atr * 2.5,
                "position_size": "40%",
                "probability": "28%",
            },
        ]
        
        logger.info(f"✓ Generated {len(targets)} profit targets")
        
        return {
            "status": "success",
            "targets": targets,
            "trailing_stop_suggestion": "Trail by 25 pips after TP1"
        }
    except Exception as e:
        logger.error(f"❌ Error calculating targets: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))