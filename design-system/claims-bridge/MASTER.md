# Claims Bridge design system

This is the Phase 1A source of truth. Page overrides belong in `pages/` and may only change local composition, never accessibility or semantic-token rules.

## Direction

Claims Bridge is a premium legal-fintech product: calm, exact, evidence-led and visibly modern. The environment is deep midnight navy with directional blue light, architectural connection lines and warm off-white typography. Glass is reserved for navigation, controls, overlays and status surfaces; reading surfaces stay materially quiet.

The UI/UX Pro Max synthesis informed the dark-mode, interaction, responsive and accessibility rules. Its default legal serif/gold treatment was intentionally rejected because it would pull the product toward a traditional solicitor-template aesthetic.

## Palette

| Role | Token | Value |
| --- | --- | --- |
| Canvas | `--color-canvas` | `#050b16` |
| Deep canvas | `--color-canvas-deep` | `#02060d` |
| Elevated navy | `--color-surface` | `#0a1527` |
| Primary text | `--color-text` | `#f5f3ed` |
| Secondary text | `--color-text-muted` | `#a9b7c9` |
| Quiet text | `--color-text-quiet` | `#7f91a8` |
| Electric blue | `--color-accent` | `#3d7cff` |
| Ice blue | `--color-accent-ice` | `#a8ddff` |
| Cyan | `--color-accent-cyan` | `#4dd8e8` |
| Success | `--color-success` | `#45d5a1` |
| Warning | `--color-warning` | `#ffc766` |
| Danger | `--color-danger` | `#ff7d8e` |

Do not use success, warning or danger as decoration. Status cannot be communicated by colour alone.

## Typography

- UI and body: Geist variable sans, 16px minimum body size, 1.55–1.7 line height.
- Editorial/display: Geist with tighter tracking and controlled weight contrast; no generic legal serif.
- Reference/data: Geist Mono only for claim references, compact metadata and technical identifiers.
- Fluid display scale: `clamp(2.75rem, 7vw, 6.9rem)` with shorter line lengths.

## Layout

- Container: fluid gutters from 20px to 56px, max width 1440px.
- Reading measure: 68ch.
- Touch target: 44px minimum.
- Desktop navigation becomes the mobile sheet below 1120px so the mega menu never compresses on small laptops.
- Portal sidebar is persistent above 1024px and becomes a horizontally scrollable, labelled mobile rail below it.

## Material

Glass uses multiple layers: tinted base, illuminated border, inset top highlight, specular pseudo-element, depth shadow and background saturation. Strong blur is limited to navigation and overlays. Every glass treatment has a solid translucent fallback, a reduced-transparency override and contrast-safe text.

Bespoke artwork production, export and responsive integration rules live in `visual-assets.md`.

## Motion

- Quick: 160ms; standard: 240ms; slow: 420ms.
- Primary easing: `cubic-bezier(.16, 1, .3, 1)`.
- Animate opacity and transform only for navigation and emphasis.
- `prefers-reduced-motion: reduce` removes non-essential transitions, transforms and scrolling animation.

## Accessibility invariants

- Skip link is the first focusable control.
- Visible `:focus-visible` ring is never removed.
- Disclosure navigation uses buttons with `aria-expanded` and `aria-controls`.
- Mobile navigation uses a native modal dialog for focus containment, Escape handling and screen-reader semantics.
- Inputs always have visible labels, descriptive text and nearby `role="alert"` errors.
- Statuses include text labels and never rely only on colour.
- No text is placed directly on a visually complex refractive layer without an opacity-protected inner surface.

## Prohibited patterns

No decorative blobs, fake metrics, fake testimonials, generic bento grids, gratuitous pills, gradient text, constant glow, meaningless charts, stock legal imagery, or continuous JavaScript/WebGL animation loops.
