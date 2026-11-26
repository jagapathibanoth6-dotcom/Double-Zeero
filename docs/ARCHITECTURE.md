# Architecture

How Double Zero is put together, for developers joining the project.

## One app, three parts

```
Browser ──► Next.js app
             ├── src/app/(site)   customer pages  (React Server + Client Components)
             ├── src/app/admin    staff dashboard (signed-in staff only)
             └── src/app/api      JSON API used by both
                     │
                     ▼
             src/lib/platform    business logic (bookings, orders, payments, mail…)
                     │
                     ▼
             Prisma ──► SQLite (prisma/dev.db)          Stripe · SMTP · ResDiary · Uber Direct
```

Pages and API routes should stay thin: read the request, call a function in `src/lib/platform`, return the result.

## Data model (prisma/schema.prisma)

| Table | What it holds |
| --- | --- |
| `StaffUser` | Dashboard logins. `role` is `owner` or `kitchen` (roles are shown but not yet enforced — see PRODUCTION.md). |
| `Customer` | Customer accounts, created automatically the first time someone books or orders. |
| `LocationSettings` | Per-restaurant settings edited in *Admin → Settings*: hours, booking rules, deposits, delivery, Stripe/Uber keys. |
| `Table`, `TableCombo` | Floor plan and which tables can be pushed together. |
| `Booking`, `BookingGuest` | Table and collection bookings. |
| `Party` | Party menu for a large booking: guests pre-order their food from a shared link. |
| `Enquiry` | Large-group requests that staff confirm by hand. |
| `WaitlistEntry` | People waiting for a full sitting. |
| `MenuProduct`, `MenuPrice` | Menu items; prices (and sizes) are per restaurant and can be switched off. |
| `Order`, `OrderItem` | Click & collect, delivery, till (POS), party and marketplace orders. |
| `Payment`, `Refund` | Money in and out. `provider` is `STRIPE` or `DEMO` (manual/demo). |
| `Delivery` | Delivery quote/dispatch details (Uber Direct). |
| `Offer` | Discounts (percentage, minimum spend, order type). |
| `Notification`, `PrintJob`, `AuditLog` | Email log, kitchen printer queue, change history. |
| `QrCode`, `GalleryPhoto` | QR poster links and the website gallery. |

Statuses are plain strings. The main ones:

- **Booking:** `PENDING_DEPOSIT` → `CONFIRMED` → `COMPLETED`, or `CANCELLED` / `DECLINED`.
- **Order:** `PENDING_PAY` → `NEW` → `ACCEPTED` → `PREPARING` → `READY` → (`DISPATCHED`) → `COMPLETED`, or `CANCELLED`.

## Main flows

### Table booking — `src/lib/platform/booking.ts`
1. `searchSlots()` works out free times. Every sitting is 90 minutes; tables are packed with `packTables()` (single table → saved combination → several tables).
2. Party size decides the band (`bookingBand()` in `settings.ts`):
   **NORMAL** books instantly · **LARGE** may need a deposit and gets a party menu · **ENQUIRY** becomes an `Enquiry` for staff.
3. `createBooking()` saves it, creates or updates the customer, and emails a confirmation.
4. If ResDiary is configured, normal bookings are also sent there (`src/lib/resdiary.ts`).

### Online order — `src/lib/platform/orders.ts`
1. The order page (`components/OrderDesk.tsx`) builds a basket.
2. `POST /api/order` → `createOrder()`:
   - `priceBasket()` **re-prices every line from the database** (sizes and pizza extras);
   - checks kitchen hours, slot capacity and the delivery area;
   - applies a valid offer and saves the order.
3. Payment: with Stripe set up for that restaurant, the customer goes to Stripe Checkout and the order stays `PENDING_PAY` until paid. Without Stripe, a demo payment is recorded — **only outside production** (`demoPaymentsAllowed()` in `payments.ts`).
4. Paid orders are queued for the kitchen printers (`queuePrintJobs()`).

