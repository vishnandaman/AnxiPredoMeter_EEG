import React from 'react';
import { FaBrain, FaHeartbeat, FaChartLine, FaUserMd, FaShieldAlt, FaRocket } from 'react-icons/fa';
import './AboutSection.css';

const AboutSection = () => {
  return (
    <section className="about-section">
      <div className="about-container">
        <div className="about-header">
          <h2 className="about-title">
            <FaBrain className="about-icon" />
            About AnxiePredict
          </h2>
          <p className="about-intro">
            AnxiePredict is an intelligent anxiety assessment platform that combines advanced machine learning 
            with neural activity analysis (EEG) and physiological measurements (GSR and SpO2) to provide 
            comprehensive and accurate anxiety disorder predictions.
          </p>
        </div>

        <div className="about-features">
          <div className="feature-card">
            <div className="feature-icon">
              <FaBrain />
            </div>
            <h3>Dual-Methodology Approach</h3>
            <p>
              Our platform uses both EEG brain wave analysis and biometric measurements (Galvanic Skin Response 
              and Blood Oxygen Saturation) to ensure comprehensive and reliable anxiety assessment results.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <FaChartLine />
            </div>
            <h3>Machine Learning Powered</h3>
            <p>
              Advanced Random Forest and Combined Anxiety models trained on clinical data provide accurate 
              predictions for various anxiety disorders, including Social Anxiety, Panic Disorder, and GAD.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <FaUserMd />
            </div>
            <h3>Healthcare Professional Integration</h3>
            <p>
              Designed for doctors and medical professionals, our platform enables comprehensive patient 
              management, historical tracking, and detailed medical reports for clinical decision-making.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <FaShieldAlt />
            </div>
            <h3>Accessible & Secure</h3>
            <p>
              Anyone can use our platform for preliminary anxiety assessment. All data is securely stored 
              and protected, with strict doctor-patient associations ensuring privacy and confidentiality.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <FaHeartbeat />
            </div>
            <h3>Real-Time Analysis</h3>
            <p>
              Get instant anxiety predictions by simply entering your EEG wave data or biometric readings. 
              Our platform processes data in real-time to deliver immediate, actionable insights.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <FaRocket />
            </div>
            <h3>Progress Tracking</h3>
            <p>
              For healthcare professionals, our dashboard enables longitudinal tracking of patient progress, 
              allowing doctors to monitor treatment effectiveness over time with comprehensive historical records.
            </p>
          </div>
        </div>

        <div className="about-how-it-works">
          <h3 className="how-it-works-title">How It Works</h3>
          <div className="steps-container">
            <div className="step-item">
              <div className="step-number">1</div>
              <h4>Input Your Data</h4>
              <p>Enter your EEG wave measurements (Beta, Gamma, Delta, Alpha, Theta) or biometric readings (GSR and SpO2)</p>
            </div>
            <div className="step-item">
              <div className="step-number">2</div>
              <h4>AI Analysis</h4>
              <p>Our trained machine learning models analyze your data using sophisticated pattern recognition algorithms</p>
            </div>
            <div className="step-item">
              <div className="step-number">3</div>
              <h4>Get Results</h4>
              <p>Receive detailed predictions with confidence scores, disorder-specific insights, and professional recommendations</p>
            </div>
            <div className="step-item">
              <div className="step-number">4</div>
              <h4>Take Action</h4>
              <p>Use the results to consult with healthcare professionals for personalized treatment and monitoring</p>
            </div>
          </div>
        </div>

        <div className="about-disclaimer">
          <p>
            <strong>Important:</strong> AnxiePredict is a diagnostic aid tool and should not replace professional 
            medical consultation. Always consult with qualified healthcare professionals for diagnosis and treatment decisions.
          </p>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;

