import type { StaffUser } from "@prisma/client";

/** Request body sent by the admin dashboard: `{ action: "...", ...fields }`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- fields differ per action and are validated in each handler
export type ActionBody = Record<string, any>;

export type ActionContext = { staff: StaffUser; body: ActionBody };

export type ActionHandler = (context: ActionContext) => Promise<Response>;

export type ActionHandlers = Record<string, ActionHandler>;
