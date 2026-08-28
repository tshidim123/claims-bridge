# Admin end-to-end checklist

Use only a real, explicitly bootstrapped staff identity and real persisted records. Never seed demo staff, clients or claims for this checklist.

## Authentication and access

- [ ] Unauthenticated `/admin` is sent through Clerk sign-in and returns safely.
- [ ] Authenticated non-staff is denied without role or directory disclosure.
- [ ] Active staff can open permitted admin routes.
- [ ] Suspended staff is denied immediately.

## Operations

- [ ] Claims queue search, filters, assignment, priority, notes and status transition work through canonical services.
- [ ] Evidence request and review transitions use the canonical graph.
- [ ] Documents show safe metadata and honestly show the R2-unavailable state.
- [ ] Client correspondence can be read, replied to, closed and reopened according to permissions.
- [ ] General client actions can be created and completed/cancelled safely.

## Staff and clients

- [ ] Team lists real staff only; provisioning resolves an existing verified Clerk email.
- [ ] Role changes and suspension/reactivation require confirmation and preserve SUPER_ADMIN safety.
- [ ] Client directory and protected operational profile show minimised data.
- [ ] A permitted correction updates only allow-listed fields and rejects stale saves.

## Audit and privacy

- [ ] Major staff operations appear in Audit with safe actor/target references.
- [ ] Audit exposes no message body, note body, PII values, raw IDs or storage keys.
- [ ] Client pages never show assignment, priority, internal notes, staff audit or staff read cursors.
- [ ] No admin route appears in the sitemap and admin metadata is noindex/nofollow.

## Phase 10G execution record

- [ ] Production SUPER_ADMIN bootstrap completed with an explicitly configured real Clerk identity.
- [ ] Authenticated production route verification completed and recorded by the operator.
- [ ] If the bootstrap identity or production origin is unavailable, mark the above items BLOCKED; do not create test staff or substitute local browser assumptions.
