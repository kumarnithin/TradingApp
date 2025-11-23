"""
Accounts API Routes - WITH IB CONNECTION FLAG
Location: /backend/app/routes/api/v1/accounts.py

✅ FIXED: Now includes is_ib_connected field in responses
"""

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from app.config import get_db
from app.database import Account
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel
import logging
import uuid

logger = logging.getLogger(__name__)
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
    account_name: Optional[str] = None
    account_type: Optional[str] = None
    ib_account_number: Optional[str] = None
    broker_name: Optional[str] = None
    account_balance: Optional[float] = None
    available_balance: Optional[float] = None
    buying_power: Optional[float] = None
    currency: Optional[str] = None
    status: Optional[str] = None

# ============ EMBEDDED ACCOUNT SERVICE ============

_current_account = None

class EmbeddedAccountService:
    """Embedded service for managing current IB connection state"""

    @staticmethod
    def set_connected_account(data: Dict[str, Any]) -> None:
        global _current_account
        _current_account = {
            **data,
            "connected_at": datetime.utcnow().isoformat(),
            "status": "connected"
        }
        logger.info(f"✅ [EmbeddedService] Account stored: {data.get('account_name')}")

    @staticmethod
    def get_connected_account() -> Optional[Dict[str, Any]]:
        global _current_account
        return _current_account

    @staticmethod
    def is_connected() -> bool:
        global _current_account
        return _current_account is not None

    @staticmethod
    def clear_connection() -> None:
        global _current_account
        if _current_account:
            acc = _current_account.get("account_name")
            _current_account = None
            logger.info(f"✅ [EmbeddedService] Cleared account: {acc}")

    @staticmethod
    def update_account_data(data: Dict[str, Any]) -> None:
        global _current_account
        if _current_account:
            _current_account.update(data)
            _current_account["last_updated"] = datetime.utcnow().isoformat()

account_service = EmbeddedAccountService()
logger.info("✅ Embedded Account Service initialized")

# ==================== DATABASE ENDPOINTS ====================

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
            status="created",
            created_at=datetime.utcnow(),
            is_ib_connected=False,
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

    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error creating account: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auto-create")
async def auto_create_account(account_data: AccountCreate, db: Session = Depends(get_db)):
    """POST /api/v1/accounts/auto-create - Auto-create IB account"""
    try:
        logger.info(f"📥 [AUTO-CREATE] Creating/updating account: {account_data.account_name}")
        existing = db.query(Account).filter(Account.account_name == account_data.account_name).first()
        
        if existing:
            logger.info(f"📊 [AUTO-CREATE] Account exists, updating status")
            existing.status = "connected"
            existing.connected_at = datetime.utcnow()
            existing.is_active = True
            if account_data.account_balance:
                existing.account_balance = account_data.account_balance
            db.commit()
            db.refresh(existing)
            logger.info(f"✅ [AUTO-CREATE] Updated account: {existing.account_name}")
            return {
                "status": "updated",
                "account_id": existing.id,
                "account_name": existing.account_name,
                "message": "Account updated (already existed)"
            }
        else:
            logger.info(f"✨ [AUTO-CREATE] Creating new account")
            account = Account(
                id=str(uuid.uuid4()),
                account_name=account_data.account_name,
                account_type=account_data.account_type,
                ib_account_number=account_data.ib_account_number,
                broker_name=account_data.broker_name or "Interactive Brokers",
                account_balance=account_data.account_balance,
                currency=account_data.currency or "USD",
                is_active=True,
                status="connected",
                created_at=datetime.utcnow(),
                connected_at=datetime.utcnow(),
                is_ib_connected=False,
            )
            db.add(account)
            db.commit()
            db.refresh(account)
            logger.info(f"✅ [AUTO-CREATE] Created account: {account.id} - {account.account_name}")
            return {
                "status": "created",
                "account_id": account.id,
                "account_name": account.account_name,
                "message": "Account created automatically"
            }

    except Exception as e:
        db.rollback()
        logger.error(f"❌ [AUTO-CREATE] Error: {str(e)}")
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
                    "is_ib_connected": getattr(a, 'is_ib_connected', False),  # ✅ ADDED
                    "account_balance": a.account_balance,
                    "available_balance": a.available_balance,
                    "buying_power": a.buying_power,
                    "currency": a.currency,
                    "is_default": a.is_default,
                    "created_at": a.created_at.isoformat() if a.created_at else None,
                    "connected_at": a.connected_at.isoformat() if a.connected_at else None,
                }
                for a in accounts
            ]
        }

    except Exception as e:
        logger.error(f"❌ Error listing accounts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/by-name/{account_name}")
