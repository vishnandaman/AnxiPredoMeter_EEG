import React from 'react';
import { motion } from 'framer-motion';
import { FaHeart, FaCode, FaUsers } from 'react-icons/fa';
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
        <div className="footer-section">
          <p>© 2025 AnxiPredoMeter. All rights reserved.</p>
        </div>
        
        <div className="footer-section">
          <p>
            Developed and Designed by{' '}
            <strong>TYBTECH RIT-CSE Team</strong>
          </p>
        </div>
        
        <div className="footer-section">
          <div className="footer-icons">
            <motion.div 
              className="footer-icon"
              whileHover={{ scale: 1.2, rotate: 10 }}
              whileTap={{ scale: 0.9 }}
            >
              <FaCode />
            </motion.div>
            <motion.div 
              className="footer-icon"
              whileHover={{ scale: 1.2, rotate: -10 }}
              whileTap={{ scale: 0.9 }}
            >
              <FaUsers />
            </motion.div>
            <motion.div 
              className="footer-icon"
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            >
              <FaHeart />
            </motion.div>
          </div>
        </div>
      </div>
    </motion.footer>
  );
};

export default Footer; 