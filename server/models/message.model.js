import db from "../db.js";

/**
 * GET LAST N messages (non supprimés)
 */
export async function getLastMessages(limit = 50) {
  limit = Math.max(1, Math.min(Number(limit) || 50, 500));

  const [rows] = await db.query(
    `SELECT id, user_id, username, content, type, url, timestamp, deleted
     FROM messages
     WHERE deleted = 0
     ORDER BY id DESC
     LIMIT ?`,
    [limit]
  );

  return rows.reverse();
}

/**
 * GET messages avec pagination
 */
export async function getMessagesPaginated(page = 1, size = 50) {
  page = Math.max(1, Number(page) || 1);
  size = Math.max(1, Math.min(Number(size) || 50, 200));

  const offset = (page - 1) * size;

  const [rows] = await db.query(
    `SELECT id, user_id, username, content, type, url, timestamp, deleted
     FROM messages
     WHERE deleted = 0
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    [size, offset]
  );

  return rows.reverse();
}

/**
 * ADD MESSAGE
 */
export async function addMessage(data) {
  console.log("Adding message:", data);

  if (!data) throw new Error("addMessage: data manquant");

  const {
    user_id = null,
    username,
    content = null,
    type = "text"
  } = data;

  if (!username) throw new Error("addMessage: username requis");
  if (!content) throw new Error("addMessage: content requis");

  let contentText = null;
  let toUserId = null;
  let toUsername = null;
  let finalType = type;

  // 🔥 Si content est un objet (nouveau format)
  if (typeof content === "object" && content !== null) {
    contentText = content.text || null;
    toUserId = content.toUserId || null;
    toUsername = content.toUsername || null;
    finalType = content.type || type;
  } else {
    // Ancien format string
    contentText = content;
  }

  const [result] = await db.query(
    `INSERT INTO messages 
     (user_id, username, content, type, toUserId,toUsername, timestamp, deleted)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), 0)`,
    [user_id, username, contentText, finalType, toUserId, toUsername]
  );

  return {
    id: result.insertId,
    user_id,
    username,
    content: contentText,
    type: finalType,
    toUserId: toUserId,
    toUsername: toUsername,
    timestamp: new Date().toISOString(),
    deleted: 0,
  };
}

/**
 * SOFT DELETE
 */
export async function deleteMessage(id) {
  const [result] = await db.query(`UPDATE messages SET deleted = 1 WHERE id = ?`, [
    id,
  ]);
  return result.affectedRows > 0;
}

/**
 * CLEAR (soft delete tous les messages)
 */
export async function clearMessages() {
  const [result] = await db.query(`UPDATE messages SET deleted = 1 WHERE deleted = 0`);
  return result.affectedRows;
}

/**
 * RESTORE un message supprimé
 */
export async function restoreMessage(id) {
  const [result] = await db.query(`UPDATE messages SET deleted = 0 WHERE id = ?`, [
    id,
  ]);
  return result.affectedRows > 0;
}

/**
 * HARD DELETE
 */
export async function hardDeleteMessage(id) {
  const [result] = await db.query(`DELETE FROM messages WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}

/**
 * Optionnel: export default si tu veux garder le même pattern qu'avant
 */
export default {
  getLastMessages,
  getMessagesPaginated,
  addMessage,
  deleteMessage,
  clearMessages,
  restoreMessage,
  hardDeleteMessage,
};
