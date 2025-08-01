// =====================================================
// ISMAA Bengaluru Portal - Enhanced Authentication Context
// =====================================================
//
// Advanced authentication context provider managing secure user sessions,
// settings persistence, and comprehensive security features.
//
// Features:
// - Secure API-based authentication with bcrypt password hashing
// - First-time login password change enforcement
// - User settings and theme preferences persistence
// - Session management with security logging
// - Password change and username change capabilities
// - Privacy controls and profile visibility settings
//
// Security Features:
// - Account lockout protection against brute force attacks
// - Failed login attempt tracking and logging
// - Secure session storage with user preferences
// - Role-based access control (admin/member)
//
// User Management:
// - Profile information management
// - Settings synchronization across sessions
// - Admin capabilities for user management
// - Privacy controls for profile visibility
//
// Usage:
//   const { user, login, logout, changePassword, updateSettings } = useAuth();
//
// Dependencies: React Context API, Portal Authentication API
// Author: ISMAA Portal Team
// =====================================================

import React, { createContext, useContext, useState, useEffect } from 'react';

// Create authentication context for global state management
const AuthContext = createContext();

/**
 * Custom hook to access authentication context
 * Provides type safety and ensures context is used within provider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Enhanced Authentication Provider Component
 * Manages secure authentication state with comprehensive user management
 */
