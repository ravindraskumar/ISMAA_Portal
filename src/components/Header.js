// =====================================================
// ISMAA Bengaluru Portal - Header Navigation Component
// =====================================================
//
// Main header component providing site navigation, user authentication status,
// and theme controls. This component appears on all pages and provides:
//
// Features:
// - Responsive navigation menu with active link highlighting
// - User authentication display with login/logout functionality
// - Dark/light theme toggle with visual feedback
// - User profile access through dropdown interface
// - ISMAA branding and portal identification
//
// Navigation Structure:
// - Home: Main landing page with member statistics
// - Members: Complete member directory with search/filter
// - Blogs & Notices: Content management for announcements
// - Add Member: Administrative function for member registration
//
// Authentication Integration:
// - Shows user name and role when logged in
// - Provides logout functionality
// - Redirects to login page when authentication required
//
// Theme Support:
// - Light/dark mode toggle with persistent storage
// - Consistent styling across all portal pages
// - User preference preservation across sessions
//
// Dependencies: AuthContext, ThemeContext, React Router, UserProfile
// Author: ISMAA Portal Team
// =====================================================

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import UserProfile from './UserProfile';

/**
 * Header component providing main site navigation and user controls
 * Includes authentication status, theme toggle, and user profile access
 */
const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [showUserProfile, setShowUserProfile] = useState(false);

  /**
   * Handle user logout with proper cleanup and redirection
   * Redirects to login page after clearing authentication
   */
  const handleLogout = () => {
    console.log('🚪 Header logout button clicked');
    logout();
    console.log('📍 Navigating to /login...');
    navigate('/login', { replace: true });
    console.log('✅ Navigation completed');
  };

  /**
   * Toggle user profile modal display
   * Shows user details and additional account options
   */
  const handleUserClick = () => {
    setShowUserProfile(true);
  };

  return (
    <>
      <header className="header">
        <div className="header-content">
          <h1>🎓 ISMAA Bengaluru</h1>
          <nav className="navigation">
            <Link 
              to="/" 
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
            >
              🏠 Home
            </Link>
            <Link 
              to="/members" 
              className={`nav-link ${location.pathname === '/members' ? 'active' : ''}`}
            >
              👥 Members
            </Link>
            <Link 
              to="/blogs" 
              className={`nav-link ${location.pathname === '/blogs' ? 'active' : ''}`}
            >
              📝 Blogs & Notices
            </Link>
          </nav>
          <div className="user-menu">
            <button 
              onClick={toggleTheme} 
              className="theme-toggle"
              title={`Switch to ${isDarkMode ? 'light' : 'dark'} theme`}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            <button 
              className="clickable-user" 
              onClick={handleUserClick}
              title="Click to view profile"
            >
              👋 Hello, {user?.name}
            </button>
            <button onClick={handleLogout} className="logout-btn">
              🚪 Logout
            </button>
          </div>
        </div>
      </header>
      
      {showUserProfile && (
        <UserProfile onClose={() => setShowUserProfile(false)} />
      )}
    </>
  );
};

export default Header;
