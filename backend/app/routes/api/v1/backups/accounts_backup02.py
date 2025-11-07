"""
PHASE 2: BACKEND API ENDPOINTS - MULTI-ACCOUNT SYSTEM

Create a NEW file: backend/app/routes/api/v1/accounts.py
Copy ALL code from this file into that location
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime, timedelta
from typing import List, Optional
import logging

# Import database
from app.database import SessionLocal
from app.models import Account, AccountPerformance, AccountSettings

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/accounts", tags=["Account Management"])

# ============ DEPENDENCY ============

def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ============ GET ENDPOINTS ============

@router.get("/list")
async def list_accounts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    db: Session = Depends(get_db)
):
    """Get list of all accounts"""
    try:
        accounts = db.query(Account).order_by(desc(Account.created_at)).offset(skip).limit(limit).all()
        
        logger.info(f"📋 Retrieved {len(accounts)} accounts")
        
        return {
            "status": "success",
            "accounts": [acc.to_dict() for acc in accounts],
            "count": len(accounts)
        }
    except Exception as e:
        logger.error(f"❌ Error listing accounts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{account_id}")
async def get_account(account_id: str, db: Session = Depends(get_db)):
    """Get account details with performance and settings"""
    try:
        account = db.query(Account).filter(Account.id == account_id).first()
        
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        
        # Get performance
        performance = db.query(AccountPerformance).filter(
            AccountPerformance.account_id == account_id
        ).first()
        
        # Get settings
        settings = db.query(AccountSettings).filter(
            AccountSettings.account_id == account_id
        ).first()
        
        logger.info(f"📊 Retrieved account: {account.account_name}")
        
        return {
            "status": "success",
            "account": account.to_dict(),
            "performance": performance.to_dict() if performance else None,
            "settings": settings.to_dict() if settings else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting account: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/summary/all")
async def get_accounts_summary(db: Session = Depends(get_db)):
    """Get summary of all accounts with portfolio totals"""
    try:
        accounts = db.query(Account).filter(Account.is_active == True).all()
        
        total_balance = sum([a.account_balance or 0 for a in accounts])
        total_pnl = 0
        
        summary = []
        for account in accounts:
            perf = db.query(AccountPerformance).filter(
                AccountPerformance.account_id == account.id
            ).first()
            
            pnl = perf.daily_pnl if perf else 0
            total_pnl += pnl
            
            summary.append({
                "id": account.id,
                "name": account.account_name,
                "type": account.account_type,
                "balance": account.account_balance,
                "status": account.status,
                "pnl": pnl,
                "win_rate": perf.daily_win_rate if perf else 0,
                "trades": perf.daily_trades if perf else 0,
            })
        
        logger.info(f"📊 Portfolio summary: Total={total_balance}, P&L={total_pnl}")
        
        return {
            "status": "success",
            "total_balance": total_balance,
            "total_pnl": total_pnl,
            "total_accounts": len(accounts),
            "accounts": summary
        }
    except Exception as e:
        logger.error(f"❌ Error getting summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============ POST ENDPOINTS ============

@router.post("/create")
async def create_account(
    account_name: str,
    account_type: str = "DEMO",
    ib_account_number: Optional[str] = None,
    is_default: bool = False,
    db: Session = Depends(get_db)
):
    """Create new account"""
    try:
        # Check if account already exists
        existing = db.query(Account).filter(Account.account_name == account_name).first()
        
        if existing:
            raise HTTPException(status_code=400, detail=f"Account '{account_name}' already exists")
        
        # If this is the first account, make it default
        existing_count = db.query(Account).count()
        if existing_count == 0:
            is_default = True
        
        # Create account
        new_account = Account(
            account_name=account_name,
            account_type=account_type,
            ib_account_number=ib_account_number,
            account_balance=0.0,
            available_balance=0.0,
            status="ACTIVE",
            is_default=is_default,
            is_active=True
        )
        
        db.add(new_account)
        db.flush()
        
        # Create performance record
        performance = AccountPerformance(account_id=new_account.id)
        db.add(performance)
        
        # Create settings record
        settings = AccountSettings(account_id=new_account.id)
        db.add(settings)
        
        db.commit()
        db.refresh(new_account)
        
        logger.info(f"✅ Account created: {account_name} ({new_account.id})")
        
        return {
            "status": "success",
            "message": f"Account '{account_name}' created successfully",
            "account_id": new_account.id,
            "account": new_account.to_dict()
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error creating account: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{account_id}/connect")
async def connect_account(
    account_id: str,
    account_balance: float = None,
    available_balance: float = None,
    buying_power: float = None,
    db: Session = Depends(get_db)
):
    """Connect to account and update balance"""
    try:
        account = db.query(Account).filter(Account.id == account_id).first()
        
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        
        # Update connection status
        account.status = "CONNECTED"
        account.connected_at = datetime.utcnow()
        account.last_synced_at = datetime.utcnow()
        
        # Update balances if provided
        if account_balance is not None:
            account.account_balance = account_balance
        if available_balance is not None:
            account.available_balance = available_balance
        if buying_power is not None:
            account.buying_power = buying_power
        
        db.commit()
        db.refresh(account)
        
        logger.info(f"🔌 Connected to account: {account.account_name}")
        
        return {
            "status": "success",
            "message": f"Connected to account '{account.account_name}'",
            "account": account.to_dict()
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error connecting account: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============ PUT ENDPOINTS ============

@router.put("/{account_id}")
async def update_account(
    account_id: str,
    account_name: Optional[str] = None,
    account_balance: Optional[float] = None,
    available_balance: Optional[float] = None,
    is_default: Optional[bool] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Update account details"""
    try:
        account = db.query(Account).filter(Account.id == account_id).first()
        
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        
        # Update fields
        if account_name:
            # Check if new name already exists
            existing = db.query(Account).filter(
                Account.account_name == account_name,
                Account.id != account_id
            ).first()
            if existing:
                raise HTTPException(status_code=400, detail="Account name already exists")
            account.account_name = account_name
        
        if account_balance is not None:
            account.account_balance = account_balance
        if available_balance is not None:
            account.available_balance = available_balance
        if is_default is not None:
            account.is_default = is_default
        if is_active is not None:
            account.is_active = is_active
        
        db.commit()
        db.refresh(account)
        
        logger.info(f"✏️ Updated account: {account.account_name}")
        
        return {
            "status": "success",
            "message": "Account updated successfully",
            "account": account.to_dict()
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error updating account: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{account_id}/settings")
async def update_account_settings(
    account_id: str,
    max_daily_loss: Optional[float] = None,
    max_daily_loss_percent: Optional[float] = None,
    max_position_size: Optional[float] = None,
    risk_per_trade: Optional[float] = None,
    auto_execute_enabled: Optional[bool] = None,
    daily_trade_limit: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Update account settings"""
    try:
        settings = db.query(AccountSettings).filter(
            AccountSettings.account_id == account_id
        ).first()
        
        if not settings:
            raise HTTPException(status_code=404, detail="Settings not found")
        
        # Update settings
        if max_daily_loss is not None:
            settings.max_daily_loss = max_daily_loss
        if max_daily_loss_percent is not None:
            settings.max_daily_loss_percent = max_daily_loss_percent
        if max_position_size is not None:
            settings.max_position_size = max_position_size
        if risk_per_trade is not None:
            settings.risk_per_trade = risk_per_trade
        if auto_execute_enabled is not None:
            settings.auto_execute_enabled = auto_execute_enabled
        if daily_trade_limit is not None:
            settings.daily_trade_limit = daily_trade_limit
        
        settings.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(settings)
        
        logger.info(f"⚙️ Updated settings for account: {account_id}")
        
        return {
            "status": "success",
            "message": "Settings updated successfully",
            "settings": settings.to_dict()
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error updating settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============ DELETE ENDPOINTS ============

@router.delete("/{account_id}")
async def delete_account(account_id: str, db: Session = Depends(get_db)):
    """Delete account and all its data"""
    try:
        account = db.query(Account).filter(Account.id == account_id).first()
        
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        
        account_name = account.account_name
        
        # Delete related data
        db.query(AccountPerformance).filter(AccountPerformance.account_id == account_id).delete()
        db.query(AccountSettings).filter(AccountSettings.account_id == account_id).delete()
        db.query(Account).filter(Account.id == account_id).delete()
        
        db.commit()
        
        logger.info(f"🗑️ Deleted account: {account_name}")
        
        return {
            "status": "success",
            "message": f"Account '{account_name}' deleted successfully"
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error deleting account: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{account_id}/disconnect")
async def disconnect_account(account_id: str, db: Session = Depends(get_db)):
    """Disconnect account"""
    try:
        account = db.query(Account).filter(Account.id == account_id).first()
        
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        
        account.status = "DISCONNECTED"
        db.commit()
        db.refresh(account)
        
        logger.info(f"🔌 Disconnected account: {account.account_name}")
        
        return {
            "status": "success",
            "message": f"Disconnected from '{account.account_name}'",
            "account": account.to_dict()
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error disconnecting account: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))