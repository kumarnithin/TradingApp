"""
Phase 1: ML Model Service
Trains and scores signals with ML model
Location: /backend/app/services/ml_model.py
"""

import pickle
import logging
import numpy as np
from datetime import datetime
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sqlalchemy.orm import Session
from app.database import Signal, Trade

logger = logging.getLogger(__name__)

# Model file paths
MODEL_DIR = Path(__file__).parent.parent / 'models'
MODEL_DIR.mkdir(exist_ok=True)
RF_MODEL_PATH = MODEL_DIR / 'rf_model.pkl'
GB_MODEL_PATH = MODEL_DIR / 'gb_model.pkl'
SCALER_PATH = MODEL_DIR / 'scaler.pkl'

class MLModel:
    """Machine Learning model for signal credibility scoring"""
    
    def __init__(self):
        self.rf_model = None
        self.gb_model = None
        self.scaler = None
        self.load_models()
    
    def load_models(self):
        """Load pre-trained models from disk"""
        try:
            if RF_MODEL_PATH.exists():
                with open(RF_MODEL_PATH, 'rb') as f:
                    self.rf_model = pickle.load(f)
                logger.info("✅ Random Forest model loaded")
            
            if GB_MODEL_PATH.exists():
                with open(GB_MODEL_PATH, 'rb') as f:
                    self.gb_model = pickle.load(f)
                logger.info("✅ Gradient Boosting model loaded")
            
            if SCALER_PATH.exists():
                with open(SCALER_PATH, 'rb') as f:
                    self.scaler = pickle.load(f)
                logger.info("✅ Scaler loaded")
            
            if not self.rf_model:
                logger.warning("⚠️ No trained models found. Using default scoring.")
        
        except Exception as e:
            logger.error(f"❌ Error loading models: {str(e)}")
    
    def train_models(self, db: Session):
        """
        Train ML models on historical signal data
        Call this once after collecting enough signals (100+)
        """
        try:
            logger.info("📊 Starting model training...")
            
            # Fetch training data
            signals = db.query(Signal).filter(Signal.status != 'pending').all()
            
            if len(signals) < 50:
                logger.warning(f"⚠️ Need at least 50 signals for training. Found: {len(signals)}")
                return False
            
            logger.info(f"📈 Using {len(signals)} signals for training")
            
            # Prepare features and labels
            X, y = self._prepare_training_data(signals, db)
            
            if X is None or len(X) < 30:
                logger.warning("⚠️ Not enough valid training data")
                return False
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            
            # Scale features
            self.scaler = StandardScaler()
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_test_scaled = self.scaler.transform(X_test)
            
            # Train Random Forest
            logger.info("🌲 Training Random Forest...")
            self.rf_model = RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                random_state=42,
                n_jobs=-1
            )
            self.rf_model.fit(X_train_scaled, y_train)
            rf_score = self.rf_model.score(X_test_scaled, y_test)
            logger.info(f"✅ Random Forest accuracy: {rf_score:.2%}")
            
            # Train Gradient Boosting
            logger.info("🚀 Training Gradient Boosting...")
            self.gb_model = GradientBoostingClassifier(
                n_estimators=100,
                max_depth=5,
                learning_rate=0.1,
                random_state=42
            )
            self.gb_model.fit(X_train_scaled, y_train)
            gb_score = self.gb_model.score(X_test_scaled, y_test)
            logger.info(f"✅ Gradient Boosting accuracy: {gb_score:.2%}")
            
            # Save models
            self._save_models()
            
            logger.info("✅ Model training complete!")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error training models: {str(e)}")
            return False
    
    def _prepare_training_data(self, signals, db):
        """Prepare features and labels from signals"""
        try:
            from app.services.feature_engineer import FeatureEngineer
            
            X = []
            y = []
            fe = FeatureEngineer(db)
            
            for signal in signals:
                # Skip if no outcome data
                if signal.status not in ['executed', 'rejected']:
                    continue
                
                # Extract features
                features = fe.extract_features(signal)
                feature_list = fe.features_to_list(features)
                
                # Determine label (1 = good, 0 = bad)
                # Good signal = executed and resulted in winning trade
                label = 1 if signal.status == 'executed' else 0
                
                X.append(feature_list)
                y.append(label)
            
            if not X:
                return None, None
            
            return np.array(X), np.array(y)
            
        except Exception as e:
            logger.error(f"Error preparing training data: {e}")
            return None, None
    
    def score_signal(self, features_list: list) -> float:
        """
        Score a signal's credibility
        Returns: 0.0 to 100.0 (100 = highest confidence)
        """
        try:
            if self.rf_model is None or self.scaler is None:
                # Return default score if no model
                logger.warning("⚠️ No trained model. Using default score (50%)")
                return 50.0
            
            # Prepare features
            X = np.array([features_list])
            X_scaled = self.scaler.transform(X)
            
            # Ensemble prediction (average of models)
            rf_pred = self.rf_model.predict_proba(X_scaled)[0][1]
            gb_pred = self.gb_model.predict_proba(X_scaled)[0][1] if self.gb_model else 0.5
            
            # Average ensemble score
            ensemble_score = (rf_pred + gb_pred) / 2
            credibility = ensemble_score * 100
            
            logger.info(f"✅ Signal scored: {credibility:.1f}% confidence")
            return credibility
            
        except Exception as e:
            logger.error(f"❌ Error scoring signal: {str(e)}")
            return 50.0  # Default to neutral
    
    def should_execute_signal(self, credibility_score: float, threshold: float = 50.0) -> bool:
        """
        Determine if signal should be executed
        
        Args:
            credibility_score: Score from 0-100
            threshold: Minimum score to execute (default 50%)
        
        Returns:
            True if should execute, False otherwise
        """
        return credibility_score >= threshold
    
    def _save_models(self):
        """Save trained models to disk"""
        try:
            if self.rf_model:
                with open(RF_MODEL_PATH, 'wb') as f:
                    pickle.dump(self.rf_model, f)
                logger.info(f"✅ Random Forest model saved to {RF_MODEL_PATH}")
            
            if self.gb_model:
                with open(GB_MODEL_PATH, 'wb') as f:
                    pickle.dump(self.gb_model, f)
                logger.info(f"✅ Gradient Boosting model saved to {GB_MODEL_PATH}")
            
            if self.scaler:
                with open(SCALER_PATH, 'wb') as f:
                    pickle.dump(self.scaler, f)
                logger.info(f"✅ Scaler saved to {SCALER_PATH}")
        
        except Exception as e:
            logger.error(f"❌ Error saving models: {str(e)}")

# Singleton instance
ml_model = MLModel()
