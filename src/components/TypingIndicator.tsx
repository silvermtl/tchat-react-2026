interface TypingIndicatorProps {
  username: string;
}

export function TypingIndicator({ username }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-2 sm:px-4 py-2 animate-fade-in">
      <span className="text-[#8ba3b8] text-xs sm:text-sm">{username} écrit</span>
      <div className="flex gap-1">
        <span
          className="w-1.5 h-1.5 rounded-full bg-[#00d9c0] animate-bounce"
          style={{ animationDelay: '0ms', animationDuration: '1s' }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-[#00d9c0] animate-bounce"
          style={{ animationDelay: '150ms', animationDuration: '1s' }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-[#00d9c0] animate-bounce"
          style={{ animationDelay: '300ms', animationDuration: '1s' }}
        />
      </div>
    </div>
  );
}
