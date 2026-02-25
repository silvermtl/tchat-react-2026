export function AdminTabHistory() {
  return (
    <div className="bg-[#0f2137] rounded-lg p-4 sm:p-6">
      <h3 className="text-lg sm:text-xl font-bold text-white mb-4">
        Historique des actions
      </h3>

      <div className="space-y-3">
        <div className="flex items-center gap-3 text-[#8ba3b8] text-sm">
          <span className="text-[#00d9c0]">21:30</span>
          <span>silver a envoyé un message</span>
        </div>
        <div className="flex items-center gap-3 text-[#8ba3b8] text-sm">
          <span className="text-[#00d9c0]">21:20</span>
          <span>James007 a envoyé un message</span>
        </div>
      </div>
    </div>
  );
}