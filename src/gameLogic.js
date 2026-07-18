// ============================================================================
// gameLogic.js
// منطق کامل و مستقل بازی کوریدور (Quoridor) — بدون وابستگی به React یا شبکه.
// این فایل هم در Mini App برای رندر/پیش‌نمایش استفاده می‌شود، هم می‌تواند عیناً
// در بک‌اند (Worker) برای اعتبارسنجی نهایی حرکت‌ها بازاستفاده شود.
// ============================================================================

export const BOARD_SIZE = 9;

// --- تنظیمات هر حالت بازی (۲ نفره / ۴ نفره) ---------------------------------
// slot: شماره‌ی بازیکن (ترتیب نوبت)
// start: موقعیت شروع [col, row]
// goal: تابعی که می‌گوید آیا یک خانه، خانه‌ی پیروزی این بازیکن است یا نه
const MODE_CONFIG = {
  "2p": {
    maxPlayers: 2,
    wallsPerPlayer: 10,
    slots: [
      { start: [4, 0], isGoal: (x, y) => y === BOARD_SIZE - 1 }, // بالا -> پایین
      { start: [4, 8], isGoal: (x, y) => y === 0 }, // پایین -> بالا
    ],
  },
  "4p": {
    maxPlayers: 4,
    wallsPerPlayer: 5,
    slots: [
      { start: [4, 0], isGoal: (x, y) => y === BOARD_SIZE - 1 }, // بالا -> پایین
      { start: [4, 8], isGoal: (x, y) => y === 0 }, // پایین -> بالا
      { start: [0, 4], isGoal: (x, y) => x === BOARD_SIZE - 1 }, // چپ -> راست
      { start: [8, 4], isGoal: (x, y) => x === 0 }, // راست -> چپ
    ],
  },
};

export function getModeConfig(mode) {
  const cfg = MODE_CONFIG[mode];
  if (!cfg) throw new Error(`حالت بازی نامعتبر: ${mode}`);
  return cfg;
}

// --- ساخت وضعیت اولیه‌ی بازی -------------------------------------------------
export function createInitialState(mode) {
  const cfg = getModeConfig(mode);
  return {
    mode,
    status: "waiting", // waiting | playing | finished
    players: cfg.slots.map((s, slot) => ({
      slot,
      telegramId: null,
      name: null,
      pos: [...s.start],
      wallsLeft: cfg.wallsPerPlayer,
      connected: false,
      eliminated: false,
    })),
    walls: [], // { x, y, orient: 'h' | 'v' }
    turn: 0, // ایندکس بازیکنی که نوبتشه
    winner: null,
    lastAction: null,
    turnStartTime: Date.now(), // زمان شروع نوبت
  };
}

// --- کمکی‌های پایه -----------------------------------------------------------
function inBounds(x, y) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

function sameCell(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}

function playerAt(state, x, y) {
  return state.players.find((p) => p.pos[0] === x && p.pos[1] === y) || null;
}

const DIRS = [
  { dx: 0, dy: -1, name: "up" },
  { dx: 0, dy: 1, name: "down" },
  { dx: -1, dy: 0, name: "left" },
  { dx: 1, dy: 0, name: "right" },
];

// آیا دیواری بین دو خانه‌ی همسایه (from -> to) حرکت را مسدود کرده؟
export function wallBlocksMove(walls, from, to) {
  const [x1, y1] = from;
  const [x2, y2] = to;

  if (y1 === y2) {
    // حرکت افقی (چپ/راست) بین ستون a و a+1 در ردیف y1
    const a = Math.min(x1, x2);
    return walls.some((w) => w.orient === "v" && w.x === a && (w.y === y1 || w.y === y1 - 1));
  }
  if (x1 === x2) {
    // حرکت عمودی (بالا/پایین) بین ردیف b و b+1 در ستون x1
    const b = Math.min(y1, y2);
    return walls.some((w) => w.orient === "h" && w.y === b && (w.x === x1 || w.x === x1 - 1));
  }
  return false; // فقط حرکات هم‌ردیف/هم‌ستون معنا دارند
}

