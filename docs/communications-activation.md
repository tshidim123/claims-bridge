# Communications activation contract

This pass preserves the certified lifecycle system, staff preferences, communications operations,
permissioned retry and explicit claim-creation boundaries. The registry now contains 23 events,
including controlled service communications and an exactly-once new-client staff alert. It adds
transactional admin actions, local previews and automatic processing. It does not activate Resend
or change Production.

## Preview

Run `npm run dev` and visit `/dev/communications`. The canonical registry supplies all 23
event choices. HTML at 390px/600px, plain text, subject, preheader, template/version,
audience, channels and destination are available. Scenarios cover long names/references/titles
and absent due dates. Fixtures use the canonical assessment evidence recommendations.

The page performs no client/staff database reads and cannot send. The iframe is sandboxed with
a restrictive CSP and supports blocking images. The existing live-text Claims Bridge brand,
reference, next steps and security notice do not rely on images. No new image service or tracking
asset was introduced. Email destinations are canonical, absolute URLs; deployed builds require
HTTPS. Local preview bypasses the Clerk handshake because it contains only fabricated data.

`NODE_ENV !== development` or a Vercel deployment returns `notFound()`; proxy also returns an
actual 404 before streaming. Hiding navigation is not the security boundary.

## Automatic execution

`.github/workflows/communications.yml` invokes `POST /api/internal/communications/process`
every five minutes, offset to minutes 2, 7, 12, etc. The workflow has no checkout, third-party
actions, database access or email-provider credentials. It sends only a Bearer authorization
header to the configured canonical HTTPS origin, without redirects or query-string secrets.

