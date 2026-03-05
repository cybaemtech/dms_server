const sql = require('mssql');
require('dotenv').config();

async function run() {
  const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    options: { encrypt: false, trustServerCertificate: true }
  };

  const pool = await sql.connect(config);

  // Check if columns exist
  const check = await pool.request().query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'departments' AND COLUMN_NAME IN ('category','category_name')"
  );
  console.log('Existing columns:', check.recordset.map(r => r.COLUMN_NAME));

  if (!check.recordset.find(r => r.COLUMN_NAME === 'category')) {
    await pool.request().query('ALTER TABLE departments ADD category NVARCHAR(100) NULL');
    console.log('Added category column');
  } else {
    console.log('category column already exists');
  }

  if (!check.recordset.find(r => r.COLUMN_NAME === 'category_name')) {
    await pool.request().query('ALTER TABLE departments ADD category_name NVARCHAR(255) NULL');
    console.log('Added category_name column');
  } else {
    console.log('category_name column already exists');
  }

  // Update existing departments with category info based on id prefix
  const updates = [
    { prefix: 'prod-%', category: 'production', categoryName: 'Production' },
    { prefix: 'plant-%', category: 'manufacturing', categoryName: 'Manufacturing Plants' },
    { prefix: 'ops-%', category: 'operations', categoryName: 'Operations' },
    { prefix: 'admin-%', category: 'administration', categoryName: 'Administration' },
    { prefix: 'comm-%', category: 'commercial', categoryName: 'Commercial' },
  ];

  for (const u of updates) {
    const r = await pool.request()
      .input('cat', sql.NVarChar, u.category)
      .input('catName', sql.NVarChar, u.categoryName)
      .input('prefix', sql.NVarChar, u.prefix)
      .query('UPDATE departments SET category = @cat, category_name = @catName WHERE id LIKE @prefix');
    console.log('Updated ' + r.rowsAffected[0] + ' rows for ' + u.categoryName);
  }

  // Verify
  const all = await pool.request().query('SELECT id, name, category, category_name FROM departments ORDER BY category, name');
  console.log('\nAll departments (' + all.recordset.length + ' total):');
  all.recordset.forEach(d => {
    console.log('  ' + d.id + ' | ' + d.name + ' | ' + (d.category || 'NULL') + ' | ' + (d.category_name || 'NULL'));
  });

  await pool.close();
  console.log('\nDone!');
}

run().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
