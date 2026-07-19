import { useMemo, useState } from "react";
import { BOARD_SIZE, getValidMoves, goalCellsOf } from "../gameLogic";

const PLAYER_COLORS = ["#4f7942", "#8b3a5e", "#2b6e8f", "#b4622a"];
const PLAYER_LABELS = ["شمال", "جنوب", "غرب", "شرق"];

export default function Board({ state, mySlot, isMyTurn, actionMode, wallOrient, onMove, onWall }) {
  const [hoverWall, setHoverWall] = useState(null); // { x, y, orient }

  const validMoves = useMemo(() => {
    if (!state || mySlot === null || !isMyTurn || actionMode !== "move") return [];
    return getValidMoves(state, mySlot);
  }, [state, mySlot, isMyTurn, actionMode]);

  const validMoveKeys = useMemo(() => new Set(validMoves.map(([x, y]) => `${x},${y}`)), [validMoves]);

  const goalCells = useMemo(() => {
    if (mySlot === null || !state) return new Set();
    return new Set(goalCellsOf(state.mode, mySlot).map(([x, y]) => `${x},${y}`));
  }, [state, mySlot]);

  if (!state) return null;

  const handleCellClick = (x, y) => {
    if (actionMode !== "move" || !isMyTurn) return;
    if (!validMoveKeys.has(`${x},${y}`)) return;
    onMove([x, y]);
  };

  const handleWallClick = (x, y, orient) => {
    if (actionMode !== "wall" || !isMyTurn) return;
    onWall({ x, y, orient });
    setHoverWall(null);
  };

  // --- Touch Logic for Walls ---
  const handleTouchMove = (e) => {
    if (actionMode !== "wall" || !isMyTurn) return;
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (el && el.classList.contains("wall-slot")) {
      const x = parseInt(el.getAttribute("data-x"));
      const y = parseInt(el.getAttribute("data-y"));
      setHoverWall({ x, y, orient: wallOrient });
    } else {
      setHoverWall(null);
    }
  };

  const handleTouchEnd = (e) => {
    if (actionMode !== "wall" || !isMyTurn) return;
    if (hoverWall) {
      onWall(hoverWall);
      setHoverWall(null);
    }
  };

  return (
    <div className="board-wrap">
      {/* HUDs */}
      {state.players.map(p => {
        let hudClass = "";
        if (p.slot === 0) hudClass = "hud--north";
        if (p.slot === 1) hudClass = "hud--south";
        if (p.slot === 2) hudClass = "hud--west";
        if (p.slot === 3) hudClass = "hud--east";
        
        const isActive = state.turn === p.slot;
        
        return (
          <div key={p.slot} className={`hud ${hudClass} ${isActive ? "hud--active" : ""}`}>
            <span className="hud__name">{p.name || PLAYER_LABELS[p.slot]}</span>
            <span className="hud__walls">🧱 {p.wallsLeft}</span>
          </div>
        );
      })}

      <div
        className="board"
        style={{ width: "var(--board-size)", height: "var(--board-size)" }}
        onMouseLeave={() => setHoverWall(null)}
        onTouchStart={handleTouchMove}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* خانه‌ها */}
        {Array.from({ length: BOARD_SIZE }).map((_, y) =>
          Array.from({ length: BOARD_SIZE }).map((_, x) => {
            const key = `${x},${y}`;
            const isGoal = goalCells.has(key);
            const isValidTarget = validMoveKeys.has(key);
            return (
              <div
                key={key}
                className={`cell${isGoal ? " cell--goal" : ""}${isValidTarget ? " cell--target" : ""}`}
                style={{
                  left: `calc(${x} * var(--span-sz))`,
                  top: `calc(${y} * var(--span-sz))`,
                  width: "var(--cell-sz)",
                  height: "var(--cell-sz)",
                }}
                onClick={() => handleCellClick(x, y)}
              >
                {isValidTarget && <span className="cell__dot" />}
              </div>
            );
          })
        )}

        {/* دیوارهای گذاشته‌شده */}
        {state.walls.map((w, i) => (
          <div
            key={i}
            className={`wall wall--${w.orient}`}
            style={
              w.orient === "h"
                ? {
                    left: `calc(${w.x} * var(--span-sz))`,
                    top: `calc(${w.y} * var(--span-sz) + var(--cell-sz))`,
                    width: `calc(var(--cell-sz) * 2 + var(--gap-sz))`,
                    height: "var(--gap-sz)",
                  }
                : {
                    left: `calc(${w.x} * var(--span-sz) + var(--cell-sz))`,
                    top: `calc(${w.y} * var(--span-sz))`,
                    width: "var(--gap-sz)",
                    height: `calc(var(--cell-sz) * 2 + var(--gap-sz))`,
                  }
            }
          />
        ))}

        {/* پیش‌نمایش دیوار در حال هاور (فقط حالت گذاشتن دیوار) */}
        {actionMode === "wall" &&
          isMyTurn &&
          Array.from({ length: BOARD_SIZE - 1 }).map((_, y) =>
            Array.from({ length: BOARD_SIZE - 1 }).map((_, x) => {
              const isHover = hoverWall && hoverWall.x === x && hoverWall.y === y;
              const style =
                wallOrient === "h"
                  ? {
                      left: `calc(${x} * var(--span-sz))`,
                      top: `calc(${y} * var(--span-sz) + var(--cell-sz))`,
                      width: `calc(var(--cell-sz) * 2 + var(--gap-sz))`,
                      height: "var(--gap-sz)",
                    }
                  : {
                      left: `calc(${x} * var(--span-sz) + var(--cell-sz))`,
                      top: `calc(${y} * var(--span-sz))`,
                      width: "var(--gap-sz)",
                      height: `calc(var(--cell-sz) * 2 + var(--gap-sz))`,
                    };
              return (
                <div
                  key={`slot-${x}-${y}`}
                  data-x={x}
                  data-y={y}
                  className={`wall-slot wall-slot--${wallOrient}${isHover ? " wall-slot--hover" : ""}`}
                  style={style}
                  onMouseEnter={() => setHoverWall({ x, y, orient: wallOrient })}
                  onClick={() => handleWallClick(x, y, wallOrient)}
                />
              );
            })
          )}

        {/* مهره‌ها */}
        {state.players.map((p) => (
          <div
            key={p.slot}
            className={`piece${p.slot === mySlot ? " piece--me" : ""}`}
            style={{
              left: `calc(${p.pos[0]} * var(--span-sz) + var(--cell-sz) / 2)`,
              top: `calc(${p.pos[1]} * var(--span-sz) + var(--cell-sz) / 2)`,
              "--piece-color": p.eliminated ? "#888" : PLAYER_COLORS[p.slot],
              opacity: p.eliminated ? 0.3 : 1,
            }}
            title={PLAYER_LABELS[p.slot] + (p.eliminated ? " (حذف شده)" : "")}
          />
        ))}
      </div>
    </div>
  );
}

export { PLAYER_COLORS, PLAYER_LABELS };
