import os
import pickle
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import socket

# Configure logging with more detailed output
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

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
            "biometric": "/predict_combined"
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
