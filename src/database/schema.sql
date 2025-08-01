-- =====================================================
-- ISMAA Bengaluru Portal - SQLite Database Schema
-- =====================================================
-- 
-- This file defines the complete database structure for the ISMAA member management system.
-- It includes all tables, indexes, constraints, and relationships needed for:
-- - Member profile management with academic and professional data
-- - Lookup tables for branches, industries, companies, and skills
-- - Blog and notice content management with tagging
-- - User authentication and role-based access control
-- - Many-to-many relationships for skills and blog tags
--
-- Key Features:
-- - ACID compliance with foreign key constraints
-- - Normalized design to prevent data duplication
-- - Indexes for optimal query performance
-- - Timestamp tracking for all records
-- - Legacy ID support for backward compatibility
--
-- Database Engine: SQLite 3 with WAL mode
-- Dependencies: better-sqlite3 driver
-- =====================================================

-- Enable foreign key constraints for referential integrity
-- SQLite doesn't enforce foreign keys by default
PRAGMA foreign_keys = ON;

-- ===== AUTHENTICATION TABLES =====

-- Users table for system authentication and authorization
-- Enhanced with advanced security and privacy features
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,           -- Login username (must be unique)
    password_hash TEXT NOT NULL,             -- Password hash using bcrypt
    salt TEXT NOT NULL,                      -- Salt for password hashing
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')), -- Role-based access control
    name TEXT NOT NULL,                      -- Display name for user
    email TEXT UNIQUE,                       -- Email address (optional, must be unique if provided)
    
    -- Security and Privacy Features
    first_login BOOLEAN DEFAULT 1,          -- Flag for first-time login (password change required)
    username_changed BOOLEAN DEFAULT 0,     -- Flag to track if username has been changed (only once allowed)
    password_last_changed DATETIME DEFAULT CURRENT_TIMESTAMP, -- Track password change history
    failed_login_attempts INTEGER DEFAULT 0, -- Track failed login attempts for security
    account_locked_until DATETIME,          -- Account lockout timestamp for security
    
    -- Privacy and App Settings
    profile_visibility TEXT DEFAULT 'members' CHECK (profile_visibility IN ('public', 'members', 'private')), -- Profile visibility setting
    email_notifications BOOLEAN DEFAULT 1,   -- Email notification preferences
    theme_preference TEXT DEFAULT 'dark' CHECK (theme_preference IN ('light', 'dark', 'auto')), -- User theme preference
    language_preference TEXT DEFAULT 'en',   -- Language preference
    
    -- System Information
    last_login DATETIME,                     -- Track last login for security monitoring
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User security audit log for tracking authentication events
CREATE TABLE IF NOT EXISTS user_security_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('login', 'logout', 'password_change', 'username_change', 'failed_login', 'account_locked', 'password_reset')),
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN DEFAULT 1,
    details TEXT,                            -- Additional event details (JSON format)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Password reset tokens for secure password recovery
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,              -- Secure random token for password reset
    expires_at DATETIME NOT NULL,            -- Token expiration timestamp
    used BOOLEAN DEFAULT 0,                  -- Flag to track if token has been used
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===== LOOKUP TABLES =====
-- These tables store reference data used by members and other entities
-- Normalized design prevents data duplication and ensures consistency

-- Academic branches/departments from engineering colleges
CREATE TABLE IF NOT EXISTS branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,               -- Branch name (e.g., "Computer Science", "Mining Engineering")
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Professional industries where members work
CREATE TABLE IF NOT EXISTS industries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,               -- Industry name (e.g., "Software Development", "Mining")
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Companies where members are employed
CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,               -- Company name (e.g., "Cisco Systems", "Tech Mahindra")
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Technical and professional skills with categorization
CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,               -- Skill name (e.g., "JavaScript", "Data Mining", "Machine Learning")
    category TEXT DEFAULT 'general',        -- Skill category for grouping (e.g., "technical", "soft", "domain")
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ===== CORE MEMBER DATA =====

-- Main members table with comprehensive profile information
-- This is the central table containing all member personal and professional data
-- Normalized design with foreign key relationships to lookup tables
CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    legacy_id INTEGER UNIQUE,               -- Original timestamp ID from JSON system (for backward compatibility)
    
    -- Personal Information
    name TEXT NOT NULL,                     -- Full name of the member
    email TEXT,                             -- Email address (optional but recommended)
    phone TEXT,                             -- Primary phone number
    address TEXT,                           -- Current residential address
    
    -- Academic Information
    passout_batch TEXT,                     -- Graduation year/batch from HKBK/ISM
    branch_id INTEGER,                      -- Academic branch/department (references branches table)
    
    -- Professional Information
    industry_id INTEGER,                    -- Professional industry (references industries table)
    company_id INTEGER,                     -- Current employer (references companies table)
    
    -- Membership Information
    photo TEXT,                             -- Base64 encoded profile image data
    membership_id TEXT UNIQUE,              -- Unique membership identifier
    membership_type TEXT DEFAULT 'Member',  -- Type of membership (Member, Life Member, etc.)
    
    -- System Information
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Key Constraints for referential integrity
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (industry_id) REFERENCES industries(id),
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- ===== MANY-TO-MANY RELATIONSHIPS =====

