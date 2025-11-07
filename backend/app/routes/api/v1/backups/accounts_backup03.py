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

# Import account service
try:
    from app.services.account_service import account_service
except ImportError:
    logger.warning("Account service not found, creating mock")
    account_service = None

# ============ CURRENT ACCOUNT ENDPOINTS ============

@router.get("/current")
async def get_current_account():
    """
    GET /api/v1/accounts/current
    Get the currently connected IB account details
    """
    try:
        if not account_service:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Account service not available"
            )

        current = account_service.get_connected_account()

        if not current:
            return {
                "status": "not_connected",
                "message": "No account currently connected",
                "account": None,
                "timestamp": datetime.now().isoformat()
            }

        return {
            "status": "connected",
            "message": f"Connected to {current.get('account_name')}",
            "account": current,
            "timestamp": datetime.now().isoformat()
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error getting current account: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/current/status")
async def get_current_account_status():
    """
    GET /api/v1/accounts/current/status
    Get quick status of current connection
    """
    try:
        if not account_service:
            return {"connected": False, "error": "Service unavailable"}

        is_connected = account_service.is_connected()
        current = account_service.get_connected_account() if is_connected else None

        return {
            "connected": is_connected,
            "account_name": current.get("account_name") if current else None,
            "account_type": current.get("account_type") if current else None,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return {
            "connected": False,
            "error": str(e)
        }

@router.post("/current/update")
async def update_current_account(data: dict):
    """
    POST /api/v1/accounts/current/update
    Update the current account's financial data (refresh equity/cash)
    
    Body:
    {
        "equity": 100000,
        "cash": 50000,
        "buying_power": 75000
    }
    """
    try:
        if not account_service:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Account service not available"
            )

        if not account_service.is_connected():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No account currently connected"
            )

        account_service.update_account_data(data)
        current = account_service.get_connected_account()

        logger.info(f"Updated account data for {current.get('account_name')}")

        return {
            "status": "updated",
            "account": current,
            "timestamp": datetime.now().isoformat()
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error updating account: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/current")
async def disconnect_current_account():
    """
    DELETE /api/v1/accounts/current
    Disconnect the current account
    """
    try:
        if not account_service:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Account service not available"
            )

        if not account_service.is_connected():
            return {
                "status": "not_connected",
                "message": "No account to disconnect"
            }

        current = account_service.get_connected_account()
        account_name = current.get("account_name") if current else "Unknown"

        account_service.clear_connection()

        logger.info(f"Disconnected from {account_name}")

        return {
            "status": "disconnected",
            "message": f"Disconnected from {account_name}",
            "timestamp": datetime.now().isoformat()
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error disconnecting: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# ============ HELPER ENDPOINTS ============

@router.get("/list")
async def get_accounts_list():
    """Get list of configured accounts (placeholder)"""
    return {
        "accounts": [
            {
                "id": 1,
                "name": "Demo Account",
                "type": "demo",
                "connected": False
            },
            {
                "id": 2,
                "name": "Live01",
                "type": "live",
                "connected": False
            }
        ]
    }