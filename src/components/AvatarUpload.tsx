import React, { useEffect, useMemo, useRef, useState } from "react";
import { DraggableBox } from "./DraggableBox";
import type { User } from "../types";

interface AvatarUploadModalProps {
  user: User;
  token: string; // JWT pour Authorization Bearer
  onClose: () => void;
  onUploaded?: (updatedUser: User) => void; // callback quand upload terminé
  initialPosition?: { x: number; y: number };
  apiBaseUrl?: string; // optionnel: ex "" ou "https://vps-..."; default = ""
}

type UploadState = "idle" | "ready" | "uploading" | "success" | "error";

type AvatarStyle = "avataaars" | "lorelei" | "micah" | "open-peeps";

export function AvatarUploadModal({
  user,
  token,
  onClose,
  onUploaded,
  initialPosition,
  apiBaseUrl = import.meta.env.MODE === "development"
  ? import.meta.env.VITE_API_URL_DEV
  : import.meta.env.VITE_API_URL_PROD
  
}: AvatarUploadModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // ✅ Tabs
  const [tab, setTab] = useState<"choose" | "upload">("choose");
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string | null>(null);

  // ✅ Style d'avatars (visages)
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>("avataaars");

  // ✅ normalise base URL (enlève le slash final si tu en mets un)
  const baseUrl = useMemo(() => {
    return (apiBaseUrl || "").replace(/\/+$/, "");
  }, [apiBaseUrl]);

  // userId helper (support id / idDB)
  const userId = useMemo(() => {
    return String((user as any).id ?? (user as any).idDB ?? user.id);
  }, [user]);

  // Créer / libérer l’URL de preview
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const maxSizeMB = 5;
  const accepted = useMemo(
    () => ["image/png", "image/jpeg", "image/webp", "image/gif"],
    []
  );

  const pickFile = () => inputRef.current?.click();

  const reset = () => {
    abortRef.current?.abort();
    abortRef.current = null;

    setFile(null);
    setPreviewUrl(null);
    setSelectedAvatarUrl(null);

    setState("idle");
    setProgress(0);
    setError(null);
  };

  const validateFile = (f: File) => {
    if (!accepted.includes(f.type)) {
      return `Format non supporté (${f.type}). Choisis PNG/JPG/WEBP/GIF.`;
    }
    const sizeMB = f.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      return `Fichier trop gros (${sizeMB.toFixed(1)} MB). Max ${maxSizeMB} MB.`;
    }
    return null;
  };

  const handleSelected = (f: File | null) => {
    setError(null);
    if (!f) return;
    const msg = validateFile(f);
    if (msg) {
      setError(msg);
      setState("error");
      return;
    }
    setFile(f);
    setState("ready");
  };

  const onInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0] ?? null;
    handleSelected(f);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer.files?.[0] ?? null;
    handleSelected(f);
  };

  const onDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // ✅ Génère une liste d’avatars (visages) - DiceBear
  const avatarChoices = useMemo(() => {
    const baseSeed = String(user.username || userId || "user");
    return Array.from({ length: 24 }, (_, i) => {
      const seed = `${baseSeed}-${i}`;
      return {
        seed,
        url: `https://api.dicebear.com/7.x/${avatarStyle}/png?seed=${encodeURIComponent(
          seed
        )}&size=160`,
      };
    });
  }, [user.username, userId, avatarStyle]);

  useEffect(() => {
  if (tab !== "choose") return;

  // Précharge les avatars (évite le "vide" au 1er open)
  avatarChoices.forEach(({ url }) => {
    const img = new Image();
    img.src = url;
  });
}, [tab, avatarChoices]);

  // ✅ Sauvegarder un avatar choisi (URL) - nécessite backend qui accepte avatarUrl
  const saveChosenAvatar = async () => {
    if (!selectedAvatarUrl) return;

    setState("uploading");
    setProgress(0);
    setError(null);

    try {
      const resp = await fetch(`${baseUrl}/api/users/update-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          avatarUrl: selectedAvatarUrl,
        }),
      });

      const data = await resp.json().catch(() => null);

      if (!resp.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Erreur avatar (HTTP ${resp.status})`;
        throw new Error(msg);
      }

      setState("success");
      setProgress(100);

      const maybeUser = data?.user ? data.user : data;
      if (maybeUser) onUploaded?.(maybeUser);
    } catch (e: any) {
      setState("error");
      setError(e?.message || "Erreur inconnue.");
    } finally {
      abortRef.current = null;
    }
  };

  // ✅ Upload fichier (ton code original)
  const upload = async () => {
    if (!file) return;

    setState("uploading");
    setProgress(0);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const form = new FormData();
      form.append("avatar", file);

      // ✅ IMPORTANT : ton backend attend userId dans req.body
      form.append("userId", userId);

      const updatedUser: User = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open("POST", `${baseUrl}/api/users/update-profile`, true);

        xhr.responseType = "json";
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            const pct = Math.round((ev.loaded / ev.total) * 100);
            setProgress(pct);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response);
          } else {
            const msg =
              (xhr.response && (xhr.response.error || xhr.response.message)) ||
              `Erreur upload (HTTP ${xhr.status})`;
            reject(new Error(msg));
          }
        };

        xhr.onerror = () => reject(new Error("Erreur réseau pendant l’upload."));
        xhr.onabort = () => reject(new Error("Upload annulé."));

        controller.signal.addEventListener("abort", () => xhr.abort());

        xhr.send(form);
      });

      setState("success");
      setProgress(100);

      // ✅ si ton backend renvoie { message, user }
      const maybeUser = (updatedUser as any)?.user
        ? (updatedUser as any).user
        : updatedUser;

      onUploaded?.(maybeUser);
    } catch (e: any) {
      setState("error");
      setError(e?.message || "Erreur inconnue.");
    } finally {
      abortRef.current = null;
    }
  };

  const cancelUpload = () => {
    abortRef.current?.abort();
  };

  // UI helpers
  const tabBtn = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "10px 12px",
    borderRadius: 10,
    border: active
      ? "1px solid rgba(0,217,192,.65)"
      : "1px solid rgba(255,255,255,.12)",
    background: active ? "rgba(0,217,192,.12)" : "rgba(0,0,0,.15)",
    color: active ? "white" : "rgba(255,255,255,.75)",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 13,
    letterSpacing: 0.6,
    transition: "all 0.15s",
  });

  const styleChip = (active: boolean): React.CSSProperties => ({
    padding: "8px 10px",
    borderRadius: 999,
    border: active
      ? "1px solid rgba(0,217,192,.65)"
      : "1px solid rgba(255,255,255,.12)",
    background: active ? "rgba(0,217,192,.12)" : "rgba(0,0,0,.15)",
    color: active ? "white" : "rgba(255,255,255,.75)",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 12,
    transition: "all 0.15s",
    whiteSpace: "nowrap",
  });

  return (
    <DraggableBox
      title="Changer l'avatar"
      onClose={onClose}
      initialPosition={initialPosition}
      width={400}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            style={tabBtn(tab === "choose")}
            onClick={() => {
              setTab("choose");
              setError(null);
              setState("idle");
              setFile(null);
              setPreviewUrl(null);
            }}
          >
            Choisir
          </button>
          <button
            type="button"
            style={tabBtn(tab === "upload")}
            onClick={() => {
              setTab("upload");
              setError(null);
              setState("idle");
              setSelectedAvatarUrl(null);
            }}
          >
            Uploader
          </button>
        </div>

        {/* Preview (commun) */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.25)",
              background: "rgba(0,0,0,0.25)",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            {tab === "upload" ? (
              previewUrl ? (
                <img
                  src={previewUrl}
                  alt="preview"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.username}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ fontSize: 22 }}>
                  {(user.username || "?").charAt(0).toUpperCase()}
                </span>
              )
            ) : selectedAvatarUrl ? (
              <img
                src={selectedAvatarUrl}
                alt="selected"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : user.avatar ? (
              <img
                src={user.avatar}
                alt={user.username}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span style={{ fontSize: 22 }}>
                {(user.username || "?").charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, opacity: 0.85 }}>
              <div style={{ fontWeight: 800 }}>
                {tab === "choose" ? "Choisir un avatar (visage)" : "Uploader un fichier"}
              </div>
              <div style={{ opacity: 0.75, marginTop: 4 }}>
                {tab === "choose"
                  ? "Choisis un style, clique un visage, puis “Utiliser cet avatar”."
                  : "PNG / JPG / WEBP / GIF — max 5MB."}
              </div>
            </div>

            {state === "uploading" && (
              <div style={{ marginTop: 10 }}>
                <div
                  style={{
                    height: 8,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.15)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${progress}%`,
                      background: "rgba(0, 200, 255, 0.85)",
                      transition: "width 120ms linear",
                    }}
                  />
                </div>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                  {tab === "choose" ? "Sauvegarde" : "Upload"}: {progress}%
                </div>
              </div>
            )}

            {state === "success" && (
              <div style={{ marginTop: 10, fontSize: 12, color: "#7CFC8A" }}>
                ✅ Avatar mis à jour !
              </div>
            )}

            {state === "error" && error && (
              <div style={{ marginTop: 10, fontSize: 12, color: "#ff8080" }}>
                ❌ {error}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {tab === "choose" ? (
          <>
            {/* Style selector */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                style={styleChip(avatarStyle === "avataaars")}
                onClick={() => {
                  setAvatarStyle("avataaars");
                  setSelectedAvatarUrl(null);
                  setState("idle");
                  setError(null);
                }}
              >
                Avataaars
              </button>
              <button
                type="button"
                style={styleChip(avatarStyle === "lorelei")}
                onClick={() => {
                  setAvatarStyle("lorelei");
                  setSelectedAvatarUrl(null);
                  setState("idle");
                  setError(null);
                }}
              >
                Lorelei
              </button>
              <button
                type="button"
                style={styleChip(avatarStyle === "micah")}
                onClick={() => {
                  setAvatarStyle("micah");
                  setSelectedAvatarUrl(null);
                  setState("idle");
                  setError(null);
                }}
              >
                Micah
              </button>
              <button
                type="button"
                style={styleChip(avatarStyle === "open-peeps")}
                onClick={() => {
                  setAvatarStyle("open-peeps");
                  setSelectedAvatarUrl(null);
                  setState("idle");
                  setError(null);
                }}
              >
                Open Peeps
              </button>
            </div>

            {/* Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: 8,
                padding: 10,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.10)",
                background: "rgba(0,0,0,.15)",
                maxHeight: 240,
                overflowY: "auto",
              }}
            >
              {avatarChoices.map((a) => {
                const active = selectedAvatarUrl === a.url;
                return (
                  <button
                    key={a.seed}
                    type="button"
                    onClick={() => {
                      setSelectedAvatarUrl(a.url);
                      setState("idle");
                      setError(null);
                      setProgress(0);
                    }}
                    title="Choisir cet avatar"
                    style={{
                      width: "100%",
                      aspectRatio: "1 / 1",
                      borderRadius: 12,
                      border: active
                        ? "2px solid rgba(0,217,192,.9)"
                        : "1px solid rgba(255,255,255,.10)",
                      background: active
                        ? "rgba(0,217,192,.12)"
                        : "rgba(255,255,255,.03)",
                      overflow: "hidden",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    <img
                      src={a.url}
                      alt="avatar"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      loading="eager"
                      decoding="async"
                    />

                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={reset}
                disabled={state === "uploading"}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.25)",
                  background: "transparent",
                  color: "white",
                  cursor: state === "uploading" ? "not-allowed" : "pointer",
                  opacity: state === "uploading" ? 0.6 : 1,
                }}
              >
                Réinitialiser
              </button>

              <button
                type="button"
                onClick={saveChosenAvatar}
                disabled={!selectedAvatarUrl || state === "success" || state === "uploading"}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(0,217,192,.55)",
                  background:
                    !selectedAvatarUrl || state === "success" || state === "uploading"
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,217,192,.18)",
                  color: "white",
                  cursor:
                    !selectedAvatarUrl || state === "success" || state === "uploading"
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    !selectedAvatarUrl || state === "success" || state === "uploading" ? 0.6 : 1,
                  fontWeight: 700,
                }}
              >
                Utiliser cet avatar
              </button>
            </div>

            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
              ⚠️ Backend requis: accepter <code>avatarUrl</code> dans{" "}
              <code>/api/users/update-profile</code> (en plus du FormData).
            </div>
          </>
        ) : (
          <>
            {/* Upload area */}
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              style={{
                border: "1px dashed rgba(255,255,255,0.35)",
                borderRadius: 10,
                padding: 12,
                textAlign: "center",
                cursor: "pointer",
                userSelect: "none",
              }}
              onClick={pickFile}
              title="Clique ou glisse-dépose une image"
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={onInputChange}
                style={{ display: "none" }}
              />

              <div style={{ fontSize: 14, opacity: 0.9 }}>
                Clique ou glisse-dépose ton avatar ici
              </div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                PNG / JPG / WEBP / GIF — max {maxSizeMB}MB
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={reset}
                disabled={state === "uploading"}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.25)",
                  background: "transparent",
                  color: "white",
                  cursor: state === "uploading" ? "not-allowed" : "pointer",
                  opacity: state === "uploading" ? 0.6 : 1,
                }}
              >
                Réinitialiser
              </button>

              {state === "uploading" ? (
                <button
                  type="button"
                  onClick={cancelUpload}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,120,120,0.5)",
                    background: "rgba(255,120,120,0.15)",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  Annuler
                </button>
              ) : (
                <button
                  type="button"
                  onClick={upload}
                  disabled={!file || state === "success"}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid rgba(0,200,255,0.5)",
                    background:
                      !file || state === "success"
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,200,255,0.2)",
                    color: "white",
                    cursor: !file || state === "success" ? "not-allowed" : "pointer",
                    opacity: !file || state === "success" ? 0.6 : 1,
                    fontWeight: 700,
                  }}
                >
                  Envoyer
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </DraggableBox>
  );
}
