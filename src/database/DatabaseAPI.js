/**
 * DatabaseAPI.js - High-level Database Operations Layer
 * 
 * This class provides a clean API interface for all database operations:
 * - Member CRUD operations with skill relationships
 * - Lookup table management (branches, industries, companies, skills)
 * - Blog and notice content management
 * - Enhanced user authentication and security features
 * - Data transformation between database format and API format
 * 
 * Key Features:
 * - Automatic skill relationship handling
 * - Advanced authentication with password security
 * - User settings and privacy controls
 * - Security audit logging and monitoring
 * - Legacy ID support for backward compatibility
 * - SQL injection prevention via prepared statements
 * - Consistent error handling and logging
 * 
 * Dependencies: DatabaseManager, AuthenticationUtils
 */

const DatabaseManager = require('./DatabaseManager');
const AuthenticationUtils = require('./AuthenticationUtils');

class DatabaseAPI {
    constructor() {
        this.dbManager = new DatabaseManager();
        this.db = null; // Will hold the database connection after initialization
        this.auth = null; // Authentication utilities instance
    }

    // Initialize the database connection and authentication utilities
    async initialize() {
        await this.dbManager.initialize();
        this.db = this.dbManager.getDatabase();
        this.auth = new AuthenticationUtils(this.db);
    }

    // ===== MEMBERS API =====
    // Get all members with their associated lookup data and skills
    // Returns denormalized data format for easy frontend consumption
    getAllMembers() {
        // Complex JOIN query to fetch member data with all related information
        // Uses LEFT JOINs to include members even if they don't have all relationships
        const query = `
            SELECT m.*, 
                   b.name as branch_name,
                   i.name as industry_name,
                   c.name as company_name,
                   GROUP_CONCAT(s.name) as skills
            FROM members m
            LEFT JOIN branches b ON m.branch_id = b.id
            LEFT JOIN industries i ON m.industry_id = i.id
            LEFT JOIN companies c ON m.company_id = c.id
            LEFT JOIN member_skills ms ON m.id = ms.member_id
            LEFT JOIN skills s ON ms.skill_id = s.id
            GROUP BY m.id
            ORDER BY m.name
        `;
        
        const members = this.db.prepare(query).all();
        
        // Transform database format to API format
        // Convert skills from comma-separated string to array for frontend
        // Use legacy_id for backward compatibility with existing frontend code
        return members.map(member => ({
            id: member.legacy_id || member.id,
            name: member.name,
            email: member.email,
            phone: member.phone,
            address: member.address,
            passoutBatch: member.passout_batch,
            branch: member.branch_name,
            industry: member.industry_name,
            company: member.company_name,
            skills: member.skills ? member.skills.split(',') : [],
            photo: member.photo,
            membershipID: member.membership_id,
            membershipType: member.membership_type
        }));
    }

    // Get a specific member by ID (supports both legacy and new IDs)
    // Returns single member object or null if not found
    getMemberById(id) {
        // Query with LEFT JOINs to get member data with lookup values
        // Supports both legacy_id (from old JSON system) and new SQLite id
        const query = `
            SELECT m.*, 
                   b.name as branch_name,
                   i.name as industry_name,
                   c.name as company_name
            FROM members m
            LEFT JOIN branches b ON m.branch_id = b.id
            LEFT JOIN industries i ON m.industry_id = i.id
            LEFT JOIN companies c ON m.company_id = c.id
            WHERE m.legacy_id = ? OR m.id = ?
        `;
        
        const member = this.db.prepare(query).get(id, id);
        if (!member) return null;
        
        // Get skills separately due to many-to-many relationship
        // Separate query prevents cartesian product issues with main query
        const skillsQuery = `
            SELECT s.name
            FROM skills s
            JOIN member_skills ms ON s.id = ms.skill_id
            WHERE ms.member_id = ?
        `;
        
        const skills = this.db.prepare(skillsQuery).all(member.id).map(row => row.name);
        
        // Transform to API format with skills array
        return {
            id: member.legacy_id || member.id,
            name: member.name,
            email: member.email,
            phone: member.phone,
            address: member.address,
            passoutBatch: member.passout_batch,
            branch: member.branch_name,
            industry: member.industry_name,
            company: member.company_name,
            skills: skills,
            photo: member.photo,
            membershipID: member.membership_id,
            membershipType: member.membership_type
        };
    }