-- Member skills junction table - implements many-to-many relationship
-- Each member can have multiple skills, and each skill can belong to multiple members
CREATE TABLE IF NOT EXISTS member_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,              -- Reference to member
    skill_id INTEGER NOT NULL,               -- Reference to skill
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints with cascade delete for data integrity
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    
    -- Ensure unique member-skill combinations (prevents duplicates)
    UNIQUE(member_id, skill_id)
);

-- ===== CONTENT MANAGEMENT =====

-- Blogs table for educational and informational articles
-- Supports categorization and legacy ID mapping from JSON system
CREATE TABLE IF NOT EXISTS blogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    legacy_id INTEGER UNIQUE,               -- Original ID from JSON system (for backward compatibility)
    
    -- Content Information
    title TEXT NOT NULL,                    -- Blog post title
    content TEXT NOT NULL,                  -- Full blog content (HTML or Markdown)
    author TEXT NOT NULL,                   -- Author name or username
    category TEXT DEFAULT 'education',     -- Blog category for organization
    
    -- System Information
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Blog tags lookup table for content organization
-- Allows flexible tagging system for blog posts
CREATE TABLE IF NOT EXISTS blog_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL               -- Tag name (e.g., "technology", "career", "alumni")
);

-- Blog tags junction table - implements many-to-many relationship
-- Each blog can have multiple tags, and each tag can be used by multiple blogs
CREATE TABLE IF NOT EXISTS blog_tag_relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blog_id INTEGER NOT NULL,               -- Reference to blog post
    tag_id INTEGER NOT NULL,                -- Reference to tag
    
    -- Foreign key constraints with cascade delete
    FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES blog_tags(id) ON DELETE CASCADE,
    
    -- Ensure unique blog-tag combinations
    UNIQUE(blog_id, tag_id)
);

-- Notices table for announcements and important information
-- Supports priority levels and categorization for effective communication
CREATE TABLE IF NOT EXISTS notices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    legacy_id INTEGER UNIQUE,               -- Original ID from JSON system (for backward compatibility)
    
    -- Content Information
    title TEXT NOT NULL,                    -- Notice title/headline
    content TEXT NOT NULL,                  -- Full notice content
    category TEXT DEFAULT 'announcement',  -- Notice category for organization
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')), -- Priority level with constraint
    author TEXT NOT NULL,                   -- Author name or username
    
    -- System Information
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ===== PERFORMANCE OPTIMIZATION =====

-- Database indexes for improved query performance
-- These indexes are strategically placed on columns frequently used in WHERE clauses,
-- JOIN operations, and ORDER BY statements to optimize common queries

-- Member table indexes for efficient searching and filtering
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);              -- Email-based lookups
CREATE INDEX IF NOT EXISTS idx_members_membership_id ON members(membership_id); -- Membership ID searches
CREATE INDEX IF NOT EXISTS idx_members_branch ON members(branch_id);         -- Branch-based filtering
CREATE INDEX IF NOT EXISTS idx_members_industry ON members(industry_id);     -- Industry-based filtering
CREATE INDEX IF NOT EXISTS idx_members_company ON members(company_id);       -- Company-based filtering
CREATE INDEX IF NOT EXISTS idx_members_legacy_id ON members(legacy_id);      -- Legacy ID compatibility

-- Junction table indexes for efficient many-to-many relationship queries
CREATE INDEX IF NOT EXISTS idx_member_skills_member ON member_skills(member_id); -- Member's skills lookup
CREATE INDEX IF NOT EXISTS idx_member_skills_skill ON member_skills(skill_id);   -- Skill's members lookup

-- Blog table indexes for content management and filtering
CREATE INDEX IF NOT EXISTS idx_blogs_author ON blogs(author);                -- Author-based filtering
CREATE INDEX IF NOT EXISTS idx_blogs_category ON blogs(category);            -- Category-based filtering
CREATE INDEX IF NOT EXISTS idx_blogs_legacy_id ON blogs(legacy_id);          -- Legacy ID compatibility

-- Notice table indexes for priority and category-based queries
CREATE INDEX IF NOT EXISTS idx_notices_priority ON notices(priority);        -- Priority-based sorting
CREATE INDEX IF NOT EXISTS idx_notices_category ON notices(category);        -- Category-based filtering
CREATE INDEX IF NOT EXISTS idx_notices_legacy_id ON notices(legacy_id);      -- Legacy ID compatibility

-- ===== AUTOMATIC TIMESTAMP MANAGEMENT =====

-- Database triggers to automatically update 'updated_at' timestamps
-- These triggers ensure data integrity by maintaining accurate modification timestamps
-- without requiring application-level timestamp management

-- Users table timestamp trigger
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
    AFTER UPDATE ON users 
    BEGIN 
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;

-- Members table timestamp trigger
CREATE TRIGGER IF NOT EXISTS update_members_timestamp 
    AFTER UPDATE ON members 
    BEGIN 
        UPDATE members SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;

-- Blogs table timestamp trigger
CREATE TRIGGER IF NOT EXISTS update_blogs_timestamp 
    AFTER UPDATE ON blogs 
    BEGIN 
        UPDATE blogs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;

-- Notices table timestamp trigger
CREATE TRIGGER IF NOT EXISTS update_notices_timestamp 
    AFTER UPDATE ON notices 
    BEGIN 
        UPDATE notices SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;
