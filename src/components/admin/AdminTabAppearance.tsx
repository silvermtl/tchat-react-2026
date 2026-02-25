export function AdminTabAppearance() {
  return (
    <div className="bg-[#0f2137] rounded-lg p-4 sm:p-6">
      <h3 className="text-lg sm:text-xl font-bold text-white mb-4">
        Personnalisation
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-[#8ba3b8] mb-2 text-sm">
            Couleur principale
          </label>

          <div className="flex gap-3 flex-wrap">
            {["#00d9c0", "#00ff88", "#7c3aed", "#ef4444", "#f59e0b"].map(
              (color) => (
                <button
                  key={color}
                  type="button"
                  className="w-10 h-10 rounded-full border-2 border-white/20 hover:border-white transition-colors"
                  style={{ backgroundColor: color }}
                />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}