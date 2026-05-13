
import { getPool } from "../server/db";
import sql from "mssql";

async function fixStatuses() {
    console.log("Starting database cleanup...");
    const pool = await getPool();

    // Find documents that are superseded but shouldn't be because there's no newer version in the SAME location
    const findQuery = `
        SELECT id, doc_number, location, revision_no, status 
        FROM documents d1 
        WHERE LOWER(status) = 'superseded' 
        AND NOT EXISTS (
            SELECT 1 FROM documents d2 
            WHERE TRIM(LOWER(d2.doc_number)) = TRIM(LOWER(d1.doc_number)) 
            AND TRIM(LOWER(ISNULL(d2.location, ''))) = TRIM(LOWER(ISNULL(d1.location, ''))) 
            AND d2.revision_no > d1.revision_no
            AND d2.status IN ('issued', 'approved', 'pending')
        )
    `;

    const result = await pool.request().query(findQuery);
    const docsToFix = result.recordset;

    console.log(`Found ${docsToFix.length} documents to fix.`);

    for (const doc of docsToFix) {
        console.log(`Fixing: ${doc.doc_number} at ${doc.location || 'Common'} (Rev ${doc.revision_no})`);
        await pool.request()
            .input('id', sql.NVarChar, doc.id)
            .query("UPDATE documents SET status = 'issued' WHERE id = @id");
    }

    console.log("Cleanup complete.");
    process.exit(0);
}

fixStatuses().catch(err => {
    console.error(err);
    process.exit(1);
});
