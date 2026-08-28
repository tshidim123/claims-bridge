# Claims Bridge controlled production deployment checklist

Use this checklist only with the real production Clerk instance, production origin and production database. Do not substitute fake staff or development identities.

## Before deployment

- [ ] Confirm `NEXT_PUBLIC_SITE_URL` is the canonical HTTPS origin.
- [ ] Confirm production Clerk publishable/secret keys belong to the production instance.
- [ ] Confirm `DATABASE_URL` points to the intended production Neon database.
- [ ] Run `npm run env:check`, `npm run production:check`, `npm run typecheck`, `npm run lint`, and `npm run build`.
- [ ] Run database verification and confirm migration count is 16 with no drift.
- [ ] Confirm R2 is intentionally deferred or separately approved; do not represent binary review as available.

## Controlled bootstrap

- [ ] Identify the real intended Clerk account and verify its email in Clerk.
- [ ] Temporarily set `STAFF_BOOTSTRAP_CLERK_USER_ID` in the protected production environment.
- [ ] Run `npm run staff:bootstrap` once from a controlled operator context.
- [ ] Record only the generated safe staff reference.
- [ ] Confirm a `STAFF_BOOTSTRAPPED` audit event exists.
- [ ] Remove the temporary bootstrap variable after successful verification.
- [ ] A repeat run for the same sole active SUPER_ADMIN is a safe no-op; any other existing staff state must fail closed.

## Authenticated verification

- [ ] Sign in as the real SUPER_ADMIN through production Clerk.
- [ ] Verify `/admin`, `/admin/claims`, `/admin/messages`, `/admin/evidence`, `/admin/documents`, `/admin/client-actions`, `/admin/clients`, `/admin/search`, `/admin/team`, `/admin/audit` and `/admin/system`.
- [ ] Verify non-staff, suspended staff and insufficient-permission identities are denied.
- [ ] Verify client corrections, audit filtering, team lifecycle and R2-unavailable document behaviour using approved real records only.
- [ ] Verify HTTPS, canonical redirects, Clerk callback/origin configuration, private caching and security headers.

## Stop conditions

Stop and mark the item BLOCKED if the production origin, production Clerk configuration, explicit bootstrap identity or approved test records are unavailable. Never weaken protections or seed fake data to complete this checklist.
