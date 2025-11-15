import React from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaBrain, FaHeartbeat } from 'react-icons/fa';
import ConfidenceReport from './ConfidenceReport';
import DoctorRecommendations from './DoctorRecommendations';
import './ResultsSection.css';

const ResultsSection = ({ prediction, type, title, subtitle }) => {
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
      return <FaCheckCircle />;
    } else if (lowerPrediction.includes('social anxiety')) {
      return <FaExclamationTriangle />;
    } else if (lowerPrediction.includes('panic disorder')) {
      return <FaExclamationTriangle />;
    } else if (lowerPrediction.includes('generalized anxiety')) {
      return <FaInfoCircle />;
    } else if (lowerPrediction.includes('obsessive compulsitve')) {
      return <FaBrain />;
    } else {
      return <FaInfoCircle />;
    }
  };

  const predictionColor = getPredictionColor(prediction.result);
  const predictionIcon = getPredictionIcon(prediction.result);

  // Ensure confidence_scores is an array
  const confidenceScores = Array.isArray(prediction.confidence_scores) 
    ? prediction.confidence_scores 
    : prediction.confidence_scores && typeof prediction.confidence_scores === 'object'
    ? Object.entries(prediction.confidence_scores).map(([disorder, confidence]) => ({
        disorder,
        confidence: typeof confidence === 'number' ? confidence : 0,
        status: typeof confidence === 'number' 
          ? (confidence > 50 ? '✅' : confidence > 20 ? '⚠️' : confidence > 5 ? 'ℹ️' : '🧠')
          : 'ℹ️',
        note: `Confidence level: ${typeof confidence === 'number' ? confidence.toFixed(1) : 'N/A'}%`
      }))
    : [];

  return (
    <div className="results-section">
      <div className="results-header">
        <h2>{title}</h2>
        <p className="results-subtitle">{subtitle}</p>
        <div className="results-divider"></div>
      </div>

      {/* Main Prediction Card */}
      <div className="prediction-card" style={{ borderColor: predictionColor }}>
        <div className="prediction-icon" style={{ color: predictionColor }}>
          {predictionIcon}
        </div>
        
        <div className="prediction-content">
          <h3 className="prediction-title">Predicted Disorder:</h3>
          <p className="prediction-value" style={{ color: predictionColor }}>
            {prediction.result}
          </p>
        </div>
      </div>

      {/* Detailed Confidence Report */}
      {confidenceScores && confidenceScores.length > 0 && (
        <ConfidenceReport 
          confidenceScores={confidenceScores}
          type={type || 'eeg'}
          title={type === 'eeg' ? '🧠 EEG Analysis Confidence Report' : '💓 Biometric Analysis Confidence Report'}
        />
      )}

      {/* Doctor Recommendations */}
      <DoctorRecommendations prediction={prediction} />

      {/* Disclaimer */}
      <div className="disclaimer">
        <FaInfoCircle className="disclaimer-icon" />
        <p>
          <strong>Medical Disclaimer:</strong> This analysis uses trained machine learning models for research purposes. 
          The results show specific anxiety disorder classifications based on your trained models. 
          For clinical diagnosis and treatment, please consult with a qualified healthcare professional.
        </p>
      </div>
    </div>
  );
};

export default ResultsSection; 