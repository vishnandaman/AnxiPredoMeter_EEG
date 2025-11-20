import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUserMd, FaExclamationTriangle, FaInfoCircle, FaArrowDown, FaStethoscope, FaTimes } from 'react-icons/fa';
import RegisteredDoctorsList from './RegisteredDoctorsList';
import './VisitDoctorRecommendation.css';

const VisitDoctorRecommendation = ({ prediction }) => {
  const [showDoctors, setShowDoctors] = useState(false);

  const getRecommendationMessage = (prediction) => {
    // Handle both object and string formats
    const predictionText = prediction?.result || prediction || '';
    const lower = predictionText?.toLowerCase() || '';
    
    if (lower.includes('healthy') || lower.includes('normal')) {
      return {
        title: "Your assessment shows normal patterns",
        message: "Based on your self-assessment, your readings appear to be within normal ranges. However, if you're experiencing anxiety symptoms, we still recommend consulting with a healthcare professional for a comprehensive evaluation.",
        urgency: "low",
        action: "Consider a routine check-up if symptoms persist"
      };
    } else if (lower.includes('social anxiety')) {
      return {
        title: "Social Anxiety Disorder detected",
        message: "Your self-assessment indicates possible signs of Social Anxiety Disorder. This requires professional evaluation and treatment. Please consult with a qualified mental health professional for proper diagnosis and treatment planning.",
        urgency: "medium",
        action: "Schedule an appointment with a mental health specialist"
      };
    } else if (lower.includes('panic disorder')) {
      return {
        title: "Panic Disorder indicators detected",
        message: "Your assessment shows indicators consistent with Panic Disorder. This is a serious condition that requires immediate professional attention. Please consult with a healthcare provider as soon as possible.",
        urgency: "high",
        action: "Seek immediate consultation with a healthcare professional"
      };
    } else if (lower.includes('generalized anxiety')) {
      return {
        title: "Generalized Anxiety Disorder (GAD) detected",
        message: "Your self-assessment suggests possible Generalized Anxiety Disorder. Professional evaluation is essential for proper diagnosis and treatment. Please consult with a mental health professional.",
        urgency: "medium",
        action: "Schedule an appointment with a mental health specialist"
      };
    } else if (lower.includes('obsessive compulsive')) {
      return {
        title: "Obsessive-Compulsive Disorder (OCD) indicators detected",
        message: "Your assessment shows characteristics consistent with OCD. This condition requires specialized treatment. Please consult with a qualified mental health professional specializing in OCD treatment.",
        urgency: "medium",
        action: "Consult with an OCD specialist"
      };
    } else {
      return {
        title: "Assessment completed",
        message: "Your self-assessment has been completed. For accurate diagnosis and proper treatment, we strongly recommend consulting with a qualified healthcare professional who can provide comprehensive evaluation.",
        urgency: "medium",
        action: "Visit a healthcare professional for proper evaluation"
      };
    }
  };

  const recommendation = getRecommendationMessage(prediction);

  return (
    <motion.section 
      className="visit-doctor-recommendation"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className={`recommendation-card ${recommendation.urgency}`}>
        <div className="recommendation-header">
          <div className="recommendation-icon-wrapper">
            <FaStethoscope className="recommendation-icon" />
          </div>
          <div className="recommendation-title-section">
            <h3>{recommendation.title}</h3>
            <div className={`urgency-badge ${recommendation.urgency}`}>
              {recommendation.urgency === 'high' ? 'High Priority' : 
               recommendation.urgency === 'medium' ? 'Recommended' : 'Optional'}
            </div>
          </div>
        </div>

        <div className="recommendation-content">
          <div className="recommendation-message">
            <FaInfoCircle className="info-icon" />
            <p>{recommendation.message}</p>
          </div>

          <div className="recommendation-action">
            <div className="action-text">
              <strong>Next Step:</strong> {recommendation.action}
            </div>
            <button 
              onClick={() => setShowDoctors(!showDoctors)} 
              className="visit-doctor-button"
            >
              <FaUserMd />
              <span>{showDoctors ? 'Hide' : 'Find'} Healthcare Professionals</span>
              <FaArrowDown className={showDoctors ? 'rotated' : ''} />
            </button>
          </div>

          <AnimatePresence>
            {showDoctors && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="doctors-list-container"
              >
                <RegisteredDoctorsList />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="disclaimer-box">
            <FaExclamationTriangle className="disclaimer-icon" />
            <div className="disclaimer-content">
              <strong>Important Disclaimer:</strong>
              <p>
                This is a self-assessment tool and should not be used as a substitute for professional medical diagnosis. 
                The results are based on the data you provided and are for informational purposes only. 
                For accurate diagnosis and treatment, please consult with a qualified healthcare professional.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
};

export default VisitDoctorRecommendation;