// --- محاسبه‌ی مقصدهای مجاز حرکت مهره (شامل پرش و مورب) ----------------------
export function getValidMoves(state, playerIdx) {
  const player = state.players[playerIdx];
  const [x, y] = player.pos;
  const moves = [];

  for (const { dx, dy } of DIRS) {
    const nx = x + dx;
    const ny = y + dy;
    if (!inBounds(nx, ny)) continue;
    if (wallBlocksMove(state.walls, [x, y], [nx, ny])) continue;

    const occupant = playerAt(state, nx, ny);
    if (!occupant) {
      moves.push([nx, ny]);
      continue;
    }

    // خانه‌ی مقابل، اشغال شده — بررسی پرش مستقیم
    const jx = nx + dx;
    const jy = ny + dy;
    const straightJumpBlocked =
      !inBounds(jx, jy) ||
      wallBlocksMove(state.walls, [nx, ny], [jx, jy]) ||
      playerAt(state, jx, jy);

    if (!straightJumpBlocked) {
      moves.push([jx, jy]);
      continue;
    }

    // پرش مستقیم ممکن نیست -> بررسی حرکت مورب (چپ/راست نسبت به جهت حرکت)
    const perpendiculars = dx === 0 ? [{ dx: -1, dy: 0 }, { dx: 1, dy: 0 }] : [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }];

    for (const p of perpendiculars) {
      const dxx = nx + p.dx;
      const dyy = ny + p.dy;
      if (!inBounds(dxx, dyy)) continue;
      if (wallBlocksMove(state.walls, [nx, ny], [dxx, dyy])) continue;
      if (playerAt(state, dxx, dyy)) continue;
      moves.push([dxx, dyy]);
    }
  }

  return moves;
}

export function isValidMove(state, playerIdx, target) {
  return getValidMoves(state, playerIdx).some((m) => sameCell(m, target));
}

// --- بررسی مجاز بودن گذاشتن دیوار -------------------------------------------
function wallsConflict(existing, candidate) {
  for (const w of existing) {
    if (w.orient === candidate.orient) {
      if (w.orient === "h" && w.y === candidate.y && Math.abs(w.x - candidate.x) < 2) return true;
      if (w.orient === "v" && w.x === candidate.x && Math.abs(w.y - candidate.y) < 2) return true;
    } else if (w.x === candidate.x && w.y === candidate.y) {
      return true; // تقاطع عمود بر هم دقیقاً روی یک نقطه
    }
  }
  return false;
}

// BFS: آیا بازیکن مسیری به یکی از خانه‌های هدف خودش دارد؟
export function hasPathToGoal(state, playerIdx) {
  const cfg = getModeConfig(state.mode);
  const isGoal = cfg.slots[playerIdx].isGoal;
  const start = state.players[playerIdx].pos;

  const visited = new Set([`${start[0]},${start[1]}`]);
  const queue = [start];

  while (queue.length) {
    const [x, y] = queue.shift();
    if (isGoal(x, y)) return true;

    for (const { dx, dy } of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (!inBounds(nx, ny)) continue;
      if (wallBlocksMove(state.walls, [x, y], [nx, ny])) continue;
      const key = `${nx},${ny}`;
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push([nx, ny]);
    }
  }
  return false;
}

