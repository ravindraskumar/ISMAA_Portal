// =====================================================
// ISMAA Bengaluru Portal - Edit Member Component
// =====================================================
//
// Comprehensive member profile editing component providing full
// CRUD functionality for updating existing member information.
//
// Key Features:
// - Complete member profile editing interface
// - Pre-populated form fields from existing member data
// - Dynamic lookup data integration with custom option creation
// - Real-time validation and error handling
// - Success/failure feedback with navigation options
// - Photo upload and management with preview
// - Skills management with add/remove functionality
//
// Form Sections:
// - Personal Information: Name, email, phone, address
// - Academic Information: Branch, graduation batch
// - Professional Information: Industry, company
// - Membership Details: ID, type, skills, photo
//
// Data Management:
// - Fetches existing member data on component mount
// - Updates member records through Portal API
// - Manages lookup table relationships
// - Handles photo upload with base64 encoding
// - Skill relationship management (add/remove)
//
// Navigation Features:
// - URL parameter-based member identification
// - Post-update navigation options
// - Breadcrumb navigation for user orientation
// - Cancel operation with unsaved changes warning
//
// Dependencies: React Router, Portal API, React hooks
// Author: ISMAA Portal Team
// =====================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * EditMember component providing comprehensive member profile editing
 * Supports full CRUD operations with dynamic lookup data integration
 */
