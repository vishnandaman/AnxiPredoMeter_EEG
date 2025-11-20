import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaUserMd, FaLock, FaEnvelope, FaUser, FaSpinner, FaEye, FaEyeSlash, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import './DoctorLogin.css';

const SERVER_BASE = 'http://127.0.0.1:5000';

const DoctorLogin = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [nameError, setNameError] = useState('');
  const navigate = useNavigate();

  // Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Password strength validation for registration
  const validatePassword = (password) => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    return '';
  };

  // Name validation
  const validateName = (name) => {
    if (name.trim().length < 2) {
      return 'Name must be at least 2 characters long';
    }
    return '';
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (!isLogin && value && !validateEmail(value)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    if (!isLogin && value) {
      const error = validatePassword(value);
      setPasswordError(error);
    } else {
      setPasswordError('');
    }
  };

  const handleNameChange = (e) => {
    const value = e.target.value;
    setName(value);
    if (value) {
      const error = validateName(value);
      setNameError(error);
    } else {
      setNameError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setEmailError('');
    setPasswordError('');
    setNameError('');

    // Validation
    if (!isLogin) {
      if (!name.trim()) {
        setNameError('Name is required');
        toast.error('Please enter your full name', {
          position: "top-right",
          autoClose: 3000,
        });
        return;
      }
      const nameErr = validateName(name);
      if (nameErr) {
        setNameError(nameErr);
        toast.error(nameErr, {
          position: "top-right",
          autoClose: 3000,
        });
        return;
      }
    }

    if (!email) {
      setEmailError('Email is required');
      toast.error('Please enter your email address', {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      toast.error('Please enter a valid email address', {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    if (!password) {
      setPasswordError('Password is required');
      toast.error('Please enter your password', {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    if (!isLogin) {
      const passwordErr = validatePassword(password);
      if (passwordErr) {
        setPasswordError(passwordErr);
        toast.error(passwordErr, {
          position: "top-right",
          autoClose: 3000,
        });
        return;
      }
    }

    setLoading(true);

    // Show loading notification
    toast.info(isLogin ? 'Logging in...' : 'Creating your account...', {
      position: "top-right",
      autoClose: 2000,
    });

    try {
      const endpoint = isLogin ? '/api/doctor/login' : '/api/doctor/register';
      const body = isLogin
        ? { email, password }
        : { email, password, name, license_number: licenseNumber };

      const response = await fetch(`${SERVER_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for session cookies
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store doctor info in localStorage for easy access
        localStorage.setItem('doctor', JSON.stringify(data.doctor));
        localStorage.setItem('isDoctorLoggedIn', 'true');
        
        // Success notification
        toast.success(
          isLogin 
            ? `Welcome back, ${data.doctor?.name || 'Doctor'}!` 
            : `Account created successfully! Welcome, ${data.doctor?.name || 'Doctor'}!`,
          {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          }
        );

        // Small delay for better UX
        setTimeout(() => {
          navigate('/dashboard');
        }, 500);
      } else {
        const errorMsg = data.error || 'Something went wrong';
        setError(errorMsg);
        toast.error(errorMsg, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    } catch (err) {
      const errorMsg = 'Failed to connect to server. Please ensure the Flask server is running.';
      setError(errorMsg);
      console.error('Error:', err);
      toast.error(errorMsg, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="doctor-auth-container">
      <div className="doctor-auth-card">
        <div className="doctor-auth-header">
          <FaUserMd className="auth-icon" />
          <h2>{isLogin ? 'Doctor Login' : 'Doctor Registration'}</h2>
          <p>AnxiePredict - Intelligent Anxiety Assessment Platform</p>
        </div>

        {error && (
          <div className="error-message">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="doctor-auth-form">
          {!isLogin && (
            <div className="form-group">
              <label>
                <FaUser className="input-icon" />
                Full Name
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  value={name}
                  onChange={handleNameChange}
                  required={!isLogin}
                  placeholder="Enter your full name"
                  className={nameError ? 'input-error' : name && !nameError ? 'input-success' : ''}
                />
                {name && !nameError && (
                  <FaCheckCircle className="input-status-icon success-icon" />
                )}
                {nameError && (
                  <FaExclamationCircle className="input-status-icon error-icon" />
                )}
              </div>
              {nameError && <span className="field-error">{nameError}</span>}
            </div>
          )}

          <div className="form-group">
            <label>
              <FaEnvelope className="input-icon" />
              Email
            </label>
            <div className="input-wrapper">
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                required
                placeholder="Enter your email"
                className={emailError ? 'input-error' : email && !emailError && validateEmail(email) ? 'input-success' : ''}
              />
              {email && !emailError && validateEmail(email) && (
                <FaCheckCircle className="input-status-icon success-icon" />
              )}
              {emailError && (
                <FaExclamationCircle className="input-status-icon error-icon" />
              )}
            </div>
            {emailError && <span className="field-error">{emailError}</span>}
          </div>

          {!isLogin && (
            <div className="form-group">
              <label>
                <FaUser className="input-icon" />
                License Number (Optional)
              </label>
              <input
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="Enter your license number"
              />
            </div>
          )}

          <div className="form-group">
            <label>
              <FaLock className="input-icon" />
              Password
              {!isLogin && password && (
                <span className="password-strength">
                  {password.length >= 8 ? 'Strong' : password.length >= 6 ? 'Medium' : 'Weak'}
                </span>
              )}
            </label>
            <div className="input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={handlePasswordChange}
                required
                placeholder={isLogin ? 'Enter your password' : 'Enter password (min. 6 characters)'}
                className={passwordError ? 'input-error' : password && !passwordError ? 'input-success' : ''}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
              {password && !passwordError && (
                <FaCheckCircle className="input-status-icon success-icon" />
              )}
              {passwordError && (
                <FaExclamationCircle className="input-status-icon error-icon" />
              )}
            </div>
            {passwordError && <span className="field-error">{passwordError}</span>}
            {!isLogin && password && !passwordError && (
              <div className="password-strength-bar">
                <div 
                  className={`strength-indicator ${password.length >= 8 ? 'strong' : password.length >= 6 ? 'medium' : 'weak'}`}
                  style={{ width: `${Math.min((password.length / 8) * 100, 100)}%` }}
                ></div>
              </div>
            )}
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? (
              <>
                <FaSpinner className="spinning" /> {isLogin ? 'Logging in...' : 'Registering...'}
              </>
            ) : (
              isLogin ? 'Login' : 'Register'
            )}
          </button>
        </form>

        <div className="auth-switch">
          <p>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              className="switch-button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setEmailError('');
                setPasswordError('');
                setNameError('');
                setEmail('');
                setPassword('');
                setName('');
                setLicenseNumber('');
                toast.info(isLogin ? 'Switching to registration...' : 'Switching to login...', {
                  position: "top-right",
                  autoClose: 1500,
                });
              }}
            >
              {isLogin ? 'Register' : 'Login'}
            </button>
          </p>
        </div>

        <div className="auth-footer">
          <Link to="/" className="back-link">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DoctorLogin;

