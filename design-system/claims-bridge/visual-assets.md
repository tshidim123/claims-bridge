# Claims Bridge visual asset system

Status: Phase 1C production specification. This document extends `MASTER.md` and `pages/homepage.md`; it does not replace either source of truth.

## 1. Master visual language

Claims Bridge artwork visualises a controlled passage from uncertainty to clarity. “Bridge” is expressed through structural relationships rather than a literal bridge: suspended arcs, tension lines, exact spans, crossing planes, connected evidence nodes and a path that becomes more ordered as it moves through the scene.

Every major asset should contain three visual roles:

1. **Origin** — a quieter or partially obscured zone representing uncertainty or unstructured records.
2. **Connection** — one continuous structural path, span or evidence route.
3. **Resolved field** — a clearer, calmer area with better separation and more legible geometry.

The system is architectural, optical and evidence-led. It should feel commissioned for a premium legal-fintech product: highly realistic materials, restrained art direction, no narrative characters, no literal legal clichés and no speculative interface elements.

## 2. Material system

| Material | Behaviour | Use |
| --- | --- | --- |
| Optical glass | Clear mass, believable thickness, cool rim and restrained refraction | Primary spans, central evidence planes and protected cores |
| Smoked navy glass | 65–85% dark visual density with internal depth | Supporting frames and rear planes |
| Translucent ice glass | Lower-density layers with cold edge definition | Evidence sheets and transitional surfaces |
| Dark anodised metal | Matte-to-satin, almost-black navy rather than black | Structural anchors and rails |
| Polished graphite | Controlled reflection, never mirror-chrome | Bases, joints and precise load-bearing elements |
| Brushed titanium | Fine directional grain, low reflectance | Small connectors and verification details |
| Cyan internal light | Light contained within joints and routes | Connection state, not decorative neon |

Refraction must remain physically plausible. Use one primary refractive event per composition and let the surrounding material stay quiet. Avoid rainbow dispersion except for a slight blue iridescent edge visible only at grazing angles.

## 3. Lighting

- **Key:** cool directional area light from upper-left/front, approximately 35–45° above the subject.
- **Fill:** very soft neutral-navy fill from camera-right, one-and-a-half to two stops below the key.
- **Structural light:** cyan illumination inside selected routes, joints or document edges; never a global glow.
- **Background:** deep navy atmospheric falloff from `#0a1527` toward `#02060d`.
- **Highlights:** cold ice-blue edge reflections, closest to `#a8ddff`.
- **Shadows:** deep neutral navy, never crushed pure black; retain separation between graphite structures and canvas.
- **Success accent:** emerald near `#45d5a1` only when an artwork specifically represents a confirmed positive state. None of the seven first-production assets requires it.

The light direction must remain identical across the full family so assets can appear on the same page without looking assembled from unrelated campaigns.

## 4. Colour behaviour

- Canvas family: `#02060d`, `#050b16`, `#0a1527`.
- Structural blue: desaturated values around `#173761` and `#24529a`.
- Electric accent: `#3d7cff`, limited to small route activations.
- Cyan: `#4dd8e8`, controlled and mostly internal.
- Ice edge: `#a8ddff`, used on thin optical rims.
- Warm off-white belongs to HTML typography, not generated artwork.

Artwork edges should fall naturally into the page canvas. No asset may introduce purple, magenta, warm gold, bright red or a broad rainbow gradient. Keep total luminous area below roughly 12% of the frame.

## 5. Composition rules

- Use asymmetry with a clearly weighted focal region, not symmetrical sci-fi iconography.
- One continuous connection path should be traceable at a glance.
- Use five nodes only when the sequence specifically represents tenancy → deposit → protection → evidence → assessment.
- Maintain large low-detail regions for live HTML and responsive crops.
- Keep critical geometry inside the specified safe zone; outer areas are atmospheric bleed.
- Use depth in three bands: foreground structural edge, principal object, distant atmospheric plane.
- Document references are material planes with varied thickness and alignment, never paper sheets with generated writing.
- Render surfaces with enough local contrast to survive WebP compression without banding.
- Do not render logos, copy, numbers, interface controls or data visualisations.

## 6. Things to avoid

No real bridge photography; recognisable landmark bridges; people; gavels; wigs; courthouses; handshakes; piggy banks; coins; banknotes; shields; padlocks; folder icons; cloud-storage symbols; floating app icons; dashboards; charts; cryptocurrency motifs; circuit-board clichés; cyberpunk neon; gaming HUDs; space scenes; random spheres; purple blobs; excessive bloom; lens dirt; chromatic aberration; illegible microtext; fake brands; watermarks; signatures; or embedded typography.

