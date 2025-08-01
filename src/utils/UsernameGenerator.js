// Username generation utility
class UsernameGenerator {
    /**
     * Generate username from member name
     * @param {string} fullName - Full name of the member
     * @param {Array} existingUsernames - Array of existing usernames to avoid duplicates
     * @returns {string} Generated unique username
     */
    static generateUsername(fullName, existingUsernames = []) {
        if (!fullName || typeof fullName !== 'string') {
            throw new Error('Valid full name is required');
        }

        // Clean and normalize the name
        const cleanName = fullName.trim().toLowerCase()
            .replace(/[^a-z\s]/g, '') // Remove non-alphabetic characters except spaces
            .replace(/\s+/g, ' '); // Normalize spaces

        const nameParts = cleanName.split(' ').filter(part => part.length > 0);
        
        if (nameParts.length === 0) {
            throw new Error('Name must contain at least one valid word');
        }

        let baseUsername = '';

        if (nameParts.length === 1) {
            // Single name: use the name as base
            baseUsername = nameParts[0];
        } else if (nameParts.length === 2) {
            // Two names: first name + first letter of last name
            baseUsername = nameParts[0] + nameParts[1].charAt(0);
        } else {
            // Three or more names: first name + first letter of middle + first letter of last
            const firstName = nameParts[0];
            const middleInitial = nameParts[1].charAt(0);
            const lastInitial = nameParts[nameParts.length - 1].charAt(0);
            baseUsername = firstName + middleInitial + lastInitial;
        }

        // Ensure minimum length of 4 characters
        if (baseUsername.length < 4) {
            if (nameParts.length > 1) {
                // Try using more of the second name
                baseUsername = nameParts[0] + nameParts[1].substring(0, 4 - nameParts[0].length);
            } else {
                // Pad with numbers if necessary
                baseUsername = baseUsername + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            }
        }

        // Check for uniqueness and add suffix if needed
        let finalUsername = baseUsername;
        let counter = 1;
        
        while (existingUsernames.includes(finalUsername)) {
            finalUsername = baseUsername + counter;
            counter++;
        }

        return finalUsername;
    }

    /**
     * Generate a temporary password
     * @param {number} length - Length of password (default 8)
     * @returns {string} Generated password
     */
    static generatePassword(length = 8) {
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const numbers = '0123456789';
        const symbols = '!@#$%&*';
        
        let password = '';
        
        // Ensure at least one character from each category
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        password += symbols[Math.floor(Math.random() * symbols.length)];
        
        // Fill the rest randomly
        const allChars = uppercase + lowercase + numbers + symbols;
        for (let i = 4; i < length; i++) {
            password += allChars[Math.floor(Math.random() * allChars.length)];
        }
        
        // Shuffle the password
        return password.split('').sort(() => Math.random() - 0.5).join('');
    }
}

module.exports = UsernameGenerator;
