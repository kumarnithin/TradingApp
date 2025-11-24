"""
Phase 2: Risk Manager Service
Implements intelligent position sizing and risk controls
Location: /backend/app/services/risk_manager.py
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from app.database import Trade, Signal, Account
#from app.config.risk_config import RiskConfig, DEFAULT_RISK_CONFIG
from app.services.risk_config import RiskConfig, DEFAULT_RISK_CONFIG


logger = logging.getLogger(__name__)

class RiskManager:
    """Comprehensive risk management engine"""
    
    def __init__(self, config: RiskConfig = None):
        self.config = config or DEFAULT_RISK_CONFIG
    
    def calculate_position_size(
        self,
        account_balance: float,
        stop_loss_pips: float,
        symbol: str,
        confidence_score: float,
        db: Session = None
    ) -> Dict:
        """
        🎯 Calculate optimal position size using Kelly Criterion
        
        Returns:
            {
                "position_size": 10000,
                "risk_amount": 500,
                "stop_loss": 50,
                "reward_target": 1000,
                "risk_reward_ratio": 1:2,
                "scaling_factor": 0.8  # 80% of Kelly (conservative)
            }
        """
        try:
            # Get pip value (depends on symbol and account base currency)
            pip_value = self._get_pip_value(symbol)
            
            # Max risk in USD
            max_risk_usd = account_balance * (self.config.max_risk_per_trade_pct / 100)
            
            # Position size = Risk / (Stop Loss in Pips * Pip Value)
            position_size = max_risk_usd / (stop_loss_pips * pip_value)
            
            # Get win rate from historical trades
            win_rate = self._get_win_rate(symbol, db)
            
            # Kelly Criterion: f = (bp - q) / b
            # f = optimal fraction of bankroll
            # b = reward/risk ratio
            # p = win probability
            # q = loss probability (1-p)
            if win_rate > 0:
                reward_ratio = 2.0  # Risk 1, target 2
                kelly_fraction = (reward_ratio * win_rate - (1 - win_rate)) / reward_ratio
                kelly_fraction = max(kelly_fraction, 0)  # Never negative
                kelly_fraction = min(kelly_fraction, 0.25)  # Cap at 25%
            else:
                kelly_fraction = 0.5  # Default to 50% of max risk
            
            # Conservative Kelly (80% of theoretical)
            conservative_factor = 0.8
            adjusted_fraction = kelly_fraction * conservative_factor
            
            # Adjust position size based on ML confidence
            if self.config.scale_size_by_confidence:
                confidence_multiplier = confidence_score / 100.0
                position_size *= confidence_multiplier
                adjusted_fraction *= confidence_multiplier
            
            # Apply Kelly sizing
            if self.config.use_kelly_criterion:
                position_size *= adjusted_fraction
            
            logger.info(f"✅ Position size calculated: {position_size:.0f} units")
            
            return {
                "position_size": round(position_size),
                "risk_amount": max_risk_usd,
                "stop_loss": stop_loss_pips,
                "reward_target": stop_loss_pips * reward_ratio if win_rate > 0 else stop_loss_pips * 2,
                "risk_reward_ratio": f"1:{reward_ratio if win_rate > 0 else 2}",
                "kelly_fraction": round(kelly_fraction * 100, 1),
                "scaling_factor": round(adjusted_fraction, 2),
                "status": "approved"
            }
        
        except Exception as e:
            logger.error(f"❌ Error calculating position size: {str(e)}")
            return {
                "position_size": 0,
                "status": "error",
                "reason": str(e)
            }
    
    def check_daily_loss_limit(self, account_id: str, db: Session) -> Dict:
        """
        📊 Check if account has exceeded daily loss limit
        
        Returns:
            {
                "within_limit": True/False,
                "daily_pnl": -2500,
                "daily_pnl_pct": -2.5,
                "limit": -5.0,
                "status": "ok" / "exceeded"
            }
        """
        try:
            account = db.query(Account).filter(Account.id == account_id).first()
            if not account:
                return {"status": "error", "reason": "Account not found"}
            
            # Get today's trades
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            today_trades = db.query(Trade).filter(
                Trade.account_id == account_id,
                Trade.created_at >= today_start,
                Trade.status == "closed"
            ).all()
            
            # Calculate daily P&L
            daily_pnl = sum(t.profit_loss or 0 for t in today_trades)
            daily_pnl_pct = (daily_pnl / account.account_balance * 100) if account.account_balance > 0 else 0
            
            # Check limit
            within_limit = daily_pnl_pct >= (-self.config.max_daily_loss_pct)
            
            logger.info(f"📊 Daily P&L: ${daily_pnl:.2f} ({daily_pnl_pct:.2f}%)")
            
            return {
                "within_limit": within_limit,
                "daily_pnl": round(daily_pnl, 2),
                "daily_pnl_pct": round(daily_pnl_pct, 2),
                "limit": -self.config.max_daily_loss_pct,
                "trades_today": len(today_trades),
                "status": "ok" if within_limit else "exceeded"
            }
        
        except Exception as e:
            logger.error(f"❌ Error checking daily loss: {str(e)}")
            return {"status": "error", "reason": str(e)}
    
    def calculate_portfolio_heat(self, account_id: str, db: Session) -> Dict:
        """
        🔥 Calculate total portfolio risk exposure
        
        Returns:
            {
                "portfolio_heat_pct": 6.5,
                "portfolio_heat_usd": 3250,
                "limit": 10.0,
                "within_limit": True,
                "open_positions": 2,
                "position_details": [...]
            }
        """
        try:
            account = db.query(Account).filter(Account.id == account_id).first()
            if not account:
                return {"status": "error", "reason": "Account not found"}
            
            # Get all open trades
            open_trades = db.query(Trade).filter(
                Trade.account_id == account_id,
                Trade.status == "open"
            ).all()
            
            # Calculate total risk
            total_risk_usd = 0
            position_details = []
            
            for trade in open_trades:
                # Risk = (Entry Price - Stop Loss) * Quantity
                if trade.entry_price and trade.stop_loss:
                    trade_risk = abs(trade.entry_price - trade.stop_loss) * trade.quantity
                else:
                    trade_risk = 0
                
                total_risk_usd += trade_risk
                position_details.append({
                    "symbol": trade.symbol,
                    "quantity": trade.quantity,
                    "entry_price": trade.entry_price,
                    "stop_loss": trade.stop_loss,
                    "risk": round(trade_risk, 2)
                })
            
            # Calculate percentage
            portfolio_heat_pct = (total_risk_usd / account.account_balance * 100) if account.account_balance > 0 else 0
            within_limit = portfolio_heat_pct <= self.config.max_portfolio_heat_pct
            within_position_limit = len(open_trades) <= self.config.max_concurrent_positions
            
            logger.info(f"🔥 Portfolio Heat: {portfolio_heat_pct:.2f}% ({len(open_trades)} positions)")
            
            return {
                "portfolio_heat_pct": round(portfolio_heat_pct, 2),
                "portfolio_heat_usd": round(total_risk_usd, 2),
                "limit_pct": self.config.max_portfolio_heat_pct,
                "open_positions": len(open_trades),
                "position_limit": self.config.max_concurrent_positions,
                "within_heat_limit": within_limit,
                "within_position_limit": within_position_limit,
                "position_details": position_details,
                "status": "ok" if (within_limit and within_position_limit) else "exceeded"
            }
        
        except Exception as e:
            logger.error(f"❌ Error calculating portfolio heat: {str(e)}")
            return {"status": "error", "reason": str(e)}
    
    def validate_stop_loss(self, stop_loss_pips: float, symbol: str) -> Dict:
        """
        ✅ Validate stop-loss is within acceptable range
        """
        # If stop_loss_pips is not provided or non-positive, skip strict validation
        if not stop_loss_pips or stop_loss_pips <= 0:
            return {
                "valid": True,
                "stop_loss": stop_loss_pips,
                "min_allowed": self.config.min_stop_loss_pips,
                "max_allowed": self.config.max_stop_loss_pips,
                "status": "skipped"
            }

        within_min = stop_loss_pips >= self.config.min_stop_loss_pips
        within_max = stop_loss_pips <= self.config.max_stop_loss_pips

        return {
            "valid": within_min and within_max,
            "stop_loss": stop_loss_pips,
            "min_allowed": self.config.min_stop_loss_pips,
            "max_allowed": self.config.max_stop_loss_pips,
            "status": "ok" if (within_min and within_max) else "invalid"
        }
    
    def perform_all_risk_checks(
        self,
        account_id: str,
        stop_loss_pips: float,
        symbol: str,
        position_size: float,
        confidence_score: float,
        db: Session
    ) -> Dict:
        """
        🛡️ Perform ALL risk checks before executing trade
        
        Returns comprehensive risk assessment
        """
        account = db.query(Account).filter(Account.id == account_id).first()
        if not account:
            return {"status": "error", "reason": "Account not found", "approved": False}
        
        checks = {}
        all_passed = True
        
        # Check 1: Daily Loss Limit
        daily_check = self.check_daily_loss_limit(account_id, db)
        checks["daily_loss_limit"] = daily_check
        if daily_check.get("status") == "exceeded":
            all_passed = False
        
        # Check 2: Portfolio Heat
        heat_check = self.calculate_portfolio_heat(account_id, db)
        checks["portfolio_heat"] = heat_check
        if not heat_check.get("within_heat_limit") or not heat_check.get("within_position_limit"):
            all_passed = False
        
        # Check 3: Stop Loss Validation
        sl_check = self.validate_stop_loss(stop_loss_pips, symbol)
        checks["stop_loss_valid"] = sl_check
        if not sl_check.get("valid"):
            all_passed = False
        
        # Check 4: Position Size Calculation
        pos_check = self.calculate_position_size(
            account.account_balance,
            stop_loss_pips,
            symbol,
            confidence_score,
            db
        )
        checks["position_size"] = pos_check
        
        # Check 5: Risk Amount Per Trade
        risk_per_trade = pos_check.get("risk_amount", 0)
        max_risk = account.account_balance * (self.config.max_risk_per_trade_pct / 100)
        risk_check = {
            "risk_amount": risk_per_trade,
            "max_allowed": max_risk,
            "within_limit": risk_per_trade <= max_risk,
            "status": "ok" if risk_per_trade <= max_risk else "exceeded"
        }
        checks["risk_per_trade"] = risk_check
        if not risk_check["within_limit"]:
            all_passed = False
        
        logger.info(f"🛡️ Risk checks complete: {'✅ APPROVED' if all_passed else '❌ REJECTED'}")
        
        return {
            "approved": all_passed,
            "checks": checks,
            "final_position_size": pos_check.get("position_size", position_size),
            "reasons_rejected": [k for k, v in checks.items() if v.get("status") == "exceeded" or v.get("status") == "invalid"]
        }
    
    def _get_pip_value(self, symbol: str) -> float:
        """Get pip value for currency pair (USD base)"""
        pip_values = {
            'EURUSD': 0.0001, 'GBPUSD': 0.0001, 'USDJPY': 0.01,
            'USDCAD': 0.0001, 'AUDUSD': 0.0001, 'NZDUSD': 0.0001,
            'EURGBP': 0.0001, 'EURJPY': 0.01, 'GBPJPY': 0.01
        }
        return pip_values.get(symbol, 0.0001)
    
    def _get_win_rate(self, symbol: str, db: Session) -> float:
        """Get historical win rate for symbol"""
        if not db:
            return 0.5
        
        try:
            cutoff = datetime.utcnow() - timedelta(days=30)
            trades = db.query(Trade).filter(
                Trade.symbol == symbol,
                Trade.created_at >= cutoff,
                Trade.status == "closed"
            ).all()
            
            if not trades:
                return 0.5
            
            winning = sum(1 for t in trades if t.profit_loss and t.profit_loss > 0)
            return winning / len(trades)
        except:
            return 0.5

# Singleton instance
risk_manager = RiskManager()