const fs = require('fs');
const path = require('path');
const DatabaseManager = require('./DatabaseManager');

class DataMigration {
    constructor() {
        this.dbManager = new DatabaseManager();
        this.jsonData = null;
    }

    // Load existing JSON data
    loadJsonData() {
        try {
            const jsonPath = path.join(__dirname, '../../db.json');
            const jsonContent = fs.readFileSync(jsonPath, 'utf8');
            this.jsonData = JSON.parse(jsonContent);
            console.log('✅ JSON data loaded successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to load JSON data:', error);
            throw error;
        }
    }

    // Create backup of original JSON file
    createBackup() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(__dirname, `../../db_backup_${timestamp}.json`);
            
            fs.copyFileSync(
                path.join(__dirname, '../../db.json'),
                backupPath
            );
            
            console.log(`✅ JSON backup created: ${backupPath}`);
            return backupPath;
        } catch (error) {
            console.error('❌ Failed to create backup:', error);
            throw error;
        }
    }

    // Migrate lookup tables (branches, industries, companies)
    migrateLookupTables(db) {
        console.log('🔄 Migrating lookup tables...');
        
        try {
            // Migrate branches
            const insertBranch = db.prepare('INSERT INTO branches (name) VALUES (?)');
            const branches = this.jsonData.branches || [];
            branches.forEach(branch => {
                try {
                    insertBranch.run(branch);
                } catch (error) {
                    if (!error.message.includes('UNIQUE constraint failed')) {
                        throw error;
                    }
                }
            });
            console.log(`✅ Migrated ${branches.length} branches`);

            // Migrate industries
            const insertIndustry = db.prepare('INSERT INTO industries (name) VALUES (?)');
            const industries = this.jsonData.industries || [];
            industries.forEach(industry => {
                try {
                    insertIndustry.run(industry);
                } catch (error) {
                    if (!error.message.includes('UNIQUE constraint failed')) {
                        throw error;
                    }
                }
            });
            console.log(`✅ Migrated ${industries.length} industries`);

            // Migrate companies
            const insertCompany = db.prepare('INSERT INTO companies (name) VALUES (?)');
            const companies = this.jsonData.companies || [];
            companies.forEach(company => {
                try {
                    insertCompany.run(company);
                } catch (error) {
                    if (!error.message.includes('UNIQUE constraint failed')) {
                        throw error;
                    }
                }
            });
            console.log(`✅ Migrated ${companies.length} companies`);

        } catch (error) {
            console.error('❌ Lookup table migration failed:', error);
            throw error;
        }
    }

    // Migrate skills from member data
    migrateSkills(db) {
        console.log('🔄 Extracting and migrating skills...');
        
        try {
            const insertSkill = db.prepare('INSERT OR IGNORE INTO skills (name, category) VALUES (?, ?)');
            const skillsSet = new Set();
            
            // Extract unique skills from all members
            const members = this.jsonData.members || [];
            members.forEach(member => {
                if (member.skills && Array.isArray(member.skills)) {
                    member.skills.forEach(skill => {
                        if (skill && skill.trim()) {
                            skillsSet.add(skill.trim());
                        }
                    });
                }
            });

            // Insert skills with categorization
            skillsSet.forEach(skill => {
                let category = 'general';
                
                // Basic categorization based on skill name
                const skillLower = skill.toLowerCase();
                if (skillLower.includes('python') || skillLower.includes('javascript') || 
                    skillLower.includes('react') || skillLower.includes('java') || 
                    skillLower.includes('programming') || skillLower.includes('development')) {
                    category = 'technical';
                } else if (skillLower.includes('management') || skillLower.includes('leadership') || 
                          skillLower.includes('business') || skillLower.includes('sales')) {
                    category = 'professional';
                } else if (skillLower.includes('mining') || skillLower.includes('engineering') || 
                          skillLower.includes('mechanical') || skillLower.includes('civil')) {
                    category = 'engineering';
                }
                
                insertSkill.run(skill, category);
            });
            
            console.log(`✅ Migrated ${skillsSet.size} unique skills`);
        } catch (error) {
            console.error('❌ Skills migration failed:', error);
            throw error;
        }
    }

    // Migrate users
    migrateUsers(db) {
        console.log('🔄 Migrating users...');
        
        try {
            const insertUser = db.prepare(`
                INSERT INTO users (username, password, role, name, email) 
                VALUES (?, ?, ?, ?, ?)
            `);
            
            const users = this.jsonData.users || [];
            users.forEach(user => {
                insertUser.run(
                    user.username,
                    user.password,
                    user.role || 'member',
                    user.name,
                    user.email
                );
            });
            
            console.log(`✅ Migrated ${users.length} users`);
        } catch (error) {
            console.error('❌ Users migration failed:', error);
            throw error;
        }
    }

    // Migrate members with relationships
    migrateMembers(db) {
        console.log('🔄 Migrating members...');
        
        try {
            // Prepare statements
            const getBranchId = db.prepare('SELECT id FROM branches WHERE name = ?');
            const getIndustryId = db.prepare('SELECT id FROM industries WHERE name = ?');
            const getCompanyId = db.prepare('SELECT id FROM companies WHERE name = ?');
            const getSkillId = db.prepare('SELECT id FROM skills WHERE name = ?');
            
            const insertMember = db.prepare(`
                INSERT INTO members (legacy_id, name, email, phone, address, passout_batch, 
                                   branch_id, industry_id, company_id, photo, membership_id, membership_type) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            const insertMemberSkill = db.prepare(`
                INSERT INTO member_skills (member_id, skill_id) VALUES (?, ?)
            `);
            
            const members = this.jsonData.members || [];
            
            members.forEach(member => {
                // Get foreign key IDs
                const branchId = member.branch ? getBranchId.get(member.branch)?.id : null;
                const industryId = member.industry ? getIndustryId.get(member.industry)?.id : null;
                const companyId = member.company ? getCompanyId.get(member.company)?.id : null;
                
                // Insert member
                const result = insertMember.run(
                    member.id, // legacy_id
                    member.name,
                    member.email || null,
                    member.phone || null,
                    member.address || null,
                    member.passoutBatch || null,
                    branchId,
                    industryId,
                    companyId,
                    member.photo || null,
                    member.membershipID || null,
                    member.membershipType || 'Member'
                );
                
                const memberId = result.lastInsertRowid;
                
                // Insert member skills
                if (member.skills && Array.isArray(member.skills)) {
                    member.skills.forEach(skill => {
                        if (skill && skill.trim()) {
                            const skillId = getSkillId.get(skill.trim())?.id;
                            if (skillId) {
                                try {
                                    insertMemberSkill.run(memberId, skillId);
                                } catch (error) {
                                    // Ignore duplicate entries
                                    if (!error.message.includes('UNIQUE constraint failed')) {
                                        throw error;
                                    }
                                }
                            }
                        }
                    });
                }
            });
            
            console.log(`✅ Migrated ${members.length} members with skills relationships`);
        } catch (error) {
            console.error('❌ Members migration failed:', error);
            throw error;
        }
    }

    // Migrate blogs and tags
    migrateBlogs(db) {
        console.log('🔄 Migrating blogs...');
        
        try {
            const insertBlog = db.prepare(`
                INSERT INTO blogs (legacy_id, title, content, author, category, created_at) 
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            
            const insertTag = db.prepare('INSERT OR IGNORE INTO blog_tags (name) VALUES (?)');
            const getTagId = db.prepare('SELECT id FROM blog_tags WHERE name = ?');
            const insertBlogTag = db.prepare('INSERT INTO blog_tag_relations (blog_id, tag_id) VALUES (?, ?)');
            
            const blogs = this.jsonData.blogs || [];
            
            blogs.forEach(blog => {
                // Insert blog
                const result = insertBlog.run(
                    blog.id,
                    blog.title,
                    blog.content,
                    blog.author,
                    blog.category || 'education',
                    blog.date || new Date().toISOString()
                );
                
                const blogId = result.lastInsertRowid;
                
                // Insert tags
                if (blog.tags && Array.isArray(blog.tags)) {
                    blog.tags.forEach(tag => {
                        if (tag && tag.trim()) {
                            insertTag.run(tag.trim());
                            const tagId = getTagId.get(tag.trim())?.id;
                            if (tagId) {
                                try {
                                    insertBlogTag.run(blogId, tagId);
                                } catch (error) {
                                    if (!error.message.includes('UNIQUE constraint failed')) {
                                        throw error;
                                    }
                                }
                            }
                        }
                    });
                }
            });
            
            console.log(`✅ Migrated ${blogs.length} blogs with tags`);
        } catch (error) {
            console.error('❌ Blogs migration failed:', error);
            throw error;
        }
    }

    // Migrate notices
    migrateNotices(db) {
        console.log('🔄 Migrating notices...');
        
        try {
            const insertNotice = db.prepare(`
                INSERT INTO notices (legacy_id, title, content, category, priority, author, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            
            const notices = this.jsonData.notices || [];
            
            notices.forEach(notice => {
                insertNotice.run(
                    notice.id,
                    notice.title,
                    notice.content,
                    notice.category || 'announcement',
                    notice.priority || 'medium',
                    notice.author,
                    notice.date || new Date().toISOString()
                );
            });
            
            console.log(`✅ Migrated ${notices.length} notices`);
        } catch (error) {
            console.error('❌ Notices migration failed:', error);
            throw error;
        }
    }

    // Run complete migration
    async runMigration() {
        console.log('🚀 Starting ISMAA Portal Database Migration');
        console.log('=====================================');
        
        try {
            // Step 1: Create backup
            const backupPath = this.createBackup();
            
            // Step 2: Load JSON data
            this.loadJsonData();
            
            // Step 3: Initialize database
            await this.dbManager.initialize();
            const db = this.dbManager.getDatabase();
            
            // Step 4: Run migration in transaction
            this.dbManager.executeTransaction(() => {
                this.migrateLookupTables(db);
                this.migrateSkills(db);
                this.migrateUsers(db);
                this.migrateMembers(db);
                this.migrateBlogs(db);
                this.migrateNotices(db);
            });
            
            // Step 5: Verify migration
            const stats = this.dbManager.getStats();
            console.log('\n📊 Migration Statistics:');
            console.log('========================');
            Object.entries(stats).forEach(([table, count]) => {
                console.log(`${table}: ${count} records`);
            });
            
            console.log('\n✅ Migration completed successfully!');
            console.log(`📁 Backup saved: ${backupPath}`);
            console.log(`🗄️  Database created: ${path.resolve('./ismaa_portal.db')}`);
            
            return true;
            
        } catch (error) {
            console.error('\n❌ Migration failed:', error);
            throw error;
        } finally {
            this.dbManager.close();
        }
    }
}

// Export for use as module
module.exports = DataMigration;

// Run migration if this file is executed directly
if (require.main === module) {
    const migration = new DataMigration();
    migration.runMigration()
        .then(() => {
            console.log('\n🎉 Migration process completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Migration process failed:', error);
            process.exit(1);
        });
}
