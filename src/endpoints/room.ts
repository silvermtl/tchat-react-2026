import { axios } from "./axios_custom";

export type Room = {
  id?: number | string;
  name: string;
  created_at?: string;
  active?: number | boolean;
};

export type RoomExistsResponse = {
  exists: boolean;
  room?: Room | null;
};

// ===============================
// ✅ EXISTS (vérifier si room existe)
// GET /rooms/exists/:slug
// ===============================
export const room_exists = (slug: string) => {
  return axios
    .get(`/api/rooms/exists/${encodeURIComponent(String(slug))}`, {
     
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      params: { t: Date.now() },
    })
    .then((res) => res.data as RoomExistsResponse)
    .catch((error: unknown) => {
      const err = error as { response?: { status?: number; data?: any } };

      if (err?.response?.status === 429) {
        // optionnel: gérer rate limit
      } else {
        console.error("Une erreur s'est produite lors de la requête room_exists :", error);
      }

      throw error;
    });
};

// ===============================
// ✅ GET ALL ROOMS
// GET /rooms?activeOnly=1
// ===============================
export const get_rooms = (activeOnly = false) => {
  return axios
    .get("/rooms", { params: { activeOnly: activeOnly ? 1 : 0 } })
    .then((res) => res.data as Room[])
    .catch((error: unknown) => {
      const err = error as { response?: { status?: number; data?: string } };

      if (err?.response?.status === 429) {
      } else {
        console.error("Une erreur s'est produite lors de la requête get_rooms :", error);
      }

      throw error;
    });
};

// ===============================
// ✅ GET ROOM BY ID
// GET /rooms/:id
// ===============================
export const get_room_by_id = (id: string | number) => {
  return axios
    .get(`/rooms/${encodeURIComponent(String(id))}`)
    .then((res) => res.data as Room | null)
    .catch((error: unknown) => {
      const err = error as { response?: { status?: number; data?: string } };

      if (err?.response?.status === 429) {
      } else {
        console.error("Une erreur s'est produite lors de la requête get_room_by_id :", error);
      }

      throw error;
    });
};

// ===============================
// ✅ GET ROOM BY NAME (slug)
// GET /rooms/by-name/:slug
// ===============================
export const get_room_by_name = (slug: string) => {
  return axios
    .get(`/rooms/by-name/${encodeURIComponent(String(slug))}`)
    .then((res) => res.data as Room | null)
    .catch((error: unknown) => {
      const err = error as { response?: { status?: number; data?: string } };

      if (err?.response?.status === 429) {
      } else {
        console.error("Une erreur s'est produite lors de la requête get_room_by_name :", error);
      }

      throw error;
    });
};

// ===============================
// ✅ ADD ROOM
// POST /rooms
// body: { name, active }
// ===============================
export const add_room = (data: { name: string; active?: boolean | number }) => {
  return axios
    .post("/rooms", data)
    .then((res) => res.data as Room)
    .catch((error: unknown) => {
      const err = error as { response?: { status?: number; data?: string } };

      if (err?.response?.status === 429) {
      } else {
        console.error("Une erreur s'est produite lors de la requête add_room :", error);
      }

      throw error;
    });
};

// ===============================
// ✅ UPDATE ROOM
// PUT /rooms/:id
// body: { name?, active? }
// ===============================
export const update_room = (
  id: string | number,
  data: { name?: string; active?: boolean | number }
) => {
  return axios
    .put(`/rooms/${encodeURIComponent(String(id))}`, data)
    .then((res) => res.data as Room)
    .catch((error: unknown) => {
      const err = error as { response?: { status?: number; data?: string } };

      if (err?.response?.status === 429) {
      } else {
        console.error("Une erreur s'est produite lors de la requête update_room :", error);
      }

      throw error;
    });
};

// ===============================
// ✅ DELETE ROOM (hard delete)
// DELETE /rooms/:id
// ===============================
export const delete_room = (id: string | number) => {
  return axios
    .delete(`/rooms/${encodeURIComponent(String(id))}`)
    .then((res) => res.data as { ok: boolean })
    .catch((error: unknown) => {
      const err = error as { response?: { status?: number; data?: string } };

      if (err?.response?.status === 429) {
      } else {
        console.error("Une erreur s'est produite lors de la requête delete_room :", error);
      }

      throw error;
    });
};

// ===============================
// ✅ DEACTIVATE ROOM (soft delete)
// PATCH /rooms/:id/deactivate
// ===============================
export const deactivate_room = (id: string | number) => {
  return axios
    .patch(`/rooms/${encodeURIComponent(String(id))}/deactivate`)
    .then((res) => res.data as Room)
    .catch((error: unknown) => {
      const err = error as { response?: { status?: number; data?: string } };

      if (err?.response?.status === 429) {
      } else {
        console.error("Une erreur s'est produite lors de la requête deactivate_room :", error);
      }

      throw error;
    });
};
