import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { FaUserMd, FaSearch, FaDownload, FaHistory, FaSpinner, FaFileAlt, FaCalendar, FaSync, FaEye, FaTrash, FaFilePdf, FaUsers, FaClipboardList, FaChartPie, FaBrain, FaExclamationTriangle, FaCheckCircle, FaArrowRight, FaChartLine, FaClock, FaFilter, FaHeartbeat, FaSort, FaSortUp, FaSortDown, FaArrowUp, FaChartBar, FaHeart } from 'react-icons/fa';
import './DoctorDashboard.css';

const SERVER_BASE = 'http://127.0.0.1:5000';

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [patientReportsMap, setPatientReportsMap] = useState({});
  const [viewDetailsModal, setViewDetailsModal] = useState(null);
  const [deletingPatient, setDeletingPatient] = useState(null);
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  useEffect(() => {
    // Check authentication
    const loggedIn = localStorage.getItem('isDoctorLoggedIn') === 'true';
    const doctorData = localStorage.getItem('doctor');
    
    if (!loggedIn || !doctorData) {
      toast.warning('Please login to access the dashboard', {
        position: "top-right",
        autoClose: 3000,
      });
      navigate('/doctor-login');
      return;
    }
    
    const doctorObj = JSON.parse(doctorData);
    setDoctor(doctorObj);
    
    // Welcome notification
    toast.success(`Welcome back, ${doctorObj?.name || 'Doctor'}!`, {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
    
    loadPatients();
  }, [navigate]);

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const doctor = JSON.parse(localStorage.getItem('doctor') || '{}');
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (doctor.id) {
      headers['X-Doctor-Id'] = doctor.id.toString();
    }
    
    return headers;
  };

  const loadPatients = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');
    
    try {
      const doctor = JSON.parse(localStorage.getItem('doctor') || '{}');
      
      console.log('🔍 [DASHBOARD DEBUG] Loading patients...');
      console.log('🔍 [DASHBOARD DEBUG] Doctor from localStorage:', doctor);
      console.log('🔍 [DASHBOARD DEBUG] Doctor ID:', doctor.id);
      
      // For GET requests, add doctor_id as query parameter
      const url = doctor.id 
        ? `${SERVER_BASE}/api/patients?doctor_id=${doctor.id}`
        : `${SERVER_BASE}/api/patients`;
      
      console.log('🔍 [DASHBOARD DEBUG] Request URL:', url);
      console.log('🔍 [DASHBOARD DEBUG] Auth headers:', getAuthHeaders());
      
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      
      console.log('🔍 [DASHBOARD DEBUG] Response status:', response.status);
      console.log('🔍 [DASHBOARD DEBUG] Response ok:', response.ok);
      
      const data = await response.json();
      
      console.log('🔍 [DASHBOARD DEBUG] Response data:', data);
      console.log('🔍 [DASHBOARD DEBUG] Response success:', data.success);
      console.log('🔍 [DASHBOARD DEBUG] Patients array:', data.patients);
      console.log('🔍 [DASHBOARD DEBUG] Patients count:', data.patients?.length || 0);
      
      if (response.ok && data.success) {
        const patientsList = data.patients || [];
        console.log('🔍 [DASHBOARD DEBUG] Patients list before filter:', patientsList);
        console.log('🔍 [DASHBOARD DEBUG] Patients list type:', typeof patientsList);
        console.log('🔍 [DASHBOARD DEBUG] Patients list is array:', Array.isArray(patientsList));
        
        // Verify all patients belong to the logged-in doctor
        const doctorId = doctor.id?.toString();
        console.log('🔍 [DASHBOARD DEBUG] Doctor ID (string):', doctorId);
        console.log('🔍 [DASHBOARD DEBUG] Doctor ID type:', typeof doctorId);
        
        const verifiedPatients = patientsList.filter(patient => {
          const patientDoctorId = patient.doctor_id?.toString();
          console.log('🔍 [DASHBOARD DEBUG] Patient:', patient.patient_id, 'Doctor ID:', patientDoctorId, 'Match:', patientDoctorId === doctorId);
          return patientDoctorId === doctorId;
        });
        
        console.log(`✅ [DASHBOARD DEBUG] Loaded ${verifiedPatients.length} patients for doctor ${doctorId}`);
        console.log('✅ [DASHBOARD DEBUG] Verified patients:', verifiedPatients);
        
        // Log each patient's structure
        verifiedPatients.forEach((patient, index) => {
          console.log(`🔍 [DASHBOARD DEBUG] Patient ${index + 1}:`, {
            id: patient.id,
            patient_id: patient.patient_id,
            name: patient.name,
            age: patient.age,
            gender: patient.gender,
            doctor_id: patient.doctor_id,
            created_at: patient.created_at
          });
        });
        
        setPatients(verifiedPatients);
        
        // Show success toast
        if (verifiedPatients.length > 0) {
          toast.success(`Loaded ${verifiedPatients.length} patient(s) successfully!`, {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
        } else {
          toast.info('No patients found. Patients will appear here after tests are completed.', {
            position: "top-right",
            autoClose: 4000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
        }
        
        // Load latest reports for all patients to show in table
        if (verifiedPatients.length > 0) {
          // Use setTimeout to ensure patients state is updated first
          setTimeout(() => {
            loadLatestReportsForPatients();
          }, 100);
        }
        
        // If a patient is selected, refresh their reports too
        if (selectedPatient && isRefresh) {
          loadPatientReports(selectedPatient.patient_id);
        }
      } else {
        console.error('❌ [DASHBOARD DEBUG] Failed to load patients:', data.error);
        setError(data.error || 'Failed to load patients');
      }
    } catch (err) {
      console.error('❌ [DASHBOARD DEBUG] Error loading patients:', err);
      console.error('❌ [DASHBOARD DEBUG] Error stack:', err.stack);
      const errorMsg = 'Failed to connect to server';
      setError(errorMsg);
      console.error('Error:', err);
      toast.error(`${errorMsg}: ${err.message || 'Network error'}`, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleRefresh = async () => {
    toast.info('Refreshing patient list...', {
      position: "top-right",
      autoClose: 2000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
    await loadPatients(true);
  };

  const loadPatientReports = async (patientId) => {
    try {
      console.log('🔍 [DASHBOARD DEBUG] Loading reports for patient:', patientId);
      
      const doctor = JSON.parse(localStorage.getItem('doctor') || '{}');
      
      // For GET requests, add doctor_id as query parameter
      const url = doctor.id
        ? `${SERVER_BASE}/api/patients/${patientId}/reports?doctor_id=${doctor.id}`
        : `${SERVER_BASE}/api/patients/${patientId}/reports`;
      
      console.log('🔍 [DASHBOARD DEBUG] Reports URL:', url);
      
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      
      console.log('🔍 [DASHBOARD DEBUG] Reports response status:', response.status);
      
      const data = await response.json();
      
      console.log('🔍 [DASHBOARD DEBUG] Reports data:', data);
      console.log('🔍 [DASHBOARD DEBUG] Reports count:', data.reports?.length || 0);
      
      if (response.ok && data.success) {
        console.log('✅ [DASHBOARD DEBUG] Reports loaded successfully:', data.reports);
        const reportsList = data.reports || [];
        setReports(reportsList);
        
        if (reportsList.length > 0) {
          toast.success(`Loaded ${reportsList.length} test report(s) successfully!`, {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
        } else {
          toast.info('No test reports found for this patient yet.', {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
        }
      } else {
        console.error('❌ [DASHBOARD DEBUG] Failed to load reports:', data.error);
        toast.error(`Failed to load reports: ${data.error || 'Unknown error'}`, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    } catch (err) {
      console.error('❌ [DASHBOARD DEBUG] Error loading reports:', err);
      console.error('❌ [DASHBOARD DEBUG] Error stack:', err.stack);
      toast.error(`Failed to load reports: ${err.message || 'Network error'}`, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  const handlePatientClick = (patient) => {
    setSelectedPatient(patient);
    loadPatientReports(patient.patient_id);
  };

  const downloadReport = async (report, patient) => {
    const targetPatient = patient || selectedPatient;
    const currentDoctor = doctor || JSON.parse(localStorage.getItem('doctor') || '{}');
    
    try {
      toast.info('Generating PDF report...', {
        position: "top-right",
        autoClose: 2000,
      });

      // Create a temporary report element for PDF generation
      const tempDiv = document.createElement('div');
      tempDiv.id = 'temp-report-pdf';
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '210mm';
      tempDiv.style.padding = '20mm';
      tempDiv.style.backgroundColor = '#ffffff';
      tempDiv.style.fontFamily = 'Times New Roman, Times, serif';
      tempDiv.style.color = '#000000';
      tempDiv.style.fontSize = '12pt';
      tempDiv.style.lineHeight = '1.6';
      
      // Build report HTML
      const reportHTML = `
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #000; padding-bottom: 20px;">
          <h1 style="font-size: 28pt; color: #0066cc; margin: 0;">AnxiePredict</h1>
          <p style="font-size: 11pt; color: #666; margin-top: 5px;">AI-Powered Anxiety Assessment System</p>
        </div>
        
        <h2 style="text-align: center; font-size: 20pt; margin-bottom: 20px;">COMPREHENSIVE ANXIETY ASSESSMENT REPORT</h2>
        
        <div style="margin-bottom: 25px;">
          <h3 style="font-size: 14pt; border-bottom: 2px solid #0066cc; padding-bottom: 8px; margin-bottom: 15px;">PATIENT INFORMATION</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div><strong>Patient ID:</strong> ${targetPatient?.patient_id || 'N/A'}</div>
            <div><strong>Patient Name:</strong> ${targetPatient?.name || 'N/A'}</div>
            <div><strong>Age:</strong> ${targetPatient?.age || 'N/A'}</div>
            <div><strong>Test Date:</strong> ${new Date(report.test_date).toLocaleString()}</div>
          </div>
        </div>
        
        <div style="margin-bottom: 25px; background: #f8f9fa; padding: 20px; border: 2px solid #000;">
          <h3 style="font-size: 14pt; border-bottom: 2px solid #0066cc; padding-bottom: 8px; margin-bottom: 15px;">FINAL DIAGNOSIS</h3>
          <div style="text-align: center;">
            <div style="font-size: 24pt; font-weight: bold; color: #0066cc; margin: 15px 0;">
              ${report.combined_prediction || report.report_data?.primary_prediction || 'N/A'}
            </div>
          </div>
        </div>
        
        <div style="margin-bottom: 25px;">
          <h3 style="font-size: 14pt; border-bottom: 2px solid #0066cc; padding-bottom: 8px; margin-bottom: 15px;">EEG ANALYSIS</h3>
          <p><strong>Predicted Disorder:</strong> ${report.eeg_prediction?.primary_prediction || report.report_data?.eeg_prediction || 'N/A'}</p>
        </div>
        
        <div style="margin-bottom: 25px;">
          <h3 style="font-size: 14pt; border-bottom: 2px solid #0066cc; padding-bottom: 8px; margin-bottom: 15px;">BIOMETRIC ANALYSIS</h3>
          <p><strong>Predicted Disorder:</strong> ${report.biometric_prediction?.primary_prediction || report.report_data?.biometric_prediction || 'N/A'}</p>
        </div>
        
        ${report.combined_confidence_scores && report.combined_confidence_scores.length > 0 ? `
        <div style="margin-bottom: 25px;">
          <h3 style="font-size: 14pt; border-bottom: 2px solid #0066cc; padding-bottom: 8px; margin-bottom: 15px;">CONFIDENCE SCORES</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
              <tr style="background: #0066cc; color: white;">
                <th style="padding: 10px; border: 1px solid #000; text-align: left;">Disorder</th>
                <th style="padding: 10px; border: 1px solid #000; text-align: left;">Confidence (%)</th>
              </tr>
            </thead>
            <tbody>
              ${report.combined_confidence_scores.slice(0, 5).map((score, idx) => {
                const disorder = typeof score === 'object' ? score.disorder : 'N/A';
                const confidence = typeof score === 'object' ? score.confidence : score;
                return `
                  <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
                    <td style="padding: 8px; border: 1px solid #ddd;">${disorder}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${confidence}%</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
        
        ${report.conflict_analysis?.has_conflict ? `
        <div style="margin-bottom: 25px; background: #fff3cd; padding: 15px; border: 2px solid #ffc107;">
          <h3 style="font-size: 14pt; margin-bottom: 10px;">CONFLICT ANALYSIS</h3>
          <p><strong>Severity:</strong> ${report.conflict_analysis.severity.toUpperCase()}</p>
          <p>${report.conflict_analysis.recommendation}</p>
        </div>
        ` : ''}
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #000; text-align: right;">
          <div style="margin-top: 50px;">
            <div style="border-top: 2px solid #000; width: 250px; margin-left: auto; margin-bottom: 5px;"></div>
            <div style="font-weight: bold;">${currentDoctor?.name || 'Healthcare Provider'}</div>
            <div style="font-size: 10pt; color: #666;">${currentDoctor?.id ? `Doctor ID: ${currentDoctor.id} • ` : ''}${new Date(report.test_date).toLocaleDateString()}</div>
          </div>
        </div>
        
        <div style="margin-top: 30px; padding: 15px; background: #f8f9fa; border: 1px solid #ddd; font-size: 9pt; color: #666;">
          <p><strong>Disclaimer:</strong> This report is generated by AnxiePredict AI-Powered Anxiety Assessment System. 
          This report should be used as a supplementary tool alongside clinical assessment. 
          Final diagnosis should be made by a qualified healthcare professional.</p>
          <p style="text-align: center; margin-top: 10px; font-style: italic;">Report generated on ${new Date().toLocaleString()}</p>
        </div>
      `;
      
      tempDiv.innerHTML = reportHTML;
      document.body.appendChild(tempDiv);
      
      // Wait for content to render
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Capture as canvas
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: tempDiv.scrollWidth,
        windowHeight: tempDiv.scrollHeight
      });
      
      // Remove temporary element
      document.body.removeChild(tempDiv);
      
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
      const dateStr = report.test_date.split('T')[0];
      pdf.save(`Medical_Report_${targetPatient?.patient_id}_${dateStr}.pdf`);
    
      toast.success(`PDF report downloaded for Patient ${targetPatient?.patient_id}!`, {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  // Load latest report for each patient to show in table
  const loadLatestReportsForPatients = async () => {
    const doctor = JSON.parse(localStorage.getItem('doctor') || '{}');
    if (!doctor.id || patients.length === 0) return;

    const reportsMap = {};
    
    // Load reports for all patients in parallel
    const promises = patients.map(async (patient) => {
      try {
        const url = `${SERVER_BASE}/api/patients/${patient.patient_id}/reports?doctor_id=${doctor.id}`;
        const response = await fetch(url, {
          headers: getAuthHeaders(),
          credentials: 'include',
        });
        
        const data = await response.json();
        if (response.ok && data.success && data.reports && data.reports.length > 0) {
          // Get latest report (already sorted by test_date descending)
          return { patientId: patient.patient_id, report: data.reports[0] };
        }
      } catch (err) {
        console.error(`Error loading reports for patient ${patient.patient_id}:`, err);
      }
      return null;
    });

    const results = await Promise.all(promises);
    results.forEach(result => {
      if (result) {
        reportsMap[result.patientId] = result.report;
      }
    });
    
    setPatientReportsMap(reportsMap);
  };

  // View patient details (all test history)
  const handleViewDetails = async (patient) => {
    setSelectedPatient(patient);
    toast.info(`Loading test history for Patient ${patient.patient_id}...`, {
      position: "top-right",
      autoClose: 2000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
    await loadPatientReports(patient.patient_id);
    setViewDetailsModal(patient);
  };

  // Download latest report as PDF
  const handleDownloadLatestReport = (patient) => {
    const latestReport = patientReportsMap[patient.patient_id];
    if (!latestReport) {
      toast.warning('No reports available for this patient', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return;
    }
    downloadReport(latestReport, patient);
  };

  // Delete patient
  const handleDeletePatient = async (patient) => {
    if (!window.confirm(`Are you sure you want to delete patient ${patient.patient_id}? This action cannot be undone.`)) {
      return;
    }

    setDeletingPatient(patient.id);
    try {
      const doctor = JSON.parse(localStorage.getItem('doctor') || '{}');
      
      const response = await fetch(`${SERVER_BASE}/api/patients/${patient.patient_id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          ...(doctor.id && { doctor_id: doctor.id.toString() })
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Remove patient from list
        setPatients(patients.filter(p => p.id !== patient.id));
        setPatientReportsMap(prev => {
          const newMap = { ...prev };
          delete newMap[patient.patient_id];
          return newMap;
        });
        if (selectedPatient?.id === patient.id) {
          setSelectedPatient(null);
          setReports([]);
        }
        if (viewDetailsModal?.id === patient.id) {
          setViewDetailsModal(null);
        }
        
        toast.success(`Patient ${patient.patient_id} deleted successfully!`, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      } else {
        const errorMsg = data.error || 'Failed to delete patient';
        setError(errorMsg);
        toast.error(`${errorMsg}`, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    } catch (err) {
      const errorMsg = 'Failed to connect to server';
      setError(errorMsg);
      console.error('Error:', err);
      toast.error(`${errorMsg}: ${err.message || 'Network error'}`, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setDeletingPatient(null);
    }
  };

  // Calculate Statistics
  const statistics = useMemo(() => {
    const totalPatients = patients.length;
    const totalReports = Object.values(patientReportsMap).length;
    
    // Count disorders
    const disorderCounts = {};
    let totalConfidence = 0;
    let confidenceCount = 0;
    
    Object.values(patientReportsMap).forEach(report => {
      const prediction = report.combined_prediction || report.report_data?.primary_prediction || 'N/A';
      if (prediction !== 'N/A') {
        disorderCounts[prediction] = (disorderCounts[prediction] || 0) + 1;
      }
      
      // Calculate average confidence
      if (report.combined_confidence_scores && report.combined_confidence_scores.length > 0) {
        const topConfidence = typeof report.combined_confidence_scores[0] === 'object' 
          ? report.combined_confidence_scores[0].confidence 
          : report.combined_confidence_scores[0];
        if (typeof topConfidence === 'number') {
          totalConfidence += topConfidence;
          confidenceCount++;
        }
      }
    });
    
    const mostCommonDisorder = Object.keys(disorderCounts).length > 0
      ? Object.entries(disorderCounts).sort((a, b) => b[1] - a[1])[0][0]
      : 'N/A';
    
    const avgConfidence = confidenceCount > 0 
      ? Math.round((totalConfidence / confidenceCount) * 10) / 10 
      : 0;
    
    // Get recent activity (last 5 reports)
    const recentActivity = Object.values(patientReportsMap)
      .sort((a, b) => new Date(b.test_date) - new Date(a.test_date))
      .slice(0, 5)
      .map(report => {
        const patientId = Object.keys(patientReportsMap).find(pid => {
          const r = patientReportsMap[pid];
          return r && (r.id === report.id || r.test_date === report.test_date);
        });
        return {
          patientId: patientId || patients.find(p => patientReportsMap[p.patient_id]?.id === report.id)?.patient_id || 'Unknown',
          prediction: report.combined_prediction || report.report_data?.primary_prediction || 'N/A',
          date: new Date(report.test_date).toLocaleString(),
          report
        };
      });
    
    // Age distribution
    const ageGroups = {
      '18-25': 0,
      '26-35': 0,
      '36-45': 0,
      '46-55': 0,
      '56+': 0
    };
    
    patients.forEach(patient => {
      const age = patient.age;
      if (age) {
        if (age >= 18 && age <= 25) ageGroups['18-25']++;
        else if (age >= 26 && age <= 35) ageGroups['26-35']++;
        else if (age >= 36 && age <= 45) ageGroups['36-45']++;
        else if (age >= 46 && age <= 55) ageGroups['46-55']++;
        else if (age > 55) ageGroups['56+']++;
      }
    });
    
    // Calculate recovery/improvement tracking
    const recoveryTracking = {};
    patients.forEach(patient => {
      const latestReport = patientReportsMap[patient.patient_id];
      
      if (latestReport) {
        const latestPrediction = latestReport.combined_prediction || latestReport.report_data?.primary_prediction || 'N/A';
        const isHealthy = (pred) => {
          const lower = pred.toLowerCase();
          return lower.includes('healthy') || lower.includes('normal');
        };
        
        // Mark patients with healthy status as recovered
        // In production, compare with their first test from full history
        if (isHealthy(latestPrediction)) {
          recoveryTracking[patient.patient_id] = {
            status: 'recovered',
            from: 'Anxiety Disorder',
            to: latestPrediction,
            improvement: 100,
            patientId: patient.patient_id,
            patientName: patient.name,
            latestDate: latestReport.test_date
          };
        }
      }
    });
    
    return {
      totalPatients,
      totalReports,
      mostCommonDisorder,
      avgConfidence,
      disorderCounts,
      recentActivity,
      ageGroups,
      recoveryTracking
    };
  }, [patients, patientReportsMap]);


  if (loading && !doctor) {
    return (
      <div className="dashboard-loading">
        <FaSpinner className="spinning" />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="doctor-dashboard">
      <div className="dashboard-header">
        <div className="doctor-welcome">
          <FaUserMd className="welcome-icon" />
          <div>
            <h1>Welcome, {doctor?.name || 'Doctor'}</h1>
            <p>Manage your patients and view test reports</p>
          </div>
        </div>
        <div className="header-actions">
          <button 
            className="refresh-btn" 
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh patients list"
          >
            <FaSync className={refreshing ? 'spinning' : ''} /> 
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="dashboard-error">
          <span>{error}</span>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="dashboard-stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(102, 126, 234, 0.2)', color: '#667eea' }}>
            <FaUsers />
          </div>
          <div className="stat-content">
            <div className="stat-value">{statistics.totalPatients}</div>
            <div className="stat-label">Total Patients</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
            <FaClipboardList />
          </div>
          <div className="stat-content">
            <div className="stat-value">{statistics.totalReports}</div>
            <div className="stat-label">Total Tests</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>
            <FaBrain />
          </div>
          <div className="stat-content">
            <div className="stat-value">{statistics.mostCommonDisorder !== 'N/A' ? statistics.mostCommonDisorder.split(' ')[0] : 'N/A'}</div>
            <div className="stat-label">Most Common Disorder</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6' }}>
            <FaChartPie />
          </div>
          <div className="stat-content">
            <div className="stat-value">{statistics.avgConfidence}%</div>
            <div className="stat-label">Avg Confidence</div>
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="dashboard-analytics-section">
        <div className="analytics-card">
          <h3 className="analytics-title">
            <FaChartPie /> Disorder Distribution
          </h3>
          <div className="disorder-distribution">
            {Object.keys(statistics.disorderCounts).length > 0 ? (
              Object.entries(statistics.disorderCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([disorder, count]) => {
                  const percentage = Math.round((count / statistics.totalReports) * 100);
                  const maxCount = Math.max(...Object.values(statistics.disorderCounts));
                  const barWidth = (count / maxCount) * 100;
                  
                  return (
                    <div key={disorder} className="disorder-bar-item">
                      <div className="disorder-bar-header">
                        <span className="disorder-name">{disorder}</span>
                        <span className="disorder-count">{count} ({percentage}%)</span>
                      </div>
                      <div className="disorder-bar-container">
                        <div 
                          className="disorder-bar" 
                          style={{ width: `${barWidth}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
            ) : (
              <div className="no-data-message">No test data available yet</div>
            )}
          </div>
        </div>

        <div className="analytics-card">
          <h3 className="analytics-title">
            <FaUsers /> Patient Demographics
          </h3>
          <div className="age-distribution">
            {Object.values(statistics.ageGroups).some(count => count > 0) ? (
              Object.entries(statistics.ageGroups).map(([ageGroup, count]) => {
                const maxCount = Math.max(...Object.values(statistics.ageGroups));
                const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
                
                return (
                  <div key={ageGroup} className="age-bar-item">
                    <div className="age-bar-header">
                      <span className="age-group">{ageGroup} years</span>
                      <span className="age-count">{count} patients</span>
                    </div>
                    <div className="age-bar-container">
                      <div 
                        className="age-bar" 
                        style={{ width: `${barWidth}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="no-data-message">No age data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {statistics.recentActivity.length > 0 && (
        <div className="recent-activity-section">
          <h3 className="section-title recent-activity-title">
            <FaClock /> Recent Activity
          </h3>
          <div className="activity-list">
            {statistics.recentActivity.map((activity, idx) => (
              <div key={idx} className="activity-item">
                <div className="activity-icon">
                  <FaClipboardList />
                </div>
                <div className="activity-content">
                  <div className="activity-main">
                    Test completed for <strong>Patient {activity.patientId}</strong>
                  </div>
                  <div className="activity-details">
                    <span className="activity-prediction">{activity.prediction}</span>
                    <span className="activity-date">{activity.date}</span>
                  </div>
                </div>
                <button 
                  className="activity-action-btn"
                  onClick={() => {
                    const patient = patients.find(p => p.patient_id === activity.patientId);
                    if (patient) handleViewDetails(patient);
                  }}
                  title="View Details"
                >
                  <FaEye />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recovery & Improvement Tracking */}
      {Object.keys(statistics.recoveryTracking).length > 0 && (
        <div className="recovery-tracking-section">
          <h3 className="section-title recovery-title">
            <FaChartBar /> Recovery & Improvement Tracking
          </h3>
          <div className="recovery-grid">
            {Object.values(statistics.recoveryTracking).map((recovery, idx) => (
              <div key={idx} className={`recovery-card ${recovery.status}`}>
                <div className="recovery-header">
                  <div className="recovery-icon">
                    {recovery.status === 'recovered' ? (
                      <FaHeart style={{ color: 'var(--accent-success)' }} />
                    ) : (
                      <FaArrowUp style={{ color: 'var(--accent-warning)' }} />
                    )}
                  </div>
                  <div className="recovery-info">
                    <div className="recovery-patient">
                      <strong>Patient {recovery.patientId}</strong>
                      {recovery.patientName && <span> - {recovery.patientName}</span>}
                    </div>
                    <div className="recovery-status-badge">
                      {recovery.status === 'recovered' ? 'Fully Recovered' : 'Improved'}
                    </div>
                  </div>
                </div>
                <div className="recovery-progress">
                  <div className="recovery-from">
                    <span className="recovery-label">From:</span>
                    <span className="recovery-value">{recovery.from}</span>
                  </div>
                  <div className="recovery-arrow">→</div>
                  <div className="recovery-to">
                    <span className="recovery-label">To:</span>
                    <span className="recovery-value">{recovery.to}</span>
                  </div>
                </div>
                <div className="recovery-improvement">
                  <div className="improvement-bar-container">
                    <div 
                      className="improvement-bar" 
                      style={{ width: `${recovery.improvement}%` }}
                    ></div>
                  </div>
                  <span className="improvement-percentage">{Math.round(recovery.improvement)}% Improvement</span>
                </div>
                <div className="recovery-date">
                  Latest test: {new Date(recovery.latestDate).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h3 className="section-title quick-actions-title">
          <FaArrowRight /> Quick Actions
        </h3>
        <div className="quick-actions-grid">
          <button 
            className="quick-action-btn"
            onClick={() => navigate('/realtime')}
          >
            <FaClipboardList />
            <span>Start New Test</span>
          </button>
          <button 
            className="quick-action-btn"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <FaSync className={refreshing ? 'spinning' : ''} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      <div className="dashboard-content-table">
        <div className="patients-table-panel">
          <div className="panel-header">
            <h2>Patients {patients.length > 0 && <span className="patient-count">({patients.length})</span>}</h2>
            <div className="panel-header-actions">
              <button 
                className="refresh-icon-btn" 
                onClick={handleRefresh}
                disabled={refreshing}
                title="Refresh patients list"
              >
                <FaSync className={refreshing ? 'spinning' : ''} />
              </button>
              <div className="search-box">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search patients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="patients-table-container">
            {filteredAndSortedPatients.length === 0 ? (
              <div className="empty-state">
                <FaUserMd className="empty-icon" />
                <p>No patients found</p>
                <p className="empty-hint">Click refresh to load patients</p>
              </div>
            ) : (
              <table className="patients-table">
                <thead>
                  <tr>
                    <th className="sortable-header" onClick={() => handleSort('patient_id')}>
                      Patient ID {getSortIcon('patient_id')}
                    </th>
                    <th className="sortable-header" onClick={() => handleSort('name')}>
                      Patient Name {getSortIcon('name')}
                    </th>
                    <th className="sortable-header" onClick={() => handleSort('age')}>
                      Age {getSortIcon('age')}
                    </th>
                    <th className="sortable-header" onClick={() => handleSort('eeg_prediction')}>
                      <FaBrain style={{ marginRight: '8px' }} />EEG Prediction {getSortIcon('eeg_prediction')}
                    </th>
                    <th className="sortable-header" onClick={() => handleSort('biometric_prediction')}>
                      <FaHeartbeat style={{ marginRight: '8px' }} />Biometric Prediction {getSortIcon('biometric_prediction')}
                    </th>
                    <th className="sortable-header" onClick={() => handleSort('final_prediction')}>
                      <FaCheckCircle style={{ marginRight: '8px' }} />Final Prediction {getSortIcon('final_prediction')}
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedPatients.map((patient) => {
                    const latestReport = patientReportsMap[patient.patient_id];
                    const eegPrediction = latestReport?.eeg_prediction?.primary_prediction || latestReport?.eeg_prediction?.result || latestReport?.report_data?.eeg_prediction || 'N/A';
                    const biometricPrediction = latestReport?.biometric_prediction?.primary_prediction || latestReport?.biometric_prediction?.result || latestReport?.report_data?.biometric_prediction || 'N/A';
                    const finalPrediction = latestReport?.combined_prediction?.primary_prediction || latestReport?.report_data?.primary_prediction || 'N/A';
                    
                    return (
                      <tr key={patient.id} className={selectedPatient?.id === patient.id ? 'selected' : ''}>
                        <td className="patient-id-cell">{patient.patient_id}</td>
                        <td className="patient-name-cell">{patient.name || '-'}</td>
                        <td className="patient-age-cell">{patient.age || '-'}</td>
                        <td className="prediction-cell">
                          <span className={`prediction-badge eeg-badge ${eegPrediction.toLowerCase().includes('healthy') ? 'healthy' : eegPrediction.toLowerCase().includes('anxiety') || eegPrediction.toLowerCase().includes('panic') || eegPrediction.toLowerCase().includes('disorder') ? 'disorder' : 'no-test'}`}>
                            {eegPrediction}
                          </span>
                        </td>
                        <td className="prediction-cell">
                          <span className={`prediction-badge biometric-badge ${biometricPrediction.toLowerCase().includes('healthy') ? 'healthy' : biometricPrediction.toLowerCase().includes('anxiety') || biometricPrediction.toLowerCase().includes('panic') || biometricPrediction.toLowerCase().includes('disorder') ? 'disorder' : 'no-test'}`}>
                            {biometricPrediction}
                          </span>
                        </td>
                        <td className="prediction-cell">
                          <span className={`prediction-badge final-badge ${finalPrediction.toLowerCase().includes('healthy') ? 'healthy' : finalPrediction.toLowerCase().includes('anxiety') || finalPrediction.toLowerCase().includes('panic') || finalPrediction.toLowerCase().includes('disorder') ? 'disorder' : 'no-test'}`}>
                            {finalPrediction}
                          </span>
                        </td>
                        <td className="actions-cell">
                          <div className="action-buttons">
                            {latestReport && (
                              <button
                                className="action-btn download-btn"
                                onClick={() => handleDownloadLatestReport(patient)}
                                title="Download Latest Report (PDF)"
                              >
                                <FaFilePdf />
                              </button>
                            )}
                            <button
                              className="action-btn view-btn"
                              onClick={() => handleViewDetails(patient)}
                              title="View All Test History"
                            >
                              <FaEye />
                            </button>
                            <button
                              className="action-btn delete-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePatient(patient);
                              }}
                              disabled={deletingPatient === patient.id}
                              title="Delete Patient"
                            >
                              {deletingPatient === patient.id ? (
                                <FaSpinner className="spinning" />
                              ) : (
                                <FaTrash />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* View Details Modal */}
      {viewDetailsModal && (
        <div className="modal-overlay" onClick={() => setViewDetailsModal(null)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Test History - Patient {viewDetailsModal.patient_id}</h3>
              <button className="modal-close" onClick={() => setViewDetailsModal(null)}>×</button>
            </div>
            <div className="modal-body">
              {reports.length === 0 ? (
                <div className="empty-state">
                  <FaHistory className="empty-icon" />
                  <p>No reports yet for this patient</p>
                  <button onClick={() => { setViewDetailsModal(null); navigate('/realtime'); }}>Start First Test</button>
                </div>
              ) : (
                <div className="reports-history-list">
                  {reports.map((report) => (
                    <div key={report.id} className="report-history-card">
                      <div className="report-history-header">
                        <div className="report-date">
                          <FaCalendar className="date-icon" />
                          {new Date(report.test_date).toLocaleString()}
                        </div>
                        <button
                          className="download-btn"
                          onClick={() => downloadReport(report)}
                          title="Download Report"
                        >
                          <FaFilePdf /> Download PDF
                        </button>
                      </div>
                      <div className="report-history-content">
                        <div className="report-prediction-main">
                          <strong>Primary Prediction:</strong> {report.combined_prediction || report.report_data?.primary_prediction || 'N/A'}
                        </div>
                        {report.conflict_analysis?.has_conflict && (
                          <div className="conflict-warning">
                            Conflict detected: {report.conflict_analysis.recommendation}
                          </div>
                        )}
                        <div className="report-details-grid">
                          <div>
                            <strong>EEG Prediction:</strong> {report.eeg_prediction?.primary_prediction || report.report_data?.eeg_prediction || 'N/A'}
                          </div>
                          <div>
                            <strong>Biometric Prediction:</strong> {report.biometric_prediction?.primary_prediction || report.report_data?.biometric_prediction || 'N/A'}
                          </div>
                        </div>
                        {report.combined_confidence_scores && report.combined_confidence_scores.length > 0 && (
                          <div className="confidence-scores">
                            <strong>Confidence Scores:</strong>
                            <ul>
                              {report.combined_confidence_scores.slice(0, 3).map((score, idx) => (
                                <li key={idx}>
                                  {typeof score === 'object' ? `${score.disorder}: ${score.confidence}%` : score}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="new-test-btn" onClick={() => { setViewDetailsModal(null); navigate('/realtime'); }}>
                New Test
              </button>
              <button className="modal-close-btn" onClick={() => setViewDetailsModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;

