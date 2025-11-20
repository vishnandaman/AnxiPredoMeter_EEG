import React from 'react';
import { motion } from 'framer-motion';
import { FaHeart, FaCode, FaUsers, FaBrain, FaHeartbeat, FaGraduationCap, FaUniversity, FaEnvelope, FaGithub, FaLinkedin } from 'react-icons/fa';
import './Footer.css';

const Footer = () => {
  return (
    <motion.footer 
      className="footer"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.5 }}
    >
      <div className="footer-content">
        <div className="footer-main">
          <div className="footer-column">
            <h3 className="footer-title">AnxiePredict</h3>
            <p className="footer-description">
              AI-Powered Anxiety Assessment System combining EEG brain wave analysis 
              and biometric measurements for comprehensive mental health evaluation.
            </p>
            <div className="footer-icons">
              <motion.a 
                href="#"
                className="footer-icon"
                whileHover={{ scale: 1.2, rotate: 10 }}
                whileTap={{ scale: 0.9 }}
                title="GitHub"
              >
                <FaGithub />
              </motion.a>
              <motion.a 
                href="#"
                className="footer-icon"
                whileHover={{ scale: 1.2, rotate: -10 }}
                whileTap={{ scale: 0.9 }}
                title="LinkedIn"
              >
                <FaLinkedin />
              </motion.a>
              <motion.a 
                href="#"
                className="footer-icon"
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                title="Email"
              >
                <FaEnvelope />
              </motion.a>
            </div>
          </div>

          <div className="footer-column">
            <h4 className="footer-subtitle">Technology</h4>
            <ul className="footer-links">
              <li>Machine Learning</li>
              <li>EEG Analysis</li>
              <li>Biometric Sensors</li>
              <li>React & Flask</li>
              <li>Firebase Database</li>
            </ul>
          </div>

          <div className="footer-column">
            <h4 className="footer-subtitle">Features</h4>
            <ul className="footer-links">
              <li>Real-time Assessment</li>
              <li>Comprehensive Reports</li>
              <li>Doctor Dashboard</li>
              <li>PDF Export</li>
              <li>Patient Management</li>
            </ul>
          </div>

          <div className="footer-column">
            <h4 className="footer-subtitle">About</h4>
            <ul className="footer-links">
              <li>How It Works</li>
              <li>Research & Development</li>
              <li>Privacy Policy</li>
              <li>Terms of Service</li>
              <li>Contact Us</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <p>© 2025 AnxiePredict. All rights reserved.</p>
            <p className="footer-team">
              Developed and Designed by{' '}
              <strong>Final Year Btech CSE Student - RIT-CSE Team</strong>
            </p>
            <div className="footer-badges">
              <span className="footer-badge">
                <FaGraduationCap /> Final Year Project
              </span>
              <span className="footer-badge">
                <FaUniversity /> Rajarambapu Institute of Technology
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.footer>
  );
};

export default Footer; 