Why not minute-level Vercel Cron: the repository establishes no paid Vercel plan. Hobby permits
only daily cron, which is inappropriate for transactional mail. The checked-in GitHub schedule
is a production-capable alternative without assuming a paid Vercel cron frequency. See
[Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing) and
[GitHub scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

GitHub scheduling is best-effort, not a five-minute delivery SLA. Jobs run from the default branch,
can be delayed/dropped during load, and public-repository schedules may be disabled after 60 days
without activity. Operators must enable Actions, monitor failed/missing runs and queue age, and
ensure sufficient Actions allowance. For a strict latency SLA, an external managed scheduler can
call this same endpoint without application changes. The endpoint is not a public queue drain.

External activation requires:

- Application secret `COMMUNICATIONS_CRON_SECRET`: at least 32 random characters.
- GitHub repository secret of exactly the same name/value.
- GitHub repository variable `NEXT_PUBLIC_SITE_URL`: canonical HTTPS origin only.
- The approved workflow on the default branch and an enabled schedule.

None of those external settings, secrets, pushes, merges or deployments were performed here.

## Worker guarantees and limits

- At most 20 rows per invocation, a 40-second work budget, and 18-second headroom before starting
  another row. The Next route advertises a 60-second maximum. Provider requests time out after
  8 seconds; identity lookups after 5 seconds. Failed invocations leave recoverable leases.
- Postgres `FOR UPDATE SKIP LOCKED` and a transaction atomically claim work. No select/update race.
  Attempts are recorded at claim time. Final writes compare the exact processing lease.
- A five-minute-old processing lease is recoverable; recent leases are not reclaimed.
- The normalized recipient and complete validated provider request are persisted before sending.
  Resend receives the logical email reference as its `Idempotency-Key`. Retries replay the same
  request, including sender, reply-to, subject and rendered content, even after code/config changes.
- Resend retains keys for 24 hours. Automatic and manual recovery stop after 23 hours from the first
  provider attempt, leaving a safety margin. `DELIVERY_UNCERTAIN` requires provider reconciliation,
  never a blind resend with a new key. See [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).
- The shared five-attempt cap remains. Temporary failures back off exponentially (two minutes after
  the first attempt, capped at one hour). Permanent failures and suppression stop immediately.
  Missing provider/site configuration leaves the queue pending rather than consuming attempts.
- Suppression is rechecked on every attempted send, including frozen retries. A verified account
  email change affects only new logical communications. Historical recipient snapshots never change.

The provider abstraction stores only the required ID or a controlled failure code; raw provider
responses are not retained. Resend 408/409/429/5xx and network failures are bounded retry cases.
Invalid responses, identity transient failures, permanent absence and unverified addresses remain
distinct operational categories. Manual retry retains its central server RBAC, state checks,
transactional audit and original payload/template/dedupe identity.

## Webhook

`POST /api/webhooks/resend` bounds the actual raw UTF-8 stream to 128,000 bytes, verifies Svix ID,
timestamp and signature, then parses only required event fields. Installed Svix 2.x returns no
parsed JSON: verification and JSON parsing are deliberately separate.

Only documented delivered, bounced, complained, failed and suppressed lifecycle events are
retained. Acceptance is recorded by the worker, not inferred as delivery. Ledger insertion,
suppression and state changes share one transaction and unique provider-event identity. A duplicate
event is a no-op. Persistence failure (including arrival before provider-ID persistence) returns
503 so the provider retries. Invalid signatures return 400 and oversized bodies 413. Later delivery
events cannot undo bounce/complaint suppression. Confirmed delivery is not regressed by a failure
event arriving before or after it; operational history applies the same confidence ordering.
See [Resend events](https://resend.com/docs/webhooks/event-types).

## Controlled admin communication actions

Client detail and unconverted pre-account assessment detail provide a bounded, preset-driven form.
Only ACTIVE staff with the central `COMMUNICATIONS_SEND` permission (ADMIN and SUPER_ADMIN) may
trigger it. Browser input contains safe references, not recipient email or HTML. Server-side
ownership checks and target locks prevent cross-client targeting and concurrent duplicate actions.

| Preset | Persisted action and communication |
| --- | --- |
| REQUEST_DOCUMENTS | Canonical evidence requirement, EVIDENCE_REQUESTED and client notification |
| NEXT_STEPS | Canonical client action, CLIENT_ACTION_REQUIRED and client notification |
| ACTION_REQUIRED | Canonical client action, CLIENT_ACTION_REQUIRED and client notification |
| MISSING_INFORMATION | Canonical confirmation action, CLIENT_ACTION_REQUIRED and client notification |
| CLAIM_UPDATE | Actual current stage/next step in the client timeline, email and notification |
| START_CLAIM_REMINDER | Eligible completed assessment without a claim; secure continuation, no claim creation on click |
| ASSESSMENT_FOLLOW_UP | Persisted assessment and canonical outcome; secure account/assessment destination |
| GENERAL_SERVICE_UPDATE | Bounded plain-text title/body/next step and a controlled internal destination |

Domain writes, outbox entries, in-app notifications and the `COMMUNICATION_TRIGGERED` audit share
one transaction. A stable request UUID deduplicates retries. Audit metadata contains only opaque
communication references and controlled preset/event values, never recipient or message content.
Authenticated delivery uses DEFERRED CLIENT; legitimate pre-account follow-up uses the persisted
recipient snapshot. The form previews subject, summary, real context, destination and what will
occur, and returns the queued communication reference. Client detail reuses the existing outbox
for safe queued/sent/delivered/failed history and links to the communications workspace.

Document requests explicitly say secure uploads are not yet available; clients prepare records
and consult the portal, not email sensitive attachments. Next-step mail includes current stage,
controlled progress wording and an actual due date when supplied. Informational service updates
do not manufacture tasks; staff use an action preset when a portal obligation is needed.

The existing pre-account assessment event represents the new lead and assessment together.
NEW_CLIENT is emitted only by the winning initial client-profile insert, not login/profile edits.
It uses DEFERRED STAFF, active/relevant role filtering, dedupe and independent Email/In-app CLIENTS
preferences. Preferences never grant permission.

## Environment and non-production safety

The pure communications configuration module powers presence-only environment checks and health
reporting. `.env.example` contains placeholders/blank delivery settings, never real secrets.

| Setting | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Server-only sending authorization |
| `CLAIMS_BRIDGE_FROM_EMAIL` | Verified sender mailbox/display name |
| `CLAIMS_BRIDGE_REPLY_TO_EMAIL` | Operational reply destination |
| `RESEND_WEBHOOK_SECRET` | Webhook verification |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for links and future owned image assets |
| `COMMUNICATIONS_CRON_SECRET` | Internal processor authorization |
| `COMMUNICATIONS_DEV_RECIPIENT_ALLOWLIST` | Exact comma-separated developer-controlled test addresses |

Only a Vercel Production build (`NODE_ENV=production`, `VERCEL_ENV=production`) permits normal
production recipients. Local development, local production-mode servers, tests and preview builds
require an explicit allowlist even with a real API key. No wildcard or silent recipient override
exists. Empty allowlist means no processing outside Production. Keep separate Development provider
credentials and allowlist only addresses developers control.

System health distinguishes queue availability, provider/sender/reply-to/webhook configuration,
automation authorization and send policy. Secret presence does not prove DNS verification, active
scheduler execution or actual delivery.

## Database

Migration `0025_communication_provider_snapshot` adds only `provider_request` and
`provider_first_attempt_at`. Existing lease timestamps were reused; no duplicate state columns.
These fields are necessary to freeze a retry request and bound its provider idempotency lifetime
without changing the logical payload or misusing `sent_at`/`last_attempt_at`.

Pre-upgrade PROCESSING rows have no durable idempotent request and are conservatively classified
`DELIVERY_UNCERTAIN`; their identity and history remain intact. Quiesce any old worker before a
future rollout. All earlier applied migrations are unchanged. The new schema metadata snapshot
also includes the previously hand-authored communications migrations; no old snapshot was edited.

The initial generator failed because Windows sandboxing prevented esbuild spawning (`EPERM`),
not because of SQL. Recovery verified the already-applied 0025 addition and preserved it.
Migration `0026_manual_communication_audit` adds only the truthful `COMMUNICATION_TRIGGERED`
audit enum value. The guarded Development-only script verified the existing migration hashes
(allowing Git newline normalization) and applied that one additional migration. Both additions
are applied and Development now has **27 migrations**. Production remains
at the user-reported **21**, untouched and not queried. Production migration is a separate future,
authorized release operation, not an action performed in this pass.

## UX and security review

Assessment completion places the result, safe reference, truthful receipt wording and one dominant
Start Claim action together. Mobile uses one in-flow sticky action with safe-area spacing; no
duplicated fixed CTA. Account creation/attachment remains separate from explicit claim creation.
Signed-in receipt failure cannot report an already-saved assessment as lost. Clicking Start Claim
reuses its saved assessment reference instead of saving another assessment.

The focused review covered recipient/header/HTML injection, canonical URLs, preview gating,
processor authorization/replay, webhook forgery/replay, recipient snapshots, suppression, secret
and audit leakage. Secure-message bodies, staff notes, storage keys and Clerk IDs remain excluded
from email output. Existing role/ownership/preference and manual-retry controls remain in force;
preferences do not grant authorization. No marketing dispatch was added.

## Verification and QA limits

The new offline tests render all 23 events across three fixture scenarios, verify real Svix
signatures, UTF-8 size bounds, provider classifications/idempotency, environment secrecy,
production gating, processor authorization/bounds, recipient policy, and eligibility wording.
The 163-test baseline is retained; obsolete source assertions track the relocated implementation.
`test:claims` and `content:check` each pass **193 tests**, including 30 added focused tests.
Manual policy, authorization, audit privacy, CTA safety and professional rendering are covered.

`npm run test:communications:db` uses a separately named temporary schema on the verified Development
branch, mocked provider/identity calls and fabricated addresses. All **17 integration subtests**
passed (18 including their parent): concurrent claiming, frozen replay, lease ownership/recovery,
webhook replay/rollback/ordering, suppression, new verified-address communication, manual RBAC,
cross-client targeting, manual dedupe/audit rollback, evidence/action integration, truthful claim
updates, reminder eligibility, pre-account snapshots and concurrent NEW_CLIENT/preferences.
Temporary schemas were removed. No real
recipients were contacted and no existing Development records were mutated by these tests.

Browser QA passed all 23 templates, mobile/desktop and seven viewport checks, and saved local
preview screenshots. It then timed out navigating the authenticated admin notifications route
during Clerk session refresh; no assessment was submitted. Authenticated admin interaction and
live account-conversion browser QA are **not certified** by this pass. Local preview was further
decoupled from the public-header identity lookup and verified HTTP 200 without a middleware error;
its Production 404 boundary remains tested. These checks are not cross-email-client visual QA.
The repeatable script is `scripts/qa-communications.mjs`.

Presence-only `env:check`, Development `db:verify` (27 migrations), TypeScript, ESLint,
`git diff --check` and the final optimized production build pass.
Delivery provider, sender, reply-to, webhook and cron credentials remain unconfigured; Development
sending is blocked without an explicit test allowlist. Configuration presence is not activation.

Before real activation, supply provider/sender/reply-to/webhook/cron configuration, verify the sender
domain using Resend-issued SPF/DKIM records, choose a DMARC policy, activate the schedule and complete
an authorized staging smoke send/webhook check. No DNS values are guessed or configured here.
