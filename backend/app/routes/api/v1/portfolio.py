"""
Portfolio API - Multiple Watchlist Categories System with Import/Export & Real-time Updates
Location: /backend/app/routes/api/v1/portfolio.py
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import Column, String, Float, DateTime, Integer, ForeignKey
from pydantic import BaseModel
from app.config import get_db
from app.database import Base
from datetime import datetime
import uuid
import logging
import csv
import io

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Portfolio"])

# ==================== Request Models ====================

class AddCategoryRequest(BaseModel):
    name: str
    description: str = None
    color: str = "#2569b0"
    icon: str = "STOCK"

class UpdateCategoryRequest(BaseModel):
    name: str = None
    description: str = None
    color: str = None
    icon: str = None

class AddSymbolRequest(BaseModel):
    symbol: str
    name: str = None

# ==================== Database Models ====================

class WatchlistCategory(Base):
    """SQLAlchemy model for watchlist categories"""
    __tablename__ = "watchlist_categories"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    color = Column(String, default="#2569b0")
    icon = Column(String, default="STOCK")
    created_at = Column(DateTime, default=datetime.utcnow)

class WatchlistSymbol(Base):
    """SQLAlchemy model for watchlist symbols"""
    __tablename__ = "watchlist_symbols"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    category_id = Column(String, ForeignKey("watchlist_categories.id", ondelete="CASCADE"), nullable=False)
    symbol = Column(String, nullable=False)
    name = Column(String, nullable=True)
    current_price = Column(Float, default=0.0)
    added_at = Column(DateTime, default=datetime.utcnow)

# ==================== CATEGORY ENDPOINTS ====================

@router.get("/categories")
async def get_categories(user_id: int = 1, db: Session = Depends(get_db)):
    """
    GET /api/v1/portfolio/categories
    Get all watchlist categories for user
    """
    try:
        categories = db.query(WatchlistCategory).filter(WatchlistCategory.user_id == user_id).all()
        result = []
        
        for cat in categories:
            # Count symbols in this category
            symbol_count = db.query(WatchlistSymbol).filter(WatchlistSymbol.category_id == cat.id).count()
            result.append({
                "id": cat.id,
                "name": cat.name,
                "description": cat.description,
                "color": cat.color,
                "icon": cat.icon,
                "symbol_count": symbol_count
            })
        
        logger.info(f"✅ Retrieved {len(result)} categories for user {user_id}")
        return {
            "status": "success",
            "categories": result,
            "count": len(result)
        }
    
    except Exception as e:
        logger.error(f"❌ Error fetching categories: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/categories/create")
async def create_category(
    request: AddCategoryRequest,
    user_id: int = 1,
    db: Session = Depends(get_db)
):
    """
    POST /api/v1/portfolio/categories/create
    Create new watchlist category
    """
    try:
        # Check if category name already exists for user
        existing = db.query(WatchlistCategory).filter(
            WatchlistCategory.user_id == user_id,
            WatchlistCategory.name == request.name
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail=f"Category '{request.name}' already exists")
        
        # Create category
        category = WatchlistCategory(
            user_id=user_id,
            name=request.name,
            description=request.description,
            color=request.color,
            icon=request.icon
        )
        
        db.add(category)
        db.commit()
        db.refresh(category)
        
        logger.info(f"✅ Created category '{request.name}' for user {user_id}")
        return {
            "status": "success",
            "message": f"Category '{request.name}' created",
            "category": {
                "id": category.id,
                "name": category.name,
                "icon": category.icon,
                "color": category.color
            }
        }
    
    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error creating category: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/categories/{category_id}")
async def update_category(
    category_id: str,
    request: UpdateCategoryRequest,
    db: Session = Depends(get_db)
):
    """
    PUT /api/v1/portfolio/categories/{category_id}
    Update watchlist category
    """
    try:
        category = db.query(WatchlistCategory).filter(WatchlistCategory.id == category_id).first()
        
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        if request.name:
            category.name = request.name
        if request.description is not None:
            category.description = request.description
        if request.color:
            category.color = request.color
        if request.icon:
            category.icon = request.icon
        
        db.commit()
        db.refresh(category)
        
        logger.info(f"✅ Updated category {category_id}")
        return {
            "status": "success",
            "message": "Category updated",
            "category": {
                "id": category.id,
                "name": category.name,
                "color": category.color,
                "icon": category.icon
            }
        }
    
    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error updating category: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/categories/{category_id}")
async def delete_category(category_id: str, db: Session = Depends(get_db)):
    """
    DELETE /api/v1/portfolio/categories/{category_id}
    Delete watchlist category (and all its symbols)
    """
    try:
        category = db.query(WatchlistCategory).filter(WatchlistCategory.id == category_id).first()
        
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        cat_name = category.name
        db.delete(category)
        db.commit()
        
        logger.info(f"✅ Deleted category '{cat_name}'")
        return {
            "status": "success",
            "message": f"Category '{cat_name}' deleted (and all symbols)"
        }
    
    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error deleting category: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== SYMBOL ENDPOINTS ====================

@router.get("/categories/{category_id}/symbols")
async def get_category_symbols(category_id: str, db: Session = Depends(get_db)):
    """
    GET /api/v1/portfolio/categories/{category_id}/symbols
    Get all symbols in a category
    """
    try:
        # Verify category exists
        category = db.query(WatchlistCategory).filter(WatchlistCategory.id == category_id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        # Get symbols
        symbols = db.query(WatchlistSymbol).filter(WatchlistSymbol.category_id == category_id).all()
        
        symbol_list = [
            {
                "id": s.id,
                "symbol": s.symbol,
                "name": s.name or s.symbol,
                "current_price": s.current_price
            }
            for s in symbols
        ]
        
        logger.info(f"✅ Retrieved {len(symbol_list)} symbols from category {category_id}")
        return {
            "status": "success",
            "category": {
                "id": category.id,
                "name": category.name,
                "icon": category.icon
            },
            "symbols": symbol_list,
            "count": len(symbol_list)
        }
    
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error fetching symbols: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/categories/{category_id}/symbols/add")
async def add_symbol_to_category(
    category_id: str,
    request: AddSymbolRequest,
    db: Session = Depends(get_db)
):
    """
    POST /api/v1/portfolio/categories/{category_id}/symbols/add
    Add symbol to category
    """
    try:
        # Verify category exists
        category = db.query(WatchlistCategory).filter(WatchlistCategory.id == category_id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        # Check if symbol already exists in this category
        existing = db.query(WatchlistSymbol).filter(
            WatchlistSymbol.category_id == category_id,
            WatchlistSymbol.symbol == request.symbol.upper()
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail=f"{request.symbol} already in {category.name}")
        
        # Create symbol
        symbol = WatchlistSymbol(
            category_id=category_id,
            symbol=request.symbol.upper(),
            name=request.name or request.symbol.upper()
        )
        
        db.add(symbol)
        db.commit()
        db.refresh(symbol)
        
        logger.info(f"✅ Added {request.symbol} to category '{category.name}'")
        return {
            "status": "success",
            "message": f"{request.symbol} added to {category.name}",
            "symbol": {
                "id": symbol.id,
                "symbol": symbol.symbol,
                "name": symbol.name,
                "current_price": symbol.current_price
            }
        }
    
    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error adding symbol: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/symbols/{symbol_id}")
async def delete_symbol(symbol_id: str, db: Session = Depends(get_db)):
    """
    DELETE /api/v1/portfolio/symbols/{symbol_id}
    Delete symbol from watchlist
    """
    try:
        symbol = db.query(WatchlistSymbol).filter(WatchlistSymbol.id == symbol_id).first()
        
        if not symbol:
            raise HTTPException(status_code=404, detail="Symbol not found")
        
        sym_name = symbol.symbol
        db.delete(symbol)
        db.commit()
        
        logger.info(f"✅ Deleted symbol '{sym_name}'")
        return {
            "status": "success",
            "message": f"Symbol '{sym_name}' deleted"
        }
    
    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error deleting symbol: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== NEW: EXPORT/IMPORT ENDPOINTS ====================

@router.get("/categories/{category_id}/export")
async def export_symbols_csv(category_id: str, db: Session = Depends(get_db)):
    """
    GET /api/v1/portfolio/categories/{category_id}/export
    Export symbols as CSV file
    """
    try:
        category = db.query(WatchlistCategory).filter(WatchlistCategory.id == category_id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        symbols = db.query(WatchlistSymbol).filter(WatchlistSymbol.category_id == category_id).all()
        
        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Symbol', 'Name', 'Current Price', 'Added At'])
        
        for sym in symbols:
            writer.writerow([
                sym.symbol,
                sym.name or '',
                sym.current_price,
                sym.added_at.strftime('%Y-%m-%d %H:%M:%S') if sym.added_at else ''
            ])
        
        logger.info(f"✅ Exported {len(symbols)} symbols from {category.name}")
        
        return {
            "status": "success",
            "filename": f"{category.name}_symbols.csv",
            "csv_data": output.getvalue()
        }
    
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error exporting: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/categories/{category_id}/import")
async def import_symbols_csv(
    category_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    POST /api/v1/portfolio/categories/{category_id}/import
    Import symbols from CSV file
    CSV format: Symbol, Name, Current Price (optional)
    """
    try:
        category = db.query(WatchlistCategory).filter(WatchlistCategory.id == category_id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        # Read CSV file
        contents = await file.read()
        csv_file = io.StringIO(contents.decode('utf-8'))
        reader = csv.reader(csv_file)
        
        added_count = 0
        skipped_count = 0
        
        # Skip header if exists
        next(reader, None)
        
        for row in reader:
            if not row or len(row) < 1:
                continue
            
            symbol = row[0].strip().upper()
            name = row[1].strip() if len(row) > 1 else symbol
            price = float(row[2]) if len(row) > 2 and row[2].strip() else 0.0
            
            # Check if already exists
            existing = db.query(WatchlistSymbol).filter(
                WatchlistSymbol.category_id == category_id,
                WatchlistSymbol.symbol == symbol
            ).first()
            
            if existing:
                skipped_count += 1
                continue
            
            # Add symbol
            new_symbol = WatchlistSymbol(
                category_id=category_id,
                symbol=symbol,
                name=name,
                current_price=price
            )
            db.add(new_symbol)
            added_count += 1
        
        db.commit()
        
        logger.info(f"✅ Imported {added_count} symbols, skipped {skipped_count} (already exist)")
        
        return {
            "status": "success",
            "message": f"Imported {added_count} symbols, skipped {skipped_count}",
            "added": added_count,
            "skipped": skipped_count
        }
    
    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error importing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== NEW: REAL-TIME PRICE UPDATE ENDPOINTS ====================

@router.post("/categories/{category_id}/update-prices")
async def update_prices(
    category_id: str,
    prices: dict = None,
    db: Session = Depends(get_db)
):
    """
    POST /api/v1/portfolio/categories/{category_id}/update-prices
    Bulk update symbol prices
    Body: {"AAPL": 150.25, "GOOGL": 140.50}
    """
    try:
        if not prices:
            raise HTTPException(status_code=400, detail="No prices provided")
        
        category = db.query(WatchlistCategory).filter(WatchlistCategory.id == category_id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        updated_count = 0
        for symbol, price in prices.items():
            sym_obj = db.query(WatchlistSymbol).filter(
                WatchlistSymbol.category_id == category_id,
                WatchlistSymbol.symbol == symbol.upper()
            ).first()
            
            if sym_obj:
                sym_obj.current_price = float(price)
                updated_count += 1
        
        db.commit()
        logger.info(f"✅ Updated {updated_count} prices in {category.name}")
        
        return {
            "status": "success",
            "message": f"Updated {updated_count} prices",
            "updated": updated_count
        }
    
    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error updating prices: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/categories/{category_id}/symbols-with-prices")
async def get_symbols_with_prices(category_id: str, db: Session = Depends(get_db)):
    """
    GET /api/v1/portfolio/categories/{category_id}/symbols-with-prices
    Get all symbols with current prices (for real-time updates)
    """
    try:
        category = db.query(WatchlistCategory).filter(WatchlistCategory.id == category_id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        symbols = db.query(WatchlistSymbol).filter(WatchlistSymbol.category_id == category_id).all()
        
        symbol_list = [
            {
                "id": s.id,
                "symbol": s.symbol,
                "name": s.name or s.symbol,
                "current_price": s.current_price
            }
            for s in symbols
        ]
        
        return {
            "status": "success",
            "category": {
                "id": category.id,
                "name": category.name,
            },
            "symbols": symbol_list,
            "count": len(symbol_list)
        }
    
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))