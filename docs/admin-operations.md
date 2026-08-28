# Claims Bridge admin operations

## Access model

Clerk authenticates a person; it does not grant Claims Bridge staff access. Every `/admin` request resolves the Clerk user ID to an active `staff_users` record and then applies the database-backed role and permission matrix. Suspended staff are denied immediately.

## Initial bootstrap

1. Identify the intended real Clerk account through the organisation's controlled process and ensure it has a verified email.
2. Set `STAFF_BOOTSTRAP_CLERK_USER_ID` securely and temporarily.
3. Run `npm run staff:bootstrap` once.
4. Record the generated staff reference through the approved secure channel.
5. Sign in and verify `/admin` and `/admin/access`.
6. Provision additional staff from Team using an existing verified Clerk email.
7. Remove the bootstrap variable after successful setup.

Bootstrap verifies the explicit Clerk identity through the server SDK before writing. It never promotes the first visitor, uses an email domain, or exposes a public enrollment route. Repeated bootstrap is refused once staff records exist, except for a safe no-op against the same sole active SUPER_ADMIN. `BOOTSTRAP_SUPER_ADMIN_CLERK_USER_ID` remains a compatibility alias only; new operational runbooks use `STAFF_BOOTSTRAP_CLERK_USER_ID`.

## Staff access

Roles and permissions are code-controlled: SUPER_ADMIN, ADMIN, CASE_MANAGER, EVIDENCE_REVIEWER, SUPPORT and READ_ONLY. Team management requires `STAFF_MANAGE`; viewing requires `STAFF_VIEW`. High-impact changes require confirmation and the last active SUPER_ADMIN cannot be suspended or demoted.

Suspension removes Claims Bridge operations access without deleting the Clerk identity. Reactivation is a separate controlled operation. If all staff are suspended or the last SUPER_ADMIN account is unavailable, recovery must use a reviewed server/database procedure; there is no public bypass.

## Operations and corrections

Claims, evidence, documents, messages and client actions use their existing canonical services. Client corrections are limited to allow-listed operational fields that exist in the profile schema, are optimistic-concurrency checked, and are audited by changed field name only. Ownership, Clerk identity, assessments, claims and history cannot be edited here.

The audit explorer is append-oriented and does not expose raw IDs, message bodies, note bodies, storage keys or unrestricted metadata search.

## Readiness boundaries

In-app messaging and notifications are available. Private document storage remains intentionally unconfigured until R2 is provisioned; metadata may be visible but binary review/download must remain unavailable. The public contact route has no monitored submission channel, so it must not be described as live support intake.

Run `npm run env:check`, `npm run content:check`, `npm run db:verify`, `npm run typecheck`, `npm run lint`, and `npm run build` independently before release. These checks report presence/status only and never print secret values.

## Recovery and rollback

Do not bypass authorization through a browser route. If all staff accounts are suspended or the last SUPER_ADMIN identity is unavailable, use a reviewed, access-controlled server/database recovery procedure and preserve the audit trail. A failed provisioning or correction transaction must roll back its associated audit event. Remove temporary bootstrap configuration after a successful initial bootstrap; never leave it as an unattended permanent access mechanism.
