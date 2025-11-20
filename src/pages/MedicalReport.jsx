import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { FaFilePdf, FaUserMd, FaBrain, FaHeartbeat } from 'react-icons/fa';
import './MedicalReport.css';

const MedicalReport = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);

  // Get data from location state
  const {
    patientId,
    patientName,
    patientAge,
    eegData,
    biometricData,
    eegPrediction,
    biometricPrediction,
    combinedPrediction,
    testDate
  } = location.state || {};

  useEffect(() => {
    // Get doctor info from localStorage
    const doctorData = JSON.parse(localStorage.getItem('doctor') || '{}');
    setDoctor(doctorData);

    // Redirect if no data
    if (!patientId || !combinedPrediction) {
      toast.error('Report data not found. Redirecting...');
      setTimeout(() => navigate('/realtime'), 2000);
    }
  }, [patientId, combinedPrediction, navigate]);

  const finalDisorder = combinedPrediction?.primary_prediction || 'Unknown';
  const reportDate = testDate || new Date().toLocaleString();

  // Get messages based on final condition
  const getDoctorMessage = (disorder) => {
    const lower = disorder.toLowerCase();
    if (lower.includes('healthy') || lower.includes('normal')) {
      return "Patient shows normal brain activity and physiological responses. No immediate intervention required. Continue monitoring if symptoms persist.";
    } else if (lower.includes('social anxiety')) {
      return "Patient exhibits signs of Social Anxiety Disorder. Consider cognitive behavioral therapy (CBT) and gradual exposure therapy. Monitor progress in social situations.";
    } else if (lower.includes('panic disorder')) {
      return "Patient shows indicators of Panic Disorder. Immediate assessment recommended. Consider medication (SSRIs) and therapy. Educate patient about panic attacks and coping strategies.";
    } else if (lower.includes('generalized anxiety')) {
      return "Patient displays symptoms consistent with Generalized Anxiety Disorder (GAD). Recommend therapy (CBT), stress management techniques, and potential medication evaluation. Regular follow-ups advised.";
    } else if (lower.includes('obsessive compulsive')) {
      return "Patient exhibits characteristics of Obsessive-Compulsive Disorder (OCD). Specialized OCD treatment recommended including ERP therapy. Consider psychiatric consultation for medication options.";
    } else {
      return "Further clinical evaluation recommended. Combine these findings with patient history and clinical observations for comprehensive assessment.";
    }
  };

  const getPatientMessage = (disorder) => {
    const lower = disorder.toLowerCase();
    if (lower.includes('healthy') || lower.includes('normal')) {
      return "Your test results show normal patterns. If you're experiencing symptoms, please discuss them with your healthcare provider for personalized guidance.";
    } else if (lower.includes('social anxiety')) {
      return "Your results suggest you may benefit from support for social anxiety. This is manageable with the right approach. Please consult with your healthcare provider about treatment options including therapy and support strategies.";
    } else if (lower.includes('panic disorder')) {
      return "Your test results indicate you may be experiencing panic-related symptoms. This is treatable. Please schedule an appointment with your healthcare provider to discuss treatment options and support resources.";
    } else if (lower.includes('generalized anxiety')) {
      return "Your results show patterns associated with generalized anxiety. Effective treatments are available. Please consult with your healthcare provider to explore therapy, lifestyle changes, and other supportive interventions.";
    } else if (lower.includes('obsessive compulsive')) {
      return "Your results suggest you may benefit from specialized support for OCD symptoms. Effective treatments are available. Please discuss these findings with a mental health professional to explore appropriate treatment options.";
    } else {
      return "Please discuss your test results with your healthcare provider for a comprehensive evaluation and personalized treatment plan.";
    }
  };

  const handleDownloadPDF = async () => {
    try {
      toast.info('📄 Generating PDF report...', {
        position: "top-right",
        autoClose: 2000,
      });

      const element = document.getElementById('medical-report');
      if (!element) {
        throw new Error('Report element not found');
      }

      // Capture the report as canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });

      const imgData = canvas.toDataURL('image/png');

      // Calculate PDF dimensions
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      const pdf = new jsPDF('p', 'mm', 'a4');
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if content is longer
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Save PDF
      pdf.save(`Medical_Report_${patientId}_${new Date().toISOString().split('T')[0]}.pdf`);

      toast.success('✅ PDF report downloaded successfully!', {
        position: "top-right",
        autoClose: 3000,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('❌ Failed to generate PDF. Please try again.', {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  if (!patientId || !combinedPrediction) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div>Loading report data...</div>
      </div>
    );
  }

  return (
    <div className="medical-report-container">
      {/* Medical Report Content */}
      <div id="medical-report" className="medical-report">
        {/* Header */}
        <div className="report-header">
          <div className="header-logo">
            <FaBrain className="logo-icon" />
            <h1>AnxiePredict</h1>
          </div>
          <div className="header-subtitle">AI-Powered Anxiety Assessment System</div>
          <div className="header-line"></div>
        </div>

        {/* Report Title */}
        <div className="report-title-section">
          <h2 className="report-title">COMPREHENSIVE ANXIETY ASSESSMENT REPORT</h2>
          <div className="report-id">Report ID: {patientId}-{new Date().getTime().toString().slice(-6)}</div>
        </div>

        {/* Patient Information */}
        <div className="report-section">
          <h3 className="section-title">PATIENT INFORMATION</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Patient ID:</span>
              <span className="info-value">{patientId}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Patient Name:</span>
              <span className="info-value">{patientName || 'Not provided'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Age:</span>
              <span className="info-value">{patientAge || 'Not provided'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Test Date:</span>
              <span className="info-value">{reportDate}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Report Date:</span>
              <span className="info-value">{new Date().toLocaleDateString()}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Test Type:</span>
              <span className="info-value">Dual-Methodology Analysis (EEG + Biometric)</span>
            </div>
          </div>
        </div>

        {/* Final Diagnosis */}
        <div className="report-section diagnosis-section">
          <h3 className="section-title">FINAL DIAGNOSIS</h3>
          <div className="diagnosis-box">
            <div className="diagnosis-label">Primary Predicted Anxiety Disorder:</div>
            <div className="diagnosis-value">{finalDisorder.toUpperCase()}</div>
            {combinedPrediction.confidence_scores && combinedPrediction.confidence_scores[0] && 
             combinedPrediction.confidence_scores[0].confidence >= 60 && (
              <div className="diagnosis-confidence">
                Confidence Level: {combinedPrediction.confidence_scores[0].confidence}%
              </div>
            )}
          </div>
        </div>

        {/* EEG Analysis Section */}
        <div className="report-section">
          <h3 className="section-title">
            <FaBrain className="section-icon" /> EEG BRAIN ACTIVITY ANALYSIS
          </h3>
          
          <div className="analysis-subsection">
            <h4 className="subsection-title">Predicted Disorder:</h4>
            <p className="subsection-value">{eegPrediction?.result || 'N/A'}</p>
          </div>

          {eegData && (
            <div className="analysis-subsection">
              <h4 className="subsection-title">EEG Wave Readings:</h4>
              <div className="readings-grid">
                <div className="reading-item">
                  <span className="reading-label">Delta (δ):</span>
                  <span className="reading-value">{eegData.delta || 'N/A'} Hz</span>
                </div>
                <div className="reading-item">
                  <span className="reading-label">Theta (θ):</span>
                  <span className="reading-value">{eegData.theta || 'N/A'} Hz</span>
                </div>
                <div className="reading-item">
                  <span className="reading-label">Alpha (α):</span>
                  <span className="reading-value">{eegData.alpha || 'N/A'} Hz</span>
                </div>
                <div className="reading-item">
                  <span className="reading-label">Beta (β):</span>
                  <span className="reading-value">{eegData.beta || 'N/A'} Hz</span>
                </div>
                <div className="reading-item">
                  <span className="reading-label">Gamma (γ):</span>
                  <span className="reading-value">{eegData.gamma || 'N/A'} Hz</span>
                </div>
              </div>
            </div>
          )}

          {eegPrediction?.confidence_scores && Array.isArray(eegPrediction.confidence_scores) && eegPrediction.confidence_scores.length > 0 && (
            <div className="analysis-subsection">
              <h4 className="subsection-title">Confidence Scores:</h4>
              <table className="confidence-table">
                <thead>
                  <tr>
                    <th>Disorder</th>
                    <th>Confidence (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {eegPrediction.confidence_scores.slice(0, 5).map((item, i) => (
                    <tr key={i}>
                      <td>{item.disorder}</td>
                      <td>{item.confidence}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Biometric Analysis Section */}
        <div className="report-section">
          <h3 className="section-title">
            <FaHeartbeat className="section-icon" /> BIOMETRIC PHYSIOLOGICAL ANALYSIS
          </h3>

          <div className="analysis-subsection">
            <h4 className="subsection-title">Predicted Disorder:</h4>
            <p className="subsection-value">{biometricPrediction?.result || 'N/A'}</p>
          </div>

          {biometricData && (
            <div className="analysis-subsection">
              <h4 className="subsection-title">Physiological Readings:</h4>
              <div className="readings-grid">
                <div className="reading-item">
                  <span className="reading-label">GSR (Galvanic Skin Response):</span>
                  <span className="reading-value">{biometricData.gsr || 'N/A'} μS</span>
                </div>
                <div className="reading-item">
                  <span className="reading-label">SpO2 (Blood Oxygen Saturation):</span>
                  <span className="reading-value">{biometricData.spo2 || 'N/A'}%</span>
                </div>
              </div>
            </div>
          )}

          {biometricPrediction?.confidence_scores && Array.isArray(biometricPrediction.confidence_scores) && biometricPrediction.confidence_scores.length > 0 && (
            <div className="analysis-subsection">
              <h4 className="subsection-title">Confidence Scores:</h4>
              <table className="confidence-table">
                <thead>
                  <tr>
                    <th>Disorder</th>
                    <th>Confidence (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {biometricPrediction.confidence_scores.slice(0, 5).map((item, i) => (
                    <tr key={i}>
                      <td>{item.disorder}</td>
                      <td>{item.confidence}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Combined Analysis */}
        {combinedPrediction?.confidence_scores && combinedPrediction.confidence_scores.length > 0 && (
          <div className="report-section">
            <h3 className="section-title">COMBINED ANALYSIS</h3>
            <div className="analysis-subsection">
              <p className="subsection-note">
                <strong>Weighted Combination:</strong> 70% EEG Analysis + 30% Biometric Analysis
              </p>
              <table className="confidence-table">
                <thead>
                  <tr>
                    <th>Disorder</th>
                    <th>Combined Confidence (%)</th>
                    <th>EEG Confidence (%)</th>
                    <th>Biometric Confidence (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {combinedPrediction.confidence_scores.slice(0, 5).map((item, i) => (
                    <tr key={i}>
                      <td>{item.disorder}</td>
                      <td><strong>{item.confidence}%</strong></td>
                      <td>{item.eeg_confidence || 'N/A'}%</td>
                      <td>{item.biometric_confidence || 'N/A'}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Conflict Analysis */}
        {combinedPrediction?.conflict_analysis?.has_conflict && (
          <div className="report-section conflict-section">
            <h3 className="section-title">⚠️ CONFLICT ANALYSIS</h3>
            <div className="conflict-box">
              <p><strong>Severity:</strong> {combinedPrediction.conflict_analysis.severity.toUpperCase()}</p>
              <p>{combinedPrediction.conflict_analysis.recommendation}</p>
            </div>
          </div>
        )}

        {/* Clinical Recommendations */}
        <div className="report-section recommendations-section">
          <h3 className="section-title">CLINICAL RECOMMENDATIONS</h3>
          
          <div className="recommendation-box doctor-box">
            <h4 className="recommendation-title">
              <FaUserMd className="recommendation-icon" /> For Healthcare Provider:
            </h4>
            <p className="recommendation-text">{getDoctorMessage(finalDisorder)}</p>
          </div>

          <div className="recommendation-box patient-box">
            <h4 className="recommendation-title">For Patient:</h4>
            <p className="recommendation-text">{getPatientMessage(finalDisorder)}</p>
          </div>
        </div>

        {/* Footer with Doctor Signature */}
        <div className="report-footer">
          <div className="footer-section">
            <div className="signature-section">
              <div className="signature-line"></div>
              <div className="signature-label">
                <FaUserMd className="signature-icon" />
                {doctor?.name || 'Healthcare Provider'}
              </div>
              <div className="signature-details">
                {doctor?.id && `Doctor ID: ${doctor.id}`}
                {doctor?.id && doctor?.name && ' • '}
                {reportDate}
              </div>
            </div>
          </div>
          
          <div className="footer-disclaimer">
            <p><strong>Disclaimer:</strong> This report is generated by AnxiePredict AI-Powered Anxiety Assessment System. 
            This report should be used as a supplementary tool alongside clinical assessment. 
            Final diagnosis should be made by a qualified healthcare professional based on comprehensive clinical evaluation.</p>
            <p className="footer-note">Report generated on {new Date().toLocaleString()}</p>
          </div>
        </div>

        {/* PDF Download Button - At the end of report */}
        <div className="report-download-section">
          <button className="action-button pdf-download-btn" onClick={handleDownloadPDF}>
            <FaFilePdf /> Download PDF Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default MedicalReport;

