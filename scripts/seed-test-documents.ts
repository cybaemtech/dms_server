import { getPool, sql } from "../server/db";

async function seedTestData() {
    console.log("Seeding test documents...");
    const pool = await getPool();

    const testDocs = [
        {
            id: `doc-test-1`,
            docName: "Standard Operating Procedure - Quality Control",
            docNumber: "QC-SOP-001",
            status: "pending",
            preparedBy: "creator-1",
            revisionNo: 0,
            location: "Unit 1",
            content: "<h2>Test Content</h2><p>This is a test document for Quality Control procedures.</p>"
        },
        {
            id: `doc-test-2`,
            docName: "IT Security Policy v2026",
            docNumber: "IT-POL-2026",
            status: "approved",
            preparedBy: "creator-1",
            approvedBy: "approver-1",
            revisionNo: 1,
            location: "Main HQ",
            content: "<h2>Security Policy</h2><p>Confidential IT security guidelines.</p>"
        },
        {
            id: `doc-test-3`,
            docName: "Health and Safety Manual",
            docNumber: "HSE-MAN-01",
            status: "issued",
            preparedBy: "creator-1",
            approvedBy: "approver-1",
            issuedBy: "issuer-1",
            revisionNo: 0,
            location: "Global",
            content: "<h2>HSE Manual</h2><p>Basic safety rules for all employees.</p>"
        }
    ];

    for (const doc of testDocs) {
        console.log(`Inserting document: ${doc.docName}...`);
        try {
            await pool.request()
                .input('id', sql.NVarChar, doc.id)
                .input('docName', sql.NVarChar, doc.docName)
                .input('docNumber', sql.NVarChar, doc.docNumber)
                .input('status', sql.NVarChar, doc.status)
                .input('preparedBy', sql.NVarChar, doc.preparedBy)
                .input('approvedBy', sql.NVarChar, doc.approvedBy || null)
                .input('issuedBy', sql.NVarChar, doc.issuedBy || null)
                .input('revisionNo', sql.Int, doc.revisionNo)
                .input('location', sql.NVarChar, doc.location)
                .input('content', sql.NVarChar, doc.content)
                .input('now', sql.DateTime2, new Date())
                .query(`INSERT INTO documents (id, doc_name, doc_number, status, prepared_by, approved_by, issued_by, revision_no, location, content, date_of_issue, created_at, updated_at) 
                        VALUES (@id, @docName, @docNumber, @status, @preparedBy, @approvedBy, @issuedBy, @revisionNo, @location, @content, @now, @now, @now)`);
            console.log(`Document ${doc.docNumber} inserted.`);

            // Assign to dept-15
            await pool.request()
                .input('id', sql.NVarChar, `dd-${doc.id}`)
                .input('docId', sql.NVarChar, doc.id)
                .input('deptId', sql.NVarChar, 'dept-15')
                .query(`INSERT INTO document_departments (id, document_id, department_id) VALUES (@id, @docId, @deptId)`);
            console.log(`Document ${doc.docNumber} assigned to department.`);

        } catch (err) {
            console.error(`Error inserting ${doc.docNumber}:`, (err as Error).message);
        }
    }

    console.log("Seeding complete.");
    process.exit(0);
}

seedTestData().catch(err => {
    console.error("Critical error:", err);
    process.exit(1);
});
