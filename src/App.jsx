import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { FaBrain, FaHeartbeat, FaThermometerHalf, FaComments, FaUserMd, FaExclamationTriangle } from 'react-icons/fa';
import Header from './components/Header';
import GreetingSection from './components/GreetingSection';
import EEGInputForm from './components/EEGInputForm';
import ConfidenceReport from './components/ConfidenceReport';
import DoctorRecommendations from './components/DoctorRecommendations';
import Chatbot from './components/Chatbot';
import Footer from './components/Footer';
import AnimationTest from './components/AnimationTest';
import RealTimeTest from './pages/RealTimeTest';
import './App.css';

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [eegPrediction, setEegPrediction] = useState(null);
  const [biometricPrediction, setBiometricPrediction] = useState(null);
  const [showDoctors, setShowDoctors] = useState(false);
  const [isMainChatbotOpen, setIsMainChatbotOpen] = useState(false);
  const [error, setError] = useState(null);

  const handleEEGSubmit = async (eegData) => {
    setIsLoading(true);
    setError(null);
    
    console.log('Submitting EEG data:', eegData);
    
    try {
      const response = await fetch("http://127.0.0.1:5000/predict_eeg", {
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
        setShowDoctors(true);
      }
    } catch (error) {
      console.error("EEG Error:", error);
      setError("Failed to connect to EEG prediction service. Please ensure the Flask server is running on http://127.0.0.1:5000");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricSubmit = async (biometricData) => {
    setIsLoading(true);
    setError(null);
    
    console.log('Submitting biometric data:', biometricData);
    
    try {
      const response = await fetch("http://127.0.0.1:5000/predict_combined", {
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
        setShowDoctors(true);
      }
    } catch (error) {
      console.error("Biometric Error:", error);
      setError("Failed to connect to biometric prediction service. Please ensure the Flask server is running on http://127.0.0.1:5000");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Router>
      <div className="app">
        <Header />
        
        <Routes>
          <Route path="/" element={
            <main className="main-content">
              <GreetingSection />
              
              <div className="platform-title">
                <h1 className="title">
                  <FaBrain className="title-icon" />
                  AnxiPredoMeter
                </h1>
                <p className="subtitle">Advanced Anxiety Disorder Prediction Platform</p>
              </div>
              
              <AnimationTest />
              
              <div className="dual-section-container">
                {/* Left Section - EEG Analysis */}
                <div className="section-left">
                  <div className="section-header">
                    <FaBrain className="section-icon" />
                    <h2>EEG Brain Activity Analysis</h2>
                    <p>Brain wave pattern analysis using Random Forest Model</p>
                  </div>
                  
                  <EEGInputForm 
                    onEEGSubmit={handleEEGSubmit}
                    type="eeg"
                  />
                  
                  {eegPrediction && (
                    <ConfidenceReport 
                      confidenceScores={eegPrediction.confidence_scores}
                      type="eeg"
                      title="🧠 EEG Analysis Results"
                    />
                  )}
                </div>

                {/* Right Section - GSR + Oximeter Analysis */}
                <div className="section-right">
                  <div className="section-header">
                    <FaHeartbeat className="section-icon" />
                    <h2>GSR + Oximeter Analysis</h2>
                    <p>Physiological response analysis using Combined Model</p>
                  </div>
                  
                  <EEGInputForm 
                    onBiometricSubmit={handleBiometricSubmit}
                    type="biometric"
                  />
                  
                  {biometricPrediction && (
                    <ConfidenceReport 
                      confidenceScores={biometricPrediction.confidence_scores}
                      type="biometric"
                      title="💓 Biometric Analysis Results"
                    />
                  )}
                </div>
              </div>
              
              {isLoading && (
                <div className="loading-section">
                  <div className="loading-spinner"></div>
                  <p>Analyzing data with trained machine learning models...</p>
                </div>
              )}
              
              {error && (
                <div className="error-section">
                  <div className="error-message">
                    <FaExclamationTriangle className="error-icon" />
                    <p>{error}</p>
                  </div>
                </div>
              )}
              
              {showDoctors && (
                <DoctorRecommendations />
              )}
            </main>
          } />
          <Route path="/realtime" element={<RealTimeTest />} />
        </Routes>
        
        <Chatbot 
          isOpen={isMainChatbotOpen}
          onToggle={() => setIsMainChatbotOpen(!isMainChatbotOpen)}
        />
        
        <Footer />
      </div>
    </Router>
  );
}

export default App; 