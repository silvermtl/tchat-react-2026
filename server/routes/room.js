import express from "express";
import rateLimit from "express-rate-limit";

// (optionnel) limiter spam sur create/update/delete
const roomsLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 30,
  message: { error: "Trop de requêtes. Réessaie plus tard." },
  standardHeaders: true,
  legacyHeaders: false,
});

export default (data, io, Connected, userModel, roomModel) => {
  const app = express.Router();

  // ============================================
  // ROOMS - GET LIST (active only)
  // ============================================
  app.get("/api/rooms", async (req, res) => {
    try {
      const rooms = await roomModel.getRooms({ activeOnly: true });
      return res.json({ success: true, rooms });
    } catch (e) {
      console.error("❌ /api/rooms error:", e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // ============================================
  // ROOMS - GET ONE BY ID
  // ============================================
  app.get("/api/rooms/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const room = await roomModel.getRoomById(id);

      if (!room) {
        return res.status(404).json({ success: false, error: "Room introuvable" });
      }

      return res.json({ success: true, room });
    } catch (e) {
      console.error("❌ /api/rooms/:id error:", e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // ============================================
  // ROOMS - EXISTS (slug) super utile avant join
  // GET /api/rooms/exists/:slug
  // ============================================
  app.get("/api/rooms/exists/:slug", async (req, res) => {
    try {
      console.log("🔍 Checking room existence for slug:", req.params.slug);
      const { slug } = req.params;
      if (!slug) return res.status(400).json({ success: false, error: "Slug manquant" });

      const room = await roomModel.getRoomBySlugActive(slug);

      return res.json({
        success: true,
        exists: !!room,
        room: room || null,
        msg: room ? "Room existe et est active" : "Room n'existe pas ou est inactive",
        
      });
    } catch (e) {
      console.error("❌ /api/rooms/exists/:slug error:", e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // ============================================
  // ROOMS - GET ONE BY SLUG (même si inactive)
  // GET /api/rooms/by-slug/:slug
  // ============================================
  app.get("/api/rooms/by-slug/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      if (!slug) return res.status(400).json({ success: false, error: "Slug manquant" });

      const room = await roomModel.getRoomByName(slug);

      if (!room) {
        return res.status(404).json({ success: false, error: "Room introuvable" });
      }

      return res.json({ success: true, room });
    } catch (e) {
      console.error("❌ /api/rooms/by-slug/:slug error:", e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // ============================================
  // ROOMS - CREATE (ADMIN)
  // POST /api/rooms/create
  // body: { userId, name, active? }
  // ============================================
  app.post("/api/rooms/create", roomsLimiter, async (req, res) => {
    try {
      const { userId, name, active } = req.body;

      const user = await userModel.getUserById(userId);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ success: false, error: "Non autorisé" });
      }

      if (!name || !String(name).trim()) {
        return res.status(400).json({ success: false, error: "Nom requis" });
      }

      const room = await roomModel.addRoom({ name, active: active ?? 1 });

      // (optionnel) notifier les clients d'une MAJ de liste
      io.emit("rooms_updated");

      return res.json({ success: true, room });
    } catch (e) {
      console.error("❌ /api/rooms/create error:", e);
      return res.status(400).json({ success: false, error: e.message });
    }
  });

  // ============================================
  // ROOMS - UPDATE (ADMIN)
  // POST /api/rooms/update
  // body: { userId, roomId, name?, active? }
  // ============================================
  app.post("/api/rooms/update", roomsLimiter, async (req, res) => {
    try {
      const { userId, roomId, name, active } = req.body;

      const user = await userModel.getUserById(userId);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ success: false, error: "Non autorisé" });
      }

      if (!roomId) {
        return res.status(400).json({ success: false, error: "roomId requis" });
      }

      const updated = await roomModel.updateRoom(roomId, { name, active });

      io.emit("rooms_updated");

      return res.json({ success: true, room: updated });
    } catch (e) {
      console.error("❌ /api/rooms/update error:", e);
      return res.status(400).json({ success: false, error: e.message });
    }
  });

  // ============================================
  // ROOMS - DEACTIVATE (ADMIN ou MODERATOR)
  // POST /api/rooms/deactivate
  // body: { userId, roomId }
  // ============================================
  app.post("/api/rooms/deactivate", roomsLimiter, async (req, res) => {
    try {
      const { userId, roomId } = req.body;

      const user = await userModel.getUserById(userId);
      if (!user || (user.role !== "admin" && user.role !== "moderator")) {
        return res.status(403).json({ success: false, error: "Non autorisé" });
      }

      if (!roomId) {
        return res.status(400).json({ success: false, error: "roomId requis" });
      }

      const room = await roomModel.deactivateRoom(roomId);

      io.emit("rooms_updated");

      return res.json({ success: true, room });
    } catch (e) {
      console.error("❌ /api/rooms/deactivate error:", e);
      return res.status(400).json({ success: false, error: e.message });
    }
  });

  // ============================================
  // ROOMS - DELETE (ADMIN)
  // POST /api/rooms/delete
  // body: { userId, roomId }
  // ============================================
  app.post("/api/rooms/delete", roomsLimiter, async (req, res) => {
    try {
      const { userId, roomId } = req.body;

      const user = await userModel.getUserById(userId);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ success: false, error: "Non autorisé" });
      }

      if (!roomId) {
        return res.status(400).json({ success: false, error: "roomId requis" });
      }

      await roomModel.deleteRoom(roomId);

      io.emit("rooms_updated");

      return res.json({ success: true });
    } catch (e) {
      console.error("❌ /api/rooms/delete error:", e);
      return res.status(400).json({ success: false, error: e.message });
    }
  });

  return app;
};
