import mysql from "mysql2/promise";
import dbConfig from "./config/db.config.js";

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
  .then((connection) => {
    console.log("✅ MySQL Database connected successfully");
    connection.release();
  })
  .catch((err) => {
    console.error("❌ MySQL Database connection failed:", err.message);
  });

export default pool;
