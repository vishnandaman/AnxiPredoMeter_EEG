import os
import pickle
import numpy as np
from flask import Flask, request, jsonify, session
from flask_cors import CORS
import logging
import socket
import subprocess
import json as json_module
import csv
import traceback
from collections import defaultdict
from functools import wraps
from typing import Dict
# Use Firebase database instead of SQLite
from firebase_database import (
    initialize_firebase, create_doctor, verify_doctor, get_doctor_by_id, get_all_doctors,
    create_patient, update_patient, get_patient_by_id, get_all_patients,
    save_test_report, get_patient_reports, get_report_by_id
)

# Initialize Firebase on startup (replaces init_database)
def init_database():
    """Initialize Firebase database"""
    try:
        initialize_firebase()
        print("✅ Firebase database initialized")
    except Exception as e:
        print(f"⚠️ Firebase initialization warning: {e}")
        print("   Make sure firebase_config.json or service account credentials are set up")

# Configure logging with more detailed output
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = 'anxiety_clinic_secret_key_2024_change_in_production'

# Configure session cookie for CORS compatibility
app.config['SESSION_COOKIE_SAMESITE'] = 'None'
app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True

# Configure CORS with credentials support and custom headers
CORS(app, 
     resources={r"/*": {
         "origins": "*",
         "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         "allow_headers": ["Content-Type", "Authorization", "X-Doctor-Id", "X-Requested-With"],
         "expose_headers": ["Content-Type"],
         "supports_credentials": True
     }}, 
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization", "X-Doctor-Id", "X-Requested-With"],
     expose_headers=["Content-Type"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

# Initialize Firebase database on startup
# Note: Firebase initialization will happen lazily when first needed
# This allows the server to start even without Firebase credentials initially
try:
    init_database()
except Exception as e:
    print(f"⚠️ Database initialization warning: {e}")
    print("   Server will start, but database operations require service account key")
    print("   Prediction endpoints will work, but doctor/patient management requires Firebase")

# Global variables for models
random_forest_model = None
scaler = None
label_encoder = None
combined_model = None

# Global variable to store latest Arduino data
latest_arduino_data = None

def get_local_ip():
    """Get the local IP address of the machine"""
    try:
        # Connect to a remote address to determine local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception as e:
        logger.error(f"Could not determine local IP: {e}")
        return "127.0.0.1"

def load_models():
    """Load all ML models with error handling"""
    global random_forest_model, scaler, label_encoder, combined_model
    
    # Always create a fallback label encoder first
    label_encoder = create_fallback_label_encoder()
    print("✅ Label Encoder ready (fallback)")
    print(f"📋 Available disorders: {list(label_encoder.classes_)}")
    
    # Try to load models, but don't fail if they don't exist
    model_files = {
        'random_forest_model.pkl': 'random_forest_model',
        'scaler.pkl': 'scaler', 
        'combined_anxiety_model.pkl': 'combined_model'
    }
    
    for filename, var_name in model_files.items():
        try:
            if os.path.exists(filename):
                with open(filename, 'rb') as f:
                    if var_name == 'random_forest_model':
                        random_forest_model = pickle.load(f)
                    elif var_name == 'scaler':
                        scaler = pickle.load(f)
                    elif var_name == 'combined_model':
                        combined_model = pickle.load(f)
                print(f"✅ {filename} loaded successfully")
            else:
                print(f"⚠️ {filename} not found, will use mock predictions")
        except Exception as e:
            print(f"❌ {filename} failed to load: {e}")
            print(f"⚠️ Will use mock predictions for {var_name}")
            if var_name == 'random_forest_model':
                random_forest_model = None
            elif var_name == 'scaler':
                scaler = None
            elif var_name == 'combined_model':
                combined_model = None

def create_fallback_label_encoder():
    """Create a fallback label encoder with common anxiety disorders"""
    from sklearn.preprocessing import LabelEncoder
    disorders = [
        'healthy control',
        'social anxiety disorder',
        'panic disorder',
        'generalized anxiety disorder',
        'obsessive compulsitve disorder',
        'depressive disorder',
        'posttraumatic stress disorder',
        'bipolar disorder',
        'schizophrenia',
        'behavioral addiction disorder'
    ]
    le = LabelEncoder()
    le.fit(disorders)
    return le

def get_confidence_scores(prediction_proba, label_encoder):
    """Convert prediction probabilities to confidence scores for all disorders"""
    disorders = label_encoder.classes_
    confidence_scores = []
    
    for i, disorder in enumerate(disorders):
        confidence = float(prediction_proba[0][i] * 100)
        confidence_scores.append({
            'disorder': disorder,
            'confidence': round(confidence, 1),
            'status': get_status_icon(confidence),
            'note': get_disorder_note(disorder, confidence)
        })
    
    # Sort by confidence (highest first)
    confidence_scores.sort(key=lambda x: x['confidence'], reverse=True)
    return confidence_scores

def get_status_icon(confidence):
    """Get status icon based on confidence level"""
    if confidence > 50:
        return "✅"
    elif confidence > 20:
        return "⚠️"
    elif confidence > 5:
        return "ℹ️"
    else:
        return "🧠"

def get_disorder_note(disorder, confidence):
    """Get descriptive note for each disorder based on confidence"""
    disorder_lower = disorder.lower()
    
    if disorder_lower == 'healthy control':
        if confidence > 50:
            return "Brain activity and vitals are within typical healthy range."
        else:
            return "Some irregularities detected in brain patterns."
    
    elif disorder_lower == 'social anxiety disorder':
        if confidence > 20:
            return "Elevated beta and gamma waves suggest social anxiety patterns."
        else:
            return "Slight elevation in beta and gamma waves noticed."
    
    elif disorder_lower == 'panic disorder':
        if confidence > 20:
            return "High beta activity and irregular breathing patterns detected."
        else:
            return "Some signs of hyperactivity and lowered SpO2 detected."
    
    elif disorder_lower == 'generalized anxiety disorder':
        if confidence > 20:
            return "Consistent high beta and low alpha waves indicate GAD."
        else:
            return "Mild irregularities in alpha-theta rhythm."
    
    elif disorder_lower == 'obsessive compulsitve disorder':
        if confidence > 20:
            return "High gamma activity and repetitive patterns suggest OCD."
        else:
            return "Subtle patterns in gamma and beta signals suggest low possibility."
    
    elif disorder_lower == 'depressive disorder':
        if confidence > 20:
            return "Low alpha and high theta waves indicate depressive patterns."
        else:
            return "Some depressive patterns detected in brain activity."
    
    else:
        return f"Patterns suggest possibility of {disorder}."

def predict_eeg_with_models(data):
    """Predict using actual models if available, otherwise use mock"""
    # Check if all required models are available
    models_available = (
        random_forest_model is not None and 
        scaler is not None and 
        label_encoder is not None
    )
    
    if models_available:
        try:
            # Extract features in the correct order
            features = np.array([
                float(data['beta']),
                float(data['gamma']),
                float(data['delta']),
                float(data['alpha']),
                float(data['theta'])
            ]).reshape(1, -1)
            
            # Scale the features
            scaled_features = scaler.transform(features)
            
            # Get prediction probabilities
            prediction_proba = random_forest_model.predict_proba(scaled_features)
            
            # Get confidence scores for all disorders
            confidence_scores = get_confidence_scores(prediction_proba, label_encoder)
            
            print("✅ Using actual EEG model for prediction")
            return {
                'primary_prediction': confidence_scores[0]['disorder'],
                'confidence_scores': confidence_scores
            }
            
        except Exception as e:
            print(f"❌ Error in actual EEG prediction: {e}")
            print("🔄 Falling back to mock prediction")
            # Fallback to mock prediction
            return mock_eeg_prediction_with_confidence(
                float(data['beta']),
                float(data['gamma']),
                float(data['delta']),
                float(data['alpha']),
                float(data['theta'])
            )
    else:
        print("⚠️ Using mock EEG prediction (models not loaded)")
        print(f"📊 Model status - RF: {random_forest_model is not None}, Scaler: {scaler is not None}, LE: {label_encoder is not None}")
        return mock_eeg_prediction_with_confidence(
            float(data['beta']),
            float(data['gamma']),
            float(data['delta']),
            float(data['alpha']),
            float(data['theta'])
        )

def predict_biometric_with_models(data):
    """Predict using actual models if available, otherwise use mock"""
    # Check if all required models are available
    models_available = (
        combined_model is not None and 
        label_encoder is not None
    )
    
    if models_available:
        try:
            # Extract features
            features = np.array([
                float(data['spo2']),
                float(data['gsr'])
            ]).reshape(1, -1)
            
            # Get prediction probabilities
            prediction_proba = combined_model.predict_proba(features)
            
            # Get confidence scores for all disorders
            confidence_scores = get_confidence_scores(prediction_proba, label_encoder)
            
            print("✅ Using actual biometric model for prediction")
            return {
                'primary_prediction': confidence_scores[0]['disorder'],
                'confidence_scores': confidence_scores
            }
            
        except Exception as e:
            print(f"❌ Error in actual biometric prediction: {e}")
            print("🔄 Falling back to mock prediction")
            # Fallback to mock prediction
            return mock_biometric_prediction_with_confidence(
                float(data['spo2']),
                float(data['gsr'])
            )
    else:
        print("⚠️ Using mock biometric prediction (models not loaded)")
        print(f"📊 Model status - Combined: {combined_model is not None}, LE: {label_encoder is not None}")
        return mock_biometric_prediction_with_confidence(
            float(data['spo2']),
            float(data['gsr'])
        )

def mock_eeg_prediction_with_confidence(beta, gamma, delta, alpha, theta):
    """Mock EEG prediction with confidence scores when models fail to load"""
    total = beta + gamma + delta + alpha + theta
    
    # Calculate ratios for more sophisticated analysis
    beta_ratio = beta / total if total > 0 else 0
    gamma_ratio = gamma / total if total > 0 else 0
    alpha_ratio = alpha / total if total > 0 else 0
    
    # Generate mock confidence scores based on input values
    if total < 100:
        confidence_scores = [
            {'disorder': 'healthy control', 'confidence': 75.0, 'status': '✅', 'note': 'Brain activity and vitals are within typical healthy range.'},
            {'disorder': 'social anxiety disorder', 'confidence': 15.0, 'status': '⚠️', 'note': 'Slight elevation in beta and gamma waves noticed.'},
            {'disorder': 'panic disorder', 'confidence': 5.0, 'status': 'ℹ️', 'note': 'Some signs of hyperactivity detected.'},
            {'disorder': 'generalized anxiety disorder', 'confidence': 3.0, 'status': 'ℹ️', 'note': 'Mild irregularities in alpha-theta rhythm.'},
            {'disorder': 'obsessive compulsitve disorder', 'confidence': 2.0, 'status': '🧠', 'note': 'Subtle patterns in gamma signals suggest low possibility.'}
        ]
    elif total < 500:
        confidence_scores = [
            {'disorder': 'social anxiety disorder', 'confidence': 65.0, 'status': '⚠️', 'note': 'Elevated beta and gamma waves suggest social anxiety patterns.'},
            {'disorder': 'healthy control', 'confidence': 20.0, 'status': '✅', 'note': 'Some irregularities detected in brain patterns.'},
            {'disorder': 'generalized anxiety disorder', 'confidence': 8.0, 'status': 'ℹ️', 'note': 'Mild irregularities in alpha-theta rhythm.'},
            {'disorder': 'panic disorder', 'confidence': 4.0, 'status': 'ℹ️', 'note': 'Some signs of hyperactivity detected.'},
            {'disorder': 'obsessive compulsitve disorder', 'confidence': 3.0, 'status': '🧠', 'note': 'Subtle patterns in gamma signals suggest low possibility.'}
        ]
    elif total < 1000:
        confidence_scores = [
            {'disorder': 'panic disorder', 'confidence': 70.0, 'status': '⚠️', 'note': 'High beta activity and irregular patterns detected.'},
            {'disorder': 'social anxiety disorder', 'confidence': 18.0, 'status': '⚠️', 'note': 'Elevated beta and gamma waves noticed.'},
            {'disorder': 'generalized anxiety disorder', 'confidence': 7.0, 'status': 'ℹ️', 'note': 'Some anxiety patterns detected.'},
            {'disorder': 'healthy control', 'confidence': 3.0, 'status': '✅', 'note': 'Some irregularities detected in brain patterns.'},
            {'disorder': 'obsessive compulsitve disorder', 'confidence': 2.0, 'status': '🧠', 'note': 'Subtle patterns in gamma signals suggest low possibility.'}
        ]
    elif beta_ratio > 0.8:
        confidence_scores = [
            {'disorder': 'generalized anxiety disorder', 'confidence': 80.0, 'status': '⚠️', 'note': 'Consistent high beta and low alpha waves indicate GAD.'},
            {'disorder': 'panic disorder', 'confidence': 12.0, 'status': '⚠️', 'note': 'High beta activity detected.'},
            {'disorder': 'social anxiety disorder', 'confidence': 5.0, 'status': 'ℹ️', 'note': 'Elevated beta waves noticed.'},
            {'disorder': 'obsessive compulsitve disorder', 'confidence': 2.0, 'status': '🧠', 'note': 'Subtle patterns in beta signals suggest low possibility.'},
            {'disorder': 'healthy control', 'confidence': 1.0, 'status': '✅', 'note': 'Some irregularities detected in brain patterns.'}
        ]
    elif gamma_ratio > 0.3:
        confidence_scores = [
            {'disorder': 'obsessive compulsitve disorder', 'confidence': 75.0, 'status': '🧠', 'note': 'High gamma activity and repetitive patterns suggest OCD.'},
            {'disorder': 'generalized anxiety disorder', 'confidence': 15.0, 'status': '⚠️', 'note': 'Some anxiety patterns detected.'},
            {'disorder': 'social anxiety disorder', 'confidence': 6.0, 'status': 'ℹ️', 'note': 'Elevated gamma waves noticed.'},
            {'disorder': 'panic disorder', 'confidence': 3.0, 'status': 'ℹ️', 'note': 'Some hyperactivity detected.'},
            {'disorder': 'healthy control', 'confidence': 1.0, 'status': '✅', 'note': 'Some irregularities detected in brain patterns.'}
        ]
    else:
        confidence_scores = [
            {'disorder': 'obsessive compulsitve disorder', 'confidence': 60.0, 'status': '🧠', 'note': 'Patterns suggest possibility of OCD.'},
            {'disorder': 'generalized anxiety disorder', 'confidence': 25.0, 'status': '⚠️', 'note': 'Some anxiety patterns detected.'},
            {'disorder': 'social anxiety disorder', 'confidence': 10.0, 'status': 'ℹ️', 'note': 'Some social anxiety patterns detected.'},
            {'disorder': 'panic disorder', 'confidence': 3.0, 'status': 'ℹ️', 'note': 'Some hyperactivity detected.'},
            {'disorder': 'healthy control', 'confidence': 2.0, 'status': '✅', 'note': 'Some irregularities detected in brain patterns.'}
        ]
    
    return {
        'primary_prediction': confidence_scores[0]['disorder'],
        'confidence_scores': confidence_scores
    }

def combine_predictions(eeg_prediction: Dict, biometric_prediction: Dict, 
                        eeg_weight: float = 0.6, biometric_weight: float = 0.4) -> Dict:
    """
    Combine EEG and biometric predictions with weighted scores.
    Handles conflicts when predictions differ.
    
    Args:
        eeg_prediction: EEG prediction result with confidence_scores
        biometric_prediction: Biometric prediction result with confidence_scores
        eeg_weight: Weight for EEG prediction (default 0.6)
        biometric_weight: Weight for biometric prediction (default 0.4)
    
    Returns:
        Combined prediction with conflict analysis
    """
    # Extract confidence scores
    eeg_scores = {item['disorder']: item['confidence'] 
                  for item in eeg_prediction.get('confidence_scores', [])}
    bio_scores = {item['disorder']: item['confidence'] 
                  for item in biometric_prediction.get('confidence_scores', [])}
    
    # Get all unique disorders
    all_disorders = set(eeg_scores.keys()) | set(bio_scores.keys())
    
    # Calculate weighted combined scores
    combined_scores = []
    for disorder in all_disorders:
        eeg_conf = eeg_scores.get(disorder, 0)
        bio_conf = bio_scores.get(disorder, 0)
        
        # Weighted average
        combined_conf = (eeg_conf * eeg_weight) + (bio_conf * biometric_weight)
        
        combined_scores.append({
            'disorder': disorder,
            'confidence': round(combined_conf, 1),
            'eeg_confidence': round(eeg_conf, 1),
            'biometric_confidence': round(bio_conf, 1),
            'status': '✅' if combined_conf > 50 else '⚠️' if combined_conf > 20 else 'ℹ️' if combined_conf > 5 else '🧠'
        })
    
    # Sort by combined confidence
    combined_scores.sort(key=lambda x: x['confidence'], reverse=True)
    
    # Primary prediction
    primary_prediction = combined_scores[0]['disorder']
    
    # Conflict analysis
    eeg_primary = eeg_prediction.get('primary_prediction', 'Unknown')
    bio_primary = biometric_prediction.get('primary_prediction', 'Unknown')
    
    has_conflict = eeg_primary != bio_primary
    conflict_severity = 'none'
    
    if has_conflict:
        eeg_top_conf = eeg_scores.get(eeg_primary, 0)
        bio_top_conf = bio_scores.get(bio_primary, 0)
        
        # Calculate conflict severity
        conf_diff = abs(eeg_top_conf - bio_top_conf)
        if conf_diff < 10:
            conflict_severity = 'high'  # Very close, unreliable
        elif conf_diff < 25:
            conflict_severity = 'medium'
        else:
            conflict_severity = 'low'  # One is clearly stronger
    
    conflict_analysis = {
        'has_conflict': has_conflict,
        'severity': conflict_severity,
        'eeg_primary': eeg_primary,
        'biometric_primary': bio_primary,
        'eeg_weight': eeg_weight,
        'biometric_weight': biometric_weight,
        'recommendation': generate_conflict_recommendation(
            has_conflict, conflict_severity, eeg_primary, bio_primary,
            eeg_scores.get(eeg_primary, 0), bio_scores.get(bio_primary, 0)
        )
    }
    
    return {
        'primary_prediction': primary_prediction,
        'confidence_scores': combined_scores,
        'eeg_prediction': eeg_primary,
        'biometric_prediction': bio_primary,
        'conflict_analysis': conflict_analysis,
        'weights_used': {
            'eeg': eeg_weight,
            'biometric': biometric_weight
        }
    }

def generate_conflict_recommendation(has_conflict: bool, severity: str, 
                                     eeg_primary: str, bio_primary: str,
                                     eeg_conf: float, bio_conf: float) -> str:
    """Generate recommendation based on conflict analysis"""
    if not has_conflict:
        return "Both EEG and biometric analysis agree. Prediction is consistent."
    
    if severity == 'high':
        return f"Significant conflict detected: EEG suggests '{eeg_primary}' ({eeg_conf:.1f}%) while biometric suggests '{bio_primary}' ({bio_conf:.1f}%). Confidence scores are very close. Consider re-testing or additional clinical evaluation."
    elif severity == 'medium':
        return f"Moderate conflict: EEG suggests '{eeg_primary}' while biometric suggests '{bio_primary}'. The combined prediction uses weighted analysis. Clinical correlation recommended."
    else:
        return f"Minor conflict: Different primary predictions (EEG: '{eeg_primary}', Biometric: '{bio_primary}'), but one has significantly higher confidence. Combined prediction favors the more confident result."

def mock_biometric_prediction_with_confidence(spo2, gsr):
    """Mock biometric prediction with confidence scores when models fail to load"""
    # Generate mock confidence scores based on input values
    if spo2 > 95 and gsr < 1:
        confidence_scores = [
            {'disorder': 'healthy control', 'confidence': 85.0, 'status': '✅', 'note': 'Brain activity and vitals are within typical healthy range.'},
            {'disorder': 'social anxiety disorder', 'confidence': 10.0, 'status': '⚠️', 'note': 'Slight elevation in physiological responses.'},
            {'disorder': 'panic disorder', 'confidence': 3.0, 'status': 'ℹ️', 'note': 'Some signs of stress detected.'},
            {'disorder': 'generalized anxiety disorder', 'confidence': 1.5, 'status': 'ℹ️', 'note': 'Mild irregularities in physiological patterns.'},
            {'disorder': 'obsessive compulsitve disorder', 'confidence': 0.5, 'status': '🧠', 'note': 'Subtle patterns suggest low possibility.'}
        ]
    elif spo2 > 90 and gsr < 2:
        confidence_scores = [
            {'disorder': 'social anxiety disorder', 'confidence': 70.0, 'status': '⚠️', 'note': 'Elevated GSR and moderate SpO2 suggest social anxiety.'},
            {'disorder': 'healthy control', 'confidence': 20.0, 'status': '✅', 'note': 'Some irregularities detected in physiological patterns.'},
            {'disorder': 'generalized anxiety disorder', 'confidence': 6.0, 'status': 'ℹ️', 'note': 'Some anxiety patterns detected.'},
            {'disorder': 'panic disorder', 'confidence': 3.0, 'status': 'ℹ️', 'note': 'Some stress patterns detected.'},
            {'disorder': 'obsessive compulsitve disorder', 'confidence': 1.0, 'status': '🧠', 'note': 'Subtle patterns suggest low possibility.'}
        ]
    elif spo2 > 85 and gsr < 3:
        confidence_scores = [
            {'disorder': 'panic disorder', 'confidence': 75.0, 'status': '⚠️', 'note': 'High GSR and lowered SpO2 indicate panic patterns.'},
            {'disorder': 'social anxiety disorder', 'confidence': 15.0, 'status': '⚠️', 'note': 'Elevated physiological responses.'},
            {'disorder': 'generalized anxiety disorder', 'confidence': 7.0, 'status': 'ℹ️', 'note': 'Some anxiety patterns detected.'},
            {'disorder': 'healthy control', 'confidence': 2.0, 'status': '✅', 'note': 'Some irregularities detected in physiological patterns.'},
            {'disorder': 'obsessive compulsitve disorder', 'confidence': 1.0, 'status': '🧠', 'note': 'Subtle patterns suggest low possibility.'}
        ]
    elif spo2 > 88 and gsr >= 3 and gsr < 5:
        confidence_scores = [
            {'disorder': 'generalized anxiety disorder', 'confidence': 80.0, 'status': '⚠️', 'note': 'Consistent high GSR and moderate SpO2 indicate GAD.'},
            {'disorder': 'panic disorder', 'confidence': 12.0, 'status': '⚠️', 'note': 'High GSR detected.'},
            {'disorder': 'social anxiety disorder', 'confidence': 5.0, 'status': 'ℹ️', 'note': 'Some social anxiety patterns detected.'},
            {'disorder': 'obsessive compulsitve disorder', 'confidence': 2.0, 'status': '🧠', 'note': 'Subtle patterns suggest low possibility.'},
            {'disorder': 'healthy control', 'confidence': 1.0, 'status': '✅', 'note': 'Some irregularities detected in physiological patterns.'}
        ]
    else:
        confidence_scores = [
            {'disorder': 'obsessive compulsitve disorder', 'confidence': 65.0, 'status': '🧠', 'note': 'High GSR and irregular patterns suggest OCD.'},
            {'disorder': 'generalized anxiety disorder', 'confidence': 20.0, 'status': '⚠️', 'note': 'Some anxiety patterns detected.'},
            {'disorder': 'panic disorder', 'confidence': 10.0, 'status': 'ℹ️', 'note': 'Some panic patterns detected.'},
            {'disorder': 'social anxiety disorder', 'confidence': 3.0, 'status': 'ℹ️', 'note': 'Some social anxiety patterns detected.'},
            {'disorder': 'healthy control', 'confidence': 2.0, 'status': '✅', 'note': 'Some irregularities detected in physiological patterns.'}
        ]
    
    return {
        'primary_prediction': confidence_scores[0]['disorder'],
        'confidence_scores': confidence_scores
    }

def read_latest_eeg_from_csv():
    """
    Read the latest EEG data from eeg_live_data.csv file.
    Calculates averages for each band (delta, theta, alpha, beta, gamma) across all channels.
    Returns dictionary with band averages or None if file not found or empty.
    """
    # Try multiple possible paths for the CSV file
    base_dir = os.path.dirname(__file__)
    possible_paths = [
        os.path.join(base_dir, '..', 'EEG', 'eeg_live_data.csv'),
        os.path.join(base_dir, '../EEG/eeg_live_data.csv'),
        os.path.join(os.path.dirname(base_dir), 'EEG', 'eeg_live_data.csv'),
        'eeg_live_data.csv',  # same directory
    ]
    
    csv_path = None
    for path in possible_paths:
        abs_path = os.path.abspath(path)
        if os.path.exists(abs_path):
            csv_path = abs_path
            break
    
    if not csv_path:
        logger.warning("EEG CSV file not found. Checked paths: " + str(possible_paths))
        return None
    
    try:
        # Read CSV and calculate averages
        band_values = defaultdict(list)  # band -> list of values
        
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                band = row.get('Band', '').lower().strip()
                value_str = row.get('Value', '').strip()
                
                # Skip header row or invalid rows
                if not band or not value_str or band == 'band':
                    continue
                
                try:
                    value = float(value_str)
                    band_values[band].append(value)
                except (ValueError, TypeError):
                    continue
        
        # Calculate averages for each band
        if not band_values:
            logger.warning(f"EEG CSV file {csv_path} is empty or has no valid data")
            return None
        
        averages = {}
        for band in ['delta', 'theta', 'alpha', 'beta', 'gamma']:
            if band in band_values and len(band_values[band]) > 0:
                avg = np.mean(band_values[band])
                averages[band] = round(float(avg), 4)
            else:
                logger.warning(f"No data found for band: {band}")
        
        if not averages:
            return None
        
        logger.info(f"Read EEG averages from CSV: {averages}")
        logger.info(f"Total values processed - Delta: {len(band_values.get('delta', []))}, "
                   f"Theta: {len(band_values.get('theta', []))}, "
                   f"Alpha: {len(band_values.get('alpha', []))}, "
                   f"Beta: {len(band_values.get('beta', []))}, "
                   f"Gamma: {len(band_values.get('gamma', []))}")
        
        return averages
        
    except Exception as e:
        logger.error(f"Error reading EEG CSV file {csv_path}: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return None

def run_cortex_script_and_parse(script_name='cortex._atest.py'):
    """
    Try to run the cortex script (located next to this file) and parse JSON output.
    The cortex script should print JSON like: {"eeg": {...}, "biometric": {...}}
    Fallback: return None on error.
    """
    base = os.path.dirname(__file__)
    script_path = os.path.join(base, script_name)
    if not os.path.exists(script_path):
        # try alternate name without dot
        alt = os.path.join(base, 'cortex_atest.py')
        if os.path.exists(alt):
            script_path = alt
        else:
            return None

    try:
        completed = subprocess.run(
            ['python', script_path],
            capture_output=True,
            text=True,
            timeout=10
        )
        out = completed.stdout.strip()
        # If the script already prints JSON, parse it
        try:
            parsed = json_module.loads(out)
            return parsed
        except json_module.JSONDecodeError:
            # try to find a JSON substring
            start = out.find('{')
            end = out.rfind('}')
            if start != -1 and end != -1 and end > start:
                try:
                    return json_module.loads(out[start:end+1])
                except Exception:
                    return None
            return None
    except Exception:
        return None

@app.route('/predict_eeg', methods=['POST'])
def predict_eeg():
    """EEG prediction endpoint"""
    try:
        data = request.get_json()
        logger.info(f"Received EEG data: {data}")
        
        # Validate required fields
        required_fields = ['beta', 'gamma', 'delta', 'alpha', 'theta']
        for field in required_fields:
            if field not in data or data[field] == '':
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Make prediction
        result = predict_eeg_with_models(data)
        
        logger.info(f"EEG Prediction: {result['primary_prediction']}")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"EEG prediction error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/predict_combined', methods=['POST'])
def predict_combined():
    """Biometric prediction endpoint"""
    try:
        # Log request details for debugging
        logger.info(f"=== NEW REQUEST ===")
        logger.info(f"Client IP: {request.remote_addr}")
        logger.info(f"User Agent: {request.headers.get('User-Agent', 'Unknown')}")
        logger.info(f"Content-Type: {request.headers.get('Content-Type', 'Unknown')}")
        logger.info(f"Content-Length: {request.headers.get('Content-Length', 'Unknown')}")
        
        # Log raw request data
        raw_data = request.get_data()
        logger.info(f"Raw request data: {raw_data}")
        
        data = request.get_json()
        logger.info(f"Parsed JSON data: {data}")
        
        # Store latest Arduino data globally
        global latest_arduino_data
        latest_arduino_data = data.copy()
        logger.info(f"Updated latest Arduino data: {latest_arduino_data}")
        
        # Validate required fields
        required_fields = ['spo2', 'gsr']
        for field in required_fields:
            if field not in data or data[field] == '':
                logger.error(f"Missing required field: {field}")
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Log the values being processed
        logger.info(f"Processing SpO2: {data['spo2']}, GSR: {data['gsr']}")
        
        # Make prediction
        result = predict_biometric_with_models(data)
        
        logger.info(f"Biometric Prediction: {result['primary_prediction']}")
        logger.info(f"Full result: {result}")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Biometric prediction error: {e}")
        logger.error(f"Error type: {type(e).__name__}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

@app.route('/test', methods=['GET'])
def test_endpoint():
    """Simple test endpoint to verify server is reachable"""
    return jsonify({
        "status": "Server is running!",
        "message": "Test endpoint working",
        "timestamp": str(np.datetime64('now'))
    })

@app.route('/latest_arduino_data', methods=['GET'])
def get_latest_arduino_data():
    """Get the latest Arduino sensor data"""
    global latest_arduino_data
    
    if latest_arduino_data is None:
        return jsonify({
            "error": "No Arduino data available yet",
            "message": "Arduino hasn't sent any data yet"
        }), 404
    
    logger.info(f"Returning latest Arduino data: {latest_arduino_data}")
    return jsonify({
        "status": "success",
        "data": latest_arduino_data,
        "timestamp": str(np.datetime64('now'))
    })

@app.route('/latest_avg_eeg', methods=['GET'])
def latest_avg_eeg():
    """
    Returns latest EEG averages from the CSV file generated by cortex_test.py.
    Reads eeg_live_data.csv and calculates averages for each band across all channels.
    Falls back to mock data only if CSV file is not found or has no data.
    """
    # Try to read real EEG data from CSV file first
    real_eeg_data = read_latest_eeg_from_csv()
    
    if real_eeg_data and len(real_eeg_data) > 0:
        logger.info(f"Returning real EEG data from CSV: {real_eeg_data}")
        return jsonify({
            "status": "success",
            "data": real_eeg_data,
            "source": "csv_file"
        })
    
    # Fallback: Try running cortex script
    parsed = run_cortex_script_and_parse()
    if parsed and 'eeg' in parsed:
        logger.info(f"Returning EEG data from cortex script: {parsed['eeg']}")
        return jsonify({
            "status": "success",
            "data": parsed['eeg'],
            "source": "cortex_script"
        })
    
    # Last resort: fallback mock (only if both real data sources fail)
    logger.warning("No real EEG data found, using mock data as fallback")
    mock_eeg = {"alpha": 20.1, "beta": 12.3, "gamma": 3.4, "delta": 40.0, "theta": 8.2}
    return jsonify({
        "status": "success",
        "data": mock_eeg,
        "source": "mock",
        "warning": "Real EEG data not available. Make sure cortex_test.py is running and generating eeg_live_data.csv"
    })

@app.route('/latest_avg_biometric', methods=['GET'])
def latest_avg_biometric():
    """
    Returns latest biometric averages. Tries cortex script first, then fallback mock.
    """
    parsed = run_cortex_script_and_parse()
    if parsed and 'biometric' in parsed:
        return jsonify({"status": "success", "data": parsed['biometric']})
    # fallback mock
    mock_bio = {"spo2": 98.2, "gsr": 0.2862, "hr_mean": 72}
    return jsonify({"status": "success", "data": mock_bio})

# Authentication decorator
def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Try to get doctor_id from session first
        doctor_id = session.get('doctor_id')
        
        # If not in session, try to get from request headers
        if not doctor_id:
            doctor_id_header = request.headers.get('X-Doctor-Id')
            if doctor_id_header:
                # Verify doctor exists
                doctor = get_doctor_by_id(str(doctor_id_header))
                if doctor:
                    # Set in session for future requests
                    session['doctor_id'] = str(doctor_id_header)
                    doctor_id = str(doctor_id_header)
        
        # If still not found, try to get from query parameters (for GET requests)
        if not doctor_id:
            doctor_id_query = request.args.get('doctor_id')
            if doctor_id_query:
                # Verify doctor exists
                doctor = get_doctor_by_id(str(doctor_id_query))
                if doctor:
                    # Set in session for future requests
                    session['doctor_id'] = str(doctor_id_query)
                    doctor_id = str(doctor_id_query)
        
        # If still not found, try to get from request body (for POST requests)
        if not doctor_id and request.is_json:
            try:
                data = request.get_json(silent=True) or {}
                doctor_id_from_body = data.get('doctor_id')
                if doctor_id_from_body:
                    # Verify doctor exists
                    doctor = get_doctor_by_id(str(doctor_id_from_body))
                    if doctor:
                        # Set in session for future requests
                        session['doctor_id'] = str(doctor_id_from_body)
                        doctor_id = str(doctor_id_from_body)
            except Exception:
                pass
        
        if not doctor_id:
            logger.warning(f"Authentication failed - no doctor_id found. Session: {dict(session)}")
            return jsonify({"error": "Authentication required. Please login again."}), 401
        
        return f(*args, **kwargs)
    return decorated_function

# Authentication endpoints
@app.route('/api/doctor/register', methods=['POST'])
def doctor_register():
    """Register a new doctor"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        name = data.get('name')
        license_number = data.get('license_number')
        
        if not email or not password or not name:
            return jsonify({"error": "Missing required fields: email, password, name"}), 400
        
        success, message, doctor = create_doctor(email, password, name, license_number)
        
        if success:
            # Auto-login after registration
            session['doctor_id'] = doctor['id']
            session['doctor_email'] = doctor['email']
            session['doctor_name'] = doctor['name']
            
            return jsonify({
                "success": True,
                "message": message,
                "doctor": doctor
            }), 201
        else:
            return jsonify({"error": message}), 400
            
    except Exception as e:
        logger.error(f"Registration error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/doctor/login', methods=['POST'])
def doctor_login():
    """Login doctor"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({"error": "Missing email or password"}), 400
        
        success, message, doctor = verify_doctor(email, password)
        
        if success:
            session['doctor_id'] = doctor['id']
            session['doctor_email'] = doctor['email']
            session['doctor_name'] = doctor['name']
            
            return jsonify({
                "success": True,
                "message": message,
                "doctor": doctor
            })
        else:
            return jsonify({"error": message}), 401
            
    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/doctor/logout', methods=['POST'])
def doctor_logout():
    """Logout doctor"""
    session.clear()
    return jsonify({"success": True, "message": "Logged out successfully"})

@app.route('/api/doctor/me', methods=['GET'])
@require_auth
def doctor_me():
    """Get current doctor info"""
    doctor_id = session.get('doctor_id')
    doctor = get_doctor_by_id(doctor_id)
    
    if doctor:
        return jsonify({"success": True, "doctor": doctor})
    else:
        return jsonify({"error": "Doctor not found"}), 404

@app.route('/api/doctors', methods=['GET'])
def list_all_doctors():
    """Get all registered doctors (public endpoint)"""
    try:
        doctors = get_all_doctors()
        return jsonify({
            "success": True,
            "doctors": doctors,
            "count": len(doctors)
        })
    except Exception as e:
        logger.error(f"List doctors error: {e}")
        return jsonify({"error": str(e)}), 500

# ==================== REAL-TIME EEG COLLECTION (NEW) ====================
# This endpoint provides automatic EEG collection without manual intervention
# To rollback: Delete ml_model/eeg_realtime/ folder and this endpoint will be skipped
@app.route('/api/eeg/collect_realtime', methods=['POST'])
def collect_realtime_eeg():
    """
    Automatically collect EEG data from connected device.
    No manual intervention required - connects, collects, filters, and returns averages.
    """
    try:
        # Try to import the new real-time collector
        try:
            from eeg_realtime.realtime_eeg_collector import collect_eeg_data, COLLECTION_DURATION
        except ImportError:
            # Module not found - fallback to old method
            logger.info("[EEG Realtime] Module not found, falling back to old method")
            return jsonify({
                "success": False,
                "error": "Real-time EEG collection module not available",
                "fallback_available": True,
                "message": "Please use the old method (run cortex_test.py separately)"
            }), 503
        
        # Get duration from request (optional, defaults to 30 seconds)
        data = request.get_json() or {}
        duration = data.get('duration', COLLECTION_DURATION)
        
        if not isinstance(duration, int) or duration < 5 or duration > 120:
            duration = COLLECTION_DURATION
        
        logger.info(f"[EEG Realtime] Starting collection for {duration} seconds...")
        
        # Collect EEG data automatically
        success, eeg_data, message = collect_eeg_data(duration=duration)
        
        if success and eeg_data:
            logger.info(f"[EEG Realtime] Collection successful: {eeg_data}")
            return jsonify({
                "success": True,
                "data": eeg_data,
                "message": message,
                "source": "realtime_collection"
            })
        else:
            logger.warning(f"[EEG Realtime] Collection failed: {message}")
            return jsonify({
                "success": False,
                "error": message,
                "fallback_available": True
            }), 400
            
    except Exception as e:
        logger.error(f"[EEG Realtime] Error in endpoint: {e}")
        logger.error(traceback.format_exc())
        return jsonify({
            "success": False,
            "error": f"Collection error: {str(e)}",
            "fallback_available": True
        }), 500

# Patient management endpoints
@app.route('/api/patients', methods=['POST'])
@require_auth
def create_patient_endpoint():
    """Create a new patient"""
    try:
        data = request.get_json()
        patient_id = data.get('patient_id')
        name = data.get('name')
        age = data.get('age')
        gender = data.get('gender')
        
        # Get doctor_id from session (set by require_auth decorator)
        doctor_id = session.get('doctor_id')
        
        # Fallback: try to get from request body
        if not doctor_id:
            doctor_id = data.get('doctor_id')
            if doctor_id:
                doctor = get_doctor_by_id(str(doctor_id))
                if doctor:
                    session['doctor_id'] = str(doctor_id)
                    doctor_id = str(doctor_id)
        
        if not doctor_id:
            return jsonify({"error": "Authentication required. Please login again."}), 401
        
        if not patient_id:
            return jsonify({"error": "patient_id is required"}), 400
        
        success, message, patient = create_patient(patient_id, str(doctor_id), name, age, gender)
        
        if success:
            return jsonify({
                "success": True,
                "message": message,
                "patient": patient
            }), 201
        else:
            return jsonify({"error": message}), 400
            
    except Exception as e:
        logger.error(f"Create patient error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/patients', methods=['GET'])
@require_auth
def list_patients():
    """Get all patients for the logged-in doctor"""
    try:
        # Get doctor_id from session (set by require_auth decorator)
        doctor_id = session.get('doctor_id')
        
        logger.info(f"🔍 [BACKEND DEBUG] list_patients called")
        logger.info(f"🔍 [BACKEND DEBUG] Session doctor_id: {doctor_id}")
        logger.info(f"🔍 [BACKEND DEBUG] Query params: {request.args}")
        
        # Fallback: try to get from query parameters
        if not doctor_id:
            doctor_id = request.args.get('doctor_id')
            logger.info(f"🔍 [BACKEND DEBUG] Got doctor_id from query: {doctor_id}")
            if doctor_id:
                doctor = get_doctor_by_id(str(doctor_id))
                if doctor:
                    session['doctor_id'] = str(doctor_id)
                    doctor_id = str(doctor_id)
                    logger.info(f"🔍 [BACKEND DEBUG] Doctor found, session updated")
                else:
                    logger.warning(f"⚠️ [BACKEND DEBUG] Doctor not found for ID: {doctor_id}")
        
        if not doctor_id:
            logger.error(f"❌ [BACKEND DEBUG] No doctor_id found")
            return jsonify({"error": "Authentication required. Please login again."}), 401
        
        # Ensure doctor_id is a string and get patients for THIS doctor only
        doctor_id = str(doctor_id)
        logger.info(f"🔍 [BACKEND DEBUG] Fetching patients for doctor_id: {doctor_id} (type: {type(doctor_id)})")
        
        patients = get_all_patients(doctor_id)
        
        logger.info(f"✅ [BACKEND DEBUG] Retrieved {len(patients)} patients from database")
        logger.info(f"🔍 [BACKEND DEBUG] Patients data: {patients}")
        
        # Log each patient's structure
        for idx, patient in enumerate(patients):
            logger.info(f"🔍 [BACKEND DEBUG] Patient {idx + 1}: ID={patient.get('id')}, patient_id={patient.get('patient_id')}, doctor_id={patient.get('doctor_id')}, name={patient.get('name')}")
        
        logger.info(f"Doctor {doctor_id} requested patients list - returning {len(patients)} patients")
        
        return jsonify({
            "success": True,
            "patients": patients,
            "doctor_id": doctor_id,  # Return doctor_id for verification
            "debug": {
                "doctor_id": doctor_id,
                "patient_count": len(patients)
            }
        })
    except Exception as e:
        logger.error(f"List patients error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/patients/<patient_id>', methods=['GET', 'DELETE'])
@require_auth
def patient_endpoint(patient_id):
    """Get or delete patient by ID"""
    try:
        # Get doctor_id from session (set by require_auth decorator)
        doctor_id = session.get('doctor_id')
        
        # Fallback: try to get from query parameters or request body
        if not doctor_id:
            doctor_id = request.args.get('doctor_id') or request.get_json().get('doctor_id') if request.is_json else None
            if doctor_id:
                doctor = get_doctor_by_id(str(doctor_id))
                if doctor:
                    session['doctor_id'] = str(doctor_id)
                    doctor_id = str(doctor_id)
        
        if not doctor_id:
            return jsonify({"error": "Authentication required. Please login again."}), 401
        
        if request.method == 'DELETE':
            # Delete patient
            from firebase_database import delete_patient
            success, message = delete_patient(patient_id, str(doctor_id))
            
            if success:
                return jsonify({
                    "success": True,
                    "message": message
                })
            else:
                return jsonify({"error": message}), 404
        else:
            # GET patient
            patient = get_patient_by_id(patient_id, str(doctor_id))
            
            if patient:
                return jsonify({
                    "success": True,
                    "patient": patient
                })
            else:
                return jsonify({"error": "Patient not found"}), 404
    except Exception as e:
        logger.error(f"Patient endpoint error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/patients/<patient_id>/reports', methods=['GET'])
@require_auth
def get_patient_reports_endpoint(patient_id):
    """Get all reports for a patient"""
    try:
        # Get doctor_id from session (set by require_auth decorator)
        doctor_id = session.get('doctor_id')
        
        # Fallback: try to get from query parameters
        if not doctor_id:
            doctor_id = request.args.get('doctor_id')
            if doctor_id:
                doctor = get_doctor_by_id(str(doctor_id))
                if doctor:
                    session['doctor_id'] = str(doctor_id)
                    doctor_id = str(doctor_id)
        
        if not doctor_id:
            return jsonify({"error": "Authentication required. Please login again."}), 401
        
        reports = get_patient_reports(patient_id, str(doctor_id))
        
        return jsonify({
            "success": True,
            "patient_id": patient_id,
            "reports": reports
        })
    except Exception as e:
        logger.error(f"Get patient reports error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/reports/<report_id>', methods=['GET'])
@require_auth
def get_report_endpoint(report_id):
    """Get a specific report by ID"""
    try:
        doctor_id = session.get('doctor_id')
        report = get_report_by_id(int(report_id), doctor_id)
        
        if report:
            return jsonify({
                "success": True,
                "report": report
            })
        else:
            return jsonify({"error": "Report not found"}), 404
    except Exception as e:
        logger.error(f"Get report error: {e}")
        return jsonify({"error": str(e)}), 500

# Combined prediction endpoint for doctor-managed tests
@app.route('/api/predict_combined_full', methods=['POST'])
@require_auth
def predict_combined_full():
    """Full combined prediction (EEG + Biometric) with patient ID and report saving"""
    try:
        data = request.get_json()
        # Get doctor_id from session (set by require_auth decorator)
        doctor_id = session.get('doctor_id')
        
        # Fallback: try to get from request body or header
        if not doctor_id:
            doctor_id = data.get('doctor_id') or request.headers.get('X-Doctor-Id')
            if doctor_id:
                # Verify doctor exists and set in session
                doctor = get_doctor_by_id(str(doctor_id))
                if doctor:
                    session['doctor_id'] = str(doctor_id)
                    doctor_id = str(doctor_id)
        
        if not doctor_id:
            logger.error("No doctor_id found in session, body, or headers")
            return jsonify({"error": "Authentication required. Please login again."}), 401
        
        # Extract data
        patient_id = data.get('patient_id')
        patient_name = data.get('patient_name') or data.get('name')  # Patient name from frontend (support both keys)
        patient_age = data.get('patient_age') or data.get('age')  # Patient age from frontend (support both keys)
        eeg_data = data.get('eeg_data')
        biometric_data = data.get('biometric_data')
        eeg_weight = data.get('eeg_weight', 0.7)  # Updated default: EEG has higher weightage
        biometric_weight = data.get('biometric_weight', 0.3)  # Updated default: Biometric has lower weightage
        save_report = data.get('save_report', True)
        
        # Validate required fields
        if not patient_id:
            return jsonify({"error": "patient_id is required"}), 400
        
        if not eeg_data or not biometric_data:
            return jsonify({"error": "Both eeg_data and biometric_data are required"}), 400
        
        # Make individual predictions
        eeg_result = predict_eeg_with_models(eeg_data)
        biometric_result = predict_biometric_with_models(biometric_data)
        
        # Combine predictions
        combined_result = combine_predictions(
            eeg_result, 
            biometric_result,
            eeg_weight,
            biometric_weight
        )
        
        # Ensure patient exists (create if new, update name/age if provided)
        # create_patient will automatically update existing patients if name/age provided
        # Always call create_patient - it handles both create and update scenarios
        create_patient(patient_id, doctor_id, name=patient_name, age=patient_age)
        
        # Save report if requested
        if save_report:
            save_test_report(
                patient_id=patient_id,
                doctor_id=doctor_id,
                eeg_data=eeg_data,
                biometric_data=biometric_data,
                eeg_prediction=eeg_result,
                biometric_prediction=biometric_result,
                combined_prediction=combined_result
            )
        
        logger.info(f"Combined prediction for patient {patient_id}: {combined_result['primary_prediction']}")
        
        return jsonify({
            "success": True,
            "patient_id": patient_id,
            "eeg_prediction": eeg_result,
            "biometric_prediction": biometric_result,
            "combined_prediction": combined_result,
            "report_saved": save_report
        })
        
    except Exception as e:
        logger.error(f"Combined prediction error: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

@app.route('/', methods=['GET'])
def health_check():
    """Health check endpoint"""
    local_ip = get_local_ip()
    return jsonify({
        "status": "Flask server is running!",
        "server_ip": local_ip,
        "server_port": 5000,
        "endpoints": {
            "test": "/test",
            "arduino_data": "/latest_arduino_data",
            "eeg": "/predict_eeg",
            "biometric": "/predict_combined",
            "doctor_register": "/api/doctor/register",
            "doctor_login": "/api/doctor/login",
            "doctor_logout": "/api/doctor/logout",
            "combined_full": "/api/predict_combined_full"
        },
        "models_loaded": {
            "random_forest": random_forest_model is not None,
            "scaler": scaler is not None,
            "label_encoder": label_encoder is not None,
            "combined_model": combined_model is not None
        },
        "connection_info": {
            "arduino_should_connect_to": f"http://{local_ip}:5000/predict_combined"
        }
    })

if __name__ == '__main__':
    print("🔄 Loading machine learning models...")
    load_models()
    
    local_ip = get_local_ip()
    print(f"\n🚀 Starting Flask server with enhanced error handling...")
    print(f"📊 EEG Model: /predict_eeg (Random Forest + Scaler + Label Encoder)")
    print(f"💓 Biometric Model: /predict_combined (Combined Anxiety Model)")
    print(f"🌐 Server will run on http://{local_ip}:5000")
    print(f"🔧 CORS enabled for all origins")
    print(f"⚠️ Using mock predictions when models fail to load")
    print(f"📱 Arduino should connect to: http://{local_ip}:5000/predict_combined")
    print(f"🧪 Test endpoint: http://{local_ip}:5000/test")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