export const AuthProvider = ({ children }) => {
  // Authentication state
  const [user, setUser] = useState(null); // Current authenticated user with settings
  const [loading, setLoading] = useState(true); // Loading state during auth operations
  const [sessionInfo, setSessionInfo] = useState(null); // Session metadata

  // Check for existing authentication on app initialization
  useEffect(() => {
    restoreUserSession();
  }, []);

  /**
   * Restore user session from localStorage with validation
   * Includes user settings and preferences restoration
   */
  const restoreUserSession = async () => {
    try {
      const savedUser = localStorage.getItem('ismaa_user');
      const savedSession = localStorage.getItem('ismaa_session');
      
      if (savedUser && savedSession) {
        const userData = JSON.parse(savedUser);
        const sessionData = JSON.parse(savedSession);
        
        // Validate session hasn't expired (24 hours)
        const sessionExpiry = new Date(sessionData.expiresAt);
        if (sessionExpiry > new Date()) {
          setUser(userData);
          setSessionInfo(sessionData);
        } else {
          // Session expired, clear storage
          clearUserSession();
        }
      }
    } catch (error) {
      console.error('Error restoring user session:', error);
      clearUserSession();
    } finally {
      setLoading(false);
    }
  };

  /**
   * Enhanced login function with comprehensive security features
   * Handles first-time login detection and settings synchronization
   */
  const login = async (username, password) => {
    try {
      setLoading(true);

      // Call enhanced authentication API
      const response = await fetch('http://localhost:3001/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (result.success) {
        // Store user data with settings
        const userData = {
          ...result.user,
          lastLogin: new Date().toISOString()
        };

        // Create session information
        const sessionData = {
          loginTime: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          sessionId: generateSessionId()
        };

        // Persist authentication state
        setUser(userData);
        setSessionInfo(sessionData);
        localStorage.setItem('ismaa_user', JSON.stringify(userData));
        localStorage.setItem('ismaa_session', JSON.stringify(sessionData));

        // Apply user theme preference immediately
        if (userData.settings?.theme) {
          document.documentElement.setAttribute('data-theme', userData.settings.theme);
        }

        return { 
          success: true, 
          user: userData,
          firstLogin: userData.firstLogin 
        };
      } else {
        return result; // Return error from API
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: 'Login failed. Please check your connection and try again.' 
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Secure logout with session cleanup
   * Clears all stored authentication data
   */
  const logout = () => {
    console.log('🚪 Logout called - clearing session...');
    console.log('Before logout - user:', user);
    console.log('Before logout - sessionInfo:', sessionInfo);
    
    clearUserSession();
    setUser(null);
    setSessionInfo(null);
    
    console.log('After logout - user should be null');
    
    // Reset theme to default on logout
    document.documentElement.setAttribute('data-theme', 'dark');
    
    console.log('✅ Logout completed');
  };

  /**
   * Change password with validation and security logging
   */
  const changePassword = async (currentPassword, newPassword) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('http://localhost:3001/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          currentPassword,
          newPassword
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update user state to reflect password change
        const updatedUser = {
          ...user,
          firstLogin: false // No longer first login after password change
        };
        
        setUser(updatedUser);
        localStorage.setItem('ismaa_user', JSON.stringify(updatedUser));
      }

      return result;
    } catch (error) {
      console.error('Password change error:', error);
      return { 
        success: false, 
        error: 'Password change failed. Please try again.' 
      };
    }
  };

  /**
   * Change username (one-time only)
   */
  const changeUsername = async (newUsername) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('http://localhost:3001/auth/change-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          newUsername
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update user state with new username
        const updatedUser = {
          ...user,
          username: newUsername,
          usernameChanged: true
        };
        
        setUser(updatedUser);
        localStorage.setItem('ismaa_user', JSON.stringify(updatedUser));
      }

      return result;
    } catch (error) {
      console.error('Username change error:', error);
      return { 
        success: false, 
        error: 'Username change failed. Please try again.' 
      };
    }
  };

  /**
   * Update user settings and preferences
   */
  const updateSettings = async (newSettings) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`http://localhost:3001/auth/settings/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });

      const result = await response.json();

      if (result.success) {
        // Update user state with new settings
        const updatedUser = {
          ...user,
          settings: {
            ...user.settings,
            ...newSettings
          }
        };
        
        setUser(updatedUser);
        localStorage.setItem('ismaa_user', JSON.stringify(updatedUser));

        // Apply theme change immediately if updated
        if (newSettings.theme) {
          document.documentElement.setAttribute('data-theme', newSettings.theme);
        }
      }

      return result;
    } catch (error) {
      console.error('Settings update error:', error);
      return { 
        success: false, 
        error: 'Settings update failed. Please try again.' 
      };
    }
  };

  /**
   * Update user profile information
   */
  const updateProfile = async (profileData) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`http://localhost:3001/auth/profile/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      const result = await response.json();

      if (result.success) {
        // Update user state with new profile data
        const updatedUser = {
          ...user,
          ...profileData
        };
        
        setUser(updatedUser);
        localStorage.setItem('ismaa_user', JSON.stringify(updatedUser));
      }

      return result;
    } catch (error) {
      console.error('Profile update error:', error);
      return { 
        success: false, 
        error: 'Profile update failed. Please try again.' 
      };
    }
  };

  /**
   * Check if username is available
   */
  const checkUsernameAvailability = async (username) => {
    try {
      const excludeUserId = user ? user.id : null;
      const queryParam = excludeUserId ? `?excludeUserId=${excludeUserId}` : '';
      
      const response = await fetch(`http://localhost:3001/auth/check-username/${username}${queryParam}`);
      const result = await response.json();
      
      return result.available;
    } catch (error) {
      console.error('Username availability check error:', error);
      return false;
    }
  };

  /**
   * Check if email is available
   */
  const checkEmailAvailability = async (email) => {
    try {
      const excludeUserId = user ? user.id : null;
      const queryParam = excludeUserId ? `?excludeUserId=${excludeUserId}` : '';
      
      const response = await fetch(`http://localhost:3001/auth/check-email/${email}${queryParam}`);
      const result = await response.json();
      
      return result.available;
    } catch (error) {
      console.error('Email availability check error:', error);
      return false;
    }
  };

  /**
   * Admin function to reset user password
   */
  const adminResetPassword = async (targetUserId, newPassword = null) => {
    try {
      if (!user || user.role !== 'admin') {
        throw new Error('Admin privileges required');
      }

      const response = await fetch('http://localhost:3001/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminId: user.id,
          targetUserId,
          newPassword
        }),
      });

      return await response.json();
    } catch (error) {
      console.error('Admin password reset error:', error);
      return { 
        success: false, 
        error: 'Password reset failed. Please try again.' 
      };
    }
  };

  /**
   * Admin function to get all users
   */
  const getAllUsers = async () => {
    try {
      if (!user || user.role !== 'admin') {
        throw new Error('Admin privileges required');
      }

      const response = await fetch(`http://localhost:3001/admin/users/${user.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const users = await response.json();
      return { success: true, users };
    } catch (error) {
      console.error('Get all users error:', error);
      return { 
        success: false, 
        error: 'Failed to retrieve users. Please try again.' 
      };
    }
  };

  /**
   * Admin function to get security logs
   */
  const getSecurityLogs = async (targetUserId = null, limit = 50) => {
    try {
      if (!user || user.role !== 'admin') {
        throw new Error('Admin privileges required');
      }

      let url = `http://localhost:3001/admin/security-log/${user.id}`;
      const params = new URLSearchParams();
      if (targetUserId) params.append('targetUserId', targetUserId);
      if (limit) params.append('limit', limit);
      if (params.toString()) url += '?' + params.toString();

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const logs = await response.json();
      return { success: true, logs };
    } catch (error) {
      console.error('Get security logs error:', error);
      return { 
        success: false, 
        error: 'Failed to retrieve security logs. Please try again.' 
      };
    }
  };

  /**
   * Clear user session data from localStorage
   */
  const clearUserSession = () => {
    localStorage.removeItem('ismaa_user');
    localStorage.removeItem('ismaa_session');
  };

  /**
   * Generate unique session ID for tracking
   */
  const generateSessionId = () => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };

  /**
   * Check if user is authenticated - computed property
   */
  const isAuthenticated = user !== null && sessionInfo !== null;

  /**
   * Check if user is admin
   */
  const isAdmin = () => {
    return user?.role === 'admin';
  };

  /**
   * Check if this is user's first login
   */
  const isFirstLogin = () => {
    return user?.firstLogin === true;
  };

  // Context value with all authentication functions and state
  const value = {
    // State
    user,
    loading,
    sessionInfo,
    
    // Authentication functions
    login,
    logout,
    
    // User management functions
    changePassword,
    changeUsername,
    updateSettings,
    updateProfile,
    
    // Utility functions
    checkUsernameAvailability,
    checkEmailAvailability,
    
    // Admin functions
    adminResetPassword,
    getAllUsers,
    getSecurityLogs,
    
    // Status checks
    isAuthenticated,
    isAdmin,
    isFirstLogin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
