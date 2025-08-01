/**
 * MemberList.js - Member Management Dashboard Component
 * 
 * This component provides comprehensive member management functionality:
 * - Member listing with search and filtering capabilities
 * - Advanced filters: name, batch, branch, industry, membership type, skills
 * - Add new member modal integration
 * - Member deletion with admin privileges
 * - Responsive design with pagination and sorting
 * 
 * Key Features:
 * - Real-time search across multiple fields
 * - Multi-select skills filtering with dropdown UI
 * - Role-based access control (admin vs regular user)
 * - Optimistic UI updates for better UX
 * - Error handling and loading states
 * 
 * Dependencies: React Router (navigation), AuthContext (permissions), AddMember component
 * API Integration: Fetches from /members endpoint, supports DELETE operations
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AddMember from './AddMember';

const MemberList = () => {
  const { user } = useAuth(); // Get current user for permission checks
  
  // Core data state
  const [members, setMembers] = useState([]); // All members from API
  const [loading, setLoading] = useState(true); // Loading state for initial fetch
  const [error, setError] = useState(null); // Error state for API failures
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState(''); // General name/email search
  const [searchBatch, setSearchBatch] = useState(''); // Graduation batch filter
  const [searchBranch, setSearchBranch] = useState(''); // Engineering branch filter
  const [searchIndustry, setSearchIndustry] = useState(''); // Current industry filter
  const [searchMembershipType, setSearchMembershipType] = useState(''); // Membership type filter
  const [selectedSkills, setSelectedSkills] = useState([]); // Multi-select skills filter
  
  // UI state
  const [showSkillsDropdown, setShowSkillsDropdown] = useState(false); // Skills dropdown visibility
  const [showAddModal, setShowAddModal] = useState(false); // Add member modal visibility

  // Check if current user has admin privileges for delete operations
  const isAdmin = user?.role === 'admin';

  // Fetch members from API on component mount
  useEffect(() => {
    fetchMembers();
  }, []);

  // Handle clicking outside skills dropdown to close it
  // Prevents dropdown from staying open when user clicks elsewhere
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.skills-dropdown')) {
        setShowSkillsDropdown(false);
      }
    };

    if (showSkillsDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showSkillsDropdown]);

  const fetchMembers = async () => {
    try {
      const response = await fetch('http://localhost:3001/members');
      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }
      const data = await response.json();
      setMembers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Get all unique skills from all members
  const getAllSkills = () => {
    const allSkills = members.reduce((acc, member) => {
      if (member.skills && Array.isArray(member.skills)) {
        // Normalize each skill: trim whitespace and filter out empty skills
        const normalizedSkills = member.skills
          .map(skill => skill ? skill.toString().trim() : '')
          .filter(skill => skill.length > 0);
        acc.push(...normalizedSkills);
      }
      return acc;
    }, []);

    // Create a Map to handle case-insensitive deduplication while preserving original case
    const skillsMap = new Map();
    
    allSkills.forEach(skill => {
      const lowerKey = skill.toLowerCase();
      if (!skillsMap.has(lowerKey)) {
        skillsMap.set(lowerKey, skill);
      }
    });

    // Return unique skills sorted alphabetically (case-insensitive)
    return Array.from(skillsMap.values()).sort((a, b) => 
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  };

  // Handle skills selection
  const handleSkillToggle = (skill) => {
    setSelectedSkills(prev => {
      if (prev.includes(skill)) {
        return prev.filter(s => s !== skill);
      } else {
        return [...prev, skill];
      }
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setSearchBatch('');
    setSearchBranch('');
    setSearchIndustry('');
    setSearchMembershipType('');
    setSelectedSkills([]);
  };

  // Handle member deletion (admin only)
  const handleDeleteMember = async (memberId) => {
    if (!isAdmin) {
      alert('Only administrators can delete members.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this member? This will also delete their user account and clean up all associated data. This action cannot be undone.')) {
      return;
    }

    try {
      // Get the member being deleted to find their associated user
      const memberToDelete = members.find(m => m.id === memberId);
      if (!memberToDelete) {
        throw new Error('Member not found');
      }

      // First, try to find and delete the associated user account (cascading deletion)
      // This will also delete the member record as part of the cascade
      let deletionSuccessful = false;
      
      try {
        // Try to find the user associated with this member
        const usersResponse = await fetch('http://localhost:3001/users');
        if (usersResponse.ok) {
          const users = await usersResponse.json();
          const associatedUser = users.find(user => user.member_id === memberId);
          
          if (associatedUser) {
            // Delete the user (which will cascade to delete the member)
            const userDeleteResponse = await fetch(`http://localhost:3001/users/${associatedUser.id}`, {
              method: 'DELETE',
            });
            
            if (userDeleteResponse.ok) {
              deletionSuccessful = true;
              console.log(`Successfully deleted user ${associatedUser.username} and associated member`);
            }
          }
        }
      } catch (userDeleteError) {
        console.log('Could not delete via user cascade, trying member deletion:', userDeleteError.message);
      }

      // If user-based cascading deletion didn't work, fall back to member deletion
      if (!deletionSuccessful) {
        const response = await fetch(`http://localhost:3001/members/${memberId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete member');
        }
        deletionSuccessful = true;
      }

      if (deletionSuccessful) {
        // Remove member from local state
        const updatedMembers = members.filter(member => member.id !== memberId);
        setMembers(updatedMembers);

        // Force a complete refresh to ensure consistency
        setTimeout(() => {
          fetchMembers();
        }, 500);

        alert('Member and associated user account deleted successfully');
      }

    } catch (err) {
      setError('Failed to delete member: ' + err.message);
      console.error('Delete operation failed:', err);
    }
  };

  const filteredMembers = members.filter(member => {
    // Search only by name and email - handle null email safely
    const matchesSearch = searchTerm === '' || 
      (member.name && member.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Filter by batch - handle null passoutBatch safely
    const matchesBatch = searchBatch === '' || 
      (member.passoutBatch && member.passoutBatch.includes(searchBatch));
    
    // Filter by branch - handle null branch safely
    const matchesBranch = searchBranch === '' || 
      (member.branch && member.branch.toLowerCase().includes(searchBranch.toLowerCase()));
    
    // Filter by industry - handle null industry safely
    const matchesIndustry = searchIndustry === '' || 
      (member.industry && member.industry.toLowerCase().includes(searchIndustry.toLowerCase()));
    
    // Filter by skills (must match ALL selected skills) - handle null/empty skills safely
    const matchesSkills = selectedSkills.length === 0 || 
      selectedSkills.every(selectedSkill => 
        member.skills && Array.isArray(member.skills) && member.skills.some(skill => 
          skill && skill.toLowerCase().includes(selectedSkill.toLowerCase())
        )
      );
    
    // Filter by membership type - handle null membershipType safely
    const matchesMembershipType = searchMembershipType === '' || 
      (member.membershipType && member.membershipType.toLowerCase().includes(searchMembershipType.toLowerCase()));
    
    return matchesSearch && matchesBatch && matchesBranch && matchesIndustry && matchesSkills && matchesMembershipType;
  });

  const stats = {
    total: members.length,
    branches: new Set(members.map(s => s.branch).filter(branch => branch !== null && branch !== undefined)).size,
    industries: new Set(members.map(s => s.industry).filter(industry => industry !== null && industry !== undefined)).size,
    nonMembers: members.filter(s => s.membershipType === 'Non-Member').length
  };

  if (loading) return <div className="loading">Loading members...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div>
      <div className="members-page-header">
        <h1>👥 ISMAA Members</h1>
        <p>Manage and view all registered members in one place</p>
      </div>
      
      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-number">{stats.total}</span>
          <div className="stat-label">Total Members</div>
        </div>
        <div className="stat-card">
          <span className="stat-number">{stats.nonMembers}</span>
          <div className="stat-label">Non-Members</div>
        </div>
        <div className="stat-card">
          <span className="stat-number">{stats.branches}</span>
          <div className="stat-label">Branches</div>
        </div>
        <div className="stat-card">
          <span className="stat-number">{stats.industries}</span>
          <div className="stat-label">Industries</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="controls">
        <div className="search-filters-section">
          {/* Search Box and Add Member Button Row */}
          <div className="search-and-add-row">
            <div className="search-box">
              <input
                type="text"
                className="search-input"
                placeholder="🔍 Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Add Member Button - Only show for admin users */}
            {isAdmin && (
              <div className="add-member-section">
                <button 
                  className="btn btn-primary add-btn"
                  onClick={() => setShowAddModal(true)}
                >
                  ➕ Add Member
                </button>
              </div>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="filters-row">
            {/* Industry Filter */}
            <div className="filter-group">
              <label>Industry</label>
              <select
                value={searchIndustry}
                onChange={(e) => setSearchIndustry(e.target.value)}
                className="filter-select"
              >
                <option value="">All Industries</option>
                {[...new Set(members.map(m => m.industry).filter(industry => industry !== null && industry !== undefined))].sort().map(industry => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </div>

            {/* Batch Filter */}
            <div className="filter-group">
              <label>Batch</label>
              <select
                value={searchBatch}
                onChange={(e) => setSearchBatch(e.target.value)}
                className="filter-select"
              >
                <option value="">All Batches</option>
                {[...new Set(members.map(m => m.passoutBatch).filter(batch => batch !== null && batch !== undefined))].sort().map(batch => (
                  <option key={batch} value={batch}>{batch}</option>
                ))}
              </select>
            </div>

            {/* Branch Filter */}
            <div className="filter-group">
              <label>Branch</label>
              <select
                value={searchBranch}
                onChange={(e) => setSearchBranch(e.target.value)}
                className="filter-select"
              >
                <option value="">All Branches</option>
                {[...new Set(members.map(m => m.branch).filter(branch => branch !== null && branch !== undefined))].sort().map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </div>

            {/* Membership Type Filter */}
            <div className="filter-group">
              <label>Membership Type</label>
              <select
                value={searchMembershipType}
                onChange={(e) => setSearchMembershipType(e.target.value)}
                className="filter-select"
              >
                <option value="">All Types</option>
                <option value="President">President</option>
                <option value="Vice-President">Vice-President</option>
                <option value="Treasurer">Treasurer</option>
                <option value="Secretary">Secretary</option>
                <option value="Office-Bearer">Office-Bearer</option>
                <option value="Member">Member</option>
                <option value="Non-Member">Non-Member</option>
              </select>
            </div>

            {/* Skills Multi-Select */}
            <div className="filter-group skills-dropdown">
              <label>Skills</label>
              <div className="skills-select-container">
                <button
                  type="button"
                  className="skills-select-button"
                  onClick={() => setShowSkillsDropdown(!showSkillsDropdown)}
                >
                  {selectedSkills.length === 0 
                    ? 'All Skills' 
                    : `${selectedSkills.length} selected`
                  }
                  <span className="dropdown-arrow">▼</span>
                </button>
                
                {showSkillsDropdown && (
                  <div className="skills-dropdown-menu">
                    <div className="skills-dropdown-header">
                      <span>Select Skills</span>
                      <button
                        type="button"
                        className="clear-skills-btn"
                        onClick={() => setSelectedSkills([])}
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="skills-list">
                      {getAllSkills().map(skill => (
                        <label key={skill} className="skill-option">
                          <input
                            type="checkbox"
                            checked={selectedSkills.includes(skill)}
                            onChange={() => handleSkillToggle(skill)}
                          />
                          <span>{skill}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Clear Filters Button */}
            <div className="filter-group">
              <button
                className="clear-filters-btn"
                onClick={clearAllFilters}
                title="Clear all filters"
              >
                🗑️ Clear
              </button>
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchTerm || searchIndustry || searchBatch || searchBranch || selectedSkills.length > 0) && (
            <div className="active-filters">
              <span className="filters-label">Active filters:</span>
              {searchTerm && (
                <span className="filter-tag">
                  Search: {searchTerm}
                  <button onClick={() => setSearchTerm('')}>×</button>
                </span>
              )}
              {searchIndustry && (
                <span className="filter-tag">
                  Industry: {searchIndustry}
                  <button onClick={() => setSearchIndustry('')}>×</button>
                </span>
              )}
              {searchBatch && (
                <span className="filter-tag">
                  Batch: {searchBatch}
                  <button onClick={() => setSearchBatch('')}>×</button>
                </span>
              )}
              {searchBranch && (
                <span className="filter-tag">
                  Branch: {searchBranch}
                  <button onClick={() => setSearchBranch('')}>×</button>
                </span>
              )}
              {selectedSkills.map(skill => (
                <span key={skill} className="filter-tag">
                  Skill: {skill}
                  <button onClick={() => handleSkillToggle(skill)}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Members Grid */}
      <div className="member-grid">
        {filteredMembers.map(member => (
          <div key={member.id} className="member-card">
            <div className="member-header">
              <div className="member-avatar">
                {member.photo ? (
                  <img src={member.photo} alt={member.name} className="avatar-image" />
                ) : (
                  getInitials(member.name)
                )}
              </div>
              <div className="member-info">
                <h3>{member.name}</h3>
                <p>{member.email}</p>
              </div>
            </div>
            
            <div className="member-details">
              <div className="detail-row">
                <span className="detail-label">Branch:</span>
                <span className="detail-value">{member.branch || 'Not specified'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Industry:</span>
                <span className="detail-value">{member.industry || 'Not specified'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Company:</span>
                <span className="detail-value">{member.company || 'Not specified'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Batch:</span>
                <span className="detail-value">{member.passoutBatch || 'Not specified'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Phone:</span>
                <span className="detail-value">{member.phone || 'Not provided'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Membership ID:</span>
                <span className="detail-value">{member.membershipID || 'Not assigned'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Type:</span>
                <span className={`membership-badge membership-${member.membershipType?.toLowerCase().replace('-', '')}`}>
                  {member.membershipType || 'Member'}
                </span>
              </div>
              {member.skills && member.skills.length > 0 && (
                <div className="detail-row">
                  <span className="detail-label">Skills:</span>
                  <div className="skills-container">
                    {member.skills.slice(0, 3).map((skill, index) => (
                      <span key={index} className="skill-tag">
                        {skill}
                      </span>
                    ))}
                    {member.skills.length > 3 && (
                      <span className="skill-tag more">+{member.skills.length - 3}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="member-actions">
              <Link to={`/member/${member.id}`} className="btn btn-primary">
                View Details
              </Link>
              {(isAdmin || user?.member_id == member.id) && (
                <Link to={`/edit/${member.id}`} className="btn btn-secondary">
                  Edit Info
                </Link>
              )}
              {isAdmin && (
                <button
                  className="btn btn-danger"
                  onClick={() => handleDeleteMember(member.id)}
                  title="Delete member (Admin only)"
                >
                  🗑️ Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredMembers.length === 0 && searchTerm && (
        <div className="no-results">
          <h3>No members found matching your search criteria</h3>
          <p>Try adjusting your search terms</p>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <AddMember
          onClose={() => setShowAddModal(false)}
          onAdd={() => {
            setShowAddModal(false);
            fetchMembers(); // Refresh the member list
          }}
        />
      )}
    </div>
  );
};

export default MemberList;