## Existing homepage slot audit

The following measurements were captured from the Phase 1B implementation in Chromium with a 1200px-tall viewport. They establish the real crop envelope rather than an assumed component ratio.

| Viewport width | Hero slot | Hero ratio | Evidence slot | Evidence ratio | Portal stage | Portal ratio |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 390 | 436.8 × 464 | 0.941 | 370.8 × 560 | 0.662 | 358 × 519.1 | 0.690 |
| 768 | 462.5 × 544 | 0.850 | 714.2 × 640 | 1.116 | 714.2 × 605 | 1.181 |
| 1024 | 514.2 × 544 | 0.945 | 494.6 × 688 | 0.719 | 592.6 × 605 | 0.980 |
| 1440 | 696.4 × 691.2 | 1.008 | 695.5 × 688 | 1.011 | 842.1 × 605 | 1.392 |
| 1920 | 748.8 × 720 | 1.040 | 745.2 × 688 | 1.083 | 903 × 605 | 1.493 |

At 390px the hero intentionally overbleeds the viewport by about 23px on each side; its section contains that composition, so it does not create page-level horizontal scrolling. The Evidence Vault changes from tall on phone and 1024px landscape to nearly square on large desktop. It therefore uses a contained transparent object rather than destructive `cover` cropping. The portal asset is only environmental support behind the HTML interface and may tolerate wider crop variation.

## 7. Asset 01 — Hero bridge environment

**Files:** `home/hero-bridge-environment.webp` and `home/hero-bridge-environment-mobile.webp`

| Property | Desktop | Mobile |
| --- | --- | --- |
| Intended slot | Homepage hero, right architectural field | Homepage hero below primary copy |
| Source ratio | 1:1 | 4:5 |
| Master resolution | 2400 × 2400 | 1440 × 1800 |
| Minimum accepted | 1600 × 1600 | 960 × 1200 |
| Fit | cover | cover |
| Focal point | 61% x / 50% y | 50% x / 47% y |
| Safe zone | central 70%; leftmost 28% low-detail | central 74%; top 10% and bottom 8% atmospheric |
| Transparency | No; use a seamless navy edge falloff | No |

The five-stage structure is monumental but not enormous relative to frame. A suspended optical-glass span travels through five distinct connection joints. Thin document-like planes are integrated into the structure, with a polished graphite support beneath. The left third is quiet enough to coexist with the HTML headline at desktop. No stage labels are baked into the image.

Compression target: source WebP at visually lossless q82–86, maximum 420KB desktop and 260KB mobile. Next.js delivery quality is 82 with AVIF preferred and WebP fallback. The approved hero is the only image eligible for high-priority loading.

### Generation brief CB-VA-01D — desktop hero

**Copy-ready prompt:** Create a bespoke, photorealistic premium product-campaign render for the Claims Bridge legal-fintech homepage. Subject: a monumental abstract architectural span made from thick optical glass, smoked navy glass and dark anodised metal, connecting five distinct but unlabeled structural evidence nodes in one continuous route; subtle translucent document planes are integrated into the architecture, with a polished graphite foundation and fine brushed-titanium joints. Composition: square 1:1 frame, asymmetric, principal focal structure centred around 61% horizontal and 50% vertical, leftmost 28% deliberately low-detail deep-navy negative space for live HTML, all essential geometry inside the central 70%, outer 10–12% used only for atmospheric bleed. Lighting: cool directional key from upper-left/front, soft navy fill from camera-right, restrained cyan light contained inside a few connection joints, cold ice-blue glass rims, deep neutral-navy shadows, subtle caustics, no broad neon glow. Camera: premium architectural product visualisation, 45–55mm full-frame equivalent, eye level slightly below the span, three-quarter perspective, controlled convergence, no fisheye. Depth: crisp primary structure, readable foreground graphite edge, soft distant translucent planes and restrained depth haze. Visual hierarchy: glass span first, connected joints second, document layers third, atmosphere last. Palette: #02060d, #050b16, #0a1527, desaturated structural blue, small #3d7cff and #4dd8e8 accents, #a8ddff edge highlights. Realism: high-end physically based CGI, believable optical thickness, reflection and refraction, refined rather than futuristic. Exclude all text, letters, numbers, logos, UI, charts, people, real bridges, city skylines, gavels, scales of justice, shields, padlocks, coins, crypto aesthetics, gaming HUDs, purple, magenta, rainbow dispersion, strong bloom, floating spheres, watermarks and stock-render styling. Intended placement: right-hand visual field of a dark editorial homepage hero with live typography overlapping the quiet left edge. Output 2400×2400 master, 1:1, seamless dark-navy perimeter, WebP production derivative.

