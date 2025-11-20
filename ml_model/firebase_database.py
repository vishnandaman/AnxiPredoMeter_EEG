"""
Firebase Firestore Database Operations
Replaces SQLite database with Firebase Firestore
"""
from firebase_admin import credentials, firestore, initialize_app
from google.cloud.firestore import Query
import firebase_admin
from datetime import datetime
from typing import Optional, Dict, List, Tuple
import hashlib
import os
import json

# Try to load Firebase config
try:
    from firebase_config import FIREBASE_CONFIG
except ImportError:
    FIREBASE_CONFIG = None

# Initialize Firebase Admin SDK
_db = None
_app = None

def initialize_firebase():
    """Initialize Firebase Admin SDK - Only uses explicit service account, no default credentials"""
    global _db, _app
    
    if _db is not None:
        return _db
    
    try:
        # Check if Firebase is already initialized
        if firebase_admin._apps:
            _app = firebase_admin.get_app()
        else:
            # Only use explicit service account key - NO default credentials
            cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
            service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "serviceAccountKey.json")
            
            # Try service account key path from env variable first
            if cred_path and os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                _app = initialize_app(cred)
                print(f"✅ Firebase initialized with service account: {cred_path}")
            # Try default service account path
            elif os.path.exists(service_account_path):
                cred = credentials.Certificate(service_account_path)
                _app = initialize_app(cred)
                print(f"✅ Firebase initialized with service account: {service_account_path}")
            else:
                # No service account found - raise clear error
                raise FileNotFoundError(
                    f"No Firebase service account key found. "
                    f"Please set GOOGLE_APPLICATION_CREDENTIALS environment variable "
                    f"or place serviceAccountKey.json in ml_model/ directory. "
                    f"Default credentials are not used for security reasons."
                )
        
        _db = firestore.client()
        print("✅ Firestore database initialized successfully")
        return _db
        
    except FileNotFoundError as e:
        print(f"❌ {e}")
        print("⚠️ Firebase initialization failed - service account required")
        raise
    except Exception as e:
        print(f"❌ Error initializing Firebase: {e}")
        print("⚠️ Make sure Firebase service account key is properly configured")
        raise

def get_db():
    """Get Firestore database instance"""
    if _db is None:
        return initialize_firebase()
    return _db

def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

# ==================== DOCTOR OPERATIONS ====================

def create_doctor(email: str, password: str, name: str, license_number: str = None) -> Tuple[bool, str, Optional[Dict]]:
    """Create a new doctor account"""
    try:
        db = get_db()
        doctors_ref = db.collection('doctors')
        
        # Check if email already exists
        existing = doctors_ref.where('email', '==', email).limit(1).stream()
        if any(existing):
            return False, "Email already exists", None
        
        password_hash = hash_password(password)
        created_at = datetime.now().isoformat()
        
        doctor_data = {
            'email': email,
            'password_hash': password_hash,
            'name': name,
            'license_number': license_number,
            'created_at': created_at
        }
        
        doc_ref = doctors_ref.add(doctor_data)[1]
        doctor_id = doc_ref.id
        
        return True, "Doctor registered successfully", {
            'id': doctor_id,
            'email': email,
            'name': name,
            'license_number': license_number
        }
    except Exception as e:
        return False, f"Error creating doctor: {str(e)}", None

def verify_doctor(email: str, password: str) -> Tuple[bool, str, Optional[Dict]]:
    """Verify doctor credentials"""
    try:
        db = get_db()
        doctors_ref = db.collection('doctors')
        
        password_hash = hash_password(password)
        
        # Query for doctor with matching email and password
        query = doctors_ref.where('email', '==', email).where('password_hash', '==', password_hash).limit(1)
        docs = list(query.stream())
        
        if docs:
            doc = docs[0]
            doctor_data = doc.to_dict()
            return True, "Login successful", {
                'id': doc.id,
                'email': doctor_data.get('email'),
                'name': doctor_data.get('name'),
                'license_number': doctor_data.get('license_number')
            }
        else:
            return False, "Invalid email or password", None
    except Exception as e:
        return False, f"Error verifying doctor: {str(e)}", None

