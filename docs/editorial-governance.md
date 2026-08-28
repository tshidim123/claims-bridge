# Claims Bridge editorial governance

Knowledge Hub content is repository-managed and reviewed through pull requests. The current content interface is intentionally independent of a database or CMS so a future editorial repository can be placed behind the same read interface.

## Publication states

- `DRAFT` is working content and is never returned by public retrieval.
- `REVIEW` is content awaiting editorial or legal decisions and is never returned by public retrieval.
- `PUBLISHED` is eligible for public routes only after content validation passes.

## Legal review and risk

Every article has a `contentRisk` classification and a `legalReview` status. Low-risk product and organisation guidance may use `NOT_REQUIRED` where appropriate. Moderate-risk educational content must remain qualified. High-risk content about rights, remedies, liability, deadlines or compensation cannot be published unless `legalReview` is `REVIEWED`.

Review notes, source basis, owner and review dates are internal metadata. They are not rendered to visitors. Material legal wording still requires appropriate external professional review; the repository guard is a publishing control, not legal approval.

## Dates and freshness

Use the actual publication date for `publishedAt`. Change `updatedAt` only when the visible meaning or substance changes. `reviewedAt` records the latest editorial review and `nextReviewAt` drives internal `CURRENT`, `REVIEW_DUE` and `OVERDUE` checks. Builds must not update dates automatically.

## Adding an article safely

1. Give the article one clear renter question and a distinct purpose.
2. Choose an existing category and controlled topics.
3. Use truthful `Claims Bridge Editorial Team` attribution unless a verified author is configured.
4. Keep legal-sensitive assertions qualified and set the appropriate risk/review status.
5. Use real public routes and existing article slugs for relationships.
6. Add explicit related content only where it helps; cluster/category fallback supplies discovery.
7. Run `npm run content:check`, then TypeScript, lint and build checks.

Do not add popularity metrics, fake outcomes, testimonials, credentials, regulatory claims or location pages. Do not publish drafts or review-only content to make the library look larger.

## Review cycle

Review content when its `nextReviewAt` window is reached, when linked service behaviour changes, or when approved legal/product wording changes. Record meaningful changes in `updatedAt` and keep the article’s source basis and review notes current.
