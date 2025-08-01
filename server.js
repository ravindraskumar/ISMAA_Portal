/**
 * server.js - ISMAA Bengaluru Portal Express.js Server
 * 
 * This is the main backend server providing REST API endpoints for:
 * - Member management (CRUD operations)
 * - Lookup tables (branches, industries, companies)
 * - Blog and notice content management
 * - User authentication
 * - Database statistics
 * 
 * Key Features:
 * - SQLite database integration via DatabaseAPI
 * - CORS enabled for React frontend
 * - JSON parsing with large payload support (base64 images)
 * - Centralized error handling
 * - Health check endpoint for monitoring
 * - Graceful shutdown handling
 * 
 * Dependencies: express, cors, DatabaseAPI
 * Port: 3001 (configurable)
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const DatabaseAPI = require('./src/database/DatabaseAPI');

class ISMAAServer {
    constructor(port = 3001) {
        this.app = express();
        this.port = port;
        this.dbAPI = new DatabaseAPI(); // High-level database operations interface
    }

    // Initialize server with database connection and middleware
    async initialize() {
        // Initialize database connection first (required for all operations)
        await this.dbAPI.initialize();
        
        // Configure Express middleware
        this.app.use(cors()); // Enable CORS for React frontend communication
        this.app.use(express.json({ limit: '10mb' })); // Parse JSON with large limit for base64 images
        this.app.use(express.urlencoded({ extended: true })); // Parse URL-encoded data
        
        // Setup all API routes
        this.setupRoutes();
        
        // Add global error handling middleware (must be last)
        this.app.use(this.errorHandler);
    }

    // Define all API endpoints and their handlers
    setupRoutes() {
        // ===== SYSTEM ENDPOINTS =====
        // Health check endpoint for monitoring and load balancers
        this.app.get('/health', (req, res) => {
            res.json({ status: 'OK', database: 'SQLite', timestamp: new Date().toISOString() });
        });

        // ===== MEMBER ENDPOINTS =====
        // Get all members with their relationships (branch, industry, company, skills)
        this.app.get('/members', async (req, res) => {
            try {
                const members = this.dbAPI.getAllMembers();
                res.json(members);
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch members', details: error.message });
            }
        });

        // Get specific member by ID (supports both legacy and new IDs)
        this.app.get('/members/:id', async (req, res) => {
            try {
                const member = this.dbAPI.getMemberById(req.params.id);
                if (!member) {
                    return res.status(404).json({ error: 'Member not found' });
                }
                res.json(member);
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch member', details: error.message });
            }
        });

        // Create new member - Admin only
        this.app.post('/members', async (req, res) => {
            try {
                // Note: In a production app, you would validate user session/token here
                // For now, we rely on frontend access control
                
                // Create member first
                const memberResult = this.dbAPI.createMember(req.body);
                const newMember = this.dbAPI.getMemberById(memberResult.id);
                
                // Create user account for the member with auto-generated credentials
                let userCredentials = null;
                try {
                    const memberData = {
                        name: newMember.name,
                        email: newMember.email,
                        memberId: newMember.id
                    };
                    
                    userCredentials = await this.dbAPI.createUserFromMember(memberData);
                    
                    // Log user creation for audit
                    console.log(`✅ User account created for member: ${newMember.name}`);
                    console.log(`   Username: ${userCredentials.username}`);
                    console.log(`   Password: ${userCredentials.temporaryPassword}`);
                    
                } catch (userError) {
                    console.error('Failed to create user account for member:', userError.message);
                    // Don't fail the member creation if user creation fails
                }
                
                // Return member data with user credentials if created
                const response = {
                    ...newMember,
                    userAccount: userCredentials ? {
                        username: userCredentials.username,
                        password: userCredentials.temporaryPassword,
                        systemGenerated: userCredentials.systemGenerated
                    } : null
                };
                
                res.status(201).json(response);
            } catch (error) {
                res.status(400).json({ error: 'Failed to create member', details: error.message });
            }
        });

        // Update member - Admin or own profile only
        this.app.put('/members/:id', async (req, res) => {
            try {
                // Note: In a production app, you would validate user session/token here
                // For now, we rely on frontend access control
                
                const result = this.dbAPI.updateMember(req.params.id, req.body);
                if (!result.updated) {
                    return res.status(404).json({ error: 'Member not found' });
                }
                const updatedMember = this.dbAPI.getMemberById(req.params.id);
                res.json(updatedMember);
            } catch (error) {
                res.status(400).json({ error: 'Failed to update member', details: error.message });
            }
        });

        this.app.delete('/members/:id', async (req, res) => {
            try {
                // Enhanced member deletion with consistency checks
                const adminUserId = req.user?.id; // Assume user ID is available from auth middleware
                const result = this.dbAPI.deleteMember(req.params.id, adminUserId);
                
                if (!result.success) {
                    if (result.hasUser) {
                        return res.status(400).json({ 
                            error: result.error,
                            hasUser: true,
                            userId: result.userId,
                            username: result.username,
                            message: 'Use user deletion endpoint for members with user accounts'
                        });
                    }
                    return res.status(404).json({ error: result.error });
                }
                
                res.json({ 
                    message: result.message,
                    deletedMember: result.deletedMember,
                    success: true
                });
            } catch (error) {
                res.status(500).json({ error: 'Failed to delete member', details: error.message });
            }
        });

        // New endpoint for cascading user deletion
        this.app.delete('/users/:id', async (req, res) => {
            try {
                const adminUserId = req.user?.id; // Assume user ID is available from auth middleware
                
                if (!adminUserId) {
                    return res.status(401).json({ error: 'Authentication required' });
                }
                
                const result = await this.dbAPI.auth.deleteUserWithCascade(req.params.id, adminUserId);
                
                if (!result.success) {
                    return res.status(400).json({ error: result.error });
                }
                
                res.json({
                    message: result.message,
                    deletedUser: result.deletedUser,
                    deletedMember: result.deletedMember,
                    consistencyCheck: result.consistencyCheck,
                    success: true
                });
            } catch (error) {
                res.status(500).json({ error: 'Failed to delete user', details: error.message });
            }
        });

        // System health and consistency endpoints
        this.app.get('/system/health', async (req, res) => {
            try {
                const healthReport = this.dbAPI.auth.getSystemHealthReport();
                res.json(healthReport);
            } catch (error) {
                res.status(500).json({ error: 'Failed to get system health', details: error.message });
            }
        });

        this.app.get('/system/consistency-check', async (req, res) => {
            try {
                const consistencyResults = this.dbAPI.auth.validateDataConsistency();
                res.json(consistencyResults);
            } catch (error) {
                res.status(500).json({ error: 'Failed to run consistency check', details: error.message });
            }
        });

        // Lookup tables routes (for dynamic dropdowns)
        this.app.get('/branches', async (req, res) => {
            try {
                const branches = this.dbAPI.getBranches();
                res.json(branches);
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch branches', details: error.message });
            }
        });

        this.app.get('/industries', async (req, res) => {
            try {
                const industries = this.dbAPI.getIndustries();
                res.json(industries);
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch industries', details: error.message });
            }
        });

        this.app.get('/companies', async (req, res) => {
            try {
                const companies = this.dbAPI.getCompanies();
                res.json(companies);
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch companies', details: error.message });
            }
        });

        // ===== AUTHENTICATION & USER MANAGEMENT ENDPOINTS =====
        
        // User authentication - enhanced with security features
        this.app.post('/auth/login', async (req, res) => {
            try {
                const { username, password } = req.body;
                
                if (!username || !password) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Username and password are required' 
                    });
                }

                // Collect client information for security logging
                const clientInfo = {
                    ip: req.ip || req.connection.remoteAddress,
                    userAgent: req.get('User-Agent')
                };

                const result = await this.dbAPI.authenticateUser(username, password, clientInfo);
                
                if (result.success) {
                    res.json(result);
                } else {
                    res.status(401).json(result);
                }
            } catch (error) {
                res.status(500).json({ 
                    success: false, 
                    error: 'Authentication failed', 
                    details: error.message 
                });
            }
        });

        // Change password endpoint
        this.app.post('/auth/change-password', async (req, res) => {
            try {
                const { userId, currentPassword, newPassword } = req.body;
                
                if (!userId || !newPassword) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'User ID and new password are required' 
                    });
                }

                const result = await this.dbAPI.changePassword(userId, currentPassword, newPassword);
                res.json(result);
            } catch (error) {
                res.status(400).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        });

        // Change username endpoint (one-time only)
        this.app.post('/auth/change-username', async (req, res) => {
            try {
                const { userId, newUsername } = req.body;
                
                if (!userId || !newUsername) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'User ID and new username are required' 
                    });
                }

                const result = await this.dbAPI.changeUsername(userId, newUsername);
                res.json(result);
            } catch (error) {
                res.status(400).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        });

        // Update user settings
        this.app.put('/auth/settings/:userId', async (req, res) => {
            try {
                const userId = req.params.userId;
                const settings = req.body;

                const result = await this.dbAPI.updateUserSettings(userId, settings);
                res.json(result);
            } catch (error) {
                res.status(400).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        });

        // Get user profile
        this.app.get('/auth/profile/:userId', async (req, res) => {
            try {
                const userId = req.params.userId;
                const user = this.dbAPI.getUserById(userId);
                
                if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                }

                // Remove sensitive information
                const { password_hash, salt, ...safeUser } = user;
                res.json(safeUser);
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch user profile', details: error.message });
            }
        });

        // Update user profile
        this.app.put('/auth/profile/:userId', async (req, res) => {
            try {
                const userId = req.params.userId;
                const profileData = req.body;

                const result = this.dbAPI.updateUserProfile(userId, profileData);
                res.json(result);
            } catch (error) {
                res.status(400).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        });

        // Check username availability
        this.app.get('/auth/check-username/:username', async (req, res) => {
            try {
                const { username } = req.params;
                const { excludeUserId } = req.query;
                
                const isAvailable = this.dbAPI.isUsernameAvailable(username, excludeUserId);
                res.json({ available: isAvailable });
            } catch (error) {
                res.status(500).json({ error: 'Failed to check username availability', details: error.message });
            }
        });

        // Check email availability
        this.app.get('/auth/check-email/:email', async (req, res) => {
            try {
                const { email } = req.params;
                const { excludeUserId } = req.query;
                
                const isAvailable = this.dbAPI.isEmailAvailable(email, excludeUserId);
                res.json({ available: isAvailable });
            } catch (error) {
                res.status(500).json({ error: 'Failed to check email availability', details: error.message });
            }
        });

        // ===== ADMIN-ONLY USER MANAGEMENT ENDPOINTS =====

        // Get all users (admin only)
        this.app.get('/admin/users/:adminId', async (req, res) => {
            try {
                const adminId = req.params.adminId;
                const users = this.dbAPI.getAllUsers(adminId);
                res.json(users);
            } catch (error) {
                res.status(403).json({ error: error.message });
            }
        });

        // Create new user (admin only)
        this.app.post('/admin/users', async (req, res) => {
            try {
                const { adminId, userData } = req.body;
                
                if (!adminId || !userData) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Admin ID and user data are required' 
                    });
                }

                const result = await this.dbAPI.createUser(userData, adminId);
                res.status(201).json(result);
            } catch (error) {
                res.status(400).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        });

        // Admin password reset
        this.app.post('/admin/reset-password', async (req, res) => {
            try {
                const { adminId, targetUserId, newPassword } = req.body;
                
                if (!adminId || !targetUserId) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Admin ID and target user ID are required' 
                    });
                }

                const result = await this.dbAPI.adminResetPassword(adminId, targetUserId, newPassword);
                res.json(result);
            } catch (error) {
                res.status(403).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        });

        // Get security log (admin only)
        this.app.get('/admin/security-log/:adminId', async (req, res) => {
            try {
                const adminId = req.params.adminId;
                const { targetUserId, limit } = req.query;
                
                const logs = this.dbAPI.getSecurityLog(adminId, targetUserId, limit);
                res.json(logs);
            } catch (error) {
                res.status(403).json({ error: error.message });
            }
        });

        // ===== PRIVACY SETTINGS ENDPOINTS =====

        // Get user privacy settings
        this.app.get('/privacy/:userId', async (req, res) => {
            try {
                const userId = req.params.userId;
                const settings = this.dbAPI.getUserPrivacySettings(userId);
                
                if (!settings) {
                    return res.status(404).json({ error: 'User not found' });
                }
                
                res.json(settings);
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch privacy settings', details: error.message });
            }
        });

        // Update user privacy settings
        this.app.put('/privacy/:userId', async (req, res) => {
            try {
                const userId = req.params.userId;
                const privacySettings = req.body;

                const result = this.dbAPI.updateUserPrivacySettings(userId, privacySettings);
                res.json(result);
            } catch (error) {
                res.status(400).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        });

        // Blogs routes
        this.app.get('/blogs', async (req, res) => {
            try {
                const blogs = this.dbAPI.getAllBlogs();
                res.json(blogs);
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch blogs', details: error.message });
            }
        });

        this.app.post('/blogs', async (req, res) => {
            try {
                const result = this.dbAPI.createBlog(req.body);
                res.status(201).json(result);
            } catch (error) {
                res.status(500).json({ error: 'Failed to create blog', details: error.message });
            }
        });

        this.app.put('/blogs/:id', async (req, res) => {
            try {
                const result = this.dbAPI.updateBlog(req.params.id, req.body);
                if (result.updated) {
                    res.json(result);
                } else {
                    res.status(404).json({ error: 'Blog not found' });
                }
            } catch (error) {
                res.status(500).json({ error: 'Failed to update blog', details: error.message });
            }
        });

        this.app.delete('/blogs/:id', async (req, res) => {
            try {
                const result = this.dbAPI.deleteBlog(req.params.id);
                if (result.deleted) {
                    res.json({ message: 'Blog deleted successfully', id: req.params.id });
                } else {
                    res.status(404).json({ error: 'Blog not found' });
                }
            } catch (error) {
                res.status(500).json({ error: 'Failed to delete blog', details: error.message });
            }
        });

        // Notices routes
        this.app.get('/notices', async (req, res) => {
            try {
                const notices = this.dbAPI.getAllNotices();
                res.json(notices);
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch notices', details: error.message });
            }
        });

        this.app.post('/notices', async (req, res) => {
            try {
                const result = this.dbAPI.createNotice(req.body);
                res.status(201).json(result);
            } catch (error) {
                res.status(500).json({ error: 'Failed to create notice', details: error.message });
            }
        });

        this.app.put('/notices/:id', async (req, res) => {
            try {
                const result = this.dbAPI.updateNotice(req.params.id, req.body);
                if (result.updated) {
                    res.json(result);
                } else {
                    res.status(404).json({ error: 'Notice not found' });
                }
            } catch (error) {
                res.status(500).json({ error: 'Failed to update notice', details: error.message });
            }
        });

        this.app.delete('/notices/:id', async (req, res) => {
            try {
                const result = this.dbAPI.deleteNotice(req.params.id);
                if (result.deleted) {
                    res.json({ message: 'Notice deleted successfully', id: req.params.id });
                } else {
                    res.status(404).json({ error: 'Notice not found' });
                }
            } catch (error) {
                res.status(500).json({ error: 'Failed to delete notice', details: error.message });
            }
        });

        // Database statistics route
        this.app.get('/stats', async (req, res) => {
            try {
                const stats = this.dbAPI.dbManager.getStats();
                res.json(stats);
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
            }
        });

        // ===== HEALTH SYSTEM ENDPOINTS =====
        
        // Comprehensive health analysis
        this.app.post('/api/health/comprehensive-analysis', async (req, res) => {
            try {
                const { spawn } = require('child_process');
                const path = require('path');
                
                // Run the integrated health system
                const healthProcess = spawn('node', ['-e', `
                    const IntegratedHealthSystem = require('./utilities/integrated_health_system');
                    const healthSystem = new IntegratedHealthSystem();
                    healthSystem.runComprehensiveAnalysis()
                        .then(results => {
                            console.log(JSON.stringify(results));
                        })
                        .catch(error => {
                            console.error(JSON.stringify({ error: error.message }));
                        });
                `], { cwd: __dirname });

                let output = '';
                let errorOutput = '';

                healthProcess.stdout.on('data', (data) => {
                    output += data.toString();
                });

                healthProcess.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });

                healthProcess.on('close', (code) => {
                    if (code === 0) {
                        try {
                            const results = JSON.parse(output.trim().split('\\n').pop());
                            res.json(results);
                        } catch (parseError) {
                            res.status(500).json({ error: 'Failed to parse health analysis results' });
                        }
                    } else {
                        console.error('Health analysis failed:', errorOutput);
                        res.status(500).json({ error: 'Health analysis failed', details: errorOutput });
                    }
                });

            } catch (error) {
                res.status(500).json({ error: 'Failed to run health analysis', details: error.message });
            }
        });

        // Run specific test category
        this.app.post('/api/health/run-tests', async (req, res) => {
            try {
                const { category } = req.body;
                const { spawn } = require('child_process');
                
                // Run specific test category using unified test suite
                const testProcess = spawn('node', ['-e', `
                    const UnifiedTestSuite = require('./tests/unified-test-suite');
                    const testSuite = new UnifiedTestSuite();
                    testSuite.runTestsForHealthSystem()
                        .then(results => {
                            console.log(JSON.stringify(results));
                        })
                        .catch(error => {
                            console.error(JSON.stringify({ error: error.message }));
                        });
                `], { cwd: __dirname });

                let output = '';
                let errorOutput = '';

                testProcess.stdout.on('data', (data) => {
                    output += data.toString();
                });

                testProcess.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });

                testProcess.on('close', (code) => {
                    try {
                        const lines = output.trim().split('\\n');
                        const jsonLine = lines.find(line => line.startsWith('{'));
                        if (jsonLine) {
                            const results = JSON.parse(jsonLine);
                            res.json({ testResults: results });
                        } else {
                            res.json({ 
                                testResults: { 
                                    summary: { total: 0, passed: 0, failed: 0, errors: 1 },
                                    failedTests: [],
                                    errorTests: ['Test execution failed']
                                }
                            });
                        }
                    } catch (parseError) {
                        res.status(500).json({ error: 'Failed to parse test results' });
                    }
                });

            } catch (error) {
                res.status(500).json({ error: 'Failed to run tests', details: error.message });
            }
        });

        // Run specific maintenance function
        this.app.post('/api/maintenance/run-function', async (req, res) => {
            try {
                const { functionName } = req.body;
                const { spawn } = require('child_process');
                
                // Run specific maintenance function
                const maintenanceProcess = spawn('node', ['-e', `
                    const MasterMaintenanceTool = require('./utilities/master_maintenance_tool');
                    const maintenanceTool = new MasterMaintenanceTool();
                    
                    async function runFunction() {
                        try {
                            await maintenanceTool.initialize();
                            
                            let result;
                            switch('${functionName}') {
                                case 'performHealthCheck':
                                    result = await maintenanceTool.performHealthCheck();
                                    break;
                                case 'fixIssues':
                                    result = await maintenanceTool.fixIssues();
                                    break;
                                case 'cleanupOrphanedRecords':
                                    result = await maintenanceTool.cleanupOrphanedRecords();
                                    break;
                                case 'inspectDatabaseSchema':
                                    result = await maintenanceTool.inspectDatabaseSchema();
                                    break;
                                case 'performSystemVerification':
                                    result = await maintenanceTool.performSystemVerification();
                                    break;
                                case 'deepCleanup':
                                    result = await maintenanceTool.deepCleanup();
                                    break;
                                default:
                                    result = { error: 'Unknown function: ${functionName}' };
                            }
                            
                            console.log(JSON.stringify({
                                results: {
                                    issuesFound: result.issuesFound || result.issues?.length || 0,
                                    issuesResolved: result.issuesResolved || result.resolved?.length || 0,
                                    healthCheckPassed: result.status === 'HEALTHY' || result.overall === 'HEALTHY',
                                    details: result
                                }
                            }));
                        } catch (error) {
                            console.error(JSON.stringify({ error: error.message }));
                        }
                    }
                    
                    runFunction();
                `], { cwd: __dirname });

                let output = '';
                let errorOutput = '';

                maintenanceProcess.stdout.on('data', (data) => {
                    output += data.toString();
                });

                maintenanceProcess.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });

                maintenanceProcess.on('close', (code) => {
                    try {
                        const lines = output.trim().split('\\n');
                        const jsonLine = lines.find(line => line.startsWith('{'));
                        if (jsonLine) {
                            const results = JSON.parse(jsonLine);
                            res.json(results);
                        } else {
                            res.json({ 
                                results: { 
                                    issuesFound: 0,
                                    issuesResolved: 0,
                                    healthCheckPassed: false,
                                    details: { error: 'No results returned' }
                                }
                            });
                        }
                    } catch (parseError) {
                        res.status(500).json({ error: 'Failed to parse maintenance results' });
                    }
                });

            } catch (error) {
                res.status(500).json({ error: 'Failed to run maintenance function', details: error.message });
            }
        });
    }

    errorHandler(error, req, res, next) {
        console.error('Server Error:', error);
        res.status(500).json({ 
            error: 'Internal Server Error', 
            details: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    }

    async start() {
        try {
            await this.initialize();
            
            this.server = this.app.listen(this.port, () => {
                console.log('🚀 ISMAA Bengaluru Portal Backend Server');
                console.log('==========================================');
                console.log(`✅ Server running on http://localhost:${this.port}`);
                console.log('📊 Database: SQLite with ACID compliance');
                console.log('🔄 API endpoints ready');
                console.log('💡 Try: http://localhost:3001/health');
            });
            
            // Graceful shutdown
            process.on('SIGTERM', () => this.shutdown());
            process.on('SIGINT', () => this.shutdown());
            
        } catch (error) {
            console.error('❌ Failed to start server:', error);
            process.exit(1);
        }
    }

    async shutdown() {
        console.log('\n🔄 Shutting down server...');
        
        if (this.server) {
            this.server.close();
        }
        
        if (this.dbAPI) {
            this.dbAPI.close();
        }
        
        console.log('✅ Server shut down complete');
        process.exit(0);
    }
}

// Start server if this file is run directly
if (require.main === module) {
    const server = new ISMAAServer();
    server.start();
}

module.exports = ISMAAServer;
