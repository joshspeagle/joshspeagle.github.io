# Design system — "Chips on the board" (approved 2026-09-07)

This is the locked spec the current visual system was built from (tokens, board layer, chip anatomy, hero, type, retire list). It is the reference for any future visual change; the implementation lives in `assets/data/tokens.json`, `assets/css/redesign.css`, `assets/js/redesign/{hero,board}.js`, `scripts/pages_shared.py` (sprite, card_meta, sec_head) and `scripts/build_html.py`.

Reference: the implementation itself (the approved mockup was ported verbatim).
  (the original mockup, now implemented) · home.html · hero2.js · board.js · suite.html
  renders: (the original mockup, now implemented) home-light.png, home-mobile.png, suite-dark.png, suite-light.png,
  G-energy-compare.jpg (amber = the middle frame = chosen)
Owner's words: "A's softer overall aesthetic and palette + B's angular iconography"; "bolted-on chips on a
circuit board with energy flowing into them on a darker background"; hero = data → neural network that
lights up with clear activation patterns → samples. No brown grounds. No spec-sheet chrome. Simple.

## 1. Palette (assets/data/tokens.json — themeVarying; dark / light)
  bg-0  #06080f / #f6f6f1      bg-1  #0a0e20 / #efeee8      bg-2  #0a1228 / #e8e6dd   (light bg-1/bg-2 warmed)
  chip  #0e1430 / #fffefb      chip-2 #131b3c / #f5f3ed     border rgba(255,255,255,.08) / #e2dfd3
  border-2 rgba(255,255,255,.16) / #cdc9bb
  text #eef1fb / #14161d · text-2 #aeb6d6 / #46444c · text-3 #8a97c2 / #67645d   (unchanged)
  copper-rgb "184 128 94" / "168 113 74"   → in CSS: --copper: rgb(var(--copper-rgb)); alphas via rgb(var(--copper-rgb)/α)
  energy  #f2b13a / #d9891a   (AMBER — chosen)   energy-rgb "242 177 58" / "217 137 26"
  energy-hot #fff4d6 / #6b3a00   (pulse core / lit text)      energy-ink #0b0704 (text on an energy fill, both themes)
  cat-sla #8b7bff/#5b43d6 · cat-ii #34d3e0/#0a7280 · cat-ic #5aa9ff/#1565c0 · cat-du #ffb454/#8f4d00 · cat-sec #ff85c0/#b1257a (unchanged)
  shadow-card  0 12px 32px rgba(0,0,0,.38) / 0 10px 28px rgba(40,38,28,.10)
  REMOVE: grad, grad-text, shadow-glow, violet-bright, cyan-bright (and every use). Keep violet/cyan/blue tokens
  only where a chart series needs them; chrome never uses them again.
  Taxonomy accents (talks types, teaching departments, service org-types, news types, software groups): move
  every hard-coded hex in redesign.css into tokens.json as acc-* tokens with a light value that clears 3:1
  against light --chip (#fffefb); map the existing accent-*/d-* class names onto them. scripts/check_allow_hex.txt
  must shrink to (ideally) only #000/#fff for print.
  Geometry: --radius-chip 3px (chips, buttons, inputs, pads) · --radius-sm 2px · no pills anywhere.

## 2. Substrate & board layer
  body::before = fixed dot grid: radial-gradient(rgb(var(--copper-rgb)/.13) .9px, transparent 1.3px), 32px, offset 16px.
  <svg id="board" aria-hidden="true"> emitted once per page right after <body> (absolute, top-left, z 0, pointer-events none);
  main/nav/footer position:relative z-index ≥1 with TRANSPARENT section backgrounds so traces show between chips.
  assets/js/redesign/board.js = (the original mockup, now implemented) ported verbatim in behaviour: a trunk in the left gutter
  (container-left − 34px; 14px on narrow screens), fed on Home from the hero network (feed stub from ~0.69W at the
  hero's bottom, 45° corners) and on secondary pages from the header band's bottom-left; one branch per [data-chip]
  (left pin 28px below the chip's top; chips inside a [data-bus] row share a horizontal bus 18px above the row and
  drop into top pins); hollow via at each trunk junction; a copper pin (8×5 land) at the chip edge; the ground
  symbol at the trunk's end above the footer; an idle pulse riding the trunk on a 9 s loop; when a chip enters the
  viewport (IntersectionObserver .35) a pulse travels its branch (~0.9 s), the pin lights energy, the chip gets
  .lit for 1.8 s. prefers-reduced-motion or #still: static traces, one parked pulse per four chips, one lit chip per
  four. No JS → no board (pure progressive enhancement). Re-route on resize and after fonts load.
  DENSITY RULE: ≤ 8 traced chips per page. Home: ART panel, About callout, photo, the 4 research chips (bus), the
  publications chip, the 2 values chips (bus). Secondary pages: the stat/tiles block, each figure card, the featured
  board, and the [data-lv-list] wrapper (ONE trace into the list column). List items are chips visually (surface,
  notch, category edge) but carry NO trace/pin.

## 3. Chip anatomy (.chip — apply to every card-like block: .card .item .paper .feat-card .callout .highlight-box
  .research-card .art-panel .opp-card .viz-card figure/chart cards, stat tile rows)
  background var(--chip); border 1px var(--border); radius 3px; padding 24px 26px 24px 30px;
  box-shadow inset 0 1px 0 rgba(255,255,255,.05), var(--shadow-card) (light: shadow only);
  ::before = pin-1 notch: 5×5 square at (10px,10px) in copper .75;
  [data-cat] / accent: a 2px TOP edge in the category/accent colour (replaces every left stripe);
  .lit: border rgb(energy/.6) + 0 0 0 1px rgb(energy/.16) + 0 0 30px rgb(energy/.16), transition .55s.
  Title: serif 600; description text-2 .95rem; metadata line (year · venue · role/type) mono 10.5px .14em uppercase
  text-3 with load-bearing fields text-2 600; `.meta` count line with a 7px hollow via (or filled pad in the category hue).

## 4. Hero (Home)
  assets/js/redesign/hero.js := (the original mockup, now implemented) (feed-forward network: layers 5-7-6-3, seeded weights,
  activation-lit star nodes, edges lit ∝ activation×|w|, output → sample → posterior; energy read from --energy-rgb;
  30 fps, off-screen pause, still frame under reduced motion). Markup: canvas + .scrim + .hero-labels
  (OBSERVATIONS 24% / NETWORK 65% / POSTERIOR 87.5%) + kicker (6px energy square + mono .24em) + h1 (+ .zh) +
  tagline (the "stars and galaxies" span in energy) + ONE .btn + ONE .link. Retire .backdrop/.vignette/.dawn.
  Mobile (≤600px): copy first, then the canvas as a 300px band, then the trunk.

## 5. Nav · buttons · links · labels · filters · section heads · footer
  Nav: brand = sprite #mark-s (26px, energy) + serif 600 name (no ✦); links Inter 14px text-2, current = 2px energy
  inset underline; CV = .cv mono outline (copper border, 3px); theme toggle 34px square outline; hamburger same.
  .btn = solid energy fill, energy-ink text, 3px, 13px 22px, tiny 5px square after the label; NO clip-path, NO gradient.
  .link = text with a 1px copper underline. Focus ring: 2px energy outline offset 2px (no clip-path so outline works).
  .pad-sq (labels, badges, filter chips): mono 11px .08em uppercase, 1px border-2, 3px radius, 7px square swatch in
  the category/accent hue; active filter = energy border + text; counts in the same mono.
  Search input / sort select: chip surface, 1px border-2, 3px radius, copper focus border.
  .sec-head: h2 serif + a 1px copper rule (.45) carrying a hollow via at its start and a 5px square pad at its end.
  Retire the mono "section-kicker" eyebrows on Home sections (keep ONLY the hero kicker) — on secondary pages the
  header band keeps kicker (square pad + mono) + h1 + tagline but loses .pub-header-glow and any gradient.
  Footer: brand lockup + 3 link columns (Research / Teaching / Elsewhere) + copyright line (mono 10.5px), as the mockup.
  Sprite (pages_shared.SPRITE, emitted once per page): star4, mark, mark-s, via, pad, gnd, ic-sla, ic-ii, ic-ic, ic-du —
  copy the <defs> from (the original mockup, now implemented) The ART panel's emoji become two sprite icons (ic-sla for research,
  a two-vias-joined glyph for team — add `ic-team` to the sprite).

