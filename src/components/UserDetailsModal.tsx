import type { User } from '../types';

interface UserDetailsModalProps {
  user: User;
  onClose: () => void;
}

export function UserDetailsModal({ user, onClose }: UserDetailsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#0f2137] rounded-xl p-6 w-full max-w-md border border-[#1a4a5e] shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Détails de l'utilisateur</h3>
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

        {/* User Avatar */}
        <div className="flex justify-center mb-6">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold text-white border-4 overflow-hidden"
            style={{
              backgroundColor: user.avatar ? 'transparent' : (user.color || '#1a3a52'),
              borderColor: user.color || '#00d9c0'
            }}
          >
            {user.avatar ? (
              <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
            ) : (
              user.avatar || user.username.charAt(0).toUpperCase()
            )}
          </div>
        </div>

        {/* Username */}
        <div className="text-center mb-6">
          <h4 className="text-2xl font-bold" style={{ color: user.color || '#fff' }}>
            {user.username}
          </h4>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${user.status === 'en ligne' ? 'bg-[#00d9c0]' : 'bg-gray-500'}`} />
            <span className="text-[#8ba3b8] text-sm">
              {user.status === 'en ligne' ? 'En ligne' : 'Hors ligne'}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3 bg-[#0a1628] rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-[#8ba3b8]">Rôle</span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
              user.role === 'admin'
                ? 'bg-yellow-500 text-black'
                : user.role === 'administrateur'
                ? 'bg-purple-500 text-white'
                : 'bg-[#1a3a52] text-[#00d9c0]'
            }`}>
              {user.role.toUpperCase()}
            </span>
          </div>

          {user.email && (
            <div className="flex justify-between items-center">
              <span className="text-[#8ba3b8]">Email</span>
              <span className="text-white">{user.email}</span>
            </div>
          )}

          {user.age && (
            <div className="flex justify-between items-center">
              <span className="text-[#8ba3b8]">Âge</span>
              <span className="text-white">{user.age} ans</span>
            </div>
          )}

          {user.gender && (
            <div className="flex justify-between items-center">
              <span className="text-[#8ba3b8]">Sexe</span>
              <span className="text-white flex items-center gap-1">
                {user.gender === 'femme' ? (
                  <svg className="w-4 h-4 text-pink-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 4c-2.21 0-4 1.79-4 4 0 1.48.81 2.77 2 3.47V14H8v2h2v2h4v-2h2v-2h-2v-2.53c1.19-.69 2-1.99 2-3.47 0-2.21-1.79-4-4-4z"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 9c1.29 0 2.5.41 3.47 1.11L17.58 5H14V3h7v7h-2V6.41l-5.11 5.09c.7.97 1.11 2.18 1.11 3.5 0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6z"/>
                  </svg>
                )}
                {user.gender}
              </span>
            </div>
          )}

          {user.ipAddress && (
            <div className="flex justify-between items-center">
              <span className="text-[#8ba3b8]">Adresse IP</span>
              <span className="text-[#00d9c0] font-mono text-sm">{user.ipAddress}</span>
            </div>
          )}

          {user.registeredAt && (
            <div className="flex justify-between items-center">
              <span className="text-[#8ba3b8]">Inscrit le</span>
              <span className="text-white">{user.registeredAt}</span>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full mt-6 py-3 px-4 bg-[#1a3a52] text-white rounded-lg hover:bg-[#2a4a62] transition-colors font-medium"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
