#!/usr/bin/env node

/**
 * ISMAA Portal - Master Maintenance Tool
 * ======================================
 * 
 * Comprehensive maintenance and operational issue resolution tool that consolidates
 * all essential utility functions for keeping the application and database consistent.
 * 
 * Features:
 * - Data consistency validation and repair
 * - System health monitoring and reporting
 * - Orphaned data cleanup
 * - Database integrity verification
 * - Access control validation
 * - User-member relationship management
 * - Comprehensive system diagnostics
 * 
 * Usage:
 *   node utilities/master_maintenance_tool.js [options]
 * 
 * Options:
 *   --check-only     Run diagnostics without making changes
 *   --fix-issues     Automatically fix detected issues
 *   --deep-clean     Perform comprehensive cleanup
 *   --health-report  Generate detailed system health report
 *   --help           Show this help message
 */

const path = require('path');
const sqlite3 = require('better-sqlite3');
const fs = require('fs');

// Import core system modules
const DatabaseManager = require('../src/database/DatabaseManager');
const DataConsistencyManager = require('../src/database/DataConsistencyManager');
const AuthenticationUtils = require('../src/database/AuthenticationUtils');
const DatabaseAPI = require('../src/database/DatabaseAPI');
const DatabaseCleanup = require('../src/database/cleanup');

class MasterMaintenanceTool {
    constructor() {
        this.db = null;
        this.dbManager = null;
        this.consistencyManager = null;
        this.authUtils = null;
        this.dbAPI = null;
        this.cleanup = null;
        this.issues = [];
        this.fixes = [];
        this.stats = {};
    }

    async initialize() {
        console.log('🔧 MASTER MAINTENANCE TOOL');
        console.log('=' .repeat(50));
        console.log('Initializing system components...\n');

        try {
            // Initialize database manager
            this.dbManager = new DatabaseManager();
            await this.dbManager.initialize();
            this.db = this.dbManager.getDatabase();

            // Initialize core components
            this.consistencyManager = new DataConsistencyManager(this.db);
            this.authUtils = new AuthenticationUtils(this.db);
            this.dbAPI = new DatabaseAPI();
            await this.dbAPI.initialize();
            this.cleanup = new DatabaseCleanup();
            await this.cleanup.initialize();

            console.log('✅ All components initialized successfully\n');
            return true;
        } catch (error) {
            console.error('❌ Initialization failed:', error.message);
            return false;
        }
    }

