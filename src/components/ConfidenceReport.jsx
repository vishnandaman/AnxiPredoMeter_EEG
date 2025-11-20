import React from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaBrain } from 'react-icons/fa';
import './ConfidenceReport.css';

const ConfidenceReport = ({ confidenceScores, type, title }) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case '✅':
        return <FaCheckCircle className="status-icon healthy" />;
      case '⚠️':
        return <FaExclamationTriangle className="status-icon warning" />;
      case 'ℹ️':
        return <FaInfoCircle className="status-icon info" />;
      case '🧠':
        return <FaBrain className="status-icon brain" />;
      default:
        return <FaInfoCircle className="status-icon info" />;
    }
  };

  const getProgressColor = (confidence) => {
    if (confidence > 50) return 'var(--accent-success)';
    if (confidence > 20) return 'var(--accent-warning)';
    if (confidence > 5) return 'var(--accent-primary)';
    return 'var(--text-muted)';
  };

  const formatDisorderName = (disorder) => {
    return disorder
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="confidence-report">
      <div className="report-header">
        <h2>Report Analysis:</h2>
        <p>Based on your {type === 'eeg' ? 'EEG' : 'biometric'} data, here's our analysis:</p>
      </div>

      <div className="confidence-table">
        <div className="table-header">
          <div className="header-cell disorder">Disorder / Condition</div>
          <div className="header-cell confidence">Confidence (%)</div>
          <div className="header-cell status">Status</div>
          <div className="header-cell note">Note</div>
        </div>

        <div className="table-body">
          {confidenceScores.map((score, index) => (
            <div key={index} className="table-row">
              <div className="cell disorder">
                <span className="disorder-name">{formatDisorderName(score.disorder) || '—'}</span>
              </div>
              
              <div className="cell confidence">
                <div className="progress-container">
                  <div 
                    className="progress-bar"
                    style={{ 
                      width: `${score.confidence}%`,
                      backgroundColor: getProgressColor(score.confidence)
                    }}
                  ></div>
                  <span className="confidence-text">{score.confidence}%</span>
                </div>
              </div>
              
              <div className="cell status">
                {getStatusIcon(score.status)}
              </div>
              
              <div className="cell note">
                <span className="note-text">{score.note}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="report-footer">
        <div className="legend">
          <div className="legend-item">
            <FaCheckCircle className="legend-icon healthy" />
            <span>High Confidence (&gt;50%)</span>
          </div>
          <div className="legend-item">
            <FaExclamationTriangle className="legend-icon warning" />
            <span>Moderate Confidence (20-50%)</span>
          </div>
          <div className="legend-item">
            <FaInfoCircle className="legend-icon info" />
            <span>Low Confidence (5-20%)</span>
          </div>
          <div className="legend-item">
            <FaBrain className="legend-icon brain" />
            <span>Very Low Confidence (&lt;5%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfidenceReport; 