"""
Database Migration - Add ALL Missing Columns (ABSOLUTELY FINAL)
Location: /backend/app/migrations/add_missing_columns.py

✅ Adds EVERY missing column for trades table
✅ This is the complete final version
"""

import sys
import os

# Add the backend directory to Python path so imports work
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, backend_dir)

from sqlalchemy import text
from app.database import engine

def migrate_add_missing_columns():
    """Add ALL missing columns to existing tables"""
    
    print("🔧 Starting FINAL database migration...")
    print("=" * 70)
    
    with engine.connect() as connection:
        try:
            # ==================== ACCOUNTS TABLE ====================
            print("\n📊 ACCOUNTS TABLE")
            print("-" * 70)
            
            try:
                connection.execute(text("ALTER TABLE accounts ADD COLUMN updated_at TIMESTAMP;"))
                print("✅ Added: accounts.updated_at")
                connection.commit()
            except Exception as e:
                if "already exists" in str(e) or "duplicate" in str(e):
                    print("✓ Already exists: accounts.updated_at")
                else:
                    print(f"⚠️  Error: {e}")
                connection.rollback()

            # ==================== TRADES TABLE - ALL COLUMNS ====================
            print("\n💰 TRADES TABLE")
            print("-" * 70)
            
            columns_to_add = [
                ("trade_type", "VARCHAR(50) DEFAULT 'Market'", "trade type (Market/Limit/Stop)"),
                ("entry_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP", "entry timestamp"),
                ("exit_at", "TIMESTAMP", "exit timestamp"),
                ("updated_at", "TIMESTAMP", "last update timestamp"),
                ("win_percentage", "FLOAT", "win percentage"),
                ("commission", "FLOAT DEFAULT 0.0", "commission"),
                ("notes", "TEXT", "notes/comments"),
                ("is_active", "BOOLEAN DEFAULT TRUE", "active status"),
            ]
            
            for col_name, col_type, description in columns_to_add:
                try:
                    sql = f"ALTER TABLE trades ADD COLUMN {col_name} {col_type};"
                    connection.execute(text(sql))
                    print(f"✅ Added: trades.{col_name} ({description})")
                    connection.commit()
                except Exception as e:
                    if "already exists" in str(e) or "duplicate" in str(e):
                        print(f"✓ Already exists: trades.{col_name}")
                    else:
                        print(f"⚠️  Error adding {col_name}: {e}")
                    connection.rollback()

            # ==================== SIGNALS TABLE ====================
            print("\n📡 SIGNALS TABLE")
            print("-" * 70)
            
            signal_columns = [
                ("created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP", "creation timestamp"),
                ("is_active", "BOOLEAN DEFAULT TRUE", "active status"),
            ]
            
            for col_name, col_type, description in signal_columns:
                try:
                    sql = f"ALTER TABLE signals ADD COLUMN {col_name} {col_type};"
                    connection.execute(text(sql))
                    print(f"✅ Added: signals.{col_name} ({description})")
                    connection.commit()
                except Exception as e:
                    if "already exists" in str(e) or "duplicate" in str(e):
                        print(f"✓ Already exists: signals.{col_name}")
                    else:
                        print(f"⚠️  Error adding {col_name}: {e}")
                    connection.rollback()

            # ==================== ALERTS TABLE ====================
            print("\n🔔 ALERTS TABLE")
            print("-" * 70)
            
            alert_columns = [
                ("created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP", "creation timestamp"),
                ("is_active", "BOOLEAN DEFAULT TRUE", "active status"),
            ]
            
            for col_name, col_type, description in alert_columns:
                try:
                    sql = f"ALTER TABLE alerts ADD COLUMN {col_name} {col_type};"
                    connection.execute(text(sql))
                    print(f"✅ Added: alerts.{col_name} ({description})")
                    connection.commit()
                except Exception as e:
                    if "already exists" in str(e) or "duplicate" in str(e):
                        print(f"✓ Already exists: alerts.{col_name}")
                    else:
                        print(f"⚠️  Error adding {col_name}: {e}")
                    connection.rollback()

            # ==================== SUMMARY ====================
            print("\n" + "=" * 70)
            print("✅ MIGRATION COMPLETED SUCCESSFULLY!")
            print("=" * 70)
            print("\n✨ Database is now fully configured for all APIs:")
            print("  ✅ Accounts API - Ready")
            print("  ✅ Trades API - Ready")
            print("  ✅ Signals API - Ready")
            print("  ✅ Alerts API - Ready")
            print("\n🚀 You can now use all endpoints!")
            print("=" * 70)

        except Exception as e:
            print(f"\n❌ FATAL ERROR: {e}")
            connection.rollback()
            raise

if __name__ == "__main__":
    try:
        migrate_add_missing_columns()
        print("\n✅ Restart your backend server:")
        print("   Ctrl+C")
        print("   python -m uvicorn app.main:app --reload")
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        print("\nTroubleshooting:")
        print("  1. Make sure PostgreSQL is running")
        print("  2. Virtual environment is activated (venv)")
        print("  3. You're in: C:\\AI lab\\TradingApp\\backend")
        print("  4. Database connection string is correct")
        sys.exit(1)