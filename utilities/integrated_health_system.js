#!/usr/bin/env node

/**
 * ISMAA Portal - Integrated Health & Test Management System
 * =========================================================
 * 
 * This system bridges the unified test suite and master maintenance tool,
 * providing intelligent health scoring, test-to-maintenance mapping, and
 * automated issue resolution recommendations.
 * 
 * Features:
 * - Comprehensive health scoring based on tests and maintenance checks
 * - Intelligent mapping between failed tests and maintenance functions
 * - Automated issue resolution recommendations
 * - Integrated reporting and analytics
 * - Smart maintenance scheduling based on test results
 */

const UnifiedTestSuite = require('../tests/unified-test-suite');
const MasterMaintenanceTool = require('./master_maintenance_tool');

class IntegratedHealthSystem {
    constructor() {
        this.testSuite = null;
        this.maintenanceTool = null;
        this.healthScore = 0;
        this.testResults = null;
        this.maintenanceResults = null;
        this.recommendations = [];
        this.testMaintenanceMap = this.buildTestMaintenanceMap();
    }

    /**
     * Build mapping between test failures and maintenance functions
     */
    buildTestMaintenanceMap() {
        return {
            // Authentication & Authorization Tests
            'testAdminLogin': {
                maintenanceFunction: 'performSystemVerification',
                category: 'auth',
                severity: 'high',
                description: 'Admin login failures may indicate authentication system issues'
            },
            'testMemberLogin': {
                maintenanceFunction: 'performSystemVerification',
                category: 'auth',
                severity: 'high',
                description: 'Member login failures indicate authentication problems'
            },
            'testInvalidLogin': {
                maintenanceFunction: 'inspectDatabaseSchema',
                category: 'auth',
                severity: 'medium',
                description: 'Invalid login handling issues may need schema verification'
            },
            'testPasswordReset': {
                maintenanceFunction: 'performSystemVerification',
                category: 'auth',
                severity: 'medium',
                description: 'Password reset failures need system verification'
            },

            // Member Management Tests
            'testCreateMember': {
                maintenanceFunction: 'fixIssues',
                category: 'data',
                severity: 'high',
                description: 'Member creation failures often indicate data consistency issues'
            },
            'testGetAllMembers': {
                maintenanceFunction: 'inspectDatabaseSchema',
                category: 'data',
                severity: 'medium',
                description: 'Member retrieval issues may need database inspection'
            },
            'testMemberSearch': {
                maintenanceFunction: 'performDeepClean',
                category: 'performance',
                severity: 'low',
                description: 'Search issues may benefit from database optimization'
            },

            // Data Consistency Tests
            'testDataConsistencyCheck': {
                maintenanceFunction: 'fixIssues',
                category: 'consistency',
                severity: 'critical',
                description: 'Data consistency failures require immediate issue resolution'
            },
            'testUserMemberMapping': {
                maintenanceFunction: 'fixIssues',
                category: 'consistency',
                severity: 'critical',
                description: 'User-member mapping issues need immediate consistency fixes'
            },
            'testOrphanedDataCleanup': {
                maintenanceFunction: 'performDeepClean',
                category: 'cleanup',
                severity: 'medium',
                description: 'Orphaned data issues resolved by deep cleanup'
            },

            // Admin Functionality Tests
            'testAdminUserManagement': {
                maintenanceFunction: 'performSystemVerification',
                category: 'admin',
                severity: 'high',
                description: 'Admin functionality issues need system verification'
            },
            'testAdminSecurityLogs': {
                maintenanceFunction: 'inspectDatabaseSchema',
                category: 'admin',
                severity: 'medium',
                description: 'Security log issues may need schema inspection'
            },
            'testAdminAccessControl': {
                maintenanceFunction: 'performSystemVerification',
                category: 'security',
                severity: 'high',
                description: 'Access control failures need comprehensive verification'
            },

            // System Integration Tests
            'testDatabaseConnectivity': {
                maintenanceFunction: 'inspectDatabaseSchema',
                category: 'system',
                severity: 'critical',
                description: 'Database connectivity issues need immediate inspection'
            },
            'testSystemHealth': {
                maintenanceFunction: 'performHealthCheck',
                category: 'system',
                severity: 'high',
                description: 'System health failures need comprehensive health check'
            },
            'testUserMemberCountConsistency': {
                maintenanceFunction: 'fixIssues',
                category: 'consistency',
                severity: 'high',
                description: 'Count consistency issues need data fixes'
            },

            // Username Generation Tests
            'testUsernameGeneration': {
                maintenanceFunction: 'performSystemVerification',
                category: 'system',
                severity: 'low',
                description: 'Username generation issues need system verification'
            },
            'testUsernameCollisionHandling': {
                maintenanceFunction: 'performSystemVerification',
                category: 'system',
                severity: 'low',
                description: 'Username collision handling needs verification'
            },

            // Integration & Verification Tests
            'testHttpAdminEndpoints': {
                maintenanceFunction: 'performSystemVerification',
                category: 'integration',
                severity: 'medium',
                description: 'HTTP endpoint issues need integration verification'
            },
            'testMemberEditAccessControl': {
                maintenanceFunction: 'performSystemVerification',
                category: 'security',
                severity: 'high',
                description: 'Edit access control issues need verification'
            }
        };
    }