def get_doctor_by_id(doctor_id: str) -> Optional[Dict]:
    """Get doctor by ID"""
    try:
        db = get_db()
        doctor_doc = db.collection('doctors').document(doctor_id).get()
        
        if doctor_doc.exists:
            data = doctor_doc.to_dict()
            return {
                'id': doctor_doc.id,
                'email': data.get('email'),
                'name': data.get('name'),
                'license_number': data.get('license_number')
            }
        return None
    except Exception as e:
        print(f"Error getting doctor: {e}")
        return None

def get_all_doctors() -> List[Dict]:
    """Get all registered doctors (public listing)"""
    try:
        db = get_db()
        doctors_ref = db.collection('doctors')
        docs = list(doctors_ref.stream())
        
        doctors = []
        for doc in docs:
            data = doc.to_dict()
            # Only return public information (no password hash)
            doctors.append({
                'id': doc.id,
                'name': data.get('name'),
                'email': data.get('email'),
                'license_number': data.get('license_number')
            })
        
        print(f"✅ Retrieved {len(doctors)} doctors")
        return doctors
    except Exception as e:
        print(f"❌ Error getting all doctors: {e}")
        import traceback
        traceback.print_exc()
        return []

# ==================== PATIENT OPERATIONS ====================

def create_patient(patient_id: str, doctor_id: str, name: str = None, age: int = None, gender: str = None) -> Tuple[bool, str, Optional[Dict]]:
    """Create a new patient - always linked to the creating doctor"""
    try:
        # Ensure both IDs are strings for consistent storage
        patient_id = str(patient_id)
        doctor_id = str(doctor_id)
        
        db = get_db()
        patients_ref = db.collection('patients')
        
        # Check if patient already exists for THIS doctor specifically
        existing = patients_ref.where('patient_id', '==', patient_id).where('doctor_id', '==', doctor_id).limit(1).stream()
        existing_list = list(existing)
        
        if existing_list:
            # Patient already exists for this doctor, update if name/age provided
            doc = existing_list[0]
            doc_ref = patients_ref.document(doc.id)
            data = doc.to_dict()
            
            # Update name/age if provided (even if they're empty strings, update them)
            update_data = {}
            if name is not None and name != '':
                update_data['name'] = name
            if age is not None and age != '':
                # Convert age to int if it's a string
                try:
                    update_data['age'] = int(age) if isinstance(age, str) else age
                except (ValueError, TypeError):
                    update_data['age'] = age
            if gender is not None and gender != '':
                update_data['gender'] = gender
            
            # Update the document if there's data to update
            if update_data:
                doc_ref.update(update_data)
                print(f"✅ Updated existing patient {patient_id} for doctor_id: {doctor_id} with data: {update_data}")
                # Return updated data
                updated_data = {**data, **update_data}
                return True, "Patient updated", {
                    'id': doc.id,
                    'patient_id': updated_data.get('patient_id'),
                    'doctor_id': updated_data.get('doctor_id'),
                    'name': updated_data.get('name'),
                    'age': updated_data.get('age'),
                    'gender': updated_data.get('gender')
                }
            else:
                # No update needed, return existing
                print(f"✅ Patient {patient_id} already exists for doctor_id: {doctor_id}")
                return True, "Patient already exists", {
                    'id': doc.id,
                    'patient_id': data.get('patient_id'),
                    'doctor_id': data.get('doctor_id'),
                    'name': data.get('name'),
                    'age': data.get('age'),
                    'gender': data.get('gender')
                }
        
        # Create new patient - ALWAYS linked to this doctor
        created_at = datetime.now().isoformat()
        
        # Convert age to int if it's a string and not empty
        age_value = None
        if age is not None and age != '':
            try:
                age_value = int(age) if isinstance(age, str) else age
            except (ValueError, TypeError):
                age_value = age
        
        # Convert empty strings to None
        name_value = name if (name and name != '') else None
        gender_value = gender if (gender and gender != '') else None
        
        patient_data = {
            'patient_id': patient_id,
            'doctor_id': doctor_id,  # Ensures patient belongs to this doctor
            'name': name_value,
            'age': age_value,
            'gender': gender_value,
            'created_at': created_at
        }
        
        doc_ref = patients_ref.add(patient_data)[1]
        
        print(f"✅ Created new patient {patient_id} for doctor_id: {doctor_id}")
        return True, "Patient created successfully", {
            'id': doc_ref.id,
            'patient_id': patient_id,
            'doctor_id': doctor_id,
            'name': name_value,
            'age': age_value,
            'gender': gender_value
        }
    except Exception as e:
        print(f"❌ Error creating patient {patient_id} for doctor {doctor_id}: {e}")
        return False, f"Error creating patient: {str(e)}", None

