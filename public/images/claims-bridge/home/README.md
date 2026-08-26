# Homepage artwork

Production targets:

- `hero-bridge-environment.webp` (2400×2400) and `hero-bridge-environment-mobile.webp` (1440×1800)
- `evidence-vault.webp` (2400×2400, alpha) and `evidence-vault-mobile.webp` (1200×1800, alpha)
- `portal-atmosphere.webp` (2400×1400) and `portal-atmosphere-mobile.webp` (1200×1600)

Do not add temporary imagery. Export, crop, accessibility and byte-budget requirements are defined in `design-system/claims-bridge/visual-assets.md`.

The homepage keeps its CSS fallback beneath each optional source. A path in the target registry does not activate a request; pass the approved sources to `ArtworkSlot.artwork` only after both variants exist and pass review.