    // Create a new member with automatic lookup table management
    // Uses transaction to ensure data consistency across multiple tables
    // Create a new member with automatic lookup table management and user account creation
    // Uses transaction to ensure data consistency across multiple tables
    async createMember(memberData) {
        return new Promise((resolve, reject) => {
            try {
                // Execute database transaction first
                const result = this.dbManager.executeTransaction(() => {
                    // Get or create lookup table entries (branch, industry, company)
                    // This ensures referential integrity and prevents orphaned records
                    const branchId = this.getOrCreateLookup('branches', memberData.branch);
                    const industryId = this.getOrCreateLookup('industries', memberData.industry);
                    const companyId = this.getOrCreateLookup('companies', memberData.company);
                    
                    // Insert the main member record with foreign key references
                    const insertMember = this.db.prepare(`
                        INSERT INTO members (legacy_id, name, email, phone, address, passout_batch, 
                                           branch_id, industry_id, company_id, photo, membership_id, membership_type)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `);
                    
                    // Use provided ID or generate timestamp-based ID for backward compatibility
                    const legacyId = memberData.id || Date.now();
                    const insertResult = insertMember.run(
                        legacyId,
                        memberData.name,
                        memberData.email,
                        memberData.phone,
                        memberData.address,
                        memberData.passoutBatch,
                        branchId,
                        industryId,
                        companyId,
                        memberData.photo,
                        memberData.membershipID,
                        memberData.membershipType
                    );
                    
                    const memberId = insertResult.lastInsertRowid;
                    
                    // Insert skills
                    if (memberData.skills && Array.isArray(memberData.skills)) {
                        this.updateMemberSkills(memberId, memberData.skills);
                    }
                    
                    return { legacyId, memberId };
                });

                // Handle user account creation after successful database transaction
                if (memberData.createUserAccount !== false) { // Default to true unless explicitly false
                    console.log(`👤 Creating user account for new member: ${memberData.name}`);
                    
                    this.auth.createUserFromMember({
                        name: memberData.name,
                        email: memberData.email,
                        memberId: result.memberId
                    }).then(userResult => {
                        if (userResult.success) {
                            console.log(`✅ User account created: ${userResult.username}`);
                        } else {
                            console.warn(`⚠️  Failed to create user account: ${userResult.error}`);
                        }
                        
                        // Run data consistency check after all operations
                        this.runDataConsistencyCheck('ADD_MEMBER', result.legacyId);
                        
                        resolve({ id: result.legacyId, dbId: result.memberId, userCreated: userResult.success });
                        
                    }).catch(error => {
                        console.warn(`⚠️  User account creation error: ${error.message}`);
                        
                        // Run data consistency check even if user creation failed
                        this.runDataConsistencyCheck('ADD_MEMBER', result.legacyId);
                        
                        resolve({ id: result.legacyId, dbId: result.memberId, userCreated: false });
                    });
                } else {
                    // No user account creation requested
                    this.runDataConsistencyCheck('ADD_MEMBER', result.legacyId);
                    resolve({ id: result.legacyId, dbId: result.memberId, userCreated: false });
                }
                
            } catch (error) {
                console.error('Error creating member:', error);
                reject(error);
            }
        });
    }

