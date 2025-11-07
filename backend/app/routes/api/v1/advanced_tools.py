"""
🛠️ ADVANCED TOOLS API ENDPOINTS
Location: /backend/app/routes/api/v1/advanced_tools.py

Endpoints:
✅ /optimize - Strategy optimization engine
✅ /economic-calendar - Economic events
✅ /correlation - Correlation matrix
✅ /volatility - Volatility analysis
✅ /trading-sessions - Optimal trading windows
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from app.config import get_db
from app.services.advanced_tools import advanced_tools
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Advanced Tools"])

# ==================== OPTIMIZATION ENGINE ====================

@router.post("/optimize-strategy")
async def optimize_strategy(
    win_rate: float = Query(...),
    avg_win: float = Query(...),
    avg_loss: float = Query(...),
    total_trades: int = Query(...),
    profit_factor: float = Query(...),
    db: Session = Depends(get_db)
):
    """
    POST /api/v1/advanced-tools/optimize-strategy
    
    AI-powered strategy optimization with specific improvement recommendations
    """
    try:
        result = advanced_tools.optimize_strategy(
            win_rate, avg_win, avg_loss, total_trades, profit_factor
        )
        
        logger.info(f"✓ Strategy optimization generated {len(result['suggestions'])} suggestions")
        
        return {
            "status": "success",
            "optimization": result
        }
    except Exception as e:
        logger.error(f"❌ Optimization error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== ECONOMIC CALENDAR ====================

@router.get("/economic-calendar")
async def get_economic_calendar(
    days_ahead: int = Query(7),
    impact_level: str = Query("all"),
    countries: str = Query(""),
    db: Session = Depends(get_db)
):
    """
    GET /api/v1/advanced-tools/economic-calendar
    
    Get upcoming economic events with impact levels and affected currency pairs
    """
    try:
        countries_list = countries.split(",") if countries else None
        impact_filter = None if impact_level == "all" else impact_level
        
        result = advanced_tools.get_economic_calendar(
            days_ahead=days_ahead,
            impact_level=impact_filter,
            countries=countries_list
        )
        
        logger.info(f"✓ Calendar retrieved: {result['count']} events")
        
        return {
            "status": "success",
            "calendar": result
        }
    except Exception as e:
        logger.error(f"❌ Calendar error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/economic-calendar/high-impact")
async def get_high_impact_events(db: Session = Depends(get_db)):
    """GET /api/v1/advanced-tools/economic-calendar/high-impact - Today's high impact events"""
    try:
        result = advanced_tools.get_economic_calendar(
            days_ahead=1,
            impact_level="CRITICAL"
        )
        
        return {
            "status": "success",
            "high_impact_events": result["events"],
            "count": len(result["events"]),
            "trading_caution": len(result["events"]) > 0
        }
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== CORRELATION MATRIX ====================

@router.post("/correlation-matrix")
async def calculate_correlation(
    symbols: List[str] = Query(["EUR/USD", "GBP/USD", "USD/JPY"]),
    db: Session = Depends(get_db)
):
    """
    POST /api/v1/advanced-tools/correlation-matrix
    
    Calculate correlation matrix and diversification score for given symbols
    
    Example: /correlation-matrix?symbols=EUR/USD&symbols=GBP/USD&symbols=USD/JPY
    """
    try:
        if not symbols:
            symbols = ["EUR/USD", "GBP/USD", "USD/JPY"]
        
        result = advanced_tools.calculate_correlation_matrix(symbols)
        
        logger.info(f"✓ Correlation matrix calculated for {len(symbols)} symbols")
        logger.info(f"✓ Diversification score: {result['diversification_score']}")
        
        return {
            "status": "success",
            "correlation": result
        }
    except Exception as e:
        logger.error(f"❌ Correlation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/portfolio-diversification")
async def check_diversification(
    symbols: List[str] = Query(["EUR/USD", "GBP/USD", "GBPEUR"]),
    db: Session = Depends(get_db)
):
    """POST /api/v1/advanced-tools/portfolio-diversification - Check portfolio health"""
    try:
        result = advanced_tools.calculate_correlation_matrix(symbols)
        
        return {
            "status": "success",
            "portfolio": {
                "symbols": symbols,
                "diversification_score": result["diversification_score"],
                "portfolio_health": result["portfolio_health"],
                "redundancy_count": result["redundancy_count"],
                "recommendation": result["summary"],
                "hedge_pairs": [h for h in result["hedge_recommendations"] if "negatively" in h],
                "issues": [h for h in result["hedge_recommendations"] if "highly correlated" in h]
            }
        }
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== VOLATILITY ANALYSIS ====================

@router.post("/volatility-analysis")
async def analyze_volatility(
    symbols: List[str] = Query(["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD"]),
    db: Session = Depends(get_db)
):
    """
    POST /api/v1/advanced-tools/volatility-analysis
    
    Analyze market volatility conditions for given symbols
    """
    try:
        if not symbols:
            symbols = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD"]
        
        result = advanced_tools.analyze_volatility(symbols=symbols)
        
        logger.info(f"✓ Volatility analysis: {result['market_condition']} market")
        
        return {
            "status": "success",
            "volatility": result
        }
    except Exception as e:
        logger.error(f"❌ Volatility error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/market-conditions")
