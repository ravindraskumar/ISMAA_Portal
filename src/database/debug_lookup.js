const DatabaseAPI = require('./DatabaseAPI');

async function debugLookupTables() {
    console.log('🔍 Debugging Lookup Table Updates');
    console.log('=================================');
    
    const dbAPI = new DatabaseAPI();
    
    try {
        await dbAPI.initialize();
        
        console.log('\n📊 Before creating member:');
        console.log('Branches:', dbAPI.getBranches());
        console.log('Industries:', dbAPI.getIndustries());
        console.log('Companies:', dbAPI.getCompanies());
        
        // Create member directly with DatabaseAPI
        console.log('\n➕ Creating member with custom values...');
        const testMember = {
            id: Date.now(),
            name: 'Debug Test User',
            email: 'debug@test.com',
            branch: 'DEBUG BRANCH NEW',
            industry: 'DEBUG INDUSTRY NEW',
            company: 'DEBUG COMPANY NEW',
            skills: ['Debug Skill 1', 'Debug Skill 2'],
            membershipID: 'DEBUG-001',
            membershipType: 'Member'
        };
        
        const result = dbAPI.createMember(testMember);
        console.log('Member created with ID:', result.id);
        
        console.log('\n📊 After creating member:');
        console.log('Branches:', dbAPI.getBranches());
        console.log('Industries:', dbAPI.getIndustries());
        console.log('Companies:', dbAPI.getCompanies());
        
        // Check the actual database tables
        const db = dbAPI.dbManager.getDatabase();
        console.log('\n🔍 Direct database queries:');
        console.log('Branch table contents:');
        const branches = db.prepare('SELECT * FROM branches').all();
        branches.forEach(b => console.log(`  ID: ${b.id}, Name: ${b.name}`));
        
        console.log('\nIndustry table contents:');
        const industries = db.prepare('SELECT * FROM industries').all();
        industries.forEach(i => console.log(`  ID: ${i.id}, Name: ${i.name}`));
        
        console.log('\nCompany table contents:');
        const companies = db.prepare('SELECT * FROM companies').all();
        companies.forEach(c => console.log(`  ID: ${c.id}, Name: ${c.name}`));
        
        // Clean up
        dbAPI.deleteMember(result.id);
        console.log('\n✅ Test member deleted');
        
    } catch (error) {
        console.error('❌ Debug test failed:', error);
    } finally {
        dbAPI.close();
    }
}

debugLookupTables();
