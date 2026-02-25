// routes/admin.js
import express from "express";
import rateLimit from "express-rate-limit";

// (optionnel) limiter spam sur actions admin
const adminLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 60,
  message: { success: false, error: "Trop de requêtes. Réessaie plus tard." },
  standardHeaders: true,
  legacyHeaders: false,
});

export default (data, io, Connected, userModel, roomModel) => {
  const app = express.Router();

  // ============================================
  // Helpers
  // ============================================
  const isAdmin = (u) => {
    const r = String(u?.role || "").toLowerCase();
    return r === "admin" || r === "administrateur";
  };

  const isAdminOrModerator = (u) => {
    const r = String(u?.role || "").toLowerCase();
    return (
      r === "admin" ||
      r === "administrateur" ||
      r === "moderator" ||
      r === "moderateur" ||
      r === "modérateur"
    );
  };

  const requireUser = async (userId) => {
    if (!userId) return null;
    return await userModel.getUserById(userId);
  };

  // ============================================
  // ADMIN - GET USERS (optionnel)
  // POST /api/admin/get_users
  // body: { userId, search?, onlineOnly?, role? }
  // ============================================
  app.post("/api/users/get_users", adminLimiter, async (req, res) => {
    try {
      const id = req.body.id;

      const requester = await requireUser(id);



      // ✅ adapte si ton userModel a déjà des filtres
      let users = await userModel.getUsers();
      console.log(users)

      return res.json({ success: true, users });
    } catch (e) {
      console.error("❌ /api/admin/get_users error:", e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // ============================================
  // ADMIN - SET USER ROLE
  // POST /api/admin/set_user_role
  // body: { userId, targetUserId, role }
  // ============================================
  app.post("/api/admin/set_user_role", adminLimiter, async (req, res) => {
    try {
      const {adminId, targetUserId, role } = req.body;
      console.log(req.body)
      const requester = await requireUser(adminId);
      if (!requester || !isAdmin(requester)) {
        return res.status(403).json({ success: false, error: "Non autorisé" });
      }

      if (!targetUserId) {
        return res.status(400).json({ success: false, error: "targetUserId requis" });
      }

      const newRole = String(role || "").toLowerCase();
      if (!newRole) {
        return res.status(400).json({ success: false, error: "role requis" });
      }

      // ✅ ton format interne : admin | moderator | user
      const mappedRole =
        newRole === "admin" || newRole === "administrateur"
          ? "admin"
          : newRole === "moderator" || newRole === "moderateur" || newRole === "modérateur"
            ? "moderator"
            : "user";

      await userModel.updateUser(targetUserId, { role: mappedRole });

      io.emit("users_updated"); // optionnel: ou ta méthode existante

      return res.json({ success: true, ok: true, role: mappedRole });
    } catch (e) {
      console.error("❌ /api/admin/set_user_role error:", e);
      return res.status(400).json({ success: false, error: e.message });
    }
  });

  // ============================================
  // ADMIN - KICK USER
  // POST /api/admin/kick_user
  // body: { userId, targetUserId }
  // ============================================
  app.post("/api/admin/kick_user", adminLimiter, async (req, res) => {
    try {
      const { userId, targetUserId } = req.body;

      const requester = await requireUser(userId);
      if (!requester || !isAdminOrModerator(requester)) {
        return res.status(403).json({ success: false, error: "Non autorisé" });
      }

      if (!targetUserId) {
        return res.status(400).json({ success: false, error: "targetUserId requis" });
      }

      // ✅ mettre offline en DB
      await userModel.updateUser(targetUserId, { online: 0 });

      // ✅ déconnecter si connecté (si tu as socketIdDb dans Connected)
      const target = Connected.find((c) => String(c?.id) === String(targetUserId));
      if (target?.socketId) {
        io.to(target.socketId).emit("kicked", { reason: "kick" });
        io.sockets.sockets.get(target.socketId)?.disconnect(true);
      } else {
        // fallback: broadcast
        io.emit("user_kicked", { userId: targetUserId });
      }

      io.emit("users_updated");

      return res.json({ success: true, ok: true });
    } catch (e) {
      console.error("❌ /api/admin/kick_user error:", e);
      return res.status(400).json({ success: false, error: e.message });
    }
  });

  // ============================================
  // ADMIN - BAN USER (temp/permanent)
  // POST /api/admin/ban_user
  // body: { userId, targetUserId, permanent?, duration?, reason? }
  // ============================================
  app.post("/api/admin/ban_user", adminLimiter, async (req, res) => {
    try {
      const { userId, targetUserId, permanent, duration, reason } = req.body;

      const requester = await requireUser(userId);
      if (!requester || !isAdminOrModerator(requester)) {
        return res.status(403).json({ success: false, error: "Non autorisé" });
      }

      if (!targetUserId) {
        return res.status(400).json({ success: false, error: "targetUserId requis" });
      }

      // ✅ si tu as un système de ban dans userModel, utilise-le.
      // Sinon, on met un champ "banned" / "ban_until" si tu l'as.
      // Ici: exemple minimal (à adapter à ton DB)
      const now = Date.now();
      let banUntil = null;

      if (permanent) {
        banUntil = "permanent";
      } else {
        const minutes = Number(duration || 60);
        banUntil = new Date(now + minutes * 60 * 1000).toISOString();
      }

      // ⚠️ adapte selon ton schema DB
      await userModel.updateUser(targetUserId, {
        banned: 1,
        ban_until: banUntil,
        ban_reason: reason ? String(reason) : null,
      });

      // ✅ déconnecter si connecté
      const target = Connected.find((c) => String(c?.id) === String(targetUserId));
      if (target?.socketId) {
        io.to(target.socketId).emit("banned", { permanent: !!permanent, banUntil, reason });
        io.sockets.sockets.get(target.socketId)?.disconnect(true);
      } else {
        io.emit("user_banned", { userId: targetUserId, permanent: !!permanent, banUntil });
      }

      io.emit("users_updated");

      return res.json({ success: true, ok: true, banUntil });
    } catch (e) {
      console.error("❌ /api/admin/ban_user error:", e);
      return res.status(400).json({ success: false, error: e.message });
    }
  });

  // ============================================
  // ADMIN - UNBAN USER (optionnel)
  // POST /api/admin/unban_user
  // body: { userId, targetUserId }
  // ============================================
  app.post("/api/admin/unban_user", adminLimiter, async (req, res) => {
    try {
      const { userId, targetUserId } = req.body;

      const requester = await requireUser(userId);
      if (!requester || !isAdmin(requester)) {
        return res.status(403).json({ success: false, error: "Non autorisé" });
      }

      if (!targetUserId) {
        return res.status(400).json({ success: false, error: "targetUserId requis" });
      }

      await userModel.updateUser(targetUserId, {
        banned: 0,
        ban_until: null,
        ban_reason: null,
      });

      io.emit("users_updated");

      return res.json({ success: true, ok: true });
    } catch (e) {
      console.error("❌ /api/admin/unban_user error:", e);
      return res.status(400).json({ success: false, error: e.message });
    }
  });

  // ============================================
  // ADMIN - UPDATE USER (profil)
  // POST /api/admin/update_user
  // body: { userId, targetUserId, username?, email?, password?, role?, status?, ipAddress?, avatar?, online? }
  // ============================================
  app.post("/api/admin/update_user", adminLimiter, async (req, res) => {
    try {
      const {
        targetUserId,
        username,
        email,
        password,
        role,
        status,
        ipAddress,
        avatar,
        online,
      } = req.body;

      console.log(req.body)

      const requester = await requireUser(targetUserId);
      console.log(requester)
      if (!requester || !isAdmin(requester)) {
        return res.status(403).json({ success: false, error: "Non autorisé" });
      }

      if (!targetUserId) {
        return res.status(400).json({ success: false, error: "targetUserId requis" });
      }

      const updates = {};

      if (username !== undefined) updates.username = username;
      if (email !== undefined) updates.email = email;
      if (status !== undefined) updates.status = status;
      if (ipAddress !== undefined) updates.ipAddress = ipAddress;
      if (avatar !== undefined) updates.avatar = avatar;
      if (online !== undefined) updates.online = online;

      if (role !== undefined) {
        const r = String(role || "").toLowerCase();
        updates.role =
          r === "admin" || r === "administrateur"
            ? "admin"
            : r === "moderator" || r === "moderateur" || r === "modérateur"
              ? "moderator"
              : "user";
      }

      // ✅ ne pas accepter password vide
      if (password !== undefined && String(password).trim() !== "") {
        // ⚠️ idéalement hash dans userModel (ex: bcrypt) - à adapter
        updates.password = password;
      }

      const updatedUser = await userModel.updateUser(targetUserId, updates);

      io.emit("users_updated", updatedUser);

      return res.json({ success: true, user: updatedUser });
    } catch (e) {
      console.error("❌ /api/admin/update_user error:", e);
      return res.status(400).json({ success: false, error: e.message });
    }
  });

  // ============================================
  // ADMIN - DELETE USER (optionnel)
  // POST /api/admin/delete_user
  // body: { userId, targetUserId }
  // ============================================
  app.post("/api/admin/delete_user", adminLimiter, async (req, res) => {
    try {
      const { userId, targetUserId } = req.body;

      const requester = await requireUser(userId);
      if (!requester || !isAdmin(requester)) {
        return res.status(403).json({ success: false, error: "Non autorisé" });
      }

      if (!targetUserId) {
        return res.status(400).json({ success: false, error: "targetUserId requis" });
      }

      // ✅ déconnecter si connecté
      const target = Connected.find((c) => String(c?.id) === String(targetUserId));
      if (target?.socketId) {
        io.to(target.socketId).emit("deleted", { reason: "deleted" });
        io.sockets.sockets.get(target.socketId)?.disconnect(true);
      }

      await userModel.deleteUser(targetUserId);

      io.emit("users_updated");

      return res.json({ success: true, ok: true });
    } catch (e) {
      console.error("❌ /api/admin/delete_user error:", e);
      return res.status(400).json({ success: false, error: e.message });
    }
  });

  return app;
};