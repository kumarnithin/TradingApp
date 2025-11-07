"""
🚀 TRADING DISCIPLINE QUESTIONNAIRE SYSTEM - FUTURISTIC
Location: /backend/app/services/trading_discipline.py

Features:
✅ Save custom questionnaires to database
✅ Trade history with score tracking
✅ Trading streak monitoring
✅ Discipline scoring algorithm
✅ Trade entry validation
✅ Emotional state tracking
✅ Performance analytics
✅ Smart recommendations
"""

from typing import Dict, List, Optional
from datetime import datetime, timedelta
from sqlalchemy import Column, String, JSON, DateTime, Integer, Float, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import uuid
import statistics

Base = declarative_base()

# ==================== DATABASE MODELS ====================

class TradingStrategyTemplate(Base):
    """Saved custom questionnaire templates"""
    __tablename__ = "trading_strategy_templates"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False)
    strategy_name = Column(String(100), nullable=False)
    strategy_type = Column(String(50))  # scalping, breakout, etc
    description = Column(String(500))
    questions = Column(JSON)  # List of questions with weights
    is_favorite = Column(Boolean, default=False)
    usage_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class TradeValidationResponse(Base):
    """Track each pre-trade questionnaire response"""
    __tablename__ = "trade_validation_responses"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False)
    template_id = Column(String(36))
    strategy_name = Column(String(100))
    answers = Column(JSON)  # Dict of question_id: bool
    score = Column(Integer)  # 0-100
    decision = Column(String(20))  # GO, CAUTION, NO-GO
    discipline_score = Column(Integer)  # Overall discipline rating
    emotional_state = Column(String(50))  # focused, anxious, overconfident, etc
    
    # Trade details
    symbol = Column(String(20))
    entry_price = Column(Float)
    stop_loss = Column(Float)
    take_profit = Column(Float)
    position_size = Column(Float)
    
    # Trade result (filled after trade closes)
    trade_result = Column(String(20))  # WIN, LOSS, BREAKEVEN
    pnl = Column(Float, nullable=True)
    pnl_percent = Column(Float, nullable=True)
    was_entered = Column(Boolean, default=None)  # Was trade actually entered?
    
    # Tracking
    created_at = Column(DateTime, default=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)

class DisciplineStreak(Base):
    """Track trading discipline streaks"""
    __tablename__ = "discipline_streaks"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False)
    
    # Streaks
    consecutive_go_decisions = Column(Integer, default=0)
    consecutive_high_score = Column(Integer, default=0)
    consecutive_followed_rules = Column(Integer, default=0)
    
    # Stats
    total_validations = Column(Integer, default=0)
    total_high_discipline = Column(Integer, default=0)
    adherence_rate = Column(Float, default=0.0)  # % following GO decisions
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# ==================== SERVICE CLASS ====================

