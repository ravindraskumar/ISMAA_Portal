// =====================================================
// ISMAA Bengaluru Portal - Add Member Component
// =====================================================
//
// Comprehensive member registration component providing a complete
// form interface for adding new ISMAA members to the portal system.
//
// Key Features:
// - Multi-section member registration form
// - Dynamic lookup data integration (branches, industries, companies)
// - Custom option creation for flexible data entry
// - Real-time form validation and error handling
// - Skills management with comma-separated input
// - Photo upload with base64 encoding
// - Responsive modal interface
//
// Form Sections:
// - Personal Information: Name, email, phone, address
// - Academic Information: Branch, graduation batch, college
// - Professional Information: Industry, company, position
// - Membership Details: ID, type, skills, photo
//
// Dynamic Features:
// - Auto-populated dropdowns from database lookup tables
// - "Add Custom" options for new branches/industries/companies
// - Real-time validation with user feedback
// - Image upload with preview and base64 conversion
//
// Data Management:
// - Integrates with DatabaseAPI for member creation
// - Automatic lookup table updates for new entries
// - Skills parsing and relationship management
// - Error handling with user-friendly messages
//
// Dependencies: Portal API, React hooks, File handling
// Author: ISMAA Portal Team
// =====================================================

import React, { useState, useEffect } from 'react';

/**
 * AddMember component providing comprehensive member registration interface
 * Supports dynamic lookup data and custom option creation
 */
