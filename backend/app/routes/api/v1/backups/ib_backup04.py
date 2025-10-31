"""
IB Connection Router - NO AUTH VERSION
Handles Interactive Brokers connection endpoints
"""

from fastapi import APIRouter, HTTPException, status
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Create router with correct prefix
router = APIRouter(prefix="/ib", tags=["IB Connection"])

# Mock IB Client for development
class MockIBClient:
    def __init__(self):
        self.connected = False
        self.account = None
        self.latency = 15
        self.host = None
        self.port = None
        self.client_id = None
    
    def connect(self, host: str, port: int, client_id: int):
        """Mock connection"""
        self.connected = True
        self.host = host
        self.port = port
        self.client_id = client_id
        self.account = f"DU{client_id}1234567"
        logger.info(f"✓ Connected to {host}:{port}")
        return True
    
    def disconnect(self):
        """Mock disconnect"""
        self.connected = False
        self.account = None
        logger.info("✓ Disconnected from IB")
    
    def is_connected(self):
        return self.connected
    
    def get_account(self):
        return self.account

# Global IB client instance
ib_client = MockIBClient()

# ============ ENDPOINTS ============

@router.get("/connection-status")
async def get_connection_status():
    """Get current IB connection status"""
    try:
        logger.info("📤 GET /api/v1/ib/connection-status called")
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
async def connect_to_ib(data: dict):
    """Connect to IB TWS/Gateway"""
    try:
        logger.info(f"📤 POST /api/v1/ib/connect called with {data}")
        
        host = data.get('host', 'localhost')
        port = data.get('port', 7497)
        client_id = data.get('client_id', 1)
        
        logger.info(f"Connection params: host={host}, port={port}, client_id={client_id}")
        
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
                detail="Failed to connect to IB"
            )
        
        logger.info(f"✓ Successfully connected to {host}:{port}")
        
        return {
            "status": "success",
            "connected": True,
            "account": ib_client.get_account(),
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
async def disconnect_from_ib():
    """Disconnect from IB"""
    try:
        logger.info("📤 POST /api/v1/ib/disconnect called")
        ib_client.disconnect()
        logger.info("✓ Successfully disconnected from IB")
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
async def test_connection(data: dict):
    """Test IB connection without connecting"""
    try:
        logger.info(f"📤 POST /api/v1/ib/test-connection called with {data}")
        
        host = data.get('host', 'localhost')
        port = data.get('port', 7497)
        client_id = data.get('client_id', 1)
        
        if not host or not port or not client_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required fields"
            )
        
        logger.info(f"✓ Connection test successful for {host}:{port}")
        
        return {
            "status": "success",
            "latency": 20,
            "message": "Connection test successful ✓"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Test connection error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Test failed: {str(e)}"
        )

@router.get("/accounts")
async def get_accounts():
    """Get available accounts from IB"""
    try:
        logger.info("📤 GET /api/v1/ib/accounts called")
        
        if not ib_client.is_connected():
            return {
                "accounts": [],
                "message": "Not connected to IB"
            }
        
        accounts = [
            {
                "account": ib_client.get_account(),
                "account_type": "INDIVIDUAL",
                "buying_power": 50000,
                "equity": 100000,
                "cash": 50000
            }
        ]
        
        logger.info(f"✓ Returning {len(accounts)} accounts")
        
        return {"accounts": accounts}
    except Exception as e:
        logger.error(f"Error getting accounts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/status")
async def get_full_status():
    """Get full connection status including health metrics"""
    try:
        logger.info("📤 GET /api/v1/ib/status called")
        
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
