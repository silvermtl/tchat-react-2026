import { useEffect, useState, useCallback } from "react";
import { Routes, Route, useParams } from "react-router-dom";

import { ChatProvider, useChat } from "./context/ChatContext";
import { MediasoupProvider, useMediasoupContext } from "./context/MediasoupContext";
import { Header } from "./components/Header";
import { ChatRoom } from "./components/ChatRoom";
import { Sidebar } from "./components/Sidebar";
import { AdminPanel } from "./components/admin/AdminPanel";
import { ToastContainer } from "./components/Toast";
import { useToast } from "./hooks/useToast";
import { useWebcam } from "./hooks/useWebcam";
import { MyWebcamPreview } from "./components/MyWebcamPreview";
import { ScreenSharePreview } from "./components/ScreenSharePreview";

import TchatLogin from "./components/Login";
import TchatLoader from "./components/Loader";

// ✅ Alias pour éviter conflit avec ton wrapper local
import { RoomNotFound } from "./components/RoomNotFound";

import { room_exists } from "./endpoints/room";

// ============================================
// ✅ UI: Chat Not Found (Wrapper page)
// ============================================
function ChatNotFoundPage({ roomSlug }: { roomSlug: string }) {
  return <RoomNotFound title="Salon introuvable" subtitle={`Slug: ${roomSlug}`} showInput={false} />;
}

