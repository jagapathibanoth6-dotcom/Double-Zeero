import { locations, type LocationId, type VisitType } from "@/data/site";

const TOKEN_URL_PROD = "https://api.hos.accessacloud.com/platform/m2m-auth/v1/token";
const TOKEN_URL_SANDBOX = "https://api-staging.hos.accessacloud.com/platform/m2m-auth/v1/token";
const API_PROD = "https://api.hos.accessacloud.com/resdiary-api";
const API_SANDBOX = "https://api-staging.hos.accessacloud.com/resdiary-api";

type TokenCache = { token: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

function env(name: string) {
  return process.env[name]?.trim() || "";
}

export function resdiaryConfigured() {
  return Boolean(env("RESDIARY_CLIENT_ID") && env("RESDIARY_CLIENT_SECRET") && env("RESDIARY_SUBSCRIPTION_KEY"));
}

export function resdiaryMicrosite(locationId: LocationId) {
  const override =
    locationId === "manchester" ? env("RESDIARY_MICROSITE_MANCHESTER") : env("RESDIARY_MICROSITE_CHORLTON");
  return override || locations[locationId].resdiaryMicrosite;
}

function sandbox() {
  return env("RESDIARY_ENV") === "sandbox";
}

async function accessToken() {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 30_000) return tokenCache.token;

  const tokenUrl = env("RESDIARY_TOKEN_URL") || (sandbox() ? TOKEN_URL_SANDBOX : TOKEN_URL_PROD);
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: env("RESDIARY_CLIENT_ID"),
      client_secret: env("RESDIARY_CLIENT_SECRET"),
      scope: env("RESDIARY_SCOPE") || "consumer_api",
      audience: env("RESDIARY_AUDIENCE") || "https://api.hos.accessacloud.com",
    }),
  });

  const data = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error || "ResDiary authentication failed. Check the API keys.");
  }

  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };
  return tokenCache.token;
}

async function rdFetch<T = Record<string, unknown>>(path: string, init?: RequestInit): Promise<T> {
  const base = env("RESDIARY_API_BASE") || (sandbox() ? API_SANDBOX : API_PROD);
  const token = await accessToken();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "Ocp-Apim-Subscription-Key": env("RESDIARY_SUBSCRIPTION_KEY"),
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  } catch {
    json = { Message: text.slice(0, 200) };
  }
  if (!res.ok) {
    const message =
      String(json?.Message || json?.message || json?.error || (json?.Errors as string[] | undefined)?.[0] || "") ||
      `ResDiary request failed (${res.status}).`;
    throw new Error(message);
  }
  return (json || {}) as T;
}

function slotClock(value: string) {
  const match = String(value).match(/T(\d{2}:\d{2})/);
  if (match) return match[1];
  if (/^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
  return value;
}

function splitName(full: string) {
  const parts = full.trim().split(/\s+/);
  return {
    FirstName: parts[0] || "Guest",
    Surname: parts.slice(1).join(" ") || parts[0] || "Guest",
  };
}

type CreateBookingResponse = {
  Status?: string;
  Errors?: string[];
  Booking?: { Reference?: string; VisitTime?: string; RestaurantName?: string };
};

export async function createResdiaryBooking(input: {
  locationId: LocationId;
  visitType: VisitType;
  date: string;
  time: string;
  guests: number;
  name: string;
  email: string;
  phone: string;
  notes: string;
  highchair: boolean;
}) {
  const microsite = encodeURIComponent(resdiaryMicrosite(input.locationId));
  const names = splitName(input.name);
  const special = [
    input.notes,
    input.highchair ? "Highchair / pram space requested." : "",
    input.visitType === "collection" ? "Collection booking." : "",
  ]
    .filter(Boolean)
    .join(" ");

  const payload: Record<string, unknown> = {
    VisitDate: `${input.date}T${input.time}:00`,
    VisitTime: input.time,
    PartySize: input.guests,
    ChannelCode: env("RESDIARY_CHANNEL") || "ONLINE",
    SpecialRequests: special,
    IsLeaveTimeConfirmed: true,
    Customer: {
      FirstName: names.FirstName,
      Surname: names.Surname,
      Email: input.email,
      Mobile: input.phone.replace(/\s+/g, ""),
      Phone: input.phone.replace(/\s+/g, ""),
      MobileCountryCode: 44,
      PhoneCountryCode: 44,
    },
  };

  if (input.visitType === "collection") {
    payload.TakeawayType = "Collection";
  }

  const data = await rdFetch<CreateBookingResponse>(`/api/ConsumerApi/v1/Restaurant/${microsite}/BookingWithStripeToken`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const status = data?.Status as string | undefined;
  if (status && status !== "Success") {
    if (status === "PaymentRequired" || status === "CreditCardRequired") {
      throw new Error("This sitting needs a card or deposit in ResDiary. Book it in the diary widget, or call the restaurant.");
    }
    if (status === "NoAvailability") {
      throw new Error("That time has just filled. Please pick another slot.");
    }
    throw new Error(data?.Errors?.[0] || `ResDiary could not complete the booking (${status}).`);
  }

  const booking = data?.Booking || {};
  return {
    ref: String(booking.Reference || ""),
    visitTime: slotClock(booking.VisitTime || input.time),
    restaurantName: String(booking.RestaurantName || locations[input.locationId].name),
  };
}

export async function getResdiaryBooking(locationId: LocationId, ref: string) {
  const microsite = encodeURIComponent(resdiaryMicrosite(locationId));
  return rdFetch<{
    Reference?: string;
    IsTakeawayBooking?: boolean;
    TakeawayType?: string;
    VisitDate?: string;
    VisitTime?: string;
    PartySize?: number;
    SpecialRequests?: string;
    BookingDateTime?: string;
    Customer?: { FirstName?: string; Surname?: string; Email?: string; Mobile?: string; Phone?: string };
  }>(`/api/ConsumerApi/v1/Restaurant/${microsite}/Booking/${encodeURIComponent(ref)}`);
}

export function resdiaryBookUrl(locationId: LocationId) {
  const fromEnv =
    locationId === "manchester"
      ? env("NEXT_PUBLIC_RESDIARY_WIDGET_MANCHESTER")
      : env("NEXT_PUBLIC_RESDIARY_WIDGET_CHORLTON");
  if (fromEnv) return fromEnv;
  const loc = locations[locationId];
  if (loc.dishCultUrl) return loc.dishCultUrl;
  return `https://booking.resdiary.com/widget/Standard/${loc.resdiaryMicrosite}`;
}

export function isResdiaryEmbed(url: string) {
  return /resdiary\.com\/widget/i.test(url) || /booking\.resdiary\.com/i.test(url);
}
