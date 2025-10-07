import React from 'react';
import { FaSun, FaMoon, FaCloud } from 'react-icons/fa';
import './GreetingSection.css';

const GreetingSection = () => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return { text: "Good Morning", icon: <FaSun />, color: "#f59e0b" };
    } else if (hour < 18) {
      return { text: "Good Afternoon", icon: <FaSun />, color: "#f59e0b" };
    } else {
      return { text: "Good Evening", icon: <FaMoon />, color: "#6366f1" };
    }
  };

  const greeting = getGreeting();

  return (
    <div className="greeting-section">
      <div className="greeting-content">
        <div className="greeting-icon" style={{ color: greeting.color }}>
          {greeting.icon}
        </div>
        <h2 className="greeting-text">{greeting.text}</h2>
        <p className="greeting-subtitle">Welcome to AnxiPredoMeter - Advanced Anxiety Disorder Prediction Platform</p>
      </div>
    </div>
  );
};

export default GreetingSection; 