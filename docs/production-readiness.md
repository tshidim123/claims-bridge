# Claims Bridge production readiness

## Ready architecture

- Clerk authentication with database-authoritative staff RBAC
- Neon PostgreSQL and Drizzle persistence
- Staff audit foundation and controlled admin operations
- Claim workflow, evidence, messaging and in-app notifications
- Public website and governed Knowledge Hub

## Deferred or requiring configuration

- R2 private document storage and binary review: credentials are intentionally absent.
- Monitored contact channel: the current public Contact route does not deliver submissions to a monitored destination.
- Email, SMS and push delivery: not configured.
- Analytics: no analytics platform is installed.
- Verified company details and launch-specific operational contacts.
- External privacy, terms, cookies, complaints, compensation-marketing and jurisdiction-specific legal/compliance review.

The `STAFF_BOOTSTRAP_CLERK_USER_ID` variable is temporary bootstrap configuration, not a permanent application dependency. Set it only for the controlled initial bootstrap, verify access, then remove it. `BOOTSTRAP_SUPER_ADMIN_CLERK_USER_ID` remains accepted only as a compatibility alias. Do not record secret values or real identity IDs in this document.

Before deployment, run `npm run production:check`, `npm run production:smoke`, `npm run typecheck`, `npm run lint` and `npm run build`. The smoke check requires the real canonical HTTPS origin. Do not label deferred capabilities as production-ready.

## Current verification record

Local core environment checks pass for Clerk and Neon, and the schema verifier reports all 17 migrations applied. No real bootstrap identity or canonical production URL is currently configured in this workspace, so production SUPER_ADMIN bootstrap, production-domain verification and authenticated production smoke testing remain BLOCKED rather than being represented as complete. R2 remains intentionally unconfigured.
