// src/components/admin/AdminTabUsers.tsx

import type { User } from "../../types";
import type { RoleChoice } from "./adminPanel.types";
import { isAdminUser, getRoleLabel } from "./adminPanel.helpers";

type Props = {
  users: User[];
  roleMenuOpenFor: string | null;
  setRoleMenuOpenFor: (v: string | null) => void;

  // ✅ accepte sync ou async
  handleChangeRole: (user: User, choice: RoleChoice) => void | Promise<void>;
  handleKickUser: (user: User) => void | Promise<void>;
  handleBanUser: (user: User) => void | Promise<void>;

  onEditUser: (user: User) => void;
};

export function AdminTabUsers({
  users,
  roleMenuOpenFor,
  setRoleMenuOpenFor,
  handleChangeRole,
  handleKickUser,
  handleBanUser,
  onEditUser,
}: Props) {
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white">
            Gestion des utilisateurs
          </h2>
          <p className="text-[#8ba3b8] text-sm">
            {users.length} utilisateurs enregistrés
          </p>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 sm:hidden">
        {users.map((user) => {
          const isAdmin = isAdminUser(user);
          const menuOpen = roleMenuOpenFor === String(user.id);

          return (
            <div
              key={user.id}
              className="bg-[#0f2137] border border-[#1a4a5e] rounded-xl p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#1a3a52] flex items-center justify-center">
                  <span className="text-white font-bold">
                    {String(user.username || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">
                    {String(user.username || "Utilisateur")}
                  </p>
                  <p
                    className={`text-xs ${
                      user.status === "en ligne"
                        ? "text-green-400"
                        : "text-[#8ba3b8]"
                    }`}
                  >
                    {user.status}
                  </p>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold ${
                    isAdmin
                      ? "bg-yellow-500 text-black"
                      : "bg-[#1a3a52] text-[#00d9c0]"
                  }`}
                >
                  {getRoleLabel(user.role)}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap items-start">
                {/* dropdown rôle */}
                <div className="relative flex-1 min-w-[120px]">
                  <button
                    type="button"
                    onClick={() =>
                      setRoleMenuOpenFor(menuOpen ? null : String(user.id))
                    }
                    className="w-full py-2 bg-[#1a3a52] text-[#00d9c0] rounded text-sm hover:bg-[#234a66] transition-colors"
                  >
                    Changer rôle ▾
                  </button>

                  {menuOpen && (
                    <div className="absolute z-50 mt-2 w-full bg-[#0a1628] border border-[#1a4a5e] rounded-lg overflow-hidden shadow-lg">
                      <button
                        type="button"
                        onClick={() => handleChangeRole(user, "admin")}
                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#1a3a52]"
                      >
                        👑 Admin
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChangeRole(user, "moderateur")}
                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#1a3a52]"
                      >
                        🛡️ Modérateur
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChangeRole(user, "user")}
                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#1a3a52]"
                      >
                        👤 User
                      </button>
                    </div>
                  )}
                </div>

                {/* ✅ Modifier (même pour admin) */}
                <button
                  type="button"
                  onClick={() => onEditUser(user)}
                  className="flex-1 py-2 bg-[#1a3a52] text-[#00d9c0] border border-[#00d9c0]/40 rounded text-sm hover:bg-[#234a66] transition-colors"
                >
                  Modifier
                </button>

                {!isAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleKickUser(user)}
                      className="flex-1 py-2 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 transition-colors"
                    >
                      Éjecter
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBanUser(user)}
                      className="flex-1 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                    >
                      Bannir
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div style={{ height: "400px" }} className="hidden sm:block">
        <table className="w-full">
          <thead>
            <tr className="text-left text-[#8ba3b8] text-sm border-b border-[#1a4a5e]">
              <th className="py-4 px-4">Nom</th>
              <th className="py-4 px-4">Rôle</th>
              <th className="py-4 px-4">Statut</th>
              <th className="py-4 px-4">IP</th>
              <th className="py-4 px-4">Actions</th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => {
              const isAdmin = isAdminUser(user);
              const menuOpen = roleMenuOpenFor === String(user.id);

              return (
                <tr
                  key={user.id}
                  className="border-b border-[#1a4a5e] hover:bg-[#0f2137]"
                >
                  <td className="py-4 px-4 text-white font-medium">
                    {String(user.username || "Utilisateur")}
                  </td>

                  <td className="py-4 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        isAdmin
                          ? "bg-yellow-500 text-black"
                          : "bg-[#1a3a52] text-[#00d9c0]"
                      }`}
                    >
                      {getRoleLabel(user.role)}
                    </span>
                  </td>

                  <td className="py-4 px-4">
                    <span
                      className={
                        user.status === "en ligne"
                          ? "text-green-400"
                          : "text-[#8ba3b8]"
                      }
                    >
                      {user.status}
                    </span>
                  </td>

                  <td className="py-4 px-4 text-[#00d9c0]">
                    {user.ipAddress || "—"}
                  </td>

                  <td className="py-4 px-4">
                    <div className="flex gap-2 flex-wrap items-center">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setRoleMenuOpenFor(menuOpen ? null : String(user.id))
                          }
                          className="px-3 py-1 bg-[#1a3a52] text-[#00d9c0] rounded text-sm hover:bg-[#234a66] transition-colors"
                        >
                          Rôle ▾
                        </button>

                        {menuOpen && (
                          <div className="absolute z-50 mt-2 w-44 bg-[#0a1628] border border-[#1a4a5e] rounded-lg overflow-hidden shadow-lg">
                            <button
                              type="button"
                              onClick={() => handleChangeRole(user, "admin")}
                              className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#1a3a52]"
                            >
                              👑 Admin
                            </button>
                            <button
                              type="button"
                              onClick={() => handleChangeRole(user, "moderateur")}
                              className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#1a3a52]"
                            >
                              🛡️ Modérateur
                            </button>
                            <button
                              type="button"
                              onClick={() => handleChangeRole(user, "user")}
                              className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#1a3a52]"
                            >
                              👤 User
                            </button>
                          </div>
                        )}
                      </div>

                      {/* ✅ Modifier visible même si admin */}
                      <button
                        type="button"
                        onClick={() => onEditUser(user)}
                        className="px-3 py-1 bg-[#1a3a52] text-[#00d9c0] border border-[#00d9c0]/40 rounded text-sm hover:bg-[#234a66] transition-colors"
                      >
                        Modifier
                      </button>

                      {!isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleKickUser(user)}
                            className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 transition-colors"
                          >
                            Éjecter
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBanUser(user)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                          >
                            Bannir
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}