### Generation brief CB-VA-01M — mobile hero

**Copy-ready prompt:** Create the mobile art-directed companion to the Claims Bridge signature hero, preserving exactly the same bespoke optical-glass, smoked-navy-glass, graphite and brushed-titanium architecture and the same upper-left cool lighting direction. Subject: one vertically composed abstract structural span connecting five unlabeled evidence joints from lower uncertainty toward upper clarity, with a few translucent document planes integrated into the bridge-like structure. Composition: 4:5 portrait, focal point at 50% horizontal and 47% vertical, all essential joints inside the central 74%, top 10% and bottom 8% limited to quiet atmosphere so the live page can crop safely; no tiny peripheral detail. Camera: 50mm equivalent, slightly lower eye line, restrained three-quarter perspective, no wide-angle distortion. Depth and hierarchy: primary span sharply legible at phone size, document planes secondary, soft deep-navy haze behind. Lighting and palette: cool upper-left key, subtle internal cyan route light, ice-blue rims, neutral navy shadows, #02060d through #0a1527 environment, no emerald. Realism: premium physically based product render, not an illustration. Exclude all text, logos, numbers, UI, real bridges, people, legal clichés, shields, locks, coins, neon cyberpunk, crypto, gaming visuals, purple, magenta, excessive glow, floating spheres and watermarks. Intended placement: 390–430px homepage hero beneath live actions, displayed with cover cropping. Output 1440×1800, 4:5, WebP production derivative.

## 8. Asset 02 — Evidence Vault

**Files:** `home/evidence-vault.webp` and `home/evidence-vault-mobile.webp`

| Property | Desktop/tablet | Mobile |
| --- | --- | --- |
| Source ratio | 1:1 | 2:3 |
| Master resolution | 2400 × 2400 | 1200 × 1800 |
| Minimum accepted | 1600 × 1600 | 800 × 1200 |
| Fit | contain | contain |
| Focal point | 50% x / 50% y | 50% x / 49% y |
| Safe zone | central 82%; no essential detail in outer 9% | central 84% |
| Transparency | Yes, alpha around the principal object | Yes |

The object contains five distinct material layers without labels. Their hierarchy should imply tenancy agreement, payment evidence, deposit information, scheme correspondence and landlord/agent communication through form, thickness, grouping and route position—not through icons or words. A secure central archive is expressed by structural containment and alignment, never a lock or shield.

Compression target: transparent WebP no larger than 320KB desktop and 210KB mobile. Avoid large low-opacity haze in the alpha asset; the page supplies atmosphere in CSS. Next.js delivery quality is 75 and below-fold loading remains lazy.

### Generation brief CB-VA-02D — desktop Evidence Vault

**Copy-ready prompt:** Create a bespoke, photorealistic optical-material object for the Claims Bridge Evidence Vault section. Subject: five organised translucent evidence planes of differing thickness and edge treatment, held in a precise open architectural archive made from smoked navy glass, dark anodised metal and polished graphite; a continuous cyan-lit route passes through the layers into a protected central alignment, communicating organised tenancy records without text. Composition: square 1:1, isolated principal object centred at 50%/50%, asymmetric layer offsets, all meaningful geometry inside the central 82%, generous transparent perimeter, no floor-to-frame environment. Materials: optical glass, translucent ice glass, smoked navy glass, small brushed-titanium connectors, believable thickness and restrained refraction. Lighting: cool upper-left/front key, soft navy fill, cold ice-blue document edges, minimal cyan internal line, deep neutral-navy shadows, subtle local caustics. Camera: 55–70mm equivalent product camera, slightly elevated three-quarter view, compressed perspective, no fisheye. Depth: front plane clearly separated, central archive sharpest, rear layers progressively softer but still organised. Visual hierarchy: archive structure first, five planes second, connection path third. Palette: #02060d, #0a1527, desaturated blue, #4dd8e8 and #a8ddff only in fine edges. Realism: premium physically based campaign CGI with clean alpha edges. Exclude text, letters, document writing, folders, folder tabs with labels, file icons, cloud symbols, padlocks, shields, people, paper clutter, UI, neon, purple, crypto, gaming HUDs, bloom and watermarks. Intended placement: contained inside a responsive 0.66–1.12 ratio homepage slot over an existing dark CSS atmosphere. Output 2400×2400 transparent WebP.

### Generation brief CB-VA-02M — mobile Evidence Vault

