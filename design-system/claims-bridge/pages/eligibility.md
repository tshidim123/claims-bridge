# Eligibility — Phase 2A composition override

This page extends `../MASTER.md`. The global palette, typography, material, motion and accessibility rules remain authoritative.

## Product posture

The eligibility checker is a preliminary assessment workspace, not a legal decision engine. Its visual sequence should move from an open introduction into a controlled evidence path: context → one clear question → review → qualified route. Outcome language remains configurable and legally reviewable.

## Composition

- Desktop uses a horizontal seven-stage route, a quiet current-stage context rail, one strong central glass workspace and a materially restrained guidance column.
- Tablet removes the side rails and retains a compact stage path above the glass workspace.
- Mobile uses a compact active masthead, a seven-segment stage indicator, one question at a time, stacked option controls and sticky continuation actions with safe-area padding.
- Review is an indexed editorial record rather than a stack of cards. Each relevant answer has a labelled edit action.
- Outcome screens use one connected five-node signal, reason rows, an ordered next-step path and a contextual evidence index.

## Material

- Strong liquid glass is reserved for the introduction object and the assessment workspace.
- Progress, context, review rows and evidence recommendations use lines, rails and quiet surfaces rather than nested glass cards.
- Selected answers activate an inset cyan edge, contained light and a native input state. Hover moves a specular layer across the material without scaling the control.
- Reduced-transparency mode replaces refractive surfaces with the elevated solid surface token.

## Interaction and motion

- Every step change announces the stage and moves focus to the new question, review heading or outcome heading.
- Direction-aware transitions use opacity and a short horizontal translation. Reduced motion removes both.
- Native radios, checkboxes, date inputs, dialog and details elements retain keyboard and screen-reader behaviour.
- Back follows actual visited history. Editing from review returns directly when no new conditional follow-up is needed, otherwise the newly relevant path is completed first.
- Restart uses a native modal confirmation and clears the tab-session assessment state only after explicit confirmation.

## Responsive and accessibility invariants

- All answer and action targets are at least 44px high with at least 8px separation.
- Long option labels wrap and never truncate.
- Active and completed stages include text; colour is never the only status signal.
- Validation appears next to the current question, uses `role="alert"`, is connected with `aria-describedby`, and receives focus after an invalid continue action.
- Focus scroll is offset from the fixed public navigation so step headings and their contextual eyebrow remain visible.
- Sticky mobile actions include `env(safe-area-inset-bottom)` and do not cover answer content.
- Forced-colours mode removes material-only effects and preserves selected, focused and bordered states.

## Content safety

- No outcome says that a user is eligible, owed compensation or likely to succeed.
- Jurisdiction is established first; unsupported or uncertain locations receive a short qualified route.
- Missing documents and uncertain answers never trigger automatic rejection.
- No compensation, success percentage or case value is calculated.
- No identity document, National Insurance number, bank login, payment card or document upload is requested.
