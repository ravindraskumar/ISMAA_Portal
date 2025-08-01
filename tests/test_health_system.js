#!/usr/bin/env node

/**
 * Test Script for Integrated Health System
 * 
 * This script tests the integration between the unified test suite,
 * master maintenance tool, and health scoring system.
 */

const path = require('path');
const fs = require('fs');

// Import the health system
const IntegratedHealthSystem = require('./utilities/integrated_health_system');

async function testHealthSystem() {
    console.log('🏥 Testing Integrated Health System');
    console.log('=' .repeat(50));
    
    try {
        // Initialize the health system
        console.log('🔧 Initializing Health System...');
        const healthSystem = new IntegratedHealthSystem();
        
        // Test 1: Run comprehensive analysis
        console.log('\n📊 Running Comprehensive Health Analysis...');
        const analysisResult = await healthSystem.runComprehensiveAnalysis();
        
        console.log('✅ Analysis completed successfully!');
        console.log(`📈 Overall Health Score: ${analysisResult.overallHealthScore}/100`);
        console.log(`🧪 Test Success Rate: ${analysisResult.testResults.summary.successRate}%`);
        console.log(`🔧 Maintenance Issues Found: ${analysisResult.maintenanceResults.issuesFound}`);
        
        // Test 2: Test recommendation system
        console.log('\n💡 Testing Recommendation System...');
        if (analysisResult.testResults.failedTests.length > 0) {
            console.log(`📋 Found ${analysisResult.testResults.failedTests.length} failed tests`);
            analysisResult.testResults.failedTests.forEach(testName => {
                const recommendation = analysisResult.recommendations.find(r => 
                    r.failedTest === testName
                );
                if (recommendation) {
                    console.log(`  • ${testName} → ${recommendation.maintenanceFunction}`);
                    console.log(`    Severity: ${recommendation.severity} | Confidence: ${recommendation.confidence}%`);
                }
            });
        } else {
            console.log('✅ No failed tests - all recommendations are preventive');
        }
        
        // Test 3: Health score validation
        console.log('\n🎯 Validating Health Score Calculation...');
        const score = analysisResult.overallHealthScore;
        if (score >= 90) {
            console.log('🟢 Excellent health (90-100)');
        } else if (score >= 70) {
            console.log('🟡 Good health (70-89)');
        } else if (score >= 50) {
            console.log('🟠 Fair health (50-69)');
        } else {
            console.log('🔴 Poor health (0-49)');
        }
        
        // Test 4: Generate detailed report
        console.log('\n📄 Generating Detailed Health Report...');
        const reportPath = path.join(__dirname, 'health_report.json');
        fs.writeFileSync(reportPath, JSON.stringify(analysisResult, null, 2));
        console.log(`📁 Report saved to: ${reportPath}`);
        
        // Test 5: Test individual components
        console.log('\n⚙️  Testing Individual Components...');
        
        // Test maintenance tool directly
        console.log('🔧 Testing Master Maintenance Tool...');
        const maintenanceResults = await healthSystem.runMaintenanceAnalysis();
        console.log(`   Issues Found: ${maintenanceResults.issuesFound}`);
        console.log(`   Functions Available: ${Object.keys(maintenanceResults.availableFunctions).length}`);
        
        // Test mapping system
        console.log('🗺️  Testing Test-Maintenance Mapping...');
        const mapping = healthSystem.buildTestMaintenanceMap();
        console.log(`   Mapped Test Categories: ${Object.keys(mapping).length}`);
        
        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('🎉 Health System Test Summary');
        console.log('='.repeat(50));
        console.log(`✅ Overall Health Score: ${score}/100`);
        console.log(`🧪 Tests Run: ${analysisResult.testResults.summary.total}`);
        console.log(`🔧 Maintenance Functions: ${Object.keys(maintenanceResults.availableFunctions).length}`);
        console.log(`💡 Recommendations Generated: ${analysisResult.recommendations.length}`);
        console.log(`⏱️  Analysis Duration: ${analysisResult.metadata.analysisEndTime - analysisResult.metadata.analysisStartTime}ms`);
        
        if (score >= 80) {
            console.log('🟢 Health System Status: EXCELLENT');
        } else if (score >= 60) {
            console.log('🟡 Health System Status: GOOD');
        } else {
            console.log('🔴 Health System Status: NEEDS ATTENTION');
        }
        
        console.log('\n🚀 Integrated Health System is working correctly!');
        
        return true;
        
    } catch (error) {
        console.error('💥 Health System Test Failed:', error.message);
        console.error('Stack:', error.stack);
        return false;
    }
}

// Helper function to display test results in a formatted way
function displayTestResults(results) {
    console.log('\n📊 Test Results Breakdown:');
    console.log(`   Total: ${results.summary.total}`);
    console.log(`   Passed: ${results.summary.passed} ✅`);
    console.log(`   Failed: ${results.summary.failed} ❌`);
    console.log(`   Errors: ${results.summary.errors} 💥`);
    
    if (results.failedTests.length > 0) {
        console.log('\n🚨 Failed Tests:');
        results.failedTests.forEach(test => {
            console.log(`   • ${test}`);
        });
    }
    
    if (results.errorTests.length > 0) {
        console.log('\n💥 Error Tests:');
        results.errorTests.forEach(test => {
            console.log(`   • ${test}`);
        });
    }
}

// Main execution
if (require.main === module) {
    testHealthSystem()
        .then(success => {
            if (success) {
                console.log('\n✅ Health System test completed successfully!');
                process.exit(0);
            } else {
                console.log('\n❌ Health System test failed!');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\n💥 Unexpected error:', error);
            process.exit(1);
        });
}

module.exports = { testHealthSystem };
