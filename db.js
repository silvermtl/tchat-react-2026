const mysql = require('mysql2/promise');
const dbConfig = require('./config/db.config');

// Create connection pool
const pool = mysql.createPool({
  host: dbConfig.host,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  port: dbConfig.port,
  connectionLimit: dbConfig.connectionLimit,
  waitForConnections: dbConfig.waitForConnections,
  queueLimit: dbConfig.queueLimit,
  enableKeepAlive: dbConfig.enableKeepAlive,
  keepAliveInitialDelay: dbConfig.keepAliveInitialDelay,
  charset: dbConfig.charset,
  timezone: dbConfig.timezone,
});

// Test connection on startup
pool.getConnection()
  .then(connection => {
    console.log('✅ MySQL Database connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('❌ MySQL Database connection failed:', err.message);
  });

module.exports = pool;
