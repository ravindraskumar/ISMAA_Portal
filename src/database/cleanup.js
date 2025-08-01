/**
 * cleanup.js - Database Maintenance and Cleanup Utility
 * 
 * This utility removes unused data from lookup tables and optimizes the database:
 * - Removes unused branches, industries, companies not referenced by members
 * - Cleans up orphaned skills and blog tags
 * - Removes orphaned relationship records
 * - Runs VACUUM to reclaim disk space
 * - Provides detailed reporting of cleanup operations
 * 
 * Key Features:
 * - Transaction-based operations for data integrity
 * - Dry-run mode for safe preview of changes
 * - Comprehensive reporting with before/after statistics  
 * - Command-line interface with options
 * - Foreign key constraint respect to maintain referential integrity
 * 
 * Usage: 
 * - node cleanup.js (performs cleanup)
 * - node cleanup.js --dry-run (preview only)
 * - node cleanup.js --skip-vacuum (skip space reclamation)
 * 
 * Dependencies: DatabaseManager for connection management
 */

const DatabaseManager = require('./DatabaseManager');
const path = require('path');

class DatabaseCleanup {
    constructor() {
        this.dbManager = new DatabaseManager();
        
        // Statistics tracking for detailed reporting
        // Tracks before/after counts and number of records removed
        this.cleanupStats = {
            branches: { before: 0, after: 0, removed: 0 },
            industries: { before: 0, after: 0, removed: 0 },
            companies: { before: 0, after: 0, removed: 0 },
            skills: { before: 0, after: 0, removed: 0 },
            blogTags: { before: 0, after: 0, removed: 0 },
            orphanedMemberSkills: { removed: 0 },
            orphanedBlogTagRelations: { removed: 0 }
        };
    }

    // Initialize database connection and prepare cleanup operations
    async initialize() {
        await this.dbManager.initialize();
        this.db = this.dbManager.getDatabase();
        console.log('🔄 Database cleanup utility initialized');
        console.log('📍 Database location:', this.dbManager.dbPath);
    }

    // Helper function to get record count for any table
    // Used for before/after statistics in cleanup reporting
    getTableCount(tableName) {
        const result = this.db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
        return result.count;
    }

    // Clean up branches that are not referenced by any members
    // Uses LEFT JOIN to find orphaned records safely
    cleanupBranches() {
        console.log('\n🧹 Cleaning up unused branches...');
        
        this.cleanupStats.branches.before = this.getTableCount('branches');
        
        // Find branches not referenced by any member using LEFT JOIN
        // Only selects branches where no member references them (m.id IS NULL)
        const unusedBranches = this.db.prepare(`
            SELECT b.id, b.name 
            FROM branches b 
            LEFT JOIN members m ON b.id = m.branch_id 
            WHERE m.id IS NULL
        `).all();
        
        if (unusedBranches.length > 0) {
            console.log(`Found ${unusedBranches.length} unused branches:`);
            unusedBranches.forEach(branch => {
                console.log(`  - ${branch.name} (ID: ${branch.id})`);
            });
            
            // Delete unused branches
            const deleteBranches = this.db.prepare('DELETE FROM branches WHERE id = ?');
            const deleteTransaction = this.db.transaction(() => {
                unusedBranches.forEach(branch => {
                    deleteBranches.run(branch.id);
                });
            });
            deleteTransaction();
            
            this.cleanupStats.branches.removed = unusedBranches.length;
        } else {
            console.log('✅ No unused branches found');
        }
        
        this.cleanupStats.branches.after = this.getTableCount('branches');
    }