def update_patient(patient_id: str, doctor_id: str, name: str = None, age: int = None, gender: str = None) -> Tuple[bool, str]:
    """Update patient information (name, age, gender)"""
    try:
        patient_id = str(patient_id)
        doctor_id = str(doctor_id)
        
        db = get_db()
        patients_ref = db.collection('patients')
        
        # Find the patient document
        query = patients_ref.where('patient_id', '==', patient_id).where('doctor_id', '==', doctor_id).limit(1)
        docs = list(query.stream())
        
        if not docs:
            return False, "Patient not found"
        
        doc_ref = patients_ref.document(docs[0].id)
        update_data = {}
        
        if name is not None and name != '':
            update_data['name'] = name
        if age is not None and age != '':
            # Convert age to int if it's a string
            try:
                age_value = int(age) if isinstance(age, str) else age
                update_data['age'] = age_value
            except (ValueError, TypeError):
                update_data['age'] = age
        if gender is not None and gender != '':
            update_data['gender'] = gender
        
        if update_data:
            doc_ref.update(update_data)
            print(f"✅ Updated patient {patient_id} for doctor_id: {doctor_id} with data: {update_data}")
            return True, "Patient updated successfully"
        else:
            return False, "No data to update"
    except Exception as e:
        print(f"❌ Error updating patient {patient_id} for doctor {doctor_id}: {e}")
        return False, f"Error updating patient: {str(e)}"

def get_patient_by_id(patient_id: str, doctor_id: str) -> Optional[Dict]:
    """Get patient by patient_id - ONLY if patient belongs to this doctor"""
    try:
        # Ensure both IDs are strings for consistent comparison
        patient_id = str(patient_id)
        doctor_id = str(doctor_id)
        
        db = get_db()
        patients_ref = db.collection('patients')
        
        # Filter by BOTH patient_id AND doctor_id to ensure security
        query = patients_ref.where('patient_id', '==', patient_id).where('doctor_id', '==', doctor_id).limit(1)
        docs = list(query.stream())
        
        if docs:
            doc = docs[0]
            data = doc.to_dict()
            # Double-check that patient belongs to this doctor
            patient_doctor_id = str(data.get('doctor_id', ''))
            if patient_doctor_id == doctor_id:
                return {
                    'id': doc.id,
                    'patient_id': data.get('patient_id'),
                    'doctor_id': data.get('doctor_id'),
                    'name': data.get('name'),
                    'age': data.get('age'),
                    'gender': data.get('gender'),
                    'created_at': data.get('created_at')
                }
        print(f"⚠️ Patient {patient_id} not found for doctor_id: {doctor_id}")
        return None
    except Exception as e:
        print(f"❌ Error getting patient {patient_id} for doctor {doctor_id}: {e}")
        return None

