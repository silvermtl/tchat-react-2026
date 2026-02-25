// src/components/ClientFingerprint.tsx
import { useEffect, useState } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { useChat } from "../../context/ChatContext"; 

type Props = {
  onReady?: (fingerprint: string) => void;
  storageKey?: string; // default "client_fingerprint"
  debug?: boolean;
};

export default function ClientFingerprint({
  onReady,
  storageKey = "client_fingerprint",
  debug = false,
}: Props) {
  
  const [error, setError] = useState<string | null>(null);
  const { setFingerPrint ,fingerPrint  } = useChat(); 
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // ✅ si déjà en cache localStorage, on réutilise
        const cached = localStorage.getItem(storageKey);
        if (cached) {
          if (!cancelled) {
            setFingerPrint(cached);
            onReady?.(cached);
          }
          return;
        }

        // ✅ charge FingerprintJS
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        const id = result.visitorId;

        if (debug) console.log("✅ Fingerprint visitorId:", id);

        localStorage.setItem(storageKey, id);

        if (!cancelled) {
          setFingerPrint(id);
          onReady?.(id);
        }
      } catch (e) {
        console.error("Fingerprint error:", e);
        if (!cancelled) setError("Impossible de générer le fingerprint");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [onReady, storageKey, debug]);

  // Ce composant peut être "headless" (rien à afficher)
  // mais je te laisse un mini rendu utile pour debug.
  if (error) return null;

  return (
    <div style={{ display: "none" }}>
      {fingerPrint ? `fp:${fingerPrint}` : "fp:loading"}
    </div>
  );
}
