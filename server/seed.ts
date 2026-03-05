import 'dotenv/config';
import { getPool, sql } from "./db";

async function seed() {
  console.log("Seeding DMS database (SQL Server)...\n");

  const pool = await getPool();

  // =============================================
  // Seed Departments with category info (replaces departmentData.json)
  // =============================================
  const departments = [
    // Production
    { id: "prod-1", name: "Production", code: "PROD", category: "production", categoryName: "Production" },
    { id: "prod-2", name: "Production Group II", code: "PROD-II", category: "production", categoryName: "Production" },
    { id: "prod-3", name: "Production Group III", code: "PROD-III", category: "production", categoryName: "Production" },
    { id: "prod-4", name: "Production Group IV", code: "PROD-IV", category: "production", categoryName: "Production" },
    { id: "prod-5", name: "Production Group V", code: "PROD-V", category: "production", categoryName: "Production" },
    { id: "prod-6", name: "Production Group VI", code: "PROD-VI", category: "production", categoryName: "Production" },
    // Manufacturing Plants
    { id: "plant-a-eg", name: "Plant A/E&G", code: "PLT-AEG", category: "manufacturing", categoryName: "Manufacturing Plants" },
    { id: "plant-b", name: "Plant B", code: "PLT-B", category: "manufacturing", categoryName: "Manufacturing Plants" },
    { id: "plant-b1", name: "Plant B1", code: "PLT-B1", category: "manufacturing", categoryName: "Manufacturing Plants" },
    { id: "plant-cd", name: "Plant C&D", code: "PLT-CD", category: "manufacturing", categoryName: "Manufacturing Plants" },
    { id: "plant-f", name: "Plant F", code: "PLT-F", category: "manufacturing", categoryName: "Manufacturing Plants" },
    // Operations
    { id: "ops-blending", name: "Blending & Processing", code: "OPS-BLP", category: "operations", categoryName: "Operations" },
    { id: "ops-rd", name: "R&D", code: "OPS-RD", category: "operations", categoryName: "Operations" },
    { id: "ops-qc-lab", name: "Quality Control Lab", code: "OPS-QCL", category: "operations", categoryName: "Operations" },
    { id: "ops-qa", name: "Quality Assurance", code: "OPS-QA", category: "operations", categoryName: "Operations" },
    { id: "ops-customer", name: "Customer Support", code: "OPS-CS", category: "operations", categoryName: "Operations" },
    { id: "ops-rm-store", name: "R.M. Store", code: "OPS-RMS", category: "operations", categoryName: "Operations" },
    { id: "ops-engg-store", name: "Engg. Store", code: "OPS-ES", category: "operations", categoryName: "Operations" },
    { id: "ops-local-purchase", name: "Local Purchase", code: "OPS-LP", category: "operations", categoryName: "Operations" },
    { id: "ops-packing", name: "Packing", code: "OPS-PKG", category: "operations", categoryName: "Operations" },
    { id: "ops-despatch", name: "Despatch", code: "OPS-DSP", category: "operations", categoryName: "Operations" },
    // Administration
    { id: "admin-etp-wtp", name: "ETP & WTP", code: "ADM-EW", category: "administration", categoryName: "Administration" },
    { id: "admin-maintenance", name: "Maintenance", code: "ADM-MNT", category: "administration", categoryName: "Administration" },
    { id: "admin-project", name: "Project", code: "ADM-PRJ", category: "administration", categoryName: "Administration" },
    { id: "admin-ehs", name: "EHS", code: "ADM-EHS", category: "administration", categoryName: "Administration" },
    { id: "admin-mr-dept", name: "M.R. Dept.", code: "ADM-MR", category: "administration", categoryName: "Administration" },
    { id: "admin-housekeeping", name: "House-Keeping", code: "ADM-HK", category: "administration", categoryName: "Administration" },
    { id: "admin-hr", name: "HR Dept.", code: "ADM-HR", category: "administration", categoryName: "Administration" },
    { id: "admin-account", name: "Account Dept.", code: "ADM-ACC", category: "administration", categoryName: "Administration" },
    { id: "admin-it", name: "IT Dept.", code: "ADM-IT", category: "administration", categoryName: "Administration" },
    // Commercial
    { id: "comm-planning", name: "Planning & Despatch", code: "COM-PD", category: "commercial", categoryName: "Commercial" },
    { id: "comm-ho", name: "H.O.", code: "COM-HO", category: "commercial", categoryName: "Commercial" },
    { id: "comm-export-sales", name: "Export Sales", code: "COM-ES", category: "commercial", categoryName: "Commercial" },
    { id: "comm-domestic-sales", name: "Domestic Sales", code: "COM-DS", category: "commercial", categoryName: "Commercial" },
    { id: "comm-purchase", name: "Purchase", code: "COM-PUR", category: "commercial", categoryName: "Commercial" },
    { id: "comm-account", name: "Account", code: "COM-ACC", category: "commercial", categoryName: "Commercial" },
    { id: "comm-finance", name: "Finance", code: "COM-FIN", category: "commercial", categoryName: "Commercial" },
    { id: "comm-export-doc", name: "Export Documentation", code: "COM-ED", category: "commercial", categoryName: "Commercial" },
    { id: "comm-it", name: "IT", code: "COM-IT", category: "commercial", categoryName: "Commercial" },
  ];

  console.log("Inserting departments...");
  for (const dept of departments) {
    try {
      // Check if department already exists
      const existing = await pool.request()
        .input('id', sql.NVarChar, dept.id)
        .query('SELECT id FROM departments WHERE id = @id');

      if (existing.recordset.length === 0) {
        await pool.request()
          .input('id', sql.NVarChar, dept.id)
          .input('name', sql.NVarChar, dept.name)
          .input('code', sql.NVarChar, dept.code)
          .input('category', sql.NVarChar, dept.category)
          .input('categoryName', sql.NVarChar, dept.categoryName)
          .query('INSERT INTO departments (id, name, code, category, category_name) VALUES (@id, @name, @code, @category, @categoryName)');
        console.log(`  ✓ ${dept.name} (${dept.code}) [${dept.categoryName}]`);
      } else {
        console.log(`  - ${dept.name} (already exists)`);
      }
    } catch (err: any) {
      console.log(`  ✗ ${dept.name}: ${err.message}`);
    }
  }

  // =============================================
  // Seed Users
  // =============================================
  const users = [
    { id: "CA-001", username: "Priyanka.k@cybaemtech.com", password: "123", role: "creator", fullName: "Priyanka K", masterCopyAccess: false, departmentId: "ops-qa" },
    { id: "AD-001", username: "approver@cybaem.com", password: "123", role: "approver", fullName: "John Approver", masterCopyAccess: false, departmentId: "ops-qa" },
    { id: "IA-001", username: "issuer@cybaem.com", password: "123", role: "issuer", fullName: "Jane Issuer", masterCopyAccess: true, departmentId: null },
    { id: "AM-001", username: "admin@cybaem.com", password: "123", role: "admin", fullName: "Admin User", masterCopyAccess: true, departmentId: null },
  ];

  console.log("\nInserting users...");
  for (const user of users) {
    try {
      const existing = await pool.request()
        .input('id', sql.NVarChar, user.id)
        .query('SELECT id FROM users WHERE id = @id');

      if (existing.recordset.length === 0) {
        // Also check by username
        const existingByUsername = await pool.request()
          .input('username', sql.NVarChar, user.username)
          .query('SELECT id FROM users WHERE username = @username');

        if (existingByUsername.recordset.length === 0) {
          await pool.request()
            .input('id', sql.NVarChar, user.id)
            .input('username', sql.NVarChar, user.username)
            .input('password', sql.NVarChar, user.password)
            .input('role', sql.NVarChar, user.role)
            .input('fullName', sql.NVarChar, user.fullName)
            .input('masterCopyAccess', sql.Bit, user.masterCopyAccess ? 1 : 0)
            .input('departmentId', sql.NVarChar, user.departmentId)
            .query(`INSERT INTO users (id, username, password, role, full_name, master_copy_access, department_id)
                    VALUES (@id, @username, @password, @role, @fullName, @masterCopyAccess, @departmentId)`);
          console.log(`  ✓ ${user.fullName} (${user.role}) - ${user.username}`);
        } else {
          console.log(`  - ${user.fullName} (username already exists)`);
        }
      } else {
        console.log(`  - ${user.fullName} (already exists)`);
      }
    } catch (err: any) {
      console.log(`  ✗ ${user.fullName}: ${err.message}`);
    }
  }

  console.log("\n✅ Database seeded successfully!");
  console.log("\nTest Credentials:");
  console.log("  Creator:  Priyanka.k@cybaemtech.com / 123");
  console.log("  Approver: approver@cybaem.com / 123");
  console.log("  Issuer:   issuer@cybaem.com / 123");
  console.log("  Admin:    admin@cybaem.com / 123");

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