    // Clean up unused industries
    cleanupIndustries() {
        console.log('\n🧹 Cleaning up unused industries...');
        
        this.cleanupStats.industries.before = this.getTableCount('industries');
        
        const unusedIndustries = this.db.prepare(`
            SELECT i.id, i.name 
            FROM industries i 
            LEFT JOIN members m ON i.id = m.industry_id 
            WHERE m.id IS NULL
        `).all();
        
        if (unusedIndustries.length > 0) {
            console.log(`Found ${unusedIndustries.length} unused industries:`);
            unusedIndustries.forEach(industry => {
                console.log(`  - ${industry.name} (ID: ${industry.id})`);
            });
            
            const deleteIndustries = this.db.prepare('DELETE FROM industries WHERE id = ?');
            const deleteTransaction = this.db.transaction(() => {
                unusedIndustries.forEach(industry => {
                    deleteIndustries.run(industry.id);
                });
            });
            deleteTransaction();
            
            this.cleanupStats.industries.removed = unusedIndustries.length;
        } else {
            console.log('✅ No unused industries found');
        }
        
        this.cleanupStats.industries.after = this.getTableCount('industries');
    }

    // Clean up unused companies
    cleanupCompanies() {
        console.log('\n🧹 Cleaning up unused companies...');
        
        this.cleanupStats.companies.before = this.getTableCount('companies');
        
        const unusedCompanies = this.db.prepare(`
            SELECT c.id, c.name 
            FROM companies c 
            LEFT JOIN members m ON c.id = m.company_id 
            WHERE m.id IS NULL
        `).all();
        
        if (unusedCompanies.length > 0) {
            console.log(`Found ${unusedCompanies.length} unused companies:`);
            unusedCompanies.forEach(company => {
                console.log(`  - ${company.name} (ID: ${company.id})`);
            });
            
            const deleteCompanies = this.db.prepare('DELETE FROM companies WHERE id = ?');
            const deleteTransaction = this.db.transaction(() => {
                unusedCompanies.forEach(company => {
                    deleteCompanies.run(company.id);
                });
            });
            deleteTransaction();
            
            this.cleanupStats.companies.removed = unusedCompanies.length;
        } else {
            console.log('✅ No unused companies found');
        }
        
        this.cleanupStats.companies.after = this.getTableCount('companies');
    }

    // Clean up unused skills
    cleanupSkills() {
        console.log('\n🧹 Cleaning up unused skills...');
        
        this.cleanupStats.skills.before = this.getTableCount('skills');
        
        const unusedSkills = this.db.prepare(`
            SELECT s.id, s.name 
            FROM skills s 
            LEFT JOIN member_skills ms ON s.id = ms.skill_id 
            WHERE ms.id IS NULL
        `).all();
        
        if (unusedSkills.length > 0) {
            console.log(`Found ${unusedSkills.length} unused skills:`);
            unusedSkills.forEach(skill => {
                console.log(`  - ${skill.name} (ID: ${skill.id})`);
            });
            
            const deleteSkills = this.db.prepare('DELETE FROM skills WHERE id = ?');
            const deleteTransaction = this.db.transaction(() => {
                unusedSkills.forEach(skill => {
                    deleteSkills.run(skill.id);
                });
            });
            deleteTransaction();
            
            this.cleanupStats.skills.removed = unusedSkills.length;
        } else {
            console.log('✅ No unused skills found');
        }
        
        this.cleanupStats.skills.after = this.getTableCount('skills');
    }

    // Clean up unused blog tags
    cleanupBlogTags() {
        console.log('\n🧹 Cleaning up unused blog tags...');
        
        this.cleanupStats.blogTags.before = this.getTableCount('blog_tags');
        
        const unusedTags = this.db.prepare(`
            SELECT bt.id, bt.name 
            FROM blog_tags bt 
            LEFT JOIN blog_tag_relations btr ON bt.id = btr.tag_id 
            WHERE btr.id IS NULL
        `).all();
        
        if (unusedTags.length > 0) {
            console.log(`Found ${unusedTags.length} unused blog tags:`);
            unusedTags.forEach(tag => {
                console.log(`  - ${tag.name} (ID: ${tag.id})`);
            });
            
            const deleteTags = this.db.prepare('DELETE FROM blog_tags WHERE id = ?');
            const deleteTransaction = this.db.transaction(() => {
                unusedTags.forEach(tag => {
                    deleteTags.run(tag.id);
                });
            });
            deleteTransaction();
            
            this.cleanupStats.blogTags.removed = unusedTags.length;
        } else {
            console.log('✅ No unused blog tags found');
        }
        
        this.cleanupStats.blogTags.after = this.getTableCount('blog_tags');
    }

