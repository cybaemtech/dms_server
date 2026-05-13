
import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

const fullServer = process.env.DB_SERVER || 'WEB-APP-INSTANC\\SQLEXPRESS04';
const serverParts = fullServer.split('\\');
const serverHost = serverParts[0];
const instanceName = serverParts.length > 1 ? serverParts[1] : undefined;

const sqlConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Cybaem@123',
  database: process.env.DB_NAME || 'DMS',
  server: serverHost,
  ...(instanceName ? {} : { port: parseInt(process.env.DB_PORT || '1433', 10) }),
  options: {
    ...(instanceName ? { instanceName } : {}),
    encrypt: false,
    trustServerCertificate: true,
  }
};

async function check() {
  try {
    const pool = await sql.connect(sqlConfig);
    const result = await pool.request()
      .query("SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'documents'");
    console.log(JSON.stringify(result.recordset, null, 2));
    await pool.close();
  } catch (err) {
    console.error(err);
  }
}

check();
