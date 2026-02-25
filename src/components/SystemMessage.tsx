import type { SystemMessage as SystemMessageType } from '../types';
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/fr";

dayjs.extend(relativeTime);
dayjs.locale("fr");

interface SystemMessageProps {
  message: SystemMessageType;
}

export function SystemMessage({ message }: SystemMessageProps) {
  const getMessageContent = () => {
    switch (message.type) {
      case 'join':
        return `${message.username} a rejoint le tchat`;
      case 'leave':
        return `${message.username} a quitté le tchat`;
      case 'kick':
        return `${message.username} a été éjecté du tchat`;
      case 'ban':
        return `${message.username} a été banni du tchat`;
      default:
        return '';
    }
  };

  const getIcon = () => {
    switch (message.type) {
      case 'join':
      case 'leave':
        return (
          <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 11v2h10v-2H7zm5-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
          </svg>
        );
      case 'kick':
        return (
          <svg className="w-4 h-4 text-orange-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
          </svg>
        );
      case 'ban':
        return (
          <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z"/>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex justify-center my-3 sm:my-4 animate-slide-in px-2">
      <div className="bg-[#0f2137] border border-[#00d9c0] rounded-full px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2 max-w-full">
        {getIcon()}
        <span className="text-[#00d9c0] font-medium text-xs sm:text-sm truncate">{getMessageContent()}</span>
        <span className="text-[#8ba3b8] text-xs hidden sm:inline">{dayjs(message.timestamp).fromNow()}</span>
      </div>
    </div>
  );
}
