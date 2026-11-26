import type { MailBundle } from "@/lib/platform/mail-events";

export function MailNote({
  email,
  mail,
}: {
  email?: string | null;
  mail?: MailBundle | null;
}) {
  if (!email?.includes("@")) return null;
  const customer = mail?.customer;
  return (
    <p className="mt-5 text-sm leading-relaxed text-mute">
      {customer?.sent === false
        ? `We could not email ${email}${customer.error ? ` (${customer.error})` : ""}. Keep this page as your confirmation.`
        : `A confirmation has been sent to ${email}. Check inbox and spam.`}
    </p>
  );
}
