
import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

const fullServer = (process.env.DB_SERVER || 'WEB-APP-INSTANC').split('\\')[0];
const instanceName = (process.env.DB_SERVER || 'WEB-APP-INSTANC').split('\\')[1];

const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Cybaem@123',
  database: process.env.DB_NAME || 'DMS',
  server: fullServer,
  port: parseInt(process.env.DB_PORT || '1438', 10),
  options: {
    instanceName: instanceName,
    encrypt: false,
    trustServerCertificate: true
  }
};

async function check() {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
        .query("SELECT COUNT(*) as count FROM documents WHERE prepared_by = 'creator-1'");
    console.log("Count in DB:", result.recordset[0].count);
    await pool.close();
  } catch (err) {
    console.error(err);
  }
}

check();
