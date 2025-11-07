
"""
🚀 TRADING DISCIPLINE SERVICE & API - CIRCULAR IMPORT FIX
Location: /backend/app/routes/api/v1/trading_discipline.py

✅ FIXED: NO app.include_router() in this file (only in main.py)
✅ FIXED: Circular import issue resolved
✅ Clean router definition
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from app.database import SessionLocal
from app.models import TradingTemplate, TradeValidation
from typing import Dict, List, Optional
import logging
import json
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Create router ONLY (do NOT include it here!)
router = APIRouter()

# ==================== DEPENDENCY ====================

def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==================== SERVICE CLASS ====================

class TradingDisciplineService:
    """Service for trading discipline with database persistence"""
    
    EMOTIONAL_STATES = [
        {"id": "focused", "emoji": "🎯", "weight": 1.2},
        {"id": "calm", "emoji": "🧘", "weight": 1.1},
        {"id": "neutral", "emoji": "😐", "weight": 1.0},
        {"id": "anxious", "emoji": "😰", "weight": 0.8},
        {"id": "overconfident", "emoji": "😎", "weight": 0.7},
        {"id": "frustrated", "emoji": "😤", "weight": 0.6},
        {"id": "tired", "emoji": "😴", "weight": 0.5}
    ]
    
    @staticmethod
    def create_template(db: Session, user_id: str, strategy_name: str, 
                       strategy_type: str, description: str, questions: List[Dict]) -> Dict:
        """Create and save a new template"""
        try:
            template = TradingTemplate(
                user_id=user_id,
                strategy_name=strategy_name,
                strategy_type=strategy_type,
                description=description,
                questions=questions,
                is_favorite=False,
                usage_count=0
            )
            
            db.add(template)
            db.commit()
            db.refresh(template)
            
            logger.info(f"✓ Template created: {strategy_name} ({template.id})")
            return template.to_dict()
        except Exception as e:
            db.rollback()
            logger.error(f"❌ Error creating template: {str(e)}")
            raise
    
    @staticmethod
    def get_user_templates(db: Session, user_id: str) -> List[Dict]:
        """Get all templates for a user"""
        try:
            templates = db.query(TradingTemplate).filter(
                TradingTemplate.user_id == user_id
            ).order_by(desc(TradingTemplate.created_at)).all()
            
            logger.info(f"✓ Retrieved {len(templates)} templates for user {user_id}")
            return [t.to_dict() for t in templates]
        except Exception as e:
            logger.error(f"❌ Error: {str(e)}")
            raise
    
    @staticmethod
    def get_template_by_id(db: Session, template_id: str) -> Optional[Dict]:
        """Get template by ID"""
        try:
            template = db.query(TradingTemplate).filter(
                TradingTemplate.id == template_id
            ).first()
            return template.to_dict() if template else None
        except Exception as e:
            logger.error(f"❌ Error: {str(e)}")
            raise
    
    @staticmethod
    def delete_template(db: Session, template_id: str) -> bool:
        """Delete a template"""
        try:
            template = db.query(TradingTemplate).filter(
                TradingTemplate.id == template_id
            ).first()
            
            if not template:
                return False
            
            db.delete(template)
            db.commit()
            
            logger.info(f"✓ Template deleted: {template_id}")
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"❌ Error: {str(e)}")
            raise
    
    @staticmethod
    def toggle_favorite(db: Session, template_id: str, is_favorite: bool) -> bool:
        """Toggle favorite status"""
        try:
            template = db.query(TradingTemplate).filter(
                TradingTemplate.id == template_id
            ).first()
            
            if not template:
                return False
            
            template.is_favorite = is_favorite
            db.commit()
            
            logger.info(f"✓ Template {template_id} {'favorited' if is_favorite else 'unfavorited'}")
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"❌ Error: {str(e)}")
            raise
    
    @staticmethod
    def calculate_discipline_score(questionnaire_score: float, emotional_state: str,
                                   risk_compliant: bool = True, plan_documented: bool = True,
                                   streak: int = 0) -> Dict:
        """Calculate discipline score"""
        try:
            base_score = questionnaire_score
            
            # Emotional state multiplier
            emotional_weight = 1.0
            for state in TradingDisciplineService.EMOTIONAL_STATES:
                if state["id"] == emotional_state:
                    emotional_weight = state["weight"]
                    break
            
            # Bonuses
            risk_bonus = 5.0 if risk_compliant else -10.0
            plan_bonus = 5.0 if plan_documented else -5.0
            streak_bonus = min(streak * 2, 10.0)
            
            # Calculate final score
            final_score = (base_score * emotional_weight) + risk_bonus + plan_bonus + streak_bonus
            final_score = max(0, min(100, final_score))
            
            return {
                "questionnaire_score": questionnaire_score,
                "emotional_state": emotional_state,
                "emotional_weight": emotional_weight,
                "risk_bonus": risk_bonus,
                "plan_bonus": plan_bonus,
                "streak_bonus": streak_bonus,
                "final_discipline_score": round(final_score, 2)
            }
        except Exception as e:
            logger.error(f"❌ Error calculating discipline score: {str(e)}")
            raise
    
    @staticmethod
    def save_validation(db: Session, user_id: str, template_id: str, strategy_name: str,
                       answers: Dict, questionnaire_score: float, decision: str,
                       discipline_score: float, emotional_state: str, symbol: str = "",
                       entry_price: float = 0, stop_loss: float = 0, take_profit: float = 0,
                       position_size: float = 0) -> Dict:
        """Save a trade validation"""
        try:
            validation = TradeValidation(
                user_id=user_id,
                template_id=template_id,
                strategy_name=strategy_name,
                answers=answers,
                questionnaire_score=questionnaire_score,
                decision=decision,
                discipline_score=discipline_score,
                emotional_state=emotional_state,
                symbol=symbol,
                entry_price=entry_price,
                stop_loss=stop_loss,
                take_profit=take_profit,
                position_size=position_size
            )
            
            db.add(validation)
            
            # Increment template usage
            if template_id:
                template = db.query(TradingTemplate).filter(
                    TradingTemplate.id == template_id
                ).first()
                if template:
                    template.usage_count += 1
            
            db.commit()
            db.refresh(validation)
            
            logger.info(f"✓ Validation saved: {strategy_name}")
            return validation.to_dict()
        except Exception as e:
            db.rollback()
            logger.error(f"❌ Error saving validation: {str(e)}")
            raise
    
    @staticmethod
    def get_strategy_performance(db: Session, user_id: str, strategy_name: str, days: int = 30) -> Dict:
        """Get performance metrics for a specific strategy"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            validations = db.query(TradeValidation).filter(
                and_(
                    TradeValidation.user_id == user_id,
                    TradeValidation.strategy_name == strategy_name,
                    TradeValidation.created_at >= cutoff_date
                )
            ).all()
            
            validations_list = [v.to_dict() for v in validations]
            total = len(validations_list)
            
            if total == 0:
                return {
                    "strategy_name": strategy_name,
                    "total_validations": 0,
                    "go_decisions": 0,
                    "wins": 0,
                    "losses": 0,
                    "skipped": 0,
                    "overall_win_rate": 0,
                    "go_win_rate": 0,
                    "average_discipline_score": 0,
                    "average_questionnaire_score": 0,
                    "best_discipline_score": 0,
                    "worst_discipline_score": 0,
                    "recommendation": "Start using this template to see analytics",
                    "emotional_performance": {},
                    "recent_trades": []
                }
            
            go_decisions = len([v for v in validations_list if v["decision"] == "GO"])
            wins = len([v for v in validations_list if v.get("result") == "WIN"])
            losses = len([v for v in validations_list if v.get("result") == "LOSS"])
            skipped = len([v for v in validations_list if v.get("result") == "SKIPPED"])
            
            discipline_scores = [v["discipline_score"] for v in validations_list]
            questionnaire_scores = [v["questionnaire_score"] for v in validations_list]
            
            emotional_performance = {}
            for v in validations_list:
                state = v["emotional_state"]
                if state not in emotional_performance:
                    emotional_performance[state] = {"count": 0, "wins": 0, "score": 0}
                emotional_performance[state]["count"] += 1
                if v.get("result") == "WIN":
                    emotional_performance[state]["wins"] += 1
                emotional_performance[state]["score"] += v["discipline_score"]
            
            for state in emotional_performance:
                count = emotional_performance[state]["count"]
                emotional_performance[state]["avg_score"] = round(emotional_performance[state]["score"] / count, 1)
                emotional_performance[state]["win_rate"] = round((emotional_performance[state]["wins"] / count) * 100, 1)
            
            best_emotional = max(emotional_performance, key=lambda x: emotional_performance[x]["win_rate"]) if emotional_performance else "N/A"
            
            overall_win_rate = round((wins / total) * 100, 1) if total > 0 else 0
            go_win_rate = round((wins / go_decisions) * 100, 1) if go_decisions > 0 else 0
            
            sorted_validations = sorted(validations_list, key=lambda x: x["created_at"], reverse=True)
            recent_trades = [
                {
                    "date": v["created_at"],
                    "symbol": v.get("symbol", "N/A"),
                    "decision": v["decision"],
                    "emotional_state": v["emotional_state"],
                    "discipline_score": v["discipline_score"],
                    "result": v.get("result", "PENDING")
                }
                for v in sorted_validations[:10]
            ]
            
            recommendation = (
                f"Trade this template when {best_emotional} - your win rate is highest ({emotional_performance[best_emotional]['win_rate']}%)!"
                if best_emotional != "N/A"
                else "Collect more data for better recommendations"
            )
            
            return {
                "strategy_name": strategy_name,
                "period": f"Last {days} days",
                "total_validations": total,
                "go_decisions": go_decisions,
                "wins": wins,
                "losses": losses,
                "skipped": skipped,
                "overall_win_rate": overall_win_rate,
                "go_win_rate": go_win_rate,
                "average_discipline_score": round(sum(discipline_scores) / len(discipline_scores), 1) if discipline_scores else 0,
                "average_questionnaire_score": round(sum(questionnaire_scores) / len(questionnaire_scores), 1) if questionnaire_scores else 0,
                "best_discipline_score": max(discipline_scores) if discipline_scores else 0,
                "worst_discipline_score": min(discipline_scores) if discipline_scores else 0,
                "best_emotional_state": best_emotional,
                "emotional_performance": {
                    state: {
                        "count": data["count"],
                        "wins": data["wins"],
                        "win_rate": data["win_rate"],
                        "avg_score": data["avg_score"]
                    }
                    for state, data in emotional_performance.items()
                },
                "recommendation": recommendation,
                "recent_trades": recent_trades
            }
        except Exception as e:
            logger.error(f"❌ Error: {str(e)}")
            raise
    
    @staticmethod
    def get_overall_statistics(db: Session, user_id: str, days: int = 30) -> Dict:
        """Get overall trading statistics"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            validations = db.query(TradeValidation).filter(
                and_(
                    TradeValidation.user_id == user_id,
                    TradeValidation.created_at >= cutoff_date
                )
            ).all()
            
            validations_list = [v.to_dict() for v in validations]
            total = len(validations_list)
            
            if total == 0:
                return {
                    "total_validations": 0,
                    "go_decisions": 0,
                    "high_discipline_validations": 0,
                    "adherence_rate": 0,
                    "average_discipline_score": 0,
                    "median_discipline_score": 0,
                    "best_emotional_state": "focused",
                    "emotional_distribution": {},
                    "recommendation": "Start validating trades to see statistics"
                }
            
            go_decisions = len([v for v in validations_list if v["decision"] == "GO"])
            high_discipline = len([v for v in validations_list if v["discipline_score"] >= 80])
            
            discipline_scores = [v["discipline_score"] for v in validations_list]
            discipline_scores_sorted = sorted(discipline_scores)
            
            emotional_distribution = {}
            for v in validations_list:
                state = v["emotional_state"]
                emotional_distribution[state] = emotional_distribution.get(state, 0) + 1
            
            best_emotional = max(emotional_distribution, key=emotional_distribution.get) if emotional_distribution else "focused"
            
            median_score = discipline_scores_sorted[len(discipline_scores_sorted) // 2] if discipline_scores_sorted else 0
            
            go_taken = len([v for v in validations_list if v["decision"] == "GO" and v.get("result") in ["WIN", "LOSS"]])
            adherence_rate = round((go_taken / go_decisions) * 100, 1) if go_decisions > 0 else 0
            
            return {
                "total_validations": total,
                "go_decisions": go_decisions,
                "high_discipline_validations": high_discipline,
                "adherence_rate": adherence_rate,
                "average_discipline_score": round(sum(discipline_scores) / len(discipline_scores), 1) if discipline_scores else 0,
                "median_discipline_score": round(median_score, 1),
                "best_emotional_state": best_emotional,
                "emotional_distribution": emotional_distribution,
                "recommendation": f"You perform best when {best_emotional}. Trade more in that state!"
            }
        except Exception as e:
            logger.error(f"❌ Error: {str(e)}")
            raise

# ==================== API ROUTES ====================
# IMPORTANT: These routes are included in main.py, NOT here!

@router.post("/templates/save")
async def save_template(
    user_id: str = Query(...),
    strategy_name: str = Query(...),
    strategy_type: str = Query(...),
    description: str = Query(""),
    questions: str = Query("[]"),
    db: Session = Depends(get_db)
):
    """POST /templates/save - Save custom questionnaire template"""
    try:
        try:
            questions_list = json.loads(questions) if isinstance(questions, str) else questions
        except:
            questions_list = []
        
        if not questions_list:
            raise HTTPException(status_code=400, detail="No questions provided")
        
        template = TradingDisciplineService.create_template(
            db, user_id, strategy_name, strategy_type, description, questions_list
        )
        
        logger.info(f"✓ Template saved: {strategy_name}")
        
        return {
            "status": "success",
            "template": template
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/templates/list")
async def list_templates(
    user_id: str = Query(...),
    db: Session = Depends(get_db)
):
    """GET /templates/list - Get user's saved templates"""
    try:
        templates = TradingDisciplineService.get_user_templates(db, user_id)
        
        logger.info(f"✓ Retrieved {len(templates)} templates")
        
        return {
            "status": "success",
            "templates": templates,
            "count": len(templates)
        }
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/templates/favorite")
async def toggle_favorite(
    template_id: str = Query(...),
    is_favorite: bool = Query(...),
    db: Session = Depends(get_db)
):
    """POST /templates/favorite - Toggle favorite status"""
    try:
        success = TradingDisciplineService.toggle_favorite(db, template_id, is_favorite)
        
        if not success:
            raise HTTPException(status_code=404, detail="Template not found")
        
        return {
            "status": "success",
            "template_id": template_id,
            "is_favorite": is_favorite
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/templates/delete")
async def delete_template(
    template_id: str = Query(...),
    db: Session = Depends(get_db)
):
    """DELETE /templates/delete - Delete template"""
    try:
        success = TradingDisciplineService.delete_template(db, template_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Template not found")
        
        return {
            "status": "success",
            "deleted_template_id": template_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/discipline-score")
async def calculate_discipline(
    questionnaire_score: float = Query(...),
    emotional_state: str = Query(...),
    risk_compliant: bool = Query(True),
    plan_documented: bool = Query(True),
    streak: int = Query(0),
    db: Session = Depends(get_db)
):
    """POST /discipline-score - Calculate discipline score"""
    try:
        result = TradingDisciplineService.calculate_discipline_score(
            questionnaire_score, emotional_state, risk_compliant, plan_documented, streak
        )
        
        logger.info(f"✓ Discipline score calculated: {result['final_discipline_score']}")
        
        return {
            "status": "success",
            "discipline": result
        }
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/validate-trade")
async def validate_trade(
    user_id: str = Query(...),
    template_id: str = Query(...),
    strategy_name: str = Query(...),
    questionnaire_score: float = Query(...),
    decision: str = Query(...),
    emotional_state: str = Query(...),
    symbol: str = Query(""),
    entry_price: float = Query(0),
    stop_loss: float = Query(0),
    take_profit: float = Query(0),
    position_size: float = Query(0),
    answers: str = Query("{}"),
    db: Session = Depends(get_db)
):
    """POST /validate-trade - Validate and score trade"""
    try:
        try:
            answers_dict = json.loads(answers) if isinstance(answers, str) else answers
        except:
            answers_dict = {}
        
        discipline_calc = TradingDisciplineService.calculate_discipline_score(
            questionnaire_score, emotional_state, True, True
        )
        
        validation = TradingDisciplineService.save_validation(
            db, user_id, template_id, strategy_name, answers_dict, questionnaire_score,
            decision, discipline_calc['final_discipline_score'], emotional_state,
            symbol, entry_price, stop_loss, take_profit, position_size
        )
        
        logger.info(f"✓ Trade validated: {symbol}")
        
        return {
            "status": "success",
            "validation": validation,
            "discipline_score": discipline_calc
        }
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/statistics")
async def get_statistics(
    user_id: str = Query(...),
    days: int = Query(30),
    db: Session = Depends(get_db)
):
    """GET /statistics - Get overall trading statistics"""
    try:
        stats = TradingDisciplineService.get_overall_statistics(db, user_id, days)
        
        logger.info(f"✓ Statistics retrieved")
        
        return {
            "status": "success",
            "statistics": stats
        }
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/strategy-performance")
async def strategy_performance(
    user_id: str = Query(...),
    strategy_name: str = Query(...),
    days: int = Query(30),
    db: Session = Depends(get_db)
):
    """GET /strategy-performance - Get strategy-specific performance"""
    try:
        performance = TradingDisciplineService.get_strategy_performance(db, user_id, strategy_name, days)
        
        logger.info(f"✓ Strategy performance retrieved: {strategy_name}")
        
        return {
            "status": "success",
            "performance": performance
        }
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/emotional-states")
async def get_emotional_states(db: Session = Depends(get_db)):
    """GET /emotional-states - Get available emotional states"""
    try:
        states = TradingDisciplineService.EMOTIONAL_STATES
        
        logger.info(f"✓ Retrieved {len(states)} emotional states")
        
        return {
            "status": "success",
            "emotional_states": states
        }
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))