import React, { useState, useEffect } from 'react';
import { FaBrain, FaHeartbeat, FaThermometerHalf, FaWaveSquare, FaChartLine, FaSync, FaWifi, FaTimes } from 'react-icons/fa';
import './EEGInputForm.css';

const EEGInputForm = ({ onEEGSubmit, onBiometricSubmit, type = 'both', initialValues = null }) => {
  const [eegData, setEegData] = useState({
    beta: '',
    gamma: '',
    delta: '',
    alpha: '',
    theta: ''
  });

  const [isConnected, setIsConnected] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [lastData, setLastData] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  // Initialize form with initialValues if provided
  useEffect(() => {
    if (initialValues && type === 'eeg') {
      setEegData({
        delta: initialValues.delta?.toString() || '',
        theta: initialValues.theta?.toString() || '',
        alpha: initialValues.alpha?.toString() || '',
        beta: initialValues.beta?.toString() || '',
        gamma: initialValues.gamma?.toString() || ''
      });
      setLastData(initialValues);
      setIsConnected(true);
      setConnectionStatus('connected');
    }
  }, [initialValues, type]);

  // Function to fetch latest EEG data
  const fetchEEGData = async () => {
    setIsFetching(true);
    setConnectionStatus('connecting');
    
    try {
      const serverBase = 'http://127.0.0.1:5000';
      const testResponse = await fetch(`${serverBase}/test`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!testResponse.ok) {
        throw new Error('Server not responding');
      }
      
      setConnectionStatus('connected');
      setIsConnected(true);
      
      // Fetch latest EEG data from server
      const eegResponse = await fetch(`${serverBase}/latest_avg_eeg`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (eegResponse.ok) {
        const eegResult = await eegResponse.json();
        const eegData = eegResult.data;
        
        setEegData({
          delta: eegData.delta?.toString() || '',
          theta: eegData.theta?.toString() || '',
          alpha: eegData.alpha?.toString() || '',
          beta: eegData.beta?.toString() || '',
          gamma: eegData.gamma?.toString() || ''
        });
        setLastData(eegData);
        console.log('Fetched EEG data:', eegData);
      } else {
        throw new Error('No EEG data available');
      }
      
    } catch (error) {
      console.error('Error fetching EEG data:', error);
      setConnectionStatus('error');
      setIsConnected(false);
    } finally {
      setIsFetching(false);
    }
  };

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

  const handleRefreshData = () => {
    fetchEEGData();
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <FaWifi className="connection-icon connected" />;
      case 'connecting':
        return <FaSync className="connection-icon connecting" />;
      case 'error':
        return <FaTimes className="connection-icon error" />;
      default:
        return <FaTimes className="connection-icon disconnected" />;
    }
  };

  const getConnectionText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'EEG Device Connected';
      case 'connecting':
        return 'Connecting to EEG Device...';
      case 'error':
        return 'Connection Failed';
      default:
        return 'EEG Device Disconnected';
    }
  };

  // Show only EEG form if type is 'eeg'
  if (type === 'eeg') {
    return (
      <div className="form-section eeg-section">
        <div className="connection-status">
          {getConnectionIcon()}
          <span className="connection-text">{getConnectionText()}</span>
          <button 
            className="refresh-btn" 
            onClick={handleRefreshData}
            disabled={isFetching}
          >
            <FaSync className={`refresh-icon ${isFetching ? 'spinning' : ''}`} />
            Refresh
          </button>
        </div>

        {lastData && (
          <div className="last-data-display">
            <h4>Last EEG Reading:</h4>
            <div className="data-values">
              <span>Delta: {lastData.delta || 'N/A'}</span>
              <span>Theta: {lastData.theta || 'N/A'}</span>
              <span>Alpha: {lastData.alpha || 'N/A'}</span>
              <span>Beta: {lastData.beta || 'N/A'}</span>
              <span>Gamma: {lastData.gamma || 'N/A'}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleEEGSubmit} className="eeg-form">
          <div className="form-grid">
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
                step="0.0001"
                required
              />
              {isConnected && lastData && (
                <button 
                  type="button" 
                  className="auto-fill-btn"
                  onClick={() => setEegData(prev => ({ ...prev, delta: lastData?.delta?.toString() || '' }))}
                >
                  Use Device Data
                </button>
              )}
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
                step="0.0001"
                required
              />
              {isConnected && lastData && (
                <button 
                  type="button" 
                  className="auto-fill-btn"
                  onClick={() => setEegData(prev => ({ ...prev, theta: lastData?.theta?.toString() || '' }))}
                >
                  Use Device Data
                </button>
              )}
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
                step="0.0001"
                required
              />
              {isConnected && lastData && (
                <button 
                  type="button" 
                  className="auto-fill-btn"
                  onClick={() => setEegData(prev => ({ ...prev, alpha: lastData?.alpha?.toString() || '' }))}
                >
                  Use Device Data
                </button>
              )}
            </div>
            
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
                step="0.0001"
                required
              />
              {isConnected && lastData && (
                <button 
                  type="button" 
                  className="auto-fill-btn"
                  onClick={() => setEegData(prev => ({ ...prev, beta: lastData?.beta?.toString() || '' }))}
                >
                  Use Device Data
                </button>
              )}
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
                step="0.0001"
                required
              />
              {isConnected && lastData && (
                <button 
                  type="button" 
                  className="auto-fill-btn"
                  onClick={() => setEegData(prev => ({ ...prev, gamma: lastData?.gamma?.toString() || '' }))}
                >
                  Use Device Data
                </button>
              )}
            </div>
          </div>
          
          <div className="form-actions">
            <button 
              type="button" 
              className="auto-fill-all-btn"
              onClick={() => {
                if (lastData) {
                  setEegData({
                    delta: lastData.delta?.toString() || '',
                    theta: lastData.theta?.toString() || '',
                    alpha: lastData.alpha?.toString() || '',
                    beta: lastData.beta?.toString() || '',
                    gamma: lastData.gamma?.toString() || ''
                  });
                }
              }}
              disabled={!isConnected || !lastData}
            >
              <FaSync className="btn-icon" />
              Auto-Fill All EEG Data
            </button>
            
            <button type="submit" className="submit-btn eeg-btn">
              <FaBrain className="btn-icon" />
              Analyze EEG Data
            </button>
          </div>
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