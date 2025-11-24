from sqlalchemy import Column, String, Integer, Float, DateTime, Text, Boolean, ForeignKey, JSON, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker, Session
from datetime import datetime
import uuid
import os

# ==================== DATABASE SETUP ====================
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:NitsPostgres@localhost:5432/trading_app")

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ==================== MODELS ====================

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
    is_ib_connected = Column(Boolean, default=False)  # ✅ NEW FIELD
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
    account_id = Column(String(36), ForeignKey("accounts.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    strategy_id = Column(String(255))
    symbol = Column(String(20), nullable=False)
    action = Column(String(10), nullable=False)  # BUY, SELL
    quantity = Column(Float, nullable=False)
    order_type = Column(String(20))  # MKT, LMT
    price = Column(Float)
    entry_price = Column(Float)
    stop_loss = Column(Float)
    take_profit = Column(Float)
    status = Column(String(20), default="pending")  # pending, validated, filled, executed, rejected
    rejection_reason = Column(Text)
    confidence_score = Column(Float, default=50)  # 0-100
    received_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime)
    filled_at = Column(DateTime)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    account = relationship("Account", back_populates="signals")
    trades = relationship("Trade", back_populates="signal")

class Trade(Base):
    __tablename__ = "trades"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    account_id = Column(String(36), ForeignKey("accounts.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    signal_id = Column(Integer, ForeignKey("signals.id"), nullable=True)
    symbol = Column(String(20), nullable=False)
    action = Column(String(10), nullable=False)  # BUY, SELL
    quantity = Column(Integer, nullable=False)
    order_type = Column(String(20))
    entry_price = Column(Float)
    exit_price = Column(Float)
    trade_type = Column(String(20))
    profit_loss = Column(Float, default=0)
    win_percentage = Column(Float)
    profit_loss_percent = Column(Float, default=0)
    commission = Column(Float, default=0.0)
    notes = Column(Text)
    ibkr_order_id = Column(String(50))
    status = Column(String(20), default="OPEN")  # OPEN, CLOSED, CANCELLED
    entry_at = Column(DateTime)
    exit_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    account = relationship("Account", back_populates="trades")
    signal = relationship("Signal", back_populates="trades")

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    account_id = Column(String(36), ForeignKey("accounts.id"), nullable=True)
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


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    account_id = Column(String(36), ForeignKey("accounts.id"), nullable=True)
    signal_id = Column(Integer, ForeignKey("signals.id"), nullable=True)
    action = Column(String(100), nullable=False)  # e.g., PLACE_ORDER, VALIDATION_REJECT
    payload = Column(JSON, nullable=True)
    simulated = Column(Boolean, default=False)
    status = Column(String(50), default="PENDING")  # PENDING, SUCCESS, ERROR, REJECTED, SIMULATED
    message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships (optional)
    user = relationship("User")
    account = relationship("Account")

# ==================== TRADING DISCIPLINE MODELS ====================

class TradingTemplate(Base):
    __tablename__ = "trading_templates"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    strategy_name = Column(String, nullable=False)
    strategy_type = Column(String, nullable=False)
    description = Column(String, nullable=True)
    questions = Column(JSON, nullable=False)
    is_favorite = Column(Boolean, default=False)
    usage_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    validations = relationship("TradeValidation", back_populates="template", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "strategy_name": self.strategy_name,
            "strategy_type": self.strategy_type,
            "description": self.description,
            "questions": self.questions,
            "is_favorite": self.is_favorite,
            "usage_count": self.usage_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "question_count": len(self.questions) if self.questions else 0
        }

class TradeValidation(Base):
    __tablename__ = "trade_validations"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    template_id = Column(String(36), ForeignKey("trading_templates.id"), nullable=True)
    strategy_name = Column(String, nullable=False)
    answers = Column(JSON, nullable=True)
    questionnaire_score = Column(Float, nullable=False)
    decision = Column(String, nullable=False)
    discipline_score = Column(Float, nullable=False)
    emotional_state = Column(String, nullable=False)
    symbol = Column(String, nullable=True)
    entry_price = Column(Float, nullable=True)
    stop_loss = Column(Float, nullable=True)
    take_profit = Column(Float, nullable=True)
    position_size = Column(Float, nullable=True)
    result = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    template = relationship("TradingTemplate", back_populates="validations")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "template_id": self.template_id,
            "strategy_name": self.strategy_name,
            "answers": self.answers,
            "questionnaire_score": self.questionnaire_score,
            "decision": self.decision,
            "discipline_score": self.discipline_score,
            "emotional_state": self.emotional_state,
            "symbol": self.symbol,
            "entry_price": self.entry_price,
            "stop_loss": self.stop_loss,
            "take_profit": self.take_profit,
            "position_size": self.position_size,
            "result": self.result,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

# ==================== DATABASE INITIALIZATION ====================

def init_db():
    """Initialize database - create all tables"""
    Base.metadata.create_all(bind=engine)

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()