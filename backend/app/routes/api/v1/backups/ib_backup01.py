from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.schemas import IBConnectionSchema, IBStatusSchema
from app.models import IBConnection
from app.database import get_db
from app.ib_client import IBClient
import logging

router = APIRouter(prefix="/api/v1/ib", tags=["IB Connection"])
logger = logging.getLogger(__name__)

# Global IB client instance
ib_client = IBClient()

@router.get("/connection-status", response_model=IBStatusSchema)
async def get_connection_status(current_user: dict = Depends(get_current_user)):
    """Get current IB connection status"""
    return {
        "connected": ib_client.is_connected(),
        "account": ib_client.get_account() if ib_client.is_connected() else None,
        "last_updated": datetime.now()
    }

@router.post("/connect")
async def connect_to_ib(
    connection_data: IBConnectionSchema,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Connect to IB TWS/Gateway"""
    try:
        # Save connection details
        ib_conn = IBConnection(
            user_id=current_user["id"],
            host=connection_data.host,
            port=connection_data.port,
            client_id=connection_data.client_id
        )
        db.add(ib_conn)
        db.commit()
        
        # Connect to IB
        success = ib_client.connect(
            host=connection_data.host,
            port=connection_data.port,
            clientId=connection_data.client_id
        )
        
        if success:
            ib_conn.status = "connected"
            ib_conn.last_connected = datetime.now()
            db.commit()
            return {"status": "connected", "message": "Successfully connected to IB"}
        else:
            raise HTTPException(status_code=400, detail="Failed to connect to IB")
    except Exception as e:
        logger.error(f"Connection error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/disconnect")
async def disconnect_from_ib(current_user: dict = Depends(get_current_user)):
    """Disconnect from IB"""
    try:
        ib_client.disconnect()
        return {"status": "disconnected", "message": "Disconnected from IB"}
    except Exception as e:
        logger.error(f"Disconnection error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/accounts")
async def get_accounts(current_user: dict = Depends(get_current_user)):
    """Get available accounts from IB"""
    if not ib_client.is_connected():
        raise HTTPException(status_code=400, detail="Not connected to IB")
    
    accounts = ib_client.get_accounts()
    return {"accounts": accounts}
