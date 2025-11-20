import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaBrain, FaThermometerHalf, FaHome, FaUserMd, FaSignOutAlt, FaTachometerAlt } from 'react-icons/fa';
import './Header.css';

const SERVER_BASE = 'http://127.0.0.1:5000';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [isDoctorLoggedIn, setIsDoctorLoggedIn] = useState(false);

  useEffect(() => {
    // Check if doctor is logged in
    const loggedIn = localStorage.getItem('isDoctorLoggedIn') === 'true';
    const doctorData = localStorage.getItem('doctor');
    
    if (loggedIn && doctorData) {
      setIsDoctorLoggedIn(true);
      setDoctor(JSON.parse(doctorData));
    }
  }, [location]);

  const handleLogout = async () => {
    // Show confirmation toast
    const doctorName = doctor?.name || 'Doctor';
    
    toast.info(`Logging out ${doctorName}...`, {
      position: "top-right",
      autoClose: 1500,
    });

    try {
      await fetch(`${SERVER_BASE}/api/doctor/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
    
    localStorage.removeItem('isDoctorLoggedIn');
    localStorage.removeItem('doctor');
    setIsDoctorLoggedIn(false);
    setDoctor(null);
    
    // Success notification
    toast.success('Logged out successfully. See you soon!', {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });

    // Navigate after a short delay for better UX
    setTimeout(() => {
    navigate('/');
    }, 500);
  };

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">
          <FaBrain className="logo-icon" />
          <h1>AnxiePredict</h1>
        </Link>
        
        <nav className="nav">
          {isDoctorLoggedIn ? (
            <>
              <Link to="/dashboard" className={`nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}>
                <FaTachometerAlt className="nav-icon" />
                <span>Dashboard</span>
              </Link>
              <Link to="/realtime" className={`nav-item ${location.pathname === '/realtime' ? 'active' : ''}`}>
                <FaThermometerHalf className="nav-icon" />
                <span>Real-Time Test</span>
              </Link>
              <div className="doctor-info">
                <FaUserMd className="doctor-icon" />
                <span className="doctor-name">{doctor?.name || 'Doctor'}</span>
                <button onClick={handleLogout} className="logout-button" title="Logout">
                  <FaSignOutAlt />
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
                <FaHome className="nav-icon" />
                <span>Home</span>
              </Link>
              <Link to="/realtime" className={`nav-item ${location.pathname === '/realtime' ? 'active' : ''}`}>
                <FaThermometerHalf className="nav-icon" />
                <span>Real-Time Test</span>
              </Link>
              <Link to="/doctor-login" className={`nav-item ${location.pathname === '/doctor-login' ? 'active' : ''}`}>
                <FaUserMd className="nav-icon" />
                <span>Doctor Login</span>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header; 