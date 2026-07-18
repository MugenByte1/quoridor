import { PLAYER_COLORS, PLAYER_LABELS } from "./Board";

export default function GameOver({ state, mySlot, onRematch }) {
  const winner = state.winner;
  const winnerPlayer = state.players[winner];
  const iWon = winner === mySlot;
  const isElimination = state.lastAction?.type === "eliminate";
  
  const me = mySlot !== null ? state.players[mySlot] : null;
  const rematchRequested = me?.rematchRequested;

  return (
    <div className="game-over">
      <div className="game-over__badge" style={{ "--piece-color": PLAYER_COLORS[winner] }} />
      <h2 className="game-over__title">{iWon ? "بردی! 🎉" : `${winnerPlayer?.name || PLAYER_LABELS[winner]} برنده شد`}</h2>
      <p className="game-over__subtitle">
        {isElimination
          ? (iWon ? "حریف به خاطر زمان حذف شد!" : "تایم اوت شدی و باختی.")
          : (iWon ? "مسیرت رو تا آخر خط باز نگه داشتی." : "دفعه‌ی بعد دیوارهات رو بهتر بچین.")}
      </p>
      
      {rematchRequested ? (
        <button className="btn btn--primary" disabled style={{ opacity: 0.6 }}>
          منتظر حریف...
        </button>
      ) : (
        <button className="btn btn--primary" onClick={onRematch}>
          بازی دوباره
        </button>
      )}
    </div>
  );
}
