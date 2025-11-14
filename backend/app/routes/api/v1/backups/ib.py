"""
IB Connection Router - FINAL COMPLETE VERSION
Location: /backend/app/routes/api/v1/ib.py

✅ COMPLETE WITH:
- Account service integration (embedded service)
- Auto-create account in database on IB connect
- Status persistence across page reloads
- All existing logic preserved
"""

from fastapi import APIRouter, HTTPException, status
import logging
from datetime import datetime
from typing import Optional
import asyncio
import uuid

logger = logging.getLogger(__name__)

# ✅ NO PREFIX HERE - main.py adds the full prefix
router = APIRouter(tags=["IB Connection"])

# Import IB client service with error handling
ib_client = None

try:
    from app.services.ib_client import ib_client as _ib_client
    ib_client = _ib_client
    logger.info("✓ Real IB Client Service imported successfully")
except ImportError as e:
    logger.error(f"✗ Failed to import IB Client Service: {e}")
    ib_client = None
except Exception as e:
    logger.error(f"✗ Error loading IB Client Service: {e}")
    ib_client = None

# ============ ACCOUNT DISCOVERY ============

@router.post("/get-accounts")
async def get_available_accounts(data: dict):
    """Get list of available accounts from TWS/Gateway"""
    try:
        if not ib_client:
            logger.error("IB Client Service is not available")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="IB Client Service not initialized. Check backend logs for errors."
            )

        account_type = data.get('account_type', 'demo').lower()
        host = data.get('host', '127.0.0.1')
        port = data.get('port')
        client_id = data.get('client_id', 99)

        if account_type not in ['demo', 'live']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="account_type must be 'demo' or 'live'"
            )

        if port is None:
            port = 7497 if account_type == "demo" else 7496

        logger.info(f"📤 Scanning {account_type.upper()} accounts at {host}:{port}")

        try:
            await ib_client.ib.connectAsync(host, port, clientId=client_id)
            await asyncio.sleep(0.5)

            managed_accounts = ib_client.ib.managedAccounts()

            if not managed_accounts:
                ib_client.ib.disconnect()
                logger.info(f"No {account_type} accounts found")
                return {
                    "status": "no_accounts",
                    "message": f"No {account_type} accounts found",
                    "accounts": [],
                    "timestamp": datetime.now().isoformat()
                }

            accounts_list = []

            for acc in managed_accounts:
                try:
                    account_values = ib_client.ib.accountValues(account=acc)
                    account_info = {
                        "account_name": acc,
                        "account_type": account_type,
                        "account_pattern": "DU" if acc.startswith("DU") else "U" if acc.startswith("U") else "UNKNOWN",
                    }

                    for val in account_values:
                        if val.tag == "NetLiquidation":
                            account_info["equity"] = float(val.value)
                        elif val.tag == "TotalCashValue":
                            account_info["cash"] = float(val.value)
                        elif val.tag == "BuyingPower":
                            account_info["buying_power"] = float(val.value)

                    accounts_list.append(account_info)

                except Exception as e:
                    logger.warning(f"Error getting info for account {acc}: {e}")
                    accounts_list.append({
                        "account_name": acc,
                        "account_type": account_type,
                        "error": str(e)
                    })

            if ib_client.ib.isConnected():
                ib_client.ib.disconnect()

            logger.info(f"✅ Found {len(accounts_list)} {account_type.upper()} account(s)")

            return {
                "status": "success",
                "account_type": account_type,
                "accounts": accounts_list,
                "count": len(accounts_list),
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error scanning accounts: {str(e)}")
            if ib_client.ib.isConnected():
                ib_client.ib.disconnect()

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to scan accounts: {str(e)}"
            )

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# ============ CONNECTION ENDPOINTS ============

