# Eligibility domain architecture

Phase 2A keeps the preliminary assessment domain separate from the React interface.

## Boundaries

- `types.ts` defines question discriminated unions, serialisable answers/state, branching conditions, evidence recommendations and outcome categories.
- `src/content/eligibility/questions.ts` is the ordered question configuration and the single source for legal/helper wording, validation metadata, visibility and directed next-step rules.
- `flow.ts` evaluates conditions, selects the next visible question, follows configured branch overrides and removes answers made irrelevant by an upstream change.
- `validation.ts` converts question metadata into Zod-backed runtime validation. It handles required choices, multiple choice, dates, money, text/address capability and cross-checks tenancy end against tenancy start.
- `state.ts` owns the versioned state shape and validates data read from browser storage before it reaches the interface.

## Current persistence

The active `AssessmentState` is JSON serialisable and versioned as `1`. Phase 2A.1 keeps it in React state only; the shape is ready for a later secure save/resume adapter and does not write answers to browser storage.

The current questions intentionally avoid direct identifiers, free-form address capture and document uploads. Even so, browser storage is not the production persistence boundary.

## Future authenticated hand-off

A later account/claim phase should:

1. Revalidate the submitted state against the current question and state schemas on the server.
2. Map the configuration/version to a durable assessment record rather than trusting client-side outcome fields.
3. Persist answers through an authenticated, authorised server boundary with retention and deletion rules.
4. Recalculate visibility, evidence recommendations and preliminary route from trusted answers.
5. Record legal-content and assessment-engine versions for auditability.
6. Create a claim only after explicit user confirmation; completing Phase 2A does not create one.

Analytics should use only the configured `analyticsEventId` values and safe categorical states. Raw money, dates, addresses or free text must not be placed in analytics event names or payloads.
