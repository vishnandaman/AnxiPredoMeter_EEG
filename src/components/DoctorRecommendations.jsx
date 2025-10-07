import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUserMd, FaComments, FaMapMarkerAlt, FaMoneyBillWave, FaStethoscope } from 'react-icons/fa';
import './DoctorRecommendations.css';

const DoctorRecommendations = ({ prediction }) => {
  const [openChats, setOpenChats] = useState({});

  const allDoctors = [
    {
      name: "Dr. Mahabal",
      specialization: "Depressive Disorder",
      clinic: "Yash Brain Clinic & Vertigo Centre",
      address: "B6, 2nd Floor, Shangrila Garden Complex, Bund Garden Road, Pune, Maharashtra",
      fees: "₹500 per session",
      chatbotUrl: "https://studio.d-id.com/agents/share?id=agt_XQPHpI7o&utm_source=copy&key=WVhWMGFEQjhOamRrWkdZMk1EVTJaVFpsWXpJMU5tUmhOekpsWkdRM09rZDJRbVl5WkZWdVpraDRURGhFVGpRNFpHTlJRZz09"
    },
    {
      name: "Dr. Kulkarni",
      specialization: "Obsessive Compulsive Disorder",
      clinic: "Mastishka Neurology Clinic",
      address: "Tilak Road, Pune, Maharashtra",
      fees: "₹1,000 per session",
      chatbotUrl: "https://studio.d-id.com/agents/share?id=agt_tfiAEAwF&utm_source=copy&key=WVhWMGFEQjhOamRrWkdZMk1EVTJaVFpsWXpJMU5tUmhOekpsWkdRM09rZDJRbVl5WkZWdVpraDRURGhFVGpRNFpHTlJRZz09"
    },
    {
      name: "Dr. Snehlata",
      specialization: "Panic Disorder",
      clinic: "Dr. Khade's Centre for Neurology",
      address: "Mangeshkar Nagar, Main Road, Manganwlar Peth, Kolhapur, Maharashtra",
      fees: "₹500 per hour",
      chatbotUrl: "https://studio.d-id.com/agents/share?id=agt_0QsyeT4r&utm_source=copy&key=WVhWMGFEQjhOamRrWkdZMk1EVTJaVFpsWXpJMU5tUmhOekpsWkdRM09rZDJRbVl5WkZWdVpraDRURGhFVGpRNFpHTlJRZz09"
    },
    {
      name: "Dr. Sujit",
      specialization: "Adjustment Disorder",
      clinic: "Jagtap Clinic and Research Centre",
      address: "303, Mangalmurti Complex, Hirabaug Chowk, Dadawadi, Pune, Maharashtra",
      fees: "₹1,500 per session",
      chatbotUrl: "https://studio.d-id.com/agents/share?id=agt_3IKk5qws&utm_source=copy&key=WVhWMGFEQjhOamRrWkdZMk1EVTJaVFpsWXpJMU5tUmhOekpsWkdRM09rZDJRbVl5WkZWdVpraDRURGhFVGpRNFpHTlJRZz09"
    }
  ];

  const toggleChat = (doctorName) => {
    setOpenChats(prev => ({
      ...prev,
      [doctorName]: !prev[doctorName]
    }));
  };

  return (
    <motion.section 
      className="doctor-recommendations"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <motion.div 
        className="section-header"
        initial={{ y: -20 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2>
          <FaUserMd className="section-icon" />
          🩺 Recommended Anxiety Specialists
        </h2>
        <p>Connect with qualified healthcare professionals for personalized care</p>
      </motion.div>

      <div className="doctor-container">
        {allDoctors.map((doctor, index) => (
          <motion.div
            key={doctor.name}
            className="doctor-card medical-card"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ y: -5 }}
          >
            <div className="doctor-header">
              <div className="doctor-avatar">
                <FaUserMd />
              </div>
              <div className="doctor-info">
                <h3>{doctor.name}</h3>
                <p className="specialization">
                  <FaStethoscope />
                  {doctor.specialization}
                </p>
              </div>
            </div>

            <div className="doctor-details">
              <div className="detail-item">
                <FaMapMarkerAlt className="detail-icon" />
                <div>
                  <strong>Clinic:</strong> {doctor.clinic}
                </div>
              </div>
              
              <div className="detail-item">
                <FaMapMarkerAlt className="detail-icon" />
                <div>
                  <strong>Address:</strong> {doctor.address}
                </div>
              </div>
              
              <div className="detail-item">
                <FaMoneyBillWave className="detail-icon" />
                <div>
                  <strong>Fees:</strong> {doctor.fees}
                </div>
              </div>
            </div>

            <motion.button
              className="chat-button"
              onClick={() => toggleChat(doctor.name)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaComments />
              Chat with Dr. {doctor.name}
            </motion.button>

            <AnimatePresence>
              {openChats[doctor.name] && (
                <motion.div
                  className="doctor-chatbox"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <iframe
                    src={doctor.chatbotUrl}
                    width="100%"
                    height="400px"
                    style={{ border: 'none', borderRadius: '10px' }}
                    title={`Chat with ${doctor.name}`}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
};

export default DoctorRecommendations; 