**Copy-ready prompt:** Create the portrait mobile companion to the Claims Bridge Evidence Vault object with the same five translucent evidence planes, smoked navy glass archive, graphite structure, brushed-titanium connectors and upper-left cool lighting. Composition: 2:3 portrait, central vertical/lateral hierarchy, focal centre at 50%/49%, all essential geometry inside the central 84%, enough transparent perimeter for contained placement, layers simplified so each remains legible at 390px. Camera: 60mm equivalent, slightly elevated three-quarter view, controlled perspective. Depth: five layers clearly separated from front to back with a single restrained cyan connection route and cold ice-blue edges. Palette and realism: deep navy, optical glass, polished graphite, physically believable premium CGI, no decorative neon. Exclude all text, numbers, logos, writing, folder icons, padlocks, shields, cloud storage, UI, people, legal clichés, coins, cyberpunk, purple, excessive glow and watermarks. Intended placement: contained in the tall mobile Evidence Vault slot with CSS atmosphere visible around the alpha object. Output 1200×1800 transparent WebP.

## 9. Asset 03 — Portal atmosphere

**Files:** `home/portal-atmosphere.webp` and `home/portal-atmosphere-mobile.webp`

| Property | Desktop | Mobile |
| --- | --- | --- |
| Source ratio | 12:7 | 3:4 |
| Master resolution | 2400 × 1400 | 1200 × 1600 |
| Minimum accepted | 1800 × 1050 | 900 × 1200 |
| Fit | cover | cover |
| Focal point | 54% x / 50% y | 50% x / 52% y |
| Safe zone | central 64%; detail remains intentionally faint | central 72% |
| Transparency | No | No |

This is a background, not a hero object. Contrast behind the HTML portal window must remain below the window’s structural borders. No element may resemble an interface control. Detail should still read after darkening to roughly 30–45% perceived intensity beneath glass.

Compression target: maximum 220KB desktop and 140KB mobile. Next.js delivery quality is 70; always lazy load.

### Generation brief CB-VA-03D — desktop portal atmosphere

**Copy-ready prompt:** Create a subdued bespoke environmental background for the Claims Bridge HTML client-portal preview. Subject: a dark architectural digital environment with distant translucent horizontal planes, extremely subtle perspective grid fragments, faint cyan route lines and abstract document/data geometry embedded into depth; it must contain no interface elements. Composition: wide 12:7 frame, visual centre at 54%/50%, quiet central 64% behind the live HTML window, gentle structural detail concentrated toward the far left and lower-right edges, seamless deep-navy perimeter. Materials: smoked navy glass, matte anodised metal, faint optical planes, restrained graphite reflections. Lighting: cool upper-left directional wash, minimal internal cyan route illumination, cold edge hints, deep neutral-navy shadows and controlled haze. Camera: 35–45mm architectural camera looking into shallow perspective depth, level horizon, no dramatic tilt. Depth: three soft bands, with no sharp foreground object competing with UI. Visual hierarchy: live HTML must remain dominant; this image functions as atmosphere only. Palette: #02060d, #050b16, #0a1527, muted blue, tiny #4dd8e8 line accents. Realism: sophisticated physically based architectural visualisation, very low contrast. Exclude text, numbers, buttons, windows resembling app panels, charts, dashboards, fake UI, logos, people, cityscape, neon, purple, crypto, gaming HUD, circuit-board cliché, bloom and watermarks. Intended placement: cover-filled oval environmental layer behind a real responsive portal preview. Output 2400×1400, 12:7, WebP.

### Generation brief CB-VA-03M — mobile portal atmosphere

**Copy-ready prompt:** Create the mobile art-directed version of the Claims Bridge portal atmosphere using the same smoked navy glass, graphite, translucent horizontal planes and faint cyan route geometry. Composition: 3:4 portrait, focal centre at 50%/52%, quiet central 72% reserved for live HTML, slightly more vertical depth than the desktop version, detail confined to upper-right and lower-left periphery. Lighting: cool upper-left wash, deep navy falloff, minimal cyan internal routes, no bright hotspot behind text. Camera: 45mm equivalent, level and calm, restrained perspective. Depth: soft architectural planes fading progressively into navy haze. Realism: low-contrast premium CGI background. Exclude all UI, buttons, charts, text, numbers, logos, people, neon, cyberpunk, crypto, gaming graphics, purple, strong bloom and watermarks. Intended placement: behind the narrow Claims Bridge portal HTML preview at 375–430px, cover-cropped and lazy loaded. Output 1200×1600, 3:4, WebP.

## 10. Asset 04 — About environment

**Files:** `about/about-environment.webp` and `about/about-environment-mobile.webp`

