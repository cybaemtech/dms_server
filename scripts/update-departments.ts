import { getPool } from "../server/db";

const departments = [
    "Production Group - II",
    "Production Group - III",
    "Production Group - IV",
    "Production Group - V",
    "Production Group - VI",
    "Plant - A / E & G",
    "Plant - B",
    "Plant - B1",
    "Plant - C & D",
    "Plant - F",
    "Blending & Processing",
    "Production Plant - C",
    "R&D Dept.",
    "Quality Control Lab",
    "Quality Assurance",
    "Customer Support",
    "R. M. Store",
    "Engg. Store",
    "Local Purchase",
    "Packing",
    "Despatch",
    "E.T.P. and W.T.P. Dept.",
    "Maintenance",
    "Project",
    "E.H.S. Dept.",
    "M. R. Dept.",
    "Housekeeping",
    "H. R. Dept.",
    "Account Dept.",
    "I.T. Dept.",
    "Planning and Despatch",
    "Export Sales",
    "Domestic Sales",
    "Purchase",
    "Account",
    "Finance",
    "Export Documentation"
];

async function updateDepartments() {
    const pool = await getPool();

    try {
        console.log('Connected to DB. Starting department update...');

        // Drop unique constraint if exists
        try {
            await pool.request().query(`
        IF EXISTS (SELECT * FROM sys.objects WHERE type = 'UQ' AND name = 'UQ_departments_code')
        BEGIN
            ALTER TABLE departments DROP CONSTRAINT UQ_departments_code;
        END
      `);
            console.log('Successfully dropped UQ_departments_code constraint (if it existed).');
        } catch (e: any) {
            console.warn('Could not drop constraint (might not exist):', e.message);
        }

        try {
            await pool.request().query(`
            ALTER TABLE departments ALTER COLUMN code NVARCHAR(50) NULL;
        `);
        } catch (e: any) {
            console.warn('Could not alter code column:', e.message);
        }

        // Disconnect relationships to avoid foreign key constraints errors
        await pool.request().query(`UPDATE users SET department_id = NULL, department_name = NULL, department_code = NULL`);
        await pool.request().query(`DELETE FROM document_departments`);
        await pool.request().query(`DELETE FROM document_recipients WHERE department_id IS NOT NULL`);

        // Wipe existing departments
        await pool.request().query(`DELETE FROM departments`);
        console.log('Deleted existing departments.');

        // Insert new departments
        for (let i = 0; i < departments.length; i++) {
            const id = `dept-${i + 1}`;
            const name = departments[i];

            await pool.request()
                .input('id', id)
                .input('name', name)
                .query(`INSERT INTO departments (id, name, code) VALUES (@id, @name, '')`);
        }
        console.log(`Successfully inserted ${departments.length} new departments.`);
    } catch (error) {
        console.error('Error during update:', error);
    } finally {
        process.exit(0);
    }
}

updateDepartments();
