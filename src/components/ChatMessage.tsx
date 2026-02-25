import { useState } from "react";
import type { Message } from "../types";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/fr";

dayjs.extend(relativeTime);
dayjs.locale("fr");

interface ChatMessageProps {
  message: Message & { avatar?: string };
  currentUserId: string | number; // ✅ IMPORTANT pour afficher privé "de/à"
}

export function ChatMessage({ message, currentUserId }: ChatMessageProps) {
  const [showCopyButton, setShowCopyButton] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const myId = String(currentUserId);

  // ✅ Récupère infos privé peu importe le format (camelCase / snake_case / content object)
  const toId =
    (message as any).to_user_id ??
    (message as any).toUserId ??
    (message as any)?.content?.toUserId ??
    null;

  const toName =
    (message as any).to_username ??
    (message as any).toUsername ??
    (message as any)?.content?.toUsername ??
    null;

  const fromId = String((message as any).user_id ?? (message as any).userId ?? "");
  const isPrivate = !!toId;
  const iAmSender = fromId === myId;
  const iAmReceiver = String(toId) === myId;

  // ✅ Parse special message formats (SAFE: string | object)
  const parseContent = (content: unknown) => {
    let text: string | undefined;

    if (typeof content === "string") {
      text = content;
    } else if (content && typeof content === "object") {
      const c: any = content;
      if (typeof c.text === "string") text = c.text;
      else if (typeof c.content === "string") text = c.content;
      else if (typeof c.message === "string") text = c.message;
      else if (typeof c.url === "string") text = c.url;
      else if (typeof c.dataUrl === "string") text = c.dataUrl;
      else text = undefined;
    } else {
      text = undefined;
    }

    if (!text) return { text: null, gifUrl: null, imageUrl: null, audioUrl: null };

    const gifMatch = text.match(/\[GIF\](.*?)\[\/GIF\]/);
    const imgMatch = text.match(/\[IMG\](.*?)\[\/IMG\]/);
    const audioMatch = text.match(/\[AUDIO\](.*?)\[\/AUDIO\]/);

    if (gifMatch) return { text: null, gifUrl: gifMatch[1], imageUrl: null, audioUrl: null };
    if (imgMatch) return { text: null, gifUrl: null, imageUrl: imgMatch[1], audioUrl: null };
    if (audioMatch) return { text: null, gifUrl: null, imageUrl: null, audioUrl: audioMatch[1] };

    return { text, gifUrl: null, imageUrl: null, audioUrl: null };
  };

  const parsedContent = parseContent((message as any)?.content);

  const displayText = parsedContent.text;
  const displayGifUrl = parsedContent.gifUrl || (message as any).gifUrl;
  const displayImageUrl = parsedContent.imageUrl || (message as any).imageUrl;
  const displayAudioUrl = parsedContent.audioUrl || (message as any).audioUrl;

  const handleCopy = async () => {
    try {
      const textToCopy = displayText || displayGifUrl || displayImageUrl || "Message vocal";
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const hasMedia = displayGifUrl || displayImageUrl || displayAudioUrl;

  return (
    <div
      className="flex gap-2 sm:gap-3 mb-3 sm:mb-4 group relative transition-transform duration-200 hover:-translate-y-0.5"
      onMouseEnter={() => setShowCopyButton(true)}
      onMouseLeave={() => setShowCopyButton(false)}
    >
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-[#1a3a52] flex items-center justify-center">
        {(message as any).avatar ? (
          <img
            src={(message as any).avatar}
            alt={(message as any).username}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-white text-sm font-bold">
            {(((message as any).username || "?") as string).charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span
            className="font-semibold px-2 py-0.5 rounded text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none"
            style={{
              backgroundColor: (message as any).color ? `${(message as any).color}33` : "#1a3a52",
              color: (message as any).color || "#00d9c0",
            }}
          >
            {(message as any).username}
          </span>

          <span className="text-[#8ba3b8] text-xs">
            {dayjs((message as any).timestamp).fromNow()}
          </span>

          {/* ✅ Badge privé ultra clair */}
          {isPrivate && (
            <span className="text-xs px-2 py-0.5 rounded bg-[#0a1628] text-[#00d9c0] border border-[#00d9c033]">
              🔒 Message privé{" "}
              {iAmSender && toName ? <span>→ @{toName}</span> : null}
              {iAmReceiver ? <span> (à moi)</span> : null}
            </span>
          )}

          {(message as any).isAdmin && (
            <span className="bg-red-600 text-white text-xs px-1.5 py-0.5 rounded flex items-center">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2z" />
              </svg>
            </span>
          )}
        </div>

        <div className="relative inline-block max-w-full sm:max-w-md">
          {/* Text content */}
          {displayText && (
            <div
              className="inline-block px-3 py-2 rounded-lg text-white transition-shadow duration-200 group-hover:shadow-lg text-sm sm:text-base break-words"
              style={{ backgroundColor: (message as any).color || "#1a3a52" }}
            >
              {displayText}
            </div>
          )}

          {/* GIF */}
          {displayGifUrl && (
            <div className="rounded-lg overflow-hidden">
              <img
                src={displayGifUrl}
                alt="GIF"
                className="max-w-full rounded-lg"
                style={{ maxHeight: "150px" }}
              />
            </div>
          )}

          {/* Image */}
          {displayImageUrl && (
            <div className="rounded-lg overflow-hidden relative">
              {!imageLoaded && <div className="w-48 h-32 bg-[#1a3a52] rounded-lg animate-shimmer" />}
              <img
                src={displayImageUrl}
                alt="Image partagée"
                className={`max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity ${
                  imageLoaded ? "block" : "hidden"
                }`}
                style={{ maxHeight: "200px" }}
                onLoad={() => setImageLoaded(true)}
                onClick={() => window.open(displayImageUrl, "_blank")}
              />
            </div>
          )}

          {/* Audio */}
          {displayAudioUrl && (
            <div className="flex items-center gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg" style={{ backgroundColor: (message as any).color || "#1a3a52" }}>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#00d9c0] flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#0a1628]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                {/* biome-ignore lint/a11y/useMediaCaption: user-generated audio content */}
                <audio src={displayAudioUrl} controls className="w-full h-8" style={{ filter: "invert(1) hue-rotate(180deg)" }} />
                {(message as any).audioDuration && (
                  <span className="text-xs text-[#8ba3b8] mt-1 block">
                    Durée: {formatDuration((message as any).audioDuration)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Copy button */}
          {(displayText || hasMedia) && (
            <button
              type="button"
              onClick={handleCopy}
              className={`absolute -right-8 top-1/2 -translate-y-1/2 w-6 h-6 rounded hidden sm:flex items-center justify-center transition-all duration-200 ${
                showCopyButton ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
              } ${
                copied ? "bg-green-500 text-white" : "bg-[#1a3a52] text-[#8ba3b8] hover:text-white hover:bg-[#2a4a62]"
              }`}
              title={copied ? "Copié !" : "Copier le message"}
            >
              {copied ? (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}