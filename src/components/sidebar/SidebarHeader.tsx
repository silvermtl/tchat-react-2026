import React from 'react';

export function SidebarHeader({
  roomSlug,
  isConnected,
  isMobileSidebarOpen,
  onCloseMobile,
}: {
  roomSlug: string;
  isConnected: boolean;
  isMobileSidebarOpen: boolean;
  onCloseMobile: () => void;
}) {
  return (
    <div className="sidebarHeader">
      <div className={`statusDot ${isConnected ? '' : 'offline'}`} />
      <div>
        <div className="sidebarTitle">{roomSlug.toUpperCase()}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          {isConnected ? 'Connecté' : 'Déconnecté'}
        </div>
      </div>

      <button
        type="button"
        onClick={onCloseMobile}
        style={{
          marginLeft: 'auto',
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'rgba(15,33,55,.7)',
          border: '1px solid var(--border)',
          color: 'var(--muted)',
          cursor: 'pointer',
          display: isMobileSidebarOpen ? 'grid' : 'none',
          placeItems: 'center',
        }}
      >
        ✕
      </button>
    </div>
  );
}