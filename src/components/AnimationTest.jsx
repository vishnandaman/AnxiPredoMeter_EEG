import React from 'react';
import Lottie from 'lottie-react';
import brainAnimation from '../animations/Brain Simulation.json';
import './AnimationTest.css';

const AnimationTest = () => {
  return (
    <div className="animation-test">
      <h3>🧠 Brain Animation Test</h3>
      <p>Testing Lottie JSON animation support...</p>
      
      <div className="animation-container">
        <Lottie 
          animationData={brainAnimation}
          loop={true}
          autoplay={true}
          style={{ width: 300, height: 200 }}
        />
      </div>
      
                   <div className="animation-status">
               <p>✅ Animation loaded successfully!</p>
             </div>
    </div>
  );
};

export default AnimationTest; 