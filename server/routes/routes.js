import express from "express";
import path from "path";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { authHttp } from "../middlewares/httpAuth.js";

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token manquant" });
  }

  const token = header.slice(7);

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token invalide ou expiré" });
  }
}

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: {
    error: "Trop de tentatives. Réessaie dans 5 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export default (
  data,
  io,
  Connected,
  userModel,
  messageModel,
  cleanIPAddress,
  upload
) => {
  const app = express.Router();

  // API Routes
  app.get("/data", (req, res) => {
    res.json(data);
  });

  app.get("/test", (req, res) => {
    console.log("test api");
    res.json("test");
  });

  app.get("/testmysql", async (req, res) => {
    try {
      const users = await userModel.getUsers();
      return res.json({
        success: true,
        count: users.length,
        users,
      });
    } catch (e) {
      console.error("❌ DB ERROR:", e);
      return res.status(500).json({
        success: false,
        error: {
          code: e.code,
          message: e.message,
        },
      });
    }
  });

  app.get("/api/me", authMiddleware, async (req, res) => {
    res.json({ user: req.user });
  });
/*
  app.post("/api/auth", async (req, res) => {
  try {
    console.log("🔥 Received /api/auth:", req.body);

    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ ok: false, msg: "username/password requis" });
    }

    const user = await activeUserModel.authenticateUser(username, password);

    if (!user) {
      return res.status(401).json({ ok: false, msg: "Identifiants invalides" });
    }

    return res.json({ ok: true, msg: "Authentification réussie", user });
  } catch (err) {
    console.error("❌ /api/auth error:", err);
    return res.status(500).json({ ok: false, msg: "Erreur serveur" });
  }
});
*/

 app.post("/api/auth", async (req, res) => {

  try {
    const header = req.headers.authorization;
    const fingerprint = req.body.fingerPrint;

    const ifban = await userModel.isFingerprintBanned(fingerprint);
    if (ifban) {
      return res
        .status(403)
        .json({ banned: true, error: "Désolé, vous êtes banni de cette chambre" });
    }

    console.log(`🔐 Auth attempt for username: ${req.body.username}`);

    const user = await userModel.getUserByUsernameAndPassword(
      req.body.username,
      req.body.password
    );

    if (!user) {
      return res.status(401).json({ ok: false, error: "Identifiants incorrects" });
    }

    await userModel.updateUser(user.id, { fingerPrint: fingerprint });

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET || "radioxplus-secret-key",
      {
        expiresIn: "7d",
      }
    );

    const { password, ...safeUser } = user;

    console.log("✅ Auth réussie :", safeUser.username);

    // ✅ Cookie httpOnly
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // ✅ true en prod HTTPS
      sameSite: "lax", // "strict" si tu veux encore plus fermé
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
      path: "/", // cookie valable partout
    });

    // ✅ On renvoie user sans token (token est dans le cookie)
    return res.status(200).json({
      ok: true,
      user: safeUser,
    });
  } catch (err) {
    console.error("Erreur auth:", err);
    return res.status(500).json({ ok: false, error: "Erreur serveur" });
  }
});

  // ============================================
  // FORGOT PASSWORD - Request reset
  // ============================================
  app.post("/api/forgot-password", async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email requis" });
    }

    try {
      const user = await userModel.getUserByEmail(email);

      if (!user) {
        return res.json({
          success: true,
          message:
            "Si cet email existe, un lien de réinitialisation a été envoyé.",
        });
      }

      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetExpiry = new Date();
      resetExpiry.setHours(resetExpiry.getHours() + 1);

      await userModel.updateUser(user.id, {
        resetToken,
        resetTokenExpiry: resetExpiry.toISOString(),
      });

      console.log(`🔐 Password reset requested for ${email}`);
      console.log(`🔑 Reset token: ${resetToken}`);
      console.log(`⏰ Expires: ${resetExpiry.toISOString()}`);

      return res.json({
        success: true,
        message:
          "Si cet email existe, un lien de réinitialisation a été envoyé.",
        devToken: resetToken, // DEV ONLY
      });
    } catch (err) {
      console.error("Forgot password error:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // ============================================
  // RESET PASSWORD - With token
  // ============================================
  app.post("/api/reset-password", async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ error: "Token et nouveau mot de passe requis" });
    }

    if (newPassword.length < 4) {
      return res
        .status(400)
        .json({ error: "Le mot de passe doit contenir au moins 4 caractères" });
    }

    try {
      const user = await userModel.getUserByResetToken(token);

      if (!user) {
        return res.status(400).json({ error: "Token invalide ou expiré" });
      }

      if (user.resetTokenExpiry && new Date(user.resetTokenExpiry) < new Date()) {
        return res
          .status(400)
          .json({ error: "Token expiré. Veuillez refaire une demande." });
      }

      await userModel.updateUser(user.id, {
        password: newPassword,
        resetToken: null,
        resetTokenExpiry: null,
      });

      console.log(`✅ Password reset successful for ${user.username}`);

      return res.json({
        success: true,
        message: "Mot de passe réinitialisé avec succès!",
      });
    } catch (err) {
      console.error("Reset password error:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // ============================================
  // VERIFY RESET TOKEN
  // ============================================
  app.get("/api/verify-reset-token/:token", async (req, res) => {
    const { token } = req.params;

    try {
      const user = await userModel.getUserByResetToken(token);

      if (!user) {
        return res.status(400).json({ valid: false, error: "Token invalide" });
      }

      if (user.resetTokenExpiry && new Date(user.resetTokenExpiry) < new Date()) {
        return res.status(400).json({ valid: false, error: "Token expiré" });
      }

      return res.json({ valid: true, username: user.username });
    } catch (err) {
      console.error("Verify token error:", err);
      return res.status(500).json({ valid: false, error: "Erreur serveur" });
    }
  });

  app.post("/register", async (req, res) => {
    const { username, email, password, age, gender, avatarStyle } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Tous les champs sont requis" });
    }

    const newUser = {
      username: String(username).trim(),
      email: String(email).trim(),
      password,
      role: data.users && data.users.length === 0 ? "admin" : "user",
      online: 0,
      avatar: null,
      age: age ?? null,
      gender: gender ?? null,
      avatarStyle: avatarStyle || "gradient-default",
      textSize: "medium",
      textColor: "#ffffff",
      ipAddress: null,
      lastLogin: null,
      isBanned: 0,
      banReason: null,
      banExpiry: null,
      kickExpiry: null,
    };

    try {
      const created = await userModel.addUser(newUser);
      return res.json({ success: true, user: { ...created, password: undefined } });
    } catch (err) {
      if (
        err.code === "ER_DUP_ENTRY" ||
        err.message === "USERNAME_EXISTS" ||
        err.message === "EMAIL_EXISTS"
      ) {
        if (err.message === "USERNAME_EXISTS") {
          return res.status(409).json({ error: "Ce nom d'utilisateur existe déjà" });
        }
        if (err.message === "EMAIL_EXISTS") {
          return res.status(409).json({ error: "Cet email est déjà utilisé" });
        }
        return res.status(409).json({ error: "Doublon détecté" });
      }

      console.error("Register error:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/login", loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    const user = await userModel.getUserByUsernameAndPassword(username, password);

    if (!user) {
      return res.status(401).json({ error: "Identifiants incorrects" });
    }

    const found = Connected.find((u) => u.username === username);
    if (found) {
      console.log("Double connexion détectée pour", username);
      io.emit("user_kicked", {
        userId: user.id,
        reason: "Double connexion détectée",
        until: new Date().toISOString(),
      });
    }

    // Check ban
    if (user.isBanned) {
      if (user.banExpiry && new Date(user.banExpiry) < new Date()) {
        user.isBanned = false;
        user.banReason = null;
        user.banExpiry = null;
        userModel.updateUser(user.id, { isBanned: 0, banReason: null, banExpiry: null });
      } else {
        const banMessage = user.banExpiry
          ? `Vous êtes banni jusqu'au ${new Date(user.banExpiry).toLocaleString(
              "fr-FR"
            )}. Raison: ${user.banReason || "Non spécifiée"}`
          : `Vous êtes banni de manière permanente. Raison: ${
              user.banReason || "Non spécifiée"
            }`;
        return res.status(403).json({ error: banMessage });
      }
    }

    // Check kick
    if (user.kickExpiry && new Date(user.kickExpiry) > new Date()) {
      const kickMessage = `Vous avez été éjecté jusqu'au ${new Date(
        user.kickExpiry
      ).toLocaleString("fr-FR")}`;
      return res.status(403).json({ error: kickMessage });
    } else if (user.kickExpiry) {
      user.kickExpiry = null;
      userModel.updateUser(user.id, { kickExpiry: null });
    }

    // Capture IP
    const rawIP =
      req.headers["x-forwarded-for"] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress;
    const ipAddress = cleanIPAddress(rawIP);
    user.ipAddress = ipAddress;
    user.lastLogin = new Date();
    userModel.updateUser(user.id, { ipAddress, lastLogin: user.lastLogin });

    res.json({ success: true, user: { ...user, password: undefined } });
  });

  app.post("/users/add", async (req, res) => {
    const { username, email, password, role, adminId } = req.body;
    const admin = await userModel.getUserById(adminId);

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ error: "Non autorisé" });
    }

    if (data.users.find((u) => u.username === username)) {
      return res.status(400).json({ error: "Ce nom d'utilisateur existe déjà" });
    }

    const newUser = {
      id: Date.now(),
      username,
      email,
      password,
      role,
      createdAt: new Date(),
      online: false,
      avatar: null,
    };

    await userModel.addUser(newUser);
    const allUsers = await userModel.getUsers();
    io.emit("users_updated", allUsers);
    res.json({ success: true, user: { ...newUser, password: undefined } });
  });

  app.post("/users/delete", async (req, res) => {
    const { userId, adminId } = req.body;

    const admin = await userModel.getUserById(adminId);
    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ error: "Non autorisé" });
    }

    await userModel.deleteUser(userId);
    const allUsers = await userModel.getUsers();
    io.emit("users_updated", allUsers);
    res.json({ success: true });
  });

  app.post("/api/users/update-profile", authHttp , upload.single("avatar"), async (req, res) => {
    try {
      const {
        userId,
        username,
        email,
        password,
        age,
        gender,
        avatarStyle,
        textSize,
        textColor,
        avatarUrl,
      } = req.body;

      const user = await userModel.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      let avatar = user.avatar;

      if (req.file) {
        avatar = `/uploads/avatars/${req.file.filename}`;
      } else if (avatarUrl) {
        let parsed;
        try {
          parsed = new URL(avatarUrl);
        } catch {
          return res.status(400).json({ error: "avatarUrl invalide" });
        }

        if (!["http:", "https:"].includes(parsed.protocol)) {
          return res.status(400).json({ error: "avatarUrl doit être http/https" });
        }

        const allowedHosts = new Set([
          "api.dicebear.com",
          "ui-avatars.com",
          "robohash.org",
        ]);

        if (!allowedHosts.has(parsed.host)) {
          return res.status(400).json({ error: "avatarUrl domaine non autorisé" });
        }

        avatar = avatarUrl;
      }

      await userModel.updateUser(user.id, {
        username,
        email,
        password: password || undefined,
        age,
        gender,
        avatarStyle,
        avatar,
        textSize: textSize || "medium",
        textColor: textColor || "#ffffff",
      });

      const users = await userModel.getUsers();
      io.emit("users_updated", users);

      const updatedUser = await userModel.getUserById(user.id);

      res.json({ message: "Profil mis à jour avec succès", user: updatedUser });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/users/role", async (req, res) => {
    console.log("Changement de rôle demandé :", req.body);
    const { id, role } = req.body;
    const adminId = 1
    const admin = await userModel.getUserById(adminId);
    
    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ error: "Non autorisé" });
    }

    const user = await userModel.getUserById(id);
    if (user) {
      await userModel.updateUser(user.id, { role: role });
      const allUsers = await userModel.getUsers();
      io.emit("users_updated", allUsers);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Utilisateur non trouvé" });
    }
  });

  app.post("/api/users/avatar", async (req, res) => {
    const { userId, avatarUrl } = req.body;
    const user = await userModel.getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    await userModel.updateUser(user.id, { avatar: avatarUrl });

    const users = await userModel.getUsers();
    io.emit("users_updated", users);
    res.json({
      success: true,
      user: { ...user, avatar: avatarUrl, password: undefined },
    });
  });

  app.post("/api/users/kick", async (req, res) => {
    const { userId, adminId, duration, reason } = req.body;
    const admin = await userModel.getUserById(adminId);

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ error: "Non autorisé" });
    }

    const user = await userModel.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    if (user.role === "admin") {
      return res.status(403).json({ error: "Impossible d'éjecter un administrateur" });
    }

    const kickExpiry = new Date();
    kickExpiry.setMinutes(kickExpiry.getMinutes() + duration);

    await userModel.updateUser(user.id, {
      kickExpiry: kickExpiry.toISOString(),
      online: 0,
    });

    io.emit("user_kicked", { userId, reason, until: kickExpiry.toISOString() });

    Connected.splice(0, Connected.length, ...Connected.filter((u) => u.id != userId));
    io.emit("users_updated", Connected);

    res.json({
      success: true,
      message: `Utilisateur éjecté pour ${duration} minutes`,
    });
  });

  app.post("/api/users/ban", async (req, res) => {
    const { userId, adminId, permanent, duration, reason } = req.body;
    const admin = await userModel.getUserById(adminId);

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ error: "Non autorisé" });
    }

    const user = await userModel.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    if (user.role === "admin") {
      return res.status(403).json({ error: "Impossible de bannir un administrateur" });
    }

    let banExpiry = null;
    if (!permanent && duration) {
      banExpiry = new Date();
      banExpiry.setHours(banExpiry.getHours() + duration);
      banExpiry = banExpiry.toISOString();
    }

    await userModel.updateUser(user.id, {
      isBanned: 1,
      banReason: reason || "Non spécifiée",
      banExpiry,
      online: 0,
    });

    io.emit("user_banned", { userId, reason, permanent });

    Connected.splice(0, Connected.length, ...Connected.filter((u) => u.id != userId));
    io.emit("users_updated", Connected);

    const banMessage = permanent
      ? "Utilisateur banni de manière permanente"
      : `Utilisateur banni pour ${duration} heures`;
    res.json({ success: true, message: banMessage });
  });

  app.post("/api/users/unban", async (req, res) => {
    const { userId, adminId } = req.body;
    const admin = await userModel.getUserById(adminId);

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ error: "Non autorisé" });
    }

    const user = await userModel.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    await userModel.updateUser(user.id, {
      isBanned: 0,
      banReason: null,
      banExpiry: null,
    });
    res.json({ success: true, message: "Utilisateur débanni" });
  });

  app.post("/api/config", async (req, res) => {
    const { config, adminId } = req.body;
    const admin = await userModel.getUserById(adminId);

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ error: "Non autorisé" });
    }

    data.config = { ...data.config, ...config };
    await userModel.updateConfig(data.config);

    io.emit("config_updated", data.config);
    res.json({ success: true });
  });

  app.post("/api/messages/delete", async (req, res) => {
    const { messageId, userId } = req.body;
    const user = await userModel.getUserById(userId);

    if (!user || (user.role !== "admin" && user.role !== "moderator")) {
      return res.status(403).json({ error: "Non autorisé" });
    }

    await messageModel.deleteMessage(messageId);
    io.emit("message_deleted", messageId);
    res.json({ success: true });
  });

  app.post("/api/messages/clear", async (req, res) => {
    const { userId } = req.body;
    const user = await userModel.getUserById(userId);

    if (!user || user.role !== "admin") {
      return res.status(403).json({
        error: "Seuls les administrateurs peuvent effacer l'historique",
      });
    }

    await messageModel.clearMessages();
    data.messages.splice(0, data.messages.length);

    io.emit("chat_cleared");
    console.log(`🗑️ Historique effacé par ${user.username}`);
    res.json({ success: true });
  });

  return app;
};
