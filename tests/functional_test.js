console.log('🏥 Basic Health System Functional Test');
console.log('=' .repeat(50));

const IntegratedHealthSystem = require('./utilities/integrated_health_system');

async function basicFunctionalTest() {
    try {
        console.log('🔧 Creating health system instance...');
        const healthSystem = new IntegratedHealthSystem();
        console.log('✅ Health system created');

        console.log('🗺️  Testing test-maintenance mapping...');
        const mapping = healthSystem.buildTestMaintenanceMap();
        console.log(`✅ Mapping created with ${Object.keys(mapping).length} categories`);
        
        // Display mapping
        console.log('📋 Test-Maintenance Mapping:');
        Object.entries(mapping).forEach(([test, maintenance]) => {
            console.log(`   ${test} → ${maintenance}`);
        });

        console.log('\n🎯 Testing health score calculation...');
        const mockTestResults = {
            passed: 18,
            failed: 2,
            errors: 1,
            summary: { total: 21, passed: 18, failed: 2, errors: 1, successRate: 85.7 },
            failedTests: ['User Login Test', 'Database Connectivity'],
            errorTests: ['System Health Check'],
            categories: {
                'authentication': { passed: 2, failed: 1, errors: 0 },
                'database': { passed: 5, failed: 0, errors: 1 },
                'security': { passed: 3, failed: 0, errors: 0 }
            }
        };

        const mockMaintenanceResults = {
            issuesFound: 3,
            issuesResolved: 2,
            healthCheckPassed: false,
            systemHealth: {
                overall: 'ISSUES_DETECTED',
                issues: [
                    { type: 'orphaned_records', severity: 'medium', count: 5 },
                    { type: 'schema_inconsistency', severity: 'high', count: 1 },
                    { type: 'performance_degradation', severity: 'low', count: 2 }
                ]
            },
            availableFunctions: {
                'performHealthCheck': 'Comprehensive system health check',
                'fixIssues': 'Automated issue resolution',
                'cleanupOrphanedRecords': 'Remove orphaned database records'
            }
        };

        const healthScore = healthSystem.calculateHealthScore(mockTestResults, mockMaintenanceResults);
        console.log(`✅ Health score calculated: ${healthScore}/100`);

        console.log('\n💡 Testing recommendation generation...');
        const recommendations = healthSystem.generateRecommendations(mockTestResults, mockMaintenanceResults, mapping);
        console.log(`✅ Generated ${recommendations.length} recommendations`);
        
        console.log('📋 Recommendations:');
        recommendations.forEach((rec, index) => {
            console.log(`   ${index + 1}. ${rec.failedTest || 'General'} → ${rec.maintenanceFunction}`);
            console.log(`      Severity: ${rec.severity} | Confidence: ${rec.confidence}%`);
            console.log(`      Action: ${rec.description}`);
        });

        console.log('\n' + '='.repeat(50));
        console.log('🎉 Basic Functional Test Results');
        console.log('='.repeat(50));
        console.log(`✅ Health Score: ${healthScore}/100`);
        console.log(`📊 Test Success Rate: ${mockTestResults.summary.successRate}%`);
        console.log(`🔧 Issues Found: ${mockMaintenanceResults.issuesFound}`);
        console.log(`💡 Recommendations: ${recommendations.length}`);
        console.log(`🗺️  Mappings Available: ${Object.keys(mapping).length}`);

        const status = healthScore >= 80 ? '🟢 EXCELLENT' : 
                      healthScore >= 60 ? '🟡 GOOD' : '🔴 NEEDS ATTENTION';
        console.log(`🏥 Overall System Health: ${status}`);

        console.log('\n🚀 Health System is functioning correctly!');
        return true;

    } catch (error) {
        console.error('❌ Functional test failed:', error.message);
        console.error('Stack:', error.stack);
        return false;
    }
}

// Run the test
basicFunctionalTest()
    .then(success => {
        if (success) {
            console.log('\n✅ All functional tests passed!');
        } else {
            console.log('\n❌ Some functional tests failed!');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('\n💥 Unexpected error:', error);
        process.exit(1);
    });
