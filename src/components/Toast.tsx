import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastData;
  onRemove: (id: string) => void;
}

function Toast({ toast, onRemove }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (toast.type === 'error') {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }

    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, toast.duration || 3000);

    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-[#00d9c0]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
        );
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success': return 'border-green-500';
      case 'error': return 'border-red-500';
      case 'warning': return 'border-orange-500';
      default: return 'border-[#00d9c0]';
    }
  };

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border bg-[#0f2137] shadow-xl
        transform transition-all duration-300 ease-out
        ${getBorderColor()}
        ${isExiting ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}
        ${isShaking ? 'animate-shake' : ''}
      `}
    >
      {getIcon()}
      <p className="text-white text-sm">{toast.message}</p>
      <button
        type="button"
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => onRemove(toast.id), 300);
        }}
        className="ml-2 text-[#8ba3b8] hover:text-white transition-colors"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-[90vw] sm:max-w-sm">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            animationDelay: `${index * 50}ms`,
            transform: `translateY(${index * 4}px)`
          }}
          className="animate-slide-in"
        >
          <Toast toast={toast} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}