async def get_account_by_name(account_name: str, db: Session = Depends(get_db)):
    """GET /api/v1/accounts/by-name/{account_name}"""
    try:
        account = db.query(Account).filter(Account.account_name == account_name).first()
        if not account:
            return {"exists": False}
        return {
            "exists": True,
            "account": {
                "id": account.id,
                "account_name": account.account_name,
                "status": account.status,
                "is_ib_connected": getattr(account, 'is_ib_connected', False),  # ✅ ADDED
            }
        }

    except Exception as e:
        logger.error(f"❌ Error fetching account: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== SPECIFIC ID ROUTES (MUST COME BEFORE /current) ====================

@router.get("/{account_id}")
async def get_account(account_id: str, db: Session = Depends(get_db)):
    """GET /api/v1/accounts/{account_id}"""
    try:
        if account_id == "current":
            raise HTTPException(status_code=404, detail="Use /current endpoint")

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
                "is_ib_connected": getattr(account, 'is_ib_connected', False),  # ✅ ADDED
                "account_balance": account.account_balance,
                "available_balance": account.available_balance,
                "buying_power": account.buying_power,
                "currency": account.currency,
                "is_default": account.is_default,
                "is_active": account.is_active,
                "created_at": account.created_at.isoformat() if account.created_at else None,
                "connected_at": account.connected_at.isoformat() if account.connected_at else None,
            }
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error fetching account: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{account_id}")
async def update_account(account_id: str, account_data: AccountUpdate, db: Session = Depends(get_db)):
    """PUT /api/v1/accounts/{account_id}"""
    try:
        account = db.query(Account).filter(Account.id == account_id).first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

        if account_data.account_name:
            existing = db.query(Account).filter(
                Account.account_name == account_data.account_name,
                Account.id != account_id
            ).first()
            if existing:
                raise HTTPException(status_code=400, detail="Account name already exists")
            account.account_name = account_data.account_name

        if account_data.account_type:
            account.account_type = account_data.account_type
        if account_data.ib_account_number is not None:
            account.ib_account_number = account_data.ib_account_number
        if account_data.broker_name is not None:
            account.broker_name = account_data.broker_name
        if account_data.account_balance is not None:
            account.account_balance = account_data.account_balance
        if account_data.available_balance is not None:
            account.available_balance = account_data.available_balance
        if account_data.buying_power is not None:
            account.buying_power = account_data.buying_power
        if account_data.currency:
            account.currency = account_data.currency
        if account_data.status:
            account.status = account_data.status

        db.commit()
        db.refresh(account)
        logger.info(f"✅ Account updated: {account.id} - {account.account_name}")
        return {
            "status": "success",
            "account_id": account.id,
            "account_name": account.account_name,
            "message": "Account updated successfully"
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error updating account: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{account_id}")
async def delete_account(account_id: str, db: Session = Depends(get_db)):
    """DELETE /api/v1/accounts/{account_id}"""
    try:
        if account_id == "current":
            raise HTTPException(status_code=404, detail="Use DELETE /current endpoint")

        account = db.query(Account).filter(Account.id == account_id).first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

        account.is_active = False
        account.status = "deleted"
        db.commit()
        logger.info(f"✅ Account deleted: {account.id} - {account.account_name}")
        return {
            "status": "success",
            "message": f"Account '{account.account_name}' deleted successfully"
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error deleting account: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== CURRENT ACCOUNT ENDPOINTS (SPECIFIC ROUTES) ====================

@router.get("/current/status")
async def get_current_account_status():
    """GET /api/v1/accounts/current/status"""
    try:
        if not account_service:
            return {"connected": False, "error": "Service unavailable"}

        is_connected = account_service.is_connected()
        current = account_service.get_connected_account() if is_connected else None

        return {
            "connected": is_connected,
            "account_name": current.get("account_name") if current else None,
            "account_type": current.get("account_type") if current else None,
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"❌ Error: {str(e)}", exc_info=True)
        return {"connected": False, "error": str(e)}

@router.get("/current")
async def get_current_account():
    """GET /api/v1/accounts/current - Get currently connected account"""
    try:
        logger.info("📥 [GET /current]")
        if not account_service:
            logger.warning("⚠️ Account service is None")
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Account service not available")

        current = account_service.get_connected_account()

        if not current:
            logger.info("ℹ️ No account connected")
            return {
                "status": "not_connected",
                "message": "No account currently connected",
                "account": None,
                "timestamp": datetime.utcnow().isoformat()
            }

        logger.info(f"✅ Returning account: {current.get('account_name')}")
        return {
            "status": "connected",
            "message": f"Connected to {current.get('account_name')}",
            "account": current,
            "timestamp": datetime.utcnow().isoformat()
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/current/update")
async def update_current_account(data: dict):
    """POST /api/v1/accounts/current/update"""
    try:
        logger.info(f"📥 [POST /current/update]")
        if not account_service:
            logger.warning("⚠️ Account service is None")
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Account service not available")

        if not account_service.is_connected():
            logger.warning("⚠️ No account connected")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No account currently connected")

        account_service.update_account_data(data)
        current = account_service.get_connected_account()

        logger.info(f"✅ Updated account: {current.get('account_name')}")
        return {
            "status": "updated",
            "account": current,
            "timestamp": datetime.utcnow().isoformat()
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.delete("/current")
async def disconnect_current_account():
    """DELETE /api/v1/accounts/current"""
    try:
        logger.info("📥 [DELETE /current]")
        if not account_service:
            logger.warning("⚠️ Account service is None")
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Account service not available")

        if not account_service.is_connected():
            logger.info("ℹ️ No account to disconnect")
            return {"status": "not_connected", "message": "No account to disconnect"}

        current = account_service.get_connected_account()
        account_name = current.get("account_name") if current else "Unknown"

        account_service.clear_connection()

        logger.info(f"✅ Disconnected: {account_name}")
        return {
            "status": "disconnected",
            "message": f"Disconnected from {account_name}",
            "timestamp": datetime.utcnow().isoformat()
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# ==================== DEBUG ====================

@router.get("/debug")
async def debug_account_info():
    """Debug endpoint"""
    logger.info("📥 [GET /debug]")
    current = account_service.get_connected_account()
    return {
        "service_type": "embedded_service",
        "is_connected": account_service.is_connected(),
        "current_account": current,
        "timestamp": datetime.utcnow().isoformat()
    }