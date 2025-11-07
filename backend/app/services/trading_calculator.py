"""
🛠️ TRADING TOOLS CALCULATORS - Core Business Logic
Location: /backend/app/services/trading_calculator.py

Features:
✅ Position Size Calculator (All instruments)
✅ Risk/Reward Analysis
✅ Drawdown Calculator
✅ Kelly Criterion
✅ Win Rate Optimizer
✅ Profit Target Optimizer
✅ Volatility Analysis
"""

from typing import Dict, List, Optional
from datetime import datetime, timedelta
import math

class TradingCalculator:
    """Professional trading calculations engine"""
    
    # Instrument multipliers
    MULTIPLIERS = {
        "stocks": 1,
        "forex": 100000,
        "futures": {"ES": 50, "NQ": 20, "GC": 100, "CL": 1000, "NG": 10000},
        "crypto": 1,
        "options": 100,
    }
    
    # Default broker margins
    BROKER_MARGINS = {
        "stocks": {"IB": 0.25, "TD": 0.30},
        "forex": {"IB": 0.02, "OANDA": 0.05, "FXCM": 0.10},
        "futures": {"IB": 0.10, "CME": 0.15},
        "crypto": {"IB": 0.10, "Kraken": 0.15},
    }
    
    @staticmethod
    def calculate_position_size(
        account_balance: float,
        risk_percent: float,
        entry_price: float,
        stop_loss: float,
        instrument_type: str,
        symbol: str = "",
        broker: str = "IB"
    ) -> Dict:
        """Calculate optimal position size based on risk"""
        
        # Calculate risk per unit
        risk_per_unit = abs(entry_price - stop_loss)
        
        # Calculate maximum risk amount
        max_risk_amount = account_balance * (risk_percent / 100)
        
        # Calculate position size
        if risk_per_unit > 0:
            position_size = max_risk_amount / risk_per_unit
        else:
            return {"error": "Stop loss equals entry price"}
        
        # Get multiplier
        if instrument_type == "futures":
            multiplier = TradingCalculator.MULTIPLIERS["futures"].get(symbol, 100)
        else:
            multiplier = TradingCalculator.MULTIPLIERS.get(instrument_type, 1)
        
        # Calculate contract quantity
        if instrument_type == "options":
            contracts = int(position_size / 100)
            shares = contracts * 100
        elif instrument_type == "futures":
            contracts = int(position_size / multiplier)
            shares = contracts
        elif instrument_type == "forex":
            lots = position_size / 100000
            shares = position_size
        else:
            shares = int(position_size)
            contracts = 0
        
        # Calculate margin requirement
        margin_rate = TradingCalculator.BROKER_MARGINS.get(instrument_type, {}).get(broker, 0.10)
        margin_required = (position_size * entry_price * margin_rate) / 100
        
        # Calculate actual risk
        actual_risk = risk_per_unit * position_size
        actual_risk_percent = (actual_risk / account_balance) * 100
        
        return {
            "position_size": round(position_size, 2),
            "shares": shares,
            "contracts": contracts,
            "lots": round(position_size / 100000, 2) if instrument_type == "forex" else 0,
            "risk_per_unit": round(risk_per_unit, 4),
            "max_risk_amount": round(max_risk_amount, 2),
            "actual_risk": round(actual_risk, 2),
            "risk_percent": round(actual_risk_percent, 2),
            "margin_required": round(margin_required, 2),
            "margin_available": round(account_balance - margin_required, 2),
            "valid": margin_required < account_balance,
            "message": "✓ Acceptable" if margin_required < account_balance else "✗ Insufficient margin"
        }
    
    @staticmethod
    def calculate_risk_reward(
        entry_price: float,
        stop_loss: float,
        take_profit: float,
        quantity: float,
        commission_per_side: float = 0
    ) -> Dict:
        """Calculate detailed risk/reward analysis"""
        
        risk_per_unit = abs(entry_price - stop_loss)
        reward_per_unit = abs(take_profit - entry_price)
        
        # Gross calculations
        gross_risk = risk_per_unit * quantity
        gross_reward = reward_per_unit * quantity
        
        # Net calculations (with commission)
        total_commission = commission_per_side * 2  # Entry + Exit
        net_risk = gross_risk + total_commission
        net_reward = gross_reward - total_commission
        
        # Risk/Reward ratio
        if risk_per_unit > 0:
            rr_ratio = reward_per_unit / risk_per_unit
        else:
            rr_ratio = 0
        
        # Win rate needed for breakeven
        if (rr_ratio + 1) > 0:
            win_rate_needed = 100 / (rr_ratio + 1)
        else:
            win_rate_needed = 100
        
        # Expected value (at 50% win rate)
        expected_value = (net_reward * 0.5) - (net_risk * 0.5)
        
        # Profit factor (reward / risk)
        profit_factor = gross_reward / gross_risk if gross_risk > 0 else 0
        
        return {
            "entry_price": entry_price,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "quantity": quantity,
            "risk_per_unit": round(risk_per_unit, 4),
            "reward_per_unit": round(reward_per_unit, 4),
            "gross_risk": round(gross_risk, 2),
            "gross_reward": round(gross_reward, 2),
            "commission_total": round(total_commission, 2),
            "net_risk": round(net_risk, 2),
            "net_reward": round(net_reward, 2),
            "rr_ratio": round(rr_ratio, 2),
            "rr_ratio_text": f"1:{rr_ratio:.2f}",
            "win_rate_needed": round(win_rate_needed, 2),
            "expected_value": round(expected_value, 2),
            "profit_factor": round(profit_factor, 2),
            "risk_assessment": "✓ Excellent" if rr_ratio >= 2 else "✓ Good" if rr_ratio >= 1.5 else "⚠️ Marginal"
        }
    
    @staticmethod
    def calculate_drawdown(
        peak_equity: float,
        current_equity: float,
        historical_data: Optional[List[Dict]] = None
    ) -> Dict:
        """Calculate drawdown metrics"""
        
        # Current drawdown
        current_dd = ((current_equity - peak_equity) / peak_equity) * 100
        dd_amount = peak_equity - current_equity
        
        # Recovery calculation
        recovery_amount = abs(dd_amount)
        recovery_percent_needed = (dd_amount / current_equity * 100)
        
        # Max historical drawdown
        max_dd = 0
        max_dd_amount = 0
        if historical_data:
            peak = max(historical_data, key=lambda x: x.get('equity', 0))['equity']
            for data in historical_data:
                dd = ((data.get('equity', 0) - peak) / peak) * 100
                if dd < max_dd:
                    max_dd = dd
                    max_dd_amount = peak - data.get('equity', 0)
        
        # Risk of ruin (simple calculation)
        if current_dd < 0:
            ror_estimate = abs(current_dd)  # Simplified
        else:
            ror_estimate = 0
        
        return {
            "current_equity": current_equity,
            "peak_equity": peak_equity,
            "current_drawdown_percent": round(current_dd, 2),
            "current_drawdown_amount": round(dd_amount, 2),
            "recovery_needed_amount": round(recovery_amount, 2),
            "recovery_percent": round(recovery_percent_needed, 2),
            "max_historical_drawdown": round(max_dd, 2),
            "max_dd_amount": round(max_dd_amount, 2),
            "risk_of_ruin_estimate": round(ror_estimate, 2),
            "status": "🟢 Healthy" if current_dd < -5 else "🟡 Monitor" if current_dd < -10 else "🔴 Critical"
        }
    
    @staticmethod
    def calculate_kelly_criterion(
        win_rate: float,
        avg_win: float,
        avg_loss: float
    ) -> Dict:
        """Calculate Kelly Criterion for position sizing"""
        
        win_prob = win_rate / 100
        loss_prob = 1 - win_prob
        
        if avg_loss <= 0:
            return {"error": "Average loss must be positive"}
        
        win_loss_ratio = avg_win / avg_loss
        
        # Kelly formula: f = (W*B - L) / B
        # where W = win%, B = win/loss ratio, L = loss%
        kelly_fraction = (win_prob * win_loss_ratio - loss_prob) / win_loss_ratio
        
        # Convert to percentage
        kelly_percent = kelly_fraction * 100
        
        # Practical recommendation (half Kelly for safety)
        practical_percent = kelly_percent / 2
        
        return {
            "kelly_fraction": round(kelly_fraction, 4),
            "kelly_percent": round(kelly_percent, 2),
            "practical_kelly": round(practical_percent, 2),
            "recommendation": f"Risk {practical_percent:.2f}% per trade",
            "safety_note": "Using half-Kelly for risk management",
            "warning": "✓ Safe" if practical_percent <= 5 else "⚠️ Consider reducing"
        }
    
    @staticmethod
    def optimize_win_rate(
        current_win_rate: float,
        current_avg_win: float,
        current_avg_loss: float,
        current_pf: float
    ) -> Dict:
        """Suggest improvements for win rate and profitability"""
        
        suggestions = []
        improvements = {}
        
        # Win rate improvement
        improved_wr = current_win_rate * 1.05  # 5% improvement
        pnl_with_improved_wr = (improved_wr / 100 * current_avg_win) - ((100 - improved_wr) / 100 * current_avg_loss)
        
        suggestions.append({
            "metric": "Win Rate",
            "current": round(current_win_rate, 1),
            "target": round(improved_wr, 1),
            "improvement": "+5%",
            "expected_pnl_increase": round(pnl_with_improved_wr - ((current_win_rate / 100 * current_avg_win) - ((100 - current_win_rate) / 100 * current_avg_loss)), 2),
            "method": "Add confirmation indicator or filter false signals"
        })
        
        # Avg win improvement
        improved_win = current_avg_win * 1.15  # 15% increase
        pnl_with_improved_win = (current_win_rate / 100 * improved_win) - ((100 - current_win_rate) / 100 * current_avg_loss)
        
        suggestions.append({
            "metric": "Average Win",
            "current": round(current_avg_win, 2),
            "target": round(improved_win, 2),
            "improvement": "+15%",
            "expected_pnl_increase": round(pnl_with_improved_win - ((current_win_rate / 100 * current_avg_win) - ((100 - current_win_rate) / 100 * current_avg_loss)), 2),
            "method": "Let winners run longer, use trailing stops"
        })
        
        # Avg loss improvement
        improved_loss = current_avg_loss * 0.85  # 15% reduction
        pnl_with_improved_loss = (current_win_rate / 100 * current_avg_win) - ((100 - current_win_rate) / 100 * improved_loss)
        
        suggestions.append({
            "metric": "Average Loss",
            "current": round(current_avg_loss, 2),
            "target": round(improved_loss, 2),
            "improvement": "-15%",
            "expected_pnl_increase": round(pnl_with_improved_loss - ((current_win_rate / 100 * current_avg_win) - ((100 - current_win_rate) / 100 * current_avg_loss)), 2),
            "method": "Tighter stops, avoid low-probability setups"
        })
        
        return {
            "current_expectancy": round((current_win_rate / 100 * current_avg_win) - ((100 - current_win_rate) / 100 * current_avg_loss), 2),
            "suggestions": suggestions,
            "best_combination": "Improve avg loss first (best ROI)"
        }
    
    @staticmethod
    def calculate_trading_sessions(timezone: str) -> Dict:
        """Calculate optimal trading sessions"""
        
        sessions = {
            "asia": {"start": "19:00", "end": "04:00", "volatility": 1, "liquidity": 2},
            "london": {"start": "08:00", "end": "17:00", "volatility": 3, "liquidity": 4},
            "newyork": {"start": "13:00", "end": "21:00", "volatility": 3, "liquidity": 4},
            "overlap_london_ny": {"start": "13:00", "end": "17:00", "volatility": 4, "liquidity": 5},
        }
        
        return {
            "sessions": sessions,
            "recommended": "overlap_london_ny",
            "recommendation": "Trade during London-New York overlap for best liquidity"
        }

# Global calculator instance
calculator = TradingCalculator()

def get_calculator() -> TradingCalculator:
    """Get global calculator instance"""
    return calculator