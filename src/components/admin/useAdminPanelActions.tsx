// src/components/admin/useAdminPanelActions.ts
import type React from "react";
import type { User } from "../../types";
import type { RoleChoice } from "./adminPanel.types";
import { isAdminUser, mapChoiceToStoredRole } from "./adminPanel.helpers";

import {
  set_user_role,
  kick_user,
  ban_user,
  admin_update_user,
  type AdminUpdateUserPayload,
} from "../../endpoints/admin";

type SetUsers = React.Dispatch<React.SetStateAction<User[]>>;
type AddSystemMessage = (type: any, payload: any) => void;

export function useAdminPanelActions(params: {
  currentUserId: string | number; // ✅ adminId
  setUsers: SetUsers;
  addSystemMessage: AddSystemMessage;
  setRoleMenuOpenFor: (v: string | null) => void;
}) {
  const { currentUserId, setUsers, addSystemMessage, setRoleMenuOpenFor } = params;

  const handleChangeRole = async (user: User, choice: RoleChoice) => {
    const mappedRole = mapChoiceToStoredRole(choice);

    try {
      // ✅ adminId + targetUserId
      await set_user_role(currentUserId, user.id, mappedRole as any);

      setUsers((prev) =>
        prev.map((u) =>
          String(u.id) === String(user.id)
            ? ({ ...u, role: mappedRole as any } as User)
            : u
        )
      );

      addSystemMessage(
        "info" as any,
        `Rôle changé: ${String(user.username || "User")} → ${mappedRole}`
      );
      setRoleMenuOpenFor(null);
    } catch (err) {
      console.error("Erreur changement de rôle:", err);
      throw err;
    }
  };

  const handleKickUser = async (user: User) => {
    if (isAdminUser(user)) return;

    try {
      // ✅ adminId + targetUserId
      await kick_user(currentUserId, user.id);

      setUsers((prev) =>
        prev.map((u) =>
          String(u.id) === String(user.id)
            ? ({ ...u, status: "hors ligne" as const } as User)
            : u
        )
      );

      addSystemMessage("kick", String(user.username || "User"));
      setRoleMenuOpenFor(null);
    } catch (err) {
      console.error("Erreur kick_user:", err);
      throw err;
    }
  };

  const handleBanUser = async (user: User) => {
    if (isAdminUser(user)) return;

    try {
      // ✅ adminId + targetUserId
      await ban_user(currentUserId, user.id, { permanent: false, duration: 60 });

      setUsers((prev) => prev.filter((u) => String(u.id) !== String(user.id)));

      addSystemMessage("ban", String(user.username || "User"));
      setRoleMenuOpenFor(null);
    } catch (err) {
      console.error("Erreur ban_user:", err);
      throw err;
    }
  };

  // ✅ UPDATE USER via /api/admin/update_user
  const handleUpdateUser = async (
    targetUserId: User["id"],
    updates: AdminUpdateUserPayload
  ) => {
    try {
      const updated = await admin_update_user(currentUserId, targetUserId, updates);

      // merge dans state
      setUsers((prev) =>
        prev.map((u) =>
          String(u.id) === String(targetUserId)
            ? ({ ...u, ...updated } as User)
            : u
        )
      );

      addSystemMessage("info" as any, `Utilisateur modifié: ${String(targetUserId)}`);

      return updated;
    } catch (err) {
      console.error("Erreur handleUpdateUser:", err);
      throw err;
    }
  };

  return {
    handleChangeRole,
    handleKickUser,
    handleBanUser,
    handleUpdateUser,
  };
}