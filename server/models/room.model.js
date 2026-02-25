import db from "../db.js";

function safeJsonParse(value, fallback) {
  if (value === null || value === undefined) return fallback;

  // Si mysql2 renvoie déjà un objet/array pour une colonne JSON
  if (typeof value === 'object') return value;

  // Si c'est une string, on tente de parser
  if (typeof value === 'string') {
    const s = value.trim();
    if (s === '' || s.toLowerCase() === 'null') return fallback;

    try {
      return JSON.parse(s);
    } catch (e) {
      console.log('⚠️ JSON invalide:', s);
      return fallback;
    }
  }

  return fallback;
}

// GET
async function getRoomTheme() {
  try {
    const [rows] = await db.query('SELECT * FROM room_theme LIMIT 1');
    const row = rows[0];
    if (!row) {
      // Return default config if no row exists
      return {
        roomName: 'RadioXPlus Chat',
        messageLimit: 100,
        maxFileSize: 5242880,
        autoModeration: false,
        bannedWords: [],
        theme: {},
        backgroundImage: null,
        backgroundOpacity: 1,
      };
    }

    row.bannedWords = safeJsonParse(row.bannedWords, []);
    row.theme = safeJsonParse(row.theme, {});

    return row;
  } catch (err) {
    console.error('getRoomTheme error:', err.message);
    // Return default config on error
    return {
      roomName: 'RadioXPlus Chat',
      messageLimit: 100,
      maxFileSize: 5242880,
      autoModeration: false,
      bannedWords: [],
      theme: {},
      backgroundImage: null,
      backgroundOpacity: 1,
    };
  }
}

// UPDATE
async function updateRoomTheme(config) {
  const current = await getRoomTheme();

  const merged = {
    roomName: config.roomName ?? current.roomName,
    messageLimit: config.messageLimit ?? current.messageLimit,
    maxFileSize: config.maxFileSize ?? current.maxFileSize,
    autoModeration: config.autoModeration ?? current.autoModeration,
    bannedWords: config.bannedWords ?? current.bannedWords,
    theme: config.theme ?? current.theme,
    backgroundImage: config.backgroundImage ?? current.backgroundImage,
    backgroundOpacity: config.backgroundOpacity ?? current.backgroundOpacity,
    inputBackgroundImage: config.inputBackgroundImage ?? current.inputBackgroundImage,
    inputBackgroundOpacity: config.inputBackgroundOpacity ?? current.inputBackgroundOpacity,
    messagesAreaBackgroundImage: config.messagesAreaBackgroundImage ?? current.messagesAreaBackgroundImage,
    messagesAreaBackgroundOpacity: config.messagesAreaBackgroundOpacity ?? current.messagesAreaBackgroundOpacity,
    sidebarBackgroundImage: config.sidebarBackgroundImage ?? current.sidebarBackgroundImage,
    sidebarBackgroundOpacity: config.sidebarBackgroundOpacity ?? current.sidebarBackgroundOpacity
  };

  const sql = `
    UPDATE room_theme SET
      roomName = ?,
      messageLimit = ?,
      maxFileSize = ?,
      autoModeration = ?,
      bannedWords = ?,
      theme = ?,
      backgroundImage = ?,
      backgroundOpacity = ?,
      inputBackgroundImage = ?,
      inputBackgroundOpacity = ?,
      messagesAreaBackgroundImage = ?,
      messagesAreaBackgroundOpacity = ?,
      sidebarBackgroundImage = ?,
      sidebarBackgroundOpacity = ?
    WHERE id = 1
  `;

  await db.query(sql, [
    merged.roomName,
    merged.messageLimit,
    merged.maxFileSize,
    merged.autoModeration,
    JSON.stringify(merged.bannedWords),
    JSON.stringify(merged.theme),
    merged.backgroundImage,
    merged.backgroundOpacity,
    merged.inputBackgroundImage,
    merged.inputBackgroundOpacity,
    merged.messagesAreaBackgroundImage,
    merged.messagesAreaBackgroundOpacity,
    merged.sidebarBackgroundImage,
    merged.sidebarBackgroundOpacity
  ]);

  return merged;
}



// ===============================
// Helpers
// ===============================
function normalizeRoomName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")          // espaces -> tirets
    .replace(/[^a-z0-9-_]/g, "")   // enlève caractères spéciaux
    .replace(/-+/g, "-")           // évite ----
    .replace(/^-|-$/g, "");        // enlève - début/fin
}

// ===============================
// ✅ GET ALL
// ===============================
async function getRooms({ activeOnly = false } = {}) {
  let sql = "SELECT id, name, created_at, active FROM rooms";
  const params = [];

  if (activeOnly) {
    sql += " WHERE active = 1";
  }

  sql += " ORDER BY created_at DESC";

  const [rows] = await db.query(sql, params);
  return rows || [];
}