    updateMember(id, memberData) {
        return this.dbManager.executeTransaction(() => {
            // Get member's database ID
            const member = this.db.prepare('SELECT id FROM members WHERE legacy_id = ? OR id = ?').get(id, id);
            if (!member) throw new Error('Member not found');
            
            const memberId = member.id;
            
            // Get or create lookup IDs
            const branchId = this.getOrCreateLookup('branches', memberData.branch);
            const industryId = this.getOrCreateLookup('industries', memberData.industry);
            const companyId = this.getOrCreateLookup('companies', memberData.company);
            
            // Update member
            const updateMember = this.db.prepare(`
                UPDATE members 
                SET name = ?, email = ?, phone = ?, address = ?, passout_batch = ?,
                    branch_id = ?, industry_id = ?, company_id = ?, photo = ?,
                    membership_id = ?, membership_type = ?
                WHERE id = ?
            `);
            
            updateMember.run(
                memberData.name,
                memberData.email,
                memberData.phone,
                memberData.address,
                memberData.passoutBatch,
                branchId,
                industryId,
                companyId,
                memberData.photo,
                memberData.membershipID,
                memberData.membershipType,
                memberId
            );
            
            // Update skills
            if (memberData.skills && Array.isArray(memberData.skills)) {
                this.updateMemberSkills(memberId, memberData.skills);
            }
            
            // Run data consistency check after update
            this.runDataConsistencyCheck('UPDATE_MEMBER', id);
            
            return { id: id, updated: true };
        });
    }

