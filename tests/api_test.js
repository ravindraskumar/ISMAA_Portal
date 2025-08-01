#!/usr/bin/env node

/**
 * Test Script for Admin UI Button Functionality
 * 
 * This script tests the API endpoints that the admin UI buttons call
 * to verify they are working correctly.
 */

const http = require('http');

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonBody = body ? JSON.parse(body) : {};
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: jsonBody
                    });
                } catch (error) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: body
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function testAdminAPIEndpoints() {
    console.log('🔍 Testing Admin UI API Endpoints');
    console.log('=' .repeat(50));

    const baseOptions = {
        hostname: 'localhost',
        port: 3001,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    // Test 1: Health check endpoint
    console.log('\n🏥 Testing basic health endpoint...');
    try {
        const healthResponse = await makeRequest({
            ...baseOptions,
            path: '/health',
            method: 'GET'
        });
        
        if (healthResponse.statusCode === 200) {
            console.log('✅ Health endpoint working:', healthResponse.body.status);
        } else {
            console.log('❌ Health endpoint failed:', healthResponse.statusCode);
        }
    } catch (error) {
        console.log('💥 Health endpoint error:', error.message);
    }

    // Test 2: Comprehensive health analysis endpoint
    console.log('\n📊 Testing comprehensive health analysis endpoint...');
    try {
        const analysisResponse = await makeRequest({
            ...baseOptions,
            path: '/api/health/comprehensive-analysis',
            method: 'POST'
        });
        
        console.log(`📈 Analysis response status: ${analysisResponse.statusCode}`);
        if (analysisResponse.statusCode === 200) {
            console.log('✅ Comprehensive analysis endpoint is accessible');
            if (analysisResponse.body.overallHealthScore !== undefined) {
                console.log(`🎯 Health Score: ${analysisResponse.body.overallHealthScore}/100`);
            }
        } else {
            console.log('⚠️ Analysis endpoint returned:', analysisResponse.statusCode);
            console.log('📝 Response:', analysisResponse.body);
        }
    } catch (error) {
        console.log('💥 Analysis endpoint error:', error.message);
    }

    // Test 3: Test runner endpoint
    console.log('\n🧪 Testing test runner endpoint...');
    try {
        const testResponse = await makeRequest({
            ...baseOptions,
            path: '/api/health/run-tests',
            method: 'POST'
        }, { category: 'authentication' });
        
        console.log(`🔬 Test runner response status: ${testResponse.statusCode}`);
        if (testResponse.statusCode === 200) {
            console.log('✅ Test runner endpoint is accessible');
            if (testResponse.body.testResults) {
                console.log('📊 Test results received');
            }
        } else {
            console.log('⚠️ Test runner endpoint returned:', testResponse.statusCode);
            console.log('📝 Response:', testResponse.body);
        }
    } catch (error) {
        console.log('💥 Test runner endpoint error:', error.message);
    }

    // Test 4: Maintenance function endpoint
    console.log('\n🔧 Testing maintenance function endpoint...');
    try {
        const maintenanceResponse = await makeRequest({
            ...baseOptions,
            path: '/api/maintenance/run-function',
            method: 'POST'
        }, { functionName: 'performHealthCheck' });
        
        console.log(`⚙️ Maintenance response status: ${maintenanceResponse.statusCode}`);
        if (maintenanceResponse.statusCode === 200) {
            console.log('✅ Maintenance function endpoint is accessible');
            if (maintenanceResponse.body.results) {
                console.log('🔧 Maintenance results received');
            }
        } else {
            console.log('⚠️ Maintenance endpoint returned:', maintenanceResponse.statusCode);
            console.log('📝 Response:', maintenanceResponse.body);
        }
    } catch (error) {
        console.log('💥 Maintenance endpoint error:', error.message);
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📋 API Endpoint Test Summary');
    console.log('='.repeat(50));
    console.log('✅ Basic health endpoint: Tested');
    console.log('📊 Comprehensive analysis: Tested');
    console.log('🧪 Test runner: Tested');
    console.log('🔧 Maintenance functions: Tested');
    console.log('\n💡 If all endpoints returned status 200, the admin buttons should work!');
    console.log('🚀 You can now test the UI buttons in the admin section.');
}

// Run the tests
if (require.main === module) {
    testAdminAPIEndpoints()
        .then(() => {
            console.log('\n✅ API endpoint testing completed!');
        })
        .catch(error => {
            console.error('\n💥 Unexpected error:', error);
        });
}

module.exports = { testAdminAPIEndpoints };
