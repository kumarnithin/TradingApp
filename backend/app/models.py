from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import uuid
from datetime import datetime

class User(Base):
    """User model for authentication and account management"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    
    # Account settings
    account_balance = Column(Float, default=0.0)
    paper_trading = Column(Boolean, default=True)
    risk_level = Column(String(50), default="moderate")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    signals = relationship("Signal", back_populates="user")
    trades = relationship("Trade", back_populates="user")


class Signal(Base):
    """Trading signal from TradingView"""
    __tablename__ = "signals"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Signal details
    strategy_id = Column(String(255), index=True)
    symbol = Column(String(20), nullable=False)
    action = Column(String(10), nullable=False)
    quantity = Column(Float, nullable=False)
    order_type = Column(String(20), default="MARKET")
    price = Column(Float, nullable=True)
    stop_loss = Column(Float, nullable=True)
    take_profit = Column(Float, nullable=True)
    
    # Status tracking
    status = Column(String(20), default="PENDING")
    rejection_reason = Column(Text, nullable=True)
    
    # Timestamps
    received_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="signals")
    trades = relationship("Trade", back_populates="signal")


class Trade(Base):
    """Executed trade on Interactive Brokers"""
    __tablename__ = "trades"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    signal_id = Column(Integer, ForeignKey("signals.id"), nullable=True)
    
    # Trade details
    symbol = Column(String(20), nullable=False)
    action = Column(String(10), nullable=False)
    quantity = Column(Float, nullable=False)
    order_type = Column(String(20))
    
    # Execution details
    entry_price = Column(Float, nullable=True)
    exit_price = Column(Float, nullable=True)
    profit_loss = Column(Float, default=0.0)
    
    # IBKR details
    ibkr_order_id = Column(String(50), nullable=True)
    status = Column(String(20), default="PENDING")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    filled_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="trades")
    signal = relationship("Signal", back_populates="trades")


class ConnectionLog(Base):
    """Connection status logs for monitoring"""
    __tablename__ = "connection_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    connection_type = Column(String(50), nullable=False)
    status = Column(String(20), nullable=False)
    message = Column(Text, nullable=True)
    
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
class IBConnection(Base):
    __tablename__ = "ib_connections"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False)
    host = Column(String(50), nullable=False)
    port = Column(Integer, nullable=False)
    client_id = Column(Integer, nullable=False)
    status = Column(String(20), default='disconnected')
    last_connected = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
