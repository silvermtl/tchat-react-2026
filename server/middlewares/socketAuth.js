import jwt from "jsonwebtoken";

/* ------------------ Utils ------------------ */

function parseCookies(cookieHeader = "") {
  return cookieHeader
    .split(";")
    .map(v => v.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const idx = pair.indexOf("=");
      if (idx === -1) return acc;

      const k = decodeURIComponent(pair.slice(0, idx).trim());
      const v = decodeURIComponent(pair.slice(idx + 1).trim());

      acc[k] = v;
      return acc;
    }, {});
}

function getTokenFromSocket(socket) {
  // 1️⃣ auth handshake
  const authToken = socket.handshake?.auth?.token;
  if (authToken) return authToken;

  // 2️⃣ Authorization header
  const authHeader =
    socket.handshake?.headers?.authorization ||
    socket.request?.headers?.authorization;

  if (authHeader && typeof authHeader === "string") {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match?.[1]) return match[1];
    return authHeader;
  }

  // 3️⃣ Cookies
  const cookieHeader = socket.request?.headers?.cookie || "";
  const cookies = parseCookies(cookieHeader);

  return cookies.token || cookies.accessToken || null;
}

/* ------------------ Middleware Export ------------------ */

export function socketAuthMiddleware(socket, next) {
  try {
    const token = getTokenFromSocket(socket);

    if (!token) {
      return next(new Error("UNAUTHORIZED: token manquant"));
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    socket.user = payload;
    socket.userId = payload.id;

    console.log("✅ Socket auth OK:", payload.id);

    next();
  } catch (err) {
    console.error("❌ Socket auth error:", err.message);
    next(new Error("UNAUTHORIZED: token invalide"));
  }
}