// ===============================
// ✅ GET ONE (by id)
// ===============================
async function getRoomById(id) {
  const [rows] = await db.query(
    "SELECT id, name, created_at, active FROM rooms WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

// ===============================
// ✅ GET ONE (by name / slug)
// ===============================
async function getRoomByName(name) {
  const roomName = normalizeRoomName(name);
  if (!roomName) return null;

  const [rows] = await db.query(
    "SELECT id, name, created_at, active FROM rooms WHERE name = ? LIMIT 1",
    [roomName]
  );
  return rows[0] || null;
}

// ===============================
// ✅ GET ONE (by name / slug) ACTIVE ONLY
// super utile pour join
// ===============================
async function getRoomBySlugActive(slug) {
  const slugName = normalizeRoomName(slug);
  if (!slugName) return null;

  const [rows] = await db.query(
    "SELECT * FROM rooms WHERE slug = ? AND active = 1 LIMIT 1",
    [slugName]
  );
  return rows[0] || null;
}

// ===============================
// ✅ EXISTS (option activeOnly)
// ===============================
async function roomExists(name, { activeOnly = false } = {}) {
  const roomName = normalizeRoomName(name);
  if (!roomName) return false;

  const sql = activeOnly
    ? "SELECT 1 FROM rooms WHERE name = ? AND active = 1 LIMIT 1"
    : "SELECT 1 FROM rooms WHERE name = ? LIMIT 1";

  const [rows] = await db.query(sql, [roomName]);
  return rows.length > 0;
}

// ===============================
// ✅ ADD
// ===============================
async function addRoom(data) {
  const roomName = normalizeRoomName(data?.name);
  const active = data?.active === undefined ? 1 : (data.active ? 1 : 0);

  if (!roomName) {
    throw new Error("ROOM_NAME_EMPTY");
  }

  // empêche doublons (même si inactive)
  const exists = await roomExists(roomName, { activeOnly: false });
  if (exists) {
    throw new Error("ROOM_ALREADY_EXISTS");
  }

  const [result] = await db.query(
    "INSERT INTO rooms (name, active) VALUES (?, ?)",
    [roomName, active]
  );

  return await getRoomById(result.insertId);
}

// ===============================
// ✅ UPDATE (by id)
// ===============================
async function updateRoom(id, updates) {
  const current = await getRoomById(id);
  if (!current) throw new Error("ROOM_NOT_FOUND");

  const entries = Object.entries(updates || {}).filter(([key, value]) => {
    if (value === undefined) return false;
    return true;
  });

  if (entries.length === 0) return false;

  // Normalise name si fourni
  const next = { ...updates };
  if (next.name !== undefined) {
    next.name = normalizeRoomName(next.name);
    if (!next.name) throw new Error("ROOM_NAME_EMPTY");
  }

  // active -> 0/1 si fourni
  if (next.active !== undefined) {
    next.active = next.active ? 1 : 0;
  }

  // si on change le name : vérifier qu'un autre n'a pas déjà ce name
  if (next.name && next.name !== current.name) {
    const [dup] = await db.query(
      "SELECT 1 FROM rooms WHERE name = ? AND id <> ? LIMIT 1",
      [next.name, id]
    );
    if (dup.length > 0) throw new Error("ROOM_NAME_TAKEN");
  }

  const finalEntries = Object.entries(next).filter(([, v]) => v !== undefined);
  const fields = finalEntries.map(([k]) => k);
  const values = finalEntries.map(([, v]) => v);

  const setClause = fields.map((f) => `${f} = ?`).join(", ");
  const sql = `UPDATE rooms SET ${setClause} WHERE id = ?`;

  const [result] = await db.query(sql, [...values, id]);
  return result.affectedRows > 0;
}

// ===============================
// ✅ DELETE (hard)
// ===============================
async function deleteRoom(id) {
  const [result] = await db.query("DELETE FROM rooms WHERE id = ?", [id]);
  return result.affectedRows > 0;
}

// ===============================
// ✅ DEACTIVATE (soft delete)
// ===============================
async function deactivateRoom(id) {
  const [result] = await db.query("UPDATE rooms SET active = 0 WHERE id = ?", [
    id,
  ]);
  return result.affectedRows > 0;
}



export default {
  // room_theme
  getRoomTheme,
  updateRoomTheme,

  // rooms
  normalizeRoomName,
  getRooms,
  getRoomById,
  getRoomByName,
  getRoomBySlugActive,
  roomExists,
  addRoom,
  updateRoom,
  deleteRoom,
  deactivateRoom,
};