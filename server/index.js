import express from "express";
import "dotenv/config";

import http from "http";
import { Server } from "socket.io";
import path from "path";
import cors from "cors";

import multer from "multer";
import fs from "fs";

import cookieParser from "cookie-parser";

// Models MYSQL
import userModel from "./models/user.model.js";
import messageModel from "./models/message.model.js";
import roomModel from "./models/room.model.js";
// init services socket io
import initSocket from "./socket/socket.js";
// Utils IP
import { cleanIPAddress, getClientIP } from "./utils/network.util.js";
// Routes
import dataRoutes from "./routes/routes.js";
import dataRoutesRoom from "./routes/room.js";
import dataRoutesAdmin from "./routes/admin.js";
import mediasoupService from "./mediasoup/mediasoup.service.js";
import initMediasoupSocket from "./mediasoup/mediasoup.socket.js";

import { fileURLToPath } from "url";

// ✅ Import du middleware d'authentification Socket.IO
import { socketAuthMiddleware } from "./middlewares/socketAuth.js";

// ✅ __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// ============================
// CONFIG
// ============================
const PORT = process.env.PORT || 3000;

// Origins autorisées (dev + prod)
const ALLOWED_ORIGINS = [
  "http://localhost",
  "http://localhost:80",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://172.29.31.27:5173",
  "http://172.29.31.27:5174",
  "https://vps-702866ec.vps.ovh.ca",
  "http://vps-702866ec.vps.ovh.ca",
  "https://148.113.205.209",
  "http://148.113.205.209",
];

// CORS options pour Express (HTTP)
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    // En dev, accepter tout
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "cache-control",
    "pragma",
    "expires",
    "x-requested-with",
  ],
};

// ============================
// UPLOAD (avatars)
// ============================
const uploadDir = path.join(__dirname, "uploads", "avatars");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // ✅ 20 MB max
  },
});

// ============================
// MIDDLEWARES
// ============================
app.use((req, res, next) => {
  console.log("➡️", req.method, req.url);
  next();
});
// ✅ Middleware d'authentification Socket.IO


app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions)); // ✅ Express 5 compatible
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.set("trust proxy", 1);
// ✅ Cookie parser
app.use(cookieParser());
app.use(express.json());

// ============================
// SOCKET.IO
// ============================
const io = new Server(server, {
  pingInterval: 25000,
  pingTimeout: 20000,
  path: "/socket.io/",
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// ✅ Appliquer le middleware d'authentification à tous les sockets
io.use(socketAuthMiddleware);

io.use((socket, next) => {
  console.log("Cookies reçus:", socket.request.headers.cookie);
  next();
});

// ============================
// DATA INIT
// ============================
let activeUserModel = userModel;
let activeMessageModel = messageModel;
let activeRoomModel = roomModel;

async function dataRoom() {
  const users = await activeUserModel.getUsers();
  const messages = await activeMessageModel.getLastMessages(100);
  const config = await activeRoomModel.getRoomTheme();
  return {
    users,
    messages,
    currentSong: { title: "RadioXPlus en direct", artist: "Monte le son" },
    config,
  };
}

let data = { users: [], messages: [], config: {}, currentSong: null };
let Connected = [];

async function initData() {
  try {
    const newData = await dataRoom();
    data.users = newData.users;
    data.messages = newData.messages;
    data.config = newData.config;
    data.currentSong = newData.currentSong;
    console.log("✅ MySQL Database connected");
  } catch (err) {
    console.log("📝 MySQL not available, using demo mode");
    const newData = await dataRoom();
    data.users = newData.users;
    data.messages = newData.messages;
    data.config = newData.config;
    data.currentSong = newData.currentSong;
    console.log("✅ Demo mode initialized with sample data");
  }
}

// ============================
// API ROUTES
// ============================


app.post("/api/register", async (req, res) => {
  try {
    console.log("🔥 Received /api/register:", req.body);

    const { username, email, password, age, gender } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ ok: false, msg: "username/password requis" });
    }

    const users = await activeUserModel.getUsers();
    const exists = users.find((u) => u.username === username || u.email === email);
    if (exists) {
      return res.status(400).json({ ok: false, msg: "Nom d'utilisateur ou email déjà utilisé" });
    }

    const colors = ["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#ffeaa7", "#dfe6e9", "#fd79a8", "#a29bfe"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newUser = await userModel.addUser({
      username,
      email: email || `${username}@radioxplus.com`,
      password,
      age: age || null,
      gender: gender || null,
      role: "utilisateur",
      color: randomColor,
      avatar: `https://i.pravatar.cc/150?u=${username}`,
    });

    return res.json({ ok: true, msg: "Compte créé avec succès", user: newUser });
  } catch (err) {
    console.error("❌ /api/register error:", err);
    return res.status(500).json({ ok: false, msg: "Erreur serveur" });
  }
});

// ============================
// START
// ============================
async function start() {
  await initData();

  // Initialize Mediasoup
  try {
    await mediasoupService.init();
    console.log("✅ Mediasoup initialized");
  } catch (err) {
    console.error("⚠️ Mediasoup initialization failed:", err.message);
    console.log("📝 Continuing without Mediasoup (video calls disabled)");
  }

  // ✅ Routes (fichiers)
  app.use("/", dataRoutes(data, io, Connected, activeUserModel, activeMessageModel, cleanIPAddress, upload));
  app.use("/", dataRoutesRoom(data, io, Connected, activeUserModel, activeRoomModel, cleanIPAddress, upload));
  app.use("/", dataRoutesAdmin(data, io, Connected, activeUserModel, activeRoomModel, cleanIPAddress, upload));

  // Socket init (chat)
  initSocket({ io, data, Connected, userModel: activeUserModel, messageModel: activeMessageModel });

  // Mediasoup socket init
  initMediasoupSocket(io);

  app.get("/api/mediasoup/stats", (req, res) => {
    try {
      const stats = mediasoupService.getStats();
      res.json({ success: true, stats });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/status", (req, res) => {
    res.json({
      ok: true,
      usersCount: data.users.length,
      messagesCount: data.messages.length,
    });
  });

  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });

  app.use((req, res) => {
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ error: "API route not found" });
    }
    return res.status(404).send("404 Not Found");
  });

  server.listen(PORT, () => {
    console.log(`✅ Server running on port: ${PORT}`);
    console.log(`🌐 Allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);
    console.log(`🎥 Mediasoup namespace: /media`);
  });
}

start().catch((err) => {
  console.error("❌ Failed to start server:", err);
});
