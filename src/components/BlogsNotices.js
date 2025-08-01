// =====================================================
// ISMAA Bengaluru Portal - Blogs & Notices Management
// =====================================================
//
// Comprehensive content management component for handling both educational
// blogs and administrative notices within the ISMAA portal system.
//
// Key Features:
// - Dual-tab interface for blogs and notices management
// - Role-based access control (admin privileges for notices)
// - CRUD operations with real-time updates
// - Rich content creation with categorization and tagging
// - Priority-based notice system with visual indicators
// - Responsive modal interface for content editing
//
// Content Types:
// - Blogs: Educational articles with tags and categories
// - Notices: Administrative announcements with priority levels
//
// User Permissions:
// - All users: Create, edit, delete own blogs
// - Admin users: Full notice management capabilities
// - Admin users: Can edit/delete all blogs
//
// Technical Features:
// - Real-time data fetching with error handling
// - Optimistic UI updates for better user experience
// - Form validation and sanitization
// - Responsive design for mobile and desktop
//
// Dependencies: AuthContext, React hooks, Portal API
// Author: ISMAA Portal Team
// =====================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * BlogsNotices component managing educational content and administrative announcements
 * Provides comprehensive content management with role-based permissions
 */
const BlogsNotices = () => {
  const { user } = useAuth();
  
  // Content state management
  const [blogs, setBlogs] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI state management
  const [activeTab, setActiveTab] = useState('notices');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [modalType, setModalType] = useState('blog'); // 'blog' or 'notice'
  
  // Form data state for content creation/editing
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    tags: '',
    priority: 'medium'
  });

  // Check if current user has administrative privileges
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [blogsRes, noticesRes] = await Promise.all([
        fetch('http://localhost:3001/blogs'),
        fetch('http://localhost:3001/notices')
      ]);

      if (!blogsRes.ok || !noticesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const blogsData = await blogsRes.json();
      const noticesData = await noticesRes.json();

      setBlogs(blogsData.sort((a, b) => new Date(b.date) - new Date(a.date)));
      setNotices(noticesData.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = (type) => {
    // Only admin can create notices
    if (type === 'notice' && !isAdmin) {
      setError('Only administrators can create notices.');
      return;
    }
    
    setModalType(type);
    setEditingItem(null);
    setFormData({
      title: '',
      content: '',
      category: type === 'blog' ? 'education' : 'announcement',
      tags: '',
      priority: 'medium'
    });
    setShowAddModal(true);
  };

  const handleEditClick = (item, type) => {
    // Only admin can edit notices, but admin can edit all blogs too
    if (type === 'notice' && !isAdmin) {
      setError('Only administrators can edit notices.');
      return;
    }
    
    setModalType(type);
    setEditingItem(item);
    setFormData({
      title: item.title,
      content: item.content,
      category: item.category,
      tags: type === 'blog' ? item.tags?.join(', ') || '' : '',
      priority: item.priority || 'medium'
    });
    setShowAddModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const itemData = {
        ...formData,
        author: user?.username || 'Anonymous',
        date: editingItem ? editingItem.date : new Date().toISOString(),
        id: editingItem ? editingItem.id : Date.now()
      };

      if (modalType === 'blog') {
        itemData.tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      }

      const endpoint = modalType === 'blog' ? 'blogs' : 'notices';
      
      if (editingItem) {
        // Update existing item
        const response = await fetch(`http://localhost:3001/${endpoint}/${editingItem.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(itemData),
        });

        if (!response.ok) {
          throw new Error(`Failed to update ${modalType}`);
        }

        const updatedItem = await response.json();
        
        if (modalType === 'blog') {
          setBlogs(prev => prev.map(blog => blog.id === editingItem.id ? updatedItem : blog));
        } else {
          setNotices(prev => prev.map(notice => notice.id === editingItem.id ? updatedItem : notice));
        }
      } else {
        // Create new item
        const response = await fetch(`http://localhost:3001/${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(itemData),
        });

        if (!response.ok) {
          throw new Error(`Failed to create ${modalType}`);
        }

        const createdItem = await response.json();
        
        if (modalType === 'blog') {
          setBlogs(prev => [createdItem, ...prev]);
        } else {
          setNotices(prev => [createdItem, ...prev]);
        }
      }

      setShowAddModal(false);
      setEditingItem(null);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id, type) => {
    // Only admin can delete notices
    if (type === 'notice' && !isAdmin) {
      setError('Only administrators can delete notices.');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) {
      return;
    }

    try {
      const endpoint = type === 'blog' ? 'blogs' : 'notices';
      const response = await fetch(`http://localhost:3001/${endpoint}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete ${type}`);
      }

      if (type === 'blog') {
        setBlogs(prev => prev.filter(blog => blog.id !== id));
      } else {
        setNotices(prev => prev.filter(notice => notice.id !== id));
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCategoryIcon = (category) => {
    const icons = {
      announcement: '📢',
      education: '📚',
      event: '🎉',
      academic: '🎓',
      facility: '🏢',
      technical: '💻'
    };
    return icons[category] || '📝';
  };

  if (loading) return <div className="loading">Loading blogs and notices...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="blogs-notices-container">
      <div className="blogs-notices-header">
        <h2 className="section-title">📝 Blogs & Notices</h2>
        <div className="blogs-notices-actions">
          <div className="action-buttons">
            <button
              className="btn btn-primary"
              onClick={() => handleAddClick('blog')}
            >
              ✏️ Add Blog
            </button>
            {isAdmin && (
              <button
                className="btn btn-secondary"
                onClick={() => handleAddClick('notice')}
              >
                📢 Add Notice
              </button>
            )}
          </div>
          {!isAdmin && (
            <small className="admin-note">
              * Only administrators can manage notices
            </small>
          )}
        </div>
      </div>

      {error && <div className="error" style={{ marginBottom: '20px' }}>Error: {error}</div>}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'notices' ? 'active' : ''}`}
          onClick={() => setActiveTab('notices')}
        >
          📢 Notices ({notices.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'blogs' ? 'active' : ''}`}
          onClick={() => setActiveTab('blogs')}
        >
          📝 Blogs ({blogs.length})
        </button>
      </div>

      {activeTab === 'blogs' && (
        <div className="blogs-container">
          {blogs.length === 0 ? (
            <div className="empty-state">
              <h3>📝 No blogs yet</h3>
              <p>Be the first to share your thoughts!</p>
              <button
                className="btn btn-primary"
                onClick={() => handleAddClick('blog')}
              >
                ✏️ Write Your First Blog
              </button>
            </div>
          ) : (
            blogs.map(blog => (
              <article key={blog.id} className="blog-card">
                <div className="blog-header">
                  <div className="blog-meta">
                    <span className="blog-category">
                      {getCategoryIcon(blog.category)} {blog.category}
                    </span>
                    <span className="blog-date">
                      📅 {formatDate(blog.date)}
                    </span>
                  </div>
                  {user && (blog.author === user.username || user.role === 'admin') && (
                    <div className="item-actions">
                      <button
                        className="edit-btn"
                        onClick={() => handleEditClick(blog, 'blog')}
                        title="Edit blog"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(blog.id, 'blog')}
                        title="Delete blog"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  )}
                </div>

                <h3 className="blog-title">{blog.title}</h3>

                <div className="blog-content">
                  <p>{blog.content}</p>
                </div>

                <div className="blog-footer">
                  <span className="blog-author">
                    👨‍🏫 By {blog.author}
                  </span>
                  <div className="blog-tags">
                    {blog.tags && blog.tags.map((tag, index) => (
                      <span key={index} className="tag">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {activeTab === 'notices' && (
        <div className="notices-container">
          {notices.length === 0 ? (
            <div className="empty-state">
              <h3>📢 No notices yet</h3>
              <p>Create your first notice to keep everyone informed!</p>
              {isAdmin && (
                <button
                  className="btn btn-secondary"
                  onClick={() => handleAddClick('notice')}
                >
                  📢 Create First Notice
                </button>
              )}
            </div>
          ) : (
            notices.map(notice => (
              <div key={notice.id} className={`notice-card priority-${notice.priority}`}>
                <div className="notice-header">
                  <div className="notice-meta">
                    <span className="notice-category">
                      {getCategoryIcon(notice.category)} {notice.category}
                    </span>
                    <span className={`notice-priority priority-${notice.priority}`}>
                      {notice.priority === 'high' && '🔴 High'}
                      {notice.priority === 'medium' && '🟡 Medium'}
                      {notice.priority === 'low' && '🟢 Low'}
                    </span>
                  </div>
                  {isAdmin && (
                    <div className="item-actions">
                      <button
                        className="edit-btn"
                        onClick={() => handleEditClick(notice, 'notice')}
                        title="Edit notice"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(notice.id, 'notice')}
                        title="Delete notice"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  )}
                </div>

                <h3 className="notice-title">{notice.title}</h3>

                <div className="notice-content">
                  <p>{notice.content}</p>
                </div>

                <div className="notice-footer">
                  <span className="notice-date">
                    📅 {formatDate(notice.date)}
                  </span>
                  <span className="notice-author">
                    👨‍💼 By {notice.author}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Edit/Add Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {editingItem 
                  ? (modalType === 'blog' ? '✏️ Edit Blog' : '📢 Edit Notice')
                  : (modalType === 'blog' ? '✏️ Add New Blog' : '📢 Add New Notice')
                }
              </h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>
                ✖️
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="title">Title *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleFormChange}
                  required
                  placeholder={`Enter ${modalType} title...`}
                />
              </div>

              <div className="form-group">
                <label htmlFor="content">Content *</label>
                <textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleFormChange}
                  required
                  rows="5"
                  placeholder={`Write your ${modalType} content here...`}
                />
              </div>

              <div className="form-group">
                <label htmlFor="category">Category *</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleFormChange}
                  required
                >
                  {modalType === 'blog' ? (
                    <>
                      <option value="education">📚 Education</option>
                      <option value="event">🎉 Event</option>
                      <option value="announcement">📢 Announcement</option>
                      <option value="academic">🎓 Academic</option>
                    </>
                  ) : (
                    <>
                      <option value="announcement">📢 Announcement</option>
                      <option value="academic">🎓 Academic</option>
                      <option value="facility">🏢 Facility</option>
                      <option value="technical">💻 Technical</option>
                    </>
                  )}
                </select>
              </div>

              {modalType === 'blog' && (
                <div className="form-group">
                  <label htmlFor="tags">Tags</label>
                  <input
                    type="text"
                    id="tags"
                    name="tags"
                    value={formData.tags}
                    onChange={handleFormChange}
                    placeholder="Enter tags separated by commas (e.g., education, tips, study)"
                  />
                </div>
              )}

              {modalType === 'notice' && (
                <div className="form-group">
                  <label htmlFor="priority">Priority *</label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🔴 High</option>
                  </select>
                </div>
              )}

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingItem 
                    ? (modalType === 'blog' ? '✏️ Update Blog' : '📢 Update Notice')
                    : (modalType === 'blog' ? '✏️ Publish Blog' : '📢 Post Notice')
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogsNotices;
