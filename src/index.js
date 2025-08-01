// =====================================================
// ISMAA Bengaluru Portal - Application Entry Point
// =====================================================
//
// Main React application entry point that initializes and renders the
// complete ISMAA member management portal. This file serves as the
// bootstrap for the entire React application tree.
//
// Key Functions:
// - Creates React 18 root for optimal performance and features
// - Enables React.StrictMode for development debugging and warnings
// - Renders the main App component with all context providers
// - Integrates with DOM element 'root' from public/index.html
//
// React Features Used:
// - React 18 createRoot API for concurrent features
// - StrictMode for enhanced development experience
// - Component tree initialization with proper error boundaries
//
// Dependencies: React 18+, ReactDOM, App component, index.css
// Author: ISMAA Portal Team
// =====================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Create React 18 root for enhanced performance and concurrent features
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render the complete application with React.StrictMode for development benefits
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
