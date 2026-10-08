# Security model

- The database (Neon Postgres) is never reachable from the browser. There is no client-side database
  access, no public connection string and no Row Level Security. Every query runs server-side in a
  route handler, server action or server component.
- **Every query is authorized in code.** Services in `src/lib/services/` take the caller's identity
  explicitly and check it before touching the store:
  - admin operations call `assertAdmin(actorEmail, ADMIN_EMAILS)` first and throw `ForbiddenError`;
  - device approval and lookup require a signed-in user whose tester record is active
    (`evaluateAccess`), and the device is created for that user id;
  - license refresh verifies the token signature, then checks the device belongs to the token's
    subject, is not revoked, and the tester is still active;
  - magic links are sent and honoured only for admins and active testers (`canSignIn`).
- The store (`src/lib/store/`) performs no authorization; it is only reachable through those services
  and the thin route handlers. Do not import it from new code without an authorization check.
- Admin identity comes only from the `ADMIN_EMAILS` env var. Email is verified by the magic link.
- Secrets (`AUTH_SECRET`, `AUTH_RESEND_KEY`, `LICENSE_SIGNING_KEY`, database URLs) are server env vars
  only. Nothing is prefixed `NEXT_PUBLIC_`.
- Device codes and user codes are stored as SHA-256 hashes. Rate-limit keys hash the subject (IP or
  user id) with `AUTH_SECRET`.
- The login form answers identically for every address so it cannot be used to find testers.
- Tests in `tests/admin.test.ts`, `tests/device-flow.test.ts` and `tests/refresh.test.ts` cover these
  checks against an in-memory store.
