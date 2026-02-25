// src/components/admin/adminPanel.helpers.ts
import type { User } from "../../types";
import type { RoleChoice } from "./adminPanel.types";

export const isAdminUser = (u: User) => {
  const r = String(u.role || "").toLowerCase();
  return r === "admin" || r === "administrateur";
};

export const getRoleLabel = (role: User["role"]) => {
  const r = String(role || "").toLowerCase();
  if (r === "admin" || r === "administrateur") return "ADMIN";
  if (r === "moderateur" || r === "modérateur" || r === "moderator")
    return "MOD";
  if (r === "utilisateur" || r === "user") return "USER";
  return String(role || "USER").toUpperCase();
};

export const mapChoiceToStoredRole = (choice: RoleChoice) => {
  if (choice === "admin") return "admin";
  if (choice === "moderateur") return "moderator";
  return "user";
};