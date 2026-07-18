// ============================================================================
// config.js
// آدرس‌های بک‌اند را اینجا وارد کن (بعد از دیپلوی Worker روی Cloudflare).
// تا وقتی این مقادیر خالی/پیش‌فرض باشند، اپ به‌صورت خودکار در «حالت تست محلی»
// (Local Hotseat) اجرا می‌شود تا بتوانی بدون بک‌اند، تخته و قوانین را تست کنی.
// ============================================================================

export const API_BASE_URL = "https://quoridor-backend.hamidreza-mugen.workers.dev";
export const WS_BASE_URL = "wss://quoridor-backend.hamidreza-mugen.workers.dev/room";
export const IS_BACKEND_CONFIGURED = Boolean(API_BASE_URL && WS_BASE_URL);