export function canPlaceWall(state, wall) {
  if (wall.x < 0 || wall.x > BOARD_SIZE - 2 || wall.y < 0 || wall.y > BOARD_SIZE - 2) {
    return { ok: false, reason: "خارج از محدوده‌ی تخته" };
  }
  const player = state.players[state.turn];
  if (player.wallsLeft <= 0) {
    return { ok: false, reason: "دیواری باقی نمانده" };
  }
  if (wallsConflict(state.walls, wall)) {
    return { ok: false, reason: "با دیوار دیگری تداخل دارد" };
  }

  // قانون طلایی: بعد از گذاشتن، همه باید همچنان مسیر داشته باشند
  const nextWalls = [...state.walls, wall];
  const testState = { ...state, walls: nextWalls };
  for (let i = 0; i < state.players.length; i++) {
    if (state.players[i].eliminated) continue;
    if (!hasPathToGoal(testState, i)) {
      return { ok: false, reason: "مسیر یکی از بازیکنان را کاملاً می‌بندد" };
    }
  }
  return { ok: true };
}

// --- اعمال یک اکشن (حرکت یا دیوار) و برگرداندن وضعیت جدید --------------------
export function applyMove(state, playerIdx, target) {
  if (state.status !== "playing") throw new Error("بازی در حال اجرا نیست");
  if (playerIdx !== state.turn) throw new Error("نوبت این بازیکن نیست");
  if (!isValidMove(state, playerIdx, target)) throw new Error("حرکت غیرمجاز");

  const cfg = getModeConfig(state.mode);
  const players = state.players.map((p, i) => (i === playerIdx ? { ...p, pos: [...target] } : p));

  const isGoal = cfg.slots[playerIdx].isGoal;
  const winner = isGoal(target[0], target[1]) ? playerIdx : null;

  return {
    ...state,
    players,
    turn: winner === null ? nextTurn({ ...state, players }) : state.turn,
    status: winner === null ? "playing" : "finished",
    winner,
    lastAction: { type: "move", playerIdx, target },
    turnStartTime: Date.now(),
  };
}

export function applyWall(state, playerIdx, wall) {
  if (state.status !== "playing") throw new Error("بازی در حال اجرا نیست");
  if (playerIdx !== state.turn) throw new Error("نوبت این بازیکن نیست");

  const check = canPlaceWall(state, wall);
  if (!check.ok) throw new Error(check.reason);

  const players = state.players.map((p, i) =>
    i === playerIdx ? { ...p, wallsLeft: p.wallsLeft - 1 } : p
  );

  return {
    ...state,
    players,
    walls: [...state.walls, wall],
    turn: nextTurn({ ...state, players }),
    lastAction: { type: "wall", playerIdx, wall },
    turnStartTime: Date.now(),
  };
}

function nextTurn(state) {
  let next = (state.turn + 1) % state.players.length;
  let loopCount = 0;
  while (state.players[next].eliminated && loopCount < state.players.length) {
    next = (next + 1) % state.players.length;
    loopCount++;
  }
  return next;
}

export function eliminatePlayer(state, playerIdx) {
  if (state.status !== "playing") return state;
  if (state.players[playerIdx].eliminated) return state;

  const players = state.players.map((p, i) => i === playerIdx ? { ...p, eliminated: true } : p);
  const activePlayers = players.filter(p => !p.eliminated);

  if (activePlayers.length <= 1) {
    const winner = activePlayers.length === 1 ? activePlayers[0].slot : null;
    return {
      ...state,
      players,
      status: "finished",
      winner,
      lastAction: { type: "eliminate", playerIdx },
    };
  }

  const nextState = { ...state, players };
  if (state.turn === playerIdx) {
    nextState.turn = nextTurn(nextState);
  }
  nextState.lastAction = { type: "eliminate", playerIdx };
  nextState.turnStartTime = Date.now();
  return nextState;
}

// --- کمکی برای UI: مسیر خانه‌های هدف یک بازیکن (برای رنگ‌آمیزی لبه‌ی تخته) ---
export function goalCellsOf(mode, slot) {
  const cfg = getModeConfig(mode);
  const isGoal = cfg.slots[slot].isGoal;
  const cells = [];
  for (let x = 0; x < BOARD_SIZE; x++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      if (isGoal(x, y)) cells.push([x, y]);
    }
  }
  return cells;
}
