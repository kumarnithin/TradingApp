from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# ============ User Schemas ============

class UserBase(BaseModel):
    """Base user information"""
    email: EmailStr
    username: str

class UserCreate(UserBase):
    """When creating a new user"""
    password: str

class UserResponse(UserBase):
    """Information we send back about a user"""
    id: int
    account_balance: float
    paper_trading: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ Signal Schemas ============

class SignalBase(BaseModel):
    """Base trading signal information"""
    symbol: str  # Like "AAPL"
    action: str  # Like "BUY" or "SELL"
    quantity: float  # How many shares
    order_type: str = "MARKET"  # Default is MARKET order
    price: Optional[float] = None  # Price for limit orders (optional)
    stop_loss: Optional[float] = None  # Stop loss price (optional)
    take_profit: Optional[float] = None  # Take profit price (optional)
    strategy_id: Optional[str] = None  # Which strategy sent this

class SignalCreate(SignalBase):
    """When creating a new signal"""
    pass

class SignalResponse(SignalBase):
    """Information we send back about a signal"""
    id: int  # The signal's ID number
    user_id: int  # Which user this is for
    status: str  # Like "PENDING" or "EXECUTED"
    received_at: datetime  # When we got the signal
    
    class Config:
        from_attributes = True


# ============ Trade Schemas ============

class TradeBase(BaseModel):
    """Base trade information"""
    symbol: str
    action: str
    quantity: float

class TradeResponse(TradeBase):
    """Information we send back about a trade"""
    id: int
    user_id: int
    entry_price: Optional[float]  # Price when we entered
    exit_price: Optional[float]  # Price when we exited
    profit_loss: float  # How much money we made/lost
    status: str  # Like "FILLED" or "PENDING"
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ Account Stats Schema ============

class AccountStats(BaseModel):
    """Information about account statistics"""
    balance: float  # How much cash you have
    daily_profit: float  # Today's profit/loss
    win_rate: float  # Percentage of winning trades
    total_trades: int  # How many trades total
    open_positions: int  # How many trades still open
