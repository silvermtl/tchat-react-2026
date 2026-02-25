export function cleanIPAddress(ip) {
  if (!ip) return "Non disponible";
  return ip.replace(/^::ffff:/i, "");
}

export function getClientIP(req) {
  return (
    req.headers["x-forwarded-for"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress
  );
}

