export type DeviceKind = "phone" | "tablet" | "laptop";
export type PayMethod = "CARD" | "APPLE_PAY" | "GOOGLE_PAY" | "STRIPE";

export const DEMO_CARD = {
  number: "1111222233334444",
  display: "1111 2222 3333 4444",
  cvv: "123",
  expiry: "01/01",
};

export function digits(value: string) {
  return value.replace(/\D/g, "");
}

export function isDemoCard(number: string, cvv: string, expiry: string) {
  const exp = expiry.replace(/\s/g, "");
  return digits(number) === DEMO_CARD.number && cvv.trim() === DEMO_CARD.cvv && (exp === "01/01" || exp === "0101" || exp === "01/2001");
}

export function detectDevice(): DeviceKind {
  if (typeof navigator === "undefined") return "laptop";
  const ua = navigator.userAgent;
  const touch = navigator.maxTouchPoints || 0;
  const iPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && touch > 1);
  const iPhone = /iPhone/.test(ua);
  const android = /Android/.test(ua);
  const androidPhone = android && /Mobile/.test(ua);
  const androidTablet = android && !/Mobile/.test(ua);
  if (iPhone || androidPhone) return "phone";
  if (iPad || androidTablet) return "tablet";
  if (touch > 0 && window.innerWidth <= 900) return "phone";
  if (touch > 0 && window.innerWidth <= 1280) return "tablet";
  return "laptop";
}

export function applePayNative() {
  return false;
}

export function googlePayNative() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return false;
  return /Android/i.test(ua) || /Chrome|CriOS|Edg/i.test(ua);
}

export function walletOptions(device = detectDevice()) {
  try {
    const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
    const iPhone = /iPhone/.test(ua);
    const iPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1);
    const android = /Android/i.test(ua);
    return {
      device,
      appleNative: device === "phone" ? iPhone : device === "tablet" && iPad,
      appleScan: (device === "laptop" || device === "tablet") && !android && !iPad,
      google: googlePayNative(),
      card: true,
    };
  } catch {
    return { device, appleNative: false, appleScan: false, google: false, card: true };
  }
}
