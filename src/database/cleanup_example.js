// =====================================================
// ISMAA Bengaluru Portal - Database Cleanup Example
// =====================================================
//
// This example demonstrates how to use the DatabaseCleanup utility
// to maintain optimal database performance through regular maintenance.
//
// The cleanup utility performs several maintenance operations:
// - Removes duplicate entries from lookup tables
// - Cleans up orphaned records with broken foreign key relationships
// - Optimizes database storage with VACUUM operation
// - Provides detailed reporting of cleanup operations
//
// Usage Examples:
// 1. Dry run (preview cleanup without changes):
//    node src/database/cleanup_example.js
//    (modify dryRun: true in the options)
//
// 2. Full cleanup with vacuum:
//    node src/database/cleanup_example.js
//    (dryRun: false, skipVacuum: false)
//
// 3. Cleanup without vacuum (faster, less thorough):
//    node src/database/cleanup_example.js
//    (dryRun: false, skipVacuum: true)
//
// Best Practices:
// - Always run with dryRun: true first to preview changes
// - Run cleanup during low-traffic periods
// - Monitor cleanup reports for data quality insights
// - Schedule regular cleanup to maintain performance
//
// Dependencies: cleanup.js, DatabaseManager.js
// Author: ISMAA Portal Team
// =====================================================

// Example usage of the database cleanup utility
const DatabaseCleanup = require('./cleanup');

/**
 * Demonstrates comprehensive database cleanup operations
 * Shows different cleanup options and proper error handling
 */
async function runCleanupExample() {
    const cleanup = new DatabaseCleanup();
    
    try {
        // Initialize database connection
        await cleanup.initialize();
        
        console.log('🔍 Running database cleanup example...\n');
        
        // Run the cleanup with configurable options
        // IMPORTANT: Set dryRun: true to preview changes without modifying data
        await cleanup.runCleanup({ 
            dryRun: false,        // Set to true for preview mode (recommended for first run)
            skipVacuum: false     // Set to true to skip VACUUM operation (faster but less thorough)
        });
        
        console.log('\n✅ Cleanup example completed successfully!');
        
    } catch (error) {
        console.error('❌ Cleanup example failed:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        // Always ensure database connection is properly closed
        cleanup.close();
    }
}

// Run example if this file is executed directly
if (require.main === module) {
    runCleanupExample();
}

// Export for use in other modules
module.exports = { runCleanupExample };