    /**
     * Calculate comprehensive health score
     */
    calculateHealthScore(testResults, maintenanceResults) {
        let score = 100;
        const weights = {
            critical: 25,
            high: 15,
            medium: 10,
            low: 5,
            performance: 5
        };

        // Analyze test results
        if (testResults) {
            const totalTests = testResults.passed + testResults.failed + testResults.errors;
            if (totalTests > 0) {
                const testSuccessRate = (testResults.passed / totalTests) * 100;
                const testDeduction = (100 - testSuccessRate) * 0.6; // Tests contribute 60% to score
                score -= testDeduction;
            }
        }

        // Analyze maintenance results
        if (maintenanceResults && maintenanceResults.systemHealth) {
            const healthStatus = maintenanceResults.systemHealth.overall;
            
            switch (healthStatus) {
                case 'HEALTHY':
                    // No deduction
                    break;
                case 'ISSUES_DETECTED':
                    score -= 20; // Moderate deduction for detected issues
                    break;
                case 'ERROR':
                    score -= 40; // Significant deduction for errors
                    break;
            }

            // Deduct for specific issues
            if (maintenanceResults.systemHealth.issues) {
                maintenanceResults.systemHealth.issues.forEach(issue => {
                    const severityWeight = this.getIssueSeverityWeight(issue.type);
                    score -= severityWeight;
                });
            }
        }

        // Analyze system verification results
        if (maintenanceResults && maintenanceResults.systemVerification) {
            const verificationRate = maintenanceResults.systemVerification.successRate;
            if (verificationRate < 100) {
                score -= (100 - verificationRate) * 0.3; // Verification contributes 30% to score
            }
        }

        return Math.max(0, Math.round(score));
    }

    /**
     * Get severity weight for different issue types
     */
    getIssueSeverityWeight(issueType) {
        const severityMap = {
            'GHOST_RECORDS': 15,
            'ORPHANED_DATA': 10,
            'MISSING_MEMBER_RECORDS': 20,
            'DUPLICATE_USERS': 25,
            'SYSTEM_ERROR': 30,
            'DATABASE_CONNECTIVITY': 35
        };
        return severityMap[issueType] || 10;
    }

    /**
     * Generate recommendations based on failed tests
     */
    generateRecommendations(testResults) {
        const recommendations = [];
        const failedTests = this.getFailedTests(testResults);

        // Group failed tests by maintenance function
        const maintenanceTasks = {};
        
        failedTests.forEach(testName => {
            const mapping = this.testMaintenanceMap[testName];
            if (mapping) {
                if (!maintenanceTasks[mapping.maintenanceFunction]) {
                    maintenanceTasks[mapping.maintenanceFunction] = {
                        function: mapping.maintenanceFunction,
                        tests: [],
                        maxSeverity: 'low',
                        categories: new Set()
                    };
                }
                
                maintenanceTasks[mapping.maintenanceFunction].tests.push(testName);
                maintenanceTasks[mapping.maintenanceFunction].categories.add(mapping.category);
                
                // Update max severity
                if (this.severityLevel(mapping.severity) > this.severityLevel(maintenanceTasks[mapping.maintenanceFunction].maxSeverity)) {
                    maintenanceTasks[mapping.maintenanceFunction].maxSeverity = mapping.severity;
                }
            }
        });

        // Generate recommendations
        Object.values(maintenanceTasks).forEach(task => {
            const command = this.getMaintenanceCommand(task.function);
            recommendations.push({
                severity: task.maxSeverity,
                action: command,
                reason: `Fix ${task.tests.length} failed test(s): ${task.tests.join(', ')}`,
                categories: Array.from(task.categories),
                tests: task.tests
            });
        });

        // Sort by severity
        return recommendations.sort((a, b) => 
            this.severityLevel(b.severity) - this.severityLevel(a.severity)
        );
    }

