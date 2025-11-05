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
"""
Alert Database Models - ADD TO YOUR EXISTING models.py
Copy these tables to your existing app/database/models.py file
"""

# ============ ADD THESE IMPORTS TO THE TOP ============
# (Add to existing imports in your models.py)

from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, Text, Boolean, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import enum
import uuid

# ============ ADD THESE ENUMS ============
# (Add after your existing enums)

class ActionEnum(str, enum.Enum):
    BUY = "BUY"
    SELL = "SELL"
    EXIT = "EXIT"

class OrderTypeEnum(str, enum.Enum):
    MARKET = "MKT"
    LIMIT = "LMT"
    STOP = "STOP"
    STOP_LIMIT = "STOP_LIMIT"

class AlertStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    SUBMITTED = "SUBMITTED"
    FILLED = "FILLED"
    PARTIALLY_FILLED = "PARTIALLY_FILLED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"
    ERROR = "ERROR"
    EXPIRED = "EXPIRED"

# ============ ADD THESE MODELS ============
# (Add after your existing models)

class Alert(Base):
    """Store TradingView webhook alerts"""
    __tablename__ = "alerts"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    alert_id = Column(String, unique=True, nullable=True)
    
    # Signal Details
    symbol = Column(String, nullable=False)
    action = Column(String, nullable=False)  # BUY, SELL, EXIT
    quantity = Column(Integer, nullable=False)
    order_type = Column(String, default="MKT")
    limit_price = Column(Float, nullable=True)
    contract_type = Column(String, default="stock")
    
    # Risk Management
    stop_loss = Column(Float, nullable=True)
    take_profit = Column(Float, nullable=True)
    
    # Strategy Information
    strategy = Column(String, nullable=True)
    strategy_id = Column(String, nullable=True)
    timeframe = Column(String, nullable=True)
    signal_strength = Column(Float, nullable=True)
    
    # Status & Execution
    status = Column(String, default="PENDING")
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    
    # IB Order Details
    order_id = Column(Integer, nullable=True)
    execution_price = Column(Float, nullable=True)
    filled_quantity = Column(Integer, default=0)
    average_fill_price = Column(Float, nullable=True)
    
    # Metadata
    raw_payload = Column(Text, nullable=True)
    comment = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    submitted_at = Column(DateTime, nullable=True)
    filled_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Performance
    profit_loss = Column(Float, nullable=True)
    profit_loss_percent = Column(Float, nullable=True)
    
    account_id = Column(String, ForeignKey("accounts.id"), nullable=True)

    def __repr__(self):
        return f"<Alert {self.id}: {self.action} {self.quantity} {self.symbol}>"


class ExecutionLog(Base):
    """Detailed execution history"""
    __tablename__ = "execution_logs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    alert_id = Column(String, nullable=False)
    order_id = Column(Integer, nullable=False)
    execution_price = Column(Float, nullable=False)
    filled_qty = Column(Integer, nullable=False)
    fill_time = Column(DateTime, default=datetime.utcnow)
    status = Column(String)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<ExecutionLog alert_id={self.alert_id}, order_id={self.order_id}>"


class StrategyPerformance(Base):
    """Performance metrics per strategy"""
    __tablename__ = "strategy_performance"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    strategy_id = Column(String, unique=True, nullable=False)
    strategy_name = Column(String, nullable=False)
    
    total_signals = Column(Integer, default=0)
    executed_signals = Column(Integer, default=0)
    filled_signals = Column(Integer, default=0)
    failed_signals = Column(Integer, default=0)
    
    winning_trades = Column(Integer, default=0)
    losing_trades = Column(Integer, default=0)
    break_even_trades = Column(Integer, default=0)
    
    win_rate = Column(Float, nullable=True)
    profit_factor = Column(Float, nullable=True)
    avg_profit = Column(Float, nullable=True)
    avg_loss = Column(Float, nullable=True)
    total_profit_loss = Column(Float, default=0)
    
    sharpe_ratio = Column(Float, nullable=True)
    max_drawdown = Column(Float, nullable=True)
    risk_reward_ratio = Column(Float, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<StrategyPerformance {self.strategy_name}>"

"""
PHASE 1: DATABASE MODELS - MULTI-ACCOUNT SYSTEM
Add these models to your backend/app/models.py file

Copy this entire code block and add it to the END of your models.py file
(After all existing models)
"""

# ============ ACCOUNT MODELS (Add to models.py) ============

class Account(Base):
    """Manage multiple trading accounts (Demo, Live01, Live02, etc.)"""
    __tablename__ = "accounts"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Account Identity
    account_name = Column(String, nullable=False, unique=True)  # Demo, Live01, Live02
    account_type = Column(String, nullable=False)  # DEMO, LIVE
    ib_account_number = Column(String, nullable=True)  # DU123456 format
    broker_name = Column(String, default="Interactive Brokers")
    
    # Account Status
    status = Column(String, default="ACTIVE")  # ACTIVE, INACTIVE, CONNECTED, DISCONNECTED
    is_default = Column(Boolean, default=False)  # Which account opens by default
    is_active = Column(Boolean, default=True)  # Currently selected
    
    # Account Balance
    account_balance = Column(Float, nullable=True)  # Total balance in account
    available_balance = Column(Float, nullable=True)  # Available to trade
    buying_power = Column(Float, nullable=True)  # Margin available
    currency = Column(String, default="USD")
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    connected_at = Column(DateTime, nullable=True)
    last_synced_at = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<Account {self.account_name}>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "account_name": self.account_name,
            "account_type": self.account_type,
            "account_balance": self.account_balance,
            "available_balance": self.available_balance,
            "status": self.status,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "connected_at": self.connected_at.isoformat() if self.connected_at else None,
        }


