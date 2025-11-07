"""
📋 PRE-TRADE QUESTIONNAIRE - Complete Backend Logic
Location: /backend/app/services/pretrade_questionnaire.py

Features:
✅ 25+ comprehensive pre-trade questions
✅ Setup validation engine
✅ Trade score calculation
✅ Risk assessment
✅ Go/No-Go decision logic
✅ Historical tracking & analytics
"""

from typing import Dict, List, Optional
from datetime import datetime
from enum import Enum
import json

class TradeDecision(str, Enum):
    GO = "GO"
    CAUTION = "CAUTION"
    NO_GO = "NO_GO"

class PreTradeQuestionnaire:
    """Complete pre-trade validation system"""
    
    # Questionnaire template with categories
    QUESTIONNAIRE = {
        "market_analysis": {
            "category": "Market Analysis",
            "icon": "📊",
            "questions": [
                {
                    "id": "trend",
                    "question": "Is the market in a clear trend?",
                    "type": "yes_no",
                    "weight": 10,
                    "hint": "Check 4H and daily timeframes"
                },
                {
                    "id": "support_resistance",
                    "question": "Is entry near support/resistance?",
                    "type": "yes_no",
                    "weight": 8,
                    "hint": "Entry should be at technical level"
                },
                {
                    "id": "volume_confirmation",
                    "question": "Is there volume confirmation?",
                    "type": "yes_no",
                    "weight": 7,
                    "hint": "Volume should increase on breakout"
                },
                {
                    "id": "ma_alignment",
                    "question": "Are moving averages aligned?",
                    "type": "yes_no",
                    "weight": 8,
                    "hint": "20 > 50 > 200 MA for uptrend"
                },
            ]
        },
        
        "setup_quality": {
            "category": "Setup Quality",
            "icon": "🎯",
            "questions": [
                {
                    "id": "pattern_confirmed",
                    "question": "Is pattern fully confirmed?",
                    "type": "yes_no",
                    "weight": 9,
                    "hint": "Don't jump in early"
                },
                {
                    "id": "multiple_confirmations",
                    "question": "Are there 2+ confirmations?",
                    "type": "yes_no",
                    "weight": 8,
                    "hint": "Use multiple indicators"
                },
                {
                    "id": "entry_precision",
                    "question": "Is entry point precise?",
                    "type": "yes_no",
                    "weight": 7,
                    "hint": "Entry within support/resistance zone"
                },
                {
                    "id": "setup_repeatable",
                    "question": "Is this setup in your playbook?",
                    "type": "yes_no",
                    "weight": 9,
                    "hint": "Trade only what you know"
                },
            ]
        },
        
        "risk_management": {
            "category": "Risk Management",
            "icon": "🛡️",
            "questions": [
                {
                    "id": "stop_loss_clear",
                    "question": "Is stop loss clearly defined?",
                    "type": "yes_no",
                    "weight": 10,
                    "hint": "SL should have room for wick"
                },
                {
                    "id": "risk_reward_acceptable",
                    "question": "Is R:R ratio 1:2 or better?",
                    "type": "yes_no",
                    "weight": 10,
                    "hint": "Minimum 1:2 for profitability"
                },
                {
                    "id": "position_size_correct",
                    "question": "Is position size 2% risk or less?",
                    "type": "yes_no",
                    "weight": 9,
                    "hint": "Never risk more than 2% per trade"
                },
                {
                    "id": "margin_available",
                    "question": "Is margin sufficient?",
                    "type": "yes_no",
                    "weight": 8,
                    "hint": "Keep 50%+ margin free"
                },
                {
                    "id": "portfolio_heat",
                    "question": "Is portfolio heat below 5%?",
                    "type": "yes_no",
                    "weight": 9,
                    "hint": "Total exposure should be <5%"
                },
            ]
        },
        
        "market_conditions": {
            "category": "Market Conditions",
            "icon": "🌡️",
            "questions": [
                {
                    "id": "volatility_appropriate",
                    "question": "Is volatility appropriate?",
                    "type": "yes_no",
                    "weight": 8,
                    "hint": "VIX too high = wider stops needed"
                },
                {
                    "id": "economic_events",
                    "question": "Are there no major events in 2hrs?",
                    "type": "yes_no",
                    "weight": 9,
                    "hint": "Avoid trading during news"
                },
                {
                    "id": "session_active",
                    "question": "Is this the active trading session?",
                    "type": "yes_no",
                    "weight": 7,
                    "hint": "Best liquidity in London-NY overlap"
                },
                {
                    "id": "no_market_gaps",
                    "question": "Will market be open continuously?",
                    "type": "yes_no",
                    "weight": 8,
                    "hint": "Check for weekends/holidays"
                },
            ]
        },
        
        "trader_condition": {
            "category": "Trader Condition",
            "icon": "🧠",
            "questions": [
                {
                    "id": "trader_focused",
                    "question": "Are you mentally focused?",
                    "type": "yes_no",
                    "weight": 8,
                    "hint": "No trading when distracted"
                },
                {
                    "id": "not_revenge_trading",
                    "question": "Are you NOT revenge trading?",
                    "type": "yes_no",
                    "weight": 10,
                    "hint": "Never trade to recover losses"
                },
                {
                    "id": "within_daily_limit",
                    "question": "Are you within daily loss limit?",
                    "type": "yes_no",
                    "weight": 10,
                    "hint": "Stop after -2% daily loss"
                },
                {
                    "id": "not_overtrading",
                    "question": "Are you not overtrading?",
                    "type": "yes_no",
                    "weight": 9,
                    "hint": "Max 3-5 trades per session"
                },
                {
                    "id": "confident",
                    "question": "Do you feel confident in this setup?",
                    "type": "yes_no",
                    "weight": 8,
                    "hint": "Gut feeling matters"
                },
            ]
        },
        
        "trade_plan": {
            "category": "Trade Plan",
            "icon": "📝",
            "questions": [
                {
                    "id": "plan_documented",
                    "question": "Have you documented your plan?",
                    "type": "yes_no",
                    "weight": 7,
                    "hint": "Write it down before entering"
                },
                {
                    "id": "exit_plan",
                    "question": "Do you have clear exit rules?",
                    "type": "yes_no",
                    "weight": 9,
                    "hint": "Know how to exit before entering"
                },
                {
                    "id": "profit_targets",
                    "question": "Are profit targets defined?",
                    "type": "yes_no",
                    "weight": 8,
                    "hint": "TP1, TP2, TP3 levels set"
                },
                {
                    "id": "time_target",
                    "question": "Do you have a time target?",
                    "type": "yes_no",
                    "weight": 6,
                    "hint": "Expect to close in X hours"
                },
            ]
        },
    }
    
    @staticmethod
    def evaluate_questionnaire(answers: Dict[str, bool]) -> Dict:
        """Evaluate answers and calculate trade score"""
        
        total_weight = 0
        achieved_weight = 0
        category_scores = {}
        all_questions_answered = True
        missing_categories = []
        
        # Calculate scores per category
        for category_key, category_data in PreTradeQuestionnaire.QUESTIONNAIRE.items():
            category_name = category_data["category"]
            category_weight = 0
            category_achieved = 0
            category_questions = 0
            
            for question in category_data["questions"]:
                q_id = question["id"]
                q_weight = question["weight"]
                category_questions += 1
                
                if q_id not in answers:
                    all_questions_answered = False
                    missing_categories.append(category_name)
                    continue
                
                category_weight += q_weight
                total_weight += q_weight
                
                if answers[q_id]:
                    category_achieved += q_weight
                    achieved_weight += q_weight
            
            # Calculate category percentage
            if category_weight > 0:
                category_percent = (category_achieved / category_weight) * 100
            else:
                category_percent = 0
            
            category_scores[category_name] = {
                "score": round(category_percent, 1),
                "achieved": category_achieved,
                "total": category_weight,
                "questions_answered": category_questions
            }
        
        # Calculate overall score
        if total_weight > 0:
            overall_score = (achieved_weight / total_weight) * 100
        else:
            overall_score = 0
        
        # Determine decision
        if overall_score >= 85:
            decision = TradeDecision.GO
            recommendation = "✅ EXCELLENT - High probability setup. Execute trade."
            color = "#10b981"
        elif overall_score >= 70:
            decision = TradeDecision.CAUTION
            recommendation = "⚠️ CAUTION - Good setup but review weak areas. Proceed with care."
            color = "#f59e0b"
        elif overall_score >= 50:
            decision = TradeDecision.CAUTION
            recommendation = "⚠️ CAUTION - Setup has issues. Consider passing or smaller size."
            color = "#f59e0b"
        else:
            decision = TradeDecision.NO_GO
            recommendation = "❌ NO-GO - Too many red flags. Skip this trade."
            color = "#ef4444"
        
        # Identify critical failures
        critical_failures = []
        for q_id, answer in answers.items():
            if not answer:
                for category_data in PreTradeQuestionnaire.QUESTIONNAIRE.values():
                    for q in category_data["questions"]:
                        if q["id"] == q_id and q["weight"] >= 9:
                            critical_failures.append(q["question"])
        
        # Identify weak areas (scores < 50%)
        weak_areas = [cat for cat, score in category_scores.items() if score["score"] < 50]
        
        return {
            "overall_score": round(overall_score, 1),
            "decision": decision.value,
            "recommendation": recommendation,
            "color": color,
            "category_scores": category_scores,
            "all_questions_answered": all_questions_answered,
            "missing_categories": list(set(missing_categories)),
            "critical_failures": critical_failures,
            "weak_areas": weak_areas,
            "answers_summary": {
                "total_yes": sum(1 for v in answers.values() if v),
                "total_no": sum(1 for v in answers.values() if not v),
                "total_questions": len(answers)
            },
            "tradability": {
                "ready": overall_score >= 70,
                "confidence_level": "HIGH" if overall_score >= 85 else "MEDIUM" if overall_score >= 70 else "LOW"
            }
        }
    
    @staticmethod
    def get_all_questions() -> Dict:
        """Get all questionnaire questions organized by category"""
        
        questions_list = []
        
        for category_key, category_data in PreTradeQuestionnaire.QUESTIONNAIRE.items():
            for question in category_data["questions"]:
                questions_list.append({
                    "id": question["id"],
                    "category": category_data["category"],
                    "category_icon": category_data["icon"],
                    "question": question["question"],
                    "type": question["type"],
                    "weight": question["weight"],
                    "hint": question["hint"]
                })
        
        return {
            "total_questions": len(questions_list),
            "categories": len(PreTradeQuestionnaire.QUESTIONNAIRE),
            "questions": questions_list
        }
    
    @staticmethod
    def get_quick_checklist() -> Dict:
        """Get quick 5-question checklist for fast pre-trade validation"""
        
        critical_questions = [
            {
                "id": "trend",
                "question": "Is the market in a clear trend?",
                "priority": "CRITICAL"
            },
            {
                "id": "risk_reward_acceptable",
                "question": "Is R:R ratio 1:2 or better?",
                "priority": "CRITICAL"
            },
            {
                "id": "not_revenge_trading",
                "question": "Are you NOT revenge trading?",
                "priority": "CRITICAL"
            },
            {
                "id": "economic_events",
                "question": "Are there no major events in 2hrs?",
                "priority": "CRITICAL"
            },
            {
                "id": "plan_documented",
                "question": "Have you documented your plan?",
                "priority": "IMPORTANT"
            }
        ]
        
        return {
            "type": "quick_checklist",
            "time_to_complete": "2 minutes",
            "questions": critical_questions,
            "description": "Essential questions before ANY trade"
        }
    
    @staticmethod
    def save_questionnaire_response(
        trade_id: str,
        symbol: str,
        answers: Dict,
        evaluation: Dict,
        entry_price: float = 0,
        stop_loss: float = 0,
        take_profit: float = 0
    ) -> Dict:
        """Save questionnaire response for historical tracking"""
        
        return {
            "id": trade_id,
            "timestamp": datetime.utcnow().isoformat(),
            "symbol": symbol,
            "entry_price": entry_price,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "answers": answers,
            "evaluation": evaluation,
            "decision": evaluation["decision"],
            "score": evaluation["overall_score"]
        }

# Global instance
questionnaire = PreTradeQuestionnaire()

def get_questionnaire() -> PreTradeQuestionnaire:
    """Get questionnaire instance"""
    return questionnaire