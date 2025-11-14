"""
🚀 SIGNAL PROCESSOR SERVICE - Phase 1
Location: /backend/app/services/signal_processor.py

Core logic to:
✅ Validate incoming TradingView signals
✅ Apply trading discipline checks
✅ Execute orders via IB
✅ Create trade records
"""

import logging
from typing import Dict, Optional
from datetime import datetime
import asyncio
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

class SignalProcessor:
    """Process incoming signals and execute trades"""
    
    def __init__(self, db: Session, ib_client=None):
        """
        Initialize processor
        
        Args:
            db: Database session
            ib_client: IB client service (will be imported at runtime)
        """
        self.db = db
        self.ib_client = ib_client
    
    @staticmethod
    def parse_tradingview_alert(webhook_data: Dict) -> Dict:
        """
        Parse TradingView webhook JSON format
        
        Expected format:
        {
            "passphrase": "your_passphrase",
            "time": "2025-11-08T12:30:00Z",
            "ticker": "EUR/USD",
            "action": "BUY",
            "quantity": "1.0",
            "price": "1.0850",
            "comment": "Signal from strategy"
        }
        """
        try:
            parsed = {
                "time": webhook_data.get("time"),
                "symbol": webhook_data.get("ticker"),
                "action": webhook_data.get("action", "").upper(),  # BUY or SELL
                "quantity": float(webhook_data.get("quantity", 1)),
                "price": float(webhook_data.get("price", 0)),
                "comment": webhook_data.get("comment", ""),
                "passphrase": webhook_data.get("passphrase")
            }
            
            logger.info(f"✓ Parsed TradingView signal: {parsed['symbol']} {parsed['action']}")
            return parsed
        except Exception as e:
            logger.error(f"❌ Error parsing TradingView alert: {str(e)}")
            raise ValueError(f"Invalid TradingView format: {str(e)}")
    
    @staticmethod
    def validate_signal(signal_data: Dict) -> tuple[bool, str]:
        """
        Validate signal structure and data
        
        Returns:
            (is_valid, error_message)
        """
        required_fields = ["symbol", "action", "quantity"]
        
        for field in required_fields:
            if field not in signal_data or not signal_data[field]:
                return False, f"Missing required field: {field}"
        
        if signal_data["action"] not in ["BUY", "SELL"]:
            return False, f"Invalid action: {signal_data['action']}"
        
        if signal_data["quantity"] <= 0:
            return False, "Quantity must be > 0"
        
        return True, ""
    
    async def check_trading_discipline(
        self, 
        user_id: str, 
        symbol: str,
        action: str
    ) -> Dict:
        """
        Check trading discipline before execution
        
        Uses existing trading discipline validation
        Returns discipline score and recommendation
        """
        try:
            from app.models import TradeValidation
            
            # Get recent validations for this symbol
            recent_validations = self.db.query(TradeValidation).filter(
                TradeValidation.user_id == user_id,
                TradeValidation.symbol == symbol
            ).order_by(TradeValidation.created_at.desc()).limit(5).all()
            
            if not recent_validations:
                logger.info(f"No recent discipline validations for {symbol}")
                return {"score": 50, "status": "neutral", "approved": True}
            
            avg_score = sum([v.discipline_score for v in recent_validations]) / len(recent_validations)
            
            # Approve if average score is good
            approved = avg_score >= 50  # Configurable threshold
            
            logger.info(f"Discipline check for {symbol}: score={avg_score}, approved={approved}")
            
            return {
                "score": avg_score,
                "status": "approved" if approved else "caution",
                "approved": approved,
                "recent_trades": len(recent_validations)
            }
        except Exception as e:
            logger.error(f"Error checking discipline: {str(e)}")
            return {"score": 0, "status": "error", "approved": False}
    
    async def execute_ib_order(
        self,
        account_id: str,
        symbol: str,
        action: str,
        quantity: float,
        order_type: str = "MARKET",
        price: Optional[float] = None
    ) -> Dict:
        """
        Execute order on Interactive Brokers
        
        Args:
            account_id: IB account ID
            symbol: Trading symbol (e.g., "EUR/USD", "AAPL")
            action: "BUY" or "SELL"
            quantity: Order quantity
            order_type: "MARKET" or "LIMIT"
            price: Price for limit orders
        
        Returns:
            Order response with order_id, status, etc.
        """
        try:
            if not self.ib_client:
                logger.error("IB Client not available")
                return {"status": "error", "error": "IB Client not connected"}
            
            logger.info(f"Placing {action} order: {quantity} {symbol} @ {price or 'MARKET'}")
            
            # Call IB client to place order
            result = await self.ib_client.place_order(
                account_id=account_id,
                symbol=symbol,
                action=action,
                quantity=quantity,
                order_type=order_type,
                limit_price=price
            )
            
            logger.info(f"✓ Order placed: {result}")
            return result
        except Exception as e:
            logger.error(f"❌ Error placing IB order: {str(e)}")
            return {"status": "error", "error": str(e)}
    
    async def create_trade_record(
        self,
        user_id: str,
        symbol: str,
        action: str,
        quantity: float,
        price: float,
        order_id: str,
        account_id: str,
        source: str = "tradingview_webhook"
    ) -> Dict:
        """
        Create trade record in database
        
        Returns:
            Trade record
        """
        try:
            from app.models import Trade
            import uuid
            
            trade = Trade(
                id=str(uuid.uuid4()),
                user_id=user_id,
                account_id=account_id,
                symbol=symbol,
                action=action,
                quantity=quantity,
                entry_price=price,
                order_id=order_id,
                status="pending",
                source=source,
                created_at=datetime.utcnow()
            )
            
            self.db.add(trade)
            self.db.commit()
            self.db.refresh(trade)
            
            logger.info(f"✓ Trade record created: {trade.id}")
            return {
                "trade_id": trade.id,
                "symbol": trade.symbol,
                "action": trade.action,
                "quantity": trade.quantity,
                "status": trade.status
            }
        except Exception as e:
            self.db.rollback()
            logger.error(f"❌ Error creating trade record: {str(e)}")
            raise
    
    async def process_signal(
        self,
        signal_data: Dict,
        user_id: str,
        account_id: str,
        passphrase: str,
        expected_passphrase: Optional[str] = None
    ) -> Dict:
        """
        Main signal processing flow
        
        1. Validate passphrase (security)
        2. Parse and validate signal
        3. Check trading discipline
        4. Execute IB order
        5. Create trade record
        
        Returns:
            Result with status, trade_id, order_id, etc.
        """
        try:
            # Step 1: Validate passphrase (if provided)
            if expected_passphrase and passphrase != expected_passphrase:
                logger.error("❌ Invalid passphrase")
                return {"status": "error", "error": "Invalid passphrase"}
            
            # Step 2: Parse and validate signal
            is_valid, error = self.validate_signal(signal_data)
            if not is_valid:
                logger.error(f"❌ Signal validation failed: {error}")
                return {"status": "error", "error": error}
            
            # Step 3: Check trading discipline
            discipline_result = await self.check_trading_discipline(
                user_id,
                signal_data["symbol"],
                signal_data["action"]
            )
            
            if not discipline_result["approved"]:
                logger.warning(f"⚠️ Discipline check failed: score={discipline_result['score']}")
                return {
                    "status": "rejected",
                    "reason": "Low discipline score",
                    "discipline_score": discipline_result["score"]
                }
            
            # Step 4: Execute IB order
            order_result = await self.execute_ib_order(
                account_id=account_id,
                symbol=signal_data["symbol"],
                action=signal_data["action"],
                quantity=signal_data["quantity"],
                order_type="MARKET",
                price=signal_data.get("price")
            )
            
            if order_result.get("status") == "error":
                logger.error(f"❌ Order placement failed: {order_result.get('error')}")
                return order_result
            
            # Step 5: Create trade record
            trade_result = await self.create_trade_record(
                user_id=user_id,
                symbol=signal_data["symbol"],
                action=signal_data["action"],
                quantity=signal_data["quantity"],
                price=signal_data.get("price", 0),
                order_id=order_result.get("order_id", ""),
                account_id=account_id,
                source="tradingview_webhook"
            )
            
            logger.info(f"✅ Signal processed successfully")
            
            return {
                "status": "success",
                "message": "Trade executed successfully",
                "trade": trade_result,
                "order": order_result,
                "discipline_score": discipline_result["score"]
            }
        
        except Exception as e:
            logger.error(f"❌ Error processing signal: {str(e)}")
            return {"status": "error", "error": str(e)}