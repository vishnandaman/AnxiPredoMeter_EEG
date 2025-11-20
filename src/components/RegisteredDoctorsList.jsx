import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUserMd, FaEnvelope, FaIdCard, FaSpinner, FaMapMarkerAlt, FaPhone } from 'react-icons/fa';
import { toast } from 'react-toastify';
import './RegisteredDoctorsList.css';

const SERVER_BASE = 'http://127.0.0.1:5000';

const RegisteredDoctorsList = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${SERVER_BASE}/api/doctors`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setDoctors(data.doctors || []);
        if (data.doctors && data.doctors.length > 0) {
          toast.success(`Found ${data.doctors.length} registered healthcare professional${data.doctors.length > 1 ? 's' : ''}`, {
            position: "top-right",
            autoClose: 3000,
          });
        }
      } else {
        setError(data.error || 'Failed to fetch doctors');
        toast.error('Unable to load doctors list', {
          position: "top-right",
          autoClose: 3000,
        });
      }
    } catch (err) {
      console.error('Error fetching doctors:', err);
      setError('Failed to connect to server');
      toast.error('Failed to connect to server', {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="doctors-list-loading">
        <FaSpinner className="spinner" />
        <p>Loading registered healthcare professionals...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="doctors-list-error">
        <p>{error}</p>
        <button onClick={fetchDoctors} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  if (doctors.length === 0) {
    return (
      <div className="doctors-list-empty">
        <FaUserMd className="empty-icon" />
        <p>No registered healthcare professionals found at the moment.</p>
        <p className="empty-subtext">Please check back later or contact support.</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="registered-doctors-list"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="doctors-list-header">
        <h3>
          <FaUserMd className="header-icon" />
          Registered Healthcare Professionals
        </h3>
        <p>Connect with qualified doctors registered on our platform</p>
      </div>

      <div className="doctors-grid">
        {doctors.map((doctor, index) => (
          <motion.div
            key={doctor.id}
            className="doctor-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -5 }}
          >
            <div className="doctor-card-header">
              <div className="doctor-avatar">
                <FaUserMd />
              </div>
              <div className="doctor-info">
                <h4>{doctor.name}</h4>
                {doctor.license_number && (
                  <div className="doctor-license">
                    <FaIdCard />
                    <span>License: {doctor.license_number}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="doctor-card-body">
              <div className="doctor-detail">
                <FaEnvelope className="detail-icon" />
                <span>{doctor.email}</span>
              </div>
            </div>

            <div className="doctor-card-footer">
              <button 
                className="contact-doctor-button"
                onClick={() => {
                  window.location.href = `mailto:${doctor.email}?subject=Consultation Request - AnxiePredict`;
                  toast.info(`Opening email to ${doctor.name}`, {
                    position: "top-right",
                    autoClose: 2000,
                  });
                }}
              >
                <FaEnvelope />
                Contact Doctor
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default RegisteredDoctorsList;

