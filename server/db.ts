import sql from 'mssql';

// Parse server string — supports named instances like "HOST\INSTANCE"
const fullServer = process.env.DB_SERVER || 'WEB-APP-INSTANC\\SQLEXPRESS04';
const serverParts = fullServer.split('\\');
const serverHost = serverParts[0];
const instanceName = serverParts.length > 1 ? serverParts[1] : undefined;

// SQL Server configuration
const sqlConfig: sql.config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Cybaem@123',
  database: process.env.DB_NAME || 'DMS',
  server: serverHost,
  // Only set port when NOT using a named instance (port & instanceName are mutually exclusive)
  ...(instanceName ? {} : { port: parseInt(process.env.DB_PORT || '1433', 10) }),
  options: {
    ...(instanceName ? { instanceName } : {}),
    encrypt: false, // Use true if using Azure SQL
    trustServerCertificate: true, // For local/self-signed certs
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

export function getPool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(sqlConfig).connect()
      .then((pool) => {
        console.log('Connected to SQL Server successfully');
        return pool;
      })
      .catch((err) => {
        console.error('SQL Server connection error:', err);
        poolPromise = null;
        throw err;
      });
  }
  return poolPromise;
}

export { sql };