@router.post("/connect")
async def connect_to_ib(data: dict):
    """Connect to IB TWS with account selection"""
    try:
        if not ib_client:
            logger.error("IB Client Service is not available")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="IB Client Service not initialized. Check backend logs for errors."
            )

        account_name = data.get('account_name')
        if not account_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="account_name is required. Use /get-accounts first to see available accounts"
            )

        host = data.get('host', '127.0.0.1')
        port = data.get('port')
        client_id = data.get('client_id', 1)

        # ✅ YOUR EXISTING DEMO/LIVE DETECTION LOGIC - UNCHANGED
        if account_name.startswith("DU"):
            account_type = "demo"
            if port is None:
                port = 7497
            account_label = "DEMO (Paper Trading)"

        elif account_name.startswith("U"):
            account_type = "live"
            if port is None:
                port = 7496
            account_label = "LIVE (Real Trading) ⚠️"

        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid account format: {account_name}. Demo accounts start with 'DU', Live accounts start with 'U'"
            )

        logger.info(f"📤 Connecting to {account_name} ({account_label}) at {host}:{port}")

        # ✅ YOUR EXISTING CONNECT LOGIC - UNCHANGED
        result = await ib_client.connect(
            account_type=account_type,
            account_name=account_name,
            host=host,
            port=port,
            client_id=client_id
        )

        if result["status"] == "success":
            logger.info(f"✅ Connected to {account_name}")
            
            # ============ NEW: STORE & CREATE ACCOUNT DATA ============
            # This creates the account in database AND embedded service
            
            # STEP 1: Store in embedded service (for current connection state)
            try:
                from app.routes.api.v1.accounts import account_service
                
                logger.info(f"📊 Storing account in service: {account_name}")
                
                account_service.set_connected_account({
                    "account_name": account_name,
                    "account_type": account_type,
                    "host": host,
                    "port": port,
                    "status": "connected",
                    "equity": 0.0,
                    "cash": 0.0,
                    "buying_power": 0.0,
                })
                
                logger.info(f"✅ Account stored in service: {account_name}")
                
            except Exception as e:
                logger.warning(f"⚠️ Could not store in service: {str(e)}")
            
            # STEP 2: Create/Update in database (for persistent storage)
            try:
                from app.config import get_db
                from sqlalchemy.orm import Session
                
                logger.info(f"💾 Creating/updating account in database: {account_name}")
                
                # Get database session
                db_gen = get_db()
                db = next(db_gen)
                
                try:
                    from app.database import Account
                    
                    # Check if account already exists
                    existing_account = db.query(Account).filter(
                        Account.account_name == account_name
                    ).first()
                    
                    if existing_account:
                        # Update existing account
                        logger.info(f"📊 Account exists, updating status: {account_name}")
                        existing_account.status = "connected"
                        existing_account.connected_at = datetime.utcnow()
                        existing_account.is_active = True
                        existing_account.account_type = account_type
                        
                        db.commit()
                        db.refresh(existing_account)
                        
                        logger.info(f"✅ Account updated in DB: {account_name} (Status: Connected)")
                        
                        result["account_db_status"] = "updated"
                        result["account_id"] = existing_account.id
                        
                    else:
                        # Create new account
                        logger.info(f"✨ Creating new account in database: {account_name}")
                        
                        new_account = Account(
                            id=str(uuid.uuid4()),
                            account_name=account_name,
                            account_type=account_type,
                            ib_account_number=account_name,
                            broker_name="Interactive Brokers",
                            currency="USD",
                            is_active=True,
                            status="connected",
                            created_at=datetime.utcnow(),
                            connected_at=datetime.utcnow(),
                        )
                        
                        db.add(new_account)
                        db.commit()
                        db.refresh(new_account)
                        
                        logger.info(f"✅ Account created in DB: {account_name} (ID: {new_account.id})")
                        
                        result["account_db_status"] = "created"
                        result["account_id"] = new_account.id
                
                finally:
                    db.close()
                
            except Exception as e:
                logger.warning(f"⚠️ Could not save to database: {str(e)}", exc_info=True)
                # Connection still succeeds even if DB save fails
            
            # ============ END AUTO-CREATE ============
            
            return result
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Connection failed")
            )

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Connection error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Connection failed: {str(e)}"
        )

