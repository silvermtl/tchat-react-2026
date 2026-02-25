import { useState, useRef } from 'react';
import { useChat } from '../context/ChatContext';

interface AvatarUploaderProps {
  isOpen: boolean;
  onClose: () => void;
}

const defaultAvatars = [
  { id: 'A', label: 'A', color: '#00d9c0' },
  { id: 'B', label: 'B', color: '#7c3aed' },
  { id: 'C', label: 'C', color: '#ef4444' },
  { id: 'D', label: 'D', color: '#f59e0b' },
  { id: 'E', label: 'E', color: '#10b981' },
  { id: 'F', label: 'F', color: '#ec4899' },
  { id: 'G', label: 'G', color: '#6366f1' },
  { id: 'H', label: 'H', color: '#14b8a6' },
];

export function AvatarUploader({ isOpen, onClose }: AvatarUploaderProps) {
  const { currentUser, setCurrentUser, users, setUsers } = useChat();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !currentUser) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setPreviewUrl(result);
        setSelectedAvatar(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectDefaultAvatar = (avatarId: string) => {
    setSelectedAvatar(avatarId);
    setPreviewUrl(null);
  };

  const handleSave = () => {
    if (!currentUser) return;

    const updatedUser = {
      ...currentUser,
      avatar: selectedAvatar || currentUser.avatar,
      avatarUrl: previewUrl || currentUser.avatarUrl,
    };

    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u =>
      u.id === currentUser.id ? updatedUser : u
    ));

    onClose();
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#0f2137] rounded-xl p-6 w-full max-w-md border border-[#1a4a5e] shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Changer votre avatar</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1a3a52] flex items-center justify-center hover:bg-[#2a4a62] transition-colors text-[#8ba3b8]"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        {/* Current Avatar Preview */}
        <div className="flex justify-center mb-6">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white border-4 overflow-hidden"
            style={{
              backgroundColor: previewUrl ? 'transparent' : (currentUser.color || '#00d9c0'),
              borderColor: currentUser.color || '#00d9c0'
            }}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              selectedAvatar || currentUser.avatar || currentUser.username.charAt(0).toUpperCase()
            )}
          </div>
        </div>

        {/* Upload Button */}
        <div className="mb-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={handleUploadClick}
            className="w-full py-3 px-4 bg-[#1a3a52] border border-dashed border-[#00d9c0] rounded-lg hover:bg-[#2a4a62] transition-colors flex items-center justify-center gap-2 text-[#00d9c0]"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
            </svg>
            Télécharger une image
          </button>
        </div>

        {/* Default Avatars */}
        <div className="mb-6">
          <p className="text-[#8ba3b8] text-sm mb-3">Ou choisissez un avatar par défaut</p>
          <div className="grid grid-cols-4 gap-3">
            {defaultAvatars.map(avatar => (
              <button
                key={avatar.id}
                type="button"
                onClick={() => handleSelectDefaultAvatar(avatar.id)}
                className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white transition-all ${
                  selectedAvatar === avatar.id ? 'ring-2 ring-[#00d9c0] ring-offset-2 ring-offset-[#0f2137]' : ''
                }`}
                style={{ backgroundColor: avatar.color }}
              >
                {avatar.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 border border-[#1a4a5e] text-[#8ba3b8] rounded-lg hover:bg-[#1a3a52] transition-colors font-medium"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-[#00d9c0] to-[#00ff88] text-[#0a1628] rounded-lg hover:opacity-90 transition-opacity font-bold"
          >
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
}