class AccountPerformance(Base):
    """Track performance metrics for each account"""
    __tablename__ = "account_performance"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    account_id = Column(String, ForeignKey("accounts.id"), nullable=False, unique=True)
    
    # Daily Metrics
    daily_pnl = Column(Float, default=0)  # Daily profit/loss
    daily_trades = Column(Integer, default=0)  # Trades today
    daily_win_rate = Column(Float, nullable=True)  # Win % today (0-100)
    
    # Monthly Metrics
    monthly_pnl = Column(Float, default=0)
    monthly_trades = Column(Integer, default=0)
    monthly_win_rate = Column(Float, nullable=True)
    
    # Yearly Metrics
    yearly_pnl = Column(Float, default=0)
    yearly_trades = Column(Integer, default=0)
    yearly_win_rate = Column(Float, nullable=True)
    
    # Overall Performance
    total_trades = Column(Integer, default=0)
    winning_trades = Column(Integer, default=0)
    losing_trades = Column(Integer, default=0)
    profit_factor = Column(Float, nullable=True)  # Gross profit / Gross loss
    drawdown = Column(Float, nullable=True)  # Max drawdown %
    sharpe_ratio = Column(Float, nullable=True)  # Risk-adjusted return
    
    # Best/Worst
    best_trade = Column(Float, nullable=True)
    worst_trade = Column(Float, nullable=True)
    avg_win = Column(Float, nullable=True)
    avg_loss = Column(Float, nullable=True)
    
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<AccountPerformance {self.account_id}>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "account_id": self.account_id,
            "daily_pnl": self.daily_pnl,
            "monthly_pnl": self.monthly_pnl,
            "yearly_pnl": self.yearly_pnl,
            "total_trades": self.total_trades,
            "winning_trades": self.winning_trades,
            "win_rate": self.monthly_win_rate,
            "profit_factor": self.profit_factor,
        }


class AccountSettings(Base):
    """Account-specific settings and configuration"""
    __tablename__ = "account_settings"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    account_id = Column(String, ForeignKey("accounts.id"), nullable=False, unique=True)
    
    # Trading Rules
    max_daily_loss = Column(Float, default=500)  # Max loss per day ($)
    max_daily_loss_percent = Column(Float, default=5)  # Max loss per day (%)
    max_position_size = Column(Float, default=0.3)  # 30% of account per position
    risk_per_trade = Column(Float, default=0.02)  # 2% risk per trade
    auto_execute_enabled = Column(Boolean, default=True)  # Auto-execute on signals
    daily_trade_limit = Column(Integer, default=50)  # Max trades per day
    
    # Advanced Settings
    margin_requirement = Column(Float, default=0.25)  # 25% margin needed
    min_trade_size = Column(Integer, default=1)  # Minimum shares per trade
    max_trade_size = Column(Integer, default=1000)  # Maximum shares per trade
    use_stop_loss = Column(Boolean, default=True)  # Use stop loss
    use_take_profit = Column(Boolean, default=True)  # Use take profit
    
    # Risk Management
    max_open_positions = Column(Integer, default=10)  # Max concurrent positions
    max_consecutive_losses = Column(Integer, default=5)  # Stop after N losses
    halt_after_max_loss = Column(Boolean, default=True)  # Pause trading on max loss
    
    # Notifications
    send_email_alerts = Column(Boolean, default=False)
    send_sms_alerts = Column(Boolean, default=False)
    email_address = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<AccountSettings {self.account_id}>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "account_id": self.account_id,
            "max_daily_loss": self.max_daily_loss,
            "max_position_size": self.max_position_size,
            "risk_per_trade": self.risk_per_trade,
            "auto_execute_enabled": self.auto_execute_enabled,
            "daily_trade_limit": self.daily_trade_limit,
        }


# ============ UPDATE EXISTING MODELS ============

# ADD THIS LINE to the Alert model (after existing fields):
# account_id = Column(String, ForeignKey("accounts.id"), nullable=True)

# ADD THIS LINE to the Trade model (if exists, after existing fields):
# account_id = Column(String, ForeignKey("accounts.id"), nullable=True)

# ADD THIS LINE to the Signal model (if exists, after existing fields):
# account_id = Column(String, ForeignKey("accounts.id"), nullable=True)


