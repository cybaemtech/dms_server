
const sql = require('mssql');

const fullServer = 'WEB-APP-INSTANC\\SQLEXPRESS04';
const serverParts = fullServer.split('\\');
const serverHost = serverParts[0];
const instanceName = serverParts.length > 1 ? serverParts[1] : undefined;

const sqlConfig = {
    user: 'sa',
    password: 'Cybaem@123',
    database: 'DMS',
    server: serverHost,
    options: {
        instanceName,
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
    }
};

async function checkDoc() {
    try {
        let pool = await sql.connect(sqlConfig);
        const docId = 'doc-1773133283925';
        let result = await pool.request()
            .input('id', sql.NVarChar, docId)
            .query('SELECT * FROM documents WHERE id = @id');
        
        if (result.recordset.length > 0) {
            const doc = result.recordset[0];
            console.log('Document found in DB:');
            console.log('ID:', doc.id);
            console.log('doc_name:', doc.doc_name);
            console.log('status:', doc.status);
            console.log('word_file_path:', doc.word_file_path);
        } else {
            console.log('Document ID doc-1773133283925 NOT found in DB.');
        }
    } catch (err) {
        console.error('Database error:', err);
    } finally {
        await sql.close();
    }
}

checkDoc();
