import nodemailer from "nodemailer";

export function envValue(name: string) {
  return (process.env[name] || "").trim().replace(/^["']|["']$/g, "");
}

export function siteUrl() {
  return (envValue("NEXT_PUBLIC_SITE_URL") || "http://localhost:3000").replace(/\/+$/, "");
}

function isPublicHttpUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") return false;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

export function mailConfigured() {
  return Boolean(envValue("SMTP_HOST") && envValue("SMTP_USER") && envValue("SMTP_PASS"));
}

function publicHref(path?: string) {
  if (!path) return undefined;
  if (path.startsWith("http")) return isPublicHttpUrl(path) ? path : undefined;
  const base = siteUrl();
  if (!isPublicHttpUrl(base)) return undefined;
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

function transporter() {
  const port = Number(envValue("SMTP_PORT") || 587);
  return nodemailer.createTransport({
    host: envValue("SMTP_HOST"),
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: {
      user: envValue("SMTP_USER"),
      pass: envValue("SMTP_PASS"),
    },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stringDetails(details?: Record<string, unknown> | null) {
  const rows: Record<string, string> = {};
  for (const [key, value] of Object.entries(details || {})) {
    if (value == null || value === "") continue;
    const text = String(value);
    rows[key] = text.startsWith("/") ? publicHref(text) || text.replace(/^\//, "") : text;
  }
  return rows;
}

export function brandedEmailHtml(input: {
  title: string;
  intro?: string;
  details?: Record<string, string>;
  password?: string | null;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  const rows = Object.entries(input.details || {})
    .map(
      ([key, value]) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #eadfd0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#8a7d6d;width:34%">${escapeHtml(key)}</td>
          <td style="padding:10px 0;border-bottom:1px solid #eadfd0;font-size:16px;color:#1a1612">${
            value.startsWith("http")
              ? `<a href="${escapeHtml(value)}" style="color:#c4451d;word-break:break-all">${escapeHtml(value)}</a>`
              : escapeHtml(value)
          }</td>
        </tr>`,
    )
    .join("");

  const passwordBox = input.password
    ? `<div style="margin:28px 0;padding:18px 20px;background:#11100e;color:#f3eee6">
        <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#c4a574">Temporary password</p>
        <p style="margin:0;font-size:22px;letter-spacing:0.08em">${escapeHtml(input.password)}</p>
      </div>`
    : "";

  const cta = input.ctaHref
    ? `<p style="margin:28px 0 0">
        <a href="${escapeHtml(input.ctaHref)}" style="display:inline-block;background:#c4451d;color:#fff;text-decoration:none;padding:14px 22px;letter-spacing:0.16em;text-transform:uppercase;font-size:12px">${escapeHtml(input.ctaLabel || "Open dashboard")}</a>
      </p>`
    : `<p style="margin:28px 0 0;line-height:1.6;color:#6f675c">Sign in at My Double Zero / Account on the website with this email to manage the booking.</p>`;

  const footerNote = `<p style="margin:18px 0 0;font-size:11px;line-height:1.6;color:#8a7d6d">This is a Double Zero confirmation. Reply to this email if you need help with a booking, order, payment or refund.</p>`;

  return `<!doctype html>
  <html>
    <body style="margin:0;background:#f3eee6;font-family:Georgia,'Times New Roman',serif;color:#1a1612">
      <div style="max-width:640px;margin:0 auto;padding:32px 18px 48px">
        <div style="background:#11100e;color:#f3eee6;padding:28px 28px 24px">
          <p style="margin:0;letter-spacing:0.42em;text-transform:uppercase;font-size:13px">Double Zero</p>
          <p style="margin:8px 0 0;letter-spacing:0.24em;text-transform:uppercase;font-size:10px;color:#c4a574">Sourdough wood oven pizzeria</p>
        </div>
        <div style="background:#fffdf8;padding:32px 28px;border:1px solid #eadfd0;border-top:0">
          <h1 style="margin:0;font-weight:normal;font-size:32px;line-height:1.15">${escapeHtml(input.title)}</h1>
          ${input.intro ? `<p style="margin:16px 0 0;line-height:1.6;color:#6f675c">${escapeHtml(input.intro)}</p>` : ""}
          ${passwordBox}
          ${rows ? `<table style="width:100%;border-collapse:collapse;margin-top:22px">${rows}</table>` : ""}
          ${cta}
          ${footerNote}
        </div>
        <p style="margin:18px 8px 0;font-size:12px;color:#8a7d6d">Manchester City Centre · Chorlton · pizzeriadoublezero.com</p>
      </div>
    </body>
  </html>`;
}

export async function sendBrandedEmail(input: {
  to: string;
  subject: string;
  title: string;
  intro?: string;
  details?: Record<string, unknown>;
  password?: string | null;
  ctaHref?: string;
  ctaLabel?: string;
  text: string;
  bcc?: string;
}) {
  if (!mailConfigured()) {
    console.info(`[mail] SMTP not configured — skipped ${input.subject} -> ${input.to}`);
    return { sent: false as const, error: "SMTP not configured" };
  }

  const fromName = envValue("SMTP_FROM_NAME") || "Double Zero";
  const fromEmail = envValue("SMTP_FROM_EMAIL") || envValue("SMTP_USER");
  const details = stringDetails(input.details);
  const ctaHref = publicHref(input.ctaHref);
  const html = brandedEmailHtml({
    title: input.title,
    intro: input.intro,
    details,
    password: input.password,
    ctaHref,
    ctaLabel: input.ctaLabel,
  });

  const mail = {
    from: `"${fromName}" <${fromEmail}>`,
    to: input.to,
    bcc: input.bcc || undefined,
    replyTo: fromEmail,
    subject: input.subject,
    text: input.text,
    html,
  };

  try {
    const info = await transporter().sendMail(mail);
    console.info(`[mail] sent ${input.subject} -> ${input.to} ${info.messageId || ""}`);
    return { sent: true as const, messageId: info.messageId };
  } catch (first) {
    console.error("[mail] send failed, retrying", first);
    try {
      const info = await transporter().sendMail(mail);
      console.info(`[mail] sent-retry ${input.subject} -> ${input.to} ${info.messageId || ""}`);
      return { sent: true as const, messageId: info.messageId };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Send failed";
      console.error("[mail] send failed", message);
      return { sent: false as const, error: message };
    }
  }
}

export function dashboardUrl() {
  return `${siteUrl()}/account`;
}
