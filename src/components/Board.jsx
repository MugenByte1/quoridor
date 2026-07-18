import { useMemo, useState } from "react";
import { BOARD_SIZE, getValidMoves, goalCellsOf } from "../gameLogic";

const CELL = 40;
const GAP = 10;
const SPAN = CELL + GAP;

const PLAYER_COLORS = ["#4f7942", "#8b3a5e", "#2b6e8f", "#b4622a"];
const PLAYER_LABELS = ["شمال", "جنوب", "غرب", "شرق"];

function cellPos(i) {
  return i * SPAN;
}

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

  const boardPixels = BOARD_SIZE * CELL + (BOARD_SIZE - 1) * GAP;

  const handleCellClick = (x, y) => {
    if (actionMode !== "move" || !isMyTurn) return;
    if (!validMoveKeys.has(`${x},${y}`)) return;
    onMove([x, y]);
  };

  const handleWallClick = (x, y, orient) => {
    if (actionMode !== "wall" || !isMyTurn) return;
    onWall({ x, y, orient });
  };

  return (
    <div className="board-wrap">
      <div
        className="board"
        style={{ width: boardPixels, height: boardPixels }}
        onMouseLeave={() => setHoverWall(null)}
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
                style={{ left: cellPos(x), top: cellPos(y), width: CELL, height: CELL }}
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
                ? { left: cellPos(w.x), top: cellPos(w.y) + CELL, width: CELL * 2 + GAP, height: GAP }
                : { left: cellPos(w.x) + CELL, top: cellPos(w.y), width: GAP, height: CELL * 2 + GAP }
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
                  ? { left: cellPos(x), top: cellPos(y) + CELL, width: CELL * 2 + GAP, height: GAP }
                  : { left: cellPos(x) + CELL, top: cellPos(y), width: GAP, height: CELL * 2 + GAP };
              return (
                <div
                  key={`slot-${x}-${y}`}
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
              left: cellPos(p.pos[0]) + CELL / 2,
              top: cellPos(p.pos[1]) + CELL / 2,
              "--piece-color": PLAYER_COLORS[p.slot],
            }}
            title={PLAYER_LABELS[p.slot]}
          />
        ))}
      </div>
    </div>
  );
}

export { PLAYER_COLORS, PLAYER_LABELS };
