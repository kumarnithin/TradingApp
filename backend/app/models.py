from sqlalchemy import Column, String, Integer, Float, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String(255), unique=True)
    email = Column(String(255), unique=True)

class Account(Base):
    __tablename__ = "accounts"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    account_name = Column(String, nullable=False, unique=True)
    account_type = Column(String)  # DEMO, LIVE, PAPER
    ib_account_number = Column(String(20))
    broker_name = Column(String)
    status = Column(String)  # connected, disconnected
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    account_balance = Column(Float)
    available_balance = Column(Float)
    buying_power = Column(Float)
    currency = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    connected_at = Column(DateTime)
    last_synced_at = Column(DateTime)
    
    # Relationships
    signals = relationship("Signal", back_populates="account")
    trades = relationship("Trade", back_populates="account")
    alerts = relationship("Alert", back_populates="account")

class Signal(Base):
    __tablename__ = "signals"
    id = Column(Integer, primary_key=True, autoincrement=True)
    account_id = Column(String(36), ForeignKey("accounts.id"), nullable=True)  # ✅ NOW LINKED TO ACCOUNT
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    strategy_id = Column(String(255))
    symbol = Column(String(20), nullable=False)
    action = Column(String(10), nullable=False)  # BUY, SELL
    quantity = Column(Float, nullable=False)
    order_type = Column(String(20))  # MKT, LMT
    price = Column(Float)
    stop_loss = Column(Float)
    take_profit = Column(Float)
    status = Column(String(20), default="pending")  # pending, validated, executed, rejected
    rejection_reason = Column(Text)
    confidence_score = Column(Float, default=50)  # 0-100 (for ML validation later)
    received_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime)
    
    # Relationships
    account = relationship("Account", back_populates="signals")
    trades = relationship("Trade", back_populates="signal")

class Trade(Base):
    __tablename__ = "trades"
    id = Column(Integer, primary_key=True, autoincrement=True)
    account_id = Column(String(36), ForeignKey("accounts.id"), nullable=True)  # ✅ NOW LINKED TO ACCOUNT
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    signal_id = Column(Integer, ForeignKey("signals.id"))
    symbol = Column(String(20), nullable=False)
    action = Column(String(10), nullable=False)  # BUY, SELL
    quantity = Column(Float, nullable=False)
    order_type = Column(String(20))
    entry_price = Column(Float)
    exit_price = Column(Float)
    profit_loss = Column(Float, default=0)
    profit_loss_percent = Column(Float, default=0)
    ibkr_order_id = Column(String(50))
    status = Column(String(20), default="open")  # open, closed, cancelled
    created_at = Column(DateTime, default=datetime.utcnow)
    filled_at = Column(DateTime)
    closed_at = Column(DateTime)
    
    # Relationships
    account = relationship("Account", back_populates="trades")
    signal = relationship("Signal", back_populates="trades")

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    account_id = Column(String(36), ForeignKey("accounts.id"), nullable=True)  # ✅ NOW LINKED TO ACCOUNT
    alert_id = Column(String)
    symbol = Column(String, nullable=False)
    action = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    order_type = Column(String)
    limit_price = Column(Float)
    contract_type = Column(String)
    stop_loss = Column(Float)
    take_profit = Column(Float)
    strategy = Column(String)
    strategy_id = Column(String)
    timeframe = Column(String)
    signal_strength = Column(Float)
    status = Column(String)  # pending, sent, executed, failed
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    order_id = Column(Integer)
    execution_price = Column(Float)
    filled_quantity = Column(Integer)
    average_fill_price = Column(Float)
    raw_payload = Column(Text)
    comment = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    submitted_at = Column(DateTime)
    filled_at = Column(DateTime)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    profit_loss = Column(Float)
    profit_loss_percent = Column(Float)
    
    # Relationships
    account = relationship("Account", back_populates="alerts")