async def get_market_conditions(db: Session = Depends(get_db)):
    """GET /api/v1/advanced-tools/market-conditions - Overall market conditions"""
    try:
        result = advanced_tools.analyze_volatility()
        
        return {
            "status": "success",
            "market": {
                "overall_condition": result["market_condition"],
                "average_volatility": result["average_volatility"],
                "trading_style": result["recommended_trading_style"],
                "best_pairs": result["best_instruments"],
                "worst_pairs": result["worst_instruments"],
                "pairs_to_avoid": result["caution_symbols"],
                "recommendation": result["overall_recommendation"]
            }
        }
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== TRADING SESSIONS ====================

@router.get("/trading-sessions")
async def get_trading_sessions(
    timezone: str = Query("EST"),
    db: Session = Depends(get_db)
):
    """
    GET /api/v1/advanced-tools/trading-sessions
    
    Get optimal trading time windows based on session overlap and liquidity
    """
    try:
        result = advanced_tools.get_optimal_trading_windows(timezone=timezone)
        
        logger.info(f"✓ Trading sessions retrieved for {timezone}")
        
        return {
            "status": "success",
            "sessions": result
        }
    except Exception as e:
        logger.error(f"❌ Sessions error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/best-trading-window")
async def get_best_window(
    timezone: str = Query("EST"),
    db: Session = Depends(get_db)
):
    """GET /api/v1/advanced-tools/best-trading-window - Get today's best trading time"""
    try:
        result = advanced_tools.get_optimal_trading_windows(timezone)
        
        overlap_session = result["sessions"]["overlap"]
        
        return {
            "status": "success",
            "best_window": {
                "session": "London-New York Overlap",
                "start": overlap_session["start"],
                "end": overlap_session["end"],
                "primary_pairs": overlap_session["primary_pairs"],
                "volatility": overlap_session["volatility_score"],
                "liquidity": overlap_session["liquidity_score"],
                "spreads": overlap_session["spreads"],
                "volume": overlap_session["volume"],
                "reason": "Highest liquidity and tightest spreads"
            }
        }
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== COMPOSITE DASHBOARD ====================

@router.get("/daily-trading-summary")
async def get_daily_summary(db: Session = Depends(get_db)):
    """GET /api/v1/advanced-tools/daily-trading-summary - Complete daily trading briefing"""
    try:
        # Get all relevant data
        market_conditions = advanced_tools.analyze_volatility()
        calendar = advanced_tools.get_economic_calendar(days_ahead=1)
        sessions = advanced_tools.get_optimal_trading_windows()
        
        return {
            "status": "success",
            "daily_briefing": {
                "date": "Today",
                "market_condition": market_conditions["market_condition"],
                "trading_style": market_conditions["recommended_trading_style"],
                "best_pairs": market_conditions["best_instruments"],
                "avoid_pairs": market_conditions["worst_instruments"],
                "economic_events": calendar["events"][:3],  # Top 3 events
                "high_impact_count": calendar["high_impact_count"],
                "best_trading_window": sessions["best_session_window"],
                "overall_recommendation": market_conditions["overall_recommendation"],
                "cautions": calendar["recommendation"] if calendar["high_impact_count"] > 0 else "No major events today"
            }
        }
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== TRADING STRATEGY ANALYZER ====================

@router.post("/analyze-trade-setup")
async def analyze_trade_setup(
    symbol: str = Query(...),
    win_rate: float = Query(55),
    avg_win: float = Query(650),
    avg_loss: float = Query(500),
    profit_factor: float = Query(1.3),
    db: Session = Depends(get_db)
):
    """POST /api/v1/advanced-tools/analyze-trade-setup - Analyze complete trade setup"""
    try:
        # Get volatility for symbol
        vol_analysis = advanced_tools.analyze_volatility(symbols=[symbol])
        symbol_vol = vol_analysis["volatility_analysis"][0] if vol_analysis["volatility_analysis"] else None
        
        # Get optimization suggestions
        optimization = advanced_tools.optimize_strategy(win_rate, avg_win, avg_loss, 50, profit_factor)
        
        return {
            "status": "success",
            "setup_analysis": {
                "symbol": symbol,
                "market_conditions": {
                    "volatility": symbol_vol["volatility_level"] if symbol_vol else "UNKNOWN",
                    "liquidity": symbol_vol["liquidity"] if symbol_vol else "UNKNOWN",
                    "recommendation": symbol_vol["recommendation"] if symbol_vol else "CHECK"
                },
                "strategy_stats": {
                    "win_rate": win_rate,
                    "avg_win": avg_win,
                    "avg_loss": avg_loss,
                    "profit_factor": profit_factor
                },
                "optimization_tips": optimization["suggestions"][:3],
                "go_no_go": "GO" if symbol_vol and symbol_vol["recommendation"] == "OPTIMAL" else "CAUTION"
            }
        }
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))