export default function TchatLoader({
  title = "TCHAT",
  subtitle = "Connexion en cours...",
}) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#020a15] to-[#071a2b] px-6">
      {/* Glow background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 h-[520px] w-[520px] max-w-[90vw] max-h-[90vw] rounded-full blur-[60px] opacity-60
          bg-[radial-gradient(circle_at_45%_35%,rgba(0,255,183,0.55),transparent_55%),radial-gradient(circle_at_55%_60%,rgba(0,215,255,0.35),transparent_58%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_40%,rgba(0,255,183,0.10),transparent_55%),radial-gradient(900px_500px_at_52%_55%,rgba(0,215,255,0.10),transparent_58%)]" />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-[420px] rounded-2xl border border-[rgba(0,255,183,0.22)] bg-[linear-gradient(180deg,rgba(11,31,53,0.92),rgba(9,26,45,0.92))] px-6 sm:px-8 py-8 sm:py-10 shadow-[0_14px_40px_rgba(0,0,0,0.45),0_0_45px_rgba(0,255,183,0.18)]">
        {/* Title */}
        <h1
          className="text-center text-4xl sm:text-5xl font-extrabold tracking-[2px] text-transparent bg-clip-text
          bg-gradient-to-r from-[#00ffb7] to-[#00d7ff]
          drop-shadow-[0_0_10px_rgba(0,255,183,0.35)]"
        >
          {title}
        </h1>

        <p className="mt-3 text-center text-sm text-[rgba(207,232,255,0.78)]">
          {subtitle}
        </p>

        {/* Spinner neon */}
        <div className="mt-8 flex items-center justify-center">
          <div className="relative h-16 w-16">
            {/* outer ring */}
            <div className="absolute inset-0 rounded-full border-2 border-[rgba(0,215,255,0.20)]" />
            {/* spinning ring */}
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#00ffb7] border-r-[#00d7ff] animate-spin" />
            {/* inner glow */}
            <div className="absolute inset-3 rounded-full bg-[radial-gradient(circle,rgba(0,255,183,0.18),transparent_65%)]" />
          </div>
        </div>

        {/* Loading dots */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#00ffb7] animate-bounce [animation-delay:-0.2s] shadow-[0_0_14px_rgba(0,255,183,0.5)]" />
          <span className="h-2 w-2 rounded-full bg-[#00d7ff] animate-bounce [animation-delay:-0.1s] shadow-[0_0_14px_rgba(0,215,255,0.45)]" />
          <span className="h-2 w-2 rounded-full bg-[#00ffb7] animate-bounce shadow-[0_0_14px_rgba(0,255,183,0.5)]" />
        </div>

        <div className="mt-6 text-center text-xs text-[rgba(168,197,221,0.65)]">
          Si ça prend trop longtemps, vérifie ta connexion.
        </div>
      </div>
    </div>
  );
}
