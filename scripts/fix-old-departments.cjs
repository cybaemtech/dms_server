const sql = require('mssql');
require('dotenv').config();

async function run() {
  const fullServer = process.env.DB_SERVER || 'WEB-APP-INSTANC';
  const serverParts = fullServer.split('\\');
  const serverHost = serverParts[0];

  const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: serverHost,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    options: { encrypt: false, trustServerCertificate: true }
  };

  const pool = await sql.connect(config);

  // Update old departments that have no category (old dept-1 through dept-5)
  // Set their category based on their name
  const oldDepts = await pool.request().query(
    "SELECT id, name FROM departments WHERE category IS NULL"
  );
  console.log('Departments without category:', oldDepts.recordset.length);

  for (const dept of oldDepts.recordset) {
    let category = 'uncategorized';
    let categoryName = 'Uncategorized';

    // Map old department names to categories
    if (dept.name === 'Engineering') { category = 'operations'; categoryName = 'Operations'; }
    else if (dept.name === 'Quality Assurance') { category = 'operations'; categoryName = 'Operations'; }
    else if (dept.name === 'Operations') { category = 'operations'; categoryName = 'Operations'; }
    else if (dept.name === 'Finance') { category = 'commercial'; categoryName = 'Commercial'; }
    else if (dept.name === 'Human Resources') { category = 'administration'; categoryName = 'Administration'; }

    await pool.request()
      .input('id', sql.NVarChar, dept.id)
      .input('cat', sql.NVarChar, category)
      .input('catName', sql.NVarChar, categoryName)
      .query('UPDATE departments SET category = @cat, category_name = @catName WHERE id = @id');
    console.log('  Updated: ' + dept.id + ' (' + dept.name + ') -> ' + categoryName);
  }

  // Verify all departments now
  const all = await pool.request().query('SELECT id, name, code, category, category_name FROM departments ORDER BY category_name, name');
  console.log('\nAll departments (' + all.recordset.length + ' total):');
  all.recordset.forEach(d => {
    console.log('  ' + d.id.padEnd(20) + ' | ' + d.name.padEnd(25) + ' | ' + (d.code || '').padEnd(10) + ' | ' + (d.category_name || 'NULL'));
  });

  await pool.close();
  console.log('\nDone!');
}

run().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
