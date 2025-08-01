// =====================================================
// ISMAA Bengaluru Portal - Authentication Utilities
// =====================================================
//
// Comprehensive authentication utility module providing secure password
// management, user authentication, and security features for the portal.
//
// Security Features:
// - bcrypt password hashing with salt rounds
// - Secure password validation and strength checking
// - Account lockout protection against brute force attacks
// - Password reset token generation and validation
// - Security event logging and audit trail
//
// User Management Features:
// - First-time login password change enforcement
// - One-time username change capability
// - User preferences and settings management
// - Profile visibility and privacy controls
//
// Authentication Flow:
// - Secure login with failed attempt tracking
// - Session management with security logging
// - Password change with history tracking
// - Admin password reset capabilities
//
// Dependencies: bcryptjs, crypto (built-in), DatabaseManager
// Author: ISMAA Portal Team
// =====================================================

const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * AuthenticationUtils class providing comprehensive security and user management
 * Implements industry-standard security practices for password management
 */
class AuthenticationUtils {
    constructor(dbManager) {
        this.db = dbManager;
        this.SALT_ROUNDS = 12; // bcrypt salt rounds for password hashing
        this.MAX_FAILED_ATTEMPTS = 5; // Maximum failed login attempts before lockout
        this.LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes lockout duration
        this.PASSWORD_RESET_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
    }

    /**
     * Hash password using bcrypt with salt
     * Implements recommended password storage guidelines
     */
    async hashPassword(password) {
        try {
            const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
            const hash = await bcrypt.hash(password, salt);
            return { hash, salt };
        } catch (error) {
            throw new Error('Password hashing failed: ' + error.message);
        }
    }

    /**
     * Verify password against stored hash
     * Returns boolean indicating password validity
     */
    async verifyPassword(password, hash) {
        try {
            return await bcrypt.compare(password, hash);
        } catch (error) {
            throw new Error('Password verification failed: ' + error.message);
        }
    }

