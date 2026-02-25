// src/components/admin/AdminEditUserModal.tsx
import { useEffect, useState } from "react";
import type { User } from "../../types";
import type { AdminUpdateUserPayload, AdminRole } from "../../endpoints/admin";

type Props = {
  open: boolean;
  user: User | null;
  onClose: () => void;

  // ✅ updates = payload admin
  onSave: (targetUserId: User["id"], updates: AdminUpdateUserPayload) => Promise<void>;
};

export function AdminEditUserModal({ open, user, onClose, onSave }: Props) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<User["status"]>("hors ligne" as any);
  const [ipAddress, setIpAddress] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");

  // ✅ nouveaux champs
  const [role, setRole] = useState<AdminRole>("user");
  const [avatar, setAvatar] = useState("");
  const [online, setOnline] = useState<0 | 1>(0);

  // ✅ AJOUTS demandés
  const [age, setAge] = useState<number | "">("");
  const [createdAt, setCreatedAt] = useState<string>("");     // readonly display
  const [lastLogin, setLastLogin] = useState<string>("");     // readonly display

  const [isSaving, setIsSaving] = useState(false);

  const normalizeRoleToAdminRole = (r: any): AdminRole => {
    const v = String(r || "").toLowerCase();
    if (v === "admin" || v === "administrateur") return "admin";
    if (v === "moderator" || v === "moderateur" || v === "modérateur") return "moderator";
    return "user";
  };

  // petit helper affichage date
  const formatDate = (value: any) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  };

  useEffect(() => {
    if (!user) return;

    setUsername(String(user.username || ""));
    setEmail(String((user as any).email || ""));
    setStatus((user.status || "hors ligne") as any);
    setIpAddress(String(user.ipAddress || ""));
    setPassword("");

    setRole(normalizeRoleToAdminRole((user as any).role));
    setAvatar(String((user as any).avatar || ""));
    setOnline(((user as any).online ? 1 : 0) as 0 | 1);

    // ✅ init gender
    setGender((((user as any).gender || "male") as "male" | "female"));

    // ✅ init âge
    const rawAge = (user as any).age;
    setAge(rawAge === undefined || rawAge === null || rawAge === "" ? "" : Number(rawAge));

    // ✅ init dates (lecture seule)
    setCreatedAt(formatDate((user as any).created_at || (user as any).createdAt));
    setLastLogin(formatDate((user as any).last_login || (user as any).lastLogin || (user as any).last_seen));
  }, [user]);

  if (!open || !user) return null;

  const handleSubmit = async () => {
    const updates: AdminUpdateUserPayload = {};

    const curUsername = String(user.username || "");
    const curEmail = String((user as any).email || "");
    const curIp = String(user.ipAddress || "");
    const curStatus = (user.status || "hors ligne") as any;

    const curRole = normalizeRoleToAdminRole((user as any).role);
    const curAvatar = String((user as any).avatar || "");
    const curOnline = ((user as any).online ? 1 : 0) as 0 | 1;

    const curGender = (((user as any).gender || "male") as "male" | "female");
    const curAgeRaw = (user as any).age;
    const curAge = curAgeRaw === undefined || curAgeRaw === null || curAgeRaw === "" ? "" : Number(curAgeRaw);

    if (username.trim() && username.trim() !== curUsername) updates.username = username.trim();
    if (email.trim() !== curEmail) updates.email = email.trim();
    if (status && status !== curStatus) updates.status = status as any;
    if (ipAddress.trim() !== curIp) updates.ipAddress = ipAddress.trim();

    if (role && role !== curRole) updates.role = role;
    if (avatar.trim() !== curAvatar) (updates as any).avatar = avatar.trim();
    if (online !== curOnline) (updates as any).online = online;

    // ✅ gender / age
    if (gender !== curGender) (updates as any).gender = gender;

    if (age !== curAge) {
      if (age === "") (updates as any).age = null; // si tu veux "vider" l'âge
      else (updates as any).age = Number(age);
    }

    // password seulement si non vide
    if (password.trim().length > 0) updates.password = password.trim();

    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await onSave(user.id, updates);
      onClose();
    } catch (err) {
      console.error("Erreur save user:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
        aria-label="Fermer"
      />

      <div
        className="
          relative w-full max-w-lg
          bg-[#0f2137] border border-[#1a4a5e]
          rounded-2xl shadow-2xl overflow-hidden
          max-h-[85vh] flex flex-col
        "
      >
        <div className="p-4 sm:p-5 border-b border-[#1a4a5e] flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-white text-lg font-bold">Modifier utilisateur</h3>
            <p className="text-[#8ba3b8] text-xs">
              ID: {String(user.id)} — {String(user.username || "")}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-[#1a3a52] text-[#00d9c0] border border-[#00d9c0]/50 hover:bg-[#00d9c0] hover:text-[#0a1628] transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Username */}
          <div>
            <label className="block text-[#8ba3b8] text-sm mb-2">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#0a1628] border border-[#1a4a5e] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#00d9c0]"
              placeholder="Nom d’utilisateur"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-[#8ba3b8] text-sm mb-2">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0a1628] border border-[#1a4a5e] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#00d9c0]"
              placeholder="email@domaine.com"
            />
          </div>

          {/* Role + Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#8ba3b8] text-sm mb-2">Rôle</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as AdminRole)}
                className="w-full bg-[#0a1628] border border-[#1a4a5e] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#00d9c0]"
              >
                <option value="user">User</option>
                <option value="moderator">Modérateur</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-[#8ba3b8] text-sm mb-2">Genre</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as "male" | "female")}
                className="w-full bg-[#0a1628] border border-[#1a4a5e] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#00d9c0]"
              >
                <option value="male">Homme</option>
                <option value="female">Femme</option>
              </select>
            </div>
          </div>

          {/* Online + Age */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#8ba3b8] text-sm mb-2">Online</label>
              <select
                value={String(online)}
                onChange={(e) => setOnline((e.target.value === "1" ? 1 : 0) as 0 | 1)}
                className="w-full bg-[#0a1628] border border-[#1a4a5e] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#00d9c0]"
              >
                <option value="1">1 (en ligne)</option>
                <option value="0">0 (hors ligne)</option>
              </select>
            </div>

            <div>
              <label className="block text-[#8ba3b8] text-sm mb-2">Âge</label>
              <input
                type="number"
                min={0}
                max={130}
                value={age === "" ? "" : String(age)}
                onChange={(e) => {
                  const v = e.target.value;
                  setAge(v === "" ? "" : Number(v));
                }}
                className="w-full bg-[#0a1628] border border-[#1a4a5e] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#00d9c0]"
                placeholder="ex: 25"
              />
            </div>
          </div>

          {/* Statut + IP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#8ba3b8] text-sm mb-2">Statut</label>
              <select
                value={String(status)}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-[#0a1628] border border-[#1a4a5e] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#00d9c0]"
              >
                <option value="en ligne">en ligne</option>
                <option value="hors ligne">hors ligne</option>
              </select>
            </div>

            <div>
              <label className="block text-[#8ba3b8] text-sm mb-2">IP</label>
              <input
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                className="w-full bg-[#0a1628] border border-[#1a4a5e] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#00d9c0]"
                placeholder="0.0.0.0"
              />
            </div>
          </div>

          {/* Avatar */}
          <div>
            <label className="block text-[#8ba3b8] text-sm mb-2">Avatar (URL)</label>
            <input
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              className="w-full bg-[#0a1628] border border-[#1a4a5e] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#00d9c0]"
              placeholder="https://..."
            />
          </div>

          {/* Dates readonly */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#8ba3b8] text-sm mb-2">Date d’inscription</label>
              <input
                value={createdAt || "—"}
                readOnly
                className="w-full bg-[#0a1628] border border-[#1a4a5e] rounded-lg px-4 py-2 text-[#8ba3b8] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#8ba3b8] text-sm mb-2">Dernière connexion</label>
              <input
                value={lastLogin || "—"}
                readOnly
                className="w-full bg-[#0a1628] border border-[#1a4a5e] rounded-lg px-4 py-2 text-[#8ba3b8] focus:outline-none"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[#8ba3b8] text-sm mb-2">
              Nouveau mot de passe (optionnel)
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="w-full bg-[#0a1628] border border-[#1a4a5e] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#00d9c0]"
              placeholder="Laisse vide pour ne pas changer"
            />
          </div>
        </div>

        <div className="p-4 sm:p-5 border-t border-[#1a4a5e] flex gap-3 justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#1a3a52] text-[#8ba3b8] hover:text-white transition-colors"
          >
            Annuler
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg bg-[#00d9c0] text-[#0a1628] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSaving ? "Sauvegarde..." : "Sauvegarder"}
          </button>
        </div>
      </div>
    </div>
  );
}