def get_all_patients(doctor_id: str) -> List[Dict]:
    """Get all patients for a doctor - ONLY returns patients belonging to this doctor (OPTIMIZED)"""
    try:
        # Ensure doctor_id is a string for consistent comparison
        doctor_id = str(doctor_id)
        
        db = get_db()
        patients_ref = db.collection('patients')
        
        # Optimized query: Filter ONLY by doctor_id (most efficient query)
        # Using limit() is not needed here as we want all patients for the doctor
        query = patients_ref.where('doctor_id', '==', doctor_id)
        docs = list(query.stream())  # Convert to list once for better performance
        
        patients = []
        for doc in docs:
            data = doc.to_dict()
            
            # Security check: ensure patient belongs to this doctor
            patient_doctor_id = str(data.get('doctor_id', ''))
            if patient_doctor_id == doctor_id:
                patients.append({
                    'id': doc.id,
                    'patient_id': data.get('patient_id'),
                    'doctor_id': data.get('doctor_id'),
                    'name': data.get('name') or None,  # Ensure None instead of empty string
                    'age': data.get('age') or None,    # Ensure None instead of 0 or empty
                    'gender': data.get('gender') or None,
                    'created_at': data.get('created_at')
                })
        
        # Sort by created_at in descending order (newest first) - done in Python
        if patients:
            try:
                patients.sort(key=lambda x: x.get('created_at') or '', reverse=True)
            except Exception:
                # If sorting fails, return as-is
                pass
        
        print(f"✅ Retrieved {len(patients)} patients for doctor_id: {doctor_id}")
        return patients
    except Exception as e:
        print(f"❌ Error getting patients for doctor {doctor_id}: {e}")
        import traceback
        traceback.print_exc()
        return []

# ==================== TEST REPORT OPERATIONS ====================

def save_test_report(patient_id: str, doctor_id: str, eeg_data: Dict, biometric_data: Dict,
                    eeg_prediction: Dict, biometric_prediction: Dict, combined_prediction: Dict) -> Tuple[bool, str, Optional[Dict]]:
    """Save a test report - always linked to the doctor who created it"""
    try:
        # Ensure both IDs are strings for consistent storage
        patient_id = str(patient_id)
        doctor_id = str(doctor_id)
        
        db = get_db()
        reports_ref = db.collection('test_reports')
        
        test_date = datetime.now().isoformat()
        
        # Save report with doctor_id to ensure it belongs to this doctor
        report_data = {
            'patient_id': patient_id,
            'doctor_id': doctor_id,  # Ensures report belongs to this doctor
            'test_date': test_date,
            'eeg_data': eeg_data,
            'biometric_data': biometric_data,
            'eeg_prediction': eeg_prediction,
            'biometric_prediction': biometric_prediction,
            'combined_prediction': combined_prediction.get('primary_prediction', ''),
            'combined_confidence_scores': combined_prediction.get('confidence_scores', []),
            'conflict_analysis': combined_prediction.get('conflict_analysis', {}),
            'report_data': combined_prediction
        }
        
        doc_ref = reports_ref.add(report_data)[1]
        report_id = doc_ref.id
        
        print(f"✅ Saved report {report_id} for patient {patient_id} by doctor_id: {doctor_id}")
        return True, "Report saved successfully", {
            'id': report_id,
            'patient_id': patient_id,
            'test_date': test_date
        }
    except Exception as e:
        print(f"❌ Error saving report for patient {patient_id} by doctor {doctor_id}: {e}")
        return False, f"Error saving report: {str(e)}", None

