import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../context/ChatContext';
import type { User } from '../types';

import { AvatarUploadModal } from './AvatarUpload';
import { SidebarHeader } from './sidebar/SidebarHeader';
import { CurrentUserCard } from './sidebar/CurrentUserCard';
import { OnlineUserRow } from './sidebar/OnlineUserRow';
import { FloatingWindows } from './sidebar/FloatingWindows';

export interface OpenWindow {
  type: 'webcam' | 'menu' | 'profile' | 'private';
  user: User;
  position: { x: number; y: number };
}

export function Sidebar() {
  const {
    onlineUsers,
    currentUser,
    setShowAdminPanel,
    isConnected,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    isWebcamActive,
    usersWithWebcam,
    setAvatarUser,
    avatarUserOpen,
    setAvatarUserOpen,
    roomSlug,
  } = useChat();

  const token = localStorage.getItem('token') || '';
  const [openWindows, setOpenWindows] = useState<OpenWindow[]>([]);
  const [unreadByUser, setUnreadByUser] = useState<Record<string, number>>({});

  const NOTIF_SOUND_URL = 'https://vps-702866ec.vps.ovh.ca/sound/icq-message.wav';
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(NOTIF_SOUND_URL);
    audioRef.current.preload = 'auto';
    audioRef.current.volume = 0.85;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  const playNotifSound = () => {
    const a = audioRef.current;
    if (!a) return;
    try {
      a.currentTime = 0;
      const p = a.play();
      if (p && typeof (p as Promise<void>).catch === 'function') {
        (p as Promise<void>).catch(() => {});
      }
    } catch {}
  };

  const incUnread = (userId: string | number) => {
    const id = String(userId);
    setUnreadByUser((prev) => {
      const prevCount = prev[id] ?? 0;
      const nextCount = prevCount + 1;
      if (prevCount === 0 && nextCount === 1) playNotifSound();
      return { ...prev, [id]: nextCount };
    });
  };

  const resetUnread = (userId: string | number) => {
    const id = String(userId);
    setUnreadByUser((prev) => ({ ...prev, [id]: 0 }));
  };

  useEffect(() => {
    if (!currentUser) {
      setOpenWindows([]);
      setUnreadByUser({});
    }
  }, [currentUser]);

  useEffect(() => {
    const onPrivateMessage = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        fromUserId?: string | number;
        toUserId?: string | number;
      };

      if (!detail?.fromUserId || !currentUser?.id) return;
      if (detail.toUserId != null && String(detail.toUserId) !== String(currentUser.id)) return;

      const isChatOpen = openWindows.some(
        (w) => w.type === 'private' && String(w.user.id) === String(detail.fromUserId)
      );

      if (!isChatOpen) incUnread(detail.fromUserId);
    };

    window.addEventListener('privateMessageReceived', onPrivateMessage as EventListener);
    return () => window.removeEventListener('privateMessageReceived', onPrivateMessage as EventListener);
  }, [currentUser?.id, openWindows]);

  const openWindow = (
    type: OpenWindow['type'],
    user: User,
    event: React.MouseEvent<HTMLElement>
  ) => {
    if (!user) return;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();

    const position = {
      x: Math.max(20, Math.min(window.innerWidth - 350, rect.left - 300)),
      y: Math.max(20, Math.min(window.innerHeight - 400, rect.top)),
    };

    const existing = openWindows.find(
      (w) => w.type === type && String(w.user.id) === String(user.id)
    );

    if (existing) {
      setOpenWindows((prev) => [
        ...prev.filter((w) => !(w.type === type && String(w.user.id) === String(user.id))),
        existing,
      ]);
      return;
    }

    setOpenWindows((prev) => [...prev, { type, user, position }]);
  };

  const closeWindow = (type: OpenWindow['type'], userId: string | number) => {
    setOpenWindows((prev) =>
      prev.filter((w) => !(w.type === type && String(w.user.id) === String(userId)))
    );
  };

  const handleViewProfile = (user: User) => {
    if (!user) return;
    const position = { x: window.innerWidth / 2 - 150, y: 100 };
    setOpenWindows((prev) => [...prev, { type: 'profile', user, position }]);
  };

  const handlePrivateChat = (user: User) => {
    if (!user) return;
    const position = { x: window.innerWidth / 2 - 160, y: 100 };

    const existing = openWindows.find(
      (w) => w.type === 'private' && String(w.user.id) === String(user.id)
    );

    resetUnread(user.id);

    if (!existing) {
      setOpenWindows((prev) => [...prev, { type: 'private', user, position }]);
    }
  };

  const handleBan = (user: User) => alert(`${user?.username ?? 'Utilisateur'} a été banni.`);
  const handleKick = (user: User) => alert(`${user?.username ?? 'Utilisateur'} a été kické.`);

  return (
    <>
      {avatarUserOpen && currentUser && (
        <AvatarUploadModal
          user={currentUser}
          token={token}
          onClose={() => setAvatarUserOpen(false)}
          onUploaded={(updatedUser) => {
            setAvatarUser(updatedUser);
            setAvatarUserOpen(false);
          }}
          initialPosition={{ x: window.innerWidth / 2 - 180, y: 120 }}
        />
      )}

      <div
        className={`sidebar-overlay ${isMobileSidebarOpen ? 'open' : ''}`}
        onClick={() => setIsMobileSidebarOpen(false)}
      />

      <aside className={`sidebar ${isMobileSidebarOpen ? 'open' : ''}`}>
        <SidebarHeader
          roomSlug={roomSlug}
          isConnected={isConnected}
          isMobileSidebarOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        <div className="sidebarBody">
          {currentUser && (
            <CurrentUserCard
              currentUser={currentUser}
              isWebcamActive={isWebcamActive}
              onOpenAvatar={() => setAvatarUserOpen(true)}
              onToggleWebcam={() => window.dispatchEvent(new CustomEvent('toggleWebcamRequest'))}
            />
          )}

          <div className="listTitle">UTILISATEURS EN LIGNE ({onlineUsers.length})</div>

          {onlineUsers
            .filter((u) => String(u.id) !== String(currentUser?.id))
            .map((user) => {
              const hasWebcam = usersWithWebcam.includes(String(user.id));
              const unread = unreadByUser[String(user.id)] ?? 0;

              return (
                <OnlineUserRow
                  key={user.id}
                  user={user}
                  hasWebcam={hasWebcam}
                  unread={unread}
                  onOpenMenu={(e: React.MouseEvent<HTMLElement>) => openWindow('menu', user, e)}
                  onOpenWebcam={(e: React.MouseEvent<HTMLElement>) => openWindow('webcam', user, e)}
                  onBadgeClick={(e: React.MouseEvent<HTMLElement>) => {
                    e.preventDefault();
                    e.stopPropagation();
                    resetUnread(user.id);
                    handlePrivateChat(user);
                    closeWindow('menu', user.id);
                  }}
                />
              );
            })}
        </div>

        <div
          style={{
            borderTop: '1px solid var(--border)',
            padding: 16,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <button
            type="button"
            onClick={() => setShowAdminPanel(true)}
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'rgba(15,33,55,.7)',
              border: '1px solid var(--border)',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: 20,
            }}
          >
            ⚙
          </button>
        </div>
      </aside>

      <FloatingWindows
        openWindows={openWindows}
        closeWindow={closeWindow}
        handleViewProfile={handleViewProfile}
        handlePrivateChat={handlePrivateChat}
        handleBan={handleBan}
        handleKick={handleKick}
      />
    </>
  );
}