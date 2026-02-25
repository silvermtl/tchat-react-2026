import { DraggableBox } from './DraggableBox';
import type { User } from '../types';

interface UserProfileModalProps {
  user: User;
  onClose: () => void;
  initialPosition?: { x: number; y: number };

  onChangeRole?: (payload: {
    userId: number;
    newRole: string;
    permanent: boolean;
    duration: number | null;
  }) => void;

  onKick?: (userId: number) => void;
  onBan?: (payload: { userId: number; duration: number | null; permanent: boolean }) => void;
}

export function UserProfileModal({
  user,
  onClose,
  initialPosition,
  onChangeRole,
  onKick,
  onBan
}: UserProfileModalProps) {

  // ✅ conversion string -> number (et protection)
  const userId = Number(user.id);
  const isValidUserId = Number.isFinite(userId);

  const setRoleUserTemp60 = () => {
    if (!isValidUserId) return;
    onChangeRole?.({
      userId,
      newRole: "user",
      permanent: false,
      duration: 60
    });
  };

  const setRoleUserPermanent = () => {
    if (!isValidUserId) return;
    onChangeRole?.({
      userId,
      newRole: "user",
      permanent: true,
      duration: null
    });
  };

  const setRoleAdminTemp60 = () => {
    if (!isValidUserId) return;
    onChangeRole?.({
      userId,
      newRole: "admin",
      permanent: false,
      duration: 60
    });
  };

  const setRoleAdminPermanent = () => {
    if (!isValidUserId) return;
    onChangeRole?.({
      userId,
      newRole: "admin",
      permanent: true,
      duration: null
    });
  };

  const kickUser = () => {
    if (!isValidUserId) return;
    onKick?.(userId);
  };

  const banTemp60 = () => {
    if (!isValidUserId) return;
    onBan?.({ userId, duration: 60, permanent: false });
  };

  const banPermanent = () => {
    if (!isValidUserId) return;
    onBan?.({ userId, duration: null, permanent: true });
  };

  return (
    <DraggableBox
      title="Profil utilisateur"
      onClose={onClose}
      initialPosition={initialPosition}
      width={300}
    >
      <div className="profile-container">
        {/* Avatar */}
        <div className="profile-avatar-large">
          {user.avatar ? (
            <img src={user.avatar} alt={user.username} />
          ) : (
            <span>{(user.username || '?').charAt(0).toUpperCase()}</span>
          )}
        </div>

        {/* User info */}
        <div className="profile-name">{user.username}</div>

        <div className="profile-details">
          <div className="profile-row">
            <span className="profile-label">ID</span>
            <span className="profile-value">{user.id}</span>
          </div>

          <div className="profile-row">
            <span className="profile-label">Statut</span>
            <span className="profile-value online">En ligne</span>
          </div>

          {user.ipAddress && (
            <div className="profile-row">
              <span className="profile-label">IP</span>
              <span className="profile-value">{user.ipAddress}</span>
            </div>
          )}

          {user.color && (
            <div className="profile-row">
              <span className="profile-label">Couleur</span>
              <span
                className="profile-color"
                style={{ backgroundColor: user.color }}
              />
            </div>
          )}

          <div className="profile-row">
            <span className="profile-label">Rôle</span>
            <span className={`profile-value ${user.role === 'admin' || user.role === 'administrateur' ? 'admin' : ''}`}>
              {user.role === 'admin' || user.role === 'administrateur' ? 'Administrateur' : 'Utilisateur'}
            </span>
          </div>
        </div>

        {/* ✅ BOUTONS CRUDS */}
        <div className="profile-actions" style={{ marginTop: 12 }}>
          {!isValidUserId && (
            <div style={{ marginBottom: 8, fontSize: 12 }}>
              ⚠️ ID utilisateur invalide: <b>{String(user.id)}</b>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={setRoleAdminPermanent} disabled={!isValidUserId}>
              Admin (permanent)
            </button>

            <button type="button" onClick={setRoleAdminTemp60} disabled={!isValidUserId}>
              Admin (60m)
            </button>

            <button type="button" onClick={setRoleUserPermanent} disabled={!isValidUserId}>
              User (permanent)
            </button>

            <button type="button" onClick={setRoleUserTemp60} disabled={!isValidUserId}>
              User (60m)
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={kickUser} disabled={!isValidUserId}>
              Kick
            </button>

            <button type="button" onClick={banTemp60} disabled={!isValidUserId}>
              Ban (60m)
            </button>

            <button type="button" onClick={banPermanent} disabled={!isValidUserId}>
              Ban (permanent)
            </button>
          </div>
        </div>
      </div>
    </DraggableBox>
  );
}
