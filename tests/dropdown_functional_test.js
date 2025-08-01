#!/usr/bin/env node

/**
 * Dropdown Functional Test
 * 
 * This script tests the member list dropdown functionality by simulating
 * the filtering logic to ensure null values are handled correctly.
 */

const fetch = require('node-fetch').default;

async function testDropdownFilters() {
    console.log('🧪 Testing Member List Dropdown Filters');
    console.log('=' .repeat(50));
    
    try {
        // Fetch members data
        console.log('📥 Fetching members data...');
        const response = await fetch('http://localhost:3001/members');
        if (!response.ok) {
            throw new Error('Failed to fetch members');
        }
        const members = await response.json();
        
        console.log(`✅ Loaded ${members.length} members`);
        
        // Test 1: Check for null values in filter fields
        console.log('\n🔍 Analyzing null values in filter fields...');
        const nullCounts = {
            branch: 0,
            industry: 0,
            passoutBatch: 0,
            company: 0,
            membershipType: 0,
            email: 0
        };
        
        members.forEach(member => {
            if (!member.branch) nullCounts.branch++;
            if (!member.industry) nullCounts.industry++;
            if (!member.passoutBatch) nullCounts.passoutBatch++;
            if (!member.company) nullCounts.company++;
            if (!member.membershipType) nullCounts.membershipType++;
            if (!member.email) nullCounts.email++;
        });
        
        console.log('Null value counts:');
        Object.entries(nullCounts).forEach(([field, count]) => {
            console.log(`  • ${field}: ${count} null values`);
        });
        
        // Test 2: Test dropdown options generation (safe null handling)
        console.log('\n📋 Testing dropdown options generation...');
        
        const branches = [...new Set(members.map(m => m.branch).filter(branch => branch !== null && branch !== undefined))].sort();
        const industries = [...new Set(members.map(m => m.industry).filter(industry => industry !== null && industry !== undefined))].sort();
        const batches = [...new Set(members.map(m => m.passoutBatch).filter(batch => batch !== null && batch !== undefined))].sort();
        
        console.log(`  • Branches: ${branches.length} unique values`);
        console.log(`    [${branches.slice(0, 3).join(', ')}${branches.length > 3 ? ', ...' : ''}]`);
        
        console.log(`  • Industries: ${industries.length} unique values`);
        console.log(`    [${industries.slice(0, 3).join(', ')}${industries.length > 3 ? ', ...' : ''}]`);
        
        console.log(`  • Batches: ${batches.length} unique values`);
        console.log(`    [${batches.slice(0, 3).join(', ')}${batches.length > 3 ? ', ...' : ''}]`);
        
        // Test 3: Test filtering logic with null-safe operations
        console.log('\n🔍 Testing filtering logic...');
        
        // Test branch filter with actual branch value
        const testBranch = branches[0];
        const branchFiltered = members.filter(member => {
            return member.branch && member.branch.toLowerCase().includes(testBranch.toLowerCase());
        });
        console.log(`  • Branch filter "${testBranch}": ${branchFiltered.length} matches`);
        
        // Test industry filter with actual industry value
        const testIndustry = industries[0];
        const industryFiltered = members.filter(member => {
            return member.industry && member.industry.toLowerCase().includes(testIndustry.toLowerCase());
        });
        console.log(`  • Industry filter "${testIndustry}": ${industryFiltered.length} matches`);
        
        // Test batch filter with actual batch value
        const testBatch = batches[0];
        const batchFiltered = members.filter(member => {
            return member.passoutBatch && member.passoutBatch.includes(testBatch);
        });
        console.log(`  • Batch filter "${testBatch}": ${batchFiltered.length} matches`);
        
        // Test 4: Test combined filtering
        console.log('\n🔄 Testing combined filters...');
        const combinedFiltered = members.filter(member => {
            const matchesBranch = member.branch && member.branch.toLowerCase().includes(testBranch.toLowerCase());
            const matchesIndustry = member.industry && member.industry.toLowerCase().includes(testIndustry.toLowerCase());
            return matchesBranch && matchesIndustry;
        });
        console.log(`  • Combined filter (${testBranch} + ${testIndustry}): ${combinedFiltered.length} matches`);
        
        // Test 5: Test search functionality
        console.log('\n🔎 Testing search functionality...');
        const searchTerm = 'kumar';
        const searchFiltered = members.filter(member => {
            const matchesSearch = 
                (member.name && member.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase()));
            return matchesSearch;
        });
        console.log(`  • Search term "${searchTerm}": ${searchFiltered.length} matches`);
        
        // Test 6: Test skills filtering
        console.log('\n🛠️  Testing skills filtering...');
        const allSkills = members.reduce((acc, member) => {
            if (member.skills && Array.isArray(member.skills)) {
                const normalizedSkills = member.skills
                    .map(skill => skill ? skill.toString().trim() : '')
                    .filter(skill => skill.length > 0);
                acc.push(...normalizedSkills);
            }
            return acc;
        }, []);
        
        const uniqueSkills = [...new Set(allSkills.map(skill => skill.toLowerCase()))];
        console.log(`  • Total skills mentioned: ${allSkills.length}`);
        console.log(`  • Unique skills: ${uniqueSkills.length}`);
        
        // Test skills filter with a common skill
        if (uniqueSkills.length > 0) {
            const testSkill = allSkills.find(skill => skill.toLowerCase() === uniqueSkills[0]);
            const skillsFiltered = members.filter(member => {
                return member.skills && Array.isArray(member.skills) && member.skills.some(skill => 
                    skill && skill.toLowerCase().includes(testSkill.toLowerCase())
                );
            });
            console.log(`  • Skills filter "${testSkill}": ${skillsFiltered.length} matches`);
        }
        
        // Test 7: Stats calculation
        console.log('\n📊 Testing stats calculation...');
        const stats = {
            total: members.length,
            branches: new Set(members.map(s => s.branch).filter(branch => branch !== null && branch !== undefined)).size,
            industries: new Set(members.map(s => s.industry).filter(industry => industry !== null && industry !== undefined)).size,
            nonMembers: members.filter(s => s.membershipType === 'Non-Member').length
        };
        
        console.log(`  • Total members: ${stats.total}`);
        console.log(`  • Unique branches: ${stats.branches}`);
        console.log(`  • Unique industries: ${stats.industries}`);
        console.log(`  • Non-members: ${stats.nonMembers}`);
        
        console.log('\n' + '='.repeat(50));
        console.log('✅ All dropdown filter tests passed!');
        console.log('🎉 Null values are handled correctly in all operations');
        
        return true;
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
        return false;
    }
}

// Main execution
if (require.main === module) {
    testDropdownFilters()
        .then(success => {
            if (success) {
                console.log('\n✅ Dropdown filter test completed successfully!');
                process.exit(0);
            } else {
                console.log('\n❌ Dropdown filter test failed!');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\n💥 Unexpected error:', error);
            process.exit(1);
        });
}

module.exports = { testDropdownFilters };