### Payments — `src/lib/platform/stripe.ts`, `payments.ts`, `pay.ts`
- `createStripeCheckout()` starts a Checkout session using that restaurant's key.
- Payment is confirmed two ways, both checked with Stripe: the return page (`/pay/return`) and the webhook (`/api/pay/webhook`, signed with `STRIPE_WEBHOOK_SECRET`).
- Refunds go back through Stripe (`refundStripe()`); `pay.ts` has the maths for what has been paid, refunded and is still due.

### Party menus — `src/lib/platform/party.ts`
Large bookings get a party code. Everyone with the link (`/party/<code>`) can add their name and pre-order. The party link is shared widely, so `publicPartyView()` deliberately leaves out the booking reference, emails and phone numbers.

### Customer accounts — `customer-access.ts`, `api/account`
The first booking/order with a new email creates an account and emails a temporary password. Visitors are signed in automatically **only** when their account was just created; an existing customer must sign in with their password.

## Security model

| Concern | How it's handled | Where |
| --- | --- | --- |
| Staff and customer sessions | HMAC-signed cookie (`id.expiry.signature`), 12 h for staff, 30 days for customers | `signed-token.ts`, `session.ts` |
| Dashboard access | Middleware redirects signed-out visitors; every admin page/API verifies the session again on the server | `middleware.ts`, `admin.ts` |
| Branch isolation | Staff actions check the record belongs to their current branch | `assertStaffBranch()` |
| Passwords | scrypt with random salt; old SHA-256 customer hashes upgrade on sign-in | `password.ts` |
| View/cancel links | References are random (`O-7KQ4M2XP`), not sequential | `uniqueRef()` in `refs.ts` |
| Prices | Recalculated on the server | `priceBasket()` |
| Brute force | In-memory rate limits on sign-in and cancel | `rate-limit.ts` |
| Stripe | Webhook signature checked; return page re-checks the session with Stripe | `api/pay/webhook`, `stripe.ts` |

## API routes

Customer-facing (`src/app/api`):

| Route | Purpose |
| --- | --- |
| `GET/POST /api/account` | Customer dashboard data; sign in/out, change password, edit or cancel bookings and orders |
| `GET/POST /api/book` | Look up / create a booking |
| `POST /api/book/cancel`, `/api/order/cancel` | Cancel by reference (from the confirmation page) |
| `GET /api/book/diary` | Free times for the booking form |
| `POST /api/book/waitlist` | Join the waitlist |
| `POST /api/enquiry` | Large-group enquiry |
| `GET /api/menu` | Live menu for a restaurant |
| `GET/POST /api/order` | Look up / place an order |
| `POST /api/order/quote`, `GET /api/order/when` | Delivery quote; open dates and times |
| `GET /api/location` | Nearest restaurant |
| `/api/party/[code]/…` | Party page data, guest list, guest orders, paying |
| `POST /api/pay/checkout`, `GET /api/pay/ready`, `POST /api/pay/webhook` | Stripe |

Dashboard (`src/app/api/admin`, staff only):

| Route | Purpose |
| --- | --- |
| `POST /api/admin/login`, `/logout` | Staff sign in/out |
| `POST /api/admin/actions` | Most dashboard actions — `{ action: "...", ... }`, handled in `actions/handlers/*.ts` by area |
| `POST /api/admin/branch` | Switch restaurant |
| `/api/admin/menu`, `/menu/photo`, `/gallery` | Menu editor, photo uploads, gallery |
| `GET /api/admin/order-watch` | Live order alerts for the dashboard |

## Where to make common changes

| I want to… | Look in |
| --- | --- |
| Change opening hours, address, phone | `src/data/site.ts` (defaults) or *Admin → Settings* |
| Change the starter menu | `src/data/menus.ts`, then `npm run db:seed` (or edit live in *Admin → Menu*) |
| Change pizza toppings and extra prices | `src/data/pizza-options.ts` |
| Change booking rules (party sizes, deposits) | *Admin → Settings* (`LocationSettings`) |
| Change email wording/design | `src/lib/platform/email.ts`, `mail-events.ts`, `pay-mail.ts` |
| Add a dashboard action | A handler in `src/app/api/admin/actions/handlers/` |
| Add a database field | `prisma/schema.prisma`, then `npx prisma db push` |
