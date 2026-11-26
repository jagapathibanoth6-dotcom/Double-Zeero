import { notify } from "@/lib/platform/notify";

export type MailResult = { sent: boolean; error?: string };

export type MailBundle = {
  customer?: MailResult;
  extra?: MailResult;
};

function asResult(row: { sent?: boolean; error?: string } | null | undefined): MailResult {
  return { sent: Boolean(row?.sent), error: row?.error || undefined };
}

export async function sendCustomerMail(
  template: string,
  to: string,
  payload: Record<string, unknown>,
): Promise<MailResult> {
  if (!to?.includes("@")) return { sent: false, error: "No customer email" };
  return asResult(await notify("email", template, to, payload));
}
