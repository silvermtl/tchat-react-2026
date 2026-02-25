import React from 'react';
import type { User } from '../../types';

export function OnlineUserRow({
  user,
  hasWebcam,
  unread,
  onOpenMenu,
  onOpenWebcam,
  onBadgeClick,
}: {
  user: User;
  hasWebcam: boolean;
  unread: number;
  onOpenMenu: (e: React.MouseEvent<HTMLElement>) => void;
  onOpenWebcam: (e: React.MouseEvent<HTMLElement>) => void;
  onBadgeClick: (e: React.MouseEvent<HTMLElement>) => void;
}) {
  return (
    <div className="user" style={hasWebcam ? { borderColor: 'rgba(34,197,94,.4)' } : {}}>
      <div className="left">
        <button
          type="button"
          className="avatar"
          onClick={onOpenMenu}
          style={{
            cursor: 'pointer',
            border: hasWebcam ? '2px solid #22c55e' : '2px solid rgba(0,217,192,.4)',
            position: 'relative',
            overflow: 'visible',
          }}
          title="Cliquez pour les options"
        >
          {user.avatar ? (
            <img src={user.avatar} alt={user.username ?? 'Utilisateur'} />
          ) : (
            (user.username ?? '?').charAt(0).toUpperCase()
          )}

          {unread > 0 && (
            <button
              type="button"
              aria-label={`Ouvrir messages privés de ${user.username ?? 'utilisateur'} (${unread} non lus)`}
              className={unread === 1 ? 'unread-badge' : ''}
              onClick={onBadgeClick}
              style={{
                position: 'absolute',
                top: 2,
                right: -10,
                minWidth: 18,
                height: 18,
                padding: '0 6px',
                borderRadius: 999,
                background: '#ef4444',
                color: '#fff',
                fontSize: 11,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid var(--bg-primary)',
                zIndex: 10,
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              {unread}
            </button>
          )}
        </button>

        <div style={{ minWidth: 0 }}>
          <div className="name" style={hasWebcam ? { color: '#22c55e' } : {}}>
            {user.username ?? 'Utilisateur'}
          </div>
          <div className="sub">{user.ipAddress || 'En ligne'}</div>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenWebcam}
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: hasWebcam ? 'rgba(34,197,94,.2)' : 'rgba(15,33,55,.7)',
          border: hasWebcam ? '2px solid #22c55e' : '1px solid var(--border)',
          color: hasWebcam ? '#22c55e' : 'var(--muted)',
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
          fontSize: 16,
        }}
      >
        {hasWebcam ? '📹' : '🎥'}
      </button>
    </div>
  );
}