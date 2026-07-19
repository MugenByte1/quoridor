import { useEffect, useMemo, useRef, useState } from "react";
import {
  createInitialState,
  applyMove,
  applyWall,
  canPlaceWall,
  getModeConfig,
} from "./gameLogic";
import { 
  initTelegramApp, getStartParam, getRawInitData, getTelegramUser, shareInviteLink, hapticFeedback,
  enableClosingConfirmation, disableClosingConfirmation, showBackButton, hideBackButton
} from "./telegram";
import { GameSocket } from "./socket";
import { API_BASE_URL, WS_BASE_URL, IS_BACKEND_CONFIGURED } from "./config";
import Board, { PLAYER_LABELS } from "./components/Board";
import Lobby from "./components/Lobby";
import GameOver from "./components/GameOver";
import "./App.css";

// "screen" های ممکن: mode-select | lobby | playing | finished
export default function App() {
  const [screen, setScreen] = useState("mode-select");
  const [mode, setMode] = useState("2p");
  const [state, setState] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [mySlot, setMySlot] = useState(null);
  const [actionMode, setActionMode] = useState("move"); // move | wall
  const [wallOrient, setWallOrient] = useState("h");
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [errorMsg, setErrorMsg] = useState(null);

  const socketRef = useRef(null);
  const user = useMemo(() => getTelegramUser(), []);

  useEffect(() => {
    initTelegramApp();
    const startParam = getStartParam();
    if (startParam) {
      // آمده از لینک بات با room_id مشخص -> مستقیم برو سراغ اتصال
      setRoomId(startParam);
      if (IS_BACKEND_CONFIGURED) {
        connectToBackend(startParam);
      } else {
        // بدون بک‌اند: نمی‌دونیم mode چیه، پیش‌فرض ۲ نفره برای تست محلی
        startLocalHotseat("2p", startParam);
      }
    }
    // اگر startParam نبود، در صفحه‌ی انتخاب حالت می‌مانیم (mode-select)

    return () => socketRef.current?.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (screen === "playing") {
      enableClosingConfirmation();
      hideBackButton();
    } else if (screen === "finished") {
      disableClosingConfirmation();
      
      const handleBack = () => {
        socketRef.current?.disconnect();
        setScreen("mode-select");
        setState(null);
        setRoomId(null);
        setMySlot(null);
      };
      
      showBackButton(handleBack);
      return () => hideBackButton(handleBack);
    } else {
      disableClosingConfirmation();
      hideBackButton();
    }
  }, [screen]);

  function connectToBackend(rid) {
    setConnectionStatus("connecting");
    const socket = new GameSocket({
      wsBaseUrl: WS_BASE_URL,
      roomId: rid,
      initData: getRawInitData(),
      onOpen: () => setConnectionStatus("connected"),
      onClose: () => setConnectionStatus("disconnected"),
      onError: (msg) => setErrorMsg(msg),
      onState: (newState) => {
        setState(newState);
        const meIdx = newState.players.findIndex((p) => String(p.telegramId) === String(user.id));
        if (meIdx >= 0) setMySlot(meIdx);
        setScreen(newState.status === "finished" ? "finished" : newState.status === "playing" ? "playing" : "lobby");
      },
    });
    socket.connect();
    socketRef.current = socket;
  }

  // --- حالت تست محلی (Hotseat) وقتی هنوز بک‌اند وصل نیست --------------------
  function startLocalHotseat(selectedMode, rid) {
    const fresh = createInitialState(selectedMode);
    fresh.status = "playing";
    fresh.players = fresh.players.map((p, i) => ({
      ...p,
      connected: true,
      name: i === 0 ? user.name || "بازیکن ۱" : `${PLAYER_LABELS[i]} (لوکال)`,
      telegramId: i === 0 ? user.id : null,
    }));
    setMode(selectedMode);
    setState(fresh);
    setRoomId(rid || `local-${Math.random().toString(36).slice(2, 8)}`);
    setMySlot(null); // در حالت لوکال، کنترل هر نوبت با همون بازیکنه (mySlot = state.turn)
    setScreen("playing");
  }

  function handleCreateLocalGame(selectedMode) {
    startLocalHotseat(selectedMode, null);
  }

  // --- اکشن‌های بازی ----------------------------------------------------------
  const effectiveMySlot = IS_BACKEND_CONFIGURED ? mySlot : state?.turn ?? null;
  const isMyTurn = state ? state.turn === effectiveMySlot : false;

  function handleMove(target) {
    if (!state) return;
    hapticFeedback("light");
    if (IS_BACKEND_CONFIGURED) {
      socketRef.current?.sendMove(target);
    } else {
      try {
        const next = applyMove(state, state.turn, target);
        setState(next);
        if (next.status === "finished") setScreen("finished");
      } catch (e) {
        setErrorMsg(e.message);
      }
    }
  }

  function handleWall(wall) {
    if (!state) return;
    const check = canPlaceWall(state, wall);
    if (!check.ok) {
      setErrorMsg(check.reason);
      return;
    }
    hapticFeedback("medium");
    if (IS_BACKEND_CONFIGURED) {
      socketRef.current?.sendWall(wall);
    } else {
      try {
        const next = applyWall(state, state.turn, wall);
        setState(next);
      } catch (e) {
        setErrorMsg(e.message);
      }
    }
  }

  function handleShare() {
    const url = `https://t.me/share/url?startapp=${roomId}`; // در عمل باید لینک واقعی Mini App جایگزین شود
    shareInviteLink(url, "بیا کوریدور بازی کنیم! 🎮");
  }

  function handleRematch() {
    if (IS_BACKEND_CONFIGURED) {
      socketRef.current?.sendRematch();
      return;
    }
    startLocalHotseat(mode, null);
  }

  // --- رندر صفحات --------------------------------------------------------
  if (screen === "mode-select") {
    return (
      <div className="app-shell">
        <ModeSelect onSelect={handleCreateLocalGame} />
      </div>
    );
  }

  if (!state) {
    return (
      <div className="app-shell">
        <p className="loading-text">در حال بارگذاری...</p>
      </div>
    );
  }

  if (screen === "lobby") {
    return (
      <div className="app-shell">
        <Lobby state={state} roomId={roomId} connectionStatus={connectionStatus} onShare={handleShare} />
      </div>
    );
  }

  if (screen === "finished") {
    return (
      <div className="app-shell">
        <GameOver state={state} mySlot={effectiveMySlot} onRematch={handleRematch} />
      </div>
    );
  }

  const cfg = getModeConfig(state.mode);
  const myPlayer = effectiveMySlot !== null ? state.players[effectiveMySlot] : null;

  return (
    <div className="app-shell">
      {state.status === "playing" && (
        <header className="topbar">
          <TurnTimer turnStartTime={state.turnStartTime} />
        </header>
      )}

      <Board
        state={state}
        mySlot={effectiveMySlot}
        isMyTurn={isMyTurn}
        actionMode={actionMode}
        wallOrient={wallOrient}
        onMove={handleMove}
        onWall={handleWall}
      />

      <footer className="toolbar">
        <div className="toolbar__group">
          <button
            className={`btn btn--toggle${actionMode === "move" ? " btn--active" : ""}`}
            onClick={() => setActionMode("move")}
          >
            حرکت مهره
          </button>
          
          <button
            className={`btn btn--toggle${actionMode === "wall" ? " btn--active" : ""}`}
            onClick={() => {
              if (actionMode !== "wall") {
                setActionMode("wall");
              } else {
                setWallOrient(w => w === "h" ? "v" : "h");
              }
            }}
          >
            {actionMode === "wall"
              ? (wallOrient === "h" ? "▬ دیوار (افقی) 🔄" : "┃ دیوار (عمودی) 🔄")
              : "گذاشتن دیوار"}
          </button>
        </div>
      </footer>

      {errorMsg && (
        <div className="toast" onAnimationEnd={() => setErrorMsg(null)}>
          {errorMsg}
        </div>
      )}

      {!IS_BACKEND_CONFIGURED && <div className="local-badge">حالت تست محلی (بدون بک‌اند)</div>}
    </div>
  );
}