    // Clean up orphaned member skills (skills linked to non-existent members)
    cleanupOrphanedMemberSkills() {
        console.log('\n🧹 Cleaning up orphaned member skills...');
        
        const orphanedMemberSkills = this.db.prepare(`
            SELECT ms.id, ms.member_id, ms.skill_id 
            FROM member_skills ms 
            LEFT JOIN members m ON ms.member_id = m.id 
            WHERE m.id IS NULL
        `).all();
        
        if (orphanedMemberSkills.length > 0) {
            console.log(`Found ${orphanedMemberSkills.length} orphaned member skill relations:`);
            orphanedMemberSkills.forEach(relation => {
                console.log(`  - Member ID: ${relation.member_id}, Skill ID: ${relation.skill_id}`);
            });
            
            const deleteOrphanedSkills = this.db.prepare('DELETE FROM member_skills WHERE id = ?');
            const deleteTransaction = this.db.transaction(() => {
                orphanedMemberSkills.forEach(relation => {
                    deleteOrphanedSkills.run(relation.id);
                });
            });
            deleteTransaction();
            
            this.cleanupStats.orphanedMemberSkills.removed = orphanedMemberSkills.length;
        } else {
            console.log('✅ No orphaned member skills found');
        }
    }

    // Clean up orphaned blog tag relations (tags linked to non-existent blogs)
    cleanupOrphanedBlogTagRelations() {
        console.log('\n🧹 Cleaning up orphaned blog tag relations...');
        
        const orphanedBlogTags = this.db.prepare(`
            SELECT btr.id, btr.blog_id, btr.tag_id 
            FROM blog_tag_relations btr 
            LEFT JOIN blogs b ON btr.blog_id = b.id 
            WHERE b.id IS NULL
        `).all();
        
        if (orphanedBlogTags.length > 0) {
            console.log(`Found ${orphanedBlogTags.length} orphaned blog tag relations:`);
            orphanedBlogTags.forEach(relation => {
                console.log(`  - Blog ID: ${relation.blog_id}, Tag ID: ${relation.tag_id}`);
            });
            
            const deleteOrphanedTags = this.db.prepare('DELETE FROM blog_tag_relations WHERE id = ?');
            const deleteTransaction = this.db.transaction(() => {
                orphanedBlogTags.forEach(relation => {
                    deleteOrphanedTags.run(relation.id);
                });
            });
            deleteTransaction();
            
            this.cleanupStats.orphanedBlogTagRelations.removed = orphanedBlogTags.length;
        } else {
            console.log('✅ No orphaned blog tag relations found');
        }
    }

    // Generate cleanup report
    generateReport() {
        console.log('\n📊 DATABASE CLEANUP REPORT');
        console.log('==========================');
        
        const totalRemoved = 
            this.cleanupStats.branches.removed +
            this.cleanupStats.industries.removed +
            this.cleanupStats.companies.removed +
            this.cleanupStats.skills.removed +
            this.cleanupStats.blogTags.removed +
            this.cleanupStats.orphanedMemberSkills.removed +
            this.cleanupStats.orphanedBlogTagRelations.removed;
        
        console.log(`\n🗑️  CLEANUP SUMMARY:`);
        console.log(`   Total records removed: ${totalRemoved}`);
        console.log('');
        
        console.log('📋 DETAILED BREAKDOWN:');
        console.log(`   Branches:         ${this.cleanupStats.branches.before} → ${this.cleanupStats.branches.after} (-${this.cleanupStats.branches.removed})`);
        console.log(`   Industries:       ${this.cleanupStats.industries.before} → ${this.cleanupStats.industries.after} (-${this.cleanupStats.industries.removed})`);
        console.log(`   Companies:        ${this.cleanupStats.companies.before} → ${this.cleanupStats.companies.after} (-${this.cleanupStats.companies.removed})`);
        console.log(`   Skills:           ${this.cleanupStats.skills.before} → ${this.cleanupStats.skills.after} (-${this.cleanupStats.skills.removed})`);
        console.log(`   Blog Tags:        ${this.cleanupStats.blogTags.before} → ${this.cleanupStats.blogTags.after} (-${this.cleanupStats.blogTags.removed})`);
        console.log(`   Orphaned M-Skills: Removed ${this.cleanupStats.orphanedMemberSkills.removed}`);
        console.log(`   Orphaned B-Tags:   Removed ${this.cleanupStats.orphanedBlogTagRelations.removed}`);
        
        if (totalRemoved === 0) {
            console.log('\n✅ Database is already clean - no unused data found!');
        } else {
            console.log('\n🎉 Database cleanup completed successfully!');
        }
    }

