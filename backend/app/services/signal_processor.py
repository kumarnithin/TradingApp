from typing import Dict
from datetime import datetime

class SignalProcessor:
    """Processes and validates trading signals"""
    
    @staticmethod
    def validate_signal(signal_data: Dict) -> Dict:
        """
        Validate that a signal has correct format and required fields
        
        Returns:
        {
            "valid": True/False,
            "errors": [list of errors if any]
        }
        """
        result = {
            "valid": True,
            "errors": []
        }
        
        # Check for required fields
        required = ["symbol", "action", "quantity"]
        for field in required:
            if field not in signal_data:
                result["errors"].append(f"Missing required field: {field}")
                result["valid"] = False
        
        # Validate action is BUY, SELL, or CLOSE
        if "action" in signal_data:
            valid_actions = ["BUY", "SELL", "CLOSE"]
            if signal_data["action"] not in valid_actions:
                result["errors"].append(
                    f"Invalid action '{signal_data['action']}'. Must be: {valid_actions}"
                )
                result["valid"] = False
        
        # Validate quantity is positive
        if "quantity" in signal_data:
            if signal_data["quantity"] <= 0:
                result["errors"].append("Quantity must be positive (greater than 0)")
                result["valid"] = False
        
        return result
    
    @staticmethod
    def normalize_signal(signal_data: Dict) -> Dict:
        """
        Convert signal data to standard format
        
        Makes sure all data is in the right type:
        - Uppercase strings
        - Numbers instead of strings
        - etc.
        """
        return {
            "symbol": signal_data.get("symbol", "").upper(),
            "action": signal_data.get("action", "").upper(),
            "quantity": float(signal_data.get("quantity", 0)),
            "order_type": signal_data.get("order_type", "MARKET").upper(),
            "price": float(signal_data["price"]) if signal_data.get("price") else None,
            "stop_loss": float(signal_data["stop_loss"]) if signal_data.get("stop_loss") else None,
            "take_profit": float(signal_data["take_profit"]) if signal_data.get("take_profit") else None,
            "strategy_id": signal_data.get("strategy_id"),
            "timestamp": datetime.now().isoformat()
        }
