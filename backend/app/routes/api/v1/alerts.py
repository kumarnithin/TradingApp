"""
ALERTS.PY - FINAL CORRECTED VERSION
Imports SessionLocal from app.database (NOT app.models)
"""

from fastapi import APIRouter, HTTPException, status, Query
from sqlalchemy import desc, and_
from datetime import datetime, timedelta
from typing import Optional
import logging

# ✅ CORRECT: Import from app.database, NOT app.models!
from app.database import SessionLocal
from app.models import Alert

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/alerts", tags=["Alerts Management"])

# ============ ALERT ENDPOINTS ============

@router.get("/list")
async def list_alerts(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    symbol: Optional[str] = None,
    strategy: Optional[str] = None,
    status: Optional[str] = None,
    action: Optional[str] = None,
    days: Optional[int] = Query(7)
):
    """List alerts with filtering"""
    db = SessionLocal()
    
    try:
        query = db.query(Alert)
        
        # Date filter
        if days:
            date_from = datetime.utcnow() - timedelta(days=days)
            query = query.filter(Alert.created_at >= date_from)
        
        # Symbol filter
        if symbol:
            query = query.filter(Alert.symbol.ilike(f"%{symbol}%"))
        
        # Strategy filter
        if strategy:
            query = query.filter(Alert.strategy.ilike(f"%{strategy}%"))
        
        # Status filter
        if status:
            query = query.filter(Alert.status == status)
        
        # Action filter
        if action:
            query = query.filter(Alert.action == action)
        
        # Order by newest
        alerts = query.order_by(desc(Alert.created_at)).offset(skip).limit(limit).all()
        
        logger.info(f"📋 Retrieved {len(alerts)} alerts")
        return alerts
        
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@router.get("/{alert_id}")
async def get_alert(alert_id: str):
    """Get single alert"""
    db = SessionLocal()
    
    try:
        alert = db.query(Alert).filter(Alert.id == alert_id).first()
        
        if not alert:
            raise HTTPException(status_code=404, detail=f"Alert not found")
        
        return alert
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@router.delete("/{alert_id}")
async def delete_alert(alert_id: str):
    """Delete alert"""
    db = SessionLocal()
    
    try:
        alert = db.query(Alert).filter(Alert.id == alert_id).first()
        
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        db.delete(alert)
        db.commit()
        
        logger.info(f"🗑️ Alert deleted: {alert_id}")
        
        return {"status": "success", "message": "Alert deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

# ============ ANALYTICS ENDPOINTS ============

@router.get("/stats/overview")
async def get_alerts_overview(days: int = Query(7)):
    """Get overview statistics"""
    db = SessionLocal()
    
    try:
        date_from = datetime.utcnow() - timedelta(days=days)
        
        total = db.query(Alert).filter(Alert.created_at >= date_from).count()
        filled = db.query(Alert).filter(
            and_(
                Alert.created_at >= date_from,
                Alert.status == "FILLED"
            )
        ).count()
        pending = db.query(Alert).filter(
            and_(
                Alert.created_at >= date_from,
                Alert.status == "PENDING"
            )
        ).count()
        failed = db.query(Alert).filter(
            and_(
                Alert.created_at >= date_from,
                Alert.status.in_(["REJECTED", "ERROR"])
            )
        ).count()
        
        return {
            "status": "success",
            "period_days": days,
            "total_alerts": total,
            "filled": filled,
            "pending": pending,
            "failed": failed,
            "success_rate": (filled / total * 100) if total > 0 else 0
        }
        
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@router.get("/stats/by-strategy")
async def get_stats_by_strategy(days: int = Query(7)):
    """Get stats by strategy"""
    db = SessionLocal()
    
    try:
        date_from = datetime.utcnow() - timedelta(days=days)
        
        strategies = db.query(Alert.strategy).filter(
            Alert.created_at >= date_from
        ).distinct().all()
        
        results = []
        for (strategy,) in strategies:
            if not strategy:
                continue
            
            alerts = db.query(Alert).filter(
                and_(
                    Alert.created_at >= date_from,
                    Alert.strategy == strategy
                )
            ).all()
            
            total = len(alerts)
            filled = len([a for a in alerts if a.status == "FILLED"])
            wins = len([a for a in alerts if a.profit_loss and a.profit_loss > 0])
            
            results.append({
                "strategy": strategy,
                "total_signals": total,
                "filled": filled,
                "success_rate": (filled / total * 100) if total > 0 else 0,
                "win_rate": (wins / filled * 100) if filled > 0 else 0,
                "total_profit": sum([a.profit_loss or 0 for a in alerts])
            })
        
        return {
            "status": "success",
            "strategies": sorted(results, key=lambda x: x["total_profit"], reverse=True)
        }
        
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@router.get("/stats/by-symbol")
async def get_stats_by_symbol(days: int = Query(7)):
    """Get stats by symbol"""
    db = SessionLocal()
    
    try:
        date_from = datetime.utcnow() - timedelta(days=days)
        
        symbols = db.query(Alert.symbol).filter(
            Alert.created_at >= date_from
        ).distinct().all()
        
        results = []
        for (symbol,) in symbols:
            if not symbol:
                continue
            
            alerts = db.query(Alert).filter(
                and_(
                    Alert.created_at >= date_from,
                    Alert.symbol == symbol
                )
            ).all()
            
            total = len(alerts)
            filled = len([a for a in alerts if a.status == "FILLED"])
            wins = len([a for a in alerts if a.profit_loss and a.profit_loss > 0])
            
            results.append({
                "symbol": symbol,
                "total_signals": total,
                "filled": filled,
                "win_rate": (wins / filled * 100) if filled > 0 else 0,
                "total_profit": sum([a.profit_loss or 0 for a in alerts])
            })
        
        return {
            "status": "success",
            "symbols": sorted(results, key=lambda x: x["total_profit"], reverse=True)
        }
        
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

# ============ BULK OPERATIONS ============

@router.delete("/bulk/cleanup")
async def cleanup_old_alerts(days: int = Query(30)):
    """Delete old alerts"""
    db = SessionLocal()
    
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        deleted = db.query(Alert).filter(Alert.created_at < cutoff_date).delete()
        db.commit()
        
        logger.info(f"🗑️ Deleted {deleted} alerts")
        
        return {
            "status": "success",
            "deleted_count": deleted,
            "older_than_days": days
        }
        
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@router.post("/bulk/export")
async def export_alerts(
    symbol: Optional[str] = None,
    strategy: Optional[str] = None,
    days: int = Query(7)
):
    """Export alerts"""
    db = SessionLocal()
    
    try:
        query = db.query(Alert)
        
        if symbol:
            query = query.filter(Alert.symbol == symbol)
        if strategy:
            query = query.filter(Alert.strategy == strategy)
        
        date_from = datetime.utcnow() - timedelta(days=days)
        query = query.filter(Alert.created_at >= date_from)
        
        alerts = query.all()
        
        export_data = [
            {
                "id": a.id,
                "symbol": a.symbol,
                "action": a.action,
                "quantity": a.quantity,
                "status": a.status,
                "strategy": a.strategy,
                "created_at": a.created_at.isoformat(),
                "profit_loss": a.profit_loss
            }
            for a in alerts
        ]
        
        logger.info(f"📤 Exported {len(alerts)} alerts")
        
        return {
            "status": "success",
            "count": len(alerts),
            "data": export_data
        }
        
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()
