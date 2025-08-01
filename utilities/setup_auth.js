// =====================================================
// ISMAA Portal - Authentication Setup Script
// =====================================================
// 
// Sets up initial authentication system with default admin user
// and demonstrates the enhanced authentication features.

const DatabaseAPI = require('./src/database/DatabaseAPI');

async function setupAuthentication() {
  console.log('🔐 Setting up authentication system...\n');
  
  try {
    const db = new DatabaseAPI();
    await db.initialize();
    
    // Create or update default admin user
    console.log('👤 Creating/updating default admin user...');
    
    // First, delete existing admin if it exists without auth columns
    try {
      const db_direct = require('better-sqlite3')('src/database/ismaa_portal.db');
      const existingAdmin = db_direct.prepare('SELECT * FROM users WHERE username = ?').get('admin');
      if (existingAdmin && !existingAdmin.password_hash) {
        db_direct.prepare('DELETE FROM users WHERE username = ?').run('admin');
        console.log('🗑️  Removed old admin user without authentication');
      }
      db_direct.close();
    } catch (error) {
      console.log('ℹ️  Could not check/remove old admin:', error.message);
    }
    
    const adminResult = await db.createUser({
      username: 'admin',
      password: 'Admin123!@#', // Strong password with mixed case, numbers, and symbols
      name: 'Administrator',
      email: 'admin@ismaa.edu',
      role: 'admin',
      firstLogin: true // Force password change on first login
    });
    
    if (adminResult.success) {
      console.log('✅ Admin user created successfully');
      console.log(`   Username: admin`);
      console.log(`   Password: Admin123!@# (change on first login)`);
      console.log(`   Role: admin\n`);
    } else {
      console.log('ℹ️ Admin user already exists or creation failed');
      console.log(`   Error: ${adminResult.error}\n`);
    }
    
    // Create a test member user
    console.log('👥 Creating test member user...');
    const memberResult = await db.createUser({
      username: 'testuser',
      password: 'Test123!@#',
      name: 'Test User',
      email: 'test@ismaa.edu',
      role: 'member',
      firstLogin: false
    });
    
    if (memberResult.success) {
      console.log('✅ Test member user created successfully');
      console.log(`   Username: testuser`);
      console.log(`   Password: Test123!@#`);
      console.log(`   Role: member\n`);
    } else {
      console.log('ℹ️ Test member user already exists or creation failed');
      console.log(`   Error: ${memberResult.error}\n`);
    }
    
    // Display current users using direct database access
    console.log('📋 Current users in the system:');
    try {
      const db_direct = require('better-sqlite3')('src/database/ismaa_portal.db');
      const users = db_direct.prepare('SELECT username, name, role, email FROM users').all();
      users.forEach(user => {
        console.log(`   - ${user.username} (${user.name}) - ${user.role}`);
      });
      db_direct.close();
    } catch (error) {
      console.log('ℹ️  Could not list users:', error.message);
    }
    
    console.log('\n🎉 Authentication setup completed!');
    console.log('\n🔒 Security Features Enabled:');
    console.log('   • bcrypt password hashing (12 salt rounds)');
    console.log('   • Account lockout protection');
    console.log('   • Password strength validation');
    console.log('   • Security event logging');
    console.log('   • First-time password change enforcement');
    console.log('   • One-time username change capability');
    console.log('   • Privacy controls and settings persistence');
    
    console.log('\n🚀 You can now login with:');
    console.log('   Username: admin | Password: Admin123!@# (first-time login)');
    console.log('   Username: testuser | Password: Test123!@# (regular login)');
    
  } catch (error) {
    console.error('❌ Authentication setup failed:', error);
  }
}

// Run the setup
setupAuthentication().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Setup error:', error);
  process.exit(1);
});
