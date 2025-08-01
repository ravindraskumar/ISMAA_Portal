# Database Cleanup Utility

A comprehensive SQLite database cleanup script for the ISMAA Bengaluru Portal that removes unused data and optimizes database performance.

## 🎯 Purpose

This utility cleans up unused records from lookup tables and removes orphaned data to:
- **Reduce database size** by removing unused lookup entries
- **Improve performance** by reducing table scan times
- **Maintain data integrity** by removing orphaned relationships
- **Reclaim disk space** through database vacuum operations

## 🧹 What Gets Cleaned

### Lookup Tables
- **Branches**: Removes branches not referenced by any member
- **Industries**: Removes industries not referenced by any member  
- **Companies**: Removes companies not referenced by any member
- **Skills**: Removes skills not linked to any member
- **Blog Tags**: Removes tags not linked to any blog

### Orphaned Relations
- **Member Skills**: Removes skill relations for non-existent members
- **Blog Tag Relations**: Removes tag relations for non-existent blogs

## 🚀 Usage

### Command Line Usage

```bash
# Run cleanup (makes actual changes)
node src/database/cleanup.js

# Dry run (shows what would be cleaned without making changes)
node src/database/cleanup.js --dry-run

# Skip vacuum operation
node src/database/cleanup.js --skip-vacuum

# Combine options
node src/database/cleanup.js --dry-run --skip-vacuum
```

### NPM Scripts

```bash
# Run cleanup
npm run cleanup

# Dry run only
npm run cleanup-dry
```

### Programmatic Usage

```javascript
const DatabaseCleanup = require('./src/database/cleanup');

async function cleanDatabase() {
    const cleanup = new DatabaseCleanup();
    
    try {
        await cleanup.initialize();
        
        // Run cleanup with options
        await cleanup.runCleanup({
            dryRun: false,        // Set to true for dry run
            skipVacuum: false     // Set to true to skip VACUUM
        });
        
    } finally {
        cleanup.close();
    }
}
```

## 📊 Sample Output

```
🚀 ISMAA Database Cleanup Utility
=================================

📊 Current database statistics:
   Members: 8
   Branches: 12
   Industries: 14
   Companies: 10
   Skills: 38
   Blog Tags: 6
   Blogs: 2
   Notices: 1

🧹 Cleaning up unused branches...
Found 7 unused branches:
  - Artificial Intelligence Engineering (ID: 7)
  - DEBUG BRANCH NEW (ID: 9)
  - Manual Branch 1753699379 (ID: 3)
  [...]

📊 DATABASE CLEANUP REPORT
==========================

🗑️  CLEANUP SUMMARY:
   Total records removed: 39

📋 DETAILED BREAKDOWN:
   Branches:         12 → 5 (-7)
   Industries:       14 → 6 (-8)
   Companies:        10 → 3 (-7)
   Skills:           38 → 21 (-17)
   Blog Tags:        6 → 6 (-0)
   Orphaned M-Skills: Removed 0
   Orphaned B-Tags:   Removed 0

🎉 Database cleanup completed successfully!

🔧 Running VACUUM to reclaim disk space...
✅ VACUUM completed in 3ms
```

## ⚠️ Safety Features

### Transaction Safety
- All cleanup operations run within a single transaction
- If any operation fails, all changes are rolled back
- Database integrity is maintained throughout the process

### Dry Run Mode
- Use `--dry-run` to see what would be cleaned without making changes
- Perfect for regular maintenance checks
- Shows detailed reports of what would be removed

### Foreign Key Constraints
- Respects all foreign key relationships
- Only removes data that is truly unused
- Maintains referential integrity

## 🔧 Advanced Options

### Command Line Arguments

| Argument | Short | Description |
|----------|-------|-------------|
| `--dry-run` | `-d` | Show what would be cleaned without making changes |
| `--skip-vacuum` | `-s` | Skip the VACUUM operation to save time |

### Programmatic Options

```javascript
await cleanup.runCleanup({
    dryRun: false,        // Boolean: Preview mode
    skipVacuum: false     // Boolean: Skip VACUUM operation
});
```

## 📈 Performance Impact

### Benefits
- **Faster queries**: Smaller lookup tables mean faster scans
- **Reduced storage**: Removes unused data and reclaims space
- **Better indexes**: Smaller tables have more efficient indexes
- **Cleaner data**: Removes test/debug data that accumulates over time

### VACUUM Operation
- Rebuilds the database file to reclaim space
- Defragments pages for better performance
- Usually completes in milliseconds for small databases
- Can be skipped with `--skip-vacuum` if needed

## 🛡️ Best Practices

### When to Run
- **After member deletion**: Clean up unused lookups
- **After testing**: Remove debug/test data
- **Regular maintenance**: Monthly or quarterly cleanup
- **Before backups**: Reduce backup size

### Recommended Workflow
1. Run with `--dry-run` first to see what will be cleaned
2. Review the list of items to be removed
3. Run without `--dry-run` to perform actual cleanup
4. Check the cleanup report for confirmation

### Example Maintenance Script
```bash
#!/bin/bash
echo "Running database cleanup check..."
npm run cleanup-dry

echo ""
read -p "Proceed with cleanup? (y/N): " confirm
if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
    npm run cleanup
    echo "Cleanup completed!"
else
    echo "Cleanup cancelled."
fi
```

## 🚨 Important Notes

- **Backup First**: Always backup your database before running cleanup
- **Check Dependencies**: Ensure no external systems depend on the data being removed
- **Test Environment**: Test the cleanup on a copy of production data first
- **Monitor Impact**: Check application performance after cleanup

## 🐛 Troubleshooting

### Common Issues

**Error: Database is locked**
- Ensure no other processes are using the database
- Stop the server before running cleanup

**Error: Foreign key constraint failed**
- This shouldn't happen due to our safety checks
- Report this as a bug if encountered

**No records cleaned**
- Database may already be optimized
- Check if there are any members in the database

### Debug Mode
Add console.log statements to see detailed execution:

# Regular cleanup
npm run cleanup

# Preview mode (safe to run anytime)
npm run cleanup-dry

```javascript
// Enable debug mode in cleanup.js
const DEBUG = true;
if (DEBUG) console.log('Debug info here...');
```
