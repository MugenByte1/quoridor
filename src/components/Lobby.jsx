import { getModeConfig } from "../gameLogic";
import { PLAYER_COLORS, PLAYER_LABELS } from "./Board";

export default function Lobby({ state, roomId, inviteUrl, onShare, connectionStatus }) {
  const cfg = getModeConfig(state.mode);
  const slots = Array.from({ length: cfg.maxPlayers });

  return (
    <div className="lobby">
      <h2 className="lobby__title">در انتظار بازیکن‌ها</h2>
      <p className="lobby__subtitle">
        {state.players.filter((p) => p.connected).length} از {cfg.maxPlayers} نفر آماده‌اند
      </p>

      <div className="lobby__slots">
        {slots.map((_, i) => {
          const p = state.players[i];
          const filled = p && p.connected;
          return (
            <div key={i} className={`lobby-slot${filled ? " lobby-slot--filled" : ""}`}>
              <span
                className="lobby-slot__dot"
                style={{ "--piece-color": PLAYER_COLORS[i] }}
              />
              <span className="lobby-slot__name">{filled ? p.name : `منتظر ${PLAYER_LABELS[i]}...`}</span>
            </div>
          );
        })}
      </div>

      <button className="btn btn--primary" onClick={onShare}>
        🤝 دعوت دوست
      </button>

      <p className="lobby__hint">
        {connectionStatus === "connected"
          ? "اتصال برقرار است — به‌محض کامل شدن نفرات، بازی شروع می‌شود."
          : connectionStatus === "connecting"
            ? "در حال اتصال..."
            : "اتصال قطع شد، تلاش مجدد..."}
      </p>

      {roomId && <p className="lobby__room-id">شناسه‌ی اتاق: {roomId}</p>}
    </div>
  );
}