    /**
     * Enhanced member deletion with cascading cleanup and consistency checks
     * This method should only be used for members without user accounts
     * For members with users, use deleteUserWithCascade from AuthenticationUtils
     */
    deleteMember(id, adminUserId) {
        try {
            console.log(`🗑️  Deleting member ID: ${id}`);
            
            // Check if member has associated user account
            const associatedUser = this.db.prepare('SELECT id, username FROM users WHERE member_id = ?').get(id);
            
            if (associatedUser) {
                console.log(`⚠️  Member ${id} has associated user account: ${associatedUser.username}`);
                return {
                    success: false,
                    error: 'Cannot delete member with associated user account. Use deleteUserWithCascade instead.',
                    hasUser: true,
                    userId: associatedUser.id,
                    username: associatedUser.username
                };
            }

            // Get member info before deletion for logging
            const memberInfo = this.db.prepare('SELECT * FROM members WHERE legacy_id = ? OR id = ?').get(id, id);
            
            if (!memberInfo) {
                return {
                    success: false,
                    error: 'Member not found'
                };
            }

            // Store lookup IDs for cleanup
            const lookupIds = {
                branchId: memberInfo.branch_id,
                industryId: memberInfo.industry_id,
                companyId: memberInfo.company_id
            };

            // Delete member skills first
            this.db.prepare('DELETE FROM member_skills WHERE member_id = ?').run(memberInfo.id);
            
            // Delete member record
            const deleteMember = this.db.prepare('DELETE FROM members WHERE legacy_id = ? OR id = ?');
            const result = deleteMember.run(id, id);
            
            if (result.changes > 0) {
                console.log(`✅ Member ${memberInfo.name} deleted successfully`);
                
                // Clean up orphaned lookup records
                this.cleanupOrphanedLookups(lookupIds);
                
                // Run data consistency check
                this.runDataConsistencyCheck('DELETE_MEMBER', id, adminUserId);
                
                return {
                    success: true,
                    deletedMember: memberInfo.name,
                    message: 'Member deleted successfully with consistency validation'
                };
            } else {
                return {
                    success: false,
                    error: 'Failed to delete member'
                };
            }
            
        } catch (error) {
            console.error('Member deletion error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Clean up orphaned lookup records
     */
    cleanupOrphanedLookups(lookupIds) {
        console.log('🧹 Cleaning up orphaned lookup records...');
        
        // Clean up branches
        if (lookupIds.branchId) {
            const branchUsage = this.db.prepare('SELECT COUNT(*) as count FROM members WHERE branch_id = ?')
                .get(lookupIds.branchId);
            if (branchUsage.count === 0) {
                this.db.prepare('DELETE FROM branches WHERE id = ?').run(lookupIds.branchId);
                console.log(`   🏢 Deleted orphaned branch`);
            }
        }

        // Clean up industries
        if (lookupIds.industryId) {
            const industryUsage = this.db.prepare('SELECT COUNT(*) as count FROM members WHERE industry_id = ?')
                .get(lookupIds.industryId);
            if (industryUsage.count === 0) {
                this.db.prepare('DELETE FROM industries WHERE id = ?').run(lookupIds.industryId);
                console.log(`   🏭 Deleted orphaned industry`);
            }
        }

        // Clean up companies
        if (lookupIds.companyId) {
            const companyUsage = this.db.prepare('SELECT COUNT(*) as count FROM members WHERE company_id = ?')
                .get(lookupIds.companyId);
            if (companyUsage.count === 0) {
                this.db.prepare('DELETE FROM companies WHERE id = ?').run(lookupIds.companyId);
                console.log(`   🏬 Deleted orphaned company`);
            }
        }

        // Clean up orphaned skills
        const orphanedSkills = this.db.prepare(`
            SELECT s.id, s.name FROM skills s
            LEFT JOIN member_skills ms ON s.id = ms.skill_id
            WHERE ms.skill_id IS NULL
        `).all();

        orphanedSkills.forEach(skill => {
            this.db.prepare('DELETE FROM skills WHERE id = ?').run(skill.id);
            console.log(`   🎯 Deleted orphaned skill: ${skill.name}`);
        });
    }

    /**
     * Run data consistency check after operations
     */
    runDataConsistencyCheck(operation, recordId, adminUserId = null) {
        try {
            const DataConsistencyManager = require('./DataConsistencyManager');
            const consistencyManager = new DataConsistencyManager(this.db);
            
            console.log(`🔍 Running data consistency check after ${operation}...`);
            const results = consistencyManager.runDataConsistencyCheck();
            
            if (results.status !== 'PASSED') {
                console.warn(`⚠️  Data consistency issues found after ${operation}:`, results.issues);
            } else {
                console.log(`✅ Data consistency validated after ${operation}`);
            }
            
            return results;
        } catch (error) {
            console.error('Data consistency check failed:', error);
            return null;
        }
    }

    // Helper methods
    getOrCreateLookup(table, value) {
        if (!value) return null;
        
        const selectStmt = this.db.prepare(`SELECT id FROM ${table} WHERE name = ?`);
        let result = selectStmt.get(value);
        
        if (!result) {
            const insertStmt = this.db.prepare(`INSERT INTO ${table} (name) VALUES (?)`);
            const insertResult = insertStmt.run(value);
            return insertResult.lastInsertRowid;
        }
        
        return result.id;
    }

    updateMemberSkills(memberId, skills) {
        // Remove existing skills
        this.db.prepare('DELETE FROM member_skills WHERE member_id = ?').run(memberId);
        
        // Add new skills
        const insertSkill = this.db.prepare('INSERT OR IGNORE INTO skills (name) VALUES (?)');
        const getSkillId = this.db.prepare('SELECT id FROM skills WHERE name = ?');
        const insertMemberSkill = this.db.prepare('INSERT INTO member_skills (member_id, skill_id) VALUES (?, ?)');
        
        skills.forEach(skill => {
            if (skill && skill.trim()) {
                const skillName = skill.trim();
                insertSkill.run(skillName);
                const skillId = getSkillId.get(skillName).id;
                insertMemberSkill.run(memberId, skillId);
            }
        });
    }

    // Lookup tables API
    getBranches() {
        return this.db.prepare('SELECT name FROM branches ORDER BY name').all().map(row => row.name);
    }

    getIndustries() {
        return this.db.prepare('SELECT name FROM industries ORDER BY name').all().map(row => row.name);
    }

    getCompanies() {
        return this.db.prepare('SELECT name FROM companies ORDER BY name').all().map(row => row.name);
    }

    // Users API (keeping for compatibility)
    getUsers() {
        return this.db.prepare('SELECT * FROM users').all();
    }

    // Blogs API
    getAllBlogs() {
        const query = `
            SELECT b.*, GROUP_CONCAT(bt.name) as tags
            FROM blogs b
            LEFT JOIN blog_tag_relations btr ON b.id = btr.blog_id
            LEFT JOIN blog_tags bt ON btr.tag_id = bt.id
            GROUP BY b.id
            ORDER BY b.created_at DESC
        `;
        
        const blogs = this.db.prepare(query).all();
        
        return blogs.map(blog => ({
            id: blog.legacy_id || blog.id,
            title: blog.title,
            content: blog.content,
            author: blog.author,
            category: blog.category,
            date: blog.created_at,
            tags: blog.tags ? blog.tags.split(',') : []
        }));
    }

    // Notices API
    getAllNotices() {
        const notices = this.db.prepare(`
            SELECT * FROM notices ORDER BY created_at DESC
        `).all();
        
        return notices.map(notice => ({
            id: notice.legacy_id || notice.id,
            title: notice.title,
            content: notice.content,
            category: notice.category,
            priority: notice.priority,
            author: notice.author,
            date: notice.created_at
        }));
    }

    createNotice(noticeData) {
        const insertNotice = this.db.prepare(`
            INSERT INTO notices (title, content, category, priority, author, created_at, legacy_id)
            VALUES (?, ?, ?, ?, ?, datetime('now'), ?)
        `);
        
        const legacyId = noticeData.id || Date.now();
        const result = insertNotice.run(
            noticeData.title,
            noticeData.content,
            noticeData.category || 'General',
            noticeData.priority || 'Medium',
            noticeData.author,
            legacyId
        );
        
        return { id: legacyId, dbId: result.lastInsertRowid };
    }

    updateNotice(id, noticeData) {
        const updateNotice = this.db.prepare(`
            UPDATE notices 
            SET title = ?, content = ?, category = ?, priority = ?, author = ?
            WHERE legacy_id = ? OR id = ?
        `);
        
        const result = updateNotice.run(
            noticeData.title,
            noticeData.content,
            noticeData.category || 'General',
            noticeData.priority || 'Medium',
            noticeData.author,
            id, id
        );
        
        return { id: id, updated: result.changes > 0 };
    }

    deleteNotice(id) {
        const deleteNotice = this.db.prepare('DELETE FROM notices WHERE legacy_id = ? OR id = ?');
        const result = deleteNotice.run(id, id);
        return { id: id, deleted: result.changes > 0 };
    }

    // Blog CRUD methods
    createBlog(blogData) {
        const transaction = this.db.transaction(() => {
            // Insert blog
            const insertBlog = this.db.prepare(`
                INSERT INTO blogs (title, content, author, category, created_at, legacy_id)
                VALUES (?, ?, ?, ?, datetime('now'), ?)
            `);
            
            const legacyId = blogData.id || Date.now();
            const result = insertBlog.run(
                blogData.title,
                blogData.content,
                blogData.author,
                blogData.category || 'General',
                legacyId
            );
            
            const blogId = result.lastInsertRowid;
            
            // Handle tags if provided
            if (blogData.tags && Array.isArray(blogData.tags)) {
                const insertTag = this.db.prepare('INSERT OR IGNORE INTO blog_tags (name) VALUES (?)');
                const getTagId = this.db.prepare('SELECT id FROM blog_tags WHERE name = ?');
                const insertRelation = this.db.prepare('INSERT INTO blog_tag_relations (blog_id, tag_id) VALUES (?, ?)');
                
                for (const tag of blogData.tags) {
                    if (tag.trim()) {
                        insertTag.run(tag.trim());
                        const tagResult = getTagId.get(tag.trim());
                        if (tagResult) {
                            insertRelation.run(blogId, tagResult.id);
                        }
                    }
                }
            }
            
            return { id: legacyId, dbId: blogId };
        });
        
        return transaction();
    }

    updateBlog(id, blogData) {
        const transaction = this.db.transaction(() => {
            // Update blog
            const updateBlog = this.db.prepare(`
                UPDATE blogs 
                SET title = ?, content = ?, author = ?, category = ?
                WHERE legacy_id = ? OR id = ?
            `);
            
            const result = updateBlog.run(
                blogData.title,
                blogData.content,
                blogData.author,
                blogData.category || 'General',
                id, id
            );
            
            if (result.changes === 0) {
                return { id: id, updated: false };
            }
            
            // Get the actual blog ID for tag updates
            const getBlogId = this.db.prepare('SELECT id FROM blogs WHERE legacy_id = ? OR id = ?');
            const blogResult = getBlogId.get(id, id);
            
            if (blogResult && blogData.tags && Array.isArray(blogData.tags)) {
                // Remove existing tag relations
                const deleteRelations = this.db.prepare('DELETE FROM blog_tag_relations WHERE blog_id = ?');
                deleteRelations.run(blogResult.id);
                
                // Add new tag relations
                const insertTag = this.db.prepare('INSERT OR IGNORE INTO blog_tags (name) VALUES (?)');
                const getTagId = this.db.prepare('SELECT id FROM blog_tags WHERE name = ?');
                const insertRelation = this.db.prepare('INSERT INTO blog_tag_relations (blog_id, tag_id) VALUES (?, ?)');
                
                for (const tag of blogData.tags) {
                    if (tag.trim()) {
                        insertTag.run(tag.trim());
                        const tagResult = getTagId.get(tag.trim());
                        if (tagResult) {
                            insertRelation.run(blogResult.id, tagResult.id);
                        }
                    }
                }
            }
            
            return { id: id, updated: true };
        });
        
        return transaction();
    }

    deleteBlog(id) {
        const transaction = this.db.transaction(() => {
            // Get the actual blog ID
            const getBlogId = this.db.prepare('SELECT id FROM blogs WHERE legacy_id = ? OR id = ?');
            const blogResult = getBlogId.get(id, id);
            
            if (blogResult) {
                // Delete tag relations first
                const deleteRelations = this.db.prepare('DELETE FROM blog_tag_relations WHERE blog_id = ?');
                deleteRelations.run(blogResult.id);
            }
            
            // Delete blog
            const deleteBlog = this.db.prepare('DELETE FROM blogs WHERE legacy_id = ? OR id = ?');
            const result = deleteBlog.run(id, id);
            
            return { id: id, deleted: result.changes > 0 };
        });
        
        return transaction();
    }

    // ===== AUTHENTICATION & USER MANAGEMENT API =====
    
    /**
     * Authenticate user with enhanced security features
     * Returns user data with settings if successful
     */
    async authenticateUser(username, password, clientInfo = {}) {
        return await this.auth.authenticateUser(username, password, clientInfo);
    }

    /**
     * Change user password with security validation
     */
    async changePassword(userId, currentPassword, newPassword) {
        return await this.auth.changePassword(userId, currentPassword, newPassword);
    }

    /**
     * Change username (one-time only)
     */
    async changeUsername(userId, newUsername) {
        return await this.auth.changeUsername(userId, newUsername);
    }

    /**
     * Update user settings and preferences
     */
    async updateUserSettings(userId, settings) {
        return await this.auth.updateUserSettings(userId, settings);
    }

    /**
     * Admin password reset functionality
     */
    async adminResetPassword(adminId, targetUserId, newPassword = null) {
        return await this.auth.adminResetPassword(adminId, targetUserId, newPassword);
    }

    /**
     * Create new user account
     */
    async createUser(userData, createdByAdminId = null) {
        return await this.auth.createUser(userData, createdByAdminId);
    }

    /**
     * Create user from member data with auto-generated credentials
     */
    async createUserFromMember(memberData, createdByAdminId = null) {
        return await this.auth.createUserFromMember(memberData, createdByAdminId);
    }

    /**
     * Get user security log (admin only)
     */
    getSecurityLog(adminId, targetUserId = null, limit = 100) {
        return this.auth.getSecurityLog(adminId, targetUserId, limit);
    }

    /**
     * Get user by ID with settings
     */
    getUserById(userId) {
        const query = `
            SELECT id, username, name, email, role, first_login, username_changed,
                   theme_preference, profile_visibility, email_notifications, 
                   language_preference, last_login, created_at
            FROM users WHERE id = ?
        `;
        return this.db.prepare(query).get(userId);
    }

    /**
     * Get all users (admin only) with basic information
     */
    getAllUsers(adminId) {
        // Verify admin privileges
        const admin = this.db.prepare('SELECT role FROM users WHERE id = ?').get(adminId);
        if (!admin || admin.role !== 'admin') {
            throw new Error('Insufficient privileges to view user list');
        }

        const query = `
            SELECT id, username, name, email, role, first_login, username_changed,
                   last_login, created_at, failed_login_attempts, 
                   account_locked_until IS NOT NULL as is_locked,
                   system_password, member_id
            FROM users ORDER BY created_at DESC
        `;
        return this.db.prepare(query).all();
    }

    /**
     * Check if username is available
     */
    isUsernameAvailable(username, excludeUserId = null) {
        const query = excludeUserId 
            ? 'SELECT id FROM users WHERE username = ? AND id != ?'
            : 'SELECT id FROM users WHERE username = ?';
        
        const params = excludeUserId ? [username, excludeUserId] : [username];
        const result = this.db.prepare(query).get(...params);
        return !result;
    }

    /**
     * Check if email is available
     */
    isEmailAvailable(email, excludeUserId = null) {
        const query = excludeUserId 
            ? 'SELECT id FROM users WHERE email = ? AND id != ?'
            : 'SELECT id FROM users WHERE email = ?';
        
        const params = excludeUserId ? [email, excludeUserId] : [email];
        const result = this.db.prepare(query).get(...params);
        return !result;
    }

    /**
     * Update user profile information
     */
    updateUserProfile(userId, profileData) {
        const { name, email } = profileData;
        
        // Check if email is available (if changing)
        if (email) {
            const emailAvailable = this.isEmailAvailable(email, userId);
            if (!emailAvailable) {
                throw new Error('Email address is already in use');
            }
        }

        const updateStmt = this.db.prepare(`
            UPDATE users 
            SET name = COALESCE(?, name), 
                email = COALESCE(?, email),
                updated_at = datetime('now')
            WHERE id = ?
        `);

        const result = updateStmt.run(name, email, userId);
        
        if (result.changes === 0) {
            throw new Error('User not found or no changes made');
        }

        return { success: true, message: 'Profile updated successfully' };
    }

    /**
     * Get user privacy settings
     */
    getUserPrivacySettings(userId) {
        const query = `
            SELECT profile_visibility, email_notifications
            FROM users WHERE id = ?
        `;
        return this.db.prepare(query).get(userId);
    }

    /**
     * Update user privacy settings
     */
    updateUserPrivacySettings(userId, privacySettings) {
        const { profileVisibility, emailNotifications } = privacySettings;
        
        const updateStmt = this.db.prepare(`
            UPDATE users 
            SET profile_visibility = COALESCE(?, profile_visibility),
                email_notifications = COALESCE(?, email_notifications),
                updated_at = datetime('now')
            WHERE id = ?
        `);

        const result = updateStmt.run(profileVisibility, emailNotifications, userId);
        
        if (result.changes === 0) {
            throw new Error('User not found or no changes made');
        }

        return { success: true, message: 'Privacy settings updated successfully' };
    }

    /**
     * Create default admin user if none exists
     */
    async createDefaultAdmin() {
        const adminExists = this.db.prepare('SELECT id FROM users WHERE role = "admin"').get();
        
        if (!adminExists) {
            const defaultAdminData = {
                username: 'admin',
                name: 'System Administrator',
                email: 'admin@ismaa-bengaluru.org',
                role: 'admin'
            };

            const result = await this.auth.createUser(defaultAdminData);
            console.log('Default admin created:', result);
            return result;
        }

        return { success: false, message: 'Admin user already exists' };
    }

    close() {
        this.dbManager.close();
    }
}

module.exports = DatabaseAPI;
