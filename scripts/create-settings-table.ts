import { getPool, sql } from '../server/db';

async function execute() {
    try {
        console.log("Connecting to the database...");
        const pool = await getPool();

        console.log("Checking if app_settings table exists...");
        const tableExistsResult = await pool.request().query("SELECT * FROM sysobjects WHERE name='app_settings' AND xtype='U'");

        if (tableExistsResult.recordset.length > 0) {
            console.log("Table 'app_settings' already exists.");
        } else {
            console.log("Creating 'app_settings' table...");
            await pool.request().query(`
        CREATE TABLE app_settings (
          id NVARCHAR(100) PRIMARY KEY DEFAULT NEWID(),
          setting_key NVARCHAR(255) NOT NULL UNIQUE,
          setting_value NVARCHAR(MAX) NULL,
          description NVARCHAR(MAX) NULL,
          updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
        );
      `);
            console.log("Table created successfully!");
        }

        console.log("Inserting default 'enable_manual_revision' row...");
        const rowExistsResult = await pool.request()
            .input('key', sql.NVarChar, 'enable_manual_revision')
            .query("SELECT * FROM app_settings WHERE setting_key = @key");

        if (rowExistsResult.recordset.length === 0) {
            await pool.request()
                .input('key', sql.NVarChar, 'enable_manual_revision')
                .input('val', sql.NVarChar, 'true')
                .input('desc', sql.NVarChar, 'Allow creators to manually enter revision numbers when creating a new document')
                .query("INSERT INTO app_settings (setting_key, setting_value, description) VALUES (@key, @val, @desc)");
            console.log("Inserted default setting for 'enable_manual_revision'.");
        } else {
            console.log("Setting 'enable_manual_revision' already configured.");
        }

        console.log("Finished successfully.");
        process.exit(0);
    } catch (err) {
        console.error("An error occurred:", err);
        process.exit(1);
    }
}

execute();
