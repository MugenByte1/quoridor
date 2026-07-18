import {
  createInitialState,
  isValidMove,
  getValidMoves,
  applyMove,
  applyWall,
  canPlaceWall,
  hasPathToGoal,
} from "./src/gameLogic.js";

function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("OK:", msg);
}

// --- تست حالت ۲ نفره ---
let s = createInitialState("2p");
s.status = "playing";
assert(s.players[0].pos[0] === 4 && s.players[0].pos[1] === 0, "شروع بازیکن ۰ در بالا");
assert(s.players[1].pos[0] === 4 && s.players[1].pos[1] === 8, "شروع بازیکن ۱ در پایین");

// حرکت ساده رو به جلو
assert(isValidMove(s, 0, [4, 1]), "حرکت یک‌خانه به جلو مجاز است");
assert(!isValidMove(s, 0, [4, 2]), "حرکت دوخانه بدون پرش مجاز نیست");
s = applyMove(s, 0, [4, 1]);
assert(s.turn === 1, "نوبت بعد از حرکت به بازیکن بعدی می‌رسد");

// تست دیوار: گذاشتن دیوار معتبر
const wallCheck = canPlaceWall(s, { x: 3, y: 3, orient: "h" });
assert(wallCheck.ok, "گذاشتن یک دیوار آزاد باید مجاز باشد");

// تست قانون طلایی: نباید بشه بازیکن رو کامل محاصره کرد
let s2 = createInitialState("2p");
s2.status = "playing";
// محاصره کامل بازیکن ۰ در گوشه با دیوار — باید در یکی از مراحل رد شود
s2.players[0].pos = [0, 0];
let blocked = false;
const attempts = [
  { x: 0, y: 0, orient: "h" },
  { x: 0, y: 0, orient: "v" },
];
for (const w of attempts) {
  const chk = canPlaceWall(s2, w);
  if (!chk.ok) continue;
  s2 = applyWall(s2, 0, w); // نوبت رو میدیم بازیکن دیگه ولی برای تست فرقی نداره
  s2.turn = 0; // برگردون نوبت برای تست بعدی
}
assert(hasPathToGoal(s2, 0), "حتی بعد از گذاشتن چند دیوار، مسیر بازیکن باید باز بماند");

// تست پرش: قرار دادن دو بازیکن روبروی هم
let s3 = createInitialState("2p");
s3.status = "playing";
s3.players[0].pos = [4, 4];
s3.players[1].pos = [4, 5];
const moves0 = getValidMoves(s3, 0);
const hasJump = moves0.some((m) => m[0] === 4 && m[1] === 6);
assert(hasJump, "پرش مستقیم از روی حریف مجاز است وقتی پشتش باز است");

// تست پرش مسدودشده -> باید مورب مجاز باشه
let s4 = createInitialState("2p");
s4.status = "playing";
s4.players[0].pos = [4, 4];
s4.players[1].pos = [4, 5];
s4.walls.push({ x: 3, y: 5, orient: "h" }); // دیوار پشت بازیکن ۱ (بین ردیف ۵ و ۶، ستون‌های ۳و۴)
const moves4 = getValidMoves(s4, 0);
const hasDiagonalLeft = moves4.some((m) => m[0] === 3 && m[1] === 5);
const hasDiagonalRight = moves4.some((m) => m[0] === 5 && m[1] === 5);
const hasStraightJump = moves4.some((m) => m[0] === 4 && m[1] === 6);
assert(!hasStraightJump, "وقتی پشت حریف دیوار است، پرش مستقیم مجاز نیست");
assert(hasDiagonalLeft || hasDiagonalRight, "حرکت مورب وقتی پرش مستقیم مسدود است باید مجاز باشد");

// --- تست حالت ۴ نفره ---
let s5 = createInitialState("4p");
assert(s5.players.length === 4, "حالت ۴ نفره باید ۴ بازیکن داشته باشد");
assert(s5.players[0].wallsLeft === 5, "هر بازیکن در حالت ۴ نفره ۵ دیوار دارد");
assert(s5.players[2].pos[0] === 0 && s5.players[2].pos[1] === 4, "بازیکن سوم (چپ) در ستون ۰ شروع می‌کند");

console.log("\nهمه‌ی تست‌ها با موفقیت پاس شدند ✅");
