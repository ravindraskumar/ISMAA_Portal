console.log('🏥 Starting Health System Validation...');
console.log('Step 1: Testing basic functionality');

// Step 1: Test basic console output
console.log('✅ Console output working');

// Step 2: Test file system
const fs = require('fs');
const path = require('path');
console.log('✅ File system modules loaded');

// Step 3: Check if our files exist
const healthSystemPath = path.join(__dirname, 'utilities', 'integrated_health_system.js');
const testSuitePath = path.join(__dirname, 'tests', 'unified-test-suite.js');
const maintenancePath = path.join(__dirname, 'utilities', 'master_maintenance_tool.js');

console.log('Step 2: Checking file existence...');
console.log('Health System exists:', fs.existsSync(healthSystemPath));
console.log('Test Suite exists:', fs.existsSync(testSuitePath));
console.log('Maintenance Tool exists:', fs.existsSync(maintenancePath));

// Step 4: Test module loading one by one
console.log('Step 3: Testing module loading...');

try {
    console.log('Loading IntegratedHealthSystem...');
    const IntegratedHealthSystem = require('./utilities/integrated_health_system');
    console.log('✅ IntegratedHealthSystem loaded');
} catch (error) {
    console.error('❌ Error loading IntegratedHealthSystem:', error.message);
    process.exit(1);
}

try {
    console.log('Loading UnifiedTestSuite...');
    const UnifiedTestSuite = require('./tests/unified-test-suite');
    console.log('✅ UnifiedTestSuite loaded');
} catch (error) {
    console.error('❌ Error loading UnifiedTestSuite:', error.message);
    process.exit(1);
}

try {
    console.log('Loading MasterMaintenanceTool...');
    const MasterMaintenanceTool = require('./utilities/master_maintenance_tool');
    console.log('✅ MasterMaintenanceTool loaded');
} catch (error) {
    console.error('❌ Error loading MasterMaintenanceTool:', error.message);
    process.exit(1);
}

console.log('🎉 All modules loaded successfully!');
console.log('🚀 Health System integration is ready!');
