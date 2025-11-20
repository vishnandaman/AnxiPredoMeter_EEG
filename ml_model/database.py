"""Database models and setup for doctor, patient, and test report management"""
import sqlite3
import hashlib
import json
from datetime import datetime
from typing import Optional, Dict, List, Tuple
import os

DATABASE_PATH = 'anxiety_clinic.db'

def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_database():
    """Initialize database tables"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Doctors table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS doctors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            license_number TEXT,
            created_at TEXT NOT NULL
        )
    ''')
    
    # Patients table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT UNIQUE NOT NULL,
            doctor_id INTEGER NOT NULL,
            name TEXT,
            age INTEGER,
            gender TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (doctor_id) REFERENCES doctors(id)
        )
    ''')
    
    # Test reports table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS test_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT NOT NULL,
            doctor_id INTEGER NOT NULL,
            test_date TEXT NOT NULL,
            eeg_data TEXT,
            biometric_data TEXT,
            eeg_prediction TEXT,
            biometric_prediction TEXT,
            combined_prediction TEXT,
            combined_confidence_scores TEXT,
            conflict_analysis TEXT,
            report_data TEXT,
            FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
            FOREIGN KEY (doctor_id) REFERENCES doctors(id)
        )
    ''')
    
    conn.commit()
    conn.close()
    print("✅ Database initialized successfully")

def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def create_doctor(email: str, password: str, name: str, license_number: str = None) -> Tuple[bool, str, Optional[Dict]]:
    """Create a new doctor account"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        password_hash = hash_password(password)
        created_at = datetime.now().isoformat()
        
        cursor.execute('''
            INSERT INTO doctors (email, password_hash, name, license_number, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (email, password_hash, name, license_number, created_at))
        
        conn.commit()
        doctor_id = cursor.lastrowid
        
        return True, "Doctor registered successfully", {
            'id': doctor_id,
            'email': email,
            'name': name,
            'license_number': license_number
        }
    except sqlite3.IntegrityError:
        return False, "Email already exists", None
    except Exception as e:
        return False, f"Error creating doctor: {str(e)}", None
    finally:
        conn.close()

def verify_doctor(email: str, password: str) -> Tuple[bool, str, Optional[Dict]]:
    """Verify doctor credentials"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    password_hash = hash_password(password)
    
    cursor.execute('''
        SELECT id, email, name, license_number FROM doctors
        WHERE email = ? AND password_hash = ?
    ''', (email, password_hash))
    
    doctor = cursor.fetchone()
    conn.close()
    
    if doctor:
        return True, "Login successful", {
            'id': doctor[0],
            'email': doctor[1],
            'name': doctor[2],
            'license_number': doctor[3]
        }
    else:
        return False, "Invalid email or password", None

def get_doctor_by_id(doctor_id: int) -> Optional[Dict]:
    """Get doctor by ID"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, email, name, license_number FROM doctors WHERE id = ?
    ''', (doctor_id,))
    
    doctor = cursor.fetchone()
    conn.close()
    
    if doctor:
        return {
            'id': doctor[0],
            'email': doctor[1],
            'name': doctor[2],
            'license_number': doctor[3]
        }
    return None

def get_all_doctors() -> List[Dict]:
    """Get all registered doctors (public listing)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, email, name, license_number FROM doctors ORDER BY name
    ''')
    
    doctors = []
    for row in cursor.fetchall():
        doctors.append({
            'id': row[0],
            'email': row[1],
            'name': row[2],
            'license_number': row[3]
        })
    
    conn.close()
    return doctors

def create_patient(patient_id: str, doctor_id: int, name: str = None, age: int = None, gender: str = None) -> Tuple[bool, str, Optional[Dict]]:
    """Create a new patient"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        created_at = datetime.now().isoformat()
        
        cursor.execute('''
            INSERT INTO patients (patient_id, doctor_id, name, age, gender, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (patient_id, doctor_id, name, age, gender, created_at))
        
        conn.commit()
        patient_db_id = cursor.lastrowid
        
        return True, "Patient created successfully", {
            'id': patient_db_id,
            'patient_id': patient_id,
            'doctor_id': doctor_id,
            'name': name,
            'age': age,
            'gender': gender
        }
    except sqlite3.IntegrityError:
        # Patient already exists, return existing patient
        cursor.execute('''
            SELECT id, patient_id, doctor_id, name, age, gender FROM patients
            WHERE patient_id = ?
        ''', (patient_id,))
        existing = cursor.fetchone()
        conn.close()
        if existing:
            return True, "Patient already exists", {
                'id': existing[0],
                'patient_id': existing[1],
                'doctor_id': existing[2],
                'name': existing[3],
                'age': existing[4],
                'gender': existing[5]
            }
        return False, "Error creating patient", None
    except Exception as e:
        conn.close()
        return False, f"Error creating patient: {str(e)}", None

def get_patient_by_id(patient_id: str, doctor_id: int) -> Optional[Dict]:
    """Get patient by patient_id"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, patient_id, doctor_id, name, age, gender, created_at FROM patients
        WHERE patient_id = ? AND doctor_id = ?
    ''', (patient_id, doctor_id))
    
    patient = cursor.fetchone()
    conn.close()
    
    if patient:
        return {
            'id': patient[0],
            'patient_id': patient[1],
            'doctor_id': patient[2],
            'name': patient[3],
            'age': patient[4],
            'gender': patient[5],
            'created_at': patient[6]
        }
    return None

