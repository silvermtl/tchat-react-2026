// src/components/admin/adminPanel.types.ts
import type { User } from "../../types"; // ✅ le User GLOBAL

export type TabType =
  | "utilisateurs"
  | "configuration"
  | "apparence"
  | "historique";

export type RoleChoice = "admin" | "moderateur" | "user";

export type TabsItem = { id: TabType; label: string; icon: string };

export type IsAdminFn = (u: User) => boolean;