- Desktop master 3200×1800 (16:9), minimum 1920×1080.
- Mobile master 1440×1800 (4:5), minimum 960×1200.
- Opaque WebP, art-directed pair, cover fit.
- Desktop focal point 67%/50%; keep left 38% low-detail for the About heading.
- Mobile focal point 50%/55%; keep top 18% calm for live page context.
- Budget: 380KB desktop, 230KB mobile; delivery quality 82 if above fold.

### Generation brief CB-VA-04 — About environment

**Copy-ready prompt:** Create a bespoke high-end architectural campaign render for the Claims Bridge About page, representing connection from uncertainty to clarity without people. Subject: two separated deep-navy structural planes joined by one precise optical-glass span; several translucent evidence layers travel from a partially obscured left-side origin across the span into a clearer, ordered illuminated field on the right. Composition: desktop 16:9 with focal structure at 67% horizontal/50% vertical and leftmost 38% kept low-detail for live HTML; produce a coordinated 4:5 mobile crop with the focal structure at 50%/55% and the top 18% quiet. Materials: thick optical glass, smoked navy glass, dark anodised metal, polished graphite, fine brushed titanium. Lighting: consistent cool upper-left/front key, soft navy fill, restrained cyan inside the connection, ice-blue rims, neutral navy shadows and subtle caustics. Camera: 45mm architectural three-quarter view, level, exact geometry, no fisheye. Depth: foreground origin plane, crisp connecting span, clearer distant resolved field. Visual hierarchy: connection first, evidence movement second, surrounding architecture third. Palette: #02060d to #0a1527, muted royal blue, tiny cyan and ice accents. Realism: premium physically based architectural/product CGI. Exclude text, logos, people, handshakes, literal bridges, skylines, legal symbols, shields, locks, coins, UI, neon, purple, crypto, gaming, excessive bloom and watermarks. Intended placement: About hero behind or beside live editorial copy. Output masters 3200×1800 and 1440×1800, seamless navy edges, WebP derivatives.

## 11. Asset 05 — Deposit protection concept

**Files:** `claims/deposit-protection.webp` and `claims/deposit-protection-mobile.webp`

- Desktop master 2400×1800 (4:3), minimum 1600×1200.
- Mobile master 1200×1500 (4:5), minimum 960×1200.
- Opaque or edge-alpha WebP depending on page composition; default to opaque with navy falloff.
- Desktop focal point 58%/51%, central 72% safe. Mobile focal point 50%/50%, central 78% safe.
- Budget: 300KB desktop, 190KB mobile; lazy unless used as that page’s LCP.

### Generation brief CB-VA-05 — Deposit protection

**Copy-ready prompt:** Create a bespoke premium legal-fintech material study representing deposit → protection → verification through abstract structural containment. Subject: a dense optical-glass value core entering a precise smoked-glass containment frame and emerging aligned with a verified connection plane; use three sequential structural states with one continuous fine cyan route, without coins, money or symbols. Composition: desktop 4:3, asymmetric focal point at 58%/51%, all essential stages inside central 72%; coordinated mobile 4:5 version centred at 50%/50% with central 78% safe. Materials: optical glass mass, smoked navy glass enclosure, dark anodised metal frame, polished graphite base, tiny brushed-titanium indexing joints. Lighting: cool upper-left/front key, subtle cyan structural light, ice-blue rims, deep navy shadows, restrained caustics. Camera: 55mm product camera, level three-quarter view, controlled compression. Depth: entering core foreground, containment centre sharpest, verification plane slightly behind. Visual hierarchy: containment action first, continuous route second, material detail third. Palette: #02060d, #050b16, #0a1527, desaturated blue, restrained #3d7cff/#4dd8e8, #a8ddff rims. Realism: physically plausible high-end CGI. Exclude coins, banknotes, piggy banks, banks, shields, padlocks, checkmark badges, text, numbers, logos, UI, people, neon, crypto, gaming visuals, purple, excessive glow and watermarks. Intended placement: deposit-protection issue page supporting live explanatory copy. Output 2400×1800 desktop and 1200×1500 mobile WebP derivatives.

## 12. Asset 06 — Document security

**Files:** `resources/document-security.webp` and `resources/document-security-mobile.webp`

- Desktop master 2400×2000 (6:5), minimum 1440×1200.
- Mobile master 1200×1500 (4:5), minimum 960×1200.
- Transparent or edge-alpha WebP preferred for reuse against reading-safe opaque surfaces.
- Desktop focal point 54%/48%; mobile 50%/50%; central 80% safe.
- Budget: 280KB desktop, 180KB mobile; lazy loaded.

