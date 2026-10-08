# extynt-site

Website, closed-beta application and account backend for extynt.com.

- Next.js 16 (App Router, TypeScript strict), deployed on Vercel.
- Neon Postgres with Drizzle ORM (`@neondatabase/serverless`). No row level security: the database is
  only ever accessed server-side. See `docs/security.md`.
- Auth.js (next-auth v5) with the Resend email provider: magic links only, database sessions, and
  sign-in gated to admins and active testers.
- Device sign-in and Ed25519 license tokens for the desktop app: `docs/app-auth-contract.md`.

## Routes

`/` landing, `/apply`, `/privacy`, `/login`, `/account`, `/activate`, `/admin`,
`POST /api/device/start`, `POST /api/device/token`, `POST /api/license/refresh`,
`GET /.well-known/extynt-license-key`, `/api/auth/*` (Auth.js).

## Local development

```sh
npm install
cp .env.example .env.local   # fill in values
npm run db:migrate
npm run dev
npm run check                # lint + typecheck + tests + build
```

Code limits (enforced by eslint, no exceptions): file 500 lines, function 80, complexity 10,
nesting 4, params 5.

## Owner setup

1. **Neon.** Create a Neon project (or use Vercel's Neon integration from the project's Storage tab,
   which provisions it and injects `DATABASE_URL` / `DATABASE_URL_UNPOOLED`). Otherwise copy the
   pooled string to `DATABASE_URL` and the direct string to `DATABASE_URL_UNPOOLED`.
2. **Migrations.** With the env set, run `npm run db:migrate` (uses `DATABASE_URL_UNPOOLED`). SQL lives
   in `drizzle/`; after schema changes run `npm run db:generate` and commit.
3. **Resend.** Create a Resend account and API key (`AUTH_RESEND_KEY`). Add the domain `extynt.com`
   in Resend and publish the DNS records it shows: SPF (TXT), DKIM (TXT/CNAME) and optionally DMARC.
   Wait until the domain shows as verified. Set `EMAIL_FROM` to e.g. `extynt <beta@extynt.com>`.
4. **Auth URL.** Set `AUTH_URL=https://extynt.com` (and `SITE_URL`). Magic links return to
   `https://extynt.com/api/auth/callback/resend`; no redirect allow-list is needed. For Vercel preview
   deployments set `AUTH_TRUST_HOST=true`.
5. **Secrets.**
   - `AUTH_SECRET`: `openssl rand -base64 33`.
   - `LICENSE_SIGNING_KEY`: `openssl genpkey -algorithm ed25519`. Paste the PEM (Vercel accepts
     multi-line, or use `\n`). Keep the private key out of git. The public key is served at
     `/.well-known/extynt-license-key`; embed it in the app (see the contract).
   - `ADMIN_EMAILS`: comma-separated owner email(s). Admins can sign in without a tester record.
   - `BETA_ENDS_AT`: ISO date when all beta access ends.
6. **Vercel.** Import the GitHub repo as a Vercel project (framework: Next.js). Set the env vars
   below for Production (and Preview if wanted). Deploy.
7. **DNS.** In Vercel, add the domain `extynt.com` (and `www`). At your registrar point the apex `A`
   record to `76.76.21.21` and `www` `CNAME` to `cname.vercel-dns.com` (or use the values Vercel
   shows). Keep the Resend SPF/DKIM records alongside them.

### Environment variables

| name                    | purpose                                      |
| ----------------------- | -------------------------------------------- |
| `DATABASE_URL`          | Neon pooled connection string                |
| `DATABASE_URL_UNPOOLED` | Neon direct string, for migrations           |
| `AUTH_SECRET`           | Auth.js secret, also salts rate-limit hashes |
| `AUTH_URL`              | `https://extynt.com`                         |
| `AUTH_RESEND_KEY`       | Resend API key                               |
| `EMAIL_FROM`            | sender, e.g. `extynt <beta@extynt.com>`      |
| `ADMIN_EMAILS`          | comma-separated admin emails                 |
| `BETA_ENDS_AT`          | ISO date; global access end                  |
| `LICENSE_SIGNING_KEY`   | Ed25519 private key, PEM                     |
| `SITE_URL`              | public origin (device `verification_uri`)    |

## Flow

Apply -> row in `applications` (pending) -> admin approves in `/admin` -> a `testers` row is created
and the sign-in email is sent -> the tester signs in -> `/activate` approves the app's device code ->
the app receives a 7-day license token and refreshes it while access lasts. Revoking a tester or a
single device, passing `access_until`, or passing `BETA_ENDS_AT` ends access at the next refresh (and
at expiry of the current token at the latest).

## Placeholders for the owner

- **Hero visual.** `src/components/PanelMock.tsx` is an HTML/CSS recreation labelled "illustrative
  recreation". Replace it with a real screenshot (for example `public/panel-hero.png` via
  `next/image`) when one exists.
- **Copy to review.** Landing text, FAQ, the three timing figures (taken from the 0.9.4 native
  evidence: one Mac, AE 26.2.1; remove if you would rather not publish them) and `/privacy`.
- No pricing, testimonials or logos are included by design.
