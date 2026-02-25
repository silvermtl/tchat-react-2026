import { useState } from 'react';
import { DraggableBox } from './DraggableBox';
import type { User } from '../types';

interface UserContextMenuProps {
  user: User;
  onClose: () => void;
  onViewProfile: (user: User) => void;
  onBan: (user: User) => void;
  onKick: (user: User) => void;
  onPrivateChat: (user: User) => void;
  initialPosition?: { x: number; y: number };
}

export function UserContextMenu({
  user,
  onClose,
  onViewProfile,
  onBan,
  onKick,
  onPrivateChat,
  initialPosition,
}: UserContextMenuProps) {
  const [confirmAction, setConfirmAction] = useState<'ban' | 'kick' | null>(null);

  const handleAction = (action: 'ban' | 'kick') => {
    if (confirmAction === action) {
      if (action === 'ban') {
        onBan(user);
      } else {
        onKick(user);
      }
      onClose();
    } else {
      setConfirmAction(action);
    }
  };

  return (
    <DraggableBox
      title={user.username}
      onClose={onClose}
      initialPosition={initialPosition}
      width={280}
    >
      <div className="user-menu-container">
        {/* User info header */}
        <div className="user-menu-header">
          <div className="user-menu-avatar">
            {user.avatar ? (
              <img src={user.avatar} alt={user.username} />
            ) : (
              <span>{(user.username || '?').charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="user-menu-info">
            <div className="user-menu-name">{user.username}</div>
            <div className="user-menu-status">
              {user.ipAddress || 'En ligne'}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="user-menu-actions">
          <button
            type="button"
            className="user-menu-btn info"
            onClick={() => {
              onViewProfile(user);
              onClose();
            }}
          >
            <span className="user-menu-icon">👤</span>
            <span>Voir le profil</span>
          </button>

          <button
            type="button"
            className="user-menu-btn private"
            onClick={() => {
              onPrivateChat(user);
              onClose();
            }}
          >
            <span className="user-menu-icon">💬</span>
            <span>Message privé</span>
          </button>

          <div className="user-menu-divider" />

          <button
            type="button"
            className={`user-menu-btn warning ${confirmAction === 'kick' ? 'confirm' : ''}`}
            onClick={() => handleAction('kick')}
          >
            <span className="user-menu-icon">🚪</span>
            <span>{confirmAction === 'kick' ? 'Confirmer le kick ?' : 'Kicker'}</span>
          </button>

          <button
            type="button"
            className={`user-menu-btn danger ${confirmAction === 'ban' ? 'confirm' : ''}`}
            onClick={() => handleAction('ban')}
          >
            <span className="user-menu-icon">🚫</span>
            <span>{confirmAction === 'ban' ? 'Confirmer le ban ?' : 'Bannir'}</span>
          </button>
        </div>

        {confirmAction && (
          <button
            type="button"
            className="user-menu-cancel"
            onClick={() => setConfirmAction(null)}
          >
            Annuler
          </button>
        )}
      </div>
    </DraggableBox>
  );
}
