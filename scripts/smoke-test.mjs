#!/usr/bin/env node
/**
 * End-to-end smoke test against a running Double Zero server.
 *
 *   BASE_URL=http://localhost:3000 ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/smoke-test.mjs
 *
 * It needs a seeded database (npm run db:seed). It creates a few test
 * orders and bookings, so run it against a local or CI database only.
 */

const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

let passed = 0;
const failures = [];

async function check(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failures.push(name);
    console.log(`  ✗ ${name}\n      ${error instanceof Error ? error.message : error}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/** fetch with manual redirects and an optional cookie jar. */
async function http(path, { method = "GET", body, cookie, ip } = {}) {
  const headers = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (cookie) headers.cookie = cookie;
  if (ip) headers["x-forwarded-for"] = ip;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not JSON */
  }
  return { status: res.status, headers: res.headers, text, json };
}

function cookieFrom(res, name) {
  const all = res.headers.getSetCookie?.() || [];
  const hit = all.find((c) => c.startsWith(`${name}=`));
  return hit ? hit.split(";")[0] : "";
}

const uniqueEmail = (tag) => `smoke-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;

async function findOrderSlot(locationId) {
  const first = await http(`/api/order/when?locationId=${locationId}`);
  assert(first.status === 200, `order/when returned ${first.status}`);
  for (const { date } of first.json.dates || []) {
    const day = await http(`/api/order/when?locationId=${locationId}&date=${date}`);
    const slot = (day.json.slots || []).find((s) => s.available);
    if (slot) return { date, time: slot.time };
  }
  throw new Error("No open collection slot in the next weeks");
}

async function findTableSlot(locationId, guests) {
  for (let i = 1; i <= 21; i += 1) {
    const d = new Date(Date.now() + i * 86400000).toISOString().slice(0, 10);
    const res = await http(`/api/book/diary?locationId=${locationId}&date=${d}&guests=${guests}&visitType=table`);
    const slot = (res.json?.slots || []).find((s) => s.available);
    if (slot) return { date: d, time: slot.time };
  }
  throw new Error("No free table in the next 3 weeks");
}

async function main() {
  console.log(`Smoke testing ${BASE}\n`);

  console.log("Public pages");
  const pages = [
    "/", "/menu", "/manchester", "/chorlton", "/manchester/menu", "/chorlton/menu",
    "/manchester/book", "/chorlton/book", "/book", "/order", "/order/collect", "/order/delivery",
    "/locations", "/contact", "/about", "/gallery", "/offers", "/privacy", "/join", "/account", "/login",
    "/admin/login", "/robots.txt",
  ];
  for (const page of pages) {
    await check(`GET ${page} → 200`, async () => {
      const res = await http(page);
      assert(res.status === 200, `got ${res.status}`);
      assert(!/Application error|Internal Server Error/i.test(res.text), "page shows an error");
    });
  }
  await check("Old /book/manchester link redirects", async () => {
    const res = await http("/book/manchester");
    assert([301, 307, 308].includes(res.status), `got ${res.status}`);
    assert(res.headers.get("location")?.endsWith("/manchester/book"), `to ${res.headers.get("location")}`);
  });
  await check("Unknown page → 404", async () => {
    const res = await http("/this-page-does-not-exist");
    assert(res.status === 404, `got ${res.status}`);
  });

  console.log("\nMenu");
  let products = [];
  await check("Menu API lists products for both restaurants", async () => {
    for (const loc of ["manchester", "chorlton"]) {
      const res = await http(`/api/menu?locationId=${loc}`);
      assert(res.status === 200, `${loc}: ${res.status}`);
      assert(res.json.products.length > 10, `${loc}: only ${res.json.products.length} products`);
      if (loc === "manchester") products = res.json.products;
    }
  });
  const pizza = products.find((p) => p.category === "PIZZAS" && p.available);
  const drink = products.find((p) => p.id !== pizza?.id && p.available && p.category !== "TOPPINGS");

  console.log("\nDashboard security");
  await check("/admin without sign-in redirects to login", async () => {
    const res = await http("/admin");
    assert([302, 307].includes(res.status), `got ${res.status}`);
    assert(res.headers.get("location")?.includes("/admin/login"), `to ${res.headers.get("location")}`);
  });
  await check("Admin API without sign-in → 401", async () => {
    const res = await http("/api/admin/actions", { method: "POST", body: { action: "order_status" } });
    assert(res.status === 401, `got ${res.status}`);
  });
  await check("A forged staff cookie is rejected", async () => {
    const res = await http("/api/admin/actions", { method: "POST", body: { action: "x" }, cookie: "dz-staff=anything" });
    assert(res.status === 401, `got ${res.status}`);
    const page = await http("/admin/orders", { cookie: "dz-staff=anything" });
    assert(page.status !== 200 || !/Sign out/i.test(page.text), "dashboard shown to forged cookie");
  });
  await check("Wrong staff password → 401", async () => {
    const res = await http("/api/admin/login", { method: "POST", body: { email: ADMIN_EMAIL, password: "wrong-password" }, ip: "10.0.0.2" });
    assert(res.status === 401, `got ${res.status}`);
  });
  await check("Old default password 'doublezero' does not work", async () => {
    const res = await http("/api/admin/login", { method: "POST", body: { email: "owner@doublezero.local", password: "doublezero" }, ip: "10.0.0.2" });
    assert(res.status === 401, `got ${res.status}`);
  });

  let staff = "";
  await check("Owner can sign in", async () => {
    const res = await http("/api/admin/login", { method: "POST", body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }, ip: "10.0.0.3" });
    assert(res.status === 200, `got ${res.status}: ${res.text.slice(0, 120)}`);
    staff = cookieFrom(res, "dz-staff");
    assert(/^dz-staff=[^.]+\.\d+\.[\w-]+$/.test(staff), "cookie is not signed");
  });

  console.log("\nDashboard pages (signed in)");
  const adminPages = [
    "/admin", "/admin/bookings", "/admin/orders", "/admin/collect", "/admin/delivery", "/admin/kitchen",
    "/admin/pos", "/admin/tables", "/admin/menu", "/admin/menu/new", "/admin/customers", "/admin/enquiries",
    "/admin/waitlist", "/admin/parties", "/admin/payments", "/admin/gallery", "/admin/settings",
  ];
  for (const page of adminPages) {
    await check(`GET ${page} → 200`, async () => {
      const res = await http(page, { cookie: staff });
      assert(res.status === 200, `got ${res.status}`);
      assert(!/Application error|Internal Server Error/i.test(res.text), "page shows an error");
    });
  }
  await check("Live order alerts API works", async () => {
    const res = await http("/api/admin/order-watch", { cookie: staff });
    assert(res.status === 200, `got ${res.status}`);
  });
  await check("Unknown dashboard action → 400", async () => {
    const res = await http("/api/admin/actions", { method: "POST", body: { action: "nope" }, cookie: staff });
    assert(res.status === 400, `got ${res.status}`);
  });

  console.log("\nOnline ordering");
  let order = null;
  let customer = "";
  const email = uniqueEmail("order");
  await check("Order is re-priced on the server (browser says 1p)", async () => {
    assert(pizza, "no pizza on the menu");
    const slot = await findOrderSlot("manchester");
    const price = pizza.prices.find((p) => p.available) || pizza.prices[0];
    const res = await http("/api/order", {
      method: "POST",
      ip: "10.0.1.1",
      body: {
        locationId: "manchester",
        source: "CLICK_COLLECT",
        items: [{ productId: pizza.id, name: pizza.name, quantity: 2, unitPence: 1, label: price.label }],
        name: "Smoke Test",
        email,
        phone: "07000000000",
        date: slot.date,
        time: slot.time,
      },
    });
    assert(res.status === 200, `got ${res.status}: ${res.text.slice(0, 200)}`);
    order = res.json.order;
    assert(order.subtotalPence === price.pricePence * 2, `subtotal ${order.subtotalPence}, expected ${price.pricePence * 2}`);
    customer = cookieFrom(res, "dz-customer");
  });
  await check("Order reference is random (O-XXXXXXXX)", async () => {
    assert(/^O-[A-Z2-9]{8}$/.test(order?.ref || ""), `ref ${order?.ref}`);
  });
  await check("No fake 'paid' payment in production", async () => {
    const res = await http(`/api/order?ref=${order.ref}`);
    assert(res.status === 200, `got ${res.status}`);
    const paid = (res.json.order.payments || []).filter((p) => p.status === "PAID");
    assert(paid.length === 0, `${paid.length} paid payment(s) recorded without money`);
    assert(res.json.order.status === "PENDING_PAY", `status ${res.json.order.status}`);
  });
  await check("New customer is signed in after first order", async () => {
    assert(/^dz-customer=[^.]+\.\d+\.[\w-]+$/.test(customer), "no signed customer cookie");
    const res = await http("/api/account", { cookie: customer });
    assert(res.json?.customer?.email === email, `account email ${res.json?.customer?.email}`);
  });
  await check("Ordering with an existing customer's email does NOT sign you in as them", async () => {
    const slot = await findOrderSlot("manchester");
    const res = await http("/api/order", {
      method: "POST",
      ip: "10.0.1.2",
      body: {
        locationId: "manchester",
        source: "CLICK_COLLECT",
        items: [{ productId: drink.id, name: drink.name, quantity: 1, unitPence: 0, label: (drink.prices.find((p) => p.available) || drink.prices[0]).label }],
        name: "Someone Else",
        email,
        phone: "07000000001",
        date: slot.date,
        time: slot.time,
      },
    });
    assert(res.status === 200, `got ${res.status}: ${res.text.slice(0, 200)}`);
    assert(!cookieFrom(res, "dz-customer"), "visitor was signed in as the existing customer");
    assert(!res.json.access?.tempPassword, "temporary password leaked in the response");
  });
  await check("A forged customer cookie is rejected", async () => {
    const res = await http("/api/account", { cookie: "dz-customer=whatever" });
    assert(res.json?.customer === null, "forged cookie accepted");
  });
  await check("Website can't create till (POS) orders", async () => {
    const res = await http("/api/order", {
      method: "POST",
      body: { locationId: "manchester", source: "POS", items: [{ productId: pizza.id, name: pizza.name, quantity: 1, unitPence: 1 }], name: "X", email: uniqueEmail("pos") },
    });
    assert(res.status === 400, `got ${res.status}`);
  });
  await check("Unknown products are refused", async () => {
    const slot = await findOrderSlot("manchester");
    const res = await http("/api/order", {
      method: "POST",
      body: { locationId: "manchester", source: "CLICK_COLLECT", items: [{ productId: "fake", name: "Free pizza", quantity: 1, unitPence: 0 }], name: "X", email: uniqueEmail("fake"), date: slot.date, time: slot.time },
    });
    assert(res.status === 400, `got ${res.status}`);
  });
  await check("Cancelling with a guessed reference fails", async () => {
    const res = await http("/api/order/cancel", { method: "POST", body: { ref: "O20456" }, ip: "10.0.2.1" });
    assert(res.status === 404, `got ${res.status}`);
  });
  await check("Customer can cancel their own order with its link", async () => {
    const res = await http("/api/order/cancel", { method: "POST", body: { ref: order.ref }, ip: "10.0.2.1" });
    assert(res.status === 200, `got ${res.status}: ${res.text.slice(0, 200)}`);
    const after = await http(`/api/order?ref=${order.ref}`);
    assert(after.json.order.status === "CANCELLED", `status ${after.json.order.status}`);
  });
  await check("Order confirmation and cancel pages load", async () => {
    for (const page of [`/order/confirmed?ref=${order.ref}`, `/order/cancel?ref=${order.ref}`]) {
      const res = await http(page);
      assert(res.status === 200, `${page}: ${res.status}`);
    }
  });

  console.log("\nTable booking");
  let booking = null;
  await check("Book a table for 2", async () => {
    const slot = await findTableSlot("manchester", 2);
    const res = await http("/api/book", {
      method: "POST",
      ip: "10.0.3.1",
      body: { locationId: "manchester", visitType: "table", date: slot.date, time: slot.time, guests: 2, name: "Smoke Booker", email: uniqueEmail("book"), phone: "07000000002" },
    });
    assert(res.status === 200, `got ${res.status}: ${res.text.slice(0, 200)}`);
    booking = res.json.booking;
    assert(/^B-[A-Z2-9]{8}$/.test(booking?.ref || ""), `ref ${booking?.ref}`);
    assert(booking.tableCodes, "no table was assigned");
  });
  await check("Booking appears in the dashboard", async () => {
    const res = await http(`/admin/bookings/${booking.id}`, { cookie: staff });
    assert(res.status === 200 && res.text.includes(booking.ref), `got ${res.status}`);
  });
  await check("Booking confirmation and cancel pages load", async () => {
    for (const page of [`/book/confirmed?ref=${booking.ref}`, `/book/cancel?ref=${booking.ref}`]) {
      const res = await http(page);
      assert(res.status === 200, `${page}: ${res.status}`);
    }
  });
  await check("Large group becomes an enquiry", async () => {
    const res = await http("/api/enquiry", {
      method: "POST",
      ip: "10.0.3.2",
      body: { locationId: "manchester", date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10), preferredTime: "19:00", guests: 30, name: "Big Group", email: uniqueEmail("enq"), phone: "07000000003" },
    });
    assert(res.status === 200, `got ${res.status}: ${res.text.slice(0, 200)}`);
    assert(/^ENQ-[A-Z2-9]{8}$/.test(res.json.enquiry?.ref || ""), `ref ${res.json.enquiry?.ref}`);
  });

  console.log("\nSign-in protection");
  await check("Too many wrong staff passwords are blocked", async () => {
    let last = 0;
    for (let i = 0; i < 12; i += 1) {
      last = (await http("/api/admin/login", { method: "POST", body: { email: ADMIN_EMAIL, password: "bad" }, ip: "10.9.9.9" })).status;
    }
    assert(last === 429, `last attempt got ${last}`);
  });
  await check("Staff sign-out clears the session", async () => {
    const res = await http("/api/admin/login", { method: "POST", body: { action: "logout" }, cookie: staff });
    assert(res.status === 200, `got ${res.status}`);
    const all = res.headers.getSetCookie?.() || [];
    assert(all.some((c) => c.startsWith("dz-staff=;") || /dz-staff=.*(Max-Age=0|Expires=Thu, 01 Jan 1970)/i.test(c)), "cookie not cleared");
  });

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
