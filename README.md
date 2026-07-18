# Quoridor Mini App

فرانت‌اند کامل بازی کوریدور (Quoridor) برای اجرا داخل Telegram Mini App.
این پروژه فقط شامل **Mini App** است — بات و بک‌اند (Cloudflare Workers/Durable Objects) طبق سند
`quoridor-telegram-roadmap.md` جداگانه ساخته می‌شود.

## اجرای محلی (بدون نیاز به بک‌اند)

```bash
npm install
npm run dev
```

سپس آدرس داده‌شده (مثلاً `http://localhost:5173`) را در مرورگر باز کن. چون هنوز بک‌اند وصل نیست،
اپ به‌صورت خودکار در **حالت تست محلی (Hotseat)** اجرا می‌شود: می‌توانی حالت ۲ یا ۴ نفره را انتخاب کنی
و روی همین یک دستگاه، نوبت به نوبت هر دو/چهار طرف را خودت بازی کنی تا قوانین و رابط کاربری را تست کنی.

می‌توانی با `test-logic.mjs` هم منطق بازی را مستقل تست کنی:

```bash
node test-logic.mjs
```

## اتصال به بک‌اند واقعی

وقتی Worker و Durable Object (طبق roadmap) دیپلوی شد:

1. فایل `src/config.js` را باز کن و مقادیر زیر را پر کن:

```js
export const API_BASE_URL = "https://your-worker.your-subdomain.workers.dev";
export const WS_BASE_URL = "wss://your-worker.your-subdomain.workers.dev/room";
```

2. به‌محض پر شدن این دو مقدار، اپ خودش از حالت تست محلی خارج می‌شود و به‌جایش
   با WebSocket واقعی به بک‌اند وصل می‌شود.

## قرارداد پیام‌های WebSocket (باید در Durable Object پیاده شود)

**کلاینت → سرور:**
```json
{ "type": "join", "roomId": "abc123", "telegramInitData": "<raw initData>" }
{ "type": "move", "target": [4, 5] }
{ "type": "wall", "wall": { "x": 3, "y": 3, "orient": "h" } }
```

**سرور → کلاینت:**
```json
{ "type": "state", "state": { /* شیء کامل GameState، همان ساختار gameLogic.js */ } }
{ "type": "error", "message": "..." }
```

سرور باید هر حرکت/دیوار دریافتی را با همان توابع `gameLogic.js` (قابل کپی مستقیم در Worker،
چون هیچ وابستگی به React یا مرورگر ندارد) اعتبارسنجی کند و state جدید را به همه‌ی client های
همان room broadcast کند.

## ساختار فایل‌ها

```
src/
  gameLogic.js       منطق خالص بازی (حرکت، دیوار، BFS، برد/باخت) — تست‌شده و بدون وابستگی
  telegram.js        هلپرهای Telegram WebApp SDK (initData، start_param، اشتراک‌گذاری)
  socket.js          کلاینت WebSocket با تلاش مجدد خودکار
  config.js          آدرس بک‌اند (خالی = حالت تست محلی)
  App.jsx            آرایش صفحات (انتخاب حالت / لابی / بازی / پایان)
  App.css            استایل کامل با هویت بصری «تخته‌ی چوبی»
  components/
    Board.jsx        رندر تخته، خانه‌ها، دیوارها، مهره‌ها + تعامل کلیک
    Lobby.jsx         صفحه‌ی انتظار بازیکنان
    GameOver.jsx       صفحه‌ی پایان بازی
```

## دیپلوی روی Cloudflare Pages

```bash
npm run build
```
پوشه‌ی `dist/` تولیدشده را به گیت‌هاب پوش کن و در پنل Cloudflare Pages وصلش کن،
یا مستقیم با `wrangler pages deploy dist` دیپلوی کن. آدرس نهایی را در BotFather
به‌عنوان Mini App URL ثبت کن.
