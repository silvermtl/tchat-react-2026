import React from 'react';
import type { User } from '../../types';

export function CurrentUserCard({
  currentUser,
  isWebcamActive,
  onOpenAvatar,
  onToggleWebcam,
}: {
  currentUser: User;
  isWebcamActive: boolean;
  onOpenAvatar: () => void;
  onToggleWebcam: () => void;
}) {
  return (
    <div
      className="user"
      style={{
        marginBottom: 20,
        background: 'rgba(0,217,192,.08)',
        borderColor: 'rgba(0,217,192,.22)',
      }}
    >
      <div className="left">
        <div
          onClick={onOpenAvatar}
          className="avatar"
          style={{ position: 'relative', cursor: 'pointer' }}
        >
          {currentUser.avatar ? (
            <img src={currentUser.avatar} alt={currentUser.username ?? 'Utilisateur'} />
          ) : (
            (currentUser.username ?? '?').charAt(0).toUpperCase()
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <div className="name" style={{ color: 'var(--accent)' }}>
            {currentUser.username ?? 'Utilisateur'}
          </div>
          <div className="sub">En ligne (vous)</div>
        </div>
      </div>

      <button
        type="button"
        onClick={onToggleWebcam}
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: isWebcamActive ? 'rgba(34,197,94,.2)' : 'rgba(15,33,55,.7)',
          border: isWebcamActive ? '2px solid #22c55e' : '1px solid var(--border)',
          color: isWebcamActive ? '#22c55e' : 'var(--muted)',
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
          fontSize: 18,
        }}
      >
        {isWebcamActive ? '📹' : '🎥'}
      </button>
    </div>
  );
}