### Generation brief CB-VA-06 — Document security

**Copy-ready prompt:** Create a bespoke Claims Bridge resource artwork representing structured evidence and secure organisation without a lock metaphor. Subject: a disciplined set of translucent document planes seated inside interlocking optical-glass rails, with precise graphite corner restraints and a single continuous route showing controlled intake, organisation and protected retention; no writing appears on any plane. Composition: desktop 6:5 with focal centre at 54%/48%, central 80% safe and transparent/quiet perimeter; coordinated mobile 4:5 with focal centre at 50%/50%. Materials: translucent ice glass sheets, smoked navy glass rails, dark anodised metal, polished graphite and tiny brushed-titanium joints. Lighting: cool upper-left/front key, soft navy fill, ice-blue edge definition, very restrained cyan light inside one organising rail, neutral navy shadow. Camera: 60–70mm product camera from a modest elevated three-quarter angle, no wide-angle distortion. Depth: front intake plane, sharp central organised stack, softly receding retained planes. Visual hierarchy: structured rails first, document layers second, route light third. Palette: deep midnight navy, rich dark blue, controlled cyan and ice blue. Realism: clean physically based luxury product CGI with accurate alpha edges. Exclude locks, keys, shields, folders, cloud icons, file icons, text, numbers, logos, UI, people, paper clutter, cyberpunk, crypto, purple, broad glow and watermarks. Intended placement: evidence/security resource pages alongside live HTML explanation. Output 2400×2000 desktop and 1200×1500 mobile transparent WebP derivatives.

## 13. Asset 07 — Claim progress

**Files:** `claims/claim-progress.webp` and `claims/claim-progress-mobile.webp`

- Desktop master 3200×1600 (2:1), minimum 2000×1000.
- Mobile master 1200×1800 (2:3), minimum 800×1200.
- Opaque WebP with seamless navy edges; art-directed pair is mandatory because the path changes orientation.
- Desktop safe zone: central 86%, focal path travels from 12%/66% to 88%/34%.
- Mobile safe zone: central 82%, path travels from 48%/90% to 54%/10%.
- Budget: 340KB desktop, 210KB mobile; lazy loaded.

### Generation brief CB-VA-07 — Claim progress

**Copy-ready prompt:** Create a bespoke premium Claims Bridge process artwork showing multiple connected claim stages across one continuous structural path. Subject: six unlabeled architectural nodes joined by a single optical-glass and cyan-lit route; the route begins in a denser smoked-navy region, passes through evidence-like translucent planes and precise graphite joints, and resolves into calmer ordered space. Composition: desktop 2:1 panorama, path travels from approximately 12% x/66% y to 88% x/34% y, all nodes inside central 86%, asymmetric rhythm and substantial dark negative space; coordinated mobile 2:3 version re-art-directed as a deliberate vertical path from 48% x/90% y to 54% x/10% y, central 82% safe. Materials: optical glass, smoked navy glass, translucent ice planes, dark anodised metal, polished graphite and subtle brushed titanium. Lighting: cool upper-left/front key, restrained cyan illumination only inside the active continuous route, cold ice-blue rims, deep neutral-navy shadows and slight depth haze. Camera: desktop 45–55mm level architectural view with shallow diagonal perspective; mobile 55mm slightly elevated view, no fisheye. Depth: nodes alternate across three depth bands but remain part of one route. Visual hierarchy: continuous progress path first, six nodes second, evidence planes third. Palette: #02060d to #0a1527, muted royal blue, controlled cyan, no success green because no outcome is implied. Realism: sophisticated physically based architectural/product CGI. Exclude arrows with text, numbers, labels, timelines copied from UI, charts, completion ticks, guaranteed outcomes, people, literal bridges, legal clichés, neon, crypto, gaming HUDs, purple, excessive bloom and watermarks. Intended placement: Claims process and progress pages with all explanatory stages supplied as semantic HTML. Output 3200×1600 desktop and 1200×1800 mobile WebP derivatives.

## 14. Editorial artwork system

Knowledge Hub covers use a shared 8:5 master grid at 2000×1250, with an optional 4:5 mobile crop only for a feature placement that genuinely needs it. Listing thumbnails should normally reuse the master through responsive `sizes`, not download a separate illustration for every card. Social cards are separate 1200×630 exports with HTML-generated titles where possible; generated source art never contains text.

Each cover is assembled from the same material kit and camera family, with one quiet category motif:

