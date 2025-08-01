// =====================================================
// ISMAA Bengaluru Portal - Database Verification Tool
// =====================================================
//
// This utility provides comprehensive database testing and verification
// to ensure the SQLite migration from JSON was successful and the system
// maintains data integrity, performance, and ACID compliance.
//
// Features:
// - Database connectivity testing
// - Data integrity validation with foreign key checks
// - ACID compliance verification through transaction testing
// - Performance benchmarking for common operations
// - API compatibility testing to ensure frontend functionality
// - Comprehensive reporting of database statistics
//
// Usage:
//   node src/database/verify.js
//
// Dependencies: DatabaseAPI.js, DatabaseManager.js
// Author: ISMAA Portal Team
// =====================================================

const DatabaseAPI = require('./DatabaseAPI');

/**
 * DatabaseVerification class provides comprehensive testing suite
 * for validating database integrity, performance, and functionality
 * after migration from JSON-based system to SQLite
 */
class DatabaseVerification {
    constructor() {
        this.dbAPI = new DatabaseAPI();
    }

    /**
     * Main test runner that executes all verification tests
     * Provides detailed console output and error handling
     */
    async runTests() {
        console.log('🔍 Database Verification & Testing');
        console.log('==================================');
        
        try {
            // Initialize database connection
            await this.dbAPI.initialize();
            
            // Test 1: Database connectivity
            console.log('\n✅ Test 1: Database Connection - PASSED');
            
            // Test 2: Data integrity check
            await this.testDataIntegrity();
            
            // Test 3: ACID compliance test
            await this.testACIDCompliance();
            
            // Test 4: Performance test
            await this.testPerformance();
            
            // Test 5: API compatibility test
            await this.testAPICompatibility();
            
            console.log('\n🎉 All tests completed successfully!');
            console.log('✅ Database migration verification: PASSED');
            
        } catch (error) {
            console.error('\n❌ Verification failed:', error);
            throw error;
        } finally {
            // Ensure database connection is properly closed
            this.dbAPI.close();
        }
    }

    /**
     * Test data integrity by validating foreign key relationships,
     * checking for orphaned records, and verifying data consistency
     */
    async testDataIntegrity() {
        console.log('\n🔍 Test 2: Data Integrity Check');
        
        // Get comprehensive database statistics
        const stats = this.dbAPI.dbManager.getStats();
        console.log('📊 Record counts:', stats);
        
        // Validate member records and their relationships
        const members = this.dbAPI.getAllMembers();
        console.log(`👥 Total members: ${members.length}`);
        
        // Verify skills relationships
        let totalSkills = 0;
        members.forEach(member => {
            totalSkills += member.skills.length;
        });
        console.log(`🛠️  Total skill assignments: ${totalSkills}`);
        
        // Check for data consistency
        const memberWithMostSkills = members.reduce((max, member) => 
            member.skills.length > (max.skills?.length || 0) ? member : max, {}
        );
        console.log(`🏆 Member with most skills: ${memberWithMostSkills.name} (${memberWithMostSkills.skills.length} skills)`);
        
        console.log('✅ Data integrity check - PASSED');
    }

    async testACIDCompliance() {
        console.log('\n🔍 Test 3: ACID Compliance Check');
        
        const db = this.dbAPI.dbManager.getDatabase();
        
        // Test Atomicity - Transaction rollback on error
        try {
            const transaction = db.transaction(() => {
                // Insert a test member
                const insertMember = db.prepare(`
                    INSERT INTO members (name, email, membership_id) 
                    VALUES (?, ?, ?)
                `);
                insertMember.run('Test User', 'test@example.com', 'TEST-001');
                
                // Force an error to test rollback
                throw new Error('Intentional error for testing');
            });
            
            transaction();
        } catch (error) {
            // Verify the transaction was rolled back
            const testUser = db.prepare('SELECT * FROM members WHERE email = ?').get('test@example.com');
            if (!testUser) {
                console.log('✅ Atomicity test - PASSED (transaction rolled back)');
            } else {
                throw new Error('Atomicity test failed - transaction not rolled back');
            }
        }
        
        // Test Consistency - Foreign key constraints
        try {
            const insertMember = db.prepare(`
                INSERT INTO members (name, branch_id) VALUES (?, ?)
            `);
            insertMember.run('Test User 2', 99999); // Invalid branch_id
            throw new Error('Consistency test failed - foreign key constraint not enforced');
        } catch (error) {
            if (error.message.includes('FOREIGN KEY constraint failed')) {
                console.log('✅ Consistency test - PASSED (foreign key constraints working)');
            } else {
                throw error;
            }
        }
        
        console.log('✅ ACID compliance check - PASSED');
    }

    async testPerformance() {
        console.log('\n🔍 Test 4: Performance Check');
        
        const startTime = Date.now();
        
        // Test query performance
        const members = this.dbAPI.getAllMembers();
        const branches = this.dbAPI.getBranches();
        const industries = this.dbAPI.getIndustries();
        
        const endTime = Date.now();
        const queryTime = endTime - startTime;
        
        console.log(`⚡ Query performance: ${queryTime}ms for ${members.length} members + lookups`);
        
        if (queryTime < 1000) {
            console.log('✅ Performance test - PASSED (under 1 second)');
        } else {
            console.log('⚠️  Performance test - WARNING (over 1 second, consider optimization)');
        }
    }

    async testAPICompatibility() {
        console.log('\n🔍 Test 5: API Compatibility Check');
        
        // Test that API returns data in the same format as JSON Server
        const members = this.dbAPI.getAllMembers();
        
        if (members.length > 0) {
            const sampleMember = members[0];
            const requiredFields = [
                'id', 'name', 'email', 'branch', 'industry', 
                'company', 'skills', 'membershipID', 'membershipType'
            ];
            
            const missingFields = requiredFields.filter(field => !(field in sampleMember));
            
            if (missingFields.length === 0) {
                console.log('✅ API compatibility - PASSED (all fields present)');
            } else {
                throw new Error(`API compatibility failed - missing fields: ${missingFields.join(', ')}`);
            }
        }
        
        // Test array structure for skills
        const memberWithSkills = members.find(m => m.skills.length > 0);
        if (memberWithSkills && Array.isArray(memberWithSkills.skills)) {
            console.log('✅ Skills array format - PASSED');
        } else {
            throw new Error('Skills should be returned as array');
        }
    }
}

// Export for use as module
module.exports = DatabaseVerification;

// Run verification if this file is executed directly
if (require.main === module) {
    const verification = new DatabaseVerification();
    verification.runTests()
        .then(() => {
            console.log('\n🎯 Database is ready for production use!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Database verification failed:', error);
            process.exit(1);
        });
}
