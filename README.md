AnxiePredict – Real-Time Multimodal Anxiety Detection System

AnxiePredict is a multimodal health-tech platform that analyzes EEG, GSR, and SpO2 sensor data in real time to predict anxiety levels.
This system integrates:

Real-time EEG data collection

Biometric sensor streaming from Arduino

A Python-based ML backend

A React.js dashboard for visualization

Doctor dashboard + automated data pipeline

🚀 Features

Automatic real-time EEG signal acquisition

Biometric data streaming from Arduino via local network

Real-time ML predictions (Flask backend)

Interactive web dashboard (React + Vite)

Doctor dashboard for patient monitoring

Multi-sensor fusion for improved accuracy

📦 Project Structure
├── EEG/                         # EEG real-time acquisition system
│   └── cortex_run.py
├── ml_model/                    # ML model + preprocessing
├── src/                         # Frontend (React)
├── backend/
│   └── app_comined.py           # Main ML & API server
├── arduino_improved.ino         # Arduino biometric firmware
├── PROJECT_REPORT_FLOW.md
├── REALTIME_EEG_CHANGES.md
├── COMMIT_REALTIME_EEG.md
├── package.json
└── index.html

✅ Prerequisites
System Requirements

Python 3.9+

Node.js 18+

Arduino with GSR / SpO2 sensors

Cortex / EEG headset

Local WiFi network

Python Dependencies

Install from your backend folder:

pip install -r requirements.txt

Frontend Dependencies
npm install

⚙️ Setup & Running Instructions
1️⃣ Start Real-Time EEG Stream
cd EEG
python cortex_run.py

2️⃣ Start Biometric Sensor Stream

Connect the Arduino device

Run ipconfig to find your local IP address

Enter the IP in the UI

Click Auto-fill to fetch data automatically

3️⃣ Start the Frontend
cd frontend
npm run dev


The dashboard will run on:
👉 http://localhost:5173

4️⃣ Start the ML Backend
cd backend
python app_comined.py


Backend runs on:
👉 http://127.0.0.1:5000

🧠 How It Works

EEG readings are streamed automatically using cortex_run.py

Arduino transmits biometric readings to backend via local IP

app_comined.py processes signals and sends predictions

React dashboard visualizes real-time sensor streams

Doctor dashboard aggregates patient data

Machine learning model (Random Forest) performs anxiety prediction

🧪 Technologies Used
Backend

Python, Flask

NumPy, Pandas

Scikit-learn

WebSockets

EEG Cortex SDK

Frontend

React.js (Vite)

Tailwind CSS

Recharts / live visualization components

Hardware

Arduino (GSR + SpO2)

EEG Headset

👤 Author

Aman Vishwakarma (vishnandaman)
GitHub: https://github.com/vishnandaman
