# Authentication foundation

Claims Bridge uses Clerk for authentication and session management. Configure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in the deployment environment (and later `CLERK_WEBHOOK_SIGNING_SECRET` for verified webhooks). No secrets belong in source control.

Clerk owns identity and sessions; PostgreSQL will later own client profiles, assessments, claims, documents, messages and audit data. The eligibility handoff intentionally passes only a safe internal destination to sign-up and does not persist assessment answers or place them in URLs/cookies.
