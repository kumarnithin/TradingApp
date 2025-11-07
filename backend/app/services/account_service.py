"""
Account Details Service - Store and retrieve current connected account info
Location: /backend/app/services/account_service.py
"""

import json
import os
from typing import Optional, Dict, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# In-memory storage (for single-instance deployment)
# For production with multiple instances, use Redis or database
_current_connection: Optional[Dict[str, Any]] = None


class AccountService:
    """Service to manage current connected account state"""

    @staticmethod
    def set_connected_account(account_data: Dict[str, Any]) -> None:
        """
        Store the currently connected account information
        
        Args:
            account_data: Dictionary containing account details
                - account_name: str (e.g., 'DU123456')
                - account_type: str ('demo' or 'live')
                - equity: float
                - cash: float
                - buying_power: float
                - timestamp: str (ISO format)
                - status: str ('connected')
                - etc.
        """
        global _current_connection
        _current_connection = {
            **account_data,
            "connected_at": datetime.now().isoformat(),
            "status": "connected"
        }
        logger.info(f"✅ Stored connection: {account_data.get('account_name')}")

    @staticmethod
    def get_connected_account() -> Optional[Dict[str, Any]]:
        """Get the currently connected account information"""
        global _current_connection
        return _current_connection

    @staticmethod
    def clear_connection() -> None:
        """Clear the current connection"""
        global _current_connection
        if _current_connection:
            account_name = _current_connection.get("account_name")
            _current_connection = None
            logger.info(f"❌ Cleared connection: {account_name}")

    @staticmethod
    def is_connected() -> bool:
        """Check if an account is currently connected"""
        global _current_connection
        return _current_connection is not None

    @staticmethod
    def update_account_data(data: Dict[str, Any]) -> None:
        """Update account data (e.g., refresh equity/cash values)"""
        global _current_connection
        if _current_connection:
            _current_connection.update(data)
            _current_connection["last_updated"] = datetime.now().isoformat()
            logger.info(f"🔄 Updated account data: {_current_connection.get('account_name')}")


# Create singleton instance
account_service = AccountService()