// ============================================
// ✅ Ton ChatApp (inchangé sauf 1 truc)
// On ENLÈVE la vérif room_exists ici (car elle est faite avant)
// ============================================
function ChatApp() {
  const {
    roomSlug,
    showAdminPanel,
    isLoading,
    isAuthenticated,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    isWebcamActive,
    setIsWebcamActive,
    toggleWebcam,
    currentUser,
  } = useChat();

  console.log("ROOM =", roomSlug);

  const {
    isMediaConnected,
    isMediaJoined,
    mediaError,
    connectMedia,
    joinMediaRoom,
    startProducing,
    stopProducing,
    leaveMediaRoom,
    isScreenSharing,
    screenStream,
    stopScreenShare,
  } = useMediasoupContext();

  const { toasts, removeToast, success, info, error } = useToast();
  const webcam = useWebcam();

  const [showWebcamPreview, setShowWebcamPreview] = useState(false);
  const [showScreenSharePreview, setShowScreenSharePreview] = useState(false);
  const [delayDone, setDelayDone] = useState(false);

  // Auto-connect to MediaSoup when authenticated
  useEffect(() => {
    if (isAuthenticated && currentUser && !isMediaConnected) {
      console.log("🎥 Connecting to Webcam server...");
      connectMedia().catch((err) => {
        console.error("❌ Webcam server connection error:", err);
      });
    }
  }, [isAuthenticated, currentUser, isMediaConnected, connectMedia]);

  // ✅ Auto-join MediaSoup room when connected (sans re-check room_exists)
  useEffect(() => {
    const join = async () => {
      if (!isMediaConnected || !currentUser || isMediaJoined) return;
      joinMediaRoom(roomSlug, String(currentUser.id));
    };

    join().catch(console.error);
  }, [isMediaConnected, currentUser, isMediaJoined, joinMediaRoom, roomSlug]);

  // Sync webcam state with context
  useEffect(() => {
    if (webcam.isActive !== isWebcamActive) {
      setIsWebcamActive(webcam.isActive);
    }
  }, [webcam.isActive, isWebcamActive, setIsWebcamActive]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDelayDone(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileSidebarOpen) {
        setIsMobileSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isMobileSidebarOpen, setIsMobileSidebarOpen]);

  const handleWebcamToggle = useCallback(async () => {
    if (!webcam.isActive) {
      const stream = await webcam.startWebcam();
      if (stream) {
        setShowWebcamPreview(true);
        success("Webcam activée");
        toggleWebcam();

        if (isMediaJoined) {
          console.log("📤 Starting to produce webcam stream to MediaSoup...");
          startProducing(stream)
            .then(() => {
              console.log("✅ Webcam stream is now being produced to MediaSoup");
              info("Votre webcam est visible par les autres");
            })
            .catch((err) => {
              console.error("❌ Error producing webcam stream:", err);
              error("Erreur lors du partage de la webcam");
            });
        } else {
          console.log("⚠️ Not joined to MediaSoup room, webcam is local only");
        }
      } else if (webcam.error) {
        error(webcam.error);
      }
    } else {
      toggleWebcam();

      if (isMediaJoined) {
        console.log("🔇 Stopping webcam production to MediaSoup...");
        stopProducing();
      }

      webcam.stopWebcam();
      setShowWebcamPreview(false);
      info("Webcam désactivée");
    }
  }, [
    webcam,
    toggleWebcam,
    success,
    info,
    error,
    isMediaJoined,
    startProducing,
    stopProducing,
  ]);

  useEffect(() => {
    const handleWebcamRequest = () => {
      handleWebcamToggle();
    };

    window.addEventListener("toggleWebcamRequest", handleWebcamRequest);

    return () => {
      window.removeEventListener("toggleWebcamRequest", handleWebcamRequest);
    };
  }, [handleWebcamToggle]);

  useEffect(() => {
    if (webcam.error) {
      error(webcam.error);
    }
  }, [webcam.error, error]);

  useEffect(() => {
    if (!isAuthenticated && isMediaJoined) {
      stopProducing();
      leaveMediaRoom();
    }
  }, [isAuthenticated, isMediaJoined, stopProducing, leaveMediaRoom]);

  useEffect(() => {
    if (isScreenSharing && screenStream) {
      setShowScreenSharePreview(true);
      info("Partage d'écran démarré");
    } else {
      setShowScreenSharePreview(false);
    }
  }, [isScreenSharing, screenStream, info]);

  // (optionnel) debug mediaError si tu veux :
  // useEffect(() => {
  //   if (mediaError) error(mediaError);
  // }, [mediaError, error]);

  if (isLoading || !delayDone) {
    return <TchatLoader />;
  }

  if (!isAuthenticated) {
    return <TchatLogin />;
  }

  if (showAdminPanel) {
    return (
      <>
        <AdminPanel />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  return (
    <div className="app">
      <Header />

      <div className="main">
        <ChatRoom />
        <Sidebar />
      </div>

      {showWebcamPreview && webcam.isActive && webcam.stream && (
        <MyWebcamPreview
          stream={webcam.stream}
          isActive={webcam.isActive}
          isAudioEnabled={webcam.isAudioEnabled}
          isVideoEnabled={webcam.isVideoEnabled}
          onClose={() => setShowWebcamPreview(false)}
          onToggleAudio={webcam.toggleAudio}
          onToggleVideo={webcam.toggleVideo}
          onStop={() => {
            handleWebcamToggle();
          }}
        />
      )}

      {showScreenSharePreview && isScreenSharing && (
        <ScreenSharePreview
          stream={screenStream}
          isActive={isScreenSharing}
          onClose={() => setShowScreenSharePreview(false)}
          onStop={() => {
            stopScreenShare();
            info("Partage d'écran arrêté");
          }}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

// ============================================
// ✅ Wrapper: vérifie le slug AVANT providers
// ============================================
function AppWithRoom() {
  const { slug } = useParams();
  const roomSlug = (slug ?? "radioxplus-main").trim();

  const [checking, setChecking] = useState(true);
  const [exists, setExists] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setChecking(true);
      setExists(null);

      try {
        const resp = await room_exists(encodeURIComponent(roomSlug));
        console.log("✅ room_exists response:", resp);
        if (cancelled) return;
        setExists(!!resp?.exists);
      } catch (e) {
        if (cancelled) return;
        setExists(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [roomSlug]);

  if (checking) return <TchatLoader />;
  if (exists === false) return <ChatNotFoundPage roomSlug={roomSlug} />;

  return (
    <ChatProvider roomSlug={roomSlug}>
      <MediasoupProvider>
        <ChatApp />
      </MediasoupProvider>
    </ChatProvider>
  );
}

// ============================================
// ✅ Router
// ============================================
function App() {
  return (
    <Routes>
      <Route path="/room/:slug" element={<AppWithRoom />} />
      <Route path="*" element={<AppWithRoom />} />
    </Routes>
  );
}

export default App;
