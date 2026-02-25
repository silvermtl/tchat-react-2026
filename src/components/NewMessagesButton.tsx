interface NewMessagesButtonProps {
  count: number;
  onClick: () => void;
}

export function NewMessagesButton({ count, onClick }: NewMessagesButtonProps) {
  if (count <= 0) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 sm:px-4 py-2 bg-[#00d9c0] text-[#0a1628] rounded-full shadow-lg hover:bg-[#00ff88] transition-all animate-slide-up font-medium text-sm"
    >
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
      </svg>
      <span>
        {count === 1 ? '1 nouveau message' : `${count} nouveaux messages`}
      </span>
    </button>
  );
}