const AddMember = ({ onClose, onAdd }) => {
  // Member data state with comprehensive profile information
  const [member, setMember] = useState({
    name: '',
    email: '',
    branch: '',
    phone: '',
    address: '',
    passoutBatch: '',
    industry: '',
    company: '',
    skills: '',
    membershipID: '',
    membershipType: 'Member'
  });
  
  // UI state management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Custom option management
  const [showCustomBranch, setShowCustomBranch] = useState(false);
  const [showCustomIndustry, setShowCustomIndustry] = useState(false);
  const [showCustomCompany, setShowCustomCompany] = useState(false);
  const [customBranch, setCustomBranch] = useState('');
  const [customIndustry, setCustomIndustry] = useState('');
  const [customCompany, setCustomCompany] = useState('');
  
  // Lookup data from database
  const [branches, setBranches] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [companies, setCompanies] = useState([]);

  // Fetch dropdown options from SQLite database via API
  useEffect(() => {
    const fetchDropdownOptions = async () => {
      try {
        const [branchesResponse, industriesResponse, companiesResponse] = await Promise.all([
          fetch('http://localhost:3001/branches'),
          fetch('http://localhost:3001/industries'),
          fetch('http://localhost:3001/companies')
        ]);

        if (branchesResponse.ok) {
          const branchesData = await branchesResponse.json();
          setBranches(branchesData);
        }

        if (industriesResponse.ok) {
          const industriesData = await industriesResponse.json();
          setIndustries(industriesData);
        }

        if (companiesResponse.ok) {
          const companiesData = await companiesResponse.json();
          setCompanies(companiesData);
        }
      } catch (error) {
        console.error('Error fetching dropdown options:', error);
        // Fallback to default options if fetch fails
        setBranches(['Computer Science', 'Information Technology', 'Electronics', 'Mechanical', 'Civil', 'Electrical', 'Chemical', 'Biotechnology', 'Aerospace', 'Environmental']);
        setIndustries(['Software Development', 'Data Science', 'Cybersecurity', 'Cloud Computing', 'AI/ML', 'DevOps', 'Web Development', 'Mobile Development', 'Game Development', 'Blockchain', 'IoT', 'Robotics', 'Healthcare', 'Finance', 'Education', 'Manufacturing', 'Consulting']);
        setCompanies(['Microsoft', 'Google', 'Amazon', 'TCS', 'Infosys', 'Wipro', 'Accenture']);
      }
    };

    fetchDropdownOptions();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle custom options
    if (name === 'branch' && value === 'custom') {
      setShowCustomBranch(true);
      return;
    }
    if (name === 'industry' && value === 'custom') {
      setShowCustomIndustry(true);
      return;
    }
    if (name === 'company' && value === 'custom') {
      setShowCustomCompany(true);
      return;
    }
    
    setMember(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCustomBranch = (e) => {
    setCustomBranch(e.target.value);
    setMember(prev => ({
      ...prev,
      branch: e.target.value
    }));
  };

  const handleCustomIndustry = (e) => {
    setCustomIndustry(e.target.value);
    setMember(prev => ({
      ...prev,
      industry: e.target.value
    }));
  };

  const handleCustomCompany = (e) => {
    setCustomCompany(e.target.value);
    setMember(prev => ({
      ...prev,
      company: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const skillsArray = member.skills
        .split(',')
        .map(skill => skill.trim())
        .filter(skill => skill.length > 0);

      const newMember = {
        ...member,
        skills: skillsArray,
        id: Date.now() // Simple ID generation for demo
      };

      const response = await fetch('http://localhost:3001/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newMember),
      });

      if (!response.ok) {
        throw new Error('Failed to add member');
      }

      const addedMember = await response.json();
      
      // Wait a moment for data to be fully written to database
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Display success message to user with instruction
      const memberName = addedMember.name;
      const hasNewValues = member.branch && !branches.includes(member.branch) ||
                          member.industry && !industries.includes(member.industry) ||
                          member.company && !companies.includes(member.company);
      
      // Create success message with user credentials if available
      let successMessage = `✅ ${memberName} has been added successfully!`;
      
      if (addedMember.userAccount) {
        successMessage += `\n\n🔐 Login Credentials Created:`;
        successMessage += `\nUsername: ${addedMember.userAccount.username}`;
        successMessage += `\nPassword: ${addedMember.userAccount.password}`;
        successMessage += `\n\n⚠️ Please share these credentials with the member securely.`;
        successMessage += `\nThe member must change their password on first login.`;
      }
      
      if (hasNewValues) {
        console.log('✅ Member added with new dropdown values');
        console.log('💡 New dropdown values are automatically available in SQLite database');
        
        successMessage += `\n\n💡 New branch/industry/company values have been automatically added to the system!`;
      }

      console.log('✅ Member added successfully');
      if (addedMember.userAccount) {
        console.log('🔐 User credentials:', addedMember.userAccount);
      }
      
      alert(successMessage);

      onAdd(addedMember);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="add-member-modal">
        <div className="modal-content">
          <div className="modal-header">
            <h3>✨ Add New Member</h3>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>

          {error && <div className="error-message">⚠️ {error}</div>}

          <form onSubmit={handleSubmit} className="modal-form">
          {/* Form Fields */}
          <div className="form-sections">
            {/* Personal Information Section */}
            <div className="form-section">
              <div className="section-header">
                <span className="section-icon">👤</span>
                <h3 className="section-title">Personal Information</h3>
              </div>
              
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="name" className="form-label required">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={member.name}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email" className="form-label optional">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={member.email}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Enter email address (optional)"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone" className="form-label optional">Phone Number</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={member.phone}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Enter phone number (optional)"
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="address" className="form-label optional">Home Address</label>
                  <textarea
                    id="address"
                    name="address"
                    value={member.address}
                    onChange={handleChange}
                    className="form-input"
                    rows="3"
                    placeholder="Enter complete address (optional)"
                  />
                </div>
              </div>
            </div>

            {/* Academic Information Section */}
            <div className="form-section">
              <div className="section-header">
                <span className="section-icon">🎓</span>
                <h3 className="section-title">Academic Information</h3>
              </div>
              
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="branch" className="form-label required">Branch</label>
                  <div className="custom-select-container">
                    {!showCustomBranch ? (
                      <select
                        id="branch"
                        name="branch"
                        value={member.branch}
                        onChange={handleChange}
                        className="form-input"
                        required
                      >
                        <option value="">Select a branch</option>
                        {branches.map((branch) => (
                          <option key={branch} value={branch}>{branch}</option>
                        ))}
                        <option value="custom">➕ Add New Branch</option>
                      </select>
                    ) : (
                      <div className="custom-input-container">
                        <input
                          type="text"
                          id="customBranch"
                          value={customBranch}
                          onChange={handleCustomBranch}
                          className="form-input"
                          placeholder="Enter new branch name"
                          required
                        />
                        <button
                          type="button"
                          className="btn-back"
                          onClick={() => {
                            setShowCustomBranch(false);
                            setCustomBranch('');
                            setMember(prev => ({ ...prev, branch: '' }));
                          }}
                        >
                          ← Back
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="passoutBatch" className="form-label required">Passout Batch</label>
                  <input
                    type="text"
                    id="passoutBatch"
                    name="passoutBatch"
                    value={member.passoutBatch}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="e.g., 2024, 2025"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="industry" className="form-label required">Industry</label>
                  <div className="custom-select-container">
                    {!showCustomIndustry ? (
                      <select
                        id="industry"
                        name="industry"
                        value={member.industry}
                        onChange={handleChange}
                        className="form-input"
                        required
                      >
                        <option value="">Select an industry</option>
                        {industries.map((industry) => (
                          <option key={industry} value={industry}>{industry}</option>
                        ))}
                        <option value="custom">➕ Add New Industry</option>
                      </select>
                    ) : (
                      <div className="custom-input-container">
                        <input
                          type="text"
                          id="customIndustry"
                          value={customIndustry}
                          onChange={handleCustomIndustry}
                          className="form-input"
                          placeholder="Enter new industry name"
                          required
                        />
                        <button
                          type="button"
                          className="btn-back"
                          onClick={() => {
                            setShowCustomIndustry(false);
                            setCustomIndustry('');
                            setMember(prev => ({ ...prev, industry: '' }));
                          }}
                        >
                          ← Back
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="company" className="form-label required">Company</label>
                  <div className="custom-select-container">
                    {!showCustomCompany ? (
                      <select
                        id="company"
                        name="company"
                        value={member.company}
                        onChange={handleChange}
                        className="form-input"
                        required
                      >
                        <option value="">Select a company</option>
                        {companies.map((company) => (
                          <option key={company} value={company}>{company}</option>
                        ))}
                        <option value="custom">➕ Add New Company</option>
                      </select>
                    ) : (
                      <div className="custom-input-container">
                        <input
                          type="text"
                          id="customCompany"
                          value={customCompany}
                          onChange={handleCustomCompany}
                          className="form-input"
                          placeholder="Enter new company name"
                          required
                        />
                        <button
                          type="button"
                          className="btn-back"
                          onClick={() => {
                            setShowCustomCompany(false);
                            setCustomCompany('');
                            setMember(prev => ({ ...prev, company: '' }));
                          }}
                        >
                          ← Back
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group full-width">
                  <label htmlFor="skills" className="form-label optional">Skills</label>
                  <input
                    type="text"
                    id="skills"
                    name="skills"
                    value={member.skills}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="e.g., JavaScript, React, Python, Data Analysis (comma-separated)"
                  />
                </div>
              </div>
            </div>

            {/* Membership Information Section */}
            <div className="form-section">
              <div className="section-header">
                <span className="section-icon">🏛️</span>
                <h3 className="section-title">Membership Information</h3>
              </div>
              
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="membershipID" className="form-label required">Membership ID</label>
                  <input
                    type="text"
                    id="membershipID"
                    name="membershipID"
                    value={member.membershipID}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="e.g., ISMAA-BLR-001"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="membershipType" className="form-label required">Membership Type</label>
                  <select
                    id="membershipType"
                    name="membershipType"
                    value={member.membershipType}
                    onChange={handleChange}
                    className="form-input"
                    required
                  >
                    <option value="President">President</option>
                    <option value="Vice-President">Vice-President</option>
                    <option value="Treasurer">Treasurer</option>
                    <option value="Secretary">Secretary</option>
                    <option value="Office-Bearer">Office-Bearer</option>
                    <option value="Member">Member</option>
                    <option value="Non-Member">Non-Member</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Adding...
                </>
              ) : (
                <>
                  <span className="btn-icon">✅</span>
                  Add Member
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary cancel-btn"
            >
              <span className="btn-icon">❌</span>
              Cancel
            </button>
          </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddMember;
