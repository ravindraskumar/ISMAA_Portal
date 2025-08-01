// =====================================================
// ISMAA Bengaluru Portal - Enhanced User Profile Component
// =====================================================
//
// Advanced user profile management component with comprehensive features
// for account management, security settings, and privacy controls.
//
// Key Features:
// - User account information display and editing
// - First-time login password change enforcement
// - Password strength validation and change functionality
// - Username change capability (one-time only)
// - Privacy controls and profile visibility settings
// - Theme preferences and app settings
// - Role-based information presentation
// - Admin functions for user management
//
// Security Features:
// - Secure password change with current password verification
// - Password strength validation with real-time feedback
// - Username availability checking in real-time
// - Account lockout status display
// - Security event history (admin view)
//
// Profile Management:
// - Display Name: User's full name for identification
// - Username: System login identifier (changeable once)
// - Email Address: Contact information with validation
// - Privacy Settings: Profile visibility controls
// - Theme Preferences: Dark/light mode selection
//
// Dependencies: Enhanced AuthContext, React hooks
// Author: ISMAA Portal Team
// =====================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Enhanced UserProfile component with comprehensive account management
 * Supports password changes, settings, and privacy controls
 */
const UserProfile = ({ onClose }) => {
  const { 
    user, 
    updateProfile, 
    updateSettings, 
    changePassword, 
    changeUsername,
    checkUsernameAvailability,
    isFirstLogin,
    isAdmin,
    adminResetPassword,
    getAllUsers,
    getSecurityLogs
  } = useAuth();
  
  // Tab state management
  const [activeTab, setActiveTab] = useState(isFirstLogin() ? 'security' : 'profile');
  
  // Edit mode state management
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(isFirstLogin());
  const [isChangingUsername, setIsChangingUsername] = useState(false);
  
  // Form data states
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [usernameData, setUsernameData] = useState({
    newUsername: ''
  });

  const [settingsData, setSettingsData] = useState({
    theme: user?.settings?.theme || 'dark',
    profileVisible: user?.settings?.profileVisible !== false,
    emailVisible: user?.settings?.emailVisible !== false,
    phoneVisible: user?.settings?.phoneVisible !== false
  });

  // Validation and status states
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  
  // Password strength validation
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    message: '',
    color: '#ff4444'
  });

  // Admin functionality states
  const [adminData, setAdminData] = useState({
    users: [],
    securityLogs: [], 
    selectedUserId: '',
    resetPasswordUserId: '',
    viewLogsUserId: ''
  });
  const [adminLoading, setAdminLoading] = useState(false);

  // Health System and Maintenance states
  const [healthData, setHealthData] = useState({
    score: null,
    testResults: null,
    maintenanceResults: null,
    recommendations: [],
    lastAnalysis: null
  });
  const [healthLoading, setHealthLoading] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);

  // Collapsible sections state
  const [collapsedSections, setCollapsedSections] = useState({
    healthSystem: false,
    testRunner: false,
    maintenanceTools: false,
    userManagement: false,
    securityLogs: false
  });

  // Logging modal state
  const [logsModal, setLogsModal] = useState({
    isOpen: false,
    title: '',
    logs: [],
    isRunning: false
  });

  /**
   * Check password strength in real-time
   */
  const validatePasswordStrength = (password) => {
    let score = 0;
    let message = '';
    let color = '#ff4444';

    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    switch (score) {
      case 0:
      case 1:
        message = 'Very Weak';
        color = '#ff4444';
        break;
      case 2:
        message = 'Weak';
        color = '#ff8800';
        break;
      case 3:
        message = 'Fair';
        color = '#ffaa00';
        break;
      case 4:
        message = 'Good';
        color = '#88aa00';
        break;
      case 5:
        message = 'Strong';
        color = '#00aa44';
        break;
      default:
        message = 'Unknown';
    }

    setPasswordStrength({ score, message, color });
    return score >= 3; // Require at least "Fair" strength
  };

  /**
   * Check username availability in real-time
   */
  const checkUsername = async (username) => {
    if (username && username !== user?.username) {
      try {
        const available = await checkUsernameAvailability(username);
        setUsernameAvailable(available);
      } catch (error) {
        setUsernameAvailable(false);
      }
    } else {
      setUsernameAvailable(null);
    }
  };

  /**
   * Handle profile data changes
   */
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  /**
   * Handle password data changes with validation
   */
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));

    // Validate password strength for new password
    if (name === 'newPassword') {
      validatePasswordStrength(value);
    }

    // Clear errors for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  /**
   * Handle username data changes with availability checking
   */
  const handleUsernameChange = (e) => {
    const { value } = e.target;
    setUsernameData({ newUsername: value });
    
    // Check availability with debounce
    setTimeout(() => checkUsername(value), 500);
    
    // Clear errors
    if (errors.newUsername) {
      setErrors(prev => ({
        ...prev,
        newUsername: ''
      }));
    }
  };

  /**
   * Handle settings changes
   */
  const handleSettingsChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettingsData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  /**
   * Save profile changes
   */
  const handleSaveProfile = async () => {
    setLoading(true);
    setErrors({});
    
    try {
      const result = await updateProfile(profileData);
      
      if (result.success) {
        setSuccess('Profile updated successfully!');
        setIsEditingProfile(false);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setErrors({ general: result.error });
      }
    } catch (error) {
      setErrors({ general: 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Change password with validation
   */
  const handleChangePassword = async () => {
    setLoading(true);
    setErrors({});
    
    // Validate form
    const newErrors = {};
    
    if (!passwordData.currentPassword && !isFirstLogin()) {
      newErrors.currentPassword = 'Current password is required';
    }
    
    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (!validatePasswordStrength(passwordData.newPassword)) {
      newErrors.newPassword = 'Password is too weak';
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }
    
    try {
      const result = await changePassword(
        passwordData.currentPassword, 
        passwordData.newPassword
      );
      
      if (result.success) {
        setSuccess('Password changed successfully!');
        setIsChangingPassword(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setErrors({ general: result.error });
      }
    } catch (error) {
      setErrors({ general: 'Failed to change password' });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Change username (one-time only)
   */
  const handleChangeUsername = async () => {
    setLoading(true);
    setErrors({});
    
    // Validate
    if (!usernameData.newUsername) {
      setErrors({ newUsername: 'New username is required' });
      setLoading(false);
      return;
    }
    
    if (usernameAvailable === false) {
      setErrors({ newUsername: 'Username is not available' });
      setLoading(false);
      return;
    }
    
    try {
      const result = await changeUsername(usernameData.newUsername);
      
      if (result.success) {
        setSuccess('Username changed successfully!');
        setIsChangingUsername(false);
        setUsernameData({ newUsername: '' });
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setErrors({ general: result.error });
      }
    } catch (error) {
      setErrors({ general: 'Failed to change username' });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Save settings
   */
  const handleSaveSettings = async () => {
    setLoading(true);
    
    try {
      const result = await updateSettings(settingsData);
      
      if (result.success) {
        setSuccess('Settings saved successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setErrors({ general: result.error });
      }
    } catch (error) {
      setErrors({ general: 'Failed to save settings' });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Admin function: Load all users
   */
  const handleLoadUsers = async () => {
    setAdminLoading(true);
    try {
      const result = await getAllUsers();
      if (result.success) {
        setAdminData(prev => ({ ...prev, users: result.users }));
      } else {
        setErrors({ admin: result.error });
      }
    } catch (error) {
      setErrors({ admin: 'Failed to load users' });
    } finally {
      setAdminLoading(false);
    }
  };

  /**
   * Admin function: Reset user password
   */
  const handleResetPassword = async (targetUserId) => {
    setAdminLoading(true);
    try {
      const result = await adminResetPassword(targetUserId);
      if (result.success) {
        setSuccess(`Password reset successfully! Temporary password: ${result.temporaryPassword}`);
        setTimeout(() => setSuccess(''), 10000); // Show for 10 seconds
      } else {
        setErrors({ admin: result.error });
      }
    } catch (error) {
      setErrors({ admin: 'Failed to reset password' });
    } finally {
      setAdminLoading(false);
    }
  };

  /**
   * Admin function: Load security logs
   */
  const handleLoadSecurityLogs = async (targetUserId = null) => {
    setAdminLoading(true);
    try {
      const result = await getSecurityLogs(targetUserId, 100);
      if (result.success) {
        setAdminData(prev => ({ 
          ...prev, 
          securityLogs: result.logs,
          viewLogsUserId: targetUserId || 'all'
        }));
      } else {
        setErrors({ admin: result.error });
      }
    } catch (error) {
      setErrors({ admin: 'Failed to load security logs' });
    } finally {
      setAdminLoading(false);
    }
  };

  /**
   * Health System Functions
   */
  
  // Toggle collapsible sections
  const toggleSection = (section) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Logging modal helper functions
  const openLogsModal = (title) => {
    setLogsModal({
      isOpen: true,
      title: title,
      logs: [`🚀 Starting ${title}...`],
      isRunning: true
    });
  };

  const addLogEntry = (message) => {
    setLogsModal(prev => ({
      ...prev,
      logs: [...prev.logs, `${new Date().toLocaleTimeString()} - ${message}`]
    }));
  };

  const closeLogsModal = () => {
    setLogsModal(prev => ({
      ...prev,
      isRunning: false
    }));
    // Auto-close after 3 seconds when operation completes
    setTimeout(() => {
      setLogsModal({
        isOpen: false,
        title: '',
        logs: [],
        isRunning: false
      });
    }, 3000);
  };

  // Run comprehensive health analysis
  const handleRunHealthAnalysis = async () => {
    setHealthLoading(true);
    openLogsModal('Comprehensive Health Analysis');
    
    try {
      addLogEntry('🔍 Initializing health system...');
      addLogEntry('📊 Running comprehensive analysis...');
      
      const response = await fetch('/api/health/comprehensive-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        addLogEntry('✅ Analysis request successful');
        addLogEntry('📈 Processing results...');
        
        const data = await response.json();
        
        addLogEntry(`🎯 Health score calculated: ${data.overallHealthScore}/100`);
        addLogEntry(`🧪 Tests completed: ${data.testResults?.summary?.total || 0} total`);
        addLogEntry(`🔧 Issues found: ${data.maintenanceResults?.issuesFound || 0}`);
        addLogEntry(`💡 Recommendations generated: ${data.recommendations?.length || 0}`);
        
        setHealthData({
          score: data.overallHealthScore,
          testResults: data.testResults,
          maintenanceResults: data.maintenanceResults,
          recommendations: data.recommendations,
          lastAnalysis: new Date().toISOString()
        });
        
        addLogEntry('🎉 Health analysis completed successfully!');
        setSuccess('Health analysis completed successfully!');
      } else {
        addLogEntry('❌ Analysis request failed');
        setErrors({ admin: 'Failed to run health analysis' });
      }
    } catch (error) {
      addLogEntry(`💥 Error: ${error.message}`);
      setErrors({ admin: 'Error running health analysis: ' + error.message });
    } finally {
      setHealthLoading(false);
      closeLogsModal();
    }
  };

  // Run specific test category
  const handleRunTestCategory = async (category) => {
    setHealthLoading(true);
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ');
    openLogsModal(`${categoryName} Tests`);
    
    try {
      addLogEntry(`🧪 Initializing ${categoryName} test suite...`);
      addLogEntry('🔧 Setting up test environment...');
      
      const response = await fetch('/api/health/run-tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ category })
      });
      
      if (response.ok) {
        addLogEntry('✅ Test execution started');
        addLogEntry(`📋 Running ${categoryName} tests...`);
        
        const data = await response.json();
        
        if (data.testResults) {
          const results = data.testResults.summary;
          addLogEntry(`📊 Test results: ${results?.total || 0} total, ${results?.passed || 0} passed, ${results?.failed || 0} failed, ${results?.errors || 0} errors`);
          
          if (data.testResults.failedTests?.length > 0) {
            addLogEntry(`🚨 Failed tests: ${data.testResults.failedTests.join(', ')}`);
          }
          
          if (data.testResults.errorTests?.length > 0) {
            addLogEntry(`💥 Error tests: ${data.testResults.errorTests.join(', ')}`);
          }
        }
        
        setHealthData(prev => ({
          ...prev,
          testResults: data.testResults,
          lastAnalysis: new Date().toISOString()
        }));
        
        addLogEntry(`🎉 ${categoryName} tests completed successfully!`);
        setSuccess(`${categoryName} tests completed successfully!`);
      } else {
        addLogEntry(`❌ Failed to run ${categoryName} tests`);
        setErrors({ admin: `Failed to run ${categoryName} tests` });
      }
    } catch (error) {
      addLogEntry(`💥 Error: ${error.message}`);
      setErrors({ admin: `Error running ${categoryName} tests: ` + error.message });
    } finally {
      setHealthLoading(false);
      closeLogsModal();
    }
  };

  // Run specific maintenance function
  const handleRunMaintenanceFunction = async (functionName, description) => {
    setMaintenanceLoading(true);
    openLogsModal(description);
    
    try {
      addLogEntry(`🔧 Initializing ${description}...`);
      addLogEntry('🔍 Connecting to maintenance system...');
      
      const response = await fetch('/api/maintenance/run-function', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ functionName })
      });
      
      if (response.ok) {
        addLogEntry('✅ Maintenance function started');
        addLogEntry(`⚙️ Executing ${description}...`);
        
        const data = await response.json();
        
        if (data.results) {
          addLogEntry(`🔍 Issues found: ${data.results.issuesFound || 0}`);
          addLogEntry(`✅ Issues resolved: ${data.results.issuesResolved || 0}`);
          addLogEntry(`🏥 Health check: ${data.results.healthCheckPassed ? 'Passed' : 'Failed'}`);
          
          if (data.results.details) {
            if (data.results.details.resolved?.length > 0) {
              addLogEntry(`🎯 Resolved: ${data.results.details.resolved.join(', ')}`);
            }
            if (data.results.details.issues?.length > 0) {
              addLogEntry(`⚠️ Remaining issues: ${data.results.details.issues.length}`);
            }
          }
        }
        
        setHealthData(prev => ({
          ...prev,
          maintenanceResults: data.results,
          lastAnalysis: new Date().toISOString()
        }));
        
        addLogEntry(`🎉 ${description} completed successfully!`);
        setSuccess(`${description} completed successfully!`);
      } else {
        addLogEntry(`❌ Failed to run ${description}`);
        setErrors({ admin: `Failed to run ${description}` });
      }
    } catch (error) {
      addLogEntry(`💥 Error: ${error.message}`);
      setErrors({ admin: `Error running ${description}: ` + error.message });
    } finally {
      setMaintenanceLoading(false);
      closeLogsModal();
    }
  };

  // Get health score color and status
  const getHealthStatus = (score) => {
    if (score >= 90) return { color: '#4CAF50', status: 'Excellent', icon: '🟢' };
    if (score >= 70) return { color: '#FF9800', status: 'Good', icon: '🟡' };
    if (score >= 50) return { color: '#FF5722', status: 'Fair', icon: '🟠' };
    return { color: '#F44336', status: 'Poor', icon: '🔴' };
  };

  // Load users when admin tab is opened
  useEffect(() => {
    if (activeTab === 'admin' && isAdmin() && adminData.users.length === 0) {
      handleLoadUsers();
    }
  }, [activeTab]);

  // Show first-time password change modal if required
  if (isFirstLogin() && isChangingPassword) {
    return (
      <div className="modal-overlay">
        <div className="modal-content first-login-modal" onClick={e => e.stopPropagation()}>
          <div className="first-login-header">
            <h2>🔐 First Time Login</h2>
            <p>Please change your password to continue</p>
          </div>

          {errors.general && <div className="error">{errors.general}</div>}
          {success && <div className="success">{success}</div>}

          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              className={errors.newPassword ? 'error' : ''}
              placeholder="Enter new password"
            />
            {passwordData.newPassword && (
              <div className="password-strength" style={{ color: passwordStrength.color }}>
                Strength: {passwordStrength.message}
              </div>
            )}
            {errors.newPassword && <div className="error-text">{errors.newPassword}</div>}
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              className={errors.confirmPassword ? 'error' : ''}
              placeholder="Confirm new password"
            />
            {errors.confirmPassword && <div className="error-text">{errors.confirmPassword}</div>}
          </div>

          <div className="modal-actions">
            <button 
              onClick={handleChangePassword}
              disabled={loading || passwordStrength.score < 3}
              className="btn btn-primary"
            >
              {loading ? 'Changing Password...' : 'Change Password'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content user-profile-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <div className="profile-header">
          <div className="profile-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="profile-info">
            <h2>{user?.name || 'User'}</h2>
            <p className="profile-role">{user?.role || 'Member'}</p>
            {user?.email && <p className="profile-email">{user.email}</p>}
          </div>
        </div>

        {success && <div className="success">{success}</div>}
        {errors.general && <div className="error">{errors.general}</div>}

        {/* Tab Navigation */}
        <div className="profile-tabs">
          <button 
            className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            👤 Profile
          </button>
          <button 
            className={`tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            🔐 Security
          </button>
          <button 
            className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ Settings
          </button>
          {isAdmin() && (
            <button 
              className={`tab ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              👑 Admin
            </button>
          )}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="tab-content">
            <div className="profile-section">
              <div className="section-header">
                <h3>Profile Information</h3>
                {!isEditingProfile && (
                  <button 
                    onClick={() => setIsEditingProfile(true)}
                    className="btn btn-secondary"
                  >
                    Edit Profile
                  </button>
                )}
              </div>

              {isEditingProfile ? (
                <div className="edit-form">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={profileData.name}
                      onChange={handleProfileChange}
                      className={errors.name ? 'error' : ''}
                    />
                    {errors.name && <div className="error-text">{errors.name}</div>}
                  </div>

                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={profileData.email}
                      onChange={handleProfileChange}
                      className={errors.email ? 'error' : ''}
                    />
                    {errors.email && <div className="error-text">{errors.email}</div>}
                  </div>

                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={profileData.phone}
                      onChange={handleProfileChange}
                      className={errors.phone ? 'error' : ''}
                    />
                    {errors.phone && <div className="error-text">{errors.phone}</div>}
                  </div>

                  <div className="form-group">
                    <label>Address</label>
                    <textarea
                      name="address"
                      value={profileData.address}
                      onChange={handleProfileChange}
                      className={errors.address ? 'error' : ''}
                      rows="3"
                    />
                    {errors.address && <div className="error-text">{errors.address}</div>}
                  </div>

                  <div className="form-actions">
                    <button 
                      onClick={handleSaveProfile}
                      disabled={loading}
                      className="btn btn-primary"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button 
                      onClick={() => {
                        setIsEditingProfile(false);
                        setProfileData({
                          name: user?.name || '',
                          email: user?.email || '',
                          phone: user?.phone || '',
                          address: user?.address || ''
                        });
                      }}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="profile-display">
                  <div className="profile-field">
                    <label>Full Name:</label>
                    <span>{user?.name || 'Not provided'}</span>
                  </div>
                  <div className="profile-field">
                    <label>Username:</label>
                    <span>{user?.username}</span>
                  </div>
                  <div className="profile-field">
                    <label>Email:</label>
                    <span>{user?.email || 'Not provided'}</span>
                  </div>
                  <div className="profile-field">
                    <label>Phone:</label>
                    <span>{user?.phone || 'Not provided'}</span>
                  </div>
                  <div className="profile-field">
                    <label>Address:</label>
                    <span>{user?.address || 'Not provided'}</span>
                  </div>
                  <div className="profile-field">
                    <label>Role:</label>
                    <span className="role-badge">{user?.role}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="tab-content">
            <div className="security-section">
              {/* Password Change Section */}
              <div className="section-header">
                <h3>Password Management</h3>
                {!isChangingPassword && (
                  <button 
                    onClick={() => setIsChangingPassword(true)}
                    className="btn btn-secondary"
                  >
                    Change Password
                  </button>
                )}
              </div>

              {isChangingPassword && (
                <div className="password-form">
                  {!isFirstLogin() && (
                    <div className="form-group">
                      <label>Current Password</label>
                      <input
                        type="password"
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        className={errors.currentPassword ? 'error' : ''}
                        placeholder="Enter current password"
                      />
                      {errors.currentPassword && <div className="error-text">{errors.currentPassword}</div>}
                    </div>
                  )}

                  <div className="form-group">
                    <label>New Password</label>
                    <input
                      type="password"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      className={errors.newPassword ? 'error' : ''}
                      placeholder="Enter new password"
                    />
                    {passwordData.newPassword && (
                      <div className="password-strength" style={{ color: passwordStrength.color }}>
                        Strength: {passwordStrength.message}
                      </div>
                    )}
                    {errors.newPassword && <div className="error-text">{errors.newPassword}</div>}
                  </div>

                  <div className="form-group">
                    <label>Confirm Password</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      className={errors.confirmPassword ? 'error' : ''}
                      placeholder="Confirm new password"
                    />
                    {errors.confirmPassword && <div className="error-text">{errors.confirmPassword}</div>}
                  </div>

                  <div className="form-actions">
                    <button 
                      onClick={handleChangePassword}
                      disabled={loading || passwordStrength.score < 3}
                      className="btn btn-primary"
                    >
                      {loading ? 'Changing Password...' : 'Change Password'}
                    </button>
                    <button 
                      onClick={() => {
                        setIsChangingPassword(false);
                        setPasswordData({
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: ''
                        });
                      }}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Username Change Section */}
              {!user?.usernameChanged && (
                <>
                  <div className="section-header">
                    <h3>Username Management</h3>
                    <p className="section-note">You can change your username once</p>
                    {!isChangingUsername && (
                      <button 
                        onClick={() => setIsChangingUsername(true)}
                        className="btn btn-secondary"
                      >
                        Change Username
                      </button>
                    )}
                  </div>

                  {isChangingUsername && (
                    <div className="username-form">
                      <div className="form-group">
                        <label>New Username</label>
                        <input
                          type="text"
                          name="newUsername"
                          value={usernameData.newUsername}
                          onChange={handleUsernameChange}
                          className={errors.newUsername ? 'error' : ''}
                          placeholder="Enter new username"
                        />
                        {usernameData.newUsername && usernameAvailable !== null && (
                          <div className={`availability-status ${usernameAvailable ? 'available' : 'unavailable'}`}>
                            {usernameAvailable ? '✓ Username available' : '✗ Username not available'}
                          </div>
                        )}
                        {errors.newUsername && <div className="error-text">{errors.newUsername}</div>}
                      </div>

                      <div className="form-actions">
                        <button 
                          onClick={handleChangeUsername}
                          disabled={loading || !usernameAvailable || !usernameData.newUsername}
                          className="btn btn-primary"
                        >
                          {loading ? 'Changing Username...' : 'Change Username'}
                        </button>
                        <button 
                          onClick={() => {
                            setIsChangingUsername(false);
                            setUsernameData({ newUsername: '' });
                            setUsernameAvailable(null);
                          }}
                          className="btn btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Account Security Info */}
              <div className="security-info">
                <h3>Account Security</h3>
                <div className="security-status">
                  <div className="status-item">
                    <span>Account Status:</span>
                    <span className="status-active">Active</span>
                  </div>
                  <div className="status-item">
                    <span>Last Login:</span>
                    <span>{user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'First login'}</span>
                  </div>
                  <div className="status-item">
                    <span>Failed Login Attempts:</span>
                    <span>{user?.failedAttempts || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="tab-content">
            <div className="settings-section">
              <h3>App Settings</h3>
              
              <div className="form-group">
                <label>Theme Preference</label>
                <select 
                  name="theme"
                  value={settingsData.theme}
                  onChange={handleSettingsChange}
                >
                  <option value="dark">Dark Theme</option>
                  <option value="light">Light Theme</option>
                </select>
              </div>

              <h3>Privacy Settings</h3>
              
              <div className="privacy-controls">
                <div className="privacy-item">
                  <label>
                    <input
                      type="checkbox"
                      name="profileVisible"
                      checked={settingsData.profileVisible}
                      onChange={handleSettingsChange}
                    />
                    Make profile visible to other members
                  </label>
                </div>

                <div className="privacy-item">
                  <label>
                    <input
                      type="checkbox"
                      name="emailVisible"
                      checked={settingsData.emailVisible}
                      onChange={handleSettingsChange}
                    />
                    Show email address in profile
                  </label>
                </div>

                <div className="privacy-item">
                  <label>
                    <input
                      type="checkbox"
                      name="phoneVisible"
                      checked={settingsData.phoneVisible}
                      onChange={handleSettingsChange}
                    />
                    Show phone number in profile
                  </label>
                </div>
              </div>

              <div className="form-actions">
                <button 
                  onClick={handleSaveSettings}
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Tab */}
        {activeTab === 'admin' && isAdmin() && (
          <div className="tab-content">
            <div className="admin-section">
              <h3>Admin Functions</h3>
              
              {/* Admin Error/Success Messages */}
              {errors.admin && <div className="error-text">{errors.admin}</div>}
              {success && <div className="success-text">{success}</div>}
              
              {/* Health System Section */}
              <div className="admin-subsection">
                <div className="subsection-header" onClick={() => toggleSection('healthSystem')}>
                  <h4>🏥 System Health Overview</h4>
                  <span className="toggle-icon">{collapsedSections.healthSystem ? '▶' : '▼'}</span>
                </div>
                {!collapsedSections.healthSystem && (
                  <div className="subsection-content">
                    <div className="health-overview">
                      {healthData.score !== null && (
                        <div className="health-score-display">
                          <div className="health-score" style={{ color: getHealthStatus(healthData.score).color }}>
                            <span className="score-icon">{getHealthStatus(healthData.score).icon}</span>
                            <span className="score-value">{healthData.score}/100</span>
                            <span className="score-status">{getHealthStatus(healthData.score).status}</span>
                          </div>
                          {healthData.lastAnalysis && (
                            <div className="last-analysis">
                              Last Analysis: {new Date(healthData.lastAnalysis).toLocaleString()}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <button 
                        onClick={handleRunHealthAnalysis}
                        disabled={healthLoading}
                        className="btn btn-primary health-btn"
                      >
                        {healthLoading ? 'Analyzing...' : '🔍 Run Complete Health Analysis'}
                      </button>

                      {healthData.recommendations.length > 0 && (
                        <div className="recommendations">
                          <h5>💡 Recommendations</h5>
                          <div className="recommendations-list">
                            {healthData.recommendations.slice(0, 5).map((rec, index) => (
                              <div key={index} className={`recommendation ${rec.severity}`}>
                                <div className="rec-header">
                                  <span className="rec-test">{rec.failedTest}</span>
                                  <span className="rec-severity">{rec.severity}</span>
                                  <span className="rec-confidence">{rec.confidence}%</span>
                                </div>
                                <div className="rec-action">→ {rec.maintenanceFunction}</div>
                                <div className="rec-description">{rec.description}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Test Runner Section */}
              <div className="admin-subsection">
                <div className="subsection-header" onClick={() => toggleSection('testRunner')}>
                  <h4>🧪 Test Runner</h4>
                  <span className="toggle-icon">{collapsedSections.testRunner ? '▶' : '▼'}</span>
                </div>
                {!collapsedSections.testRunner && (
                  <div className="subsection-content">
                    <div className="test-categories">
                      <div className="test-grid">
                        <button 
                          onClick={() => handleRunTestCategory('authentication')}
                          disabled={healthLoading}
                          className="btn btn-secondary test-btn"
                        >
                          🔐 Authentication Tests
                        </button>
                        <button 
                          onClick={() => handleRunTestCategory('database')}
                          disabled={healthLoading}
                          className="btn btn-secondary test-btn"
                        >
                          💾 Database Tests
                        </button>
                        <button 
                          onClick={() => handleRunTestCategory('security')}
                          disabled={healthLoading}
                          className="btn btn-secondary test-btn"
                        >
                          🛡️ Security Tests
                        </button>
                        <button 
                          onClick={() => handleRunTestCategory('performance')}
                          disabled={healthLoading}
                          className="btn btn-secondary test-btn"
                        >
                          ⚡ Performance Tests
                        </button>
                        <button 
                          onClick={() => handleRunTestCategory('data_consistency')}
                          disabled={healthLoading}
                          className="btn btn-secondary test-btn"
                        >
                          🔄 Data Consistency Tests
                        </button>
                        <button 
                          onClick={() => handleRunTestCategory('system')}
                          disabled={healthLoading}
                          className="btn btn-secondary test-btn"
                        >
                          🌐 System Integration Tests
                        </button>
                      </div>
                      
                      {healthData.testResults && (
                        <div className="test-results-summary">
                          <h5>📊 Latest Test Results</h5>
                          <div className="results-stats">
                            <div className="stat-item">
                              <span className="stat-label">Total:</span>
                              <span className="stat-value">{healthData.testResults.summary?.total || 0}</span>
                            </div>
                            <div className="stat-item success">
                              <span className="stat-label">Passed:</span>
                              <span className="stat-value">{healthData.testResults.summary?.passed || 0}</span>
                            </div>
                            <div className="stat-item failed">
                              <span className="stat-label">Failed:</span>
                              <span className="stat-value">{healthData.testResults.summary?.failed || 0}</span>
                            </div>
                            <div className="stat-item error">
                              <span className="stat-label">Errors:</span>
                              <span className="stat-value">{healthData.testResults.summary?.errors || 0}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Maintenance Tools Section */}
              <div className="admin-subsection">
                <div className="subsection-header" onClick={() => toggleSection('maintenanceTools')}>
                  <h4>🔧 Maintenance Tools</h4>
                  <span className="toggle-icon">{collapsedSections.maintenanceTools ? '▶' : '▼'}</span>
                </div>
                {!collapsedSections.maintenanceTools && (
                  <div className="subsection-content">
                    <div className="maintenance-tools">
                      <div className="maintenance-grid">
                        <button 
                          onClick={() => handleRunMaintenanceFunction('performHealthCheck', 'System Health Check')}
                          disabled={maintenanceLoading}
                          className="btn btn-info maintenance-btn"
                        >
                          🏥 System Health Check
                        </button>
                        <button 
                          onClick={() => handleRunMaintenanceFunction('fixIssues', 'Auto-Fix Issues')}
                          disabled={maintenanceLoading}
                          className="btn btn-warning maintenance-btn"
                        >
                          🔧 Auto-Fix Issues
                        </button>
                        <button 
                          onClick={() => handleRunMaintenanceFunction('cleanupOrphanedRecords', 'Cleanup Orphaned Records')}
                          disabled={maintenanceLoading}
                          className="btn btn-secondary maintenance-btn"
                        >
                          🧹 Cleanup Orphaned Records
                        </button>
                        <button 
                          onClick={() => handleRunMaintenanceFunction('inspectDatabaseSchema', 'Inspect Database Schema')}
                          disabled={maintenanceLoading}
                          className="btn btn-secondary maintenance-btn"
                        >
                          🔍 Inspect Database Schema
                        </button>
                        <button 
                          onClick={() => handleRunMaintenanceFunction('performSystemVerification', 'Verify System Integrity')}
                          disabled={maintenanceLoading}
                          className="btn btn-secondary maintenance-btn"
                        >
                          ✅ Verify System Integrity
                        </button>
                        <button 
                          onClick={() => handleRunMaintenanceFunction('deepCleanup', 'Deep System Cleanup')}
                          disabled={maintenanceLoading}
                          className="btn btn-danger maintenance-btn"
                        >
                          🧽 Deep System Cleanup
                        </button>
                      </div>
                      
                      {healthData.maintenanceResults && (
                        <div className="maintenance-results">
                          <h5>🔧 Latest Maintenance Results</h5>
                          <div className="maintenance-summary">
                            <div className="result-item">
                              <span>Issues Found:</span>
                              <span className="result-value">{healthData.maintenanceResults.issuesFound || 0}</span>
                            </div>
                            <div className="result-item">
                              <span>Issues Resolved:</span>
                              <span className="result-value success">{healthData.maintenanceResults.issuesResolved || 0}</span>
                            </div>
                            <div className="result-item">
                              <span>Health Check:</span>
                              <span className={`result-value ${healthData.maintenanceResults.healthCheckPassed ? 'success' : 'failed'}`}>
                                {healthData.maintenanceResults.healthCheckPassed ? 'Passed' : 'Failed'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Users Management Section */}
              <div className="admin-subsection">
                <div className="subsection-header" onClick={() => toggleSection('userManagement')}>
                  <h4>👥 User Management</h4>
                  <span className="toggle-icon">{collapsedSections.userManagement ? '▶' : '▼'}</span>
                </div>
                {!collapsedSections.userManagement && (
                  <div className="subsection-content">
                    <button 
                      onClick={handleLoadUsers}
                      disabled={adminLoading}
                      className="btn btn-secondary"
                    >
                      {adminLoading ? 'Loading...' : 'Refresh Users'}
                    </button>
                    
                    {adminData.users.length > 0 && (
                      <div className="users-list">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Username</th>
                              <th>Name</th>
                              <th>Role</th>
                              <th>System Password</th>
                              <th>Last Login</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {adminData.users.map(userItem => (
                              <tr key={userItem.id}>
                                <td>{userItem.username}</td>
                                <td>{userItem.name}</td>
                                <td className={`role-badge ${userItem.role}`}>{userItem.role}</td>
                                <td className="system-password-cell">
                                  {userItem.system_password ? (
                                    <div className="password-display">
                                      <code className="system-password">{userItem.system_password}</code>
                                      <span className="password-note">📋 Copy to share</span>
                                    </div>
                                  ) : (
                                    <span className="password-changed">🔒 User changed</span>
                                  )}
                                </td>
                                <td>{userItem.last_login ? new Date(userItem.last_login).toLocaleDateString() : 'Never'}</td>
                                <td>
                                  <span className={`status-badge ${userItem.is_locked ? 'locked' : 'active'}`}>
                                    {userItem.is_locked ? 'Locked' : 'Active'}
                                  </span>
                                </td>
                                <td>
                                  <button 
                                    onClick={() => handleResetPassword(userItem.id)}
                                    disabled={adminLoading || userItem.id === user.id}
                                    className="btn btn-sm btn-danger"
                                    title="Reset Password"
                                  >
                                    🔄
                                  </button>
                                  <button 
                                    onClick={() => handleLoadSecurityLogs(userItem.id)}
                                    disabled={adminLoading}
                                    className="btn btn-sm btn-info"
                                    title="View Security Logs"
                                  >
                                    📊
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Security Logs Section */}
              <div className="admin-subsection">
                <div className="subsection-header" onClick={() => toggleSection('securityLogs')}>
                  <h4>📊 Security Logs</h4>
                  <span className="toggle-icon">{collapsedSections.securityLogs ? '▶' : '▼'}</span>
                </div>
                {!collapsedSections.securityLogs && (
                  <div className="subsection-content">
                    <div className="log-controls">
                      <button 
                        onClick={() => handleLoadSecurityLogs()}
                        disabled={adminLoading}
                        className="btn btn-secondary"
                      >
                        {adminLoading ? 'Loading...' : 'View All Logs'}
                      </button>
                    </div>
                    
                    {adminData.securityLogs.length > 0 && (
                      <div className="logs-container">
                        <h5>Security Logs {adminData.viewLogsUserId !== 'all' ? `for User ID: ${adminData.viewLogsUserId}` : '(All Users)'}</h5>
                        <div className="logs-list">
                          {adminData.securityLogs.slice(0, 20).map(log => (
                            <div key={log.id} className={`log-entry ${log.success ? 'success' : 'failed'}`}>
                              <div className="log-header">
                                <span className="log-type">{log.event_type}</span>
                                <span className="log-time">{new Date(log.created_at).toLocaleString()}</span>
                                <span className={`log-status ${log.success ? 'success' : 'failed'}`}>
                                  {log.success ? '✅' : '❌'}
                                </span>
                              </div>
                              <div className="log-details">
                                User ID: {log.user_id} | IP: {log.ip_address || 'N/A'}
                                {log.details && <div className="log-extra">Details: {log.details}</div>}
                              </div>
                            </div>
                          ))}
                          {adminData.securityLogs.length > 20 && (
                            <div className="log-more">... and {adminData.securityLogs.length - 20} more entries</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Logs Modal */}
        {logsModal.isOpen && (
          <div className="modal-overlay logs-modal-overlay" onClick={() => !logsModal.isRunning && setLogsModal(prev => ({ ...prev, isOpen: false }))}>
            <div className="modal-content logs-modal-content" onClick={e => e.stopPropagation()}>
              <div className="logs-modal-header">
                <h3>
                  {logsModal.isRunning ? '🔄' : '✅'} {logsModal.title}
                </h3>
                {!logsModal.isRunning && (
                  <button 
                    className="modal-close-btn"
                    onClick={() => setLogsModal(prev => ({ ...prev, isOpen: false }))}
                  >
                    ✕
                  </button>
                )}
              </div>
              
              <div className="logs-modal-body">
                <div className="logs-container">
                  <div className="logs-output">
                    {logsModal.logs.map((log, index) => (
                      <div key={index} className="log-line">
                        {log}
                      </div>
                    ))}
                    {logsModal.isRunning && (
                      <div className="log-line running">
                        <span className="loading-spinner">⏳</span> Operation in progress...
                      </div>
                    )}
                  </div>
                </div>
                
                {logsModal.isRunning && (
                  <div className="operation-status">
                    <div className="status-indicator">
                      <div className="status-spinner"></div>
                      <span>Running...</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="logs-modal-footer">
                {logsModal.isRunning ? (
                  <span className="operation-note">Please wait while the operation completes...</span>
                ) : (
                  <span className="operation-note">Operation completed. Modal will auto-close in 3 seconds.</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
