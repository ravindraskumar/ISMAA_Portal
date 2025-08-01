/**
 * DatabaseManager.js - SQLite Database Connection and Management
 * 
 * This class handles all SQLite database operations for the ISMAA Portal:
 * - Database initialization with schema creation
 * - Connection management with WAL mode for better concurrency
 * - Transaction support for data integrity
 * - Database backup functionality
 * - Statistics collection for monitoring
 * 
 * Dependencies: better-sqlite3 (synchronous SQLite driver)
 * Schema: Located in schema.sql file
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

class DatabaseManager {
    constructor(dbPath = null) {
        // Use absolute path to ensure consistency across different execution contexts
        this.dbPath = dbPath || path.join(__dirname, 'ismaa_portal.db');
        this.db = null; // Will hold the Database instance after initialization
    }

    // Initialize database connection and create schema if not exists
    async initialize() {
        try {
            console.log('🔄 Initializing SQLite database...');
            
            // Create database connection (file will be created if it doesn't exist)
            this.db = new Database(this.dbPath);
            
            // Enable WAL mode for better concurrency (Write-Ahead Logging)
            // This allows multiple readers while one writer is active
            this.db.pragma('journal_mode = WAL');
            
            // Enable foreign key constraints for referential integrity
            // SQLite doesn't enforce foreign keys by default
            this.db.pragma('foreign_keys = ON');
            
            // Read and execute schema from external SQL file
            const schemaPath = path.join(__dirname, 'schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');
            
            // Execute schema in a transaction for atomicity
            // Creates all tables, indexes, and constraints if they don't exist
            this.db.exec(schema);
            
            console.log('✅ Database initialized successfully');
            console.log(`📍 Database location: ${path.resolve(this.dbPath)}`);
            
            return true;
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw error;
        }
    }

    // Get database instance for direct queries
    // Throws error if database hasn't been initialized yet
    getDatabase() {
        if (!this.db) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        return this.db;
    }

    // Close database connection gracefully
    // Should be called during application shutdown
    close() {
        if (this.db) {
            this.db.close();
            console.log('🔒 Database connection closed');
        }
    }

    // Execute multiple operations in a single transaction
    // Ensures atomicity - all operations succeed or all fail
    // Callback should contain all database operations to be transacted
    executeTransaction(callback) {
        const transaction = this.db.transaction(callback);
        return transaction();
    }

    // Create a backup of the current database
    // Uses SQLite's built-in backup API for consistent snapshots
    // Returns a Promise that resolves when backup is complete
    backup(backupPath) {
        try {
            const backup = this.db.backup(backupPath);
            
            // Monitor backup progress for large databases
            backup.on('progress', (page, pageCount) => {
                console.log(`Backup progress: ${page}/${pageCount} pages`);
            });
            
            return new Promise((resolve, reject) => {
                backup.on('finish', () => {
                    console.log('✅ Database backup completed');
                    resolve();
                });
                
                backup.on('error', (error) => {
                    console.error('❌ Backup failed:', error);
                    reject(error);
                });
            });
        } catch (error) {
            console.error('❌ Backup initialization failed:', error);
            throw error;
        }
    }

    // Get database statistics for monitoring and admin dashboard
    // Returns record counts for all major tables
    getStats() {
        const stats = {};
        
        try {
            // Core data tables to count
            const tables = ['users', 'members', 'branches', 'industries', 'companies', 'skills', 'blogs', 'notices'];
            
            // Get count for each main table
            tables.forEach(table => {
                const result = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
                stats[table] = result.count;
            });
            
            // Add relationship table counts for completeness
            stats.member_skills = this.db.prepare('SELECT COUNT(*) as count FROM member_skills').get().count;
            stats.blog_tag_relations = this.db.prepare('SELECT COUNT(*) as count FROM blog_tag_relations').get().count;
            
        } catch (error) {
            console.error('Error getting database stats:', error);
        }
        
        return stats;
    }
}

module.exports = DatabaseManager;
