"""
Firebase Configuration for AnxiePredict
Loads Firebase configuration from .env file using environment variables
"""
import os
from dotenv import load_dotenv

# Load environment variables from .env file
# Looks for .env file in ml_model directory first, then parent directory
env_path = os.path.join(os.path.dirname(__file__), '.env')
if not os.path.exists(env_path):
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(dotenv_path=env_path)

def load_firebase_config():
    """
    Load Firebase configuration from .env file.
    
    Expected environment variables in .env:
    FIREBASE_API_KEY=your-api-key
    FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
    FIREBASE_PROJECT_ID=your-project-id
    FIREBASE_STORAGE_BUCKET=your-project.appspot.com
    FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
    FIREBASE_APP_ID=your-app-id
    FIREBASE_MEASUREMENT_ID=your-measurement-id
    GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccountKey.json (optional)
    
    Returns:
        dict: Firebase configuration dictionary
    """
    config = {
        "apiKey": os.getenv("FIREBASE_API_KEY"),
        "authDomain": os.getenv("FIREBASE_AUTH_DOMAIN"),
        "projectId": os.getenv("FIREBASE_PROJECT_ID"),
        "storageBucket": os.getenv("FIREBASE_STORAGE_BUCKET"),
        "messagingSenderId": os.getenv("FIREBASE_MESSAGING_SENDER_ID"),
        "appId": os.getenv("FIREBASE_APP_ID"),
        "measurementId": os.getenv("FIREBASE_MEASUREMENT_ID")
    }
    
    # Check if required fields are set
    required_fields = ["apiKey", "authDomain", "projectId"]
    missing_fields = [field for field in required_fields if not config.get(field)]
    
    if missing_fields:
        print(f"⚠️ Missing required Firebase environment variables: {', '.join(missing_fields)}")
        print("   Please set them in .env file")
        return None
    else:
        print("✅ Firebase config loaded from .env file")
        return config

# Load Firebase configuration
FIREBASE_CONFIG = load_firebase_config()

