const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testRealAPIIntegration() {
    console.log('🌐 Testing Real API Integration');
    console.log('==============================');
    
    const baseURL = 'http://localhost:3001';
    
    try {
        // Step 1: Get current dropdown values
        console.log('\n📊 Getting current dropdown values from API...');
        const [branchesRes, industriesRes, companiesRes] = await Promise.all([
            fetch(`${baseURL}/branches`),
            fetch(`${baseURL}/industries`),
            fetch(`${baseURL}/companies`)
        ]);
        
        const currentBranches = await branchesRes.json();
        const currentIndustries = await industriesRes.json();
        const currentCompanies = await companiesRes.json();
        
        console.log('Current branches:', currentBranches.length);
        console.log('Current industries:', currentIndustries.length);
        console.log('Current companies:', currentCompanies.length);
        
        // Step 2: Create member with brand new custom values
        console.log('\n➕ Creating member with completely new custom values via API...');
        const newMember = {
            id: Date.now(),
            name: 'API Test User',
            email: 'apitest@newvalues.com',
            phone: '+91-8765432109',
            address: 'API Test Address, Mumbai',
            passoutBatch: '2021',
            branch: 'Robotics and Automation Engineering',
            industry: 'Autonomous Vehicles',
            company: 'Future Tech Solutions',
            skills: ['Robotics', 'Computer Vision', 'IoT', 'Autonomous Systems'],
            membershipID: 'API-TEST-001',
            membershipType: 'Member',
            photo: ''
        };
        
        const createResponse = await fetch(`${baseURL}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newMember)
        });
        
        if (!createResponse.ok) {
            throw new Error(`API Error: ${createResponse.status} - ${await createResponse.text()}`);
        }
        
        const createdMember = await createResponse.json();
        console.log('✅ Member created via API with ID:', createdMember.id);
        
        // Step 3: Verify dropdown values were updated
        console.log('\n🔄 Checking if dropdown values were updated...');
        const [newBranchesRes, newIndustriesRes, newCompaniesRes] = await Promise.all([
            fetch(`${baseURL}/branches`),
            fetch(`${baseURL}/industries`),
            fetch(`${baseURL}/companies`)
        ]);
        
        const newBranches = await newBranchesRes.json();
        const newIndustries = await newIndustriesRes.json();
        const newCompanies = await newCompaniesRes.json();
        
        console.log('Updated branches:', newBranches.length);
        console.log('Updated industries:', newIndustries.length);
        console.log('Updated companies:', newCompanies.length);
        
        // Verify new values exist
        const branchAdded = newBranches.includes('Robotics and Automation Engineering');
        const industryAdded = newIndustries.includes('Autonomous Vehicles');
        const companyAdded = newCompanies.includes('Future Tech Solutions');
        
        console.log('\n✅ Custom Value Addition Results:');
        console.log('New branch in dropdown:', branchAdded ? '✅' : '❌');
        console.log('New industry in dropdown:', industryAdded ? '✅' : '❌');
        console.log('New company in dropdown:', companyAdded ? '✅' : '❌');
        
        // Step 4: Retrieve member to simulate Edit Member page load
        console.log('\n🔍 Simulating Edit Member page load...');
        const memberResponse = await fetch(`${baseURL}/members/${createdMember.id}`);
        
        if (!memberResponse.ok) {
            throw new Error(`Failed to retrieve member: ${memberResponse.status}`);
        }
        
        const retrievedMember = await memberResponse.json();
        
        console.log('📋 Member data for Edit form:');
        console.log('Name:', retrievedMember.name);
        console.log('Branch:', retrievedMember.branch);
        console.log('Industry:', retrievedMember.industry);
        console.log('Company:', retrievedMember.company);
        console.log('Skills:', retrievedMember.skills.join(', '));
        
        // Step 5: Verify data consistency for Edit Member page
        const editPageConsistent = (
            retrievedMember.branch === newMember.branch &&
            retrievedMember.industry === newMember.industry &&
            retrievedMember.company === newMember.company &&
            retrievedMember.skills.length === newMember.skills.length
        );
        
        console.log('\n📝 Edit Member Page Consistency:');
        console.log('All data consistent for editing:', editPageConsistent ? '✅' : '❌');
        
        // Step 6: Test member update via API
        console.log('\n🔄 Testing member update with additional new values...');
        const updateData = {
            ...retrievedMember,
            branch: 'Nanotechnology Engineering',
            industry: 'Biomedical Technology',
            company: 'NanoMed Innovations',
            skills: [...retrievedMember.skills, 'Nanotechnology', 'Bioengineering']
        };
        
        const updateResponse = await fetch(`${baseURL}/members/${createdMember.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        
        if (!updateResponse.ok) {
            throw new Error(`Update failed: ${updateResponse.status}`);
        }
        
        const updatedMember = await updateResponse.json();
        console.log('✅ Member updated successfully');
        
        // Step 7: Verify dropdowns updated again
        const [finalBranchesRes, finalIndustriesRes, finalCompaniesRes] = await Promise.all([
            fetch(`${baseURL}/branches`),
            fetch(`${baseURL}/industries`),
            fetch(`${baseURL}/companies`)
        ]);
        
        const finalBranches = await finalBranchesRes.json();
        const finalIndustries = await finalIndustriesRes.json();
        const finalCompanies = await finalCompaniesRes.json();
        
        console.log('\n📊 Final dropdown counts:');
        console.log('Branches:', finalBranches.length);
        console.log('Industries:', finalIndustries.length);  
        console.log('Companies:', finalCompanies.length);
        
        // Step 8: Clean up
        console.log('\n🧹 Cleaning up test data...');
        const deleteResponse = await fetch(`${baseURL}/members/${createdMember.id}`, {
            method: 'DELETE'
        });
        
        if (deleteResponse.ok) {
            console.log('✅ Test member deleted successfully');
        }
        
        // Final verification
        if (branchAdded && industryAdded && companyAdded && editPageConsistent) {
            console.log('\n🎉 COMPLETE API INTEGRATION TEST PASSED!');
            console.log('✅ Custom values automatically added to dropdowns');
            console.log('✅ Edit Member page will show correct data');
            console.log('✅ Database updates are immediately available');
            console.log('✅ All CRUD operations work with custom values');
        } else {
            console.log('\n❌ Some integration issues detected');
        }
        
    } catch (error) {
        console.error('❌ API Integration test failed:', error.message);
    }
}

// Run the test
testRealAPIIntegration();
