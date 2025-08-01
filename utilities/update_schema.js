// =====================================================
// ISMAA Portal - Database Schema Update Script
// =====================================================

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

async function updateSchema() {
  console.log('🔄 Updating database schema...\n');
  
  try {
    const dbPath = path.join(__dirname, 'src', 'database', 'ismaa_portal.db');
    const schemaPath = path.join(__dirname, 'src', 'database', 'schema.sql');
    
    console.log(`Database: ${dbPath}`);
    console.log(`Schema: ${schemaPath}`);
    
    const db = new Database(dbPath);
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split schema into individual statements
    const statements = schema.split(';').filter(stmt => stmt.trim());
    
    console.log(`\n📝 Executing ${statements.length} SQL statements...\n`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        try {
          db.exec(statement);
          console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully`);
        } catch (error) {
          if (error.message.includes('already exists') || error.message.includes('duplicate column')) {
            console.log(`ℹ️  Statement ${i + 1}/${statements.length} - already exists (skipped)`);
          } else {
            console.log(`❌ Statement ${i + 1}/${statements.length} failed: ${error.message}`);
          }
        }
      }
    }
    
    console.log('\n✅ Schema update completed!');
    
    // Verify the users table structure
    const userTableInfo = db.prepare("PRAGMA table_info(users)").all();
    console.log('\n👥 Users table structure:');
    userTableInfo.forEach(col => {
      console.log(`   - ${col.name} (${col.type})`);
    });
    
    db.close();
    
  } catch (error) {
    console.error('❌ Schema update failed:', error);
  }
}

updateSchema().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Update error:', error);
  process.exit(1);
});
