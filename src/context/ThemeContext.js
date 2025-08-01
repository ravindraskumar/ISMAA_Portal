// =====================================================
// ISMAA Bengaluru Portal - Theme Context Provider
// =====================================================
//
// React context provider for managing application-wide theme state
// including dark/light mode preferences with persistent storage.
//
// Features:
// - Dark/light theme toggle with visual feedback
// - Persistent theme preference storage in localStorage
// - Global theme state management across all components
// - Automatic theme restoration on application reload
// - CSS custom property integration for consistent styling
//
// Theme Management:
// - Default: Dark mode for better user experience
// - Storage: localStorage persistence across browser sessions
// - Scope: Application-wide theme state management
// - Integration: CSS custom properties for dynamic styling
//
// Usage:
//   const { isDarkMode, toggleTheme } = useTheme();
//   <button onClick={toggleTheme}>Toggle Theme</button>
//
// Dependencies: React Context API, localStorage
// Author: ISMAA Portal Team
// =====================================================

import React, { createContext, useContext, useState, useEffect } from 'react';

// Create theme context for global state management
const ThemeContext = createContext();

/**
 * Custom hook to access theme context
 * Provides theme state and toggle functionality
 * Throws error if used outside ThemeProvider
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

/**
 * Theme provider component managing application-wide theme state
 * Handles theme persistence and CSS custom property updates
 */
export const ThemeProvider = ({ children }) => {
  // Default to dark mode for better user experience
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    // Load theme preference from localStorage on component mount
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    }
  }, []);

  useEffect(() => {
    // Save theme preference to localStorage and apply to document
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const value = {
    isDarkMode,
    toggleTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