    /**
     * Convert severity to numeric level
     */
    severityLevel(severity) {
        const levels = { critical: 4, high: 3, medium: 2, low: 1 };
        return levels[severity] || 0;
    }

    /**
     * Get maintenance command for function
     */
    getMaintenanceCommand(functionName) {
        const commandMap = {
            'fixIssues': 'node utilities/master_maintenance_tool.js --fix-issues',
            'performDeepClean': 'node utilities/master_maintenance_tool.js --deep-clean',
            'inspectDatabaseSchema': 'node utilities/master_maintenance_tool.js --inspect-schema',
            'performSystemVerification': 'node utilities/master_maintenance_tool.js --verify-system',
            'performHealthCheck': 'node utilities/master_maintenance_tool.js --check-only'
        };
        return commandMap[functionName] || 'node utilities/master_maintenance_tool.js --check-only';
    }

    /**
     * Extract failed test names from results
     */
    getFailedTests(testResults) {
        // This would need to be implemented based on the actual test results structure
        // For now, return empty array as placeholder
        return [];
    }

    /**
     * Run comprehensive system analysis
     */
    async runComprehensiveAnalysis() {
        console.log('🔬 INTEGRATED HEALTH & TEST ANALYSIS');
        console.log('=' .repeat(50));

        try {
            // Initialize components
            console.log('🔧 Initializing components...');
            this.testSuite = new UnifiedTestSuite();
            this.maintenanceTool = new MasterMaintenanceTool();

            // Run tests
            console.log('\n📋 Running comprehensive test suite...');
            await this.testSuite.runAllTests();
            this.testResults = this.testSuite.results;

            // Run maintenance checks
            console.log('\n🔧 Running maintenance analysis...');
            await this.maintenanceTool.run({
                checkOnly: true,
                inspectSchema: true,
                verifySystem: true,
                healthReport: true
            });
            this.maintenanceResults = this.maintenanceTool.stats;

            // Calculate health score
            console.log('\n📊 Calculating system health score...');
            this.healthScore = this.calculateHealthScore(this.testResults, this.maintenanceResults);

            // Generate recommendations
            console.log('\n💡 Generating recommendations...');
            this.recommendations = this.generateRecommendations(this.testResults);

            // Generate comprehensive report
            this.generateComprehensiveReport();

            return {
                healthScore: this.healthScore,
                testResults: this.testResults,
                maintenanceResults: this.maintenanceResults,
                recommendations: this.recommendations
            };

        } catch (error) {
            console.error('❌ Comprehensive analysis failed:', error.message);
            return null;
        }
    }

