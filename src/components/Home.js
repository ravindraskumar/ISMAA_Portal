// =====================================================
// ISMAA Bengaluru Portal - Home Dashboard Component
// =====================================================
//
// Main dashboard component providing an overview of the ISMAA portal system.
// Serves as the landing page after successful authentication, displaying:
//
// Key Features:
// - Real-time statistics for members, blogs, and notices
// - Recent activity feed showing latest portal updates
// - Quick navigation links to major portal sections
// - Personalized welcome message with user information
// - Responsive design for desktop and mobile viewing
//
// Dashboard Statistics:
// - Total Members: Complete count of registered ISMAA members
// - Total Blogs: Count of published educational and informational posts
// - Total Notices: Count of announcements and important updates
// - Recent Activity: Timeline of latest system activities
//
// User Experience:
// - Loading states with appropriate feedback
// - Error handling for failed data fetches
// - Responsive grid layout for optimal viewing
// - Quick access buttons to primary functions
//
// Data Sources:
// - REST API endpoints for real-time data
// - Parallel data fetching for optimal performance
// - Error boundaries for graceful failure handling
//
// Dependencies: AuthContext, React Router, Portal API
// Author: ISMAA Portal Team
// =====================================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Home dashboard component displaying portal overview and statistics
 * Provides quick access to major portal functions and real-time data
 */
const Home = () => {
  const { user } = useAuth();
  
  // Dashboard statistics state
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalBlogs: 0,
    totalNotices: 0,
    recentActivity: []
  });
  
  const [loading, setLoading] = useState(true);

  // Fetch dashboard data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  /**
   * Fetch comprehensive dashboard data from multiple API endpoints
   * Uses parallel requests for optimal performance
   */
  const fetchDashboardData = async () => {
    try {
      // Parallel API calls for efficient data loading
      const [membersRes, blogsRes, noticesRes] = await Promise.all([
        fetch('http://localhost:3001/members'),
        fetch('http://localhost:3001/blogs'),
        fetch('http://localhost:3001/notices')
      ]);

      // Validate all responses before processing
      if (membersRes.ok && blogsRes.ok && noticesRes.ok) {
        const members = await membersRes.json();
        const blogs = await blogsRes.json();
        const notices = await noticesRes.json();

        // Create recent activity feed
        const recentBlogs = blogs.slice(0, 3).map(blog => ({
          type: 'blog',
          title: blog.title,
          date: blog.date,
          author: blog.author
        }));

        const recentNotices = notices.slice(0, 3).map(notice => ({
          type: 'notice',
          title: notice.title,
          date: notice.date,
          priority: notice.priority
        }));

        const allActivity = [...recentBlogs, ...recentNotices]
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 5);

        setStats({
          totalMembers: members.length,
          totalBlogs: blogs.length,
          totalNotices: notices.length,
          recentActivity: allActivity
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
          <h3>Loading dashboard...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      {/* Welcome Header */}
      <div className="welcome-header">
        <h1>🏠 Welcome to ISMAA Bengaluru Portal</h1>
        <p>Hello, {user?.name}! Here's what's happening in your organization.</p>
      </div>

      {/* Statistics Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{stats.totalMembers}</div>
          <div className="stat-label">👥 Total Members</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.totalBlogs}</div>
          <div className="stat-label">📝 Published Blogs</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.totalNotices}</div>
          <div className="stat-label">📢 Active Notices</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.recentActivity.length}</div>
          <div className="stat-label">🕒 Recent Activities</div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="recent-activity-section">
        <h2 className="section-title">🕒 Recent Activity</h2>
        
        {stats.recentActivity.length > 0 ? (
          <div className="activity-list">
            {stats.recentActivity.map((activity, index) => (
              <div key={index} className="activity-item">
                <div className="activity-icon">
                  {activity.type === 'blog' ? '📝' : '📢'}
                </div>
                <div className="activity-content">
                  <h4 className="activity-title">{activity.title}</h4>
                  <div className="activity-meta">
                    {activity.type === 'blog' ? (
                      <span className="activity-author">By {activity.author}</span>
                    ) : (
                      <span className={`activity-priority priority-${activity.priority}`}>
                        {activity.priority} priority
                      </span>
                    )}
                    <span className="activity-date">{formatDate(activity.date)}</span>
                  </div>
                </div>
                <div className="activity-type">
                  <span className={`type-badge ${activity.type}`}>
                    {activity.type === 'blog' ? 'Blog' : 'Notice'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No recent activity</h3>
            <p>Start by creating some blogs or notices to see activity here.</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h2 className="section-title">⚡ Quick Actions</h2>
        <div className="quick-actions-grid">
          <Link to="/members" className="quick-action-card">
            <div className="quick-action-icon">👥</div>
            <h3>Manage Members</h3>
            <p>View, add, or edit member profiles</p>
          </Link>
          <Link to="/blogs" className="quick-action-card">
            <div className="quick-action-icon">📝</div>
            <h3>Create Content</h3>
            <p>Write blogs or post notices</p>
          </Link>
          <div className="quick-action-card disabled">
            <div className="quick-action-icon">📊</div>
            <h3>View Reports</h3>
            <p>Analytics and insights (Coming soon)</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