def get_patient_reports(patient_id: str, doctor_id: str) -> List[Dict]:
    """Get all reports for a patient - ONLY returns reports belonging to this doctor (OPTIMIZED)"""
    try:
        # Ensure both IDs are strings for consistent comparison
        patient_id = str(patient_id)
        doctor_id = str(doctor_id)
        
        db = get_db()
        reports_ref = db.collection('test_reports')
        
        # Optimized query: Filter by BOTH patient_id AND doctor_id
        # Convert stream to list once for better performance
        query = reports_ref.where('patient_id', '==', patient_id).where('doctor_id', '==', doctor_id)
        docs = list(query.stream())
        
        reports = []
        for doc in docs:
            data = doc.to_dict()
            # Security check: ensure report belongs to this doctor
            report_doctor_id = str(data.get('doctor_id', ''))
            if report_doctor_id == doctor_id:
                reports.append({
                    'id': doc.id,
                    'patient_id': data.get('patient_id'),
                    'test_date': data.get('test_date'),
                    'eeg_prediction': data.get('eeg_prediction'),
                    'biometric_prediction': data.get('biometric_prediction'),
                    'combined_prediction': data.get('combined_prediction'),
                    'combined_confidence_scores': data.get('combined_confidence_scores', []),
                    'conflict_analysis': data.get('conflict_analysis', {}),
                    'report_data': data.get('report_data')
                })
        
        # Sort by test_date in descending order (newest first) - done in Python
        if reports:
            try:
                reports.sort(key=lambda x: x.get('test_date') or '', reverse=True)
            except Exception:
                # If sorting fails, return as-is
                pass
        
        print(f"✅ Retrieved {len(reports)} reports for patient {patient_id} belonging to doctor_id: {doctor_id}")
        return reports
    except Exception as e:
        print(f"❌ Error getting reports for patient {patient_id} for doctor {doctor_id}: {e}")
        import traceback
        traceback.print_exc()
        return []

def get_report_by_id(report_id: str, doctor_id: str) -> Optional[Dict]:
    """Get a specific report by ID"""
    try:
        db = get_db()
        report_doc = db.collection('test_reports').document(report_id).get()
        
        if report_doc.exists:
            data = report_doc.to_dict()
            # Verify it belongs to the doctor
            if data.get('doctor_id') != doctor_id:
                return None
            
            return {
                'id': report_doc.id,
                'patient_id': data.get('patient_id'),
                'test_date': data.get('test_date'),
                'eeg_data': data.get('eeg_data'),
                'biometric_data': data.get('biometric_data'),
                'eeg_prediction': data.get('eeg_prediction'),
                'biometric_prediction': data.get('biometric_prediction'),
                'combined_prediction': data.get('combined_prediction'),
                'combined_confidence_scores': data.get('combined_confidence_scores', []),
                'conflict_analysis': data.get('conflict_analysis', {}),
                'report_data': data.get('report_data')
            }
        return None
    except Exception as e:
        print(f"Error getting report: {e}")
        return None

def delete_patient(patient_id: str, doctor_id: str) -> Tuple[bool, str]:
    """Delete a patient and all their reports - ONLY if patient belongs to this doctor"""
    try:
        patient_id = str(patient_id)
        doctor_id = str(doctor_id)
        
        db = get_db()
        
        # First verify patient exists and belongs to this doctor
        patient = get_patient_by_id(patient_id, doctor_id)
        if not patient:
            return False, f"Patient {patient_id} not found or doesn't belong to this doctor"
        
        # Get patient document ID
        patients_ref = db.collection('patients')
        query = patients_ref.where('patient_id', '==', patient_id).where('doctor_id', '==', doctor_id).limit(1)
        docs = list(query.stream())
        
        if not docs:
            return False, f"Patient {patient_id} not found"
        
        patient_doc = docs[0]
        patient_doc_id = patient_doc.id
        
        # Delete all reports for this patient
        reports_ref = db.collection('test_reports')
        reports_query = reports_ref.where('patient_id', '==', patient_id).where('doctor_id', '==', doctor_id)
        reports_docs = list(reports_query.stream())
        
        deleted_reports_count = 0
        for report_doc in reports_docs:
            report_doc.reference.delete()
            deleted_reports_count += 1
        
        # Delete patient document
        patient_doc.reference.delete()
        
        print(f"✅ Deleted patient {patient_id} (doc_id: {patient_doc_id}) and {deleted_reports_count} report(s) for doctor_id: {doctor_id}")
        return True, f"Patient {patient_id} and {deleted_reports_count} report(s) deleted successfully"
    except Exception as e:
        print(f"❌ Error deleting patient {patient_id} for doctor {doctor_id}: {e}")
        import traceback
        traceback.print_exc()
        return False, f"Error deleting patient: {str(e)}"

