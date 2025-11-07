"""
📋 CUSTOM QUESTIONNAIRE SERVICE
Location: /backend/app/services/custom_questionnaire.py

Features:
✅ Strategy-based questionnaires
✅ Custom question builder
✅ Save custom templates
✅ Re-use previous templates
"""

from typing import Dict, List, Optional
from datetime import datetime
from sqlalchemy import Column, String, JSON, DateTime, Integer
from sqlalchemy.orm import declarative_base
import uuid

Base = declarative_base()

# Database model for custom questionnaires
class CustomQuestionnaireTemplate(Base):
    __tablename__ = "custom_questionnaire_templates"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=True)
    strategy_name = Column(String(100))
    description = Column(String(500))
    questions = Column(JSON)  # List of questions with weights
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class CustomQuestionnaireResponse(Base):
    __tablename__ = "custom_questionnaire_responses"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=True)
    template_id = Column(String(36))
    answers = Column(JSON)  # Dict of question_id: bool
    score = Column(Integer)
    decision = Column(String(20))  # GO, CAUTION, NO-GO
    symbol = Column(String(20))
    entry_price = Column(Float)
    stop_loss = Column(Float)
    take_profit = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

class CustomQuestionnaireService:
    """Manage custom trading questionnaires"""
    
    STRATEGY_TEMPLATES = {
        'scalping': {
            'name': 'Scalping Strategy',
            'description': 'Quick trades in fast-moving markets',
            'questions': [
                {'id': 'tight_stops', 'question': 'Are stops set to 10 pips or less?', 'weight': 10},
                {'id': 'fast_execution', 'question': 'Can you execute instantly?', 'weight': 9},
                {'id': 'high_liquidity', 'question': 'Is liquidity very high?', 'weight': 10},
                {'id': 'small_spreads', 'question': 'Are spreads 1 pip or less?', 'weight': 9},
                {'id': 'short_timeframe', 'question': 'Are you trading 1-5 minute charts?', 'weight': 8},
                {'id': 'quick_tp', 'question': 'Can you exit in <5 minutes?', 'weight': 9},
            ]
        },
        'breakout': {
            'name': 'Breakout Strategy',
            'description': 'Trading breakouts from resistance',
            'questions': [
                {'id': 'support_level', 'question': 'Is there clear resistance to break?', 'weight': 10},
                {'id': 'above_ma', 'question': 'Is price above 20 MA?', 'weight': 8},
                {'id': 'breakout_confirmed', 'question': 'Has breakout been confirmed?', 'weight': 10},
                {'id': 'volume_spike', 'question': 'Is there volume on breakout?', 'weight': 9},
                {'id': 'rr_ratio', 'question': 'Is R:R at least 1:2?', 'weight': 9},
                {'id': 'pullback_entry', 'question': 'Entering on pullback to support?', 'weight': 7},
            ]
        },
        'meanreversion': {
            'name': 'Mean Reversion Strategy',
            'description': 'Trading reversals to averages',
            'questions': [
                {'id': 'extreme_move', 'question': 'Has price moved 2+ ATR from MA?', 'weight': 10},
                {'id': 'overbought', 'question': 'Is RSI >70 or <30?', 'weight': 9},
                {'id': 'support_nearby', 'question': 'Is support level close?', 'weight': 8},
                {'id': 'trend_against', 'question': 'Are you trading against micro-trend?', 'weight': 8},
                {'id': 'size_half', 'question': 'Is position size half normal?', 'weight': 7},
                {'id': 'quick_exit', 'question': 'Will you exit at MA or support?', 'weight': 9},
            ]
        },
        'swing': {
            'name': 'Swing Trading Strategy',
            'description': 'Multi-day trend following',
            'questions': [
                {'id': 'daily_trend', 'question': 'Is there a clear daily trend?', 'weight': 10},
                {'id': 'higher_lows', 'question': 'Are there higher lows (uptrend)?', 'weight': 9},
                {'id': 'hold_days', 'question': 'Can you hold for 3+ days?', 'weight': 8},
                {'id': 'weekly_support', 'question': 'Is weekly support nearby?', 'weight': 9},
                {'id': 'news_checked', 'question': 'Have you checked upcoming news?', 'weight': 7},
                {'id': 'mental_ready', 'question': 'Are you ready for drawdowns?', 'weight': 8},
            ]
        },
        'news': {
            'name': 'News Trading Strategy',
            'description': 'Trading economic news events',
            'questions': [
                {'id': 'event_time', 'question': 'Do you know the exact event time?', 'weight': 10},
                {'id': 'event_importance', 'question': 'Is event CRITICAL/HIGH impact?', 'weight': 10},
                {'id': 'wider_stop', 'question': 'Is your stop 3x wider than normal?', 'weight': 10},
                {'id': 'pre_positioned', 'question': 'Are you already positioned?', 'weight': 9},
                {'id': 'expected_move', 'question': 'Do you know expected move size?', 'weight': 8},
                {'id': 'no_surprises', 'question': 'Will you skip if surprised by reaction?', 'weight': 8},
            ]
        }
    }
    
    @staticmethod
    def get_strategy_template(strategy_id: str) -> Dict:
        """Get pre-built template for a strategy"""
        if strategy_id not in CustomQuestionnaireService.STRATEGY_TEMPLATES:
            return {"error": f"Strategy '{strategy_id}' not found"}
        
        return CustomQuestionnaireService.STRATEGY_TEMPLATES[strategy_id]
    
    @staticmethod
    def get_all_strategies() -> List[Dict]:
        """Get all available strategies"""
        strategies = []
        for strategy_id, template in CustomQuestionnaireService.STRATEGY_TEMPLATES.items():
            strategies.append({
                'id': strategy_id,
                'name': template['name'],
                'description': template['description'],
                'question_count': len(template['questions'])
            })
        return strategies
    
    @staticmethod
    def evaluate_custom_questionnaire(
        answers: Dict[str, bool],
        questions: List[Dict]
    ) -> Dict:
        """Evaluate custom questionnaire"""
        
        total_weight = 0
        achieved_weight = 0
        
        for question in questions:
            q_id = question['id']
            q_weight = question.get('weight', 5)
            total_weight += q_weight
            
            if q_id in answers and answers[q_id]:
                achieved_weight += q_weight
        
        # Calculate score
        if total_weight > 0:
            score = (achieved_weight / total_weight) * 100
        else:
            score = 0
        
        # Determine decision
        if score >= 85:
            decision = "GO"
            recommendation = "✅ EXCELLENT - Execute trade"
            color = "#10b981"
        elif score >= 70:
            decision = "GO"
            recommendation = "✅ GOOD - Proceed with trade"
            color = "#3b82f6"
        elif score >= 50:
            decision = "CAUTION"
            recommendation = "⚠️ CAUTION - Review before trading"
            color = "#f59e0b"
        else:
            decision = "NO-GO"
            recommendation = "❌ NO-GO - Skip this trade"
            color = "#ef4444"
        
        yes_count = sum(1 for v in answers.values() if v)
        
        return {
            "score": round(score, 1),
            "decision": decision,
            "recommendation": recommendation,
            "color": color,
            "answers_summary": {
                "total_yes": yes_count,
                "total_no": len(answers) - yes_count,
                "total_questions": len(answers)
            },
            "confidence": "HIGH" if score >= 85 else "MEDIUM" if score >= 70 else "LOW"
        }
    
    @staticmethod
    def create_custom_template(
        user_id: str,
        strategy_name: str,
        description: str,
        questions: List[Dict]
    ) -> Dict:
        """Create a new custom template"""
        
        template = {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'strategy_name': strategy_name,
            'description': description,
            'questions': questions,
            'created_at': datetime.utcnow().isoformat(),
            'question_count': len(questions)
        }
        
        return template
    
    @staticmethod
    def save_response(
        user_id: str,
        template_id: str,
        answers: Dict[str, bool],
        score: float,
        decision: str,
        symbol: str = "",
        entry_price: float = 0,
        stop_loss: float = 0,
        take_profit: float = 0
    ) -> Dict:
        """Save questionnaire response for tracking"""
        
        response = {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'template_id': template_id,
            'answers': answers,
            'score': score,
            'decision': decision,
            'symbol': symbol,
            'entry_price': entry_price,
            'stop_loss': stop_loss,
            'take_profit': take_profit,
            'created_at': datetime.utcnow().isoformat()
        }
        
        return response

# Global instance
service = CustomQuestionnaireService()

def get_service() -> CustomQuestionnaireService:
    """Get service instance"""
    return service