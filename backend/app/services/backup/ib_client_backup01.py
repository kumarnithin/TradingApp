"""
IB Client Service - Real Interactive Brokers Connection
WITH ACCOUNT NAME SUPPORT
Handles all IB operations: connections, market data, orders, positions
Supports: Stocks, Forex, Futures, Crypto, Options
Port Mapping:
- 7497: TWS Demo Account (Paper Trading)
- 7496: TWS Live Account (Real Trading)
"""

import asyncio
from ib_insync import IB, Stock, Forex, Future, Crypto, Option, Contract
from ib_insync import util
import logging
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
import pandas as pd

logger = logging.getLogger(__name__)

class IBClientService:
    """Real Interactive Brokers Client Service"""
    
    def __init__(self):
        self.ib = IB()
        self.connected = False
        self.account_info = {}
        self.positions = []
        self.orders = []
        self.bars_data = {}
        self.account_type = None  # "demo" or "live"
        self.account_name = None  # "DU123456" or "U123456789"
        
    # ============ CONNECTION MANAGEMENT ============
    
    async def connect(self, account_type: str = "demo", account_name: Optional[str] = None, host: str = "127.0.0.1", port: Optional[int] = None, client_id: int = 1) -> Dict:
        """
        Connect to IB TWS with account selection
        
        Args:
            account_type: "demo" or "live" - used to determine default port if not provided
            account_name: Account to connect to (e.g., "DU123456" or "U123456789")
            host: IB TWS/Gateway host (default: localhost)
            port: IB TWS/Gateway port - will use account_type if not specified
            client_id: Unique client ID
        """
        try:
            # Validate account type
            account_type = account_type.lower()
            if account_type not in ["demo", "live"]:
                return {
                    "status": "error",
                    "error": "account_type must be 'demo' or 'live'",
                    "timestamp": datetime.now().isoformat()
                }
            
            # Set port based on account type if not provided
            if port is None:
                if account_type == "demo":
                    port = 7497  # Paper Trading
                    account_label = "DEMO (Paper Trading)"
                else:  # live
                    port = 7496  # Live Trading
                    account_label = "LIVE (Real Trading) ⚠️"
            else:
                account_label = f"Custom Port {port}"
            
            self.account_type = account_type
            self.account_name = account_name
            
            logger.info(f"🔌 Connecting to IB {account_label} at {host}:{port}...")
            if account_name:
                logger.info(f"   Account: {account_name}")
            
            # Connect to IB
            await self.ib.connectAsync(host, port, clientId=client_id)
            self.connected = True
            
            # Get account info
            await self._update_account_info()
            
            logger.info(f"✅ Connected to IB successfully! ({account_label})")
            
            return {
                "status": "success",
                "connected": True,
                "message": f"Connected to {account_label}",
                "account_type": account_type,
                "account_name": account_name or self.account_info.get("account", "Unknown"),
                "port": port,
                "account": self.account_info.get("account", "Unknown"),
                "buying_power": self.account_info.get("buying_power", 0),
                "equity": self.account_info.get("equity", 0),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Connection failed: {str(e)}")
            self.connected = False
            return {
                "status": "error",
                "connected": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def disconnect(self) -> Dict:
        """Disconnect from IB"""
        try:
            if self.connected:
                self.ib.disconnect()
                self.connected = False
                self.account_type = None
                self.account_name = None
                logger.info("✅ Disconnected from IB")
            
            return {
                "status": "success",
                "connected": False,
                "message": "Disconnected from IB",
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"❌ Disconnection error: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    def is_connected(self) -> bool:
        """Check if connected to IB"""
        return self.ib.isConnected()
    
    # ============ ACCOUNT INFORMATION ============
    
    async def _update_account_info(self):
        """Get account information from IB"""
        try:
            # Get account values
            account_values = self.ib.accountValues()
            
            for val in account_values:
                if val.tag == "TotalCashValue":
                    self.account_info["cash"] = float(val.value)
                elif val.tag == "EquityWithLoanValue":
                    self.account_info["equity"] = float(val.value)
                elif val.tag == "BuyingPower":
                    self.account_info["buying_power"] = float(val.value)
                elif val.tag == "NetLiquidation":
                    self.account_info["net_liquidation"] = float(val.value)
                elif val.tag == "MaintMarginReq":
                    self.account_info["maint_margin"] = float(val.value)
            
            # Get account ID
            managed_accounts = self.ib.managedAccounts()
            if managed_accounts:
                self.account_info["account"] = managed_accounts[0]
            
            logger.info(f"📊 Account info updated: {self.account_info}")
            
        except Exception as e:
            logger.error(f"❌ Failed to get account info: {str(e)}")
    
    async def get_account_info(self) -> Dict:
        """Get current account information"""
        try:
            await self._update_account_info()
            
            return {
                "status": "success",
                "account_type": self.account_type or "unknown",
                "account_name": self.account_name,
                "account": self.account_info.get("account", "Unknown"),
                "cash": self.account_info.get("cash", 0),
                "equity": self.account_info.get("equity", 0),
                "buying_power": self.account_info.get("buying_power", 0),
                "net_liquidation": self.account_info.get("net_liquidation", 0),
                "maint_margin": self.account_info.get("maint_margin", 0),
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"❌ Error getting account info: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    # ============ CONTRACT BUILDING ============
    
    def build_contract(self, contract_type: str, **kwargs) -> Optional[Contract]:
        """
        Build contract based on type
        
        Supported types:
        - stock: symbol, exchange (e.g., NASDAQ, NYSE)
        - forex: pair (e.g., EURUSD)
        - future: symbol, exchange (e.g., ES, CME)
        - crypto: symbol, exchange (e.g., BTC, PAXOS)
        - option: symbol, strike, right (CALL/PUT), expiry
        """
        try:
            if contract_type.lower() == "stock":
                contract = Stock(
                    symbol=kwargs.get("symbol"),
                    exchange=kwargs.get("exchange", "SMART"),
                    currency="USD"
                )
                logger.info(f"📈 Stock contract: {kwargs.get('symbol')}")
                
            elif contract_type.lower() == "forex":
                pair = kwargs.get("pair", "EURUSD")
                contract = Forex(pair=pair)
                logger.info(f"💱 Forex contract: {pair}")
                
            elif contract_type.lower() == "future":
                contract = Future(
                    symbol=kwargs.get("symbol"),
                    exchange=kwargs.get("exchange", "CME"),
                    lastTradeDateOrContractMonth=kwargs.get("expiry", ""),
                    currency="USD"
                )
                logger.info(f"📊 Future contract: {kwargs.get('symbol')}")
                
            elif contract_type.lower() == "crypto":
                contract = Crypto(
                    symbol=kwargs.get("symbol"),
                    exchange=kwargs.get("exchange", "PAXOS")
                )
                logger.info(f"🪙 Crypto contract: {kwargs.get('symbol')}")
                
            elif contract_type.lower() == "option":
                contract = Option(
                    symbol=kwargs.get("symbol"),
                    lastTradeDateOrContractMonth=kwargs.get("expiry"),
                    strike=float(kwargs.get("strike")),
                    right=kwargs.get("right", "CALL"),
                    exchange=kwargs.get("exchange", "SMART")
                )
                logger.info(f"📉 Option contract: {kwargs.get('symbol')} {kwargs.get('strike')} {kwargs.get('right')}")
                
            else:
                logger.error(f"❌ Unknown contract type: {contract_type}")
                return None
            
            # Qualify contract
            self.ib.qualifyContracts(contract)
            return contract
            
        except Exception as e:
            logger.error(f"❌ Error building contract: {str(e)}")
            return None
    
    # ============ MARKET DATA ============
    
    async def get_market_data(self, contract_type: str, **kwargs) -> Dict:
        """Get real-time market data for a contract"""
        try:
            contract = self.build_contract(contract_type, **kwargs)
            if not contract:
                return {"status": "error", "error": "Invalid contract"}
            
            # Request ticker data
            ticker = self.ib.reqMktData(contract, "", False, False)
            await asyncio.sleep(1)
            
            logger.info(f"📊 Market data for {kwargs}: {ticker}")
            
            return {
                "status": "success",
                "symbol": kwargs.get("symbol"),
                "contract_type": contract_type,
                "last_price": ticker.last or 0,
                "bid": ticker.bid or 0,
                "ask": ticker.ask or 0,
                "bid_size": ticker.bidSize or 0,
                "ask_size": ticker.askSize or 0,
                "volume": ticker.volume or 0,
                "open": ticker.open or 0,
                "high": ticker.high or 0,
                "low": ticker.low or 0,
                "close": ticker.close or 0,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting market data: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def get_historical_data(self, contract_type: str, duration: str = "1 D", bar_size: str = "1 day", **kwargs) -> Dict:
        """Get historical bar data"""
        try:
            contract = self.build_contract(contract_type, **kwargs)
            if not contract:
                return {"status": "error", "error": "Invalid contract"}
            
            # Request historical data
            bars = await self.ib.reqHistoricalDataAsync(
                contract,
                endDateTime="",
                durationStr=duration,
                barSizeSetting=bar_size,
                whatToShow="MIDPOINT",
                useRTH=True,
                formatDate=2
            )
            
            # Convert to list of dicts
            data_list = []
            for bar in bars:
                data_list.append({
                    "time": bar.date.isoformat(),
                    "open": float(bar.open),
                    "high": float(bar.high),
                    "low": float(bar.low),
                    "close": float(bar.close),
                    "volume": int(bar.volume),
                    "average": float(bar.average) if bar.average else 0,
                    "count": int(bar.count) if bar.count else 0
                })
            
            logger.info(f"📈 Retrieved {len(data_list)} bars for {kwargs.get('symbol')}")
            
            return {
                "status": "success",
                "symbol": kwargs.get("symbol"),
                "contract_type": contract_type,
                "duration": duration,
                "bar_size": bar_size,
                "bars": data_list,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting historical data: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    # ============ POSITIONS ============
    
    async def get_positions(self) -> Dict:
        """Get all open positions"""
        try:
            positions_list = []
            positions = self.ib.positions()
            
            for position in positions:
                positions_list.append({
                    "account": position.account,
                    "symbol": position.contract.symbol,
                    "contract_type": self._get_contract_type(position.contract),
                    "quantity": position.position,
                    "avg_cost": position.avgCost,
                    "market_price": position.marketPrice,
                    "market_value": position.marketValue,
                    "unrealized_pnl": position.unrealizedPNL,
                    "realized_pnl": position.realizedPNL,
                    "timestamp": datetime.now().isoformat()
                })
            
            logger.info(f"📊 Retrieved {len(positions_list)} positions")
            
            return {
                "status": "success",
                "positions": positions_list,
                "count": len(positions_list),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting positions: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    # ============ ORDER MANAGEMENT ============
    
    async def place_order(self, contract_type: str, action: str, quantity: int, order_type: str = "MKT", limit_price: Optional[float] = None, **kwargs) -> Dict:
        """Place an order"""
        try:
            from ib_insync import MarketOrder, LimitOrder, StopOrder
            
            contract = self.build_contract(contract_type, **kwargs)
            if not contract:
                return {"status": "error", "error": "Invalid contract"}
            
            # Create order
            if order_type == "MKT":
                order = MarketOrder(action, quantity)
            elif order_type == "LMT":
                if not limit_price:
                    return {"status": "error", "error": "Limit price required for limit orders"}
                order = LimitOrder(action, quantity, limit_price)
            else:
                order = MarketOrder(action, quantity)
            
            # Place order
            trade = self.ib.placeOrder(contract, order)
            await asyncio.sleep(0.5)
            
            logger.info(f"✅ Order placed: {action} {quantity} {kwargs.get('symbol')} - Order ID: {trade.order.orderId}")
            
            return {
                "status": "success",
                "order_id": trade.order.orderId,
                "symbol": kwargs.get("symbol"),
                "contract_type": contract_type,
                "action": action,
                "quantity": quantity,
                "order_type": order_type,
                "status": trade.orderStatus.status,
                "filled": trade.orderStatus.filled,
                "remaining": trade.orderStatus.remaining,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Error placing order: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def get_orders(self) -> Dict:
        """Get all open orders"""
        try:
            orders_list = []
            trades = self.ib.trades()
            
            for trade in trades:
                orders_list.append({
                    "order_id": trade.order.orderId,
                    "symbol": trade.contract.symbol,
                    "contract_type": self._get_contract_type(trade.contract),
                    "action": trade.order.action,
                    "quantity": trade.order.totalQuantity,
                    "order_type": trade.order.orderType,
                    "limit_price": trade.order.lmtPrice if trade.order.lmtPrice else None,
                    "status": trade.orderStatus.status,
                    "filled": trade.orderStatus.filled,
                    "remaining": trade.orderStatus.remaining,
                    "avg_fill_price": trade.orderStatus.avgFillPrice,
                    "timestamp": datetime.now().isoformat()
                })
            
            logger.info(f"📋 Retrieved {len(orders_list)} open orders")
            
            return {
                "status": "success",
                "orders": orders_list,
                "count": len(orders_list),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting orders: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def cancel_order(self, order_id: int) -> Dict:
        """Cancel an order"""
        try:
            trades = self.ib.trades()
            for trade in trades:
                if trade.order.orderId == order_id:
                    self.ib.cancelOrder(trade.order)
                    await asyncio.sleep(0.5)
                    logger.info(f"✅ Order {order_id} cancelled")
                    return {
                        "status": "success",
                        "order_id": order_id,
                        "message": f"Order {order_id} cancelled",
                        "timestamp": datetime.now().isoformat()
                    }
            
            return {
                "status": "error",
                "error": f"Order {order_id} not found",
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Error cancelling order: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    # ============ UTILITY METHODS ============
    
    def _get_contract_type(self, contract: Contract) -> str:
        """Get contract type name"""
        if isinstance(contract, Stock):
            return "stock"
        elif isinstance(contract, Forex):
            return "forex"
        elif isinstance(contract, Future):
            return "future"
        elif isinstance(contract, Crypto):
            return "crypto"
        elif isinstance(contract, Option):
            return "option"
        else:
            return "unknown"
    
    async def get_connection_status(self) -> Dict:
        """Get current connection status"""
        return {
            "connected": self.is_connected(),
            "account_type": self.account_type or "unknown",
            "account_name": self.account_name,
            "account": self.account_info.get("account", "Unknown"),
            "equity": self.account_info.get("equity", 0),
            "buying_power": self.account_info.get("buying_power", 0),
            "timestamp": datetime.now().isoformat()
        }


# Global IB client instance
ib_client = IBClientService()
