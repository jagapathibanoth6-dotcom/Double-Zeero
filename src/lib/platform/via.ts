export function cleanVia(raw?: string | null) {
  return String(raw || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 48);
}

export function addVia(href: string, via: string) {
  const value = cleanVia(via);
  if (!value) return href;
  return `${href}${href.includes("?") ? "&" : "?"}via=${encodeURIComponent(value)}`;
}

export function viaLabel(via?: string | null) {
  const value = cleanVia(via);
  if (!value) return "";
  if (/^website$/i.test(value)) return "Website";
  if (/^restaurant$/i.test(value)) return "Restaurant page";
  if (/^qr$/i.test(value)) return "QR";
  return value;
}