## 6. Biography timeline · charts (second pass)
  Timeline: copper trunk; events = hollow vias; current role = #star4 in energy with glow + "NOW" square pad;
  the Jan–Apr 2025 leave becomes a concurrent branch (content.json: "concurrent": true) drawn 16px right of the
  trunk with 45° in/out, rendered as an indented sub-entry beneath the professorship. Chronological top→bottom.
  Charts (publications × 4, mentorship stage chart): chip cards; copper dotted silkscreen gridlines (1 4),
  solid copper baseline; single-series line in cat-ic (blue) with the latest point as an energy #star4 + direct
  label; multi-series only in research-area hues when the series ARE research areas, otherwise a neutral
  lightness ramp + direct labels (no colour-only legends); mix bar hard-segmented with labels inside segments ≥10%;
  RIQ band bounds printed; axis/legend text ≥ 11px rendered at 390px (do not let text scale with the viewBox —
  emit legends as HTML or use per-breakpoint sizes). Mentorship: current vs former by hatch, not opacity.

## 7. Brand assets
  Regenerate favicon.svg / favicon-16 / favicon-32 / apple-touch-icon / site.webmanifest from the #mark geometry
  (energy on bg-0; the 16px cut reduces to the star + hub) via scripts/generate_favicons.py, and the OG card via
  scripts/make_og_card.py (navy board, a few copper traces, mark + name + tagline, amber accent). PIL is installed.

## 8. Retire from redesign.css
  glassmorphism (rgba-white surfaces, backdrop-filter except the nav bar), every gradient, --shadow-glow, clip-path
  buttons, pill radii (40px), the ✦ glyph, the hero .backdrop/.vignette/.dawn, .pub-header-glow, every left accent
  stripe (→ top edge), every hard-coded hex (→ tokens), the "· 137" style pills (→ .pad-sq).

## 9. Done means
  npm run build twice → byte-identical; npm run check passes with the allowlist shrunk; contrast.py AA for text in
  both themes; no console errors on 11 pages × 2 themes × (1440, 390); screenshots reviewed against the mockup
  renders; print still works (#board hidden in print).
