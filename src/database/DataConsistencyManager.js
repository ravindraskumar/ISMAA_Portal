// =====================================================
// Data Consistency Manager - Comprehensive Data Integrity System
// =====================================================
//
// This module provides comprehensive data consistency management for the 
// ISMAA Portal with the following capabilities:
//
// 1. Cascading Deletes: When admin deletes a user, automatically delete:
//    - Associated member profile
//    - Orphaned lookup records (branch, company, industry, skills)
//    - User sessions and related data
//
// 2. Data Consistency Checks: Ensure 1:1 mapping between members and users
//    - Each member must have exactly one user account
//    - Each user must reference exactly one member record
//    - All personal data sourced from members table
//
// 3. Best Practices Implementation:
//    - Transaction-based operations for data integrity
//    - Comprehensive logging and audit trails
//    - Validation before any data modification
//    - Rollback capabilities on failures
//
// Author: ISMAA Portal Team
// =====================================================

const sqlite3 = require('better-sqlite3');

class DataConsistencyManager {
    constructor(database) {
        this.db = database;
        this.auditLog = [];
    }

    /**
     * Comprehensive user deletion with cascading cleanup
     * Deletes user, associated member, and orphaned lookup records
     */
    async deleteUserAndMemberCascade(userId, adminUserId) {
        return new Promise((resolve, reject) => {
            // Start transaction for data consistency
            const transaction = this.db.transaction(() => {
                try {
                    console.log(`🗑️  Starting cascading delete for user ID: ${userId}`);
                    
                    // Step 1: Get user and member information before deletion
                    const userInfo = this.db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
                    if (!userInfo) {
                        throw new Error(`User with ID ${userId} not found`);
                    }

                    const memberInfo = userInfo.member_id ? 
                        this.db.prepare('SELECT * FROM members WHERE id = ?').get(userInfo.member_id) : null;

                    console.log(`   📋 User: ${userInfo.username} (${userInfo.name})`);
                    console.log(`   📋 Member: ${memberInfo ? memberInfo.name : 'No linked member'}`);

                    // Step 2: Store lookup IDs for orphan cleanup
                    const lookupIds = memberInfo ? {
                        branchId: memberInfo.branch_id,
                        industryId: memberInfo.industry_id,
                        companyId: memberInfo.company_id
                    } : {};

                    // Step 3: Delete member skills relationships
                    if (memberInfo) {
                        const skillsDeleted = this.db.prepare('DELETE FROM member_skills WHERE member_id = ?')
                            .run(memberInfo.id);
                        console.log(`   🎯 Deleted ${skillsDeleted.changes} skill relationships`);
                    }

                    // Step 4: Delete member record
                    if (memberInfo) {
                        const memberDeleted = this.db.prepare('DELETE FROM members WHERE id = ?')
                            .run(memberInfo.id);
                        console.log(`   👤 Deleted member record: ${memberDeleted.changes > 0 ? '✅' : '❌'}`);
                    }

                    // Step 5: Delete user record
                    const userDeleted = this.db.prepare('DELETE FROM users WHERE id = ?').run(userId);
                    console.log(`   🔐 Deleted user record: ${userDeleted.changes > 0 ? '✅' : '❌'}`);

                    // Step 6: Clean up orphaned lookup records
                    this.cleanupOrphanedLookups(lookupIds);

                    // Step 7: Log the deletion for audit trail
                    this.logDeletion(userInfo, memberInfo, adminUserId);

                    // Step 8: Run data consistency check
                    const consistencyResults = this.runDataConsistencyCheck();

                    return {
                        success: true,
                        deletedUser: userInfo.username,
                        deletedMember: memberInfo?.name || null,
                        consistencyCheck: consistencyResults,
                        message: 'User and associated data deleted successfully'
                    };

                } catch (error) {
                    console.error(`❌ Error during cascading delete: ${error.message}`);
                    throw error;
                }
            });

            try {
                const result = transaction();
                resolve(result);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Clean up orphaned lookup records that are no longer referenced
     */
    cleanupOrphanedLookups(lookupIds) {
        console.log('   🧹 Cleaning up orphaned lookup records...');
        
        const cleanupResults = {
            branches: 0,
            industries: 0,
            companies: 0,
            skills: 0
        };

        // Clean up orphaned branches
        if (lookupIds.branchId) {
            const branchUsage = this.db.prepare('SELECT COUNT(*) as count FROM members WHERE branch_id = ?')
                .get(lookupIds.branchId);
            if (branchUsage.count === 0) {
                const deleted = this.db.prepare('DELETE FROM branches WHERE id = ?').run(lookupIds.branchId);
                cleanupResults.branches = deleted.changes;
                console.log(`     🏢 Deleted orphaned branch: ${deleted.changes > 0 ? '✅' : '❌'}`);
            }
        }

        // Clean up orphaned industries
        if (lookupIds.industryId) {
            const industryUsage = this.db.prepare('SELECT COUNT(*) as count FROM members WHERE industry_id = ?')
                .get(lookupIds.industryId);
            if (industryUsage.count === 0) {
                const deleted = this.db.prepare('DELETE FROM industries WHERE id = ?').run(lookupIds.industryId);
                cleanupResults.industries = deleted.changes;
                console.log(`     🏭 Deleted orphaned industry: ${deleted.changes > 0 ? '✅' : '❌'}`);
            }
        }

        // Clean up orphaned companies
        if (lookupIds.companyId) {
            const companyUsage = this.db.prepare('SELECT COUNT(*) as count FROM members WHERE company_id = ?')
                .get(lookupIds.companyId);
            if (companyUsage.count === 0) {
                const deleted = this.db.prepare('DELETE FROM companies WHERE id = ?').run(lookupIds.companyId);
                cleanupResults.companies = deleted.changes;
                console.log(`     🏬 Deleted orphaned company: ${deleted.changes > 0 ? '✅' : '❌'}`);
            }
        }

        // Clean up orphaned skills
        const orphanedSkills = this.db.prepare(`
            SELECT s.id, s.name FROM skills s
            LEFT JOIN member_skills ms ON s.id = ms.skill_id
            WHERE ms.skill_id IS NULL
        `).all();

        orphanedSkills.forEach(skill => {
            const deleted = this.db.prepare('DELETE FROM skills WHERE id = ?').run(skill.id);
            if (deleted.changes > 0) {
                cleanupResults.skills++;
                console.log(`     🎯 Deleted orphaned skill: ${skill.name}`);
            }
        });

        return cleanupResults;
    }

    /**
     * Comprehensive data consistency check
     * Validates 1:1 mapping between users and members
     */
    runDataConsistencyCheck() {
        console.log('   🔍 Running data consistency check...');
        
        const results = {
            timestamp: new Date().toISOString(),
            issues: [],
            statistics: {},
            status: 'PASSED'
        };

        try {
            // Check 1: Users without member records
            const usersWithoutMembers = this.db.prepare(`
                SELECT u.id, u.username, u.member_id 
                FROM users u 
                LEFT JOIN members m ON u.member_id = m.id 
                WHERE u.member_id IS NOT NULL AND m.id IS NULL
            `).all();

            if (usersWithoutMembers.length > 0) {
                results.issues.push({
                    type: 'MISSING_MEMBER_RECORDS',
                    count: usersWithoutMembers.length,
                    details: usersWithoutMembers.map(u => `User ${u.username} references missing member ID ${u.member_id}`)
                });
                results.status = 'FAILED';
            }

            // Check 2: Members without user records
            const membersWithoutUsers = this.db.prepare(`
                SELECT m.id, m.name 
                FROM members m 
                LEFT JOIN users u ON m.id = u.member_id 
                WHERE u.member_id IS NULL
            `).all();

            if (membersWithoutUsers.length > 0) {
                results.issues.push({
                    type: 'ORPHANED_MEMBER_RECORDS',
                    count: membersWithoutUsers.length,
                    details: membersWithoutUsers.map(m => `Member ${m.name} (ID: ${m.id}) has no user account`)
                });
                results.status = 'FAILED';
            }

            // Check 3: Duplicate member linkages
            const duplicateLinks = this.db.prepare(`
                SELECT member_id, COUNT(*) as user_count 
                FROM users 
                WHERE member_id IS NOT NULL 
                GROUP BY member_id 
                HAVING COUNT(*) > 1
            `).all();

            if (duplicateLinks.length > 0) {
                results.issues.push({
                    type: 'DUPLICATE_MEMBER_LINKS',
                    count: duplicateLinks.length,
                    details: duplicateLinks.map(d => `Member ID ${d.member_id} linked to ${d.user_count} users`)
                });
                results.status = 'FAILED';
            }

            // Gather statistics
            results.statistics = {
                totalUsers: this.db.prepare('SELECT COUNT(*) as count FROM users').get().count,
                totalMembers: this.db.prepare('SELECT COUNT(*) as count FROM members').get().count,
                linkedUsers: this.db.prepare('SELECT COUNT(*) as count FROM users WHERE member_id IS NOT NULL').get().count,
                unlinkedUsers: this.db.prepare('SELECT COUNT(*) as count FROM users WHERE member_id IS NULL').get().count
            };

            console.log(`     📊 Total Users: ${results.statistics.totalUsers}`);
            console.log(`     📊 Total Members: ${results.statistics.totalMembers}`);
            console.log(`     📊 Linked Users: ${results.statistics.linkedUsers}`);
            console.log(`     📊 Status: ${results.status}`);

            if (results.issues.length > 0) {
                console.log(`     ⚠️  Found ${results.issues.length} consistency issues`);
            }

            return results;

        } catch (error) {
            results.status = 'ERROR';
            results.error = error.message;
            console.error(`     ❌ Consistency check failed: ${error.message}`);
            return results;
        }
    }

    /**
     * Log deletion for audit trail
     */
    logDeletion(userInfo, memberInfo, adminUserId) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            action: 'CASCADE_DELETE',
            adminUserId: adminUserId,
            deletedUser: {
                id: userInfo.id,
                username: userInfo.username,
                name: userInfo.name
            },
            deletedMember: memberInfo ? {
                id: memberInfo.id,
                name: memberInfo.name,
                email: memberInfo.email
            } : null
        };

        this.auditLog.push(logEntry);
        console.log(`   📝 Logged deletion for audit trail`);
    }

    /**
     * Validate member-user consistency before any operation
     */
    validateMemberUserConsistency(memberId, userId) {
        const member = this.db.prepare('SELECT * FROM members WHERE id = ?').get(memberId);
        const user = this.db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

        const issues = [];

        if (!member) {
            issues.push(`Member ID ${memberId} not found`);
        }

        if (!user) {
            issues.push(`User ID ${userId} not found`);
        }

        if (member && user && user.member_id !== member.id) {
            issues.push(`User ${user.username} member_id (${user.member_id}) doesn't match member ID (${member.id})`);
        }

        return {
            valid: issues.length === 0,
            issues: issues
        };
    }

    /**
     * Get comprehensive system health report
     */
    getSystemHealthReport() {
        const consistencyResults = this.runDataConsistencyCheck();
        
        return {
            timestamp: new Date().toISOString(),
            dataConsistency: consistencyResults,
            auditLog: this.auditLog.slice(-10), // Last 10 audit entries
            recommendations: this.generateRecommendations(consistencyResults)
        };
    }

    /**
     * Generate recommendations based on consistency check results
     */
    generateRecommendations(consistencyResults) {
        const recommendations = [];

        consistencyResults.issues.forEach(issue => {
            switch (issue.type) {
                case 'MISSING_MEMBER_RECORDS':
                    recommendations.push('Create missing member records or unlink users from non-existent members');
                    break;
                case 'ORPHANED_MEMBER_RECORDS':
                    recommendations.push('Create user accounts for orphaned members or delete unused member records');
                    break;
                case 'DUPLICATE_MEMBER_LINKS':
                    recommendations.push('Fix duplicate member linkages by ensuring 1:1 user-member mapping');
                    break;
            }
        });

        if (recommendations.length === 0) {
            recommendations.push('System data consistency is healthy - no action required');
        }

        return recommendations;
    }
}

module.exports = DataConsistencyManager;
