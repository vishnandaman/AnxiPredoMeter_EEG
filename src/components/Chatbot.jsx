import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaComments, FaTimes } from 'react-icons/fa';
import './Chatbot.css';

const Chatbot = ({ isOpen, onToggle, prediction }) => {
  const mainChatbotUrl = "https://studio.d-id.com/agents/share?id=agt_NVjYp-gk&utm_source=copy&key=WVhWMGFEQjhOamRrWkdZMk1EVTJaVFpsWXpJMU5tUmhOekpsWkdRM09rZDJRbVl5WkZWdVpraDRURGhFVGpRNFpHTlJRZz09";

  const getChatbotUrl = () => {
    if (prediction) {
      const query = encodeURIComponent(`What are the remedies for ${prediction}?`);
      return `${mainChatbotUrl}&q=${query}`;
    }
    return mainChatbotUrl;
  };

  return (
    <div className="chatbot-container">
      {/* Main Chatbot Button */}
      <motion.button
        className="chatbot-button"
        onClick={onToggle}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1, type: "spring" }}
      >
        <FaComments className="chatbot-icon" />
      </motion.button>

      {/* Chatbot Box */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="chatbot-box"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.3, type: "spring" }}
          >
            <div className="chatbot-header">
              <h3>🤖 AI Health Assistant</h3>
              <motion.button
                className="close-button"
                onClick={onToggle}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <FaTimes />
              </motion.button>
            </div>
            
            <div className="chatbot-content">
              <iframe
                src={getChatbotUrl()}
                width="100%"
                height="100%"
                style={{ border: 'none', borderRadius: '10px' }}
                title="AI Health Assistant"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Chatbot; 