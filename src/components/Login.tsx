import { useState, useEffect, useCallback } from "react";
import { useChat } from "../context/ChatContext";
import config from "../config/env";
import { auth } from "../endpoints/login";
import ClientFingerprint from "./fingerprint/ClientFingerprint";

type AuthMode = "login" | "register" | "forgot" | "reset" | "banned";

export default function TchatLogin() {
  const { setIsAuthenticated, setCurrentUser, fingerPrint,roomSlug } = useChat();

  const [mode, setMode] = useState<AuthMode>("login");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Token en state (utile si tu veux t'en servir ailleurs dans ce composant)
  const [token, setToken] = useState<string | null>(null);

  // Reset password
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [resetUsername, setResetUsername] = useState<string | null>(null);

  // ✅ Mode banni
  const [bannedReason, setBannedReason] = useState<string | null>(null);

  const serverUrl = config.apiUrl;

  const clearAuthState = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setIsAuthenticated(false);
    setCurrentUser(null);
  }, [setIsAuthenticated, setCurrentUser]);

  const switchMode = useCallback(
    (newMode: AuthMode) => {
      setError(null);
      setSuccess(null);

      // ✅ Si banni, on bloque la navigation
      if (mode === "banned") return;

      setMode(newMode);
    },
    [mode]
  );

  const verifyResetToken = useCallback(
    async (t: string) => {
      try {
        setIsLoading(true);

        const response = await fetch(`${serverUrl}/api/verify-reset-token/${t}`, {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data?.valid) {
          setError(data?.error || "Token invalide ou expiré");
          setResetToken(null);
          setResetUsername(null);
          setMode("forgot");
          return;
        }

        setResetUsername(data.username);
      } catch (err) {
        console.error("Token verification error:", err);
        setError("Erreur de vérification du token");
        setResetToken(null);
        setResetUsername(null);
        setMode("forgot");
      } finally {
        setIsLoading(false);
      }
    },
    [serverUrl]
  );

  useEffect(() => {
    console.log("loasdin");
    console.log(fingerPrint);
  }, [fingerPrint]);

  // ✅ 1) Mode reset si reset_token dans l'URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlResetToken = params.get("reset_token");

    if (urlResetToken) {
      setResetToken(urlResetToken);
      setMode("reset");
      verifyResetToken(urlResetToken);
    }
  }, [verifyResetToken]);

  // ✅ 2) Auto-login au chargement (sauf si reset)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlResetToken = params.get("reset_token");
    if (urlResetToken) return;

    const savedToken = localStorage.getItem("token");
    if (!savedToken) return;

    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);

        const response = await fetch(`${serverUrl}/api/me`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${savedToken}`,
          },
        });

        const data = await response.json().catch(() => ({}));

        // ✅ Si banni => mode banni
        if (response.status === 403) {
          if (!cancelled) {
            setBannedReason(data?.error || "Accès interdit (banni).");
            setMode("banned");
            clearAuthState();
          }
          return;
        }

        if (!response.ok) {
          if (!cancelled) clearAuthState();
          return;
        }

        if (!cancelled) {
          setToken(savedToken);
          setIsAuthenticated(true);
          setCurrentUser(data.user);
        }
      } catch (err) {
        console.error("Auto-login error:", err);
        if (!cancelled) clearAuthState();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [serverUrl, clearAuthState, setIsAuthenticated, setCurrentUser]);

  // --------------- LOGIN ---------------
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    const form = new FormData(e.currentTarget);
    const username = (form.get("username") ?? "").toString().trim();
    const password = (form.get("password") ?? "").toString();

    if (!username || !password || fingerPrint === "") {
      setError("Entre ton nom d'utilisateur et ton mot de passe ou fingerprint pas pret.");
      setIsLoading(false);
      return;
    }

    try {
      const resp = await auth({ username, password, fingerPrint });

      if (resp?.token) {
        localStorage.setItem("token", resp.token);
        setToken(resp.token);
      } else {
        localStorage.removeItem("token");
        setToken(null);
      }

      setIsAuthenticated(true);
      setCurrentUser(resp.user);
    } catch (err: any) {
      console.error("Login error:", err);

      const status = err?.response?.status;
      const banned = err?.response?.data?.banned;
      const msg = err?.response?.data?.error;

      // ✅ Mode banni
      if (status === 403 || banned) {
        setBannedReason(msg || "Accès interdit (banni).");
        setMode("banned");
        setError(null);
        setSuccess(null);
        clearAuthState();
        return;
      }

      setError(msg || "Identifiants invalides");
      clearAuthState();
    } finally {
      setIsLoading(false);
    }
  };

  // --------------- REGISTER ---------------
const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setError(null);
  setSuccess(null);
  setIsLoading(true);

  const form = new FormData(e.currentTarget);
  const username = (form.get("username") ?? "").toString().trim();
  const email = (form.get("email") ?? "").toString().trim();
  const password = (form.get("password") ?? "").toString();
  const confirmPassword = (form.get("confirmPassword") ?? "").toString();
  const age = (form.get("age") ?? "").toString();
  const gender = (form.get("gender") ?? "").toString();

  if (!username || !email || !password) {
    setError("Nom d'utilisateur, email et mot de passe requis.");
    setIsLoading(false);
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    setError("Veuillez entrer une adresse email valide.");
    setIsLoading(false);
    return;
  }

  if (password !== confirmPassword) {
    setError("Les mots de passe ne correspondent pas.");
    setIsLoading(false);
    return;
  }

  if (password.length < 4) {
    setError("Le mot de passe doit contenir au moins 4 caractères.");
    setIsLoading(false);
    return;
  }

  try {
    const response = await fetch(`${serverUrl}api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        username,
        email,
        password,
        age: age ? Number.parseInt(age) : null,
        gender: gender || null,
      }),
    });

    const data: any = await response.json().catch(() => ({}));

    // ✅ IMPORTANT: ton backend renvoie {"ok":false,"msg":"..."} (même parfois en 200)
    if (!response.ok || data?.ok === false) {
      const msg =
        data?.msg ||
        data?.error ||
        data?.message ||
        `Erreur lors de l'inscription (HTTP ${response.status})`;
      throw new Error(msg);
    }

    setSuccess("Compte créé avec succès ! Vous pouvez maintenant vous connecter.");
    setMode("login");

    setTimeout(() => {
      const usernameInput = document.getElementById("username") as HTMLInputElement;
      if (usernameInput) usernameInput.value = username;
    }, 100);
  } catch (err) {
    console.error("Register error:", err);
    setError(err instanceof Error ? err.message : "Erreur lors de l'inscription.");
  } finally {
    setIsLoading(false);
  }
};

  // --------------- FORGOT PASSWORD ---------------
  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    const form = new FormData(e.currentTarget);
    const email = (form.get("email") ?? "").toString().trim();

    if (!email) {
      setError("Veuillez entrer votre adresse email.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${serverUrl}/api/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la demande");
      }

      setSuccess(data.message || "Si cet email existe, un lien de réinitialisation a été envoyé.");

      // DEV ONLY
      if (data.devToken) {
        console.log("🔑 DEV: Reset link:", `${window.location.origin}?reset_token=${data.devToken}`);
        setSuccess(`Email envoyé ! (DEV: Token = ${data.devToken})`);
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de la demande.");
    } finally {
      setIsLoading(false);
    }
  };

  // --------------- RESET PASSWORD ---------------
  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    const form = new FormData(e.currentTarget);
    const newPassword = (form.get("newPassword") ?? "").toString();
    const confirmPassword = (form.get("confirmPassword") ?? "").toString();

    if (!newPassword || !confirmPassword) {
      setError("Veuillez remplir tous les champs.");
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 4) {
      setError("Le mot de passe doit contenir au moins 4 caractères.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${serverUrl}/api/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ token: resetToken, newPassword }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la réinitialisation");
      }

      setSuccess("Mot de passe réinitialisé avec succès ! Vous pouvez maintenant vous connecter.");

      window.history.replaceState({}, document.title, window.location.pathname);
      setResetToken(null);
      setResetUsername(null);
      setMode("login");
    } catch (err) {
      console.error("Reset password error:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de la réinitialisation.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderTitle = () => {
    switch (mode) {
      case "login":
        return (
          <>
            Connectez-vous pour commencer à<br />
            discuter
          </>
        );
      case "register":
        return (
          <>
            Créez votre compte pour<br />
            rejoindre le tchat
          </>
        );
      case "forgot":
        return (
          <>
            Entrez votre email pour<br />
            réinitialiser votre mot de passe
          </>
        );
      case "reset":
        return (
          <>
            Choisissez votre nouveau<br />
            mot de passe
          </>
        );
      case "banned":
        return (
          <>
            🚫 <br />Accès refusé<br />
            Vous êtes banni
          </>
        );
    }
  };

  return (
    <>
      <ClientFingerprint
        debug
        onReady={(fp) => {
          console.log("Fingerprint prêt:", fp);
          // Exemple: envoyer au backend / stocker dans ton context
        }}
      />

      <div className="tchat-page">
        <div className="tchat-cardGlow" />

        <div className="tchat-card">
          <div className="tchat-title">{roomSlug.toUpperCase()}</div>
          <p className="tchat-subtitle">{renderTitle()}</p>

          {/* ✅ MODE BANNED */}
          {mode === "banned" && (
            <div className="tchat-form">
              <div className="tchat-icon-container">
                <span className="tchat-icon">🚫</span>
              </div>

              <div className="login-error" style={{ marginTop: 10 }}>
                {bannedReason || "Accès interdit."}
              </div>

              <p className="tchat-hint" style={{ marginTop: 12 }}>
                Si vous pensez que c’est une erreur, contactez un administrateur.
              </p>

            
            </div>
          )}

          {/* ✅ LOGIN */}
          {mode === "login" && (
            <form className="tchat-form" onSubmit={handleLogin}>
              <label className="tchat-label" htmlFor="username">
                Nom d'utilisateur
              </label>
              <input
                id="username"
                name="username"
                className="tchat-input"
                placeholder="Entrez votre nom"
                autoComplete="username"
              />

              <label className="tchat-label" htmlFor="password">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="tchat-input"
                placeholder="Entrez votre mot de passe"
                autoComplete="current-password"
              />

              <button type="submit" className="tchat-btnPrimary" disabled={isLoading}>
                {isLoading ? "CONNEXION..." : "SE CONNECTER"}
              </button>

              <button type="button" className="tchat-btnSecondary" onClick={() => switchMode("register")}>
                CRÉER UN COMPTE
              </button>

              <button type="button" className="tchat-btnLink" onClick={() => switchMode("forgot")}>
                Mot de passe oublié ?
              </button>

              {error && <div className="login-error">{error}</div>}
              {success && <div className="login-success">{success}</div>}
            </form>
          )}

          {/* ✅ REGISTER */}
          {mode === "register" && (
            <form className="tchat-form" onSubmit={handleRegister}>
              <label className="tchat-label" htmlFor="username">
                Nom d'utilisateur *
              </label>
              <input
                id="username"
                name="username"
                className="tchat-input"
                placeholder="Choisissez un pseudo"
                autoComplete="username"
                required
              />

              <label className="tchat-label" htmlFor="email">
                Email *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="tchat-input"
                placeholder="votre@email.com"
                autoComplete="email"
                required
              />

              <div className="tchat-row">
                <div className="tchat-field">
                  <label className="tchat-label" htmlFor="age">
                    Âge
                  </label>
                  <input id="age" name="age" type="number" min="13" max="120" className="tchat-input" placeholder="25" />
                </div>
                <div className="tchat-field">
                  <label className="tchat-label" htmlFor="gender">
                    Genre
                  </label>
                  <select id="gender" name="gender" className="tchat-input tchat-select">
                    <option value="">Choisir...</option>
                    <option value="homme">Homme</option>
                    <option value="femme">Femme</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
              </div>

              <label className="tchat-label" htmlFor="password">
                Mot de passe *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="tchat-input"
                placeholder="Minimum 4 caractères"
                autoComplete="new-password"
                required
              />

              <label className="tchat-label" htmlFor="confirmPassword">
                Confirmer le mot de passe *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                className="tchat-input"
                placeholder="Retapez votre mot de passe"
                autoComplete="new-password"
                required
              />

              <button type="submit" className="tchat-btnPrimary" disabled={isLoading}>
                {isLoading ? "CRÉATION..." : "CRÉER MON COMPTE"}
              </button>

              <button type="button" className="tchat-btnSecondary" onClick={() => switchMode("login")}>
                J'AI DÉJÀ UN COMPTE
              </button>

              {error && <div className="login-error">{error}</div>}
              {success && <div className="login-success">{success}</div>}
            </form>
          )}

          {/* ✅ FORGOT */}
          {mode === "forgot" && (
            <form className="tchat-form" onSubmit={handleForgotPassword}>
              <div className="tchat-icon-container">
                <span className="tchat-icon">🔐</span>
              </div>

              <label className="tchat-label" htmlFor="email">
                Adresse email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="tchat-input"
                placeholder="votre@email.com"
                autoComplete="email"
                required
              />

              <p className="tchat-hint">Nous vous enverrons un lien pour réinitialiser votre mot de passe.</p>

              <button type="submit" className="tchat-btnPrimary" disabled={isLoading}>
                {isLoading ? "ENVOI..." : "ENVOYER LE LIEN"}
              </button>

              <button type="button" className="tchat-btnSecondary" onClick={() => switchMode("login")}>
                RETOUR À LA CONNEXION
              </button>

              {error && <div className="login-error">{error}</div>}
              {success && <div className="login-success">{success}</div>}
            </form>
          )}

          {/* ✅ RESET */}
          {mode === "reset" && (
            <form className="tchat-form" onSubmit={handleResetPassword}>
              <div className="tchat-icon-container">
                <span className="tchat-icon">🔑</span>
              </div>

              {resetUsername && (
                <p className="tchat-hint" style={{ marginBottom: 16 }}>
                  Réinitialisation pour <strong>{resetUsername}</strong>
                </p>
              )}

              <label className="tchat-label" htmlFor="newPassword">
                Nouveau mot de passe
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                className="tchat-input"
                placeholder="Minimum 4 caractères"
                autoComplete="new-password"
                required
              />

              <label className="tchat-label" htmlFor="confirmPassword">
                Confirmer le mot de passe
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                className="tchat-input"
                placeholder="Retapez votre mot de passe"
                autoComplete="new-password"
                required
              />

              <button type="submit" className="tchat-btnPrimary" disabled={isLoading}>
                {isLoading ? "RÉINITIALISATION..." : "RÉINITIALISER"}
              </button>

              <button type="button" className="tchat-btnSecondary" onClick={() => switchMode("login")}>
                RETOUR À LA CONNEXION
              </button>

              {error && <div className="login-error">{error}</div>}
              {success && <div className="login-success">{success}</div>}
            </form>
          )}
        </div>
      </div>
    </>
  );
}
