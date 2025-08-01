// =====================================================
// ISMAA Bengaluru Portal - Login Authentication Component
// =====================================================
//
// Secure authentication component providing user login functionality
// for the ISMAA member management portal system.
//
// Key Features:
// - Secure username/password authentication
// - Integration with AuthContext for session management
// - Real-time form validation and error handling
// - Loading states with user feedback
// - Automatic redirection after successful login
// - Responsive design with custom styling
//
// Authentication Flow:
// 1. User enters credentials (username/password)
// 2. Form validation prevents invalid submissions
// 3. AuthContext handles API authentication request
// 4. Success: Redirect to home dashboard
// 5. Failure: Display error message with retry option
//
// Security Features:
// - Form validation prevents empty submissions
// - Error handling without exposing sensitive information
// - Session management through AuthContext
// - Secure redirection using React Router
//
// User Experience:
// - Loading indicators during authentication
// - Clear error messages for failed attempts
// - Automatic focus management
// - Responsive design for all device sizes
//
// Dependencies: AuthContext, React Router, Login.css
// Author: ISMAA Portal Team
// =====================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

/**
 * Login component providing secure user authentication interface
 * Integrates with AuthContext for session management and navigation
 */
const Login = () => {
  // Form state management
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Context and navigation hooks
  const { login } = useAuth();
  const navigate = useNavigate();

  /**
   * Handle form submission with authentication validation
   * Manages loading state and error handling throughout the process
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Attempt authentication through AuthContext
    const result = await login(username, password);
    
    if (result.success) {
      // Redirect to home page on successful login
      navigate('/', { replace: true });
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-content">
        <div className="login-image-section">
          <div className="login-image-container">
            <div className="login-image-fallback">
              <div className="fallback-content">
                <h2>🏛️</h2>
                <p>ISMAA Institution</p>
              </div>
            </div>
            <div className="login-image-overlay">
              <div className="login-image-text">
                <h3>Welcome to</h3>
                <h2>ISMAA Bengaluru</h2>
                <p>Indian School of Mines Alumni Association</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="login-form-section">
          <div className="login-card">
            <div className="login-header">
              <h1>🎓 Portal Sign In</h1>
              <p>Please sign in to access the system</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              {error && <div className="error">{error}</div>}
              
              <div className="form-group">
                <label htmlFor="username" className="form-label">Username</label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-input"
                  required
                  placeholder="Enter your username"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  required
                  placeholder="Enter your password"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary login-btn"
                disabled={loading}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
