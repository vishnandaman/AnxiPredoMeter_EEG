import React, { useState } from 'react';
import { FaBrain, FaHeartbeat, FaThermometerHalf, FaWaveSquare, FaChartLine } from 'react-icons/fa';
import './EEGInputForm.css';

const EEGInputForm = ({ onEEGSubmit, onBiometricSubmit, type = 'both' }) => {
  const [eegData, setEegData] = useState({
    beta: '',
    gamma: '',
    delta: '',
    alpha: '',
    theta: ''
  });

  const [biometricData, setBiometricData] = useState({
    spo2: '',
    gsr: ''
  });

  const handleEEGChange = (e) => {
    const { name, value } = e.target;
    setEegData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBiometricChange = (e) => {
    const { name, value } = e.target;
    setBiometricData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEEGSubmit = (e) => {
    e.preventDefault();
    if (Object.values(eegData).every(value => value !== '')) {
      onEEGSubmit(eegData);
    }
  };

  const handleBiometricSubmit = (e) => {
    e.preventDefault();
    if (Object.values(biometricData).every(value => value !== '')) {
      onBiometricSubmit(biometricData);
    }
  };

  // Show only EEG form if type is 'eeg'
  if (type === 'eeg') {
    return (
      <div className="form-section eeg-section">
        <form onSubmit={handleEEGSubmit} className="eeg-form">
          <div className="form-grid">
            <div className="input-group">
              <label htmlFor="beta">
                <FaWaveSquare className="input-icon" />
                Beta Waves
              </label>
              <input
                type="number"
                id="beta"
                name="beta"
                value={eegData.beta}
                onChange={handleEEGChange}
                placeholder="Enter beta wave value"
                step="0.01"
                required
              />
            </div>
            
            <div className="input-group">
              <label htmlFor="gamma">
                <FaWaveSquare className="input-icon" />
                Gamma Waves
              </label>
              <input
                type="number"
                id="gamma"
                name="gamma"
                value={eegData.gamma}
                onChange={handleEEGChange}
                placeholder="Enter gamma wave value"
                step="0.01"
                required
              />
            </div>
            
            <div className="input-group">
              <label htmlFor="delta">
                <FaWaveSquare className="input-icon" />
                Delta Waves
              </label>
              <input
                type="number"
                id="delta"
                name="delta"
                value={eegData.delta}
                onChange={handleEEGChange}
                placeholder="Enter delta wave value"
                step="0.01"
                required
              />
            </div>
            
            <div className="input-group">
              <label htmlFor="alpha">
                <FaWaveSquare className="input-icon" />
                Alpha Waves
              </label>
              <input
                type="number"
                id="alpha"
                name="alpha"
                value={eegData.alpha}
                onChange={handleEEGChange}
                placeholder="Enter alpha wave value"
                step="0.01"
                required
              />
            </div>
            
            <div className="input-group">
              <label htmlFor="theta">
                <FaWaveSquare className="input-icon" />
                Theta Waves
              </label>
              <input
                type="number"
                id="theta"
                name="theta"
                value={eegData.theta}
                onChange={handleEEGChange}
                placeholder="Enter theta wave value"
                step="0.01"
                required
              />
            </div>
          </div>
          
          <button type="submit" className="submit-btn eeg-btn">
            <FaBrain className="btn-icon" />
            Analyze EEG Data
          </button>
        </form>
      </div>
    );
  }

  // Show only biometric form if type is 'biometric'
  if (type === 'biometric') {
    return (
      <div className="form-section biometric-section">
        <form onSubmit={handleBiometricSubmit} className="biometric-form">
          <div className="form-grid">
            <div className="input-group">
              <label htmlFor="spo2">
                <FaThermometerHalf className="input-icon" />
                SpO2 Level (%)
              </label>
              <input
                type="number"
                id="spo2"
                name="spo2"
                value={biometricData.spo2}
                onChange={handleBiometricChange}
                placeholder="Enter SpO2 percentage"
                min="0"
                max="100"
                step="0.1"
                required
              />
            </div>
            
            <div className="input-group">
              <label htmlFor="gsr">
                <FaChartLine className="input-icon" />
                GSR Reading
              </label>
              <input
                type="number"
                id="gsr"
                name="gsr"
                value={biometricData.gsr}
                onChange={handleBiometricChange}
                placeholder="Enter GSR value"
                step="0.01"
                required
              />
            </div>
          </div>
          
          <button type="submit" className="submit-btn biometric-btn">
            <FaHeartbeat className="btn-icon" />
            Analyze Biometric Data
          </button>
        </form>
      </div>
    );
  }

  // Show both forms if type is 'both' (default)
  return (
    <div className="input-forms-container">
      {/* EEG Analysis Form */}
      <div className="form-section">
        <div className="form-header">
          <FaBrain className="form-icon" />
          <h3>EEG Brain Activity Analysis</h3>
          <p>Enter brain wave measurements for anxiety disorder prediction</p>
        </div>
        
        <form onSubmit={handleEEGSubmit} className="eeg-form">
          <div className="form-grid">
            <div className="input-group">
              <label htmlFor="beta">
                <FaWaveSquare className="input-icon" />
                Beta Waves
              </label>
              <input
                type="number"
                id="beta"
                name="beta"
                value={eegData.beta}
                onChange={handleEEGChange}
                placeholder="Enter beta wave value"
                step="0.01"
                required
              />
            </div>
            
            <div className="input-group">
              <label htmlFor="gamma">
                <FaWaveSquare className="input-icon" />
                Gamma Waves
              </label>
              <input
                type="number"
                id="gamma"
                name="gamma"
                value={eegData.gamma}
                onChange={handleEEGChange}
                placeholder="Enter gamma wave value"
                step="0.01"
                required
              />
            </div>
            
            <div className="input-group">
              <label htmlFor="delta">
                <FaWaveSquare className="input-icon" />
                Delta Waves
              </label>
              <input
                type="number"
                id="delta"
                name="delta"
                value={eegData.delta}
                onChange={handleEEGChange}
                placeholder="Enter delta wave value"
                step="0.01"
                required
              />
            </div>
            
            <div className="input-group">
              <label htmlFor="alpha">
                <FaWaveSquare className="input-icon" />
                Alpha Waves
              </label>
              <input
                type="number"
                id="alpha"
                name="alpha"
                value={eegData.alpha}
                onChange={handleEEGChange}
                placeholder="Enter alpha wave value"
                step="0.01"
                required
              />
            </div>
            
            <div className="input-group">
              <label htmlFor="theta">
                <FaWaveSquare className="input-icon" />
                Theta Waves
              </label>
              <input
                type="number"
                id="theta"
                name="theta"
                value={eegData.theta}
                onChange={handleEEGChange}
                placeholder="Enter theta wave value"
                step="0.01"
                required
              />
            </div>
          </div>
          
          <button type="submit" className="submit-btn eeg-btn">
            <FaBrain className="btn-icon" />
            Analyze EEG Data
          </button>
        </form>
      </div>

      {/* Biometric Analysis Form */}
      <div className="form-section">
        <div className="form-header">
          <FaHeartbeat className="form-icon" />
          <h3>Biometric Physiological Analysis</h3>
          <p>Enter physiological measurements for anxiety disorder prediction</p>
        </div>
        
        <form onSubmit={handleBiometricSubmit} className="biometric-form">
          <div className="form-grid">
            <div className="input-group">
              <label htmlFor="spo2">
                <FaThermometerHalf className="input-icon" />
                SpO2 Level (%)
              </label>
              <input
                type="number"
                id="spo2"
                name="spo2"
                value={biometricData.spo2}
                onChange={handleBiometricChange}
                placeholder="Enter SpO2 percentage"
                min="0"
                max="100"
                step="0.1"
                required
              />
            </div>
            
            <div className="input-group">
              <label htmlFor="gsr">
                <FaChartLine className="input-icon" />
                GSR Reading
              </label>
              <input
                type="number"
                id="gsr"
                name="gsr"
                value={biometricData.gsr}
                onChange={handleBiometricChange}
                placeholder="Enter GSR value"
                step="0.01"
                required
              />
            </div>
          </div>
          
          <button type="submit" className="submit-btn biometric-btn">
            <FaHeartbeat className="btn-icon" />
            Analyze Biometric Data
          </button>
        </form>
      </div>
    </div>
  );
};

export default EEGInputForm; 