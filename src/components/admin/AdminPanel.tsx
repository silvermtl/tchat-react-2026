// src/components/admin/AdminPanel.tsx
import { useEffect, useState } from "react";
import { useChat } from "../../context/ChatContext";

import type { TabType } from "./adminPanel.types";
import { tabs } from "./adminPanel.constants";
import { useAdminPanelActions } from "./useAdminPanelActions";

import { AdminTabUsers } from "./AdminTabUsers";
import { AdminTabConfig } from "./AdminTabConfig";
import { AdminTabAppearance } from "./AdminTabAppearance";
import { AdminTabHistory } from "./AdminTabHistory";

import { get_users } from "../../endpoints/user";

import type { User } from "../../types";
import { AdminEditUserModal } from "./AdminEditUserModal";

export function AdminPanel() {
  const { users, setUsers, setShowAdminPanel, addSystemMessage, currentUser } =
    useChat();

  const [activeTab, setActiveTab] = useState<TabType>("utilisateurs");
  const [roleMenuOpenFor, setRoleMenuOpenFor] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  const { handleChangeRole, handleKickUser, handleBanUser, handleUpdateUser } =
    useAdminPanelActions({
      currentUserId: currentUser?.id ?? "", // ✅ AJOUT
      setUsers,
      addSystemMessage,
      setRoleMenuOpenFor,
    });

   useEffect(() => {
  if (!currentUser?.id) return; // ✅ attend que currentUser existe

  const fetchUsers = async () => {
    try {
      const usersDb = await get_users(currentUser);
      console.log(usersDb);
     setUsers(usersDb); // ✅ tu peux le remettre
    } catch (err) {
      console.error("Erreur get_users:", err);
    }
  };

  fetchUsers();
}, [currentUser?.id, setUsers]);
 
  if (!currentUser?.id) {
    console.error("AdminPanel: currentUser manquant.");
    return (
      <div className="fixed inset-0 bg-[#0a1628] z-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#0f2137] border border-[#1a4a5e] rounded-xl p-6">
          <h2 className="text-white text-xl font-bold mb-2">Accès refusé</h2>
          <p className="text-[#8ba3b8] text-sm mb-4">
            Impossible d’ouvrir le panneau admin : utilisateur introuvable.
          </p>
          <button
            type="button"
            onClick={() => setShowAdminPanel(false)}
            className="w-full px-4 py-2 bg-[#1a3a52] border border-[#00d9c0] text-[#00d9c0] rounded-lg hover:bg-[#00d9c0] hover:text-[#0a1628] transition-colors text-sm font-medium"
          >
            Retour au tchat
          </button>
        </div>
      </div>
    );
  }

  const onlineCount = users.filter((u) => u.status === "en ligne").length;
  const totalCount = users.length;
  const adminCount = users.filter((u) => {
    const r = String(u.role || "").toLowerCase();
    return r === "admin" || r === "administrateur";
  }).length;

  return (
    <div className="fixed inset-0 bg-[#0a1628] z-50 overflow-auto">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#0a1628] via-[#0f2137] to-[#0a1628] border-b border-[#1a4a5e] px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#00d9c0] to-[#00ff88] flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 text-[#0a1628]"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
              </svg>
            </div>

            <div>
              <h1 className="text-xl sm:text-3xl font-bold gradient-text tracking-wider">
                ADMIN PANEL
              </h1>
              <p className="text-[#8ba3b8] text-xs sm:text-sm">
                Gérez les utilisateurs et la configuration
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAdminPanel(false)}
            className="px-4 sm:px-5 py-2 sm:py-2.5 bg-[#1a3a52] border border-[#00d9c0] text-[#00d9c0] rounded-lg hover:bg-[#00d9c0] hover:text-[#0a1628] transition-colors text-sm font-medium flex items-center gap-2 self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
            <span className="hidden sm:inline">Retour au tchat</span>
            <span className="sm:hidden">Retour</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4">
          <div className="bg-[#0f2137] border border-[#1a4a5e] rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#00d9c0]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xl sm:text-2xl">👥</span>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-[#8ba3b8] text-xs">Total</p>
              <p className="text-lg sm:text-2xl font-bold text-white">
                {totalCount}
              </p>
            </div>
          </div>

          <div className="bg-[#0f2137] border border-[#1a4a5e] rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xl sm:text-2xl">🟢</span>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-[#8ba3b8] text-xs">En ligne</p>
              <p className="text-lg sm:text-2xl font-bold text-green-400">
                {onlineCount}
              </p>
            </div>
          </div>

          <div className="bg-[#0f2137] border border-[#1a4a5e] rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xl sm:text-2xl">👑</span>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-[#8ba3b8] text-xs">Admins</p>
              <p className="text-lg sm:text-2xl font-bold text-yellow-400">
                {adminCount}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-[#1a4a5e] px-4 sm:px-6 bg-[#0f2137]/50 overflow-x-auto">
        <div className="flex gap-1 sm:gap-2 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 sm:py-3 px-3 sm:px-4 font-medium transition-all relative flex items-center gap-2 rounded-t-lg whitespace-nowrap text-sm ${
                activeTab === tab.id
                  ? "text-[#00d9c0] bg-[#0a1628] border-t border-l border-r border-[#1a4a5e]"
                  : "text-[#8ba3b8] hover:text-white hover:bg-[#1a3a52]/50"
              }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        {activeTab === "utilisateurs" && (
          <AdminTabUsers
            users={users}
            roleMenuOpenFor={roleMenuOpenFor}
            setRoleMenuOpenFor={setRoleMenuOpenFor}
            handleChangeRole={handleChangeRole}
            handleKickUser={handleKickUser}
            handleBanUser={handleBanUser}
            onEditUser={(u) => {
              setEditUser(u);
              setEditOpen(true);
            }}
          />
        )}

        {activeTab === "configuration" && <AdminTabConfig />}

        {activeTab === "apparence" && <AdminTabAppearance />}

        {activeTab === "historique" && <AdminTabHistory />}
      </div>

      <AdminEditUserModal
        open={editOpen}
        user={editUser}
        onClose={() => {
          setEditOpen(false);
          setEditUser(null);
        }}
        onSave={async (userId, updates) => {
          await handleUpdateUser(userId, updates);
        }}
      />
    </div>
  );
}