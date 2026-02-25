type RoomNotFoundProps = {
  roomSlug?: string;
  title?: string;
  subtitle?: string;
  showInput?: boolean;
};

export function RoomNotFound({
  roomSlug = "radioxplus-main",
  title,
  subtitle = "Ce salon n'existe pas, a été supprimé, ou tu n'as pas accès.",
  showInput = false,
}: RoomNotFoundProps) {
  const roomTitle = (title ?? roomSlug).toUpperCase();

  return (
    <div className="tchat-page">
      {/* Glow background comme Login */}
      <div className="tchat-cardGlow" />

      {/* Card centrale */}
      <div className="tchat-card">
        {/* Titre gradient */}
        <div className="tchat-title">{roomTitle}</div>

        {/* Sous-titre */}
        <p className="tchat-subtitle">
          🚫 <br />
          Salon introuvable
        </p>

        {/* Form wrapper identique */}
        <div className="tchat-form">
          {/* Icône */}
          <div className="tchat-icon-container">
            <span className="tchat-icon">🚫</span>
          </div>

          {/* Message erreur */}
          <div className="login-error" style={{ marginTop: 10 }}>
            {subtitle}
          </div>

          {/* Hint */}
          <p className="tchat-hint" style={{ marginTop: 12 }}>
            Vérifie l’adresse du salon ou retourne au salon principal.
          </p>

          {/* Boutons */}
          <button
            type="button"
            className="tchat-btnPrimary"
            onClick={() => window.history.back()}
          >
            RETOUR
          </button>

          <button
            type="button"
            className="tchat-btnSecondary"
            onClick={() => (window.location.href = "/room/radioxplus-main")}
          >
            SALON PRINCIPAL
          </button>

          <button
            type="button"
            className="tchat-btnLink"
            onClick={() => window.location.reload()}
          >
            Recharger la page
          </button>

          {/* Optionnel */}
          {showInput && (
            <p className="tchat-hint" style={{ marginTop: 14 }}>
              (Input désactivé dans ce mode)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
