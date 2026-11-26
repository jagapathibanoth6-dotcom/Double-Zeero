# Double Zero

Website, online ordering, table booking and management dashboard for **Double Zero Pizzeria** (Manchester city centre and Chorlton).

It is a single [Next.js](https://nextjs.org) app. One `npm run dev` starts all three parts:

| Part | Where in the code | URL |
| --- | --- | --- |
| Customer website: menus, booking, click & collect, delivery, party pre-orders, customer account | `src/app/(site)` | `/` |
| Management dashboard: bookings diary, tables, orders, kitchen, till (POS), payments, menu, settings | `src/app/admin` | `/admin` |
| Backend API used by both | `src/app/api`, logic in `src/lib/platform` | `/api/...` |

**Tech:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Prisma 6 with SQLite · Stripe · Nodemailer (SMTP) · optional ResDiary and Uber Direct.

---

## Try it in the browser (no install)

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/jagapathibanoth6-dotcom/Double-Zeero?quickstart=1)

Click the button, then **Create codespace**. After 2–3 minutes the site opens in a new tab. The dashboard login is shown in `CODESPACE-LOGIN.txt`. Each codespace has its own test database.

---

## Getting started

You need **Node.js 20 or newer**.

```bash
# 1. Install packages
npm install

# 2. Create your settings file and fill it in (see comments inside)
cp .env.example .env
#    At minimum set ADMIN_EMAIL and ADMIN_PASSWORD (10+ characters).

# 3. Create the database and load the menu, tables and first owner login
npx prisma db push
npm run db:seed

# 4. Start the app
npm run dev
```

Open <http://localhost:3000> for the website and <http://localhost:3000/admin> for the dashboard (sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`).

To test on a phone on the same Wi-Fi, set `NEXT_PUBLIC_SITE_URL` to your computer's address, e.g. `http://192.168.1.130:3000`.

### Useful commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the app in development mode |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | Check code style |
| `npm run typecheck` | Check TypeScript types |
| `npm test` | Run the unit tests |
| `npm run db:seed` | Load menu, tables, offers and the first owner login |
| `npm run db:reset` | **Wipe** the local database and seed it again |
| `npm run staff:password -- <email> <password>` | Create a staff login or reset its password |
| `npx prisma studio` | Browse the database in your browser |

---

## Project layout

```
prisma/
  schema.prisma          Database tables (bookings, orders, payments, menu, …)
  seed.ts                Starter data: menu from src/data/menus.ts, tables, offers, owner login
  set-staff-password.ts  Create/reset a staff login
  sync-photos.ts         Copy menu photos from src/data/menus.ts into the database
public/
  images/                Food, interior and menu photos
  uploads/               Photos uploaded in the dashboard (not committed)
src/
  app/
    (site)/              Customer pages (the "(site)" folder does not appear in URLs)
    admin/               Management dashboard pages
    api/                 API routes — see docs/ARCHITECTURE.md for the list
    pay/return/          Where Stripe sends customers back after paying
    poster/[slug]/       Printable QR posters
  components/            React components (admin/ = dashboard only)
    account/             Customer account page pieces
    order/               Online ordering helpers
  data/                  Fixed content: restaurant details, menus, pizza toppings
  lib/
    db.ts                Prisma database client
    booking.ts           Time and slot helpers (London time)
    resdiary.ts          Optional ResDiary integration
    platform/            Business logic — bookings, orders, payments, email, sessions…
  types/                 Shared TypeScript helpers
  middleware.ts          Sends signed-out visitors from /admin to the login page
tests/                   Unit tests (Node's built-in test runner)
docs/
  ARCHITECTURE.md        How the pieces fit together
  PRODUCTION.md          Checklist before going live
```

More detail: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**. Before launching: **[docs/PRODUCTION.md](docs/PRODUCTION.md)**.

---

## Conventions

- **Money is stored in pence** as whole numbers (`totalPence: 1250` = £12.50). Use `formatMoney()` to display.
- **Dates are `YYYY-MM-DD` strings and times are `HH:MM` strings in London time** (`src/lib/booking.ts`).
- **Two restaurants**, identified by `locationId`: `"manchester"` and `"chorlton"`. Staff work in one branch at a time (branch switch in the dashboard); dashboard actions check the record belongs to that branch.
- **Business logic lives in `src/lib/platform/`.** API routes and pages should stay thin and call into it.
- **Never trust the browser**: prices are recalculated on the server (`priceBasket`), and references in public links are random (`uniqueRef`).
- **Secrets go in `.env`**, never in code. Stripe and Uber keys are entered per restaurant in *Admin → Settings*.
