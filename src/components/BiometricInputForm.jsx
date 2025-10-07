import React, { useState, useEffect } from 'react';
import { FaHeartbeat, FaThermometerHalf, FaChartLine, FaSync, FaWifi, FaTimes } from 'react-icons/fa';
import './BiometricInputForm.css';

const BiometricInputForm = ({ onBiometricSubmit }) => {
  const [biometricData, setBiometricData] = useState({
    spo2: '',
    gsr: ''
  });

  const [isConnected, setIsConnected] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [lastData, setLastData] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  // Function to fetch latest data from Arduino
  const fetchArduinoData = async () => {
    setIsFetching(true);
    setConnectionStatus('connecting');
    
    try {
      // First check if server is running
      const testResponse = await fetch('http://127.0.0.1:5000/test', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!testResponse.ok) {
        throw new Error('Server not responding');
      }
      
      setConnectionStatus('connected');
      setIsConnected(true);
      
      // Fetch latest Arduino data from server
      const arduinoResponse = await fetch('http://127.0.0.1:5000/latest_arduino_data', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (arduinoResponse.ok) {
        const arduinoResult = await arduinoResponse.json();
        const arduinoData = arduinoResult.data;
        
        setBiometricData(arduinoData);
        setLastData(arduinoData);
        console.log('Fetched Arduino data:', arduinoData);
      } else {
        // If no Arduino data available, use mock data for testing
        const mockArduinoData = {
          spo2: 88.5,  // This would come from Arduino
          gsr: 0.2862  // This would come from Arduino
        };
        
        setBiometricData(mockArduinoData);
        setLastData(mockArduinoData);
        console.log('Using mock Arduino data:', mockArduinoData);
      }
      
    } catch (error) {
      console.error('Error fetching Arduino data:', error);
      setConnectionStatus('error');
      setIsConnected(false);
    } finally {
      setIsFetching(false);
    }
  };

  // Auto-fetch data when component mounts
  useEffect(() => {
    fetchArduinoData();
  }, []);

  const handleBiometricChange = (e) => {
    const { name, value } = e.target;
    setBiometricData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBiometricSubmit = (e) => {
    e.preventDefault();
    if (Object.values(biometricData).every(value => value !== '')) {
      onBiometricSubmit(biometricData);
    }
  };

  const handleRefreshData = () => {
    fetchArduinoData();
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
        return 'Arduino Connected';
      case 'connecting':
        return 'Connecting to Arduino...';
      case 'error':
        return 'Connection Failed';
      default:
        return 'Arduino Disconnected';
    }
  };

  return (
    <div className="form-section biometric-section">
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
          <h4>📊 Last Arduino Reading:</h4>
          <div className="data-values">
            <span>SpO2: {lastData.spo2}%</span>
            <span>GSR: {lastData.gsr}</span>
          </div>
        </div>
      )}

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
            {isConnected && (
              <button 
                type="button" 
                className="auto-fill-btn"
                onClick={() => setBiometricData(prev => ({ ...prev, spo2: lastData?.spo2 || '' }))}
              >
                Use Arduino Data
              </button>
            )}
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
              step="0.0001"
              required
            />
            {isConnected && (
              <button 
                type="button" 
                className="auto-fill-btn"
                onClick={() => setBiometricData(prev => ({ ...prev, gsr: lastData?.gsr || '' }))}
              >
                Use Arduino Data
              </button>
            )}
          </div>
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            className="auto-fill-all-btn"
            onClick={() => setBiometricData(lastData || { spo2: '', gsr: '' })}
            disabled={!isConnected || !lastData}
          >
            <FaSync className="btn-icon" />
            Auto-Fill All Arduino Data
          </button>
          
          <button type="submit" className="submit-btn biometric-btn">
            <FaHeartbeat className="btn-icon" />
            Analyze Biometric Data
          </button>
        </div>
      </form>
    </div>
  );
};

export default BiometricInputForm;