@router.post("/disconnect")
async def disconnect_from_ib():
    """Disconnect from IB"""
    try:
        if not ib_client:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="IB Client Service not available"
            )

        logger.info("📤 Disconnecting from IB")
        result = await ib_client.disconnect()
        logger.info("✅ Disconnected")
        return result

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Disconnection error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Disconnection failed: {str(e)}"
        )

@router.get("/connection-status")
async def get_connection_status():
    """Get current IB connection status"""
    try:
        if not ib_client:
            return {
                "connected": False,
                "error": "IB Client Service not available"
            }

        result = await ib_client.get_connection_status()
        return result

    except Exception as e:
        logger.error(f"Error getting connection status: {str(e)}")
        return {
            "connected": False,
            "error": str(e)
        }

# ============ ACCOUNT ENDPOINTS ============

@router.get("/account-info")
async def get_account_info():
    """Get current account information"""
    try:
        if not ib_client:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="IB Client Service not available"
            )

        if not ib_client.is_connected():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Not connected to IB. Call /connect first."
            )

        logger.info("📤 Getting account info")
        result = await ib_client.get_account_info()
        return result

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# ============ MARKET DATA ENDPOINTS ============

@router.post("/market-data")
async def get_market_data(data: dict):
    """Get real-time market data"""
    try:
        if not ib_client:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="IB Client Service not available"
            )

        if not ib_client.is_connected():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Not connected to IB"
            )

        contract_type = data.get('contract_type')
        if not contract_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="contract_type is required"
            )

        logger.info(f"📤 Getting market data: {contract_type} {data.get('symbol')}")
        result = await ib_client.get_market_data(contract_type, **data)
        return result

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# ============ POSITIONS & ORDERS ============

@router.get("/positions")
async def get_positions():
    """Get all open positions"""
    try:
        if not ib_client:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Service unavailable"
            )

        if not ib_client.is_connected():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Not connected to IB"
            )

        result = await ib_client.get_positions()
        return result

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/orders")
async def get_orders():
    """Get all open orders"""
    try:
        if not ib_client:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Service unavailable"
            )

        if not ib_client.is_connected():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Not connected to IB"
            )

        result = await ib_client.get_orders()
        return result

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/orders/place")
async def place_order(data: dict):
    """Place a new order"""
    try:
        if not ib_client:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Service unavailable"
            )

        if not ib_client.is_connected():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Not connected to IB"
            )

        contract_type = data.get('contract_type')
        action = data.get('action', 'BUY').upper()
        quantity = int(data.get('quantity', 1))
        order_type = data.get('order_type', 'MKT')
        limit_price = data.get('limit_price')

        if action not in ['BUY', 'SELL']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="action must be BUY or SELL"
            )

        # Remove duplicate keys before unpacking
        filtered_data = dict(data)
        for key in ['order_type', 'quantity', 'action', 'contract_type', 'limit_price']:
            filtered_data.pop(key, None)

        result = await ib_client.place_order(
            contract_type,
            action,
            quantity,
            order_type=order_type,
            limit_price=limit_price,
            **filtered_data
        )

        return result

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error placing order: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/orders/{order_id}")
async def cancel_order(order_id: int):
    """Cancel an order"""
    try:
        if not ib_client:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Service unavailable"
            )

        if not ib_client.is_connected():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Not connected to IB"
            )

        result = await ib_client.cancel_order(order_id)
        return result

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# ============ SYSTEM STATUS ============

@router.get("/status")
async def get_status():
    """Get full IB connection and system status"""
    try:
        if not ib_client:
            return {
                "service_available": False,
                "connected": False,
                "error": "IB Client Service not initialized",
                "timestamp": datetime.now().isoformat()
            }

        status_data = {
            "service_available": True,
            "connected": ib_client.is_connected(),
            "timestamp": datetime.now().isoformat()
        }

        if ib_client.is_connected():
            account_info = await ib_client.get_account_info()
            status_data.update(account_info)

        return status_data

    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return {
            "service_available": False,
            "connected": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }