from typing import Dict

class RiskManager:
    """Checks if trades are safe"""
    
    @staticmethod
    def validate_trade(
        account_balance: float,
        symbol: str,
        action: str,
        quantity: float,
        price: float = None
    ) -> Dict:
        """
        Check if trade meets risk requirements
        
        Returns a dictionary with:
        - approved: True/False (is trade safe?)
        - warnings: List of warnings (be careful!)
        - errors: List of errors (can't trade!)
        """
        result = {
            "approved": True,
            "warnings": [],
            "errors": []
        }
        
        # Calculate how much money this trade uses
        if price:
            position_value = quantity * price
        else:
            position_value = quantity * 100  # Assume $100 per share
        
        # Check if position is > 20% of account (warning!)
        if position_value > account_balance * 0.20:
            result["warnings"].append(
                f"Position size (${position_value:.2f}) exceeds 20% of account"
            )
        
        # Check if position is > 50% of account (reject!)
        if position_value > account_balance * 0.50:
            result["errors"].append(
                f"Position size too large (${position_value:.2f} > 50% of account)"
            )
            result["approved"] = False
        
        # Check minimum quantity
        if quantity < 1:
            result["errors"].append("Quantity must be at least 1")
            result["approved"] = False
        
        return result
    
    @staticmethod
    def calculate_position_size(
        account_balance: float,
        risk_percent: float,
        entry_price: float,
        stop_loss_price: float
    ) -> float:
        """
        Calculate how many shares to buy based on risk amount
        
        Example:
        - Account: $100,000
        - Risk: 2% = $2,000
        - Entry: $150
        - Stop loss: $140
        - Risk per share: $10
        - Position size: $2,000 / $10 = 200 shares
        """
        
        if stop_loss_price >= entry_price:
            return 0  # Invalid stop loss
        
        risk_amount = account_balance * (risk_percent / 100)
        price_risk = abs(entry_price - stop_loss_price)
        
        if price_risk == 0:
            return 0
        
        position_size = risk_amount / price_risk
        return round(position_size, 2)
