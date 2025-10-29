from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
import logging
from typing import Optional, List

from app.database import get_db
from app.models import IBConnection
from app.schemas import IBConnectionSchema, IBConnectionStatusSchema
from app.auth import get_current_user

router = APIRouter(prefix="/api/v1/ib", tags=["IB Connection"])
logger = logging.getLogger(__name__)

# Mock IB client - replace with real ib_insync later
class MockIBClient:
    def __init__(self):
        self.connected = False
        self.account = None
        self.latency = 0
        self.host = None
        self.port = None
        self.client_id = None
    
    def connect(self, host: str, port: int, client_id: int):
        """Simulate connection to IB"""
        try:
            # In production, this would connect to real TWS/Gateway
            # For now, just validate connection parameters
            if host and port and client_id:
                self.connected = True
                self.host = host
                self.port = port
                self.client_id = client_id
                self.account = f"DU{client_id}1234567"  # Mock account number
                self.latency = 15
                logger.info(f"✓ Connected to {host}:{port} (Client {client_id})")
                return True
            return False
        except Exception as e:
            logger.error(f"Connection error: {str(e)}")
            return False
    
    def disconnect(self):
        """Disconnect from IB"""
        self.connected = False
        self.account = None
        logger.info("✓ Disconnected from IB")
    
    def is_connected(self):
        """Check if connected"""
        return self.connected
    
    def get_account(self):
        """Get current account"""
        return self.account
    
    def test_connection(self, host: str, port: int, client_id: int):
        """Test connection without connecting"""
        try:
            # Simulate test - in production, would do actual test
            return {"success": True, "latency": 20, "message": "Connection test successful"}
        except Exception as e:
            return {"success": False, "message": str(e)}

# Global IB client instance
ib_client = MockIBClient()

# ============ Endpoints ============

@router.get("/connection-status", response_model=dict)
async def get_connection_status(current_user: dict = Depends(get_current_user)):
    """Get current IB connection status"""
    try:
        return {
            "connected": ib_client.is_connected(),
            "account": ib_client.get_account(),
            "host": ib_client.host,
            "port": ib_client.port,
            "client_id": ib_client.client_id,
            "latency": ib_client.latency,
            "last_updated": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting connection status: {str(e)}")
        return {
            "connected": False,
            "error": str(e)
        }

@router.post("/connect")
async def connect_to_ib(
    data: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Connect to IB TWS/Gateway"""
    try:
        host = data.get('host', 'localhost')
        port = data.get('port', 7497)
        client_id = data.get('client_id', 1)
        
        # Validate input
        if not host or not port or not client_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required fields: host, port, client_id"
            )
        
        # Attempt connection
        success = ib_client.connect(host, port, client_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to connect to IB. Check connection parameters."
            )
        
        # Save connection to database
        try:
            existing = db.query(IBConnection).filter(
                IBConnection.user_id == current_user.get('id')
            ).first()
            
            if existing:
                existing.host = host
                existing.port = port
                existing.client_id = client_id
                existing.status = 'connected'
                existing.last_connected = datetime.now()
            else:
                connection = IBConnection(
                    user_id=current_user.get('id'),
                    host=host,
                    port=port,
                    client_id=client_id,
                    status='connected',
                    last_connected=datetime.now()
                )
                db.add(connection)
            
            db.commit()
        except Exception as e:
            logger.warning(f"Database error (non-critical): {str(e)}")
            # Don't fail if database save fails
        
        return {
            "status": "success",
            "connected": True,
            "account": ib_client.get_account(),
            "account_id": ib_client.get_account(),
            "message": f"Successfully connected to {host}:{port}",
            "buying_power": 50000,
            "equity": 100000
        }
    
    except HTTPException as e:
        logger.error(f"Connection error: {e.detail}")
        raise e
    except Exception as e:
        logger.error(f"Unexpected error in connect: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Connection failed: {str(e)}"
        )

@router.post("/disconnect")
async def disconnect_from_ib(current_user: dict = Depends(get_current_user)):
    """Disconnect from IB"""
    try:
        ib_client.disconnect()
        return {
            "status": "success",
            "connected": False,
            "message": "Successfully disconnected from IB"
        }
    except Exception as e:
        logger.error(f"Disconnection error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Disconnection failed: {str(e)}"
        )

@router.post("/test-connection")
async def test_connection(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Test IB connection without connecting"""
    try:
        host = data.get('host', 'localhost')
        port = data.get('port', 7497)
        client_id = data.get('client_id', 1)
        
        if not host or not port or not client_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required fields"
            )
        
        result = ib_client.test_connection(host, port, client_id)
        
        if result['success']:
            return {
                "status": "success",
                "latency": result.get('latency', 20),
                "message": "Connection test successful ✓"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('message', 'Connection test failed')
            )
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Test connection error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Test failed: {str(e)}"
        )

@router.get("/accounts")
async def get_accounts(current_user: dict = Depends(get_current_user)):
    """Get available accounts from IB"""
    try:
        if not ib_client.is_connected():
            return {
                "accounts": [],
                "message": "Not connected to IB"
            }
        
        # In production, fetch real accounts from IB
        accounts = [
            {
                "account": ib_client.get_account(),
                "account_type": "INDIVIDUAL",
                "buying_power": 50000,
                "equity": 100000,
                "cash": 50000
            }
        ]
        
        return {"accounts": accounts}
    except Exception as e:
        logger.error(f"Error getting accounts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/status")
async def get_full_status(current_user: dict = Depends(get_current_user)):
    """Get full connection status including health metrics"""
    try:
        return {
            "connected": ib_client.is_connected(),
            "account": ib_client.get_account(),
            "host": ib_client.host,
            "port": ib_client.port,
            "client_id": ib_client.client_id,
            "latency": ib_client.latency,
            "uptime": "99.5%" if ib_client.is_connected() else "0%",
            "last_updated": datetime.now().isoformat(),
            "health": "healthy" if ib_client.is_connected() else "disconnected"
        }
    except Exception as e:
        logger.error(f"Error getting status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
