# Going live — checklist

The app runs well locally. These steps are needed before real customers use it.

## Must do

- [ ] **Database:** move from SQLite to a hosted database (e.g. PostgreSQL). Change `provider` in `prisma/schema.prisma`, set `DATABASE_URL`, run `npx prisma migrate deploy`. SQLite is a single file and is not suited to a hosted server.
- [ ] **`SESSION_SECRET`:** set a long random value (`openssl rand -base64 48`). Without it, sign-in does not work in production.
- [ ] **Staff logins:** create real accounts with `npm run staff:password -- you@example.com "a long password"`. There are no default passwords.
- [ ] **Stripe:** enter live keys for each restaurant in *Admin → Settings → Payments*, create a webhook in Stripe pointing to `https://<your-domain>/api/pay/webhook` (event `checkout.session.completed`) and set `STRIPE_WEBHOOK_SECRET`.
- [ ] **Do not set `ALLOW_DEMO_PAYMENTS`** in production. Without Stripe, customers cannot pay online, and nothing is marked as paid by mistake.
- [ ] **Email:** use a Double Zero mailbox for `SMTP_*` (the current local setup borrows another business's mailbox).
- [ ] **`NEXT_PUBLIC_SITE_URL`:** set to the real `https://` domain, so email links and Stripe redirects work.
- [ ] **Uploads:** photos uploaded in the dashboard are saved to `public/uploads/`. On most hosts this folder is wiped on every deploy — move uploads to storage such as S3, Cloudflare R2 or Vercel Blob.

## Should do

- [ ] **Roles:** the `kitchen` role can currently do everything an `owner` can (refunds, settings). Restrict sensitive actions in `src/app/api/admin/actions/handlers/` (`payments.ts`, `settings.ts`) to `staff.role === "owner"`.
- [ ] **Encrypt stored keys:** Stripe keys are stored as plain text in `LocationSettings`. Encrypt them at rest, or move them to environment variables.
- [ ] **Rate limits:** `src/lib/platform/rate-limit.ts` is in-memory and per server. With more than one server, use a shared store (Redis/Upstash).
- [ ] **Sign-out everywhere:** sessions are signed cookies, so signing out clears the cookie but a stolen cookie stays valid until it expires (12 h staff). If needed, add a `sessionVersion` field to `StaffUser` and include it in the token.
- [ ] **QR codes:** posters use the public service `api.qrserver.com` to draw QR images. Consider generating them in the app instead.
- [ ] **Backups** of the production database.
- [ ] **Error monitoring** (e.g. Sentry) and uptime checks.

## Before each release

```bash
npm run typecheck
npm run lint
npm test
npm run build
```
