"""
Database Models - FIXED VERSION
Location: /backend/app/database.py

✅ FIXED: Removed duplicate Trade model definition
✅ All models in one place
✅ No duplicate table errors
"""

from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
from app.config import DATABASE_URL
import logging

logger = logging.getLogger(__name__)

# Create database engine
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base for models
Base = declarative_base()

# ==================== USER MODEL ====================
class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)

# ==================== ACCOUNT MODEL ====================
class Account(Base):
    __tablename__ = "accounts"

    id = Column(String, primary_key=True)
    account_name = Column(String, unique=True, index=True)
    account_type = Column(String)  # demo or live
    ib_account_number = Column(String, nullable=True)
    broker_name = Column(String, nullable=True)
    status = Column(String, default="created")  # created, connected, disconnected
    is_ib_connected = Column(Boolean, default=False)  # ✅ ADD THIS LINE
    account_balance = Column(Float, nullable=True)
    available_balance = Column(Float, nullable=True)
    buying_power = Column(Float, nullable=True)
    currency = Column(String, default="USD")
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    connected_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)

# ==================== SIGNAL MODEL ====================
class Signal(Base):
    __tablename__ = "signals"

    id = Column(String, primary_key=True)
    account_id = Column(String, ForeignKey("accounts.id"))
    symbol = Column(String, index=True)
    action = Column(String)  # BUY, SELL
    quantity = Column(Integer)
    strategy_id = Column(String, nullable=True)
    strategy = Column(String, nullable=True)
    status = Column(String)  # PENDING, FILLED, CANCELLED
    entry_price = Column(Float, nullable=True)
    profit_loss = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    filled_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    # ✅ ADD THESE 4 LINES:
    received_at = Column(DateTime, default=datetime.utcnow, nullable=True)
    processed_at = Column(DateTime, nullable=True)
    filled_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)


# ==================== ALERT MODEL ====================
class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True)
    account_id = Column(String, ForeignKey("accounts.id"))
    symbol = Column(String, index=True)
    action = Column(String)  # BUY, SELL
    quantity = Column(Integer)
    strategy = Column(String, nullable=True)
    status = Column(String)  # PENDING, FILLED, CANCELLED
    profit_loss = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

# ==================== TRADE MODEL ====================
class Trade(Base):
    __tablename__ = "trades"

    id = Column(String, primary_key=True)
    account_id = Column(String, ForeignKey("accounts.id"), index=True)
    symbol = Column(String, index=True)
    action = Column(String)  # BUY, SELL
    entry_price = Column(Float)
    exit_price = Column(Float, nullable=True)
    quantity = Column(Integer)
    trade_type = Column(String, default="Market")  # Market, Limit, Stop
    status = Column(String, default="OPEN")  # OPEN, CLOSED, PENDING, DELETED
    profit_loss = Column(Float, nullable=True)
    win_percentage = Column(Float, nullable=True)
    commission = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    entry_at = Column(DateTime, default=datetime.utcnow)
    exit_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)

# ==================== PORTFOLIO HOLDING MODEL ====================
class PortfolioHolding(Base):
    __tablename__ = "portfolio_holdings"

    id = Column(String, primary_key=True)
    account_id = Column(String, ForeignKey("accounts.id"), index=True)
    symbol = Column(String, index=True)
    quantity = Column(Integer)
    avg_cost = Column(Float)
    current_price = Column(Float)
    market_value = Column(Float)
    pnl = Column(Float)
    pnl_percent = Column(Float)
    day_change = Column(Float)
    day_change_percent = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)

# ==================== WATCHLIST MODEL ====================
class Watchlist(Base):
    __tablename__ = "watchlists"

    id = Column(String, primary_key=True)
    account_id = Column(String, ForeignKey("accounts.id"), index=True)
    symbol = Column(String, index=True)
    entry_price = Column(Float, nullable=True)
    target_price = Column(Float, nullable=True)
    stop_price = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

# ==================== Create all tables ====================
def create_tables():
    """Create all tables in database"""
    Base.metadata.create_all(bind=engine)
    logger.info("✅ All tables created successfully!")

# Initialize on import
create_tables()