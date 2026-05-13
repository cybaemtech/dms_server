const sql = require("mssql");
const dotenv = require("dotenv");
dotenv.config();

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

async function fixSupersededStatus() {
  console.log("Starting fix for incorrectly superseded documents...");
  const pool = await sql.connect(dbConfig);

  try {
    // Find documents that are superseded but are actually the latest revision for their (DocNum, Location)
    const query = `
      SELECT d1.id, d1.doc_number, d1.location, d1.revision_no, d1.status, d1.doc_name 
      FROM documents d1 
      WHERE d1.status = 'superseded' 
      AND d1.revision_no = (
        SELECT MAX(d2.revision_no) 
        FROM documents d2 
        WHERE TRIM(LOWER(d2.doc_number)) = TRIM(LOWER(d1.doc_number)) 
        AND TRIM(LOWER(ISNULL(d2.location, ''))) = TRIM(LOWER(ISNULL(d1.location, '')))
      )
    `;

    const result = await pool.request().query(query);
    const docsToFix = result.recordset;

    console.log(`Found ${docsToFix.length} documents to fix.`);

    for (const doc of docsToFix) {
      console.log(`Fixing status for: ${doc.doc_number} (Rev ${doc.revision_no}, Loc: ${doc.location || 'N/A'}) - ${doc.doc_name}`);
      await pool.request()
        .input('id', sql.UniqueIdentifier, doc.id)
        .query("UPDATE documents SET status = 'issued' WHERE id = @id");
    }

    console.log("Fix completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error fixing document statuses:", error);
    process.exit(1);
  }
}

fixSupersededStatus();
