// ============================================================================
// config.js
// آدرس‌های بک‌اند را اینجا وارد کن (بعد از دیپلوی Worker روی Cloudflare).
// تا وقتی این مقادیر خالی/پیش‌فرض باشند، اپ به‌صورت خودکار در «حالت تست محلی»
// (Local Hotseat) اجرا می‌شود تا بتوانی بدون بک‌اند، تخته و قوانین را تست کنی.
// ============================================================================

// آدرس Worker شما، مثال: "https://quoridor-bot.your-subdomain.workers.dev"
export const API_BASE_URL = ""; // بعد از دیپلوی Worker پر کن

// آدرس WebSocket برای اتصال به Durable Object، مثال:
// "wss://quoridor-bot.your-subdomain.workers.dev/room"
export const WS_BASE_URL = ""; // بعد از دیپلوی Worker پر کن

export const IS_BACKEND_CONFIGURED = Boolean(API_BASE_URL && WS_BASE_URL);
