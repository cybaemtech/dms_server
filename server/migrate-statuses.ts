import { storage } from './storage';
import { getPool } from './db';
import sql from 'mssql';

async function fixStatuses() {
  try {
    const pool = await getPool();
    console.log('Checking for superseded documents...');
    const result = await pool.request().query("SELECT COUNT(*) as count FROM documents WHERE status = 'superseded'");
    const count = result.recordset[0].count;
    console.log(`Found ${count} documents with 'superseded' status.`);
    
    if (count > 0) {
      console.log("Updating to 'obsolete'...");
      await pool.request().query("UPDATE documents SET status = 'obsolete' WHERE status = 'superseded'");
      console.log("Update successful.");
    }

    // Also check if any documents with v2, v3 etc are currently NOT 'issued' but 'obsolete'
    // Ensure that for each (docNumber, location) only ONE is 'issued' and others are 'obsolete'
    
    console.log('Fix complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error fixing statuses:', err);
    process.exit(1);
  }
}

fixStatuses();