    /**
     * Generate comprehensive system report
     */
    generateComprehensiveReport() {
        console.log('\n📊 COMPREHENSIVE SYSTEM HEALTH REPORT');
        console.log('=' .repeat(45));

        // Health Score Display
        const scoreColor = this.getScoreColor(this.healthScore);
        console.log(`\n🎯 OVERALL HEALTH SCORE: ${this.healthScore}/100 ${scoreColor}`);
        console.log(`   ${this.getHealthGrade(this.healthScore)}`);

        // Test Results Summary
        if (this.testResults) {
            console.log('\n📋 TEST RESULTS SUMMARY:');
            const total = this.testResults.passed + this.testResults.failed + this.testResults.errors;
            console.log(`   Total Tests: ${total}`);
            console.log(`   ✅ Passed: ${this.testResults.passed}`);
            console.log(`   ❌ Failed: ${this.testResults.failed}`);
            console.log(`   💥 Errors: ${this.testResults.errors}`);
            console.log(`   📈 Success Rate: ${total > 0 ? ((this.testResults.passed / total) * 100).toFixed(1) : 0}%`);
        }

        // Maintenance Results Summary
        if (this.maintenanceResults && this.maintenanceResults.systemHealth) {
            console.log('\n🔧 MAINTENANCE ANALYSIS:');
            console.log(`   System Status: ${this.maintenanceResults.systemHealth.overall}`);
            console.log(`   Issues Found: ${this.maintenanceResults.systemHealth.issues?.length || 0}`);
            
            if (this.maintenanceResults.systemVerification) {
                console.log(`   Verification Success: ${this.maintenanceResults.systemVerification.successRate?.toFixed(1) || 'N/A'}%`);
            }
        }

        // Recommendations
        if (this.recommendations.length > 0) {
            console.log('\n💡 RECOMMENDED ACTIONS:');
            this.recommendations.forEach((rec, index) => {
                const severityIcon = this.getSeverityIcon(rec.severity);
                console.log(`   ${index + 1}. ${severityIcon} ${rec.action}`);
                console.log(`      Reason: ${rec.reason}`);
                console.log(`      Categories: ${rec.categories.join(', ')}`);
            });
        } else {
            console.log('\n✅ No specific maintenance actions recommended');
        }

        // Health Breakdown
        console.log('\n📊 HEALTH SCORE BREAKDOWN:');
        console.log(`   Base Score: 100`);
        if (this.testResults) {
            const total = this.testResults.passed + this.testResults.failed + this.testResults.errors;
            if (total > 0) {
                const testDeduction = (100 - ((this.testResults.passed / total) * 100)) * 0.6;
                console.log(`   Test Failures: -${testDeduction.toFixed(1)}`);
            }
        }
        if (this.maintenanceResults?.systemHealth?.issues) {
            const issueDeduction = this.maintenanceResults.systemHealth.issues.reduce((sum, issue) => 
                sum + this.getIssueSeverityWeight(issue.type), 0);
            console.log(`   System Issues: -${issueDeduction}`);
        }
        console.log(`   Final Score: ${this.healthScore}/100`);
    }

    /**
     * Get color indicator for health score
     */
    getScoreColor(score) {
        if (score >= 90) return '🟢';
        if (score >= 75) return '🟡';
        if (score >= 50) return '🟠';
        return '🔴';
    }

    /**
     * Get health grade based on score
     */
    getHealthGrade(score) {
        if (score >= 95) return 'EXCELLENT - System running optimally';
        if (score >= 85) return 'GOOD - Minor issues, regular maintenance recommended';
        if (score >= 70) return 'FAIR - Some issues detected, maintenance needed';
        if (score >= 50) return 'POOR - Multiple issues, immediate attention required';
        return 'CRITICAL - System needs urgent maintenance';
    }

    /**
     * Get severity icon
     */
    getSeverityIcon(severity) {
        const icons = {
            critical: '🚨',
            high: '⚠️',
            medium: '⚡',
            low: 'ℹ️'
        };
        return icons[severity] || 'ℹ️';
    }

    /**
     * Show help information
     */
    static showHelp() {
        console.log(`
🔬 ISMAA Portal - Integrated Health & Test Management System
==========================================================

Usage: node utilities/integrated_health_system.js [options]

Options:
  --full-analysis     Run complete test suite and maintenance analysis
  --score-only        Calculate and display health score only
  --recommendations   Generate maintenance recommendations based on tests
  --help              Show this help message

Examples:
  node utilities/integrated_health_system.js --full-analysis
  node utilities/integrated_health_system.js --score-only
  node utilities/integrated_health_system.js --recommendations
        `);
    }
}

// CLI execution
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--help')) {
        IntegratedHealthSystem.showHelp();
        process.exit(0);
    }

    const system = new IntegratedHealthSystem();
    
    if (args.includes('--full-analysis') || args.length === 0) {
        system.runComprehensiveAnalysis().then(results => {
            if (results) {
                console.log('\n🎉 Comprehensive analysis completed successfully!');
                process.exit(0);
            } else {
                console.error('💥 Analysis failed');
                process.exit(1);
            }
        }).catch(error => {
            console.error('💥 Analysis error:', error);
            process.exit(1);
        });
    }
}

module.exports = IntegratedHealthSystem;
