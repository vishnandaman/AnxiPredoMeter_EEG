import React, { useState, useEffect } from 'react';
import Lottie from 'lottie-react';
import { FaBrain, FaHeartbeat, FaThermometerHalf, FaCheckCircle, FaArrowRight, FaHome, FaSync } from 'react-icons/fa';
import EEGInputForm from '../components/EEGInputForm';
import BiometricInputForm from '../components/BiometricInputForm';
import ConfidenceReport from '../components/ConfidenceReport';
import ResultsSection from '../components/ResultsSection';
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
  const [currentStep, setCurrentStep] = useState(0);
  const [eegPrediction, setEegPrediction] = useState(null);
  const [biometricPrediction, setBiometricPrediction] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  // autofill states
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [autoFillError, setAutoFillError] = useState(null);
  const [serverBase, setServerBase] = useState(SERVER_CANDIDATES[0] || 'http://127.0.0.1:5000');

  // separate storage: averaged band powers (used for submission) and raw payload (for preview)
  const [prefillEegBands, setPrefillEegBands] = useState(null);
  const [prefillEegRaw, setPrefillEegRaw] = useState(null);
  const [prefillBiometric, setPrefillBiometric] = useState(null);

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
    { id: 'welcome', title: 'Welcome to AnxiPredoMeter', subtitle: "We're glad you're here. Let's help you understand your anxiety better.", animation: brainAnimation, showButton: true, buttonText: 'Start Real-Time Test', buttonIcon: <FaArrowRight /> },
    { id: 'eeg-setup', title: 'EEG Device Setup', subtitle: 'Please wear your EEG headband and confirm when ready.', animation: handSwipe, showButton: true, buttonText: 'Confirm Setup', buttonIcon: <FaCheckCircle /> },
    { id: 'eeg-connection', title: 'Establishing Connection', subtitle: 'Great! Setting up the connection...', animation: brainAnimation, showButton: false, autoProgress: true, duration: 3000 },
    { id: 'eeg-input', title: 'EEG Data Input', subtitle: 'Please enter your EEG wave data for analysis.', animation: signalAnalysis, showButton: false, showForm: true },
    { id: 'eeg-prediction', title: 'EEG Signal Analysis', subtitle: 'Analyzing your neural patterns...', animation: signalAnalysis, showButton: false, autoProgress: true, duration: 4000 },
    { id: 'eeg-analyzing', title: 'Processing EEG Data', subtitle: 'Analyzing brain wave patterns...', animation: dataAnalysis, showButton: false, autoProgress: true, duration: 4000 },
    { id: 'eeg-result', title: 'EEG Analysis Complete', subtitle: 'Your neural patterns have been analyzed.', animation: successAnimation, showButton: true, buttonText: 'Continue to Biometrics', buttonIcon: <FaArrowRight /> },
    { id: 'biometric-setup', title: 'Biometric Device Setup', subtitle: 'Now, place your finger gently on the oximeter and wear the GSR sensors.', animation: handSwipe, showButton: true, buttonText: 'Confirm Setup', buttonIcon: <FaCheckCircle /> },
    { id: 'biometric-input', title: 'Biometric Data Input', subtitle: 'Please enter your GSR and SpO2 data for analysis.', animation: signalAnalysis, showButton: false, showForm: true },
    { id: 'biometric-analyzing', title: 'Processing Biometric Data', subtitle: 'Analyzing biometric indicators...', animation: dataAnalysis, showButton: false, autoProgress: true, duration: 4000 },
    { id: 'final-result', title: 'Analysis Complete', subtitle: 'Your comprehensive anxiety assessment is ready.', animation: successAnimation, showButton: true, buttonText: 'View Full Report', buttonIcon: <FaCheckCircle /> }
  ];

  const currentStepData = steps[currentStep];

  useEffect(() => {
    if (currentStepData.autoProgress) {
      const timer = setTimeout(() => { handleNextStep(); }, currentStepData.duration);
      return () => clearTimeout(timer);
    }
  }, [currentStep, currentStepData]);

  const handleNextStep = () => { if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1); };

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

  const handleEEGSubmit = async (eegData) => {
    setIsAnalyzing(true);
    setError(null);
    setCurrentStep(4); // show prediction animation

    try {
      const response = await fetch(`${serverBase}/predict_eeg`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(eegData)
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
          data: eegData
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
    setCurrentStep(9);
    try {
      const response = await fetch(`${serverBase}/predict_combined`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(biometricData)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (result.error) {
        setError("Biometric Prediction Error: " + result.error);
        setCurrentStep(8);
      } else {
        setBiometricPrediction({
          result: result.primary_prediction || result.prediction || 'Unknown',
          confidence_scores: result.confidence_scores || result.scores || {},
          data: biometricData
        });
        setCurrentStep(10);
      }
    } catch (err) {
      console.error('Biometric Error', err);
      setError(`Failed to connect to biometric prediction service. Ensure Flask running at ${serverBase}`);
      setCurrentStep(8);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // fetch latest avg EEG and set bands + raw separately
  const fetchLatestEegAvg = async () => {
    setIsAutoFilling(true);
    setAutoFillError(null);
    try {
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
      console.error('fetchLatestEegAvg error', err);
      setAutoFillError(`Could not fetch latest EEG averages from ${serverBase}`);
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
            subtitle="Predicted anxiety disorder from EEG analysis"
          />
        ) : null;

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
        return (
          <div className="result-section">
            <h3>Your Anxiety Predictions</h3>
            <div className="prediction-cards">
              {biometricPrediction && (
                <div className="prediction-card">
                  <h4>Biometric Analysis</h4>
                  <p><strong>Result:</strong> {biometricPrediction.result}</p>
                  <p><strong>Confidence Scores:</strong></p>
                  <ul>
                    {Array.isArray(biometricPrediction.confidence_scores) ? biometricPrediction.confidence_scores.map((item, i) => (
                      <li key={i}>{item.disorder}: {item.confidence}%</li>
                    )) : <li>No confidence scores</li>}
                  </ul>
                  <ConfidenceReport prediction={biometricPrediction.result} type="biometric" additionalData={biometricPrediction.data} />
                </div>
              )}
              {eegPrediction && (
                <div className="prediction-card">
                  <h4>EEG Analysis</h4>
                  <p><strong>Result:</strong> {eegPrediction.result}</p>
                  <p><strong>Confidence Scores:</strong></p>
                  <ul>
                    {Array.isArray(eegPrediction.confidence_scores) ? eegPrediction.confidence_scores.map((item, i) => (
                      <li key={i}>{item.disorder}: {item.confidence}%</li>
                    )) : <li>No confidence scores</li>}
                  </ul>
                  <ConfidenceReport prediction={eegPrediction.result} type="eeg" additionalData={eegPrediction.data} />
                </div>
              )}
            </div>
            <div style={{ marginTop: 30, width: '100%', display: 'flex', justifyContent: 'center' }}>
              <button className="action-button" onClick={() => setCurrentStep(0)}>Restart Test</button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

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
            loop={false}
            style={{ 
              width: currentStepData.showForm ? 280 : 380, 
              height: currentStepData.showForm ? 180 : 260, 
              maxWidth: '100%', 
              maxHeight: '100%', 
              flex: '0 0 auto' 
            }}
            onComplete={currentStepData.autoProgress ? handleNextStep : undefined}
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