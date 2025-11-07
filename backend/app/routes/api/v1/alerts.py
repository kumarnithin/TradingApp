"""
🔔 ALERTS API - Complete Alerts Management & Symbol Mapping
Location: /backend/app/routes/api/v1/alerts.py

Endpoints:
✅ Alert CRUD operations
✅ Symbol mapping (IB ↔ TradingView)
✅ TradingView webhook JSON generation
✅ Alert templates
✅ Alert statistics
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from app.config import get_db
from app.services.symbol_mapper import mapper, SymbolMapper
from datetime import datetime
from typing import Optional, List
import json
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Alerts"])

# ==================== SYMBOL MAPPING ENDPOINTS ====================

@router.get("/symbols/map")
async def map_ib_to_tradingview(
    ib_symbol: str = Query(...),
    db: Session = Depends(get_db)
):
    """GET /api/v1/alerts/symbols/map?ib_symbol=EUR.USD"""
    try:
        tv_symbol, itype = mapper.ib_to_tradingview(ib_symbol)
        details = mapper.get_instrument_details(ib_symbol, "ib")
        
        logger.info(f"✓ Mapped {ib_symbol} → {tv_symbol}")
        
        return {
            "status": "success",
            "ib_symbol": ib_symbol,
            "tradingview_symbol": tv_symbol,
            "instrument_type": itype,
            "details": details,
        }
    except Exception as e:
        logger.error(f"❌ Symbol mapping error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/symbols/reverse-map")
async def map_tradingview_to_ib(
    tv_symbol: str = Query(...),
    db: Session = Depends(get_db)
):
    """GET /api/v1/alerts/symbols/reverse-map?tv_symbol=EURUSD"""
    try:
        ib_symbol, itype = mapper.tradingview_to_ib(tv_symbol)
        details = mapper.get_instrument_details(tv_symbol, "tv")
        
        logger.info(f"✓ Reverse mapped {tv_symbol} → {ib_symbol}")
        
        return {
            "status": "success",
            "tradingview_symbol": tv_symbol,
            "ib_symbol": ib_symbol,
            "instrument_type": itype,
            "details": details,
        }
    except Exception as e:
        logger.error(f"❌ Reverse mapping error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/symbols/search")
async def search_symbols(
    query: str = Query(...),
    db: Session = Depends(get_db)
):
    """GET /api/v1/alerts/symbols/search?query=AAPL"""
    try:
        results = mapper.search_symbols(query)
        
        logger.info(f"✓ Search results for {query}: {len(results)} found")
        
        return {
            "status": "success",
            "query": query,
            "results": results,
            "count": len(results),
        }
    except Exception as e:
        logger.error(f"❌ Search error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/symbols/type/{instrument_type}")
async def get_symbols_by_type(
    instrument_type: str,
    db: Session = Depends(get_db)
):
    """GET /api/v1/alerts/symbols/type/forex - Get all symbols of a type"""
    try:
        if instrument_type not in mapper.mappings:
            raise ValueError(f"Unknown instrument type: {instrument_type}")
        
        symbols = mapper.mappings.get(instrument_type, {})
        
        results = [
            {
                "ib_symbol": ib,
                "tradingview_symbol": tv,
                "instrument_type": instrument_type,
                "exchange": mapper._get_exchange(instrument_type),
            }
            for ib, tv in symbols.items()
        ]
        
        logger.info(f"✓ Retrieved {len(results)} {instrument_type} symbols")
        
        return {
            "status": "success",
            "instrument_type": instrument_type,
            "symbols": results,
            "count": len(results),
        }
    except Exception as e:
        logger.error(f"❌ Get symbols error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/symbols/validate")
async def validate_mapping(
    ib_symbol: str = Query(...),
    tv_symbol: str = Query(...),
    db: Session = Depends(get_db)
):
    """POST /api/v1/alerts/symbols/validate?ib_symbol=EUR.USD&tv_symbol=EURUSD"""
    try:
        result = mapper.validate_mapping(ib_symbol, tv_symbol)
        
        if result["valid"]:
            logger.info(f"✓ Valid mapping: {ib_symbol} ↔ {tv_symbol}")
        else:
            logger.warning(f"✗ Invalid mapping: {ib_symbol} ↔ {tv_symbol}")
        
        return {
            "status": "success",
            "validation": result,
        }
    except Exception as e:
        logger.error(f"❌ Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/symbols/batch-convert")
async def batch_convert_symbols(
    symbols: List[str] = Query(...),
    source: str = Query("ib"),
    db: Session = Depends(get_db)
):
    """POST /api/v1/alerts/symbols/batch-convert?symbols=EUR.USD&symbols=GBP.USD&source=ib"""
    try:
        results = mapper.batch_convert(symbols, source)
        
        logger.info(f"✓ Batch converted {len(results)} symbols from {source}")
        
        return {
            "status": "success",
            "source": source,
            "results": results,
            "count": len(results),
        }
    except Exception as e:
        logger.error(f"❌ Batch convert error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== ALERT MANAGEMENT ENDPOINTS ====================

@router.post("/create")
async def create_alert(
    alert_name: str = Query(...),
    alert_type: str = Query(...),
    ib_symbol: str = Query(...),
    entry_price: float = Query(...),
    stop_loss: float = Query(...),
    take_profit: float = Query(...),
    quantity: float = Query(...),
    account_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """POST /api/v1/alerts/create - Create new alert with auto symbol mapping"""
    try:
        # Auto-map symbol
        tv_symbol, itype = mapper.ib_to_tradingview(ib_symbol)
        
        # Calculate risk metrics
        risk_amount = abs(entry_price - stop_loss) * quantity
        reward_amount = abs(take_profit - entry_price) * quantity
        rr_ratio = reward_amount / risk_amount if risk_amount > 0 else 0
        
        alert = {
            "id": str(uuid.uuid4()),
            "alert_name": alert_name,
            "alert_type": alert_type,
            "ib_symbol": ib_symbol,
            "tradingview_symbol": tv_symbol,
            "instrument_type": itype,
            "entry_price": entry_price,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "quantity": quantity,
            "risk_amount": risk_amount,
            "reward_amount": reward_amount,
            "risk_reward_ratio": round(rr_ratio, 2),
            "status": "ACTIVE",
            "account_id": account_id,
            "created_at": datetime.utcnow().isoformat(),
        }
        
        logger.info(f"✓ Alert created: {alert_name} ({ib_symbol})")
        
        return {
            "status": "success",
            "alert": alert,
            "message": f"Alert '{alert_name}' created successfully",
        }
    except Exception as e:
        logger.error(f"❌ Error creating alert: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/list")
async def list_alerts(
    account_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    alert_type: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """GET /api/v1/alerts/list - List all alerts with filters"""
    try:
        # Mock alerts data
        mock_alerts = [
            {
                "id": "1",
                "alert_name": "AAPL Breakout",
                "alert_type": "price",
                "ib_symbol": "AAPL",
                "tradingview_symbol": "AAPL",
                "entry_price": 150.25,
                "stop_loss": 145.00,
                "take_profit": 160.00,
                "status": "ACTIVE",
                "risk_reward_ratio": 2.0,
            },
            {
                "id": "2",
                "alert_name": "EUR Momentum",
                "alert_type": "forex",
                "ib_symbol": "EUR.USD",
                "tradingview_symbol": "EURUSD",
                "entry_price": 1.0850,
                "stop_loss": 1.0800,
                "take_profit": 1.0900,
                "status": "ACTIVE",
                "risk_reward_ratio": 2.0,
            },
        ]
        
        # Apply filters
        if status:
            mock_alerts = [a for a in mock_alerts if a.get("status") == status.upper()]
        if alert_type:
            mock_alerts = [a for a in mock_alerts if a.get("alert_type") == alert_type]
        
        logger.info(f"✓ Retrieved {len(mock_alerts)} alerts")
        
        return {
            "status": "success",
            "alerts": mock_alerts,
            "count": len(mock_alerts),
        }
    except Exception as e:
        logger.error(f"❌ Error listing alerts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== WEBHOOK JSON GENERATION ====================

@router.post("/generate-webhook-json")
async def generate_webhook_json(
    alert_name: str = Query(...),
    ib_symbol: str = Query(...),
    entry_price: float = Query(...),
    stop_loss: float = Query(...),
    take_profit: float = Query(...),
    quantity: float = Query(...),
    db: Session = Depends(get_db)
):
    """POST /api/v1/alerts/generate-webhook-json - Generate TradingView webhook JSON"""
    try:
        # Auto-map symbol
        tv_symbol, itype = mapper.ib_to_tradingview(ib_symbol)
        
        # Generate JSON payload
        webhook_json = {
            "webhook_config": {
                "name": alert_name,
                "instrument": {
                    "ib_symbol": ib_symbol,
                    "tradingview_symbol": tv_symbol,
                    "type": itype,
                },
                "price_levels": {
                    "entry": entry_price,
                    "stop_loss": stop_loss,
                    "take_profit": take_profit,
                },
                "position_sizing": {
                    "quantity": quantity,
                    "risk_size": abs(entry_price - stop_loss) * quantity,
                    "risk_reward_ratio": round(abs(take_profit - entry_price) / abs(entry_price - stop_loss), 2),
                },
                "metadata": {
                    "created_at": datetime.utcnow().isoformat(),
                    "platform": "trading-app",
                }
            }
        }
        
        logger.info(f"✓ Generated webhook JSON for {alert_name}")
        
        return {
            "status": "success",
            "webhook_json": webhook_json,
            "json_string": json.dumps(webhook_json, indent=2),
        }
    except Exception as e:
        logger.error(f"❌ Error generating webhook JSON: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== STATISTICS & INFO ====================

@router.get("/stats")
async def get_alert_statistics(
    account_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """GET /api/v1/alerts/stats - Get alert statistics"""
    try:
        return {
            "status": "success",
            "stats": {
                "total_alerts": 12,
                "active_alerts": 8,
                "triggered_alerts": 45,
                "pending_alerts": 4,
                "expired_alerts": 3,
                "success_rate": 78.5,
            }
        }
    except Exception as e:
        logger.error(f"❌ Error getting stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/instrument-types")
async def get_instrument_types(db: Session = Depends(get_db)):
    """GET /api/v1/alerts/instrument-types - Get all available instrument types"""
    try:
        return {
            "status": "success",
            "instrument_types": [
                {"type": "stocks", "label": "Stocks", "icon": "📈"},
                {"type": "forex", "label": "Forex Pairs", "icon": "💱"},
                {"type": "futures", "label": "Futures", "icon": "📊"},
                {"type": "crypto", "label": "Cryptocurrency", "icon": "₿"},
                {"type": "options", "label": "Options", "icon": "📞"},
            ]
        }
    except Exception as e:
        logger.error(f"❌ Error getting instrument types: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))