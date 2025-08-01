/**
 * App.js - Main Application Component for ISMAA Bengaluru Portal
 * 
 * This is the root component that sets up:
 * - React Router for client-side routing
 * - Authentication context for login/logout state
 * - Theme context for UI theming
 * - Protected routes that require authentication
 * - Global layout structure
 * 
 * Key Features:
 * - Route protection with authentication checks
 * - Conditional header rendering based on auth state
 * - Loading states during authentication verification
 * - Automatic redirect to login for unauthenticated users
 * 
 * Dependencies: react-router-dom, AuthContext, ThemeContext
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Header from './components/Header';
import Home from './components/Home';
import MemberList from './components/MemberList';
import MemberDetail from './components/MemberDetail';
import EditMember from './components/EditMember';
import BlogsNotices from './components/BlogsNotices';
import Login from './components/Login';
import './App.css';

// Higher-order component to protect routes from unauthenticated access
// Checks authentication state and redirects to login if needed
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  // Show loading spinner while checking authentication status
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  // Render protected content or redirect to login
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Main app content with routing logic
// Conditionally renders header based on authentication state
const AppContent = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="App">
      {/* Only show header/navigation when user is logged in */}
      {isAuthenticated && <Header />}
      <main className="container">
        <Routes>
          {/* Public route - Login page */}
          {/* Redirects to home if already authenticated */}
          <Route path="/login" element={
            isAuthenticated ? <Navigate to="/" replace /> : <Login />
          } />
          
          {/* Protected routes - Require authentication */}
          {/* Dashboard/Home page with overview statistics */}
          <Route path="/" element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } />
          
          {/* Member list page with search and filtering */}
          <Route path="/members" element={
            <ProtectedRoute>
              <MemberList />
            </ProtectedRoute>
          } />
          
          {/* Individual member detail view */}
          <Route path="/member/:id" element={
            <ProtectedRoute>
              <MemberDetail />
            </ProtectedRoute>
          } />
          
          {/* Member editing form */}
          <Route path="/edit/:id" element={
            <ProtectedRoute>
              <EditMember />
            </ProtectedRoute>
          } />
          
          {/* Blog and notices management page */}
          <Route path="/blogs" element={
            <ProtectedRoute>
              <BlogsNotices />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
    </div>
  );
};

// Root App component with context providers
// Wraps the entire app with necessary providers for global state
function App() {
  return (
    <ThemeProvider> {/* Provides theme context for UI styling */}
      <AuthProvider> {/* Provides authentication context for login state */}
        <Router> {/* Provides routing context for navigation */}
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