| Category | Secondary motif |
| --- | --- |
| Deposit Protection | contained optical core and enclosing rails |
| Prescribed Information | paired translucent planes with a precise hand-off line |
| Evidence | layered sheets connected into an ordered spine |
| Claim Process | continuous route through spaced structural joints |
| Tenant Guides | threshold plane opening into a clearer field |
| Updates | a calibrated shift in one segment of an established grid |

Use a 12-column composition grid. Keep at least 35% of every cover low-detail for HTML category and title overlays when the design calls for them, but place those overlays on an opacity-protected HTML surface. Limit each category to one motif, one focal material and one cyan activation. Covers viewed together should vary by crop, scale and structural rhythm—not by switching illustration style.

Recommended budget: 140KB for listing delivery, 220KB for feature delivery, 120KB for mobile listing. Default delivery quality 70–75 and lazy loading. Naming: `blog/{category-slug}/{article-slug}-cover.webp`; use `-mobile` only for a genuinely art-directed portrait composition.

### Generation brief CB-VA-BLOG — editorial master template

**Copy-ready prompt:** Create a cohesive Claims Bridge Knowledge Hub cover using one restrained abstract architectural motif appropriate to the assigned category, built from optical glass, smoked navy glass, translucent ice planes, dark anodised metal and polished graphite. Composition: 8:5 editorial frame on a disciplined 12-column grid, asymmetrical focal object occupying no more than 55% of the frame, at least 35% low-detail negative space for live HTML, essential geometry inside central 80%. Lighting: cool upper-left/front key, soft navy fill, one restrained cyan structural activation, ice-blue rims and deep neutral-navy shadows. Camera: 55–70mm product/editorial camera, calm three-quarter or near-orthographic view, no wide-angle distortion. Depth: three controlled bands, with one crisp focal material and soft atmospheric recession. Palette: #02060d, #050b16, #0a1527, desaturated blue, small #4dd8e8/#a8ddff accents. Realism: premium physically based CGI, consistent with a legal-fintech publication. Exclude all text, letters, numbers, logos, UI, icons, people, stock legal symbols, literal bridges, neon, crypto, gaming imagery, purple, excessive glow and watermarks. Intended placement: responsive Knowledge Hub cover with all title, category and metadata rendered in HTML. Output 2000×1250 WebP master; do not introduce a new style per article.

## 15. Custom icon system

The current `ConceptIcon` is a sound semantic scaffold: 24×24 viewBox, `currentColor`, rounded joins, 1.45px outline and `aria-hidden`. It currently covers assessment, deposit, evidence, message, progress, protection and tenancy. Production icons should replace paths inside that API so callers do not change.

Production grammar:

- Draw on a 24×24 grid with a 2px optical margin and primary 1.5px stroke.
- Prepare optically corrected 16, 20 and 24px exports; do not scale one complex master blindly to 16px.
- Use rounded line caps with restrained 2px internal corner radii.
- Combine outline structure with at most one small filled anchor per icon. Filled anchors identify the concept’s “connection point,” not a glass decoration.
- Keep every icon recognisable in one colour. Glass/ice colour is applied by the UI context, not baked into SVG gradients.
- Use no more than two crossing lines and no detail thinner than one rendered pixel.
- Functional icons remain simple; larger 32–48px conceptual icons may add one secondary plane.

Concept direction:

| Concept | Production motif |
| --- | --- |
| Tenancy | threshold/room plane joined to a base line |
| Deposit | contained central marker between two receiving planes; replace coin stack |
| Protection | enclosing structural brackets around a visible core; avoid shield |
| Evidence | two aligned document planes with one connection marker |
| Documents | ordered plane stack with offset edge |
| Assessment | comparison frame resolving into one aligned route |
| Timeline | continuous line through spaced nodes |
| Progress | ascending path with current-node anchor; no chart styling |
| Message | two connected dialogue planes, not a cartoon bubble |
| Notification | signal bracket with one filled activation point |
| Security | interlocking rails around an open core; no padlock |
| Profile | restrained head/shoulder geometry inside an open frame |
| Claim | evidence planes converging into one structured case plane |
| Review | scanning line crossing an evidence plane |
| Upload | document plane moving through an open receiving rail |
| Support | two joining arcs around a central connection point |
| Eligibility | branching check path converging on an assessment node |

Decorative icons stay `aria-hidden="true"`; icon-only controls get an accessible name on the button or link. Icons never replace a status label and are not added beside every paragraph.

## 16. Responsive image rules

