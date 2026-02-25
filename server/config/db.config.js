// ============================================
// CONFIGURATION DE LA BASE DE DONNÉES MYSQL
// ============================================

const isProd = process.env.NODE_ENV === "production";

// Debug safe
console.log("🧠 DB ENV =", process.env.NODE_ENV);
console.log(
  "🗄️ DB HOST =",
  isProd ? process.env.DB_HOST_PROD : process.env.DB_HOST_DEV
);
console.log(
  "🗄️ DB USER =",
  isProd ? process.env.DB_USER_PROD : process.env.DB_USER_DEV
);
console.log(
  "🗄️ DB NAME =",
  isProd ? process.env.DB_NAME_PROD : process.env.DB_NAME_DEV
);
console.log(
  "🗄️ DB PORT =",
  isProd ? process.env.DB_PORT_PROD : process.env.DB_PORT_DEV
);

const dbConfig = {
  host: isProd ? process.env.DB_HOST_PROD : process.env.DB_HOST_DEV,
  user: isProd ? process.env.DB_USER_PROD : process.env.DB_USER_DEV,
  password: isProd ? process.env.DB_PASS_PROD : process.env.DB_PASS_DEV,
  database: isProd ? process.env.DB_NAME_PROD : process.env.DB_NAME_DEV,
  port: Number(isProd ? process.env.DB_PORT_PROD : process.env.DB_PORT_DEV) || 3306,

  // Options de connexion
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,

  // Options de charset pour supporter les emojis et caractères spéciaux
  charset: "utf8mb4",

  // Timezone
  timezone: "Z", // UTC
};

export default dbConfig;
