# Homepage — Phase 1B composition override

This page extends `../MASTER.md`; every global token and accessibility invariant remains authoritative.

## Narrative

The homepage is one connected path: uncertainty → understanding → check → evidence → assessment → progress → visibility → resolution. Architectural rails, nodes and document layers repeat across sections so the page reads as a single journey rather than a stack of modules.

## Composition

- Use oversized, low-weight editorial typography and asymmetric placement.
- Alternate open atmospheric space with opaque structural bands and selective high-strength glass.
- Reserve strong glass for the hero case object, eligibility preview, portal demonstration, evidence layers and final action surface.
- Use indexed rows, paths and publication-style lists instead of repeated feature cards.
- Keep the mobile composition intentionally linear: a tall hero object, vertical question sequence, vertical process spine and simplified portal window.

## Interaction and motion

- The homepage eligibility preview is explicitly non-operative and never returns an eligibility result.
- Native radios, fieldsets, buttons and details elements carry the interactive semantics.
- Motion is CSS-only and limited to slow material drift, specular travel and path illumination on decorative layers.
- No text, form control or essential status information moves continuously.
- Reduced motion and reduced transparency remove all non-essential material effects.

## Content safety

- Public copy uses conditional language: `may`, `could`, `depending on the circumstances` and `subject to review`.
- Example portal/status content is visibly marked as demonstration content.
- No compensation figures, outcomes, dates, clients, claim references, performance claims or regulatory affiliations are shown.

## Asset slots

- `/images/claims-bridge/home/hero-bridge-environment.webp`
- `/images/claims-bridge/home/evidence-vault.webp`
- `/images/claims-bridge/home/portal-atmosphere.webp`

Each slot must render a complete CSS-based fallback and must not request a missing image.

Desktop/mobile source dimensions, safe zones, object positions and activation rules are defined in `../visual-assets.md`. The hero, Evidence Vault and portal atmosphere are decorative because their concepts are already communicated in nearby semantic HTML.
