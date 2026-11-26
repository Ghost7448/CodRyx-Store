import mysql from 'mysql2/promise';

let pool;

export function getPool() {
  if (!pool) {
    if (!process.env.MYSQL_URL && !(process.env.MYSQL_HOST && process.env.MYSQL_USER && process.env.MYSQL_DATABASE)) {
      throw new Error('Database configuration is missing. Set MYSQL_URL or MYSQL_HOST/MYSQL_USER/MYSQL_DATABASE.');
    }

    pool = mysql.createPool(process.env.MYSQL_URL || {
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
      queueLimit: 0,
      enableKeepAlive: true,
      decimalNumbers: true,
      ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: true } : undefined
    });
  }
  return pool;
}

export async function checkDatabase() {
  const db = getPool();
  await db.query('SELECT 1');
}
