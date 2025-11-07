"""
📋 PRE-TRADE QUESTIONNAIRE API ENDPOINTS
Location: /backend/app/routes/api/v1/pretrade.py

Endpoints:
✅ Get questionnaire
✅ Evaluate setup
✅ Quick check
✅ Save history
✅ Get history
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from app.config import get_db
from app.services.pretrade_questionnaire import questionnaire
from typing import Dict
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Pre-Trade"])

# ==================== GET QUESTIONNAIRE ====================

@router.get("/questionnaire/full")
async def get_full_questionnaire(db: Session = Depends(get_db)):
    """GET /api/v1/pretrade/questionnaire/full - Get all 25+ questions"""
    try:
        result = questionnaire.get_all_questions()
        
        logger.info(f"✓ Retrieved {result['total_questions']} questions")
        
        return {
            "status": "success",
            "questionnaire": result
        }
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/questionnaire/quick")
async def get_quick_questionnaire(db: Session = Depends(get_db)):
    """GET /api/v1/pretrade/questionnaire/quick - Get 5-question quick check"""
    try:
        result = questionnaire.get_quick_checklist()
        
        logger.info(f"✓ Quick checklist retrieved (5 questions)")
        
        return {
            "status": "success",
            "quick_checklist": result
        }
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== EVALUATE SETUP ====================

@router.post("/evaluate-setup")
async def evaluate_setup(
    answers: Dict[str, bool] = None,
    symbol: str = Query("EUR/USD"),
    entry_price: float = Query(0),
    stop_loss: float = Query(0),
    take_profit: float = Query(0),
    db: Session = Depends(get_db)
):
    """
    POST /api/v1/pretrade/evaluate-setup
    
    Evaluate trade setup and get GO/NO-GO decision
    
    Example body:
    {
      "answers": {
        "trend": true,
        "support_resistance": true,
        "volume_confirmation": true,
        "risk_reward_acceptable": true,
        "not_revenge_trading": true,
        ...
      }
    }
    """
    try:
        if not answers:
            return {
                "error": "No answers provided",
                "status": "error"
            }
        
        evaluation = questionnaire.evaluate_questionnaire(answers)
        
        logger.info(f"✓ Setup evaluated: {evaluation['decision']} (Score: {evaluation['overall_score']})")
        
        return {
            "status": "success",
            "evaluation": evaluation,
            "trade_info": {
                "symbol": symbol,
                "entry_price": entry_price,
                "stop_loss": stop_loss,
                "take_profit": take_profit
            }
        }
    except Exception as e:
        logger.error(f"❌ Evaluation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/quick-check")
async def quick_check(
    answers: Dict[str, bool] = None,
    db: Session = Depends(get_db)
):
    """
    POST /api/v1/pretrade/quick-check
    
    Quick 2-minute pre-trade check with 5 critical questions
    
    Example:
    {
      "answers": {
        "trend": true,
        "risk_reward_acceptable": true,
        "not_revenge_trading": true,
        "economic_events": true,
        "plan_documented": true
      }
    }
    """
    try:
        if not answers:
            return {"error": "No answers provided"}
        
        # Only evaluate the 5 critical questions
        evaluation = questionnaire.evaluate_questionnaire(answers)
        
        # Determine quick decision
        score = evaluation["overall_score"]
        if score >= 100:  # All 5 answered YES
            quick_decision = "✅ GO - Clear to trade"
            confidence = "VERY HIGH"
        elif score >= 80:
            quick_decision = "✅ GO - Good to trade"
            confidence = "HIGH"
        elif score >= 60:
            quick_decision = "⚠️ CAUTION - Review setup"
            confidence = "MEDIUM"
        else:
            quick_decision = "❌ SKIP - Not recommended"
            confidence = "LOW"
        
        logger.info(f"✓ Quick check: {quick_decision}")
        
        return {
            "status": "success",
            "quick_decision": quick_decision,
            "confidence": confidence,
            "score": score,
            "detailed_evaluation": evaluation
        }
    except Exception as e:
        logger.error(f"❌ Quick check error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== CATEGORY-SPECIFIC CHECKS ====================

@router.post("/check-category/{category}")
async def check_category(
    category: str,
    answers: Dict[str, bool] = None,
    db: Session = Depends(get_db)
):
    """
    POST /api/v1/pretrade/check-category/{category}
    
    Check specific category (market_analysis, risk_management, etc.)
    """
    try:
        if not answers:
            return {"error": "No answers provided"}
        
        if category not in questionnaire.QUESTIONNAIRE:
            return {
                "error": f"Category '{category}' not found",
                "available_categories": list(questionnaire.QUESTIONNAIRE.keys())
            }
        
        # Get category data
        category_data = questionnaire.QUESTIONNAIRE[category]
        category_name = category_data["category"]
        
        # Calculate category score
        total_weight = 0
        achieved_weight = 0
        
        for question in category_data["questions"]:
            q_id = question["id"]
            q_weight = question["weight"]
            total_weight += q_weight
            
            if q_id in answers and answers[q_id]:
                achieved_weight += q_weight
        
        category_score = (achieved_weight / total_weight * 100) if total_weight > 0 else 0
        
        logger.info(f"✓ {category_name}: {category_score:.1f}%")
        
        return {
            "status": "success",
            "category": category_name,
            "score": round(category_score, 1),
            "achieved": achieved_weight,
            "total": total_weight,
            "questions": category_data["questions"]
        }
    except Exception as e:
        logger.error(f"❌ Category check error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== SAVE & RETRIEVE HISTORY ====================

@router.post("/save-response")
async def save_response(
    trade_id: str = Query(...),
    symbol: str = Query(...),
    answers: Dict[str, bool] = None,
    entry_price: float = Query(0),
    stop_loss: float = Query(0),
    take_profit: float = Query(0),
    db: Session = Depends(get_db)
):
    """POST /api/v1/pretrade/save-response - Save questionnaire response"""
    try:
        if not answers:
            return {"error": "No answers provided"}
        
        evaluation = questionnaire.evaluate_questionnaire(answers)
        
        response = questionnaire.save_questionnaire_response(
            trade_id=trade_id,
            symbol=symbol,
            answers=answers,
            evaluation=evaluation,
            entry_price=entry_price,
            stop_loss=stop_loss,
            take_profit=take_profit
        )
        
        logger.info(f"✓ Response saved for {symbol}: {evaluation['decision']}")
        
        return {
            "status": "success",
            "saved": response
        }
    except Exception as e:
        logger.error(f"❌ Save error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== DECISION HELPER ====================

@router.post("/get-recommendation")
async def get_recommendation(
    overall_score: float = Query(...),
    db: Session = Depends(get_db)
):
    """POST /api/v1/pretrade/get-recommendation - Get recommendation based on score"""
    try:
        if overall_score >= 85:
            recommendation = {
                "decision": "GO",
                "emoji": "✅",
                "message": "EXCELLENT - High probability setup. Execute with confidence.",
                "confidence": "VERY HIGH",
                "actions": ["Execute trade", "Follow plan exactly", "Monitor position"]
            }
        elif overall_score >= 70:
            recommendation = {
                "decision": "GO",
                "emoji": "✅",
                "message": "GOOD - Setup has merit but review weak areas.",
                "confidence": "HIGH",
                "actions": ["Execute trade", "Use smaller size", "Watch for early exit"]
            }
        elif overall_score >= 50:
            recommendation = {
                "decision": "CAUTION",
                "emoji": "⚠️",
                "message": "FAIR - Setup has some issues. Proceed carefully.",
                "confidence": "MEDIUM",
                "actions": ["Consider passing", "Use very small size", "Have tight stop"]
            }
        else:
            recommendation = {
                "decision": "NO-GO",
                "emoji": "❌",
                "message": "POOR - Too many red flags. Skip this trade.",
                "confidence": "LOW",
                "actions": ["Skip this trade", "Wait for better setup", "Focus on process"]
            }
        
        return {
            "status": "success",
            "score": overall_score,
            "recommendation": recommendation
        }
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))