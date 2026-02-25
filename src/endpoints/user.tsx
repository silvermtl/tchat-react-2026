// src/endpoints/users.ts
import { axios } from "./axios_custom";
import type { User } from "../types";

export type OkResponse = { ok: boolean; message?: string };

// ===============================
// Types
// ===============================
export type UsersListResponse = User[];

export type GetUserResponse = User | null;

export type AddUserPayload = {
  username: string;
  password: string;
  email?: string;
  role?: User["role"];
  status?: User["status"];
  ipAddress?: string;
  avatar?: string;
  online?: number | boolean;
};

export type AddUserResponse = User;

export type UpdateUserPayload = Partial<{
  username: string;
  email: string;
  status: User["status"];
  ipAddress: string;
  password: string;
  role: any;
  avatar: string;
  online: number | boolean;
}>;

export type UpdateUserResponse = User;

// ===============================
// ✅ GET ALL USERS (tout dans le body = none)
// POST /api/users/get_users
// body: { onlineOnly?, role?, search? } (optionnel)
// ===============================
export type GetUsersPayload = Partial<{
  onlineOnly: boolean;
  role: string;
  search: string;
}>;

export const get_users = (user) => {
  return axios
    .post("/api/users/get_users", user || {})
    .then((res) => res.data.users as UsersListResponse)
    .catch((error: unknown) => {
      const err = error as { response?: { status?: number; data?: any } };
      if (err?.response?.status === 429) {
      } else {
        console.error("Une erreur s'est produite lors de la requête get_users :", error);
      }
      throw error;
    });
};

// ===============================
// ✅ GET USER BY ID (tout dans le body)
// POST /api/users/get_user
// body: { userId }
// ===============================
export const get_user = (userId: string | number) => {
  return axios
    .post("/api/users/get_user", { userId })
    .then((res) => res.data as GetUserResponse)
    .catch((error: unknown) => {
      const err = error as { response?: { status?: number; data?: any } };
      if (err?.response?.status === 429) {
      } else {
        console.error("Une erreur s'est produite lors de la requête get_user :", error);
      }
      throw error;
    });
};

// ===============================
// ✅ ADD USER (tout dans le body)
// POST /api/users/add_user
// body: { username, password, email?, role?, status?, ipAddress?, avatar?, online? }
// ===============================
export const add_user = (data: AddUserPayload) => {
  return axios
    .post("/api/users/add_user", data)
    .then((res) => res.data as AddUserResponse)
    .catch((error: unknown) => {
      const err = error as { response?: { status?: number; data?: any } };
      if (err?.response?.status === 429) {
      } else {
        console.error("Une erreur s'est produite lors de la requête add_user :", error);
      }
      throw error;
    });
};

// ===============================
// ✅ UPDATE USER (tout dans le body)
// POST /api/users/update_user
// body: { userId, ...fields }
// ===============================
export const update_user = (userId: string | number, data: UpdateUserPayload) => {
  const payload: any = { userId, ...data };

  // ✅ ne pas envoyer password vide
  if (payload.password === "" || payload.password === null || payload.password === undefined) {
    delete payload.password;
  }

  return axios
    .post("/api/users/update_user", payload)
    .then((res) => res.data as UpdateUserResponse)
    .catch((error: unknown) => {
      const err = error as { response?: { status?: number; data?: any } };
      if (err?.response?.status === 429) {
      } else {
        console.error("Une erreur s'est produite lors de la requête update_user :", error);
      }
      throw error;
    });
};

// ===============================
// ✅ DELETE USER (tout dans le body)
// POST /api/users/delete_user
// body: { userId }
// ===============================
export const delete_user = (userId: string | number) => {
  return axios
    .post("/api/users/delete_user", { userId })
    .then((res) => res.data as OkResponse)
    .catch((error: unknown) => {
      const err = error as { response?: { status?: number; data?: any } };
      if (err?.response?.status === 429) {
      } else {
        console.error("Une erreur s'est produite lors de la requête delete_user :", error);
      }
      throw error;
    });
};