export function AdminTabConfig() {
  return (
    <div className="bg-[#0f2137] rounded-lg p-4 sm:p-6">
      <h3 className="text-lg sm:text-xl font-bold text-white mb-4">
        Configuration du tchat
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-[#8ba3b8] mb-2 text-sm">
            Nom du salon principal
          </label>
          <input
            type="text"
            defaultValue="Salon Principal"
            className="w-full bg-[#0a1628] border border-[#1a4a5e] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#00d9c0]"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="moderation"
            defaultChecked
            className="accent-[#00d9c0]"
          />
          <label htmlFor="moderation" className="text-white text-sm">
            Activer la modération automatique
          </label>
        </div>
      </div>
    </div>
  );
}