    /**
     * Database Schema Inspection
     */
    async inspectDatabaseSchema() {
        console.log('\n🔍 DATABASE SCHEMA INSPECTION');
        console.log('-'.repeat(35));

        try {
            // Check users table structure
            console.log('📋 USERS TABLE STRUCTURE:');
            const usersSchema = this.db.prepare("PRAGMA table_info(users)").all();
            usersSchema.forEach(col => {
                console.log(`   ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
            });

            // Check members table structure
            console.log('\n📋 MEMBERS TABLE STRUCTURE:');
            const membersSchema = this.db.prepare("PRAGMA table_info(members)").all();
            membersSchema.forEach(col => {
                console.log(`   ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
            });

            // Check foreign key relationships
            console.log('\n🔗 FOREIGN KEY RELATIONSHIPS:');
            const usersForeignKeys = this.db.prepare("PRAGMA foreign_key_list(users)").all();
            const membersForeignKeys = this.db.prepare("PRAGMA foreign_key_list(members)").all();
            
            console.log(`   Users table foreign keys: ${usersForeignKeys.length}`);
            usersForeignKeys.forEach(fk => {
                console.log(`      ${fk.from} → ${fk.table}.${fk.to}`);
            });
            
            console.log(`   Members table foreign keys: ${membersForeignKeys.length}`);
            membersForeignKeys.forEach(fk => {
                console.log(`      ${fk.from} → ${fk.table}.${fk.to}`);
            });

            // Sample data inspection
            console.log('\n📊 SAMPLE DATA:');
            const sampleUsers = this.db.prepare("SELECT id, username, name, member_id FROM users LIMIT 3").all();
            const sampleMembers = this.db.prepare("SELECT id, name, email FROM members LIMIT 3").all();
            
            console.log('   Sample Users:');
            sampleUsers.forEach(user => {
                console.log(`      ${user.id}: ${user.username} (${user.name}) → Member ID: ${user.member_id || 'NULL'}`);
            });
            
            console.log('   Sample Members:');
            sampleMembers.forEach(member => {
                console.log(`      ${member.id}: ${member.name} - ${member.email || 'No email'}`);
            });

            return true;
        } catch (error) {
            console.error('❌ Schema inspection failed:', error.message);
            return false;
        }
    }

    /**
     * System Integration Verification
     */
    async performSystemVerification() {
        console.log('\n🔬 SYSTEM INTEGRATION VERIFICATION');
        console.log('-'.repeat(40));

        let testsPassed = 0;
        let totalTests = 0;

        const runTest = (testName, condition) => {
            totalTests++;
            if (condition) {
                console.log(`✅ ${testName}`);
                testsPassed++;
            } else {
                console.log(`❌ ${testName}`);
            }
        };

        try {
            console.log('\n🏆 SYSTEM CAPABILITIES VERIFICATION:');
            console.log('─'.repeat(45));

            // Test core system functionality
            runTest('Database connectivity', this.db !== null);
            runTest('DataConsistencyManager available', this.consistencyManager !== null);
            runTest('AuthenticationUtils available', this.authUtils !== null);
            runTest('DatabaseAPI available', this.dbAPI !== null);

            // Test data consistency capabilities
            runTest('Data consistency check functionality', typeof this.consistencyManager.runDataConsistencyCheck === 'function');
            runTest('System health monitoring', typeof this.authUtils.getSystemHealthReport === 'function');
            runTest('Cascading delete functionality', typeof this.authUtils.deleteUserWithCascade === 'function');

            // Test database integrity
            const userCount = this.db.prepare('SELECT COUNT(*) as count FROM users').get().count;
            const memberCount = this.db.prepare('SELECT COUNT(*) as count FROM members').get().count;
            runTest('Users table has data', userCount > 0);
            runTest('Members table has data', memberCount > 0);

            // Test user-member relationships
            const linkedUsers = this.db.prepare('SELECT COUNT(*) as count FROM users WHERE member_id IS NOT NULL').get().count;
            runTest('User-member linkages exist', linkedUsers > 0);

            // Test lookup tables
            const branchCount = this.db.prepare('SELECT COUNT(*) as count FROM branches').get().count;
            const companyCount = this.db.prepare('SELECT COUNT(*) as count FROM companies').get().count;
            const industryCount = this.db.prepare('SELECT COUNT(*) as count FROM industries').get().count;
            runTest('Lookup tables populated', branchCount > 0 && companyCount > 0 && industryCount > 0);

            console.log(`\n📈 VERIFICATION RESULTS:`);
            console.log(`   Tests Passed: ${testsPassed}/${totalTests}`);
            console.log(`   Success Rate: ${((testsPassed / totalTests) * 100).toFixed(1)}%`);

            return {
                passed: testsPassed,
                total: totalTests,
                successRate: (testsPassed / totalTests) * 100
            };

        } catch (error) {
            console.error('❌ System verification failed:', error.message);
            return { passed: 0, total: totalTests, successRate: 0 };
        }
    }

    /**
     * Comprehensive System Health Check
     */
    async performHealthCheck() {
        console.log('🏥 SYSTEM HEALTH CHECK');
        console.log('-'.repeat(30));

        const health = {
            timestamp: new Date().toISOString(),
            overall: 'HEALTHY',
            issues: [],
            recommendations: [],
            statistics: {}
        };

        try {
            // 1. Database connectivity
            const userCount = this.db.prepare('SELECT COUNT(*) as count FROM users').get().count;
            const memberCount = this.db.prepare('SELECT COUNT(*) as count FROM members').get().count;
            
            health.statistics = {
                users: userCount,
                members: memberCount,
                linkedUsers: this.db.prepare('SELECT COUNT(*) as count FROM users WHERE member_id IS NOT NULL').get().count,
                unlinkedUsers: this.db.prepare('SELECT COUNT(*) as count FROM users WHERE member_id IS NULL').get().count
            };

            console.log(`📊 Users: ${health.statistics.users}`);
            console.log(`📊 Members: ${health.statistics.members}`);
            console.log(`📊 Linked Users: ${health.statistics.linkedUsers}`);
            console.log(`📊 Unlinked Users: ${health.statistics.unlinkedUsers}`);

            // 2. Data consistency check
            const consistencyResults = this.consistencyManager.runDataConsistencyCheck();
            if (consistencyResults.status !== 'PASSED') {
                health.overall = 'ISSUES_DETECTED';
                health.issues.push(...consistencyResults.issues);
                this.issues.push(...consistencyResults.issues);
            }

            // 3. Ghost records detection
            const ghostRecords = this.db.prepare(`
                SELECT u.id, u.username, u.member_id
                FROM users u
                LEFT JOIN members m ON u.member_id = m.id
                WHERE u.member_id IS NOT NULL AND m.id IS NULL
            `).all();

            if (ghostRecords.length > 0) {
                health.overall = 'ISSUES_DETECTED';
                health.issues.push({
                    type: 'GHOST_RECORDS',
                    count: ghostRecords.length,
                    description: 'Users with invalid member references'
                });
                this.issues.push({
                    type: 'GHOST_RECORDS',
                    records: ghostRecords
                });
            }

            // 4. Orphaned data check
            const orphanedBranches = this.db.prepare(`
                SELECT b.id, b.name FROM branches b
                LEFT JOIN members m ON b.id = m.branch_id
                WHERE m.branch_id IS NULL
            `).all();

            const orphanedCompanies = this.db.prepare(`
                SELECT c.id, c.name FROM companies c
                LEFT JOIN members m ON c.id = m.company_id
                WHERE m.company_id IS NULL
            `).all();

            const orphanedIndustries = this.db.prepare(`
                SELECT i.id, i.name FROM industries i
                LEFT JOIN members m ON i.id = m.industry_id
                WHERE m.industry_id IS NULL
            `).all();

            const orphanedSkills = this.db.prepare(`
                SELECT s.id, s.name FROM skills s
                LEFT JOIN member_skills ms ON s.id = ms.skill_id
                WHERE ms.skill_id IS NULL
            `).all();

            const totalOrphaned = orphanedBranches.length + orphanedCompanies.length + 
                                orphanedIndustries.length + orphanedSkills.length;

            if (totalOrphaned > 0) {
                health.issues.push({
                    type: 'ORPHANED_DATA',
                    count: totalOrphaned,
                    breakdown: {
                        branches: orphanedBranches.length,
                        companies: orphanedCompanies.length,
                        industries: orphanedIndustries.length,
                        skills: orphanedSkills.length
                    }
                });
                this.issues.push({
                    type: 'ORPHANED_DATA',
                    data: { orphanedBranches, orphanedCompanies, orphanedIndustries, orphanedSkills }
                });
            }

            // 5. Generate recommendations
            if (health.issues.length > 0) {
                health.recommendations.push('Run --fix-issues to automatically resolve detected problems');
            }
            if (totalOrphaned > 10) {
                health.recommendations.push('Consider running --deep-clean for comprehensive cleanup');
            }
            if (health.statistics.unlinkedUsers > 0) {
                health.recommendations.push('Review unlinked users - may need member profile creation');
            }

            console.log(`\n🎯 Overall Status: ${health.overall}`);
            console.log(`🔍 Issues Found: ${health.issues.length}`);
            
            if (health.recommendations.length > 0) {
                console.log('\n💡 Recommendations:');
                health.recommendations.forEach(rec => console.log(`   • ${rec}`));
            }

            this.stats.healthCheck = health;
            return health;

        } catch (error) {
            console.error('❌ Health check failed:', error.message);
            health.overall = 'ERROR';
            health.issues.push({ type: 'SYSTEM_ERROR', message: error.message });
            return health;
        }
    }

    /**
     * Automatic Issue Resolution
     */
    async fixIssues() {
        console.log('\n🔧 AUTOMATIC ISSUE RESOLUTION');
        console.log('-'.repeat(35));

        let fixedCount = 0;

        try {
            // Fix ghost records
            const ghostIssue = this.issues.find(issue => issue.type === 'GHOST_RECORDS');
            if (ghostIssue) {
                console.log('🧹 Cleaning up ghost records...');
                for (const ghostUser of ghostIssue.records) {
                    try {
                        const deleted = this.db.prepare('DELETE FROM users WHERE id = ?').run(ghostUser.id);
                        if (deleted.changes > 0) {
                            console.log(`   ✅ Removed ghost user: ${ghostUser.username}`);
                            fixedCount++;
                            this.fixes.push(`Removed ghost user: ${ghostUser.username}`);
                        }
                    } catch (error) {
                        console.log(`   ❌ Failed to remove ${ghostUser.username}: ${error.message}`);
                    }
                }
            }

            // Fix orphaned data
            const orphanedIssue = this.issues.find(issue => issue.type === 'ORPHANED_DATA');
            if (orphanedIssue) {
                console.log('🧹 Cleaning up orphaned data...');
                const { orphanedBranches, orphanedCompanies, orphanedIndustries, orphanedSkills } = orphanedIssue.data;

                // Remove orphaned branches
                for (const branch of orphanedBranches) {
                    const deleted = this.db.prepare('DELETE FROM branches WHERE id = ?').run(branch.id);
                    if (deleted.changes > 0) {
                        console.log(`   ✅ Removed orphaned branch: ${branch.name}`);
                        fixedCount++;
                        this.fixes.push(`Removed orphaned branch: ${branch.name}`);
                    }
                }

                // Remove orphaned companies
                for (const company of orphanedCompanies) {
                    const deleted = this.db.prepare('DELETE FROM companies WHERE id = ?').run(company.id);
                    if (deleted.changes > 0) {
                        console.log(`   ✅ Removed orphaned company: ${company.name}`);
                        fixedCount++;
                        this.fixes.push(`Removed orphaned company: ${company.name}`);
                    }
                }

                // Remove orphaned industries
                for (const industry of orphanedIndustries) {
                    const deleted = this.db.prepare('DELETE FROM industries WHERE id = ?').run(industry.id);
                    if (deleted.changes > 0) {
                        console.log(`   ✅ Removed orphaned industry: ${industry.name}`);
                        fixedCount++;
                        this.fixes.push(`Removed orphaned industry: ${industry.name}`);
                    }
                }

                // Remove orphaned skills
                for (const skill of orphanedSkills) {
                    const deleted = this.db.prepare('DELETE FROM skills WHERE id = ?').run(skill.id);
                    if (deleted.changes > 0) {
                        console.log(`   ✅ Removed orphaned skill: ${skill.name}`);
                        fixedCount++;
                        this.fixes.push(`Removed orphaned skill: ${skill.name}`);
                    }
                }
            }

            console.log(`\n✨ Fixed ${fixedCount} issues automatically`);
            return fixedCount;

        } catch (error) {
            console.error('❌ Issue resolution failed:', error.message);
            return 0;
        }
    }

    /**
     * Deep System Cleanup
     */
    async performDeepClean() {
        console.log('\n🚿 DEEP SYSTEM CLEANUP');
        console.log('-'.repeat(25));

        try {
            console.log('Running comprehensive database cleanup...');
            await this.cleanup.runCleanup({ dryRun: false, skipVacuum: false });
            console.log('✅ Deep cleanup completed');
            return true;
        } catch (error) {
            console.error('❌ Deep cleanup failed:', error.message);
            return false;
        }
    }

    /**
     * Generate Comprehensive Report
     */
    generateReport() {
        console.log('\n📊 COMPREHENSIVE SYSTEM REPORT');
        console.log('='.repeat(40));

        const report = {
            timestamp: new Date().toISOString(),
            systemHealth: this.stats.healthCheck,
            issuesFixed: this.fixes,
            summary: {
                totalIssuesFound: this.issues.length,
                totalIssuesFixed: this.fixes.length,
                systemStatus: this.stats.healthCheck?.overall || 'UNKNOWN'
            }
        };

        console.log(`\n📈 SUMMARY:`);
        console.log(`   System Status: ${report.summary.systemStatus}`);
        console.log(`   Issues Found: ${report.summary.totalIssuesFound}`);
        console.log(`   Issues Fixed: ${report.summary.totalIssuesFixed}`);
        
        if (this.fixes.length > 0) {
            console.log(`\n🔧 FIXES APPLIED:`);
            this.fixes.forEach(fix => console.log(`   • ${fix}`));
        }

        // Save report to file
        const reportPath = path.join(__dirname, '..', 'maintenance_report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n💾 Report saved to: ${reportPath}`);

        return report;
    }

    /**
     * Main execution function
     */
    async run(options = {}) {
        const { 
            checkOnly = false, 
            fixIssues = false, 
            deepClean = false, 
            healthReport = false,
            inspectSchema = false,
            verifySystem = false
        } = options;

        const initialized = await this.initialize();
        if (!initialized) {
            console.error('Failed to initialize maintenance tool');
            process.exit(1);
        }

        try {
            // Always run health check first
            await this.performHealthCheck();

            if (inspectSchema) {
                await this.inspectDatabaseSchema();
            }

            if (verifySystem) {
                const verificationResults = await this.performSystemVerification();
                this.stats.systemVerification = verificationResults;
            }

            if (checkOnly) {
                console.log('\n✅ Health check completed (check-only mode)');
                return;
            }

            if (fixIssues && this.issues.length > 0) {
                await this.fixIssues();
            }

            if (deepClean) {
                await this.performDeepClean();
            }

            if (healthReport || fixIssues || deepClean || inspectSchema || verifySystem) {
                this.generateReport();
            }

            console.log('\n🎉 Maintenance operations completed successfully!');

        } catch (error) {
            console.error('❌ Maintenance operation failed:', error.message);
            process.exit(1);
        } finally {
            if (this.dbManager) {
                this.dbManager.close();
            }
        }
    }

    /**
     * Show help information
     */
    static showHelp() {
        console.log(`
🔧 ISMAA Portal - Master Maintenance Tool
=======================================

Usage: node utilities/master_maintenance_tool.js [options]

Options:
  --check-only     Run diagnostics without making changes
  --fix-issues     Automatically fix detected issues  
  --deep-clean     Perform comprehensive database cleanup
  --health-report  Generate detailed system health report
  --inspect-schema Inspect database schema and structure
  --verify-system  Run complete system integration verification
  --help           Show this help message

Examples:
  node utilities/master_maintenance_tool.js --check-only
  node utilities/master_maintenance_tool.js --fix-issues
  node utilities/master_maintenance_tool.js --deep-clean --health-report
  node utilities/master_maintenance_tool.js --inspect-schema --verify-system
        `);
    }
}

// CLI execution
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--help')) {
        MasterMaintenanceTool.showHelp();
        process.exit(0);
    }

    const options = {
        checkOnly: args.includes('--check-only'),
        fixIssues: args.includes('--fix-issues'),
        deepClean: args.includes('--deep-clean'),
        healthReport: args.includes('--health-report'),
        inspectSchema: args.includes('--inspect-schema'),
        verifySystem: args.includes('--verify-system')
    };

    // Default to health check if no options specified
    if (!Object.values(options).some(v => v)) {
        options.checkOnly = true;
    }

    const tool = new MasterMaintenanceTool();
    tool.run(options).catch(error => {
        console.error('💥 Tool execution failed:', error);
        process.exit(1);
    });
}

module.exports = MasterMaintenanceTool;
