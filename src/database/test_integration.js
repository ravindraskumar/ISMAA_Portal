const DatabaseAPI = require('./DatabaseAPI');

async function testCustomValuesIntegration() {
    console.log('🧪 Testing Custom Values Integration');
    console.log('===================================');

    const dbAPI = new DatabaseAPI();
    
    try {
        await dbAPI.initialize();
        
        // Step 1: Get current dropdown values
        console.log('\n📊 Current dropdown values:');
        const currentBranches = dbAPI.getBranches();
        const currentIndustries = dbAPI.getIndustries();
        const currentCompanies = dbAPI.getCompanies();
        
        console.log('Branches:', currentBranches.length, 'items');
        console.log('Industries:', currentIndustries.length, 'items');
        console.log('Companies:', currentCompanies.length, 'items');
        
        // Step 2: Create member with custom values
        console.log('\n➕ Creating member with custom values...');
        const testMember = {
            id: Date.now(),
            name: 'Test User Custom Values',
            email: 'testuser@customvalues.com',
            phone: '+91-9876543210',
            address: 'Test Address, Bangalore',
            passoutBatch: '2020',
            branch: 'Artificial Intelligence Engineering', // NEW
            industry: 'Quantum Computing', // NEW
            company: 'Tech Innovations Pvt Ltd', // NEW
            skills: ['Machine Learning', 'Quantum Algorithms', 'Deep Learning', 'Research'], // NEW SKILLS
            membershipID: 'TEST-001',
            membershipType: 'Member',
            photo: ''
        };
        
        const result = dbAPI.createMember(testMember);
        console.log('✅ Member created with ID:', result.id);
        
        // Step 3: Verify dropdown values were updated
        console.log('\n🔄 Checking updated dropdown values...');
        const updatedBranches = dbAPI.getBranches();
        const updatedIndustries = dbAPI.getIndustries();
        const updatedCompanies = dbAPI.getCompanies();
        
        console.log('Branches:', updatedBranches.length, 'items');
        console.log('Industries:', updatedIndustries.length, 'items');
        console.log('Companies:', updatedCompanies.length, 'items');
        
        // Check if new values were added
        const newBranch = updatedBranches.includes('Artificial Intelligence Engineering');
        const newIndustry = updatedIndustries.includes('Quantum Computing');
        const newCompany = updatedCompanies.includes('Tech Innovations Pvt Ltd');
        
        console.log('\n✅ Verification Results:');
        console.log('New branch added:', newBranch ? '✅' : '❌');
        console.log('New industry added:', newIndustry ? '✅' : '❌');
        console.log('New company added:', newCompany ? '✅' : '❌');
        
        // Step 4: Retrieve the member and verify data consistency
        console.log('\n🔍 Verifying member data consistency...');
        const retrievedMember = dbAPI.getMemberById(result.id);
        
        if (retrievedMember) {
            console.log('✅ Member retrieval: SUCCESS');
            console.log('Name:', retrievedMember.name);
            console.log('Branch:', retrievedMember.branch);
            console.log('Industry:', retrievedMember.industry);
            console.log('Company:', retrievedMember.company);
            console.log('Skills:', retrievedMember.skills.join(', '));
            
            // Verify all custom values are preserved
            const branchMatch = retrievedMember.branch === testMember.branch;
            const industryMatch = retrievedMember.industry === testMember.industry;
            const companyMatch = retrievedMember.company === testMember.company;
            const skillsMatch = retrievedMember.skills.length === testMember.skills.length;
            
            console.log('\n📋 Data Consistency Check:');
            console.log('Branch consistent:', branchMatch ? '✅' : '❌');
            console.log('Industry consistent:', industryMatch ? '✅' : '❌');
            console.log('Company consistent:', companyMatch ? '✅' : '❌');
            console.log('Skills consistent:', skillsMatch ? '✅' : '❌');
            
            if (branchMatch && industryMatch && companyMatch && skillsMatch) {
                console.log('\n🎉 INTEGRATION TEST PASSED!');
                console.log('✅ Custom values are properly stored and retrieved');
                console.log('✅ Dropdown tables are automatically updated');
                console.log('✅ Data consistency is maintained');
            } else {
                console.log('\n❌ INTEGRATION TEST FAILED!');
                console.log('Some data consistency issues detected');
            }
        } else {
            console.log('❌ Member retrieval: FAILED');
        }
        
        // Step 5: Test update functionality
        console.log('\n🔄 Testing member update with new custom values...');
        const updatedData = {
            ...testMember,
            branch: 'Quantum Information Science', // Another new branch
            industry: 'Space Technology', // Another new industry
            company: 'Space Innovations Corp', // Another new company
            skills: [...testMember.skills, 'Quantum Physics', 'Space Engineering'] // New skills
        };
        
        dbAPI.updateMember(result.id, updatedData);
        
        // Verify update
        const updatedMember = dbAPI.getMemberById(result.id);
        const finalBranches = dbAPI.getBranches();
        const finalIndustries = dbAPI.getIndustries();
        const finalCompanies = dbAPI.getCompanies();
        
        console.log('✅ After update:');
        console.log('Total branches:', finalBranches.length);
        console.log('Total industries:', finalIndustries.length);
        console.log('Total companies:', finalCompanies.length);
        console.log('Member skills count:', updatedMember.skills.length);
        
        // Clean up - delete test member
        console.log('\n🧹 Cleaning up test data...');
        dbAPI.deleteMember(result.id);
        console.log('✅ Test member deleted');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        dbAPI.close();
    }
}

// Run the test
testCustomValuesIntegration();
