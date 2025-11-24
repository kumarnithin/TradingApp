from ib_insync import IB, Stock, MarketOrder
from typing import Dict, Optional
import asyncio
import logging

logger = logging.getLogger(__name__)

class OrderExecutor:
    """Executes orders on Interactive Brokers"""
    
    def __init__(self, host: str = "127.0.0.1", port: int = 7497, client_id: int = 1):
        """
        Initialize the order executor
        
        host: Where IBKR is running (your computer)
        port: 7497 for paper trading, 7496 for live
        client_id: Just a number to identify your program
        """
        self.host = host
        self.port = port
        self.client_id = client_id
        self.ib = IB()
    
    async def connect(self) -> bool:
        """Connect to IBKR Gateway"""
        try:
            await self.ib.connectAsync(self.host, self.port, self.client_id)
            logger.info(f"✅ Connected to IBKR at {self.host}:{self.port}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to connect to IBKR: {e}")
            return False
    
    async def disconnect(self):
        """Disconnect from IBKR"""
        if self.ib.isConnected():
            self.ib.disconnect()
            logger.info("✅ Disconnected from IBKR")
    
    async def execute_market_order(
        self,
        symbol: str,
        action: str,
        quantity: float
        ,
        simulate: bool = False
    ) -> Dict:
        """
        Execute a market order (buy/sell at current price)
        
        symbol: Stock symbol (AAPL, GOOGL, etc.)
        action: "BUY" or "SELL"
        quantity: How many shares
        """
        try:
            # If simulate/dry-run is enabled, skip IB interactions entirely
            if simulate:
                logger.info(f"[SIMULATE] {action} {quantity} {symbol} (no order sent)")
                return {
                    "status": "simulated",
                    "order_id": None,
                    "symbol": symbol,
                    "action": action,
                    "quantity": quantity,
                    "message": "Simulated order - no trade sent to IB"
                }

            # Create a contract (specifies what to trade)
            contract = Stock(symbol, 'SMART', 'USD')
            await self.ib.qualifyContractsAsync(contract)

            # Create an order (specifies how to trade)
            order = MarketOrder(action, quantity)

            # Place the order
            trade = self.ib.placeOrder(contract, order)
            await asyncio.sleep(2)  # Wait for execution

            logger.info(f"✅ Order placed: {action} {quantity} {symbol}")

            return {
                "status": "success",
                "order_id": trade.order.orderId,
                "symbol": symbol,
                "action": action,
                "quantity": quantity
            }
            
        except Exception as e:
            logger.error(f"❌ Order failed: {e}")
            return {
                "status": "error",
                "message": str(e)
            }
