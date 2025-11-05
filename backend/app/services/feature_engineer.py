"""
Phase 1: Feature Engineering Service
Extracts features from signals for ML model
Location: /backend/app/services/feature_engineer.py
"""

from datetime import datetime
from sqlalchemy.orm import Session
from app.database import Signal, Trade
import logging

logger = logging.getLogger(__name__)

class FeatureEngineer:
    """Extract ML features from signals and historical data"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def extract_features(self, signal: Signal) -> dict:
        """
        Extract 10 features from a signal for ML model
        
        Returns:
            dict with keys: hour, day_of_week, signal_type, symbol, 
                          quantity, win_rate, volatility, trend, 
                          time_since_last_signal, and_value
        """
        try:
            features = {}
            
            # Feature 1: Hour of Day (0-23)
            features['hour'] = signal.received_at.hour if signal.received_at else 12
            
            # Feature 2: Day of Week (0-6, Monday=0)
            features['day_of_week'] = signal.received_at.weekday() if signal.received_at else 0
            
            # Feature 3: Signal Type (BUY=1, SELL=0)
            features['signal_type'] = 1 if signal.action == 'BUY' else 0
            
            # Feature 4: Symbol (encode as number based on symbol)
            symbol_map = {
                'EURUSD': 1, 'GBPUSD': 2, 'USDJPY': 3, 'USDCAD': 4,
                'AUDUSD': 5, 'NZDUSD': 6, 'USDCHF': 7, 'EURJPY': 8,
                'EURGBP': 9, 'GBPJPY': 10
            }
            features['symbol'] = symbol_map.get(signal.symbol, 0)
            
            # Feature 5: Quantity (normalized)
            features['quantity_norm'] = min(signal.quantity / 100000, 2.0)  # Normalize to 0-2
            
            # Feature 6: Recent Win Rate (for this symbol)
            features['win_rate'] = self._calculate_win_rate(signal.symbol)
            
            # Feature 7: Volatility (placeholder, calculate from price if available)
            features['volatility'] = self._estimate_volatility(signal.symbol)
            
            # Feature 8: Trend Direction (UP=1, DOWN=-1, FLAT=0)
            features['trend'] = self._estimate_trend(signal.symbol)
            
            # Feature 9: Time Since Last Signal (normalized seconds)
            features['time_since_last'] = self._time_since_last_signal(signal.symbol, signal.account_id)
            
            # Feature 10: Strategy Strength (placeholder, 0-10)
            features['strategy_strength'] = self._estimate_strategy_strength(signal.strategy_id)
            
            logger.info(f"✅ Features extracted for {signal.symbol}: {features}")
            return features
            
        except Exception as e:
            logger.error(f"❌ Error extracting features: {str(e)}")
            return self._default_features()
    
    def _calculate_win_rate(self, symbol: str, lookback_days: int = 30) -> float:
        """
        Calculate win rate for a symbol in last N days
        Returns: 0.0 to 1.0
        """
        try:
            from datetime import timedelta
            cutoff_date = datetime.utcnow() - timedelta(days=lookback_days)
            
            trades = self.db.query(Trade).filter(
                Trade.symbol == symbol,
                Trade.created_at >= cutoff_date,
                Trade.status == 'closed'
            ).all()
            
            if not trades or len(trades) == 0:
                return 0.5  # Default to 50% if no history
            
            winning_trades = sum(1 for t in trades if t.profit_loss and t.profit_loss > 0)
            win_rate = winning_trades / len(trades)
            
            return min(win_rate, 1.0)
            
        except Exception as e:
            logger.warning(f"Could not calculate win rate for {symbol}: {e}")
            return 0.5
    
    def _estimate_volatility(self, symbol: str) -> float:
        """
        Estimate market volatility for symbol
        Returns: 0.0 to 1.0 (0=calm, 1=very volatile)
        """
        try:
            # In real implementation, use price data
            # For now, return based on symbol patterns
            volatility_map = {
                'EURUSD': 0.4, 'GBPUSD': 0.5, 'USDJPY': 0.6,
                'USDCAD': 0.45, 'AUDUSD': 0.55, 'NZDUSD': 0.65
            }
            return volatility_map.get(symbol, 0.5)
        except:
            return 0.5
    
    def _estimate_trend(self, symbol: str) -> float:
        """
        Estimate current trend direction
        Returns: 1.0 (UP), 0.0 (FLAT), -1.0 (DOWN)
        """
        try:
            # In real implementation, use technical indicators
            # For now, return based on recent trades
            from datetime import timedelta
            cutoff = datetime.utcnow() - timedelta(hours=4)
            
            recent_trades = self.db.query(Trade).filter(
                Trade.symbol == symbol,
                Trade.created_at >= cutoff
            ).all()
            
            if not recent_trades:
                return 0.0
            
            buys = sum(1 for t in recent_trades if t.action == 'BUY')
            sells = sum(1 for t in recent_trades if t.action == 'SELL')
            
            if buys > sells * 1.5:
                return 1.0  # Uptrend
            elif sells > buys * 1.5:
                return -1.0  # Downtrend
            else:
                return 0.0  # Flat
                
        except:
            return 0.0
    
    def _time_since_last_signal(self, symbol: str, account_id: str) -> float:
        """
        Time since last signal for this symbol
        Returns: normalized 0.0 to 1.0
        """
        try:
            from datetime import timedelta
            
            last_signal = self.db.query(Signal).filter(
                Signal.symbol == symbol,
                Signal.account_id == account_id
            ).order_by(Signal.received_at.desc()).first()
            
            if not last_signal:
                return 1.0  # First signal, max time
            
            time_diff = (datetime.utcnow() - last_signal.received_at).total_seconds()
            # Normalize: 0 seconds = 0.0, 3600+ seconds = 1.0
            normalized = min(time_diff / 3600, 1.0)
            return normalized
            
        except:
            return 0.5
    
    def _estimate_strategy_strength(self, strategy_id: str) -> float:
        """
        Estimate strategy strength based on recent performance
        Returns: 0.0 to 1.0
        """
        try:
            from datetime import timedelta
            cutoff = datetime.utcnow() - timedelta(days=7)
            
            trades = self.db.query(Trade).filter(
                Trade.created_at >= cutoff
            ).all()
            
            if not trades:
                return 0.5
            
            winning = sum(1 for t in trades if t.profit_loss and t.profit_loss > 0)
            strength = winning / len(trades) if trades else 0.5
            
            return min(strength, 1.0)
            
        except:
            return 0.5
    
    def _default_features(self) -> dict:
        """Return default features when extraction fails"""
        return {
            'hour': 12,
            'day_of_week': 0,
            'signal_type': 1,
            'symbol': 0,
            'quantity_norm': 1.0,
            'win_rate': 0.5,
            'volatility': 0.5,
            'trend': 0.0,
            'time_since_last': 0.5,
            'strategy_strength': 0.5
        }
    
    def features_to_list(self, features: dict) -> list:
        """Convert feature dict to list for ML model"""
        return [
            features['hour'],
            features['day_of_week'],
            features['signal_type'],
            features['symbol'],
            features['quantity_norm'],
            features['win_rate'],
            features['volatility'],
            features['trend'],
            features['time_since_last'],
            features['strategy_strength']
        ]