def get_all_patients(doctor_id: int) -> List[Dict]:
    """Get all patients for a doctor"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, patient_id, doctor_id, name, age, gender, created_at FROM patients
        WHERE doctor_id = ?
        ORDER BY created_at DESC
    ''', (doctor_id,))
    
    patients = []
    for row in cursor.fetchall():
        patients.append({
            'id': row[0],
            'patient_id': row[1],
            'doctor_id': row[2],
            'name': row[3],
            'age': row[4],
            'gender': row[5],
            'created_at': row[6]
        })
    
    conn.close()
    return patients

def save_test_report(patient_id: str, doctor_id: int, eeg_data: Dict, biometric_data: Dict,
                    eeg_prediction: Dict, biometric_prediction: Dict, combined_prediction: Dict) -> Tuple[bool, str, Optional[Dict]]:
    """Save a test report"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        test_date = datetime.now().isoformat()
        
        cursor.execute('''
            INSERT INTO test_reports (
                patient_id, doctor_id, test_date,
                eeg_data, biometric_data,
                eeg_prediction, biometric_prediction,
                combined_prediction, combined_confidence_scores,
                conflict_analysis, report_data
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            patient_id,
            doctor_id,
            test_date,
            json.dumps(eeg_data),
            json.dumps(biometric_data),
            json.dumps(eeg_prediction),
            json.dumps(biometric_prediction),
            combined_prediction.get('primary_prediction', ''),
            json.dumps(combined_prediction.get('confidence_scores', [])),
            json.dumps(combined_prediction.get('conflict_analysis', {})),
            json.dumps(combined_prediction)
        ))
        
        conn.commit()
        report_id = cursor.lastrowid
        
        return True, "Report saved successfully", {
            'id': report_id,
            'patient_id': patient_id,
            'test_date': test_date
        }
    except Exception as e:
        conn.close()
        return False, f"Error saving report: {str(e)}", None

def get_patient_reports(patient_id: str, doctor_id: int) -> List[Dict]:
    """Get all reports for a patient"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, patient_id, test_date, eeg_prediction, biometric_prediction,
               combined_prediction, combined_confidence_scores, conflict_analysis, report_data
        FROM test_reports
        WHERE patient_id = ? AND doctor_id = ?
        ORDER BY test_date DESC
    ''', (patient_id, doctor_id))
    
    reports = []
    for row in cursor.fetchall():
        reports.append({
            'id': row[0],
            'patient_id': row[1],
            'test_date': row[2],
            'eeg_prediction': json.loads(row[3]) if row[3] else None,
            'biometric_prediction': json.loads(row[4]) if row[4] else None,
            'combined_prediction': row[5],
            'combined_confidence_scores': json.loads(row[6]) if row[6] else [],
            'conflict_analysis': json.loads(row[7]) if row[7] else {},
            'report_data': json.loads(row[8]) if row[8] else {}
        })
    
    conn.close()
    return reports

def get_report_by_id(report_id: int, doctor_id: int) -> Optional[Dict]:
    """Get a specific report by ID"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, patient_id, test_date, eeg_data, biometric_data,
               eeg_prediction, biometric_prediction, combined_prediction,
               combined_confidence_scores, conflict_analysis, report_data
        FROM test_reports
        WHERE id = ? AND doctor_id = ?
    ''', (report_id, doctor_id))
    
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return {
            'id': row[0],
            'patient_id': row[1],
            'test_date': row[2],
            'eeg_data': json.loads(row[3]) if row[3] else None,
            'biometric_data': json.loads(row[4]) if row[4] else None,
            'eeg_prediction': json.loads(row[5]) if row[5] else None,
            'biometric_prediction': json.loads(row[6]) if row[6] else None,
            'combined_prediction': row[7],
            'combined_confidence_scores': json.loads(row[8]) if row[8] else [],
            'conflict_analysis': json.loads(row[9]) if row[9] else {},
            'report_data': json.loads(row[10]) if row[10] else {}
        }
    return None

# Initialize database on import
init_database()