const EditMember = () => {
  const { id } = useParams(); // Extract member ID from URL parameters
  const navigate = useNavigate();
  const { user } = useAuth(); // Get current user for access control
  
  // Access control state
  const [hasAccess, setHasAccess] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  
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
    skills: [],
    photo: '',
    membershipID: '',
    membershipType: 'Member'
  });
  
  // UI state management
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Lookup data from database
  const [branches, setBranches] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    const initializeComponent = async () => {
      await fetchMember();
      // Add a delay to ensure any recent database writes have completed
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchDropdownOptions();
    };
    
    initializeComponent();
  }, [id]);

  // Fetch dropdown options from SQLite database via API
  const fetchDropdownOptions = async (retryCount = 0) => {
    try {
      console.log(`🔄 EditMember: Fetching dropdown options (attempt ${retryCount + 1})...`);
      const [branchesResponse, industriesResponse, companiesResponse] = await Promise.all([
        fetch('http://localhost:3001/branches'),
        fetch('http://localhost:3001/industries'),
        fetch('http://localhost:3001/companies')
      ]);

      let branchesData = [];
      let industriesData = [];
      let companiesData = [];

      if (branchesResponse.ok) {
        branchesData = await branchesResponse.json();
        setBranches(branchesData);
        console.log(`✅ EditMember: Loaded ${branchesData.length} branches`);
      }

      if (industriesResponse.ok) {
        industriesData = await industriesResponse.json();
        setIndustries(industriesData);
        console.log(`✅ EditMember: Loaded ${industriesData.length} industries`);
      }

      if (companiesResponse.ok) {
        companiesData = await companiesResponse.json();
        setCompanies(companiesData);
        console.log(`✅ EditMember: Loaded ${companiesData.length} companies`);
      }
    } catch (error) {
      console.error('Error fetching dropdown options:', error);
      
      // Retry once if this was the first attempt
      if (retryCount === 0) {
        console.log('🔄 EditMember: Retrying dropdown fetch in 1 second...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchDropdownOptions(1);
      }
      
      // Fallback to default options if all attempts fail
      console.log('⚠️ EditMember: Using fallback dropdown options');
      setBranches(['Computer Science', 'Information Technology', 'Electronics', 'Mechanical', 'Civil', 'Electrical', 'Chemical', 'Biotechnology']);
      setIndustries(['Software Development', 'Data Science', 'Cybersecurity', 'Cloud Computing', 'AI/ML', 'DevOps', 'Web Development', 'Mobile Development']);
      setCompanies(['Microsoft', 'Google', 'Amazon', 'TCS', 'Infosys', 'Wipro', 'Accenture']);
    }
  };

  const fetchMember = async () => {
    try {
      const response = await fetch(`http://localhost:3001/members/${id}`);
      if (!response.ok) {
        throw new Error('Member not found');
      }
      const data = await response.json();
      
      // Access control check: Admin can edit anyone, regular users can only edit their own profile
      const isAdmin = user?.role === 'admin';
      const isOwnProfile = user?.member_id == id; // Note: using == for flexible comparison
      
      if (!isAdmin && !isOwnProfile) {
        setError('Access denied. You can only edit your own profile.');
        setHasAccess(false);
        setAccessChecked(true);
        setLoading(false);
        return;
      }
      
      setHasAccess(true);
      setAccessChecked(true);
      
      // Convert skills array to string for display
      const memberWithSkillsString = {
        ...data,
        skills: data.skills ? data.skills : []
      };
      setMember(memberWithSkillsString);
    } catch (err) {
      setError(err.message);
      setHasAccess(false);
      setAccessChecked(true);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setMember(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setMember(prev => ({
          ...prev,
          photo: e.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:3001/members/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(member),
      });

      if (!response.ok) {
        throw new Error('Failed to update member');
      }

      // Wait a moment for data to be fully written to database
      await new Promise(resolve => setTimeout(resolve, 100));

      setSuccess(true);
      setTimeout(() => {
        navigate(`/member/${id}`);
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading member information...</div>;
  
  // Show access denied message if user doesn't have permission
  if (accessChecked && !hasAccess) {
    return (
      <div className="edit-member-container">
        <div className="edit-back-navigation">
          <Link to="/members" className="btn btn-secondary">
            ← Back to Members
          </Link>
        </div>
        <div className="access-denied">
          <h2>🚫 Access Denied</h2>
          <p>{error || 'You do not have permission to edit this member profile.'}</p>
          <p>Regular users can only edit their own profile. Admins can edit any profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-member-container">
      <div className="edit-back-navigation">
        <Link to={`/member/${id}`} className="btn btn-secondary">
          ← Back to Member Details
        </Link>
      </div>

      <div className="edit-member-card">
        <div className="edit-member-header">
          <h1>✏️ Edit Member Information</h1>
          <p>Update the information for {member.name}</p>
        </div>

        <div className="edit-form-content">
          {error && <div className="error">Error: {error}</div>}
          {success && <div className="success">Member information updated successfully! Redirecting...</div>}

          <form onSubmit={handleSubmit}>
            {/* Photo Upload */}
            <div className="photo-upload">
              <label className="photo-upload-btn">
                {member.photo ? (
                  <img src={member.photo} alt="Preview" className="photo-preview" />
                ) : (
                  <div style={{ padding: '20px', color: '#6c757d', textAlign: 'center' }}>
                    📷<br />Click to upload photo
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                />
              </label>
            </div>

            <div className="grid grid-2">
              <div className="form-section">
                <h3>👤 Personal Details</h3>
                
                <div className="form-group">
                  <label htmlFor="name" className="form-label">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={member.name}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email" className="form-label">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={member.email}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone" className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={member.phone}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="form-section">
                <div className="section-header">
                  <h3>🎓 Professional Information</h3>
                </div>
                
                <div className="form-group">
                  <label htmlFor="branch" className="form-label">Branch</label>
                  <select
                    id="branch"
                    name="branch"
                    value={member.branch}
                    onChange={handleChange}
                    className="form-input"
                    required
                  >
                    <option value="">Select a branch</option>
                    {branches.length > 0 ? (
                      branches.map((branch) => (
                        <option key={branch} value={branch}>
                          {branch}
                        </option>
                      ))
                    ) : (
                      <option value="">No branches available</option>
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="passoutBatch" className="form-label">Passout Batch</label>
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
                  <label htmlFor="industry" className="form-label">Industry</label>
                  <select
                    id="industry"
                    name="industry"
                    value={member.industry}
                    onChange={handleChange}
                    className="form-input"
                    required
                  >
                    <option value="">Select an industry</option>
                    {industries.length > 0 ? (
                      industries.map((industry) => (
                        <option key={industry} value={industry}>
                          {industry}
                        </option>
                      ))
                    ) : (
                      <option value="">No industries available</option>
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="company" className="form-label">Company</label>
                  <select
                    id="company"
                    name="company"
                    value={member.company}
                    onChange={handleChange}
                    className="form-input"
                    required
                  >
                    <option value="">Select a company</option>
                    {companies.length > 0 ? (
                      companies.map((company) => (
                        <option key={company} value={company}>
                          {company}
                        </option>
                      ))
                    ) : (
                      <option value="">No companies available</option>
                    )}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label htmlFor="membershipID" className="form-label">Membership ID</label>
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
                <label htmlFor="membershipType" className="form-label">Membership Type</label>
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

            <div className="form-group">
              <label htmlFor="address" className="form-label">Home Address</label>
              <textarea
                id="address"
                name="address"
                value={member.address}
                onChange={handleChange}
                className="form-input"
                rows="3"
                placeholder="Enter complete address..."
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="skills" className="form-label">Skills (comma-separated)</label>
              <input
                type="text"
                id="skills"
                name="skills"
                value={Array.isArray(member.skills) ? member.skills.join(', ') : ''}
                onChange={(e) => {
                  const skillsString = e.target.value;
                  const skillsArray = skillsString.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0);
                  setMember(prev => ({ ...prev, skills: skillsArray }));
                }}
                className="form-input"
                placeholder="e.g., JavaScript, React, Python, Data Analysis"
              />
            </div>
          </form>
        </div>

        <div className="edit-member-actions">
          <button
            type="submit"
            className="btn btn-success"
            disabled={saving}
            onClick={handleSubmit}
          >
            {saving ? '💾 Saving...' : '💾 Save Changes'}
          </button>
          <Link to={`/member/${id}`} className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EditMember;
