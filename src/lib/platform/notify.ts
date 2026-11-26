import { db } from "@/lib/db";
import { sendBrandedEmail } from "@/lib/platform/email";

export async function notify(channel: string, template: string, to: string, payload: Record<string, unknown> = {}) {
  const title = String(payload.title || template.replace(/_/g, " "));
  let sent = false;
  let error = "";
  if (channel === "email" && to.includes("@")) {
    const result = await sendBrandedEmail({
      to,
      subject: title,
      title,
      intro: typeof payload.intro === "string" ? payload.intro : undefined,
      details: payload.details && typeof payload.details === "object" ? (payload.details as Record<string, unknown>) : undefined,
      password: typeof payload.tempPassword === "string" && payload.tempPassword ? payload.tempPassword : null,
      ctaHref: typeof payload.ctaHref === "string" ? payload.ctaHref : undefined,
      ctaLabel: typeof payload.ctaLabel === "string" ? payload.ctaLabel : undefined,
      bcc: typeof payload.bcc === "string" ? payload.bcc : undefined,
      text: String(payload.body || payload.title || title),
    });
    sent = result.sent;
    error = result.error || "";
  }
  const row = await db.notification.create({
    data: {
      channel,
      template,
      to,
      payload: JSON.stringify({ ...payload, sent, error }),
    },
  });
  console.info(`[notify] ${channel} ${template} -> ${to} ${sent ? "sent" : error || "not sent"}`);
  return { ...row, sent, error };
}

export function partyReminderText(opts: { date: string; time: string; code: string; deadline?: string }) {
  const deadline = opts.deadline ? ` before ${opts.deadline}` : "";
  return `Don't forget to choose your Double Zero food${deadline}. Party menu: /party/${opts.code} — ${opts.date} at ${opts.time}.`;
}
