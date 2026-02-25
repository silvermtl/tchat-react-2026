// src/endpoints/admin.ts
import { axios } from "./axios_custom";
import type { User } from "../types";

export type AdminRole = "admin" | "moderator" | "user";

export type OkResponse = {
  ok: boolean;
  message?: string;
};

export type BanOptions = {
  permanent?: boolean;
  duration?: number; // minutes
  reason?: string;
};

export type AdminUpdateUserPayload = Partial<{
  username: string;
  email: string;
  status: User["status"];
  ipAddress: string;
  password: string;
  role: AdminRole | string;
}>;

// ===============================
// ✅ SET USER ROLE
// POST /api/admin/set_user_role
// body: { adminId, targetUserId, role }
// ===============================
export const set_user_role = (
  adminId: string | number,
  targetUserId: string | number,
  role: AdminRole
) => {
  return axios
    .post("/api/admin/set_user_role", { adminId, targetUserId, role })
    .then((res) => res.data as OkResponse)
    .catch((error: unknown) => {
      const err = error as { response?: { status?: number; data?: any } };
      if (err?.response?.status !== 429) {
        console.error("Erreur set_user_role :", error);
      }
      throw error;
    });
};

// ===============================
// ✅ KICK USER
// POST /api/admin/kick_user
// body: { adminId, targetUserId }
// ===============================
export const kick_user = (adminId: string | number, targetUserId: string | number) => {
  return axios
    .post("/api/admin/kick_user", { adminId, targetUserId })
    .then((res) => res.data as OkResponse)
    .catch((error: unknown) => {
      const err = error as { response?: { status?: number; data?: any } };
      if (err?.response?.status !== 429) {
        console.error("Erreur kick_user :", error);
      }
      throw error;
    });
};

// ===============================
// ✅ BAN USER
// POST /api/admin/ban_user
// body: { adminId, targetUserId, permanent?, duration?, reason? }
// ===============================
export const ban_user = (
  adminId: string | number,
  targetUserId: string | number,
  options?: BanOptions
) => {
  return axios
    .post("/api/admin/ban_user", { adminId, targetUserId, ...(options || {}) })
    .then((res) => res.data as OkResponse)
    .catch((error: unknown) => {
      const err = error as { response?: { status?: number; data?: any } };
      if (err?.response?.status !== 429) {
        console.error("Erreur ban_user :", error);
      }
      throw error;
    });
};

// ===============================
// ✅ UNBAN USER (optionnel)
// POST /api/admin/unban_user
// body: { adminId, targetUserId }
// ===============================
export const unban_user = (adminId: string | number, targetUserId: string | number) => {
  return axios
    .post("/api/admin/unban_user", { adminId, targetUserId })
    .then((res) => res.data as OkResponse)
    .catch((error: unknown) => {
      const err = error as { response?: { status?: number; data?: any } };
      if (err?.response?.status !== 429) {
        console.error("Erreur unban_user :", error);
      }
      throw error;
    });
};

// ===============================
// ✅ UPDATE USER (profil)
// POST /api/admin/update_user
// body: { adminId, targetUserId, ...fields }
// ===============================
export const admin_update_user = (
  adminId: string | number,
  targetUserId: string | number,
  data: AdminUpdateUserPayload
) => {
  const payload: any = { adminId, targetUserId, ...data };

  // ✅ ne pas envoyer password vide
  if (payload.password === "" || payload.password === null || payload.password === undefined) {
    delete payload.password;
  }

  return axios
    .post("/api/admin/update_user", payload)
    .then((res) => res.data as User)
    .catch((error: unknown) => {
      const err = error as { response?: { status?: number; data?: any } };
      if (err?.response?.status !== 429) {
        console.error("Erreur admin_update_user :", error);
      }
      throw error;
    });
};

// ===============================
// ✅ DELETE USER (optionnel)
// POST /api/admin/delete_user
// body: { adminId, targetUserId }
// ===============================
export const admin_delete_user = (adminId: string | number, targetUserId: string | number) => {
  return axios
    .post("/api/admin/delete_user", { adminId, targetUserId })
    .then((res) => res.data as OkResponse)
    .catch((error: unknown) => {
      const err = error as { response?: { status?: number; data?: any } };
      if (err?.response?.status !== 429) {
        console.error("Erreur admin_delete_user :", error);
      }
      throw error;
    });
};

// ===============================
// ✅ GET ALL USERS (optionnel)
// POST /api/admin/get_users
// body: { adminId }
// ===============================
export const admin_get_users = (adminId: string | number) => {
  return axios
    .post("/api/admin/get_users", { adminId })
    .then((res) => res.data as User[])
    .catch((error: unknown) => {
      const err = error as { response?: { status?: number; data?: any } };
      if (err?.response?.status !== 429) {
        console.error("Erreur admin_get_users :", error);
      }
      throw error;
    });
};