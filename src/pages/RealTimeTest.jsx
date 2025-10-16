import React, { useState, useEffect } from 'react';
import Lottie from 'lottie-react';
import { FaBrain, FaHeartbeat, FaThermometerHalf, FaCheckCircle, FaArrowRight, FaHome } from 'react-icons/fa';
import EEGInputForm from '../components/EEGInputForm';
import BiometricInputForm from '../components/BiometricInputForm';
import ConfidenceReport from '../components/ConfidenceReport';
import brainAnimation from '../animations/Brain Simulation.json';
import signalAnalysis from '../animations/Signal analysis.json';
import dataAnalysis from '../animations/Data Analysis.json';
import handSwipe from '../animations/Hand Swipe.json';
import successAnimation from '../animations/Success.json';
import './RealTimeTest.css';

const SERVER_BASE = (
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  (typeof window !== 'undefined' && window.REACT_APP_API_URL) ||
  'http://172.22.48.129:5000'
);

const RealTimeTest = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [eegPrediction, setEegPrediction] = useState(null);
  const [biometricPrediction, setBiometricPrediction] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  // new states for autofill actions
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [autoFillError, setAutoFillError] = useState(null);

  const steps = [
    {
      id: 'welcome',
      title: 'Welcome to AnxiPredoMeter',
      subtitle: "We're glad you're here. Let's help you understand your anxiety better.",
      animation: brainAnimation,
      showButton: true,
      buttonText: 'Start Real-Time Test',
      buttonIcon: <FaArrowRight />
    },
    {
      id: 'eeg-setup',
      title: 'EEG Device Setup',
      subtitle: 'Please wear your EEG headband and confirm when ready.',
      animation: handSwipe,
      showButton: true,
      buttonText: 'Confirm Setup',
      buttonIcon: <FaCheckCircle />
    },
    {
      id: 'eeg-connection',
      title: 'Establishing Connection',
      subtitle: 'Great! Setting up the connection...',
      animation: brainAnimation,
      showButton: false,
      autoProgress: true,
      duration: 3000
    },
    {
      id: 'eeg-input',
      title: 'EEG Data Input',
      subtitle: 'Please enter your EEG wave data for analysis.',
      animation: signalAnalysis,
      showButton: false,
      showForm: true
    },
    {
      id: 'eeg-prediction',
      title: 'EEG Signal Analysis',
      subtitle: 'Analyzing your neural patterns...',
      animation: signalAnalysis,
      showButton: false,
      autoProgress: true,
      duration: 4000
    },
    {
      id: 'eeg-analyzing',
      title: 'Processing EEG Data',
      subtitle: 'Analyzing brain wave patterns...',
      animation: dataAnalysis,
      showButton: false,
      autoProgress: true,
      duration: 4000
    },
    {
      id: 'eeg-result',
      title: 'EEG Analysis Complete',
      subtitle: 'Your neural patterns have been analyzed.',
      animation: successAnimation,
      showButton: true,
      buttonText: 'Continue to Biometrics',
      buttonIcon: <FaArrowRight />
    },
    {
      id: 'biometric-setup',
      title: 'Biometric Device Setup',
      subtitle: 'Now, place your finger gently on the oximeter and wear the GSR sensors.',
      animation: handSwipe,
      showButton: true,
      buttonText: 'Confirm Setup',
      buttonIcon: <FaCheckCircle />
    },
    {
      id: 'biometric-input',
      title: 'Biometric Data Input',
      subtitle: 'Please enter your GSR and SpO2 data for analysis.',
      animation: signalAnalysis,
      showButton: false,
      showForm: true
    },
    {
      id: 'biometric-analyzing',
      title: 'Processing Biometric Data',
      subtitle: 'Analyzing biometric indicators...',
      animation: dataAnalysis,
      showButton: false,
      autoProgress: true,
      duration: 4000
    },
    {
      id: 'final-result',
      title: 'Analysis Complete',
      subtitle: 'Your comprehensive anxiety assessment is ready.',
      animation: successAnimation,
      showButton: true,
      buttonText: 'View Full Report',
      buttonIcon: <FaCheckCircle />
    }
  ];

  const currentStepData = steps[currentStep];

  useEffect(() => {
    if (currentStepData.autoProgress) {
      const timer = setTimeout(() => {
        handleNextStep();
      }, currentStepData.duration);
      return () => clearTimeout(timer);
    }
  }, [currentStep, currentStepData]);

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleEEGSubmit = async (eegData) => {
    setIsAnalyzing(true);
    setError(null);
    setCurrentStep(4); // Move to analyzing step
    
    console.log('Submitting EEG data:', eegData);
    
    try {
      const response = await fetch(`${SERVER_BASE}/predict_eeg`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(eegData)
      });
      
      console.log('EEG Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('EEG Response data:', result);
      
      if (result.error) {
        setError("EEG Prediction Error: " + result.error);
      } else {
        setEegPrediction({
          result: result.primary_prediction,
          confidence_scores: result.confidence_scores,
          data: eegData
        });
      }
    } catch (error) {
      console.error("EEG Error:", error);
      setError(`Failed to connect to EEG prediction service. Ensure Flask running at ${SERVER_BASE}`);
    } finally {
      setIsAnalyzing(false);
      setCurrentStep(5); // Move to result step
    }
  };

  const handleBiometricSubmit = async (biometricData) => {
    setIsAnalyzing(true);
    setError(null);
    setCurrentStep(9); // Move to analyzing step
    
    console.log('Submitting biometric data:', biometricData);
    
    try {
      const response = await fetch(`${SERVER_BASE}/predict_combined`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(biometricData)
      });
      
      console.log('Biometric Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Biometric Response data:', result);
      
      if (result.error) {
        setError("Biometric Prediction Error: " + result.error);
      } else {
        setBiometricPrediction({
          result: result.primary_prediction,
          confidence_scores: result.confidence_scores,
          data: biometricData
        });
      }
    } catch (error) {
      console.error("Biometric Error:", error);
      setError(`Failed to connect to biometric prediction service. Ensure Flask running at ${SERVER_BASE}`);
    } finally {
      setIsAnalyzing(false);
      setCurrentStep(10); // Move to final result
    }
  };

  // --- New: autofill helpers ---
  const fetchLatestEegAvg = async () => {
    setIsAutoFilling(true);
    setAutoFillError(null);
    try {
      const res = await fetch(`${SERVER_BASE}/latest_avg_eeg`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const payload = await res.json();
      // unwrap { status, data } if present
      return payload && payload.data ? payload.data : payload;
    } catch (err) {
      console.error('fetchLatestEegAvg error', err);
      setAutoFillError(`Could not fetch latest EEG averages from ${SERVER_BASE}`);
      return null;
    } finally {
      setIsAutoFilling(false);
    }
  };

  const fetchLatestBiometricAvg = async () => {
    setIsAutoFilling(true);
    setAutoFillError(null);
    try {
      const res = await fetch(`${SERVER_BASE}/latest_avg_biometric`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const payload = await res.json();
      return payload && payload.data ? payload.data : payload;
    } catch (err) {
      console.error('fetchLatestBiometricAvg error', err);
      setAutoFillError(`Could not fetch latest biometric averages from ${SERVER_BASE}`);
      return null;
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleAutoFillAndSubmitEEG = async () => {
    setAutoFillError(null);
    const avg = await fetchLatestEegAvg();
    if (avg) {
      // auto-submit fetched average readings
      await handleEEGSubmit(avg);
    }
  };

  const handleAutoFillAndSubmitBiometric = async () => {
    setAutoFillError(null);
    const avg = await fetchLatestBiometricAvg();
    if (avg) {
      // auto-submit fetched average readings
      await handleBiometricSubmit(avg);
    }
  };

  // --- New: send combined readings to app_comined.py endpoint ---
  const sendCombinedReadings = async () => {
    if (!eegPrediction && !biometricPrediction) {
      setError('No readings available to send.');
      return;
    }
    setIsAnalyzing(true);
    setError(null);

    const payload = {
      eeg: eegPrediction ? eegPrediction.data : null,
      eeg_result: eegPrediction ? eegPrediction.result : null,
      biometric: biometricPrediction ? biometricPrediction.data : null,
      biometric_result: biometricPrediction ? biometricPrediction.result : null
    };

    try {
      const res = await fetch(`${SERVER_BASE}/app_combined`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const result = await res.json();
      console.log('app_combined response', result);
      if (result.error) setError('Combined app error: ' + result.error);
    } catch (err) {
      console.error('sendCombinedReadings error', err);
      setError(`Failed to send combined readings. Ensure endpoint at ${SERVER_BASE}/app_combined`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getStepContent = () => {
    switch (currentStepData.id) {
      case 'eeg-input':
        return (
          <div className="form-section">
            <div style={{ marginBottom: 12 }}>
              <button
                className="action-button"
                onClick={handleAutoFillAndSubmitEEG}
                disabled={isAutoFilling || isAnalyzing}
              >
                {isAutoFilling ? 'Fetching averages...' : 'Autofill Latest Avg EEG'}
              </button>
              {autoFillError && <div className="error-message"><p>{autoFillError}</p></div>}
            </div>
            <EEGInputForm 
              onEEGSubmit={handleEEGSubmit}
              type="eeg"
            />
          </div>
        );
      
      case 'biometric-input':
        return (
          <div className="form-section">
            <div style={{ marginBottom: 12 }}>
              <button
                className="action-button"
                onClick={handleAutoFillAndSubmitBiometric}
                disabled={isAutoFilling || isAnalyzing}
              >
                {isAutoFilling ? 'Fetching averages...' : 'Autofill Latest Avg Biometric'}
              </button>
              {autoFillError && <div className="error-message"><p>{autoFillError}</p></div>}
            </div>
            <BiometricInputForm 
              onBiometricSubmit={handleBiometricSubmit}
            />
          </div>
        );
      
      case 'eeg-result':
        return (
          <div className="result-section">
            {eegPrediction && (
              <ConfidenceReport 
                confidenceScores={eegPrediction.confidence_scores}
                type="eeg"
                title="🧠 EEG Analysis Results"
              />
            )}
            {error && (
              <div className="error-message">
                <p>{error}</p>
              </div>
            )}
          </div>
        );
      
      case 'final-result':
        return (
          <div className="final-results">
            <div className="result-section">
              {eegPrediction && (
                <ConfidenceReport 
                  confidenceScores={eegPrediction.confidence_scores}
                  type="eeg"
                  title="🧠 EEG Analysis Results"
                />
              )}
            </div>
            <div className="result-section">
              {biometricPrediction && (
                <ConfidenceReport 
                  confidenceScores={biometricPrediction.confidence_scores}
                  type="biometric"
                  title="💓 Biometric Analysis Results"
                />
              )}
            </div>

            <div style={{ marginTop: 16 }}>
              <button
                className="action-button"
                onClick={sendCombinedReadings}
                disabled={isAnalyzing || (!eegPrediction && !biometricPrediction)}
              >
                {isAnalyzing ? 'Sending...' : 'Send Readings to Combined App'}
              </button>
            </div>

            {error && (
              <div className="error-message">
                <p>{error}</p>
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="realtime-test">
      <div className="test-container">
        <div className="step-indicator">
          <div className="step-dots">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`step-dot ${index <= currentStep ? 'active' : ''} ${index === currentStep ? 'current' : ''}`}
              />
            ))}
          </div>
          <div className="step-text">
            Step {currentStep + 1} of {steps.length}
          </div>
        </div>

        <div className="step-content">
          <div className="step-header">
            <h2 className="step-title">{currentStepData.title}</h2>
            <p className="step-subtitle">{currentStepData.subtitle}</p>
          </div>

          <div className="animation-section">
            {currentStepData.animation && (
              <div className="animation-container">
                <div className="animation-glow">
                  <Lottie
                    animationData={currentStepData.animation}
                    loop={true}
                    autoplay={true}
                    style={{ width: 350, height: 250 }}
                  />
                </div>
              </div>
            )}
            
            {getStepContent()}
          </div>

          <div className="step-actions">
            {currentStepData.showButton && (
              <button
                className={`action-button ${isAnalyzing ? 'analyzing' : ''}`}
                onClick={handleNextStep}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <div className="loading-spinner" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    {currentStepData.buttonText}
                    {currentStepData.buttonIcon}
                  </>
                )}
              </button>
            )}
            
            {isAnalyzing && (
              <div className="analyzing-message">
                <div className="loading-spinner" />
                <p>Processing your data...</p>
              </div>
            )}
          </div>
        </div>

        <div className="navigation-footer">
          <button className="nav-button home" onClick={() => window.location.href = '/'}>
            <FaHome /> Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default RealTimeTest;