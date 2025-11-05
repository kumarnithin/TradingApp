"""
Accounts API Routes - Phase 0.5 (PREFIX REMOVED)
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.config import get_db
from app.database import Account
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
import logging
import uuid

logger = logging.getLogger(__name__)

# ✅ NO PREFIX HERE - main.py adds it
router = APIRouter(tags=["Accounts"])

# ==================== Pydantic Models ====================

class AccountCreate(BaseModel):
    account_name: str
    account_type: str
    ib_account_number: Optional[str] = None
    broker_name: Optional[str] = "Interactive Brokers"
    account_balance: Optional[float] = None
    currency: Optional[str] = "USD"

class AccountUpdate(BaseModel):
    status: Optional[str] = None
    account_balance: Optional[float] = None
    available_balance: Optional[float] = None
    buying_power: Optional[float] = None

# ==================== ENDPOINTS ====================

@router.post("/create")
async def create_account(account_data: AccountCreate, db: Session = Depends(get_db)):
    """POST /api/v1/accounts/create"""
    try:
        existing = db.query(Account).filter(Account.account_name == account_data.account_name).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Account '{account_data.account_name}' already exists")
        
        account = Account(
            id=str(uuid.uuid4()),
            account_name=account_data.account_name,
            account_type=account_data.account_type,
            ib_account_number=account_data.ib_account_number,
            broker_name=account_data.broker_name,
            account_balance=account_data.account_balance,
            currency=account_data.currency,
            is_active=True,
            status="connected",
            created_at=datetime.utcnow(),
            connected_at=datetime.utcnow()
        )
        
        db.add(account)
        db.commit()
        db.refresh(account)
        
        logger.info(f"✅ Account created: {account.id} - {account.account_name}")
        
        return {
            "status": "success",
            "account_id": account.id,
            "account_name": account.account_name,
            "message": "Account created successfully"
        }
    
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error creating account: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def list_accounts(db: Session = Depends(get_db)):
    """GET /api/v1/accounts/list"""
    try:
        accounts = db.query(Account).filter(Account.is_active == True).all()
        
        return {
            "status": "success",
            "count": len(accounts),
            "accounts": [
                {
                    "id": a.id,
                    "account_name": a.account_name,
                    "account_type": a.account_type,
                    "ib_account_number": a.ib_account_number,
                    "broker_name": a.broker_name,
                    "status": a.status,
                    "account_balance": a.account_balance,
                    "available_balance": a.available_balance,
                    "buying_power": a.buying_power,
                    "currency": a.currency,
                    "is_default": a.is_default,
                    "created_at": a.created_at.isoformat() if a.created_at else None,
                    "connected_at": a.connected_at.isoformat() if a.connected_at else None,
                    "last_synced_at": a.last_synced_at.isoformat() if a.last_synced_at else None
                }
                for a in accounts
            ]
        }
    
    except Exception as e:
        logger.error(f"❌ Error listing accounts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{account_id}")
async def get_account(account_id: str, db: Session = Depends(get_db)):
    """GET /api/v1/accounts/{account_id}"""
    try:
        account = db.query(Account).filter(Account.id == account_id).first()
        
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        
        return {
            "status": "success",
            "account": {
                "id": account.id,
                "account_name": account.account_name,
                "account_type": account.account_type,
                "ib_account_number": account.ib_account_number,
                "broker_name": account.broker_name,
                "status": account.status,
                "account_balance": account.account_balance,
                "available_balance": account.available_balance,
                "buying_power": account.buying_power,
                "currency": account.currency,
                "is_default": account.is_default,
                "is_active": account.is_active
            }
        }
    
    except Exception as e:
        logger.error(f"❌ Error fetching account: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
