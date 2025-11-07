import sys
import os

# Add the backend directory to Python path so imports work
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, backend_dir)


from sqlalchemy import text
from app.database import engine

# ... rest of script unchanged ...

"""
Migration: Add missing 'strategy' column to signals table
Location: /backend/app/migrations/add_strategy_column.py
"""


def migrate_add_strategy():
    print("🔧 Adding missing strategy column...")
    print("=" * 60)
    
    with engine.connect() as connection:
        try:
            # Add strategy column
            sql = "ALTER TABLE signals ADD COLUMN strategy VARCHAR(255);"
            connection.execute(text(sql))
            print("✅ Added signals.strategy column")
            connection.commit()
        except Exception as e:
            if "already exists" in str(e) or "duplicate" in str(e):
                print("✓ signals.strategy already exists")
            else:
                print(f"⚠️  Error: {e}")
            connection.rollback()

        # Also add any other missing columns
        columns_to_add = [
            ("order_type", "VARCHAR(50)"),
            ("stop_loss", "FLOAT"),
            ("take_profit", "FLOAT"),
            ("entry_price", "FLOAT"),
            ("profit_loss", "FLOAT"),
            ("rejection_reason", "TEXT"),
        ]
        
        for col_name, col_type in columns_to_add:
            try:
                sql = f"ALTER TABLE signals ADD COLUMN {col_name} {col_type};"
                connection.execute(text(sql))
                print(f"✅ Added signals.{col_name}")
                connection.commit()
            except Exception as e:
                if "already exists" in str(e) or "duplicate" in str(e):
                    print(f"✓ signals.{col_name} already exists")
                else:
                    print(f"⚠️  Error: {e}")
                connection.rollback()
    
    print("=" * 60)
    print("✅ Migration complete!")

if __name__ == "__main__":
    migrate_add_strategy()