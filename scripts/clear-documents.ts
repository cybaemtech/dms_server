
import { getPool } from "../server/db";

async function clearData() {
    console.log("Starting data deletion (excluding users and departments)...");
    const pool = await getPool();

    // Ordered to respect foreign keys (child tables first)
    const tablesToDelete = [
        "document_recipients",
        "print_logs",
        "control_copies",
        "notifications",
        "document_departments",
        "documents"
    ];

    for (const table of tablesToDelete) {
        console.log(`Clearing table: ${table}...`);
        try {
            await pool.request().query(`DELETE FROM ${table}`);
            console.log(`Table ${table} cleared.`);
        } catch (err) {
            console.error(`Error clearing ${table}:`, (err as Error).message);
        }
    }

    console.log("Data deletion complete. (Users and Departments preserved)");
    process.exit(0);
}

clearData().catch(err => {
    console.error("Critical error:", err);
    process.exit(1);
});