function ModeSelect({ onSelect }) {
  return (
    <div className="mode-select">
      <h1 className="mode-select__title">کوریدور</h1>
      <p className="mode-select__subtitle">یک بازی، یک هدف: زودتر از بقیه به آن‌طرف تخته برس.</p>
      <div className="mode-select__options">
        <button className="mode-card" onClick={() => onSelect("2p")}>
          <span className="mode-card__count">۲</span>
          <span className="mode-card__label">نفره</span>
        </button>
        <button className="mode-card" onClick={() => onSelect("4p")}>
          <span className="mode-card__count">۴</span>
          <span className="mode-card__label">نفره</span>
        </button>
      </div>
      <p className="mode-select__hint">
        برای بازی واقعی با دوستان، این Mini App باید از طریق دکمه‌ی بات با یک room_id باز شود.
        بدون آن، در حالت تست محلی (روی همین دستگاه) اجرا می‌شود.
      </p>
    </div>
  );
}

function TurnTimer({ turnStartTime }) {
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    if (!turnStartTime) return;
    
    // Initial calculation to prevent 1-second lag
    const calc = () => Math.max(60 - Math.floor((Date.now() - turnStartTime) / 1000), 0);
    setTimeLeft(calc());
    
    const interval = setInterval(() => {
      setTimeLeft(calc());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [turnStartTime]);

  return (
    <div style={{ color: timeLeft <= 10 ? "var(--danger)" : "inherit", fontWeight: "bold" }}>
      ⏳ {timeLeft}s
    </div>
  );
}
