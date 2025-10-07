import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaBrain, FaHeartbeat, FaThermometerHalf, FaHome } from 'react-icons/fa';
import './Header.css';

const Header = () => {
  const location = useLocation();
  
  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">
          <FaBrain className="logo-icon" />
          <h1>AnxiPredoMeter</h1>
        </Link>
        
        <nav className="nav">
          <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
            <FaHome className="nav-icon" />
            <span>Home</span>
          </Link>
          <Link to="/realtime" className={`nav-item ${location.pathname === '/realtime' ? 'active' : ''}`}>
            <FaThermometerHalf className="nav-icon" />
            <span>Real-Time Test</span>
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header; 