1. Use an art-directed desktop/mobile pair when orientation or narrative path changes: hero, portal atmosphere, About, protection, document security and claim progress.
2. Evidence Vault uses two transparent object compositions and `contain`; CSS supplies the responsive environment.
3. Break at 767px by default, matching the homepage’s mobile layout. Add a tablet source only after real artwork review demonstrates an unacceptable 768–1024 crop.
4. The hero and claim-progress safe cores must tolerate the measured laptop ratios, including the hero’s 0.85 ratio at 768px and the progress layout’s future mobile transformation.
5. Every active asset supplies intrinsic `width` and `height`, a truthful `sizes` string and a stable container height or aspect ratio.
6. Use `object-position` from `src/content/visual-assets.ts`; do not patch individual pages with arbitrary offsets.
7. Use Next.js `Image` for a single source and `getImageProps()` with `<picture>` for art direction. Do not render duplicate hidden desktop/mobile images because both may download.
8. Keep the CSS fallback in the DOM beneath the image. Do not activate the `artwork` prop until the exported file exists and has passed crop and weight review.

## 17. Accessibility

The homepage hero, Evidence Vault and portal atmosphere repeat concepts already described by nearby HTML and are therefore decorative. Their image alt is empty and the slot is hidden from the accessibility tree. The portal HTML remains outside its decorative atmosphere slot and keeps its figure caption, navigation label and progress semantics.

Use a semantic artwork only when it adds information unavailable in text. In that case set `decorative={false}`, provide a concise `alt`, and provide `fallbackLabel` for the CSS-only state. Alt text describes the information or purpose, not materials and visual style. Generated text is prohibited; every title, label, stage and status remains HTML.

Forced-colour, print and missing-asset states retain meaningful page content. Images never carry the only representation of a claim stage or document category.

## 18. Performance budgets

| Asset class | Desktop source cap | Mobile source cap | Next quality | Loading |
| --- | ---: | ---: | ---: | --- |
| Homepage hero | 420KB | 260KB | 82 | high priority only after activation |
| Evidence Vault | 320KB | 210KB | 75 | lazy |
| Portal atmosphere | 220KB | 140KB | 70 | lazy |
| About hero | 380KB | 230KB | 82 | page-LCP only |
| Supporting claim/resource art | 280–340KB | 180–210KB | 75 | lazy |
| Blog listing cover | 140KB delivered | 120KB delivered | 70 | lazy |

Canonical repository sources are WebP. The Next.js optimiser is configured to negotiate AVIF first and WebP second, with allowed qualities 70, 75 and 82. AVIF’s smaller transfer is accepted for cached production delivery; deployment must forward the `Accept` header and cache generated variants. Do not preload below-fold assets. Review actual transferred bytes at 390, 768 and 1440 after integration rather than relying only on source-file size.

## 19. File naming and export rules

- Lowercase kebab-case only.
- Canonical desktop file keeps the requested base name: `asset-name.webp`.
- Art-directed phone source uses `asset-name-mobile.webp`.
- Optional social derivative uses `asset-name-og.webp`; do not use `@2x` naming.
- Keep working EXR, TIFF, PSD or scene files outside `public/`; only optimised web derivatives belong in the application.
- Export in sRGB, strip metadata and embedded colour profiles that add weight, preserve smooth gradients with no visible banding, and inspect at 100% against `#050b16`.
- Alpha assets must use clean premultiplied edges with no pale fringe.
- Never upscale a render to meet the minimum dimensions.
- Do not commit an asset until it meets its byte budget and both desktop/mobile crop review.

Directory contract:

```text
public/images/claims-bridge/
├── about/
├── blog/
├── claims/
├── home/
├── icons/
├── portal/
└── resources/
```

## 20. Prompt consistency rules

1. Preserve the exact material names and upper-left/front key-light direction across every generation.
2. Start from the relevant copy-ready brief in this document; change only the explicitly variable motif, crop and placement.
3. Keep the palette anchored to the Claims Bridge tokens and state exclusions in every request.
4. Generate desktop and mobile variants in the same session/reference set where the external model supports visual consistency.
5. Do not ask a model to add copy, labels, logos or user-interface details. Those remain HTML/SVG.
6. Select on structural clarity at final rendered size, not on impressive full-resolution micro-detail.
7. Reject results with literal bridge imagery, defensive legal clichés, overexposed cyan, purple contamination or crypto/gaming cues even if technically polished.
8. Maintain a generation record containing prompt ID, model/version, seed/reference identifier, selected output, crop notes, source dimensions and final byte size.
9. Run a three-frame contact-sheet review—hero, Evidence Vault and portal atmosphere together—before approving later assets. They must share one world without repeating the same object.
10. Final legal and accessibility meaning always comes from page content; the artwork is a controlled supporting system.
