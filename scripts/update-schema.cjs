const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'Cybaem@123',
    database: 'DMS',
    server: 'WEB-APP-INSTANC\\SQLEXPRESS04',
    options: {
        encrypt: false,
        trustServerCertificate: true,
    }
};

async function updateSchema() {
    try {
        const pool = await sql.connect(config);
        console.log('Connected to SQL Server');

        const queries = [
            "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('documents') AND name = 'location') BEGIN ALTER TABLE documents ADD location NVARCHAR(255) NULL; END",
            "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('documents') AND name = 'date_of_rev') BEGIN ALTER TABLE documents ADD date_of_rev DATETIME2 NULL; END"
        ];

        for (const query of queries) {
            await pool.request().query(query);
            console.log('Executed query: ' + query);
        }

        console.log('Schema update complete');
        await pool.close();
    } catch (err) {
        console.error('Schema update failed:', err);
        process.exit(1);
    }
}

updateSchema();
