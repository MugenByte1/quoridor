// ============================================================================
// telegram.js
// هلپرهای مربوط به Telegram WebApp SDK.
// اگر خارج از تلگرام (مثلاً روی مرورگر معمولی برای تست) باز شود، مقادیر
// پیش‌فرض امن برمی‌گرداند تا اپ کرش نکند.
// ============================================================================

export function getTelegramWebApp() {
  if (typeof window !== "undefined" && window.Telegram && window.Telegram.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

export function initTelegramApp() {
  const tg = getTelegramWebApp();
  if (!tg) return;
  tg.ready();
  tg.expand();
  // پس‌زمینه‌ی هدر را با تم اپ هماهنگ کن
  try {
    tg.setHeaderColor("#1c1410");
    tg.setBackgroundColor("#1c1410");
  } catch (e) {
    // بعضی نسخه‌های قدیمی WebApp این متدها را ندارند — بی‌خطر است
  }
}

// room_id ای که از طریق لینک startapp=... پاس داده شده
export function getStartParam() {
  const tg = getTelegramWebApp();
  const fromTelegram = tg?.initDataUnsafe?.start_param;
  if (fromTelegram) return fromTelegram;

  // حالت تست خارج از تلگرام: از query string بخوان (?room=xxxx)
  const params = new URLSearchParams(window.location.search);
  return params.get("room") || null;
}

// initData خام که باید برای اعتبارسنجی امضا به بک‌اند فرستاده شود
export function getRawInitData() {
  const tg = getTelegramWebApp();
  return tg?.initData || "";
}

// اطلاعات کاربر تلگرام (فقط برای نمایش؛ منبع مورد اعتماد initData امضاشده است
// که سمت سرور اعتبارسنجی می‌شود، نه این مقدار خام سمت کلاینت)
export function getTelegramUser() {
  const tg = getTelegramWebApp();
  const user = tg?.initDataUnsafe?.user;
  if (user) {
    return {
      id: user.id,
      name: [user.first_name, user.last_name].filter(Boolean).join(" "),
      username: user.username,
    };
  }
  // حالت تست خارج از تلگرام: یک کاربر مهمان تصادفی بساز
  return {
    id: `guest_${Math.random().toString(36).slice(2, 8)}`,
    name: "مهمان",
    username: null,
  };
}

export function hapticFeedback(style = "light") {
  const tg = getTelegramWebApp();
  try {
    tg?.HapticFeedback?.impactOccurred(style);
  } catch (e) {
    /* بی‌خطر */
  }
}

export function shareInviteLink(url, text) {
  const tg = getTelegramWebApp();
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  if (tg) {
    tg.openTelegramLink(shareUrl);
  } else {
    window.open(shareUrl, "_blank");
  }
}
