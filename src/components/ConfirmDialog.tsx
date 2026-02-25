interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'default';
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText,
  cancelText = 'Annuler',
  onConfirm,
  onCancel,
  variant = 'default',
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-500 hover:bg-red-600';
      case 'warning':
        return 'bg-orange-500 hover:bg-orange-600';
      default:
        return 'bg-[#00d9c0] hover:bg-[#00ff88] text-[#0a1628]';
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'danger':
        return 'text-red-500';
      case 'warning':
        return 'text-orange-500';
      default:
        return 'text-[#00d9c0]';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-[#0f2137] rounded-xl p-6 w-full max-w-sm border border-[#1a4a5e] shadow-2xl animate-slide-in">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className={`w-16 h-16 rounded-full bg-[#0a1628] flex items-center justify-center ${getIconColor()}`}>
            {variant === 'danger' ? (
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z"/>
              </svg>
            ) : variant === 'warning' ? (
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-2h2v2h-2zm0-4V7h2v6h-2z"/>
              </svg>
            ) : (
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-white text-center mb-2">{title}</h3>

        {/* Message */}
        <p className="text-[#8ba3b8] text-center mb-6">{message}</p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 bg-[#1a3a52] text-white rounded-lg hover:bg-[#2a4a62] transition-colors font-medium"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-3 px-4 text-white rounded-lg transition-colors font-medium ${getVariantStyles()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
