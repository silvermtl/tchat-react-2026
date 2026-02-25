// src/api/endpoints.ts

// ✅ Si ton axios_custom a déjà baseURL = "/api/api" → laisse ""
// ✅ Sinon, mets "/api/api" ici.
export const API_PREFIX = "/api";

export const ENDPOINTS = {
  users: {
    base: `${API_PREFIX}/users`,
    exists: (id: string | number) =>
      `${API_PREFIX}/users/exists/${encodeURIComponent(String(id))}`,
    byId: (id: string | number) =>
      `${API_PREFIX}/users/${encodeURIComponent(String(id))}`,
    byUsername: (username: string) =>
      `${API_PREFIX}/users/by-username/${encodeURIComponent(String(username))}`,
    role: (id: string | number) =>
      `${API_PREFIX}/users/${encodeURIComponent(String(id))}/role`,
    ban: (id: string | number) =>
      `${API_PREFIX}/users/${encodeURIComponent(String(id))}/ban`,
    unban: (id: string | number) =>
      `${API_PREFIX}/users/${encodeURIComponent(String(id))}/unban`,
    kick: (id: string | number) =>
      `${API_PREFIX}/users/${encodeURIComponent(String(id))}/kick`,
  },
};

export const JSON_NO_CACHE_HEADERS = {
  Accept: "application/json",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
} as const;

export const noCacheParams = () => ({ t: Date.now() });
