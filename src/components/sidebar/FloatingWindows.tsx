import React from 'react';
import type { User } from '../../types';
import type { OpenWindow } from '../Sidebar';

import { WebcamWindow } from '../WebcamWindow';
import { UserContextMenu } from '../UserContextMenu';
import { UserProfileModal } from '../UserProfileModal';
import { PrivateChatWindow } from '../PrivateChatWindow';

export function FloatingWindows({
  openWindows,
  closeWindow,
  handleViewProfile,
  handlePrivateChat,
  handleBan,
  handleKick,
}: {
  openWindows: OpenWindow[];
  closeWindow: (type: OpenWindow['type'], userId: string | number) => void;
  handleViewProfile: (user: User) => void;
  handlePrivateChat: (user: User) => void;
  handleBan: (user: User) => void;
  handleKick: (user: User) => void;
}) {
  return (
    <>
      {openWindows.map((window) => {
        const key = `${window.type}-${window.user.id}`;

        switch (window.type) {
          case 'webcam':
            return (
              <WebcamWindow
                key={key}
                user={window.user}
                onClose={() => closeWindow('webcam', window.user.id)}
                initialPosition={window.position}
              />
            );

          case 'menu':
            return (
              <UserContextMenu
                key={key}
                user={window.user}
                onClose={() => closeWindow('menu', window.user.id)}
                onViewProfile={handleViewProfile}
                onBan={handleBan}
                onKick={handleKick}
                onPrivateChat={handlePrivateChat}
                initialPosition={window.position}
              />
            );

          case 'profile':
            return (
              <UserProfileModal
                key={key}
                user={window.user}
                onClose={() => closeWindow('profile', window.user.id)}
                initialPosition={window.position}
              />
            );

          case 'private':
            return (
              <PrivateChatWindow
                key={key}
                user={window.user}
                onClose={() => closeWindow('private', window.user.id)}
                initialPosition={window.position}
              />
            );

          default:
            return null;
        }
      })}
    </>
  );
}