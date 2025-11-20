import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Lottie from 'lottie-react';
import { FaBrain, FaHeartbeat, FaThermometerHalf, FaCheckCircle, FaArrowRight, FaHome, FaSync, FaUser, FaIdCard, FaPrint, FaFilePdf, FaUserMd } from 'react-icons/fa';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import EEGInputForm from '../components/EEGInputForm';
import BiometricInputForm from '../components/BiometricInputForm';
import ConfidenceReport from '../components/ConfidenceReport';
import ResultsSection from '../components/ResultsSection';
import '../components/ResultsSection.css'; // Ensure styles are available for report-saved step
import brainAnimation from '../animations/Brain Simulation.json';
import signalAnalysis from '../animations/Signal analysis.json';
import dataAnalysis from '../animations/Data Analysis.json';
import handSwipe from '../animations/Hand Swipe.json';
import successAnimation from '../animations/Success.json';
import './RealTimeTest.css';

const SERVER_CANDIDATES = [
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || null,
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) || null,
  'http://127.0.0.1:5000',
  'http://localhost:5000',
  'http://172.22.48.129:5000',
  'http://192.168.154.1:5000'
].filter(Boolean);

const RealTimeTest = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [eegPrediction, setEegPrediction] = useState(null);
  const [biometricPrediction, setBiometricPrediction] = useState(null);
  const [combinedPrediction, setCombinedPrediction] = useState(null);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [generationTime, setGenerationTime] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'saving', 'saved', 'error', null
  const [error, setError] = useState(null);
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [doctorLoggedIn, setDoctorLoggedIn] = useState(false);

  // autofill states
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [autoFillError, setAutoFillError] = useState(null);
  const [serverBase, setServerBase] = useState(SERVER_CANDIDATES[0] || 'http://127.0.0.1:5000');

  // separate storage: averaged band powers (used for submission) and raw payload (for preview)
  const [prefillEegBands, setPrefillEegBands] = useState(null);
  const [prefillEegRaw, setPrefillEegRaw] = useState(null);
  const [prefillBiometric, setPrefillBiometric] = useState(null);
  const [eegData, setEegData] = useState(null);
  const [biometricData, setBiometricData] = useState(null);

  // Refs for managing async operations
  const timerIntervalRef = useRef(null);

  // Check doctor authentication
  useEffect(() => {
    const loggedIn = localStorage.getItem('isDoctorLoggedIn') === 'true';
    if (!loggedIn) {
      toast.warning('Please login to access Real-Time Test', {
        position: "top-right",
        autoClose: 3000,
      });
      navigate('/doctor-login');
      return;
    }
    setDoctorLoggedIn(true);
    
    // Welcome notification
    const doctorData = localStorage.getItem('doctor');
    if (doctorData) {
      const doctor = JSON.parse(doctorData);
      toast.info(`Ready to start test, ${doctor?.name || 'Doctor'}!`, {
        position: "top-right",
        autoClose: 2000,
      });
    }
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const c of SERVER_CANDIDATES) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 1200);
          const res = await fetch(`${c}/test`, { signal: controller.signal });
          clearTimeout(timer);
          if (!cancelled && res.ok) {
            setServerBase(c);
            break;
          }
        } catch (e) {
          // next candidate
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const steps = [
    { id: 'patient-id', title: 'Patient Information', subtitle: 'Please enter the patient ID for this test.', animation: brainAnimation, showButton: false, showForm: true },
    { id: 'welcome', title: 'Welcome to AnxiePredict', subtitle: `Starting anxiety assessment for Patient ID: ${patientId || 'Not set'}`, animation: brainAnimation, showButton: true, buttonText: 'Start Real-Time Test', buttonIcon: <FaArrowRight /> },
    { id: 'eeg-setup', title: 'EEG Device Setup', subtitle: 'Please wear your EEG headband and confirm when ready.', animation: handSwipe, showButton: true, buttonText: 'Confirm Setup', buttonIcon: <FaCheckCircle /> },
    { id: 'eeg-connection', title: 'Establishing Connection', subtitle: 'Great! Setting up the connection...', animation: brainAnimation, showButton: false, autoProgress: true, duration: 3000 },
    { id: 'eeg-input', title: 'EEG Data Input', subtitle: 'Please enter your EEG wave data for analysis.', animation: signalAnalysis, showButton: false, showForm: true },
    { id: 'eeg-prediction', title: 'EEG Signal Analysis', subtitle: 'Analyzing your neural patterns...', animation: signalAnalysis, showButton: false, autoProgress: true, duration: 4000 },
    { id: 'eeg-analyzing', title: 'Processing EEG Data', subtitle: 'Analyzing brain wave patterns...', animation: dataAnalysis, showButton: false, autoProgress: true, duration: 4000 },
    { id: 'eeg-result', title: 'EEG Analysis Complete', subtitle: 'Your neural patterns have been analyzed.', animation: successAnimation, showButton: true, buttonText: 'Continue to Biometrics', buttonIcon: <FaArrowRight /> },
    { id: 'biometric-setup', title: 'Biometric Device Setup', subtitle: 'Now, place your finger gently on the oximeter and wear the GSR sensors.', animation: handSwipe, showButton: true, buttonText: 'Confirm Setup', buttonIcon: <FaCheckCircle /> },
    { id: 'biometric-input', title: 'Biometric Data Input', subtitle: 'Please enter your GSR and SpO2 data for analysis.', animation: signalAnalysis, showButton: false, showForm: true },
    { id: 'biometric-analyzing', title: 'Processing Biometric Data', subtitle: 'Analyzing biometric indicators...', animation: dataAnalysis, showButton: false, autoProgress: true, duration: 4000 },
    { id: 'biometric-result', title: 'Biometric Analysis Complete', subtitle: 'Your physiological patterns have been analyzed.', animation: successAnimation, showButton: true, buttonText: 'Generate Combined Report', buttonIcon: <FaArrowRight /> },
    { id: 'generating-report', title: 'Generating Combined Report', subtitle: 'Combining your EEG and Biometric predictions...', animation: dataAnalysis, showButton: false },
    { id: 'report-saved', title: 'Report Generated Successfully', subtitle: 'Your combined anxiety assessment report has been saved to the database.', animation: successAnimation, showButton: true, buttonText: 'View Final Report', buttonIcon: <FaArrowRight /> },
    { id: 'final-result', title: 'Final Anxiety Assessment', subtitle: 'Your comprehensive anxiety assessment is ready.', animation: successAnimation, showButton: false }
  ];

  const currentStepData = steps[currentStep];

  useEffect(() => {
    if (currentStepData.autoProgress) {
      const timer = setTimeout(() => { handleNextStep(); }, currentStepData.duration);
      return () => clearTimeout(timer);
    }
  }, [currentStep, currentStepData]);


  const handleNextStep = async () => {
    // If we're on biometric-result step and both predictions exist, generate report INSTANTLY
    if (currentStepData.id === 'biometric-result' && eegPrediction && biometricPrediction && eegData && biometricData) {
      // Generate report INSTANTLY (client-side) - no waiting, no generating step!
      await combineAndSaveReport();
    } else if (currentStepData.id === 'report-saved') {
      // Navigate to Medical Report page with all data
      const testDate = new Date().toLocaleString();
      navigate('/medical-report', {
        state: {
          patientId,
          patientName,
          patientAge,
          eegData,
          biometricData,
          eegPrediction,
          biometricPrediction,
          combinedPrediction,
          testDate
        }
      });
    } else {
      // Normal step progression
      if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
    }
  };

  // normalize backend payloads into averaged band powers object { delta, theta, alpha, beta, gamma }
  const normalizeEegAverages = (payload) => {
    if (!payload) return null;
    const toNumber = v => { const n = Number(v); return Number.isFinite(n) ? n : null; };
    const mean = arr => arr.reduce((s, x) => s + x, 0) / (arr.length || 1);

    if (payload.data) payload = payload.data;
    if (payload.avg) payload = payload.avg;
    if (payload.averages) payload = payload.averages;

    const bandOrder = ['delta', 'theta', 'alpha', 'beta', 'gamma'];
    // already shaped
    const keys = Object.keys(payload || {});
    if (bandOrder.every(k => keys.includes(k))) {
      return {
        delta: toNumber(payload.delta),
        theta: toNumber(payload.theta),
        alpha: toNumber(payload.alpha),
        beta: toNumber(payload.beta),
        gamma: toNumber(payload.gamma)
      };
    }

    // array of per-channel objects -> average across channels
    if (Array.isArray(payload) && payload.length > 0 && typeof payload[0] === 'object') {
      const result = {};
      bandOrder.forEach(b => {
        const vals = payload.map(p => toNumber(p[b])).filter(v => v !== null);
        if (vals.length) result[b] = mean(vals);
      });
      if (Object.keys(result).length) return result;
    }

    // object of channels {ch1: {...}, ch2: {...}}
    if (typeof payload === 'object') {
      const channelValues = {};
      Object.values(payload).forEach(ch => {
        if (ch && typeof ch === 'object') {
          bandOrder.forEach(b => {
            const v = toNumber(ch[b]);
            if (v !== null) {
              channelValues[b] = channelValues[b] || [];
              channelValues[b].push(v);
            }
          });
        }
      });
      const result = {};
      Object.entries(channelValues).forEach(([b, arr]) => { result[b] = mean(arr); });
      if (Object.keys(result).length) return result;
    }

    // array of arrays [delta,theta,alpha,beta,gamma] -> avg columns
    if (Array.isArray(payload) && Array.isArray(payload[0]) && payload[0].length >= 5) {
      const cols = bandOrder.map((_, idx) => payload.map(row => toNumber(row[idx])).filter(v => v !== null));
      const result = {};
      cols.forEach((col, i) => { if (col.length) result[bandOrder[i]] = mean(col); });
      if (Object.keys(result).length) return result;
    }

    return null;
  };

  const handleEEGSubmit = async (eegDataInput) => {
    setIsAnalyzing(true);
    setError(null);
    setCurrentStep(4); // show prediction animation
    setEegData(eegDataInput);

    try {
      const response = await fetch(`${serverBase}/predict_eeg`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(eegDataInput)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (result.error) {
        setError("EEG Prediction Error: " + result.error);
        setCurrentStep(3); // back to input
      } else {
        setEegPrediction({
          result: result.primary_prediction || result.prediction || 'Unknown',
          confidence_scores: result.confidence_scores || result.scores || {},
          data: eegDataInput
        });
        
        // Show EEG prediction success notification
        toast.success('✅ EEG prediction completed successfully!', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        
        // immediately show results section
        setCurrentStep(6); // 'eeg-result'
      }
    } catch (err) {
      console.error('EEG Error', err);
      setError(`Failed to connect to EEG prediction service. Ensure Flask running at ${serverBase}`);
      setCurrentStep(3);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBiometricSubmit = async (biometricData) => {
    setIsAnalyzing(true);
    setError(null);
    setCurrentStep(9); // biometric-analyzing
    setBiometricData(biometricData);
    
    try {
      // Store biometric prediction for combination
      const response = await fetch(`${serverBase}/predict_combined`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(biometricData)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (result.error) {
        setError("Biometric Prediction Error: " + result.error);
        setCurrentStep(8); // biometric-input
        toast.error(`❌ Biometric Prediction Error: ${result.error}`, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      } else {
        setBiometricPrediction({
          result: result.primary_prediction || result.prediction || 'Unknown',
          confidence_scores: result.confidence_scores || result.scores || {},
          data: biometricData
        });
        
        // Show biometric result first
        toast.success('✅ Biometric prediction completed successfully!', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        setCurrentStep(10); // biometric-result (shows biometric report)
      }
    } catch (err) {
      console.error('Biometric Error', err);
      setError(`Failed to connect to biometric prediction service. Ensure Flask running at ${serverBase}`);
      setCurrentStep(8); // biometric-input
      toast.error(`❌ Failed to connect to biometric prediction service: ${err.message || 'Network error'}`, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Client-side prediction combination (INSTANT - no waiting)
  const combinePredictionsClientSide = (eegPred, biometricPred, eegWeight = 0.7, biometricWeight = 0.3) => {
    // Get all unique disorders from both predictions
    const allDisorders = new Set();
    
    // Add EEG disorders
    if (eegPred.confidence_scores && Array.isArray(eegPred.confidence_scores)) {
      eegPred.confidence_scores.forEach(item => {
        if (item.disorder) allDisorders.add(item.disorder);
      });
    }
    
    // Add Biometric disorders
    if (biometricPred.confidence_scores && Array.isArray(biometricPred.confidence_scores)) {
      biometricPred.confidence_scores.forEach(item => {
        if (item.disorder) allDisorders.add(item.disorder);
      });
    }
    
    // Calculate weighted combined scores
    const combinedScores = Array.from(allDisorders).map(disorder => {
      // Find EEG confidence for this disorder
      const eegItem = eegPred.confidence_scores?.find(item => 
        item.disorder?.toLowerCase() === disorder.toLowerCase()
      );
      const eegConfidence = eegItem?.confidence || 0;
      
      // Find Biometric confidence for this disorder
      const biometricItem = biometricPred.confidence_scores?.find(item => 
        item.disorder?.toLowerCase() === disorder.toLowerCase()
      );
      const biometricConfidence = biometricItem?.confidence || 0;
      
      // Calculate weighted average
      const combinedConfidence = (eegConfidence * eegWeight) + (biometricConfidence * biometricWeight);
      
      return {
        disorder: disorder,
        confidence: Math.round(combinedConfidence * 100) / 100,
        eeg_confidence: eegConfidence,
        biometric_confidence: biometricConfidence,
        status: combinedConfidence > 50 ? '⚠️' : combinedConfidence > 20 ? 'ℹ️' : '✅',
        note: `Combined from EEG (${eegConfidence.toFixed(1)}%) and Biometric (${biometricConfidence.toFixed(1)}%)`
      };
    }).sort((a, b) => b.confidence - a.confidence);
    
    // Determine primary prediction (highest confidence)
    const primaryPrediction = combinedScores[0]?.disorder || eegPred.result || biometricPred.result || 'Unknown';
    
    // Check for conflicts
    const eegTop = eegPred.result;
    const biometricTop = biometricPred.result;
    const hasConflict = eegTop && biometricTop && eegTop.toLowerCase() !== biometricTop.toLowerCase();
    
    let conflictAnalysis = null;
    if (hasConflict) {
      const conflictSeverity = Math.abs(combinedScores[0]?.confidence - combinedScores[1]?.confidence) < 10 ? 'high' : 'moderate';
      conflictAnalysis = {
        has_conflict: true,
        severity: conflictSeverity,
        eeg_prediction: eegTop,
        biometric_prediction: biometricTop,
        recommendation: `Different predictions detected. EEG suggests "${eegTop}" while Biometric suggests "${biometricTop}". Final prediction weighted: ${(eegWeight * 100).toFixed(0)}% EEG, ${(biometricWeight * 100).toFixed(0)}% Biometric.`
      };
    }
    
    return {
      primary_prediction: primaryPrediction,
      confidence_scores: combinedScores,
      eeg_prediction: eegPred.result,
      biometric_prediction: biometricPred.result,
      conflict_analysis: conflictAnalysis,
      eeg_weight: eegWeight,
      biometric_weight: biometricWeight
    };
  };

  const combineAndSaveReport = async () => {
    if (!patientId || !eegData || !biometricData || !eegPrediction || !biometricPrediction) {
      setError('Missing data for combined prediction');
      toast.error('❌ Missing data for combined prediction', {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    // STEP 1: Generate combined prediction client-side IMMEDIATELY (NO WAITING!)
    console.log('⚡ Generating combined prediction client-side (INSTANT)...');
    const combinedPred = combinePredictionsClientSide(eegPrediction, biometricPrediction, 0.7, 0.3);
    
    // STEP 2: Render report IMMEDIATELY (before saving)
    setCombinedPrediction(combinedPred);
    setIsAnalyzing(false);
    setReportGenerated(true);
    setGenerationTime(0);
    setCurrentStep(13); // Go straight to final-result to show report
    
    // Show success toast for report generation (not saving yet)
    toast.success('✅ Combined report generated!', {
      position: "top-right",
      autoClose: 2000,
    });
    
    // STEP 3: Save to backend in background (NON-BLOCKING) - AFTER rendering
    const saveToBackend = async () => {
      const doctor = JSON.parse(localStorage.getItem('doctor') || '{}');
      
      // Set saving status
      setIsSaving(true);
      setSaveStatus('saving');
      
      try {
        const response = await fetch(`${serverBase}/api/predict_combined_full`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(doctor.id && { 'X-Doctor-Id': doctor.id.toString() }),
          },
          credentials: 'include',
          body: JSON.stringify({
            patient_id: patientId,
            patient_name: patientName,
            patient_age: patientAge,
            eeg_data: eegData,
            biometric_data: biometricData,
            eeg_weight: 0.7,
            biometric_weight: 0.3,
            save_report: true,
            ...(doctor.id && { doctor_id: doctor.id.toString() })
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Report saved to database:', result.report_saved);
          
          // Update status
          setIsSaving(false);
          setSaveStatus('saved');
          
          // Show success notification
          toast.success('💾 Report saved to database successfully!', {
            position: "top-right",
            autoClose: 3000,
          });
        } else {
          console.warn('⚠️ Failed to save report to database, but report is still available:', response.status);
          setIsSaving(false);
          setSaveStatus('error');
          toast.warning('⚠️ Report displayed but save failed. Report is still available.', {
            position: "top-right",
            autoClose: 3000,
          });
        }
      } catch (err) {
        console.warn('⚠️ Background save failed (report still available):', err.message);
        setIsSaving(false);
        setSaveStatus('error');
        // Don't show error toast - report is already displayed and available
      }
    };
    
    // Start background save (don't await - let it run async)
    saveToBackend();
  };

  const handlePatientIdSubmit = (e) => {
    e.preventDefault();
    if (!patientId.trim()) {
      setError('Patient ID is required');
      return;
    }
    setError(null);
    setCurrentStep(1); // Move to welcome step
  };

  // fetch latest avg EEG and set bands + raw separately
  // NEW: Tries real-time collection first, then falls back to old CSV method
  const fetchLatestEegAvg = async () => {
    setIsAutoFilling(true);
    setAutoFillError(null);
    
    // Try NEW real-time collection endpoint first
    try {
      console.log('[EEG Autofill] Attempting real-time EEG collection...');
      const realtimeRes = await fetch(`${serverBase}/api/eeg/collect_realtime`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: 30 }) // 30 seconds collection
      });
      
      if (realtimeRes.ok) {
        const realtimePayload = await realtimeRes.json();
        if (realtimePayload.success && realtimePayload.data) {
          console.log('[EEG Autofill] Real-time collection successful!', realtimePayload.data);
          toast.success('EEG data collected automatically!', {
            position: "top-right",
            autoClose: 3000,
          });
          
          const normalized = normalizeEegAverages(realtimePayload.data);
          if (normalized) {
            return { bands: normalized, raw: realtimePayload };
          }
          // Fallback normalization
          const fallback = realtimePayload.data;
          const maybeNorm = normalizeEegAverages(fallback);
          if (maybeNorm) return { bands: maybeNorm, raw: realtimePayload };
          return { bands: fallback, raw: realtimePayload };
        }
      }
    } catch (realtimeErr) {
      console.warn('[EEG Autofill] Real-time collection failed, trying fallback:', realtimeErr);
      // Continue to fallback method below
    }
    
    // FALLBACK: Use old CSV-based method
    try {
      console.log('[EEG Autofill] Using fallback method (CSV/old)...');
      const res = await fetch(`${serverBase}/latest_avg_eeg`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const payload = await res.json();
      const normalized = normalizeEegAverages(payload);
      if (normalized) {
        // normalized contains averaged band powers
        return { bands: normalized, raw: payload };
      }
      // fallback: if server returns direct band object under data
      const fallback = payload && payload.data ? payload.data : payload;
      const maybeNorm = normalizeEegAverages(fallback);
      if (maybeNorm) return { bands: maybeNorm, raw: payload };
      // final fallback: return raw under bands as-is (so UI can still show)
      return { bands: fallback, raw: payload };
    } catch (err) {
      console.error('fetchLatestEegAvg error (both methods failed)', err);
      setAutoFillError(`Could not fetch EEG data. Please ensure EEG device is connected and try again.`);
      return null;
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleAutoFillAndFillEEG = async () => {
    setAutoFillError(null);
    const res = await fetchLatestEegAvg();
    if (res) {
      // store averaged bands for submission and keep raw for preview
      setPrefillEegBands(res.bands);
      setPrefillEegRaw(res.raw);
      setCurrentStep(3); // show EEG input step for review
    }
  };

  const fetchLatestBiometricAvg = async () => {
    setIsAutoFilling(true);
    setAutoFillError(null);
    try {
      const res = await fetch(`${serverBase}/latest_avg_biometric`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const payload = await res.json();
      return payload && payload.data ? payload.data : payload;
    } catch (err) {
      console.error('fetchLatestBiometricAvg error', err);
      setAutoFillError(`Could not fetch latest biometric averages from ${serverBase}`);
      return null;
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleAutoFillAndFillBiometric = async () => {
    setAutoFillError(null);
    const avg = await fetchLatestBiometricAvg();
    if (avg) {
      setPrefillBiometric(avg);
      setCurrentStep(8);
    }
  };

  const getStepContent = () => {
    switch (currentStepData.id) {
      case 'patient-id':
        return (
          <div className="form-section">
            <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
              <form onSubmit={handlePatientIdSubmit}>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontWeight: 600 }}>
                    <FaIdCard /> Patient ID *
                  </label>
                  <input
                    type="text"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    placeholder="Enter unique patient ID (e.g., P001)"
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '16px',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontWeight: 600 }}>
                    <FaUser /> Patient Name *
                  </label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Enter patient's full name"
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '16px',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontWeight: 600 }}>
                    <FaUser /> Age *
                  </label>
                  <input
                    type="number"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    placeholder="Enter patient's age"
                    required
                    min="1"
                    max="120"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '16px',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <p style={{ marginTop: '8px', marginBottom: '20px', fontSize: '14px', color: '#666' }}>
                  If this patient ID already exists, the test will be added to their history.
                </p>
                {error && (
                  <div className="error-message" style={{ marginBottom: '15px', padding: '10px', background: '#fee', border: '1px solid #fcc', borderRadius: '6px', color: '#c33' }}>
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  className="action-button"
                  style={{ width: '100%', marginTop: '10px' }}
                >
                  <FaCheckCircle /> Continue with Patient Information
                </button>
              </form>
            </div>
          </div>
        );

      case 'eeg-input':
        return (
          <div className="form-section">
            <div style={{ marginBottom: 30, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <button 
                className="action-button autofill-main-btn" 
                onClick={handleAutoFillAndFillEEG} 
                disabled={isAutoFilling || isAnalyzing}
              >
                <FaSync className={`btn-icon ${isAutoFilling ? 'spinning' : ''}`} />
                {isAutoFilling ? 'Fetching averages...' : 'Autofill Latest Avg EEG'}
              </button>
              {autoFillError && <div className="error-message"><p>{autoFillError}</p></div>}
            </div>

            {/* preview: show averaged bands and raw payload separately - only if data exists but form not filled */}
            {prefillEegBands && Object.values(prefillEegBands).some(v => v === null || v === '') && (
              <div className="prefill-preview">
                <h4>Fetched EEG Averages (bands — used for submission)</h4>
                <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(prefillEegBands, null, 2)}</pre>
                <div style={{ marginTop: 15, display: 'flex', justifyContent: 'center' }}>
                  <button className="action-button" onClick={() => handleEEGSubmit(prefillEegBands)} disabled={isAnalyzing}>
                    Use These Values (Submit)
                  </button>
                </div>
              </div>
            )}

            {prefillEegRaw && (
              <div className="prefill-raw" style={{ marginTop: 12, display: 'none' }}>
                <h5>Raw payload (for debugging)</h5>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{JSON.stringify(prefillEegRaw, null, 2)}</pre>
              </div>
            )}

            <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <EEGInputForm onEEGSubmit={handleEEGSubmit} type="eeg" initialValues={prefillEegBands || null} />
            </div>
          </div>
        );

      case 'eeg-result':
        // show ResultsSection immediately after EEG prediction
        return eegPrediction ? (
          <ResultsSection
            prediction={eegPrediction}
            type="eeg"
            title="EEG Prediction Report"
            subtitle="Predicted anxiety disorder from EEG brain activity analysis"
          />
        ) : null;

      case 'biometric-result':
        // show ResultsSection immediately after biometric prediction
        return biometricPrediction ? (
          <ResultsSection
            prediction={biometricPrediction}
            type="biometric"
            title="Biometric Prediction Report"
            subtitle="Predicted anxiety disorder from GSR + SpO2 physiological analysis"
          />
        ) : null;

      case 'generating-report':
        // Simple loading screen - step will update directly to 12 when ready
        return (
          <div className="result-section generating-report-section">
            <div className="generating-animation-wrapper">
              <Lottie
                animationData={dataAnalysis}
                loop={true}
                style={{ 
                  width: 200, 
                  height: 200,
                  maxWidth: '100%'
                }}
              />
            </div>
            <h2 className="report-title">
              Generating Combined Report...
            </h2>
            <p className="generating-subtitle">
              Combining your EEG and Biometric predictions with weighted analysis...
            </p>
            
            {/* Progress indicator */}
            {isAnalyzing && (
              <div className="generating-progress">
                <div className="progress-status">
                  <div className="progress-dot"></div>
                  <span>Processing... ({generationTime}s)</span>
                  {generationTime > 20 && (
                    <span className="progress-warning">
                      (This is taking longer than usual...)
                    </span>
                  )}
                </div>
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar" 
                    style={{
                    width: `${Math.min((generationTime / 30 * 100), 100)}%`,
                      backgroundColor: generationTime > 20 ? 'var(--accent-warning)' : 'var(--accent-primary)'
                    }}
                  >
                    <span className="progress-percentage">
                    {Math.round(Math.min((generationTime / 30 * 100), 100))}%
                    </span>
                  </div>
                </div>
                <div className="progress-message">
                  {generationTime < 3 ? 'Analyzing data...' : 
                   generationTime < 5 ? 'Combining predictions...' : 
                   generationTime < 7 ? 'Calculating final disorder...' : 
                   generationTime < 10 ? 'Saving report to database...' :
                   generationTime < 15 ? 'Finalizing report...' :
                   'Almost done...'}
                </div>
                <div className="progress-time-info">
                  {generationTime < 10 ? 'Usually takes 5-10 seconds' : 
                   generationTime < 20 ? 'Processing may take up to 30 seconds' :
                   'Maximum wait time: 30 seconds'}
                </div>
              </div>
            )}
          </div>
        );

      case 'report-saved':
        // Get prediction color and icon based on disorder type (consistent with ResultsSection)
        const getPredictionColor = (predictionText) => {
          const lowerPrediction = predictionText.toLowerCase();
          if (lowerPrediction.includes('healthy control') || lowerPrediction.includes('normal')) {
            return '#10b981'; // Green for healthy
          } else if (lowerPrediction.includes('social anxiety')) {
            return '#f59e0b'; // Amber for social anxiety
          } else if (lowerPrediction.includes('panic disorder')) {
            return '#ef4444'; // Red for panic
          } else if (lowerPrediction.includes('generalized anxiety')) {
            return '#8b5cf6'; // Purple for GAD
          } else if (lowerPrediction.includes('obsessive compulsitve')) {
            return '#06b6d4'; // Cyan for OCD
          } else {
            return '#3b82f6'; // Blue for others
          }
        };

        const getPredictionIcon = (predictionText) => {
          const lowerPrediction = predictionText.toLowerCase();
          if (lowerPrediction.includes('healthy control')) {
            return '✅';
          } else if (lowerPrediction.includes('social anxiety')) {
            return '⚠️';
          } else if (lowerPrediction.includes('panic disorder')) {
            return '⚠️';
          } else if (lowerPrediction.includes('generalized anxiety')) {
            return 'ℹ️';
          } else if (lowerPrediction.includes('obsessive compulsitve')) {
            return '🧠';
          } else {
            return 'ℹ️';
          }
        };

        const predictionColor = combinedPrediction ? getPredictionColor(combinedPrediction.primary_prediction) : '#3b82f6';
        const predictionIcon = combinedPrediction ? getPredictionIcon(combinedPrediction.primary_prediction) : 'ℹ️';
        const confidenceValue = combinedPrediction?.confidence_scores?.[0]?.confidence || 0;
        const showConfidence = confidenceValue >= 60; // Only show if >= 60%

        // Show report saved success step with professional styling matching ResultsSection
        return (
          <div className="results-section" style={{ maxWidth: '900px', margin: '40px auto' }}>
            {combinedPrediction ? (
              <>
                {/* Success Header */}
                <div className="results-header">
                <div style={{
                  fontSize: '80px',
                    marginBottom: '20px',
                    animation: 'bounce 0.6s ease-in-out',
                    display: 'flex',
                    justifyContent: 'center'
                }}>
                  ✅
                </div>
                  <h2 style={{ 
                    fontSize: '32px', 
                    marginBottom: '12px',
                    fontWeight: '700',
                    color: 'var(--accent-success)'
                  }}>
                  Report Generated Successfully!
                </h2>
                  <div className="results-divider"></div>
                </div>

                {/* Success Card - Matching ResultsSection style */}
                <div className="prediction-card" style={{ 
                  borderColor: '#10b981',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  marginBottom: '30px'
                }}>
                  <div className="prediction-icon" style={{ color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.2)' }}>
                    ✅
                  </div>
                  <div className="prediction-content">
                    <h3 className="prediction-title">Report Saved to Database</h3>
                    <div style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.6', marginTop: '8px' }}>
                      <div style={{ marginBottom: '8px' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Patient ID:</strong> {patientId}
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                    Your combined anxiety assessment report has been successfully saved.
                      </div>
                      <div style={{ fontWeight: '600', color: 'var(--accent-success)', marginTop: '12px' }}>
                        Report is now available for download in the Dashboard.
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Final Prediction Card - Matching ResultsSection prediction-card style */}
                <div className="prediction-card" style={{ 
                  borderColor: predictionColor,
                  backgroundColor: 'var(--bg-tertiary)',
                  marginBottom: '30px',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Background gradient effect */}
                <div style={{
                    position: 'absolute',
                    top: '-50%',
                    right: '-50%',
                    width: '300px',
                    height: '300px',
                    background: `radial-gradient(circle, ${predictionColor}15, transparent)`,
                    borderRadius: '50%',
                    pointerEvents: 'none'
                  }}></div>
                  
                  <div className="prediction-icon" style={{ 
                    color: predictionColor,
                    backgroundColor: `${predictionColor}20`,
                    position: 'relative',
                    zIndex: 1
                  }}>
                    {predictionIcon}
                  </div>
                  
                  <div className="prediction-content" style={{ position: 'relative', zIndex: 1 }}>
                    <h3 className="prediction-title">Final Predicted Anxiety Disorder</h3>
                    <p className="prediction-value" style={{ 
                      color: predictionColor,
                      fontSize: '28px',
                      textTransform: 'capitalize',
                      marginBottom: showConfidence ? '12px' : '0'
                  }}>
                    {combinedPrediction.primary_prediction}
                    </p>
                    {showConfidence && (
                      <div style={{ 
                        display: 'inline-block',
                        padding: '6px 16px',
                        borderRadius: '20px',
                        backgroundColor: `${predictionColor}20`,
                        border: `2px solid ${predictionColor}`,
                        fontSize: '14px',
                        fontWeight: '600',
                        color: predictionColor,
                        marginTop: '8px'
                      }}>
                        Confidence: {confidenceValue}%
                    </div>
                  )}
                  </div>
                </div>
                
                {/* Call to Action */}
                <div style={{
                  textAlign: 'center',
                  padding: '20px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-light)',
                  marginTop: '20px'
                }}>
                  <p style={{ 
                    color: 'var(--text-secondary)', 
                    fontSize: '15px', 
                    lineHeight: '1.7',
                    margin: 0
                  }}>
                    Click below to view your complete comprehensive anxiety assessment report with detailed analysis, 
                    including all EEG readings, biometric measurements, and clinical recommendations.
                </p>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div className="loading-spinner" style={{ 
                  width: '60px', 
                  height: '60px', 
                  border: '4px solid var(--border-color)', 
                  borderTop: '4px solid var(--accent-primary)', 
                  borderRadius: '50%', 
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 30px'
                }}></div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
                  Loading report...
                </p>
              </div>
            )}
          </div>
        );

      case 'biometric-input':
        return (
          <div className="form-section">
            <div style={{ marginBottom: 30, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <button className="action-button" onClick={handleAutoFillAndFillBiometric} disabled={isAutoFilling || isAnalyzing}>
                {isAutoFilling ? 'Fetching averages...' : 'Autofill Latest Avg Biometric'}
              </button>
              {autoFillError && <div className="error-message"><p>{autoFillError}</p></div>}
            </div>

            {prefillBiometric && (
              <div className="prefill-preview">
                <h4>Fetched Biometric Averages (preview)</h4>
                <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(prefillBiometric, null, 2)}</pre>
                <div style={{ marginTop: 15, display: 'flex', justifyContent: 'center' }}>
                  <button className="action-button" onClick={() => handleBiometricSubmit(prefillBiometric)} disabled={isAnalyzing}>
                    Use These Values (Submit)
                  </button>
                </div>
              </div>
            )}

            <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <BiometricInputForm onBiometricSubmit={handleBiometricSubmit} initialValues={prefillBiometric} />
            </div>
          </div>
        );

      case 'final-result':
        const doctor = JSON.parse(localStorage.getItem('doctor') || '{}');
        const testDate = new Date().toLocaleString();
        const finalDisorder = combinedPrediction?.primary_prediction || 'Unknown';
        
        // Get messages based on final condition
        const getDoctorMessage = (disorder) => {
          const lower = disorder.toLowerCase();
          if (lower.includes('healthy') || lower.includes('normal')) {
            return "Patient shows normal brain activity and physiological responses. No immediate intervention required. Continue monitoring if symptoms persist.";
          } else if (lower.includes('social anxiety')) {
            return "Patient exhibits signs of Social Anxiety Disorder. Consider cognitive behavioral therapy (CBT) and gradual exposure therapy. Monitor progress in social situations.";
          } else if (lower.includes('panic disorder')) {
            return "Patient shows indicators of Panic Disorder. Immediate assessment recommended. Consider medication (SSRIs) and therapy. Educate patient about panic attacks and coping strategies.";
          } else if (lower.includes('generalized anxiety')) {
            return "Patient displays symptoms consistent with Generalized Anxiety Disorder (GAD). Recommend therapy (CBT), stress management techniques, and potential medication evaluation. Regular follow-ups advised.";
          } else if (lower.includes('obsessive compulsive')) {
            return "Patient exhibits characteristics of Obsessive-Compulsive Disorder (OCD). Specialized OCD treatment recommended including ERP therapy. Consider psychiatric consultation for medication options.";
          } else {
            return "Further clinical evaluation recommended. Combine these findings with patient history and clinical observations for comprehensive assessment.";
          }
        };

        const getPatientMessage = (disorder) => {
          const lower = disorder.toLowerCase();
          if (lower.includes('healthy') || lower.includes('normal')) {
            return "Your test results show normal patterns. If you're experiencing symptoms, please discuss them with your healthcare provider for personalized guidance.";
          } else if (lower.includes('social anxiety')) {
            return "Your results suggest you may benefit from support for social anxiety. This is manageable with the right approach. Please consult with your healthcare provider about treatment options including therapy and support strategies.";
          } else if (lower.includes('panic disorder')) {
            return "Your test results indicate you may be experiencing panic-related symptoms. This is treatable. Please schedule an appointment with your healthcare provider to discuss treatment options and support resources.";
          } else if (lower.includes('generalized anxiety')) {
            return "Your results show patterns associated with generalized anxiety. Effective treatments are available. Please consult with your healthcare provider to explore therapy, lifestyle changes, and other supportive interventions.";
          } else if (lower.includes('obsessive compulsive')) {
            return "Your results suggest you may benefit from specialized support for OCD symptoms. Effective treatments are available. Please discuss these findings with a mental health professional to explore appropriate treatment options.";
          } else {
            return "Please discuss your test results with your healthcare provider for a comprehensive evaluation and personalized treatment plan.";
          }
        };

        const handlePrintReport = () => {
          const printWindow = window.open('', '_blank');
          const reportContent = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>Anxiety Assessment Report - ${patientId}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
                .header { text-align: center; border-bottom: 3px solid #667eea; padding-bottom: 20px; margin-bottom: 30px; }
                .header h1 { color: #667eea; margin: 0; }
                .section { margin: 30px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
                .section h2 { color: #667eea; margin-top: 0; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
                .info-item { padding: 10px; background: #f5f5f5; border-radius: 4px; }
                .info-item strong { color: #333; }
                .prediction-box { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 25px; border-radius: 10px; text-align: center; margin: 20px 0; }
                .prediction-box h3 { margin: 0 0 10px 0; font-size: 1.2em; }
                .prediction-box .value { font-size: 1.8em; font-weight: bold; }
                .analysis-section { margin: 20px 0; padding: 15px; background: #f9f9f9; border-left: 4px solid #667eea; }
                .message-box { margin: 20px 0; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; }
                .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #ddd; text-align: center; color: #666; font-size: 0.9em; }
                @media print { button { display: none; } }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>🧠 AnxiePredict - Anxiety Assessment Report</h1>
                <p>Comprehensive Neural & Physiological Analysis</p>
              </div>

              <div class="section">
                <h2>Patient Information</h2>
                <div class="info-grid">
                  <div class="info-item"><strong>Patient ID:</strong> ${patientId}</div>
                  <div class="info-item"><strong>Patient Name:</strong> ${patientName || 'Not provided'}</div>
                  <div class="info-item"><strong>Age:</strong> ${patientAge || 'Not provided'}</div>
                  <div class="info-item"><strong>Test Date:</strong> ${testDate}</div>
                  <div class="info-item"><strong>Doctor Name:</strong> ${doctor.name || 'Not specified'}</div>
                  <div class="info-item"><strong>Doctor ID:</strong> ${doctor.id || 'N/A'}</div>
                </div>
              </div>

              <div class="section">
                <h2>Final Prediction</h2>
                <div class="prediction-box">
                  <h3>Primary Anxiety Disorder</h3>
                  <div class="value">${finalDisorder}</div>
                </div>
              </div>

              <div class="section">
                <h2>🧠 EEG Analysis Results</h2>
                <div class="analysis-section">
                  <p><strong>Predicted Disorder:</strong> ${eegPrediction?.result || 'N/A'}</p>
                  ${eegPrediction?.confidence_scores && Array.isArray(eegPrediction.confidence_scores) && eegPrediction.confidence_scores.length > 0 ? `
                  <p><strong>Confidence Scores:</strong></p>
                  <ul>
                      ${eegPrediction.confidence_scores.slice(0, 5).map(item => `<li>${item.disorder}: ${item.confidence}%</li>`).join('')}
                  </ul>
                  ` : '<p>No confidence scores available.</p>'}
                </div>
              </div>

              <div class="section">
                <h2>💓 Biometric Analysis Results (GSR + SpO2)</h2>
                <div class="analysis-section">
                  <p><strong>Predicted Disorder:</strong> ${biometricPrediction?.result || 'N/A'}</p>
                  ${biometricPrediction?.confidence_scores && Array.isArray(biometricPrediction.confidence_scores) && biometricPrediction.confidence_scores.length > 0 ? `
                  <p><strong>Confidence Scores:</strong></p>
                  <ul>
                      ${biometricPrediction.confidence_scores.slice(0, 5).map(item => `<li>${item.disorder}: ${item.confidence}%</li>`).join('')}
                    </ul>
                  ` : '<p>No confidence scores available.</p>'}
                  ${biometricData ? `
                    <p><strong>GSR Reading:</strong> ${biometricData.gsr || 'N/A'}</p>
                    <p><strong>SpO2 Reading:</strong> ${biometricData.spo2 || 'N/A'}%</p>
                  ` : ''}
                </div>
              </div>

              ${combinedPrediction?.confidence_scores && combinedPrediction.confidence_scores.length > 0 ? `
              <div class="section">
                <h2>Combined Confidence Analysis</h2>
                <p>Weighted Combination (70% EEG, 30% Biometric)</p>
                <ul>
                  ${combinedPrediction.confidence_scores.slice(0, 5).map(item => `
                    <li><strong>${item.disorder}:</strong> ${item.confidence}% 
                      (EEG: ${item.eeg_confidence}%, Biometric: ${item.biometric_confidence}%)</li>
                  `).join('')}
                </ul>
              </div>
              ` : ''}

              ${combinedPrediction?.conflict_analysis?.has_conflict ? `
              <div class="section">
                <h2>⚠️ Conflict Analysis</h2>
                <p><strong>Severity:</strong> ${combinedPrediction.conflict_analysis.severity.toUpperCase()}</p>
                <p>${combinedPrediction.conflict_analysis.recommendation}</p>
              </div>
              ` : ''}

              <div class="section">
                <h2>📋 Clinical Notes</h2>
                <div class="message-box">
                  <h3>For Healthcare Provider:</h3>
                  <p>${getDoctorMessage(finalDisorder)}</p>
                </div>
                <div class="message-box" style="background: #e7f3ff; border-color: #2196F3;">
                  <h3>Patient Information:</h3>
                  <p>${getPatientMessage(finalDisorder)}</p>
                </div>
              </div>

              <div class="footer">
                <p>This report is generated by AnxiePredict - AI-Powered Anxiety Assessment System</p>
                <p>Generated on ${testDate}</p>
                <p><strong>Note:</strong> This report should be used as a supplementary tool alongside clinical assessment. 
                Final diagnosis should be made by a qualified healthcare professional.</p>
              </div>
            </body>
            </html>
          `;
          printWindow.document.write(reportContent);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 250);
        };

        const handleDownloadPDF = async () => {
          try {
            toast.info('📄 Generating PDF report...', {
              position: "top-right",
              autoClose: 2000,
            });
            
            const element = document.getElementById('final-report');
            if (!element) {
              throw new Error('Report element not found');
            }

            // Capture the report as canvas
            const canvas = await html2canvas(element, {
              scale: 2,
              useCORS: true,
              logging: false,
              backgroundColor: '#1a1b2e',
              windowWidth: element.scrollWidth,
              windowHeight: element.scrollHeight
            });

            const imgData = canvas.toDataURL('image/png');
            
            // Calculate PDF dimensions
            const imgWidth = 210; // A4 width in mm
            const pageHeight = 297; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;

            const pdf = new jsPDF('p', 'mm', 'a4');
            let position = 0;

            // Add first page
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            // Add additional pages if content is longer
            while (heightLeft >= 0) {
              position = heightLeft - imgHeight;
              pdf.addPage();
              pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
              heightLeft -= pageHeight;
            }

            // Save PDF
            pdf.save(`AnxiePredict_Report_${patientId}_${new Date().toISOString().split('T')[0]}.pdf`);
            
            toast.success('✅ PDF report downloaded successfully!', {
              position: "top-right",
              autoClose: 3000,
            });
          } catch (error) {
            console.error('Error generating PDF:', error);
            toast.error('❌ Failed to generate PDF. Please try again.', {
              position: "top-right",
              autoClose: 3000,
            });
          }
        };

        const handleDownloadReport = () => {
          const reportData = {
            report_type: 'Anxiety Assessment Report',
            patient_id: patientId,
            patient_name: patientName,
            patient_age: patientAge,
            test_date: testDate,
            doctor_name: doctor.name,
            doctor_id: doctor.id,
            final_prediction: finalDisorder,
            eeg_prediction: {
              disorder: eegPrediction?.result,
              confidence_scores: eegPrediction?.confidence_scores,
              eeg_readings: eegData
            },
            biometric_prediction: {
              disorder: biometricPrediction?.result,
              confidence_scores: biometricPrediction?.confidence_scores,
              readings: {
                gsr: biometricData?.gsr,
                spo2: biometricData?.spo2
              }
            },
            combined_prediction: combinedPrediction,
            doctor_message: getDoctorMessage(finalDisorder),
            patient_message: getPatientMessage(finalDisorder),
            test_data: {
              eeg_data: eegData,
              biometric_data: biometricData
            }
          };

          const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Anxiety_Report_${patientId}_${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          toast.success('✅ Report downloaded successfully!', {
            position: "top-right",
            autoClose: 3000,
          });
        };

        // Show loading state if combined prediction is not ready yet
        if (isAnalyzing || !combinedPrediction) {
          return (
            <div className="result-section combined-report-section loading-state">
              <div className="loading-animation-wrapper">
                <Lottie
                  animationData={dataAnalysis}
                  loop={true}
                  style={{ 
                    width: 150, 
                    height: 150,
                    maxWidth: '100%'
                  }}
                />
              </div>
              <h3 className="report-title">Generating Combined Report...</h3>
              <p className="loading-message">
                Please wait while we combine your EEG and Biometric predictions and save your report.
              </p>
            </div>
          );
        }

        return (
          <div className="result-section combined-report-section" id="final-report">
            {/* Save Status Banner - Shows current saving state */}
            {combinedPrediction && (
              <div className="report-saved-banner" style={{
                backgroundColor: saveStatus === 'saved' ? '#d4edda' : saveStatus === 'saving' ? '#fff3cd' : saveStatus === 'error' ? '#f8d7da' : '#e7f3ff',
                border: `2px solid ${saveStatus === 'saved' ? '#28a745' : saveStatus === 'saving' ? '#ffc107' : saveStatus === 'error' ? '#dc3545' : '#2196F3'}`,
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '30px',
                color: saveStatus === 'saved' ? '#155724' : saveStatus === 'saving' ? '#856404' : saveStatus === 'error' ? '#721c24' : '#004085',
                fontWeight: '600',
                textAlign: 'center',
                boxShadow: `0 4px 12px rgba(${saveStatus === 'saved' ? '40, 167, 69' : saveStatus === 'saving' ? '255, 193, 7' : saveStatus === 'error' ? '220, 53, 69' : '33, 150, 243'}, 0.2)`
              }}>
                {saveStatus === 'saving' && (
                  <>
                    <div className="saving-status-header">
                      <div className="saving-animation-wrapper">
                        <Lottie
                          animationData={dataAnalysis}
                          loop={true}
                          style={{ 
                            width: 40, 
                            height: 40
                          }}
                        />
                      </div>
                      <span>Saving Report to Database...</span>
                    </div>
                    <div className="saving-status-details">
                      Patient ID: <strong>{patientId}</strong> | Report Date: <strong>{testDate}</strong>
                      <br />
                      Your report is displayed below. Saving in progress...
                    </div>
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                <div style={{ fontSize: '1.2em', marginBottom: '10px' }}>
                      ✅ Report Successfully Saved to Database!
                </div>
                <div style={{ fontSize: '0.9em', fontWeight: '400', opacity: 0.9 }}>
                  Patient ID: <strong>{patientId}</strong> | Report Date: <strong>{testDate}</strong>
                  <br />
                  Report is now available in the Dashboard for future reference.
                </div>
                  </>
                )}
                {saveStatus === 'error' && (
                  <>
                    <div style={{ fontSize: '1.2em', marginBottom: '10px' }}>
                      ⚠️ Report Displayed (Save Failed)
                    </div>
                    <div style={{ fontSize: '0.9em', fontWeight: '400', opacity: 0.9 }}>
                      Patient ID: <strong>{patientId}</strong> | Report Date: <strong>{testDate}</strong>
                      <br />
                      Your report is displayed below and available for download. Database save failed, but you can still use the report.
                    </div>
                  </>
                )}
                {!saveStatus && (
                  <>
                    <div style={{ fontSize: '1.2em', marginBottom: '10px' }}>
                      📊 Report Generated Successfully!
                    </div>
                    <div style={{ fontSize: '0.9em', fontWeight: '400', opacity: 0.9 }}>
                      Patient ID: <strong>{patientId}</strong> | Report Date: <strong>{testDate}</strong>
                      <br />
                      Your comprehensive report is ready. Saving to database...
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Report Header */}
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <h1 className="report-title" style={{ fontSize: '2.5em', marginBottom: '10px', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                🧠 Comprehensive Anxiety Assessment Report
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1em' }}>Dual-Methodology Analysis: EEG Brain Waves + Biometric Physiological Indicators</p>
            </div>
            
            {/* Patient & Test Information */}
            <div className="report-header-info" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '15px',
              marginBottom: '40px',
              padding: '25px',
              background: 'var(--bg-card)',
              borderRadius: '12px',
              border: '2px solid var(--accent-primary)',
              boxShadow: '0 8px 32px rgba(102, 126, 234, 0.2)'
            }}>
              <div style={{ fontSize: '1.05em' }}><strong>Patient ID:</strong> {patientId}</div>
              <div style={{ fontSize: '1.05em' }}><strong>Name:</strong> {patientName || '-'}</div>
              <div style={{ fontSize: '1.05em' }}><strong>Age:</strong> {patientAge || '-'}</div>
              <div style={{ fontSize: '1.05em' }}><strong>Test Date:</strong> {testDate}</div>
              <div style={{ fontSize: '1.05em' }}><strong>Doctor:</strong> {doctor.name || 'N/A'}</div>
              <div style={{ fontSize: '1.05em' }}><strong>Doctor ID:</strong> {doctor.id || 'N/A'}</div>
            </div>
            
            {combinedPrediction && (
              <div className="combined-report-card">
                {/* Primary Prediction Section - HIGHLY HIGHLIGHTED */}
                <div className="primary-prediction-section" style={{
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2))',
                  border: '4px solid var(--accent-primary)',
                  borderRadius: '20px',
                  padding: '40px',
                  marginBottom: '40px',
                  textAlign: 'center',
                  boxShadow: '0 12px 48px rgba(102, 126, 234, 0.4)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-50%',
                    right: '-50%',
                    width: '300px',
                    height: '300px',
                    background: 'radial-gradient(circle, rgba(102, 126, 234, 0.1), transparent)',
                    borderRadius: '50%'
                  }}></div>
                  <div style={{
                    position: 'absolute',
                    bottom: '-50%',
                    left: '-50%',
                    width: '300px',
                    height: '300px',
                    background: 'radial-gradient(circle, rgba(118, 75, 162, 0.1), transparent)',
                    borderRadius: '50%'
                  }}></div>
                  <div className="prediction-icon-wrapper" style={{ marginBottom: '20px', position: 'relative', zIndex: 1 }}>
                    <FaBrain style={{ fontSize: '80px', color: 'var(--accent-primary)' }} />
                  </div>
                  <div className="prediction-content" style={{ position: 'relative', zIndex: 1 }}>
                    <div className="prediction-label" style={{ fontSize: '1.3em', color: 'var(--text-secondary)', marginBottom: '20px', fontWeight: '600' }}>
                      🎯 FINAL PREDICTED ANXIETY DISORDER
                    </div>
                    <div className="prediction-value" style={{ 
                      fontSize: '3.5em', 
                      fontWeight: '900',
                      background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      textTransform: 'uppercase',
                      letterSpacing: '2px',
                      marginBottom: '20px',
                      textShadow: '0 4px 20px rgba(102, 126, 234, 0.3)'
                    }}>
                      {combinedPrediction.primary_prediction}
                    </div>
                    {combinedPrediction.confidence_scores && combinedPrediction.confidence_scores[0] && (
                      <div style={{ 
                        fontSize: '1.5em', 
                        color: 'var(--accent-success)', 
                        fontWeight: '700',
                        display: 'inline-block',
                        padding: '10px 30px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        borderRadius: '50px',
                        border: '2px solid var(--accent-success)'
                      }}>
                        Confidence: {combinedPrediction.confidence_scores[0].confidence}%
                      </div>
                    )}
                  </div>
                </div>

                {/* Conflict Analysis Section */}
                {combinedPrediction.conflict_analysis?.has_conflict && (
                  <div className="conflict-analysis-box">
                    <div className="conflict-header">
                      <span className="warning-icon">⚠️</span>
                      <strong>Conflict Analysis:</strong>
                    </div>
                    <p className="conflict-message">{combinedPrediction.conflict_analysis.recommendation}</p>
                    <div className="conflict-severity">
                      Severity: <strong>{combinedPrediction.conflict_analysis.severity.toUpperCase()}</strong>
                    </div>
                  </div>
                )}

                {/* Doctor and Patient Messages */}
                <div className="messages-section" style={{ marginTop: '30px' }}>
                  <div className="doctor-message-box" style={{
                    background: 'rgba(255, 193, 7, 0.1)',
                    border: '2px solid rgba(255, 193, 7, 0.5)',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '20px'
                  }}>
                    <h4 style={{ color: '#ffc107', marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FaUserMd /> Message for Healthcare Provider:
                    </h4>
                    <p style={{ color: 'rgba(255, 255, 255, 0.9)', lineHeight: '1.8', margin: 0 }}>
                      {getDoctorMessage(finalDisorder)}
                    </p>
                  </div>
                  
                  <div className="patient-message-box" style={{
                    background: 'rgba(33, 150, 243, 0.1)',
                    border: '2px solid rgba(33, 150, 243, 0.5)',
                    borderRadius: '12px',
                    padding: '20px'
                  }}>
                    <h4 style={{ color: '#2196F3', marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FaUser /> Information for Patient:
                    </h4>
                    <p style={{ color: 'rgba(255, 255, 255, 0.9)', lineHeight: '1.8', margin: 0 }}>
                      {getPatientMessage(finalDisorder)}
                    </p>
                  </div>
                </div>

                {/* Combined Confidence Scores */}
                {combinedPrediction.confidence_scores && combinedPrediction.confidence_scores.length > 0 && (
                  <div className="confidence-scores-section" style={{ marginTop: '30px' }}>
                    <h4 className="scores-title">Combined Confidence Scores (70% EEG, 30% Biometric):</h4>
                    <ul className="confidence-list">
                      {combinedPrediction.confidence_scores.slice(0, 5).map((item, i) => (
                        <li key={i} className="confidence-item">
                          <span className="disorder-name">{item.disorder}:</span>
                          <span className="confidence-value">{item.confidence}%</span>
                          <span className="score-breakdown">
                            (EEG: {item.eeg_confidence}%, Biometric: {item.biometric_confidence}%)
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            {/* Individual Analysis Cards */}
            <div className="individual-analysis-cards" style={{ marginTop: '30px' }}>
              {eegPrediction && (
                <div className="analysis-card">
                  <h4 className="analysis-card-title">🧠 EEG Analysis</h4>
                  <div className="analysis-result">
                    <strong>Predicted Disorder:</strong> {eegPrediction.result}
                  </div>
                  {Array.isArray(eegPrediction.confidence_scores) && eegPrediction.confidence_scores.length > 0 && (
                    <div className="analysis-scores">
                      <strong>Top Predictions:</strong>
                      <ul className="analysis-list">
                        {eegPrediction.confidence_scores.slice(0, 3).map((item, i) => (
                      <li key={i}>{item.disorder}: {item.confidence}%</li>
                        ))}
                  </ul>
                </div>
              )}
            </div>
              )}
              {biometricPrediction && (
                <div className="analysis-card">
                  <h4 className="analysis-card-title">💓 Biometric Analysis (GSR + SpO2)</h4>
                  <div className="analysis-result">
                    <strong>Predicted Disorder:</strong> {biometricPrediction.result}
                  </div>
                  {biometricData && (
                    <div className="analysis-readings" style={{ marginTop: '15px' }}>
                      <strong>Physiological Readings:</strong>
                      <ul className="analysis-list">
                        <li>GSR: {biometricData.gsr || 'N/A'}</li>
                        <li>SpO2: {biometricData.spo2 || 'N/A'}%</li>
                      </ul>
                    </div>
                  )}
                  {Array.isArray(biometricPrediction.confidence_scores) && biometricPrediction.confidence_scores.length > 0 && (
                    <div className="analysis-scores" style={{ marginTop: '15px' }}>
                      <strong>Top Predictions:</strong>
                      <ul className="analysis-list">
                        {biometricPrediction.confidence_scores.slice(0, 3).map((item, i) => (
                          <li key={i}>{item.disorder}: {item.confidence}%</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="report-actions" style={{ marginTop: '50px', display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                className="action-button" 
                style={{ 
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)', 
                  fontSize: '1.1em',
                  padding: '15px 30px',
                  boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)'
                }} 
                onClick={handleDownloadPDF}
              >
                <FaFilePdf style={{ marginRight: '10px' }} /> Download PDF Report
              </button>
              <button 
                className="action-button" 
                style={{ 
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  fontSize: '1.1em',
                  padding: '15px 30px'
                }} 
                onClick={handlePrintReport}
              >
                <FaPrint style={{ marginRight: '10px' }} /> Print Report
              </button>
              <button 
                className="action-button" 
                style={{ 
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  fontSize: '1.1em',
                  padding: '15px 30px'
                }} 
                onClick={handleDownloadReport}
              >
                Download JSON
              </button>
              <button 
                className="action-button" 
                style={{ 
                  background: 'var(--bg-card)',
                  border: '2px solid var(--accent-primary)',
                  fontSize: '1.1em',
                  padding: '15px 30px'
                }} 
                onClick={() => navigate('/dashboard')}
              >
                View in Dashboard
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!doctorLoggedIn) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div>Redirecting to login...</div>
      </div>
    );
  }

  return (
    <div className="real-time-test">
      <div className="step-indicator">
        {steps.map((step, index) => (
          <div key={step.id} className={`step-circle ${currentStep === index ? 'active' : ''}`} onClick={() => setCurrentStep(index)} title={`Step ${index + 1}: ${step.title}`}>
          </div>
        ))}
      </div>

      <div className="step-content">
        <div className={`step-animation ${currentStepData.showForm ? 'compact-animation' : ''}`} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: '0 0 auto' }}>
          <Lottie
            animationData={currentStepData.animation}
            loop={currentStepData.autoProgress || currentStepData.id === 'generating-report' || currentStepData.id === 'eeg-prediction' || currentStepData.id === 'eeg-analyzing' || currentStepData.id === 'biometric-analyzing'}
            style={{ 
              width: currentStepData.showForm ? 280 : 380, 
              height: currentStepData.showForm ? 180 : 260, 
              maxWidth: '100%', 
              maxHeight: '100%', 
              flex: '0 0 auto' 
            }}
            onComplete={currentStepData.autoProgress && !currentStepData.autoProgress ? handleNextStep : undefined}
          />
        </div>

        <div className="step-text">
          <h2>{currentStepData.title}</h2>
          <p>{currentStepData.subtitle}</p>
        </div>

        <div className="step-actions">
          {currentStepData.showButton && (
            <button className="action-button" onClick={handleNextStep}>
              {currentStepData.buttonIcon}
              {currentStepData.buttonText}
            </button>
          )}
        </div>

        {getStepContent()}
      </div>
    </div>
  );
};

export default RealTimeTest;