    // Vacuum database to reclaim space
    vacuumDatabase() {
        console.log('\n🔧 Running VACUUM to reclaim disk space...');
        const startTime = Date.now();
        
        this.db.exec('VACUUM');
        
        const endTime = Date.now();
        console.log(`✅ VACUUM completed in ${endTime - startTime}ms`);
    }

    // Main cleanup function
    async runCleanup(options = {}) {
        const {
            skipVacuum = false,
            dryRun = false
        } = options;

        try {
            console.log('🚀 ISMAA Database Cleanup Utility');
            console.log('=================================');
            
            if (dryRun) {
                console.log('⚠️  DRY RUN MODE - No changes will be made');
            }
            
            // Show current database statistics
            console.log('\n📊 Current database statistics:');
            console.log(`   Members: ${this.getTableCount('members')}`);
            console.log(`   Branches: ${this.getTableCount('branches')}`);
            console.log(`   Industries: ${this.getTableCount('industries')}`);
            console.log(`   Companies: ${this.getTableCount('companies')}`);
            console.log(`   Skills: ${this.getTableCount('skills')}`);
            console.log(`   Blog Tags: ${this.getTableCount('blog_tags')}`);
            console.log(`   Blogs: ${this.getTableCount('blogs')}`);
            console.log(`   Notices: ${this.getTableCount('notices')}`);
            
            if (!dryRun) {
                // Begin transaction for all cleanup operations
                const transaction = this.db.transaction(() => {
                    this.cleanupBranches();
                    this.cleanupIndustries();
                    this.cleanupCompanies();
                    this.cleanupSkills();
                    this.cleanupBlogTags();
                    this.cleanupOrphanedMemberSkills();
                    this.cleanupOrphanedBlogTagRelations();
                });
                
                transaction();
                
                // Generate report
                this.generateReport();
                
                // Vacuum database if requested
                if (!skipVacuum) {
                    this.vacuumDatabase();
                }
            } else {
                console.log('\n⚠️  Dry run completed - use runCleanup({dryRun: false}) to perform actual cleanup');
            }
            
        } catch (error) {
            console.error('❌ Cleanup failed:', error);
            throw error;
        }
    }

    close() {
        this.dbManager.close();
        console.log('🔒 Database connection closed');
    }
}

// Export the class for use as a module
module.exports = DatabaseCleanup;

// If run directly from command line
if (require.main === module) {
    async function main() {
        const cleanup = new DatabaseCleanup();
        
        try {
            await cleanup.initialize();
            
            // Check command line arguments
            const args = process.argv.slice(2);
            const dryRun = args.includes('--dry-run') || args.includes('-d');
            const skipVacuum = args.includes('--skip-vacuum') || args.includes('-s');
            
            await cleanup.runCleanup({ dryRun, skipVacuum });
            
        } catch (error) {
            console.error('❌ Database cleanup failed:', error);
            process.exit(1);
        } finally {
            cleanup.close();
        }
    }
    
    main();
}
