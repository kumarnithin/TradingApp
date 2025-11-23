"""
Configuration and Database Setup - Phase 0.5 Modified
Defines database connection and session management
"""

import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ==================== DATABASE CONFIGURATION ====================

# Get database URL from environment or use default
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost/trading_app"
)

logger.info(f"📊 Database URL: {DATABASE_URL}")

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    echo=False,  # Set to True for SQL debugging
    pool_pre_ping=True,  # Verify connection before using
    pool_size=10,
    max_overflow=20
)

# Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# ==================== DEPENDENCY INJECTION ====================

def get_db():
    """
    Dependency injection for database sessions
    Used in FastAPI route handlers like: async def my_route(db: Session = Depends(get_db))
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==================== DATABASE INITIALIZATION ====================

def init_db():
    """
    Initialize database by creating all tables
    Call this once when the app starts
    """
    from app.database import Base
    
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables created/verified")
    except Exception as e:
        logger.error(f"❌ Error creating tables: {str(e)}")
        raise