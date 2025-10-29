"""
Authentication Module
Simple mock authentication for development
"""

from typing import Optional
from fastapi import Header, HTTPException, status

def get_current_user(authorization: Optional[str] = Header(None)):
    """
    Mock authentication - returns a fake user
    Replace with real authentication later
    """
    # For now, return a mock user without checking tokens
    return {
        "id": "user_123",
        "username": "demo_user",
        "email": "demo@example.com"
    }

async def get_current_user_async(authorization: Optional[str] = Header(None)):
    """
    Async version of get_current_user
    """
    return get_current_user(authorization)

def verify_token(token: str) -> bool:
    """
    Mock token verification
    Replace with real JWT verification later
    """
    # For development, accept any token
    return True

def create_access_token(data: dict) -> str:
    """
    Mock token creation
    Replace with real JWT token generation later
    """
    # For development, return a simple token
    return f"mock_token_{data.get('user_id', 'unknown')}"
