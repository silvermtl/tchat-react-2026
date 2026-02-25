import React, { useMemo, useRef, useState ,useEffect } from "react";
import { useChat } from "../context/ChatContext";
import { EmojiPicker } from "./EmojiPicker";
import { GifPicker } from "./GifPicker";
import { ImageUploader } from "./ImageUploader";
import { VoiceRecorder } from "./VoiceRecorder";

type UserLike = {
  id: string | number;
  username: string;
  online?: number | boolean;
};

export function MessageInput() {
  const [message, setMessage] = useState("");
  const [toUser, setToUser] = useState<UserLike | null>(null);

  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const mentionRef = useRef<HTMLDivElement | null>(null);

  const { addMessage, startTyping, users, currentUser } = useChat() as {
    addMessage: (payload: any) => void;
    startTyping: () => void;
    users: UserLike[];
    currentUser: UserLike | null;
  };

  const filteredUsers = useMemo(() => {
    const q = mentionQuery.trim().toLowerCase();
    const list = Array.isArray(users) ? users : [];

    const meId = currentUser ? String(currentUser.id) : null;

    // ✅ ne pas m'afficher moi-même dans la liste
    const withoutMe = meId ? list.filter(u => String(u.id) !== meId) : list;

    if (!q) return withoutMe.slice(0, 8);
    return withoutMe
      .filter(u => (u.username || "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [users, mentionQuery, currentUser]);

  const closeMention = () => {
    setMentionOpen(false);
    setMentionQuery("");
    setActiveIndex(0);
  };

  const selectUser = (u: UserLike) => {
    setToUser(u);

    // Remplace le token @... à la fin par @username + espace
    setMessage(prev => prev.replace(/@[^@\s]*$/, `@${u.username} `));

    closeMention();
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const cancelPrivate = () => {
    setToUser(null);
    closeMention();
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if (!text) return;

    addMessage({
      type: "text",
      text,
      toUserId: toUser ? String(toUser.id) : null,
      toUsername: toUser ? toUser.username : null,
    });

    setMessage("");
    setToUser(null);
    closeMention();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!mentionOpen) return;

      if (
        mentionRef.current &&
        !mentionRef.current.contains(event.target as Node)
      ) {
        closeMention();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mentionOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);
    startTyping();

    // Détecte mention à la fin
    const m = value.match(/(^|\s)@([^\s@]*)$/);
    if (m) {
      setMentionOpen(true);
      setMentionQuery(m[2] || "");
      setActiveIndex(0);
    } else {
      closeMention();
    }

    // Si l’utilisateur efface les @ et qu'on était en privé -> on annule
    if (!value.includes("@") && toUser) {
      // option: tu peux commenter si tu veux garder le privé même sans @
      // setToUser(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!mentionOpen || filteredUsers.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, filteredUsers.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectUser(filteredUsers[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeMention();
    }
  };

  const handleEmojiSelect = (emoji: string) => setMessage(prev => prev + emoji);

  const commonPayload = () => ({
    toUserId: toUser ? String(toUser.id) : null,
    toUsername: toUser ? toUser.username : null,
  });

  const handleGifSelect = (gifUrl: string) => {
    addMessage({ type: "gif", url: gifUrl, ...commonPayload() });
  };

  const handleImageSelect = (imageDataUrl: string) => {
    addMessage({ type: "img", dataUrl: imageDataUrl, ...commonPayload() });
  };

  const handleVoiceRecording = (audioBlob: Blob) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Audio = reader.result as string;
      addMessage({ type: "audio", dataUrl: base64Audio, ...commonPayload() });
    };
    reader.readAsDataURL(audioBlob);
  };

  // ✅ styles qui changent en mode privé
  const privateMode = !!toUser;

  return (
    <form
      onSubmit={handleSubmit}
      className="inputbar"
      style={{
        position: "relative",
        overflow: "visible",
        borderRadius: 14,
        padding: 8,
        border: privateMode
          ? "2px solid rgba(0,217,192,0.75)"
          : "1px solid rgba(255,255,255,0.12)",
        boxShadow: privateMode ? "0 0 0 4px rgba(0,217,192,0.12)" : "none",
      }}
    >
      {/* ✅ BANDEAU MODE PRIVÉ ultra visible */}
      {privateMode && (
        <div
          style={{
            position: "absolute",
            top: -30,
            left: 8,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 10px",
            borderRadius: 999,
            background: "rgba(0,217,192,0.16)",
            border: "1px solid rgba(0,217,192,0.35)",
            color: "#00d9c0",
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 0.3,
          }}
        >
          <span aria-hidden>🔒</span>
          MODE PRIVÉ — seul <b>@{toUser!.username}</b> le voit
          <button
            type="button"
            onClick={cancelPrivate}
            style={{
              marginLeft: 6,
              cursor: "pointer",
              fontWeight: 900,
              border: "none",
              background: "transparent",
              color: "#00d9c0",
            }}
            title="Revenir en public"
          >
            ✕
          </button>
        </div>
      )}

      {/* ✅ Ligne input + bouton @ */}
      <div className="input" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          type="button"
          className="iconbtn"
          title="Choisir un destinataire"
          onClick={() => {
            setMentionOpen(true);
            setMentionQuery("");
            setActiveIndex(0);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
          style={{
            padding: "6px 10px",
            borderRadius: 10,
            border: privateMode ? "1px solid rgba(0,217,192,0.35)" : "1px solid rgba(255,255,255,0.12)",
            background: privateMode ? "rgba(0,217,192,0.12)" : "rgba(255,255,255,0.06)",
            color: privateMode ? "#00d9c0" : "white",
            fontWeight: 900,
          }}
        >
          @
        </button>

        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={
            privateMode ? `Message PRIVÉ à @${toUser!.username}…` : "Écrivez votre message… (tape @ pour privé)"
          }
          autoComplete="off"
          style={{
            flex: 1,
            borderRadius: 10,
            padding: "10px 12px",
            outline: "none",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.15)",
            color: "white",
          }}
        />

        <button
          type="submit"
          className="iconbtn send"
          title={privateMode ? `Envoyer en privé à @${toUser!.username}` : "Envoyer"}
          disabled={!message.trim()}
          style={{ opacity: message.trim() ? 1 : 0.5 }}
        >
          {privateMode ? "🔒" : "➤"}
        </button>
      </div>

      {/* ✅ dropdown mention */}
      {mentionOpen && filteredUsers.length > 0 && (
        <div ref={mentionRef}
          style={{
            position: "absolute",
            bottom: "60px",
            left: 10,
            width: 300,
            maxHeight: 260,
            overflow: "auto",
            borderRadius: 14,
            padding: 6,
            background: "rgba(10, 22, 40, 0.98)",
            border: "1px solid rgba(255,255,255,0.12)",
            zIndex: 50,
          }}
        >
          {/* ✅ HEADER AVEC X */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 10px",
              fontSize: 12,
              color: "rgba(255,255,255,0.7)",
              fontWeight: 600,
            }}
          >
            <span>Choisis un destinataire (message privé)</span>

            <button
              type="button"
              onClick={closeMention}
              style={{
                border: "none",
                background: "transparent",
                color: "rgba(255,255,255,0.6)",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 800,
                padding: 2,
              }}
              title="Fermer"
            >
              ✕
            </button>
          </div>

          {filteredUsers.map((u, idx) => (
            <button
              key={String(u.id)}
              type="button"
              onClick={() => selectUser(u)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px 10px",
                borderRadius: 12,
                cursor: "pointer",
                background:
                  idx === activeIndex
                    ? "rgba(0,217,192,0.16)"
                    : "transparent",
                color: "white",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
              onMouseEnter={() => setActiveIndex(idx)}
            >
              <span style={{ fontWeight: 800 }}>@{u.username}</span>
              <span style={{ opacity: 0.7, fontSize: 12 }}>
                {u.online ? "• en ligne" : "• hors ligne"}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
        <EmojiPicker onEmojiSelect={handleEmojiSelect} />
        <GifPicker onGifSelect={handleGifSelect} />
        <ImageUploader onImageSelect={handleImageSelect} />
        <VoiceRecorder onRecordingComplete={handleVoiceRecording} />
      </div>
    </form>
  );
}