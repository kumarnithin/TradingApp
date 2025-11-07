"""
🚀 SYMBOL MAPPER SERVICE - Core Business Logic
Location: /backend/app/services/symbol_mapper.py

Features:
✅ IB ↔ TradingView symbol conversion
✅ Instrument type detection
✅ Smart suggestions
✅ Custom mapping support
"""

from typing import Dict, List, Optional, Tuple
import json

class SymbolMapper:
    """Convert between IB and TradingView symbol formats"""
    
    # Default mappings
    DEFAULT_MAPPINGS = {
        # Stocks (usually same format)
        "stocks": {
            "AAPL": "AAPL",
            "MSFT": "MSFT",
            "GOOGL": "GOOGL",
            "TSLA": "TSLA",
            "NVDA": "NVDA",
        },
        # Forex pairs - IB uses dots, TV uses concatenation
        "forex": {
            "EUR.USD": "EURUSD",
            "GBP.USD": "GBPUSD",
            "USD.JPY": "USDJPY",
            "EUR.GBP": "EURGBP",
            "AUD.USD": "AUDUSD",
            "USD.CAD": "USDCAD",
            "USD.CHF": "USDCHF",
            "NZD.USD": "NZDUSD",
            "EUR.JPY": "EURJPY",
            "GBP.JPY": "GBPJPY",
        },
        # Futures - IB uses symbol, TV adds contract suffix
        "futures": {
            "ES": "ES1!",      # E-mini S&P 500
            "NQ": "NQ1!",      # E-mini NASDAQ
            "YM": "YM1!",      # E-mini Dow Jones
            "RTY": "RTY1!",    # E-mini Russell 2000
            "GC": "GC1!",      # Gold
            "CL": "CL1!",      # Crude Oil
            "NG": "NG1!",      # Natural Gas
            "ZC": "ZC1!",      # Corn
            "ZS": "ZS1!",      # Soybeans
            "ZW": "ZW1!",      # Wheat
        },
        # Crypto
        "crypto": {
            "BTCUSD": "BTCUSD",
            "ETHUSD": "ETHUSD",
            "BTC": "BTCUSD",
            "ETH": "ETHUSD",
            "BTC1!": "BTC1!",  # BTC Futures
            "ETH1!": "ETH1!",  # ETH Futures
        },
        # Options - IB uses hyphens, TV uses concatenation
        "options": {
            # Format: AAPL-211217C130 (IB) → AAPL211217C130 (TV)
            # This is handled by rules, not static mapping
        }
    }
    
    # Instrument type detection rules
    TYPE_RULES = {
        "forex": lambda s: "." in s and len(s) == 7,  # EUR.USD
        "futures": lambda s: s in ["ES", "NQ", "YM", "RTY", "GC", "CL", "NG", "ZC", "ZS", "ZW"],
        "crypto": lambda s: "USD" in s or s in ["BTC", "ETH"] or s.endswith("1!"),
        "options": lambda s: "-" in s or any(c in s for c in ["C", "P"]),  # Contains call/put
        "stocks": lambda s: len(s) <= 5 and s.isalpha(),  # Default: simple letters
    }
    
    def __init__(self):
        self.mappings = self.DEFAULT_MAPPINGS.copy()
        self.reverse_mappings = self._build_reverse_mappings()
    
    def _build_reverse_mappings(self) -> Dict:
        """Build reverse mappings for TV → IB conversion"""
        reverse = {}
        for category, symbols in self.mappings.items():
            if isinstance(symbols, dict):
                reverse[category] = {v: k for k, v in symbols.items()}
        return reverse
    
    def detect_instrument_type(self, symbol: str) -> str:
        """Detect instrument type from symbol format"""
        for itype, rule in self.TYPE_RULES.items():
            if rule(symbol):
                return itype
        return "stocks"  # Default
    
    def ib_to_tradingview(self, ib_symbol: str) -> Tuple[Optional[str], str]:
        """
        Convert IB symbol to TradingView format
        
        Args:
            ib_symbol: IB format symbol (e.g., EUR.USD, AAPL, ES)
        
        Returns:
            Tuple[tv_symbol, instrument_type]
            Example: ("EURUSD", "forex")
        """
        itype = self.detect_instrument_type(ib_symbol)
        
        # Exact match in mappings
        if itype in self.mappings and ib_symbol in self.mappings[itype]:
            tv_symbol = self.mappings[itype][ib_symbol]
            return tv_symbol, itype
        
        # Special handling for options: remove hyphens
        if itype == "options":
            tv_symbol = ib_symbol.replace("-", "")
            return tv_symbol, itype
        
        # If not found, return original
        return ib_symbol, itype
    
    def tradingview_to_ib(self, tv_symbol: str) -> Tuple[Optional[str], str]:
        """
        Convert TradingView symbol to IB format
        
        Args:
            tv_symbol: TradingView format symbol (e.g., EURUSD, AAPL, ES1!)
        
        Returns:
            Tuple[ib_symbol, instrument_type]
        """
        # Detect type from TV symbol
        itype = self._detect_tv_symbol_type(tv_symbol)
        
        # Check reverse mappings
        if itype in self.reverse_mappings and tv_symbol in self.reverse_mappings[itype]:
            ib_symbol = self.reverse_mappings[itype][tv_symbol]
            return ib_symbol, itype
        
        # Special handling for options
        if itype == "options":
            ib_symbol = self._add_option_hyphen(tv_symbol)
            return ib_symbol, itype
        
        # If not found, return original
        return tv_symbol, itype
    
    def _detect_tv_symbol_type(self, symbol: str) -> str:
        """Detect instrument type from TV symbol"""
        if "!" in symbol:
            return "futures"  # ES1!, NQ1!, etc.
        if any(c in symbol.upper() for c in ["C", "P"]) and len(symbol) > 3:
            return "options"  # AAPL211217C130
        if "USD" in symbol:
            return "crypto"
        return "stocks"
    
    def _add_option_hyphen(self, tv_symbol: str) -> str:
        """Convert option from TV format to IB format (add hyphen)"""
        # AAPL211217C130 → AAPL-211217C130
        # Find the first digit
        for i, char in enumerate(tv_symbol):
            if char.isdigit():
                return tv_symbol[:i] + "-" + tv_symbol[i:]
        return tv_symbol
    
    def get_instrument_details(self, symbol: str, source: str = "ib") -> Dict:
        """Get detailed information about an instrument"""
        if source == "ib":
            tv_symbol, itype = self.ib_to_tradingview(symbol)
        else:
            ib_symbol, itype = self.tradingview_to_ib(symbol)
            tv_symbol = symbol
        
        details = {
            "ib_symbol": symbol if source == "ib" else ib_symbol,
            "tradingview_symbol": tv_symbol,
            "instrument_type": itype,
            "exchange": self._get_exchange(itype),
            "multiplier": self._get_multiplier(itype, symbol),
            "tick_size": self._get_tick_size(itype),
        }
        return details
    
    def _get_exchange(self, itype: str) -> str:
        """Get exchange name for instrument type"""
        exchanges = {
            "stocks": "NASDAQ/NYSE",
            "forex": "Interbank",
            "futures": "CME",
            "crypto": "Spot/Futures",
            "options": "CBOE",
        }
        return exchanges.get(itype, "Unknown")
    
    def _get_multiplier(self, itype: str, symbol: str) -> int:
        """Get contract multiplier"""
        multipliers = {
            "stocks": 1,
            "forex": 100000,
            "futures": 50 if "ES" in symbol or "NQ" in symbol else 100,
            "crypto": 1,
            "options": 100,
        }
        return multipliers.get(itype, 1)
    
    def _get_tick_size(self, itype: str) -> float:
        """Get minimum tick size"""
        ticks = {
            "stocks": 0.01,
            "forex": 0.00001,
            "futures": 0.25,
            "crypto": 0.01,
            "options": 0.01,
        }
        return ticks.get(itype, 0.01)
    
    def search_symbols(self, query: str) -> List[Dict]:
        """Search for symbols containing query"""
        results = []
        query = query.upper()
        
        for category, symbols in self.mappings.items():
            if isinstance(symbols, dict):
                for ib, tv in symbols.items():
                    if query in ib or query in tv:
                        results.append({
                            "ib_symbol": ib,
                            "tradingview_symbol": tv,
                            "instrument_type": category,
                            "exchange": self._get_exchange(category),
                        })
        
        return results[:10]  # Limit results
    
    def validate_mapping(self, ib_symbol: str, tv_symbol: str) -> Dict:
        """Validate if a mapping is correct"""
        detected_tv, itype = self.ib_to_tradingview(ib_symbol)
        
        is_valid = detected_tv == tv_symbol
        
        return {
            "valid": is_valid,
            "ib_symbol": ib_symbol,
            "tradingview_symbol": tv_symbol,
            "detected_tradingview": detected_tv,
            "instrument_type": itype,
            "message": "✓ Correct mapping" if is_valid else "✗ Mapping mismatch"
        }
    
    def batch_convert(self, symbols: List[str], source: str = "ib") -> List[Dict]:
        """Convert multiple symbols at once"""
        results = []
        for symbol in symbols:
            if source == "ib":
                tv_symbol, itype = self.ib_to_tradingview(symbol)
                results.append({
                    "ib_symbol": symbol,
                    "tradingview_symbol": tv_symbol,
                    "instrument_type": itype,
                })
            else:
                ib_symbol, itype = self.tradingview_to_ib(symbol)
                results.append({
                    "ib_symbol": ib_symbol,
                    "tradingview_symbol": symbol,
                    "instrument_type": itype,
                })
        return results


# Global mapper instance
mapper = SymbolMapper()


def get_symbol_mapper() -> SymbolMapper:
    """Get global mapper instance"""
    return mapper