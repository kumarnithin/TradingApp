"""
FINAL IB_CLIENT.PY - WITH place_order() METHOD AND CONNECTION STATUS
"""

import asyncio
from ib_insync import IB, Stock, Forex, Future, Crypto, Option, Contract, MarketOrder, LimitOrder
import logging
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class IBClientService:
    """Real Interactive Brokers Client Service"""

    def __init__(self):
        self.ib = IB()
        self.connected = False
        self.account_info = {}
        self.account_type = None
        self.account_name = None

    async def connect(self, account_type: str = "demo", account_name: Optional[str] = None,
                     host: str = "127.0.0.1", port: Optional[int] = None, client_id: int = 1) -> dict:
        """Connect to IB TWS with account selection"""
        try:
            account_type = account_type.lower()
            if account_type not in ["demo", "live"]:
                return {"status": "error", "error": "account_type must be 'demo' or 'live'"}

            if port is None:
                port = 7497 if account_type == "demo" else 7496

            await self.ib.connectAsync(host, port, clientId=client_id)
            await asyncio.sleep(0.5)

            self.connected = True
            self.account_type = account_type

            accounts = [acc for acc in self.ib.managedAccounts()]
            if not accounts:
                return {"status": "error", "error": "No accounts found"}

            if account_name and account_name in accounts:
                self.account_name = account_name
            else:
                self.account_name = accounts[0]

            await asyncio.sleep(0.5)
            account_values = self.ib.accountValues(self.account_name)
            self.account_info = {
                "account": self.account_name,
                "type": account_type,
                "buying_power": self._get_account_value(account_values, "BuyingPower"),
                "equity": self._get_account_value(account_values, "TotalCashValue"),
                "maint_margin": self._get_account_value(account_values, "MaintMarginReq"),
                "net_liquidation": self._get_account_value(account_values, "NetLiquidation"),
                "cash": self._get_account_value(account_values, "CashBalance"),
            }

            logger.info(f"✅ Connected to IB: {self.account_name} ({account_type})")
            return {
                "status": "success",
                "account": self.account_name,
                "account_type": account_type,
                "info": self.account_info
            }

        except Exception as e:
            logger.error(f"❌ Connection error: {str(e)}")
            return {"status": "error", "error": str(e)}

    def _get_account_value(self, account_values, tag: str) -> float:
        """Extract account value by tag"""
        try:
            for val in account_values:
                if val.tag == tag:
                    return float(val.value)
            return 0.0
        except:
            return 0.0

    def is_connected(self) -> bool:
        """Check if connected"""
        return self.connected and self.ib.isConnected()

    async def get_positions(self) -> list:
        """Get current positions"""
        try:
            positions = []
            for position in self.ib.positions():
                positions.append({
                    "symbol": position.contract.symbol,
                    "position": position.position,
                    "avgCost": position.avgCost,
                    "account": position.account,
                })
            return positions
        except Exception as e:
            logger.error(f"Error getting positions: {str(e)}")
            return []

    async def get_account_info(self) -> dict:
        """Get account information"""
        try:
            if not self.is_connected():
                return {"status": "error", "error": "Not connected"}
            account_values = self.ib.accountValues(self.account_name)
            return {
                "account": self.account_name,
                "buying_power": self._get_account_value(account_values, "BuyingPower"),
                "equity": self._get_account_value(account_values, "TotalCashValue"),
                "maint_margin": self._get_account_value(account_values, "MaintMarginReq"),
                "net_liquidation": self._get_account_value(account_values, "NetLiquidation"),
                "cash": self._get_account_value(account_values, "CashBalance"),
            }
        except Exception as e:
            logger.error(f"Error getting account info: {str(e)}")
            return {}

    # ✅ THIS METHOD IS THE KEY FIX
    def get_connection_status(self):
        """Returns connection status for IB client."""
        status = {
            "connected": self.is_connected(),
            "account_name": self.account_name,
            "account_type": self.account_type,
            "account_info": self.account_info,
        }
        if self.is_connected():
            status["message"] = "Connected"
        else:
            status["message"] = "Disconnected"
        return status

    async def place_order(self, symbol: str, action: str, quantity: int,
                         order_type: str = "MKT", limit_price: Optional[float] = None) -> dict:
        """Place an order on IB"""
        try:
            print(f"\n📤 PLACE ORDER: {action} {quantity} {symbol}")

            if not self.is_connected():
                print("❌ Not connected to IB")
                return {"success": False, "error": "Not connected to IB"}

            contract = None
            if symbol.upper() == "EURUSD":
                contract = Forex(pair="EURUSD")
                print(f"💱 Forex: {symbol}")
            elif symbol.upper() in ["ES", "NQ", "YM", "GC", "CL"]:
                contract = Future(symbol=symbol.upper(), exchange="CME")
                print(f"📊 Futures: {symbol}")
            else:
                contract = Stock(symbol=symbol.upper(), exchange="SMART", currency="USD")
                print(f"📈 Stock: {symbol}")

            qualified_contracts = await self.ib.qualifyContractsAsync(contract)
            if not qualified_contracts:
                print(f"❌ Could not qualify contract: {symbol}")
                return {"success": False, "error": f"Invalid contract: {symbol}"}

            contract = qualified_contracts[0]
            print(f"✅ Contract qualified")

            if order_type.upper() == "MKT":
                order = MarketOrder(action, quantity)
                print(f"📊 Order type: MARKET")
            elif order_type.upper() == "LMT":
                if not limit_price:
                    return {"success": False, "error": "limit_price required for LMT orders"}
                order = LimitOrder(action, quantity, limit_price)
                print(f"📊 Order type: LIMIT @ {limit_price}")
            else:
                return {"success": False, "error": f"Unknown order type: {order_type}"}

            print(f"🚀 Placing order...")
            trade = self.ib.placeOrder(contract, order)

            await asyncio.sleep(0.5)

            order_id = trade.order.orderId
            order_status = trade.orderStatus.status if trade.orderStatus else "PENDING"

            print(f"✅ Order placed! ID: {order_id}, Status: {order_status}")
            print("=" * 60 + "\n")

            return {
                "success": True,
                "order_id": order_id,
                "symbol": symbol,
                "action": action,
                "quantity": quantity,
                "order_type": order_type,
                "limit_price": limit_price,
                "status": order_status,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            print(f"❌ Order error: {str(e)}")
            print("=" * 60 + "\n")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

    async def get_order_status(self, order_id: int) -> dict:
        """Get status of a placed order"""
        try:
            for trade in self.ib.trades():
                if trade.order.orderId == order_id:
                    return {
                        "success": True,
                        "order_id": order_id,
                        "status": trade.orderStatus.status,
                        "filled": trade.orderStatus.filled,
                        "remaining": trade.orderStatus.remaining,
                        "avg_fill_price": trade.orderStatus.avgFillPrice,
                        "timestamp": datetime.now().isoformat()
                    }
            return {
                "success": False,
                "error": f"Order {order_id} not found",
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

    async def disconnect(self):
        """Disconnect from IB"""
        try:
            self.ib.disconnect()
            self.connected = False
            logger.info("✅ Disconnected from IB")
        except Exception as e:
            logger.error(f"Error disconnecting: {str(e)}")

# Global instance
ib_client = IBClientService()
