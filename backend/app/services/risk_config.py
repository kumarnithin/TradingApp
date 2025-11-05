"""
Phase 2: Risk Management Configuration
Location: /backend/app/services/risk_config.py
"""

from dataclasses import dataclass
from typing import Optional



@dataclass
class RiskConfig:
    """Configuration for risk management engine"""
    
    # Position Sizing
    max_risk_per_trade_pct: float = 2.0      # Max 2% of account per trade
    use_kelly_criterion: bool = True          # Use Kelly formula for optimal sizing
    
    # Daily Limits
    max_daily_loss_pct: float = 5.0           # Stop trading if down 5% today
    max_daily_loss_usd: Optional[float] = None # OR fixed dollar amount
    
    # Portfolio Heat
    max_portfolio_heat_pct: float = 10.0      # Max 10% total exposure
    max_concurrent_positions: int = 5         # Max 5 open trades
    
    # Stop-Loss Management
    min_stop_loss_pips: float = 20.0          # Minimum 20 pips
    max_stop_loss_pips: float = 200.0         # Maximum 200 pips
    use_dynamic_stop_loss: bool = True        # Adjust based on volatility
    
    # Risk Adjustments
    correlation_threshold: float = 0.7        # Don't open correlated positions
    max_consecutive_losses: int = 3           # Stop after 3 consecutive losses
    reduce_size_after_loss: bool = True       # Reduce position size after loss
    size_reduction_factor: float = 0.75       # 75% of previous size
    
    # Account Protection
    enable_equity_stop: bool = True           # Stop if account drops X%
    equity_stop_loss_pct: float = 20.0        # Stop at -20% equity
    
    # Confidence Scaling
    scale_size_by_confidence: bool = True     # Adjust size based on ML confidence
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            "max_risk_per_trade_pct": self.max_risk_per_trade_pct,
            "max_daily_loss_pct": self.max_daily_loss_pct,
            "max_portfolio_heat_pct": self.max_portfolio_heat_pct,
            "max_concurrent_positions": self.max_concurrent_positions,
            "use_kelly_criterion": self.use_kelly_criterion,
            "enable_equity_stop": self.enable_equity_stop,
        }

# Default risk configuration
DEFAULT_RISK_CONFIG = RiskConfig()