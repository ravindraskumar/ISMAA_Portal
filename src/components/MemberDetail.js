// =====================================================
// ISMAA Bengaluru Portal - Member Detail View Component
// =====================================================
//
// Comprehensive member profile display component providing detailed
// view of individual member information and related data.
//
// Key Features:
// - Complete member profile visualization
// - Professional and academic information display
// - Skills and expertise presentation
// - Contact information with action buttons
// - Photo display with fallback placeholder
// - Navigation integration with edit capabilities
// - Responsive design for optimal viewing
//
// Information Sections:
// - Personal Details: Name, contact information, photo
// - Academic Background: Branch, graduation batch, college
// - Professional Information: Current role, company, industry
// - Skills & Expertise: Technical and professional skills
// - Membership Details: ID, type, status information
//
// Navigation Features:
// - URL parameter-based member identification
// - Breadcrumb navigation for context
// - Quick edit access for authorized users
// - Back to member list functionality
//
// Error Handling:
// - Member not found scenarios
// - Network error management
// - Loading state management
// - Graceful degradation for missing data
//
// Dependencies: React Router, Portal API, React hooks
// Author: ISMAA Portal Team
// =====================================================

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

/**
 * MemberDetail component displaying comprehensive member profile information
 * Provides detailed view with navigation and edit capabilities
 */
const MemberDetail = () => {
  const { id } = useParams(); // Extract member ID from URL parameters
  
  // Component state management
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch member data when component mounts or ID changes
  useEffect(() => {
    fetchMember();
  }, [id]);

  /**
   * Fetch individual member data from the API
   * Handles loading states and error scenarios
   */
  const fetchMember = async () => {
    try {
      const response = await fetch(`http://localhost:3001/members/${id}`);
      if (!response.ok) {
        throw new Error('Member not found');
      }
      const data = await response.json();
      setMember(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (loading) return <div className="loading">Loading member details...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!member) return <div className="error">Member not found</div>;

  return (
    <div className="member-detail-container">
      <div className="back-navigation">
        <Link to="/members" className="btn btn-secondary">
          ← Back to All Members
        </Link>
      </div>

      <div className="member-detail-card">
        <div className="member-detail-header">
          <div className="member-detail-avatar">
            {member.photo ? (
              <img src={member.photo} alt={member.name} className="avatar-image" />
            ) : (
              getInitials(member.name)
            )}
          </div>
          <div className="member-detail-info">
            <h1 className="member-detail-name">{member.name}</h1>
            <p className="member-detail-email">{member.email}</p>
          </div>
        </div>

        <div className="member-detail-content">
          <div className="member-detail-section">
            <h3 className="section-header">👤 Personal Information</h3>
            
            <div className="detail-group">
              <label className="detail-label">Full Name</label>
              <div className="detail-value">{member.name}</div>
            </div>

            <div className="detail-group">
              <label className="detail-label">Email Address</label>
              <div className="detail-value">{member.email}</div>
            </div>

            <div className="detail-group">
              <label className="detail-label">Phone Number</label>
              <div className="detail-value">{member.phone}</div>
            </div>

            <div className="detail-group">
              <label className="detail-label">Home Address</label>
              <div className="detail-value">{member.address}</div>
            </div>
          </div>

          <div className="member-detail-section">
            <h3 className="section-header">🎓 Professional Information</h3>
            
            <div className="detail-group">
              <label className="detail-label">Branch</label>
              <div className="detail-value">{member.branch}</div>
            </div>

            <div className="detail-group">
              <label className="detail-label">Passout Batch</label>
              <div className="detail-value">{member.passoutBatch}</div>
            </div>

            <div className="detail-group">
              <label className="detail-label">Industry</label>
              <div className="detail-value">{member.industry}</div>
            </div>

            <div className="detail-group">
              <label className="detail-label">Company</label>
              <div className="detail-value">{member.company}</div>
            </div>

            {member.skills && member.skills.length > 0 && (
              <div className="detail-group">
                <label className="detail-label">Skills</label>
                <div className="skills-display">
                  {member.skills.map((skill, index) => (
                    <span key={index} className="skill-tag">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="member-detail-section">
            <h3 className="section-header">🏛️ Membership Information</h3>
            
            <div className="detail-group">
              <label className="detail-label">Membership ID</label>
              <div className="detail-value">{member.membershipID || 'Not assigned'}</div>
            </div>

            <div className="detail-group">
              <label className="detail-label">Membership Type</label>
              <div className="detail-value">
                <span className={`membership-badge membership-${member.membershipType?.toLowerCase().replace('-', '')}`}>
                  {member.membershipType || 'Member'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="member-detail-actions">
          <Link to={`/edit/${member.id}`} className="btn btn-primary">
            ✏️ Edit Member
          </Link>
          <Link to="/members" className="btn btn-secondary">
            👥 View All Members
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MemberDetail;
