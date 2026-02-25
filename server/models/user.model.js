import db from "../db.js";


// ✅ AUTHENTICATE USER
async function authenticateUser(username, password) {
  const [rows] = await db.query(
    "SELECT * FROM users WHERE username = ? AND password = ? LIMIT 1",
    [username, password]
  );

  return rows[0] || null;
}


// ✅ CHECK BAN (fingerprint)
async function isFingerprintBanned(fingerprint) {
  const [rows] = await db.query(
    "SELECT 1 FROM ban_fingerprint WHERE fingerprint = ? LIMIT 1",
    [fingerprint]
  );

  return rows.length > 0; // true = banni
}


// ✅ GET ALL
async function getUsers() {
  const [rows] = await db.query('SELECT * FROM users');
  return rows;
}

// ✅ GET ONE (by id)
async function getUserById(id) {
  const [rows] = await db.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

// ✅ GET ONE (username and password)
async function getUserByUsernameAndPassword(username, password) {
  const [rows] = await db.query('SELECT * FROM users WHERE username = ? AND password = ? LIMIT 1', [username, password]);
  return rows[0] || null;
}

// ✅ GET ONE (by email)
async function getUserByEmail(email) {
  const [rows] = await db.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  return rows[0] || null;
}

// ✅ GET ONE (by reset token)
async function getUserByResetToken(token) {
  const [rows] = await db.query('SELECT * FROM users WHERE resetToken = ? LIMIT 1', [token]);
  return rows[0] || null;
}

// ✅ ADD
async function addUser(data) {
  const fields = Object.keys(data);
  const values = Object.values(data);

  if (fields.length === 0) {
    throw new Error('addUser: aucun champ fourni');
  }

  const placeholders = fields.map(() => '?').join(', ');
  const sql = `INSERT INTO users (${fields.join(', ')}) VALUES (${placeholders})`;

  try {
    const [result] = await db.query(sql, values);
    return { id: result.insertId, ...data };
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      if (err.sqlMessage.includes('uk_username')) {
        throw new Error('USERNAME_EXISTS');
      }
      if (err.sqlMessage.includes('uk_email')) {
        throw new Error('EMAIL_EXISTS');
      }
      throw new Error('DUPLICATE_ENTRY');
    }
    throw err;
  }
}

// ✅ UPDATE (by id)
async function updateUser(id, updates) {
  console.log("🔵 updateUser called");
  console.log("➡️ ID:", id);
  console.log("➡️ Updates reçu:", updates);

  if (!id || typeof updates !== "object") {
    console.log("⛔ updateUser: id invalide ou updates invalide");
    return false;
  }

  const allowedFields = [
    "username",
    "email",
    "role",
    "status",
    "ipAddress",
    "avatar",
    "password",
    "lastLogin"
  ];

  const entries = Object.entries(updates).filter(([key, value]) => {
    if (!allowedFields.includes(key)) {
      console.log(`⚠️ Champ non autorisé ignoré: ${key}`);
      return false;
    }

    if (
      key === "password" &&
      (value === null || value === undefined || value === "")
    ) {
      console.log("⚠️ Password vide ignoré");
      return false;
    }

    if (value === undefined) {
      console.log(`⚠️ Champ undefined ignoré: ${key}`);
      return false;
    }

    return true;
  });

  console.log("✅ Champs retenus:", entries);

  if (entries.length === 0) {
    console.log("⛔ Aucun champ valide à mettre à jour");
    return false;
  }

  const fields = entries.map(([k]) => k);
  const values = entries.map(([, v]) => v);

  const setClause = fields.map(f => `\`${f}\` = ?`).join(", ");
  const sql = `UPDATE users SET ${setClause} WHERE id = ?`;

  console.log("🧠 SQL généré:", sql);
  console.log("📦 Valeurs:", [...values, id]);

  try {
    const [result] = await db.query(sql, [...values, id]);

    console.log("🟢 Résultat MySQL:", result);

    const success = result.affectedRows > 0;

    console.log("🎯 Update success ?", success);

    return success;
  } catch (err) {
    console.error("🔥 updateUser ERROR:", err);
    return false;
  }
}


// ✅ DELETE (by id)
async function deleteUser(id) {
  const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

// ✅ UPDATE CONFIG
async function updateConfig(config) {
  // Placeholder for config update
  console.log('Config updated:', config);
  return true;
}

export default {
  authenticateUser,
  getUsers,
  getUserById,
  getUserByEmail,
  getUserByResetToken,
  addUser,
  updateUser,
  deleteUser,
  getUserByUsernameAndPassword,
  updateConfig,
  isFingerprintBanned
};