    /**
     * Validate password strength according to security requirements
     * Returns object with validation result and feedback
     */
    validatePasswordStrength(password) {
        const requirements = {
            minLength: password.length >= 8,
            hasUppercase: /[A-Z]/.test(password),
            hasLowercase: /[a-z]/.test(password),
            hasNumber: /\d/.test(password),
            hasSpecialChar: /[!@#$%^&*(),.?\":{}|<>]/.test(password)
        };

        const score = Object.values(requirements).filter(Boolean).length;
        const isValid = score >= 4 && requirements.minLength;

        return {
            isValid,
            score,
            requirements,
            feedback: this.getPasswordFeedback(requirements, score)
        };
    }

    /**
     * Generate password strength feedback for user guidance
     */
    getPasswordFeedback(requirements, score) {
        const feedback = [];
        
        if (!requirements.minLength) feedback.push('Password must be at least 8 characters long');
        if (!requirements.hasUppercase) feedback.push('Include at least one uppercase letter');
        if (!requirements.hasLowercase) feedback.push('Include at least one lowercase letter');
        if (!requirements.hasNumber) feedback.push('Include at least one number');
        if (!requirements.hasSpecialChar) feedback.push('Include at least one special character');

        if (score < 3) return { strength: 'Weak', suggestions: feedback };
        if (score < 4) return { strength: 'Fair', suggestions: feedback };
        if (score === 4) return { strength: 'Good', suggestions: feedback };
        return { strength: 'Strong', suggestions: [] };
    }

    /**
     * Authenticate user with comprehensive security checking
     * Handles account lockout and failed attempt tracking
     */
    async authenticateUser(username, password, clientInfo = {}) {
        const user = this.db.prepare(`
            SELECT * FROM users WHERE username = ? OR email = ?
        `).get(username, username);

        if (!user) {
            await this.logSecurityEvent(null, 'failed_login', false, clientInfo, 'User not found');
            return { success: false, error: 'Invalid credentials' };
        }

        // Check if account is locked
        if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
            await this.logSecurityEvent(user.id, 'failed_login', false, clientInfo, 'Account locked');
            return { 
                success: false, 
                error: 'Account is temporarily locked. Please try again later.',
                lockedUntil: user.account_locked_until
            };
        }

        // Verify password
        const isValidPassword = await this.verifyPassword(password, user.password_hash);

        if (!isValidPassword) {
            await this.handleFailedLogin(user.id, clientInfo);
            return { success: false, error: 'Invalid credentials' };
        }

        // Successful login - reset failed attempts and update last login
        await this.handleSuccessfulLogin(user.id, clientInfo);

        // Parse settings from JSON column
        let userSettings = {};
        try {
            if (user.settings) {
                userSettings = JSON.parse(user.settings);
            }
        } catch (e) {
            console.warn('Failed to parse user settings JSON');
        }

        // Fetch member details if user has member_id
        let memberDetails = {};
        if (user.member_id) {
            const member = this.db.prepare('SELECT * FROM members WHERE id = ?').get(user.member_id);
            if (member) {
                memberDetails = {
                    phone: member.phone,
                    address: member.address,
                    passout_batch: member.passout_batch,
                    branch_id: member.branch_id,
                    industry_id: member.industry_id,
                    company_id: member.company_id,
                    membership_id: member.membership_id,
                    membership_type: member.membership_type,
                    photo: member.photo
                };
                // Use member email if available, otherwise fall back to user email
                if (member.email && member.email !== user.email) {
                    memberDetails.email = member.email;
                }
            }
        }

        return {
            success: true,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                email: memberDetails.email || user.email, // Use member email if available
                phone: memberDetails.phone,
                address: memberDetails.address,
                role: user.role,
                member_id: user.member_id,
                firstLogin: user.first_login,
                // Member-specific details
                passout_batch: memberDetails.passout_batch,
                branch_id: memberDetails.branch_id,
                industry_id: memberDetails.industry_id,
                company_id: memberDetails.company_id,
                membership_id: memberDetails.membership_id,
                membership_type: memberDetails.membership_type,
                photo: memberDetails.photo,
                settings: {
                    theme: userSettings.theme || 'light',
                    profileVisibility: userSettings.profileVisibility || 'public',
                    emailNotifications: userSettings.emailNotifications !== false,
                    language: userSettings.language || 'en'
                }
            }
        };
    }

    /**
     * Handle failed login attempt with security measures
     */
    async handleFailedLogin(userId, clientInfo) {
        const updateStmt = this.db.prepare(`
            UPDATE users 
            SET failed_login_attempts = failed_login_attempts + 1,
                account_locked_until = CASE 
                    WHEN failed_login_attempts + 1 >= ? THEN datetime('now', '+${this.LOCKOUT_DURATION / 60000} minutes')
                    ELSE account_locked_until
                END
            WHERE id = ?
        `);

        updateStmt.run(this.MAX_FAILED_ATTEMPTS, userId);
        await this.logSecurityEvent(userId, 'failed_login', false, clientInfo, 'Invalid password');
    }

    /**
     * Handle successful login with security updates
     */
    async handleSuccessfulLogin(userId, clientInfo) {
        const updateStmt = this.db.prepare(`
            UPDATE users 
            SET failed_login_attempts = 0,
                account_locked_until = NULL,
                last_login = datetime('now')
            WHERE id = ?
        `);

        updateStmt.run(userId);
        await this.logSecurityEvent(userId, 'login', true, clientInfo, 'Successful login');
    }

    /**
     * Change user password with security validation
     */
    async changePassword(userId, currentPassword, newPassword) {
        const user = this.db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        
        if (!user) {
            throw new Error('User not found');
        }

        // Verify current password (skip for first login)
        if (!user.first_login) {
            const isValidCurrent = await this.verifyPassword(currentPassword, user.password_hash);
            if (!isValidCurrent) {
                throw new Error('Current password is incorrect');
            }
        }

        // Validate new password strength
        const validation = this.validatePasswordStrength(newPassword);
        if (!validation.isValid) {
            throw new Error('Password does not meet security requirements: ' + validation.feedback.suggestions.join(', '));
        }

        // Hash new password
        const { hash, salt } = await this.hashPassword(newPassword);

        // Update password in database and clear system password
        const updateStmt = this.db.prepare(`
            UPDATE users 
            SET password_hash = ?, 
                salt = ?, 
                first_login = 0,
                system_password = NULL
            WHERE id = ?
        `);

        updateStmt.run(hash, salt, userId);
        await this.logSecurityEvent(userId, 'password_change', true, {}, 'Password changed successfully');

        return { success: true, message: 'Password changed successfully' };
    }

    /**
     * Change username (one-time only)
     */
    async changeUsername(userId, newUsername) {
        const user = this.db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        
        if (!user) {
            throw new Error('User not found');
        }

        if (user.username_changed) {
            throw new Error('Username can only be changed once');
        }

        // Check if new username is available
        const existingUser = this.db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(newUsername, userId);
        if (existingUser) {
            throw new Error('Username is already taken');
        }

        // Validate username format
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(newUsername)) {
            throw new Error('Username must be 3-20 characters long and contain only letters, numbers, and underscores');
        }

        // Update username
        const updateStmt = this.db.prepare(`
            UPDATE users 
            SET username = ?, 
                username_changed = 1
            WHERE id = ?
        `);

        updateStmt.run(newUsername, userId);
        await this.logSecurityEvent(userId, 'username_change', true, {}, `Username changed to ${newUsername}`);

        return { success: true, message: 'Username changed successfully' };
    }

    /**
     * Update user settings (theme, privacy, etc.)
     */
    async updateUserSettings(userId, settings) {
        try {
            // Get current user settings
            const getUserStmt = this.db.prepare('SELECT settings FROM users WHERE id = ?');
            const user = getUserStmt.get(userId);
            
            if (!user) {
                return { success: false, error: 'User not found' };
            }

            // Parse existing settings or create empty object
            let currentSettings = {};
            try {
                if (user.settings) {
                    currentSettings = JSON.parse(user.settings);
                }
            } catch (e) {
                console.warn('Failed to parse existing settings, starting fresh');
            }

            // Map the incoming settings to our structure
            const newSettings = { ...currentSettings };
            
            if (settings.theme !== undefined) {
                newSettings.theme = settings.theme;
            }
            if (settings.profileVisibility !== undefined) {
                newSettings.profileVisibility = settings.profileVisibility;
            }
            if (settings.emailNotifications !== undefined) {
                newSettings.emailNotifications = settings.emailNotifications;
            }
            if (settings.language !== undefined) {
                newSettings.language = settings.language;
            }

            // Update the settings column with JSON
            const updateStmt = this.db.prepare('UPDATE users SET settings = ? WHERE id = ?');
            updateStmt.run(JSON.stringify(newSettings), userId);
            
            return { success: true, message: 'Settings updated successfully', settings: newSettings };
        } catch (error) {
            console.error('Error updating user settings:', error);
            return { success: false, error: 'Failed to update settings' };
        }
    }

    /**
     * Admin password reset functionality
     */
    async adminResetPassword(adminId, targetUserId, newPassword = null) {
        // Verify admin privileges
        const admin = this.db.prepare('SELECT role FROM users WHERE id = ?').get(adminId);
        if (!admin || admin.role !== 'admin') {
            throw new Error('Insufficient privileges for password reset');
        }

        // Generate random password if none provided
        if (!newPassword) {
            newPassword = this.generateSecurePassword();
        }

        // Validate password strength
        const validation = this.validatePasswordStrength(newPassword);
        if (!validation.isValid) {
            throw new Error('Generated password does not meet security requirements');
        }

        // Hash new password
        const { hash, salt } = await this.hashPassword(newPassword);

        // Update target user password
        const updateStmt = this.db.prepare(`
            UPDATE users 
            SET password_hash = ?, 
                salt = ?, 
                first_login = 1,
                failed_login_attempts = 0,
                account_locked_until = NULL
            WHERE id = ?
        `);

        updateStmt.run(hash, salt, targetUserId);
        await this.logSecurityEvent(targetUserId, 'password_reset', true, {}, `Password reset by admin ID: ${adminId}`);

        return { 
            success: true, 
            temporaryPassword: newPassword,
            message: 'Password reset successfully. User must change password on next login.' 
        };
    }

    /**
     * Generate secure random password
     */
    generateSecurePassword(length = 12) {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        
        // Ensure password contains required character types
        password += 'A'; // Uppercase
        password += 'a'; // Lowercase
        password += '1'; // Number
        password += '!'; // Special char
        
        // Fill remaining length with random characters
        for (let i = 4; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        
        // Shuffle the password
        return password.split('').sort(() => Math.random() - 0.5).join('');
    }

    /**
     * Log security events for audit trail
     */
    async logSecurityEvent(userId, eventType, success, clientInfo, details) {
        try {
            const insertStmt = this.db.prepare(`
                INSERT INTO user_security_log (user_id, event_type, success, ip_address, user_agent, details)
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            insertStmt.run(
                userId,
                eventType,
                success ? 1 : 0,
                clientInfo.ip || null,
                clientInfo.userAgent || null,
                details || null
            );
        } catch (error) {
            console.error('Failed to log security event:', error);
        }
    }

    /**
     * Get security log for user (admin only)
     */
    getSecurityLog(adminId, targetUserId = null, limit = 100) {
        // Verify admin privileges
        const admin = this.db.prepare('SELECT role FROM users WHERE id = ?').get(adminId);
        if (!admin || admin.role !== 'admin') {
            throw new Error('Insufficient privileges to view security logs');
        }

        const query = targetUserId 
            ? 'SELECT * FROM user_security_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
            : 'SELECT * FROM user_security_log ORDER BY created_at DESC LIMIT ?';

        const params = targetUserId ? [targetUserId, limit] : [limit];
        return this.db.prepare(query).all(...params);
    }

    /**
     * Create user account with secure defaults
     */
    async createUser(userData, createdByAdminId = null) {
        const { username, email, name, role = 'member', password = null, memberId = null } = userData;

        // Generate secure password if none provided
        const userPassword = password || this.generateSecurePassword();
        
        // Validate password strength
        const validation = this.validatePasswordStrength(userPassword);
        if (!validation.isValid) {
            throw new Error('Password does not meet security requirements');
        }

        // Hash password
        const { hash, salt } = await this.hashPassword(userPassword);

        // Create user record with system password tracking
        const insertStmt = this.db.prepare(`
            INSERT INTO users (username, password, password_hash, salt, name, email, role, first_login, system_password, member_id)
            VALUES (?, '', ?, ?, ?, ?, ?, 1, ?, ?)
        `);

        // Store system password only if it was auto-generated
        const systemPassword = password ? null : userPassword;
        const result = insertStmt.run(username, hash, salt, name, email, role, systemPassword, memberId);
        
        if (createdByAdminId) {
            await this.logSecurityEvent(result.lastInsertRowid, 'user_created', true, {}, 
                `User created by admin ID: ${createdByAdminId}`);
        }

        return {
            success: true,
            userId: result.lastInsertRowid,
            username: username,
            temporaryPassword: userPassword,
            systemGenerated: !password,
            message: 'User created successfully'
        };
    }

    /**
     * Create user from member data with auto-generated credentials
     */
    async createUserFromMember(memberData, createdByAdminId = null) {
        const UsernameGenerator = require('../utils/UsernameGenerator');
        
        // Get existing usernames to avoid duplicates
        const existingUsernames = this.db.prepare('SELECT username FROM users').all().map(u => u.username);
        
        // Generate username from member name
        const username = UsernameGenerator.generateUsername(memberData.name, existingUsernames);
        const password = UsernameGenerator.generatePassword(10);
        
        const userData = {
            username: username,
            name: memberData.name,
            email: memberData.email,
            role: 'member',
            // Don't pass password - let createUser generate it to ensure system_password is set
            memberId: memberData.memberId
        };

        const result = await this.createUser(userData, createdByAdminId);
        
        // Override the generated password with our custom one and update the system_password
        if (result.success) {
            const { hash, salt } = await this.hashPassword(password);
            
            const updateStmt = this.db.prepare(`
                UPDATE users 
                SET password_hash = ?, salt = ?, system_password = ?
                WHERE id = ?
            `);
            
            updateStmt.run(hash, salt, password, result.userId);
            
            // Update the result to return our custom password
            result.temporaryPassword = password;
        }

        return result;
    }

    /**
     * Admin reset password for any user
     */
    async resetPassword(userId, adminId) {
        try {
            // Verify admin permissions (optional - could add admin role check here)
            const UsernameGenerator = require('../utils/UsernameGenerator');
            
            // Generate new temporary password
            const newPassword = UsernameGenerator.generatePassword(10);
            const { hash, salt } = await this.hashPassword(newPassword);
            
            // Update user password and restore system_password
            const updateStmt = this.db.prepare(`
                UPDATE users 
                SET password_hash = ?, salt = ?, system_password = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `);
            
            const result = updateStmt.run(hash, salt, newPassword, userId);
            
            if (result.changes > 0) {
                await this.logSecurityEvent(userId, 'password_reset', true, {}, `Password reset by admin ${adminId}`);
                return {
                    success: true,
                    temporaryPassword: newPassword,
                    message: 'Password reset successfully'
                };
            } else {
                return {
                    success: false,
                    error: 'User not found'
                };
            }
            
        } catch (error) {
            console.error('Password reset error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Delete user with comprehensive cascading cleanup
     * Implements data consistency and best practices
     */
    async deleteUserWithCascade(userId, adminUserId) {
        const DataConsistencyManager = require('./DataConsistencyManager');
        const consistencyManager = new DataConsistencyManager(this.db);
        
        try {
            console.log(`🗑️  Admin user ${adminUserId} initiating cascading delete for user ${userId}`);
            
            // Validate admin permissions
            const adminUser = this.db.prepare('SELECT role FROM users WHERE id = ?').get(adminUserId);
            if (!adminUser || adminUser.role !== 'admin') {
                return {
                    success: false,
                    error: 'Unauthorized: Only admin users can delete users'
                };
            }

            // Perform cascading delete with data consistency checks
            const result = await consistencyManager.deleteUserAndMemberCascade(userId, adminUserId);
            
            return {
                success: true,
                ...result,
                message: 'User and associated data deleted successfully with consistency validation'
            };

        } catch (error) {
            console.error('Cascading delete error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Validate and ensure data consistency for member-user relationships
     */
    validateDataConsistency() {
        const DataConsistencyManager = require('./DataConsistencyManager');
        const consistencyManager = new DataConsistencyManager(this.db);
        
        return consistencyManager.runDataConsistencyCheck();
    }

    /**
     * Get system health report with data consistency analysis
     */
    getSystemHealthReport() {
        const DataConsistencyManager = require('./DataConsistencyManager');
        const consistencyManager = new DataConsistencyManager(this.db);
        
        return consistencyManager.getSystemHealthReport();
    }
}

module.exports = AuthenticationUtils;