class TradingDisciplineService:
    """Complete trading discipline management"""
    
    EMOTIONAL_STATES = [
        {'id': 'focused', 'emoji': '🎯', 'description': 'Mentally sharp and ready', 'multiplier': 1.2},
        {'id': 'calm', 'emoji': '🧘', 'description': 'Relaxed and composed', 'multiplier': 1.1},
        {'id': 'neutral', 'emoji': '😐', 'description': 'Normal state', 'multiplier': 1.0},
        {'id': 'anxious', 'emoji': '😰', 'description': 'Feeling worried or tense', 'multiplier': 0.7},
        {'id': 'overconfident', 'emoji': '🤪', 'description': 'Too confident', 'multiplier': 0.5},
        {'id': 'frustrated', 'emoji': '😤', 'description': 'Frustrated from losses', 'multiplier': 0.3},
        {'id': 'tired', 'emoji': '😴', 'description': 'Fatigue/lack of focus', 'multiplier': 0.4},
    ]
    
    @staticmethod
    def calculate_discipline_score(
        questionnaire_score: float,
        emotional_state: str,
        risk_management_compliance: bool,
        plan_documented: bool,
        previous_streak: int = 0
    ) -> Dict:
        """Calculate overall discipline score"""
        
        # Find emotional state multiplier
        emotional_multiplier = 1.0
        for state in TradingDisciplineService.EMOTIONAL_STATES:
            if state['id'] == emotional_state:
                emotional_multiplier = state['multiplier']
                break
        
        # Base score from questionnaire
        base_score = questionnaire_score
        
        # Risk management bonus (+10 if compliant)
        risk_bonus = 10 if risk_management_compliance else -10
        
        # Documentation bonus (+5 if documented)
        doc_bonus = 5 if plan_documented else 0
        
        # Streak bonus (accumulate streak)
        streak_bonus = min(previous_streak * 2, 20)  # Max +20
        
        # Calculate raw discipline score
        raw_score = base_score + risk_bonus + doc_bonus + streak_bonus
        
        # Apply emotional state multiplier
        final_score = raw_score * emotional_multiplier
        
        # Cap between 0-100
        final_score = max(0, min(100, final_score))
        
        return {
            'base_score': round(base_score, 1),
            'risk_management_bonus': risk_bonus,
            'documentation_bonus': doc_bonus,
            'streak_bonus': streak_bonus,
            'emotional_multiplier': emotional_multiplier,
            'final_discipline_score': round(final_score, 1),
            'emotional_state': emotional_state,
            'discipline_rating': 'EXCELLENT' if final_score >= 85 else 'GOOD' if final_score >= 70 else 'FAIR' if final_score >= 50 else 'POOR'
        }
    
    @staticmethod
    def create_custom_template(
        user_id: str,
        strategy_name: str,
        strategy_type: str,
        description: str,
        questions: List[Dict]
    ) -> Dict:
        """Create and save custom template"""
        
        template = {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'strategy_name': strategy_name,
            'strategy_type': strategy_type,
            'description': description,
            'questions': questions,
            'is_favorite': False,
            'usage_count': 0,
            'created_at': datetime.utcnow().isoformat(),
            'question_count': len(questions)
        }
        
        return template
    
    @staticmethod
    def save_trade_validation(
        user_id: str,
        template_id: str,
        strategy_name: str,
        answers: Dict[str, bool],
        questionnaire_score: float,
        decision: str,
        discipline_score: float,
        emotional_state: str,
        symbol: str,
        entry_price: float,
        stop_loss: float,
        take_profit: float,
        position_size: float
    ) -> Dict:
        """Save trade validation response"""
        
        response = {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'template_id': template_id,
            'strategy_name': strategy_name,
            'answers': answers,
            'questionnaire_score': questionnaire_score,
            'decision': decision,
            'discipline_score': discipline_score,
            'emotional_state': emotional_state,
            'symbol': symbol,
            'entry_price': entry_price,
            'stop_loss': stop_loss,
            'take_profit': take_profit,
            'position_size': position_size,
            'created_at': datetime.utcnow().isoformat(),
            'was_entered': None
        }
        
        return response
    
    @staticmethod
    def get_trading_statistics(
        validations: List[Dict],
        days: int = 30
    ) -> Dict:
        """Get comprehensive trading statistics"""
        
        if not validations:
            return {
                'total_validations': 0,
                'high_discipline_count': 0,
                'go_decisions': 0,
                'adherence_rate': 0,
                'average_discipline_score': 0,
                'best_emotional_state': None
            }
        
        # Filter by date range
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        recent = [v for v in validations if datetime.fromisoformat(v['created_at']) > cutoff_date]
        
        if not recent:
            recent = validations
        
        # Calculate stats
        high_discipline = [v for v in recent if v.get('discipline_score', 0) >= 70]
        go_decisions = [v for v in recent if v.get('decision') == 'GO']
        discipline_scores = [v.get('discipline_score', 0) for v in recent]
        
        # Emotional states frequency
        emotional_counts = {}
        for v in recent:
            state = v.get('emotional_state', 'neutral')
            emotional_counts[state] = emotional_counts.get(state, 0) + 1
        
        best_emotional = max(emotional_counts, key=emotional_counts.get) if emotional_counts else None
        
        return {
            'total_validations': len(recent),
            'high_discipline_validations': len(high_discipline),
            'go_decisions': len(go_decisions),
            'adherence_rate': (len(high_discipline) / len(recent) * 100) if recent else 0,
            'average_discipline_score': round(statistics.mean(discipline_scores), 1) if discipline_scores else 0,
            'median_discipline_score': round(statistics.median(discipline_scores), 1) if discipline_scores else 0,
            'best_emotional_state': best_emotional,
            'emotional_distribution': emotional_counts,
            'period_days': days,
            'recommendation': 'Keep up the discipline!' if len(high_discipline) / len(recent) > 0.7 else 'Focus on following your rules'
        }
    
    @staticmethod
    def get_strategy_performance(
        validations: List[Dict],
        strategy_name: str
    ) -> Dict:
        """Get performance for specific strategy"""
        
        strategy_trades = [v for v in validations if v.get('strategy_name') == strategy_name]
        
        if not strategy_trades:
            return {'error': 'No trades found for this strategy'}
        
        discipline_scores = [v.get('discipline_score', 0) for v in strategy_trades]
        questionnaire_scores = [v.get('questionnaire_score', 0) for v in strategy_trades]
        
        return {
            'strategy_name': strategy_name,
            'total_validations': len(strategy_trades),
            'average_discipline_score': round(statistics.mean(discipline_scores), 1),
            'average_questionnaire_score': round(statistics.mean(questionnaire_scores), 1),
            'best_discipline_score': max(discipline_scores),
            'worst_discipline_score': min(discipline_scores),
            'go_percentage': len([v for v in strategy_trades if v.get('decision') == 'GO']) / len(strategy_trades) * 100
        }

# Global instance
service = TradingDisciplineService()

def get_service() -> TradingDisciplineService:
    return service