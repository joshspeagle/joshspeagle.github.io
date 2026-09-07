# Design brief — "Circuit Constellation" (joshspeagle.com tune-up)

## The idea in one line
A constellation drawn as a printed circuit. Stars are vias/pads; the lines joining them are PCB traces
(monoline, 45°/90° bends, small radius corners, occasional junction pads). The same drawing reads as a
star chart AND a circuit board — astronomy meets statistics/AI, which is exactly Josh's position.

References: the AI-for-Science 2025 logo (a maple leaf made only of traces ending in via-dots), and the
existing ART logo (a constellation forming the letters "ART" with 4-point sparkles) at
/home/user/joshspeagle.github.io/assets/images/art-logo.svg. The owner's figure canon
(/root/.claude/uploads/40b03ea6-f1ab-50f8-9441-a14d6728c996/38c1de2c-ICONOGRAPHY.md): one token = one meaning,
never reassigned; hue is never the only channel; deep register, restraint; direct labels; survives greyscale.

## Where the motif must thread through (the "integrated" part)
1. Brand mark: a compact asterism/monogram drawn as traces+vias (nav lockup, favicon 16/32, OG card, 404, footer).
2. Hero: a deliberate composition — sky/data (left) → traces routed through a "chip" (inference/model) →
   posterior contours (right). Pulses travel along traces (JS); static fallback for reduced motion.
3. Section headers/dividers: a short trace with a via instead of the plain 1px border; silkscreen-style
   mono kickers ("01 / ABOUT") — the site already uses tracked mono labels, lean into it.
4. Cards/chips/badges: accent stripe → trace with via; chips as pads; keep the four research-area tokens.
5. Biography timeline: vertical trace with vias at events, junction for overlapping roles, current role lit.
6. Research-area icons: 4 monoline icons in the same trace/via language, one stroke width, 24px grid
   (Statistical Learning & AI · Interpretability & Insight · Inference & Computation · Discovery & Understanding).
7. Charts: faint silkscreen gridlines, canonical colours, direct labels, via-dot markers.
8. Footer: board-edge / ground symbol + monogram.

## Constraints
- Keep the token system (assets/data/tokens.json → tokens.css): dark + light themes, both DESIGNED (not inverted).
  Category tokens stay: --cat-sla (violet) / --cat-ii (cyan) / --cat-ic (blue) / --cat-du (amber).
- Fonts: Source Serif 4 (headings), Inter (body), JetBrains Mono (labels). fonts.css at
  file:///home/user/joshspeagle.github.io/assets/css/fonts.css (relative font URLs resolve from there).
- Any NEW colour token must not collide in meaning with an existing one (e.g. a copper trace token vs the amber DU token).
- Restraint: traces are quiet structure (gridline weight), not loud decoration. Check greyscale.
- WCAG AA text contrast in both themes. No emoji as icons.
- Must be implementable in plain CSS/SVG/vanilla JS on a static site.

## Deliverable per variant (self-contained HTML, inline CSS+SVG)
Eight panels, top to bottom, each titled: (1) brand mark at 3 sizes + 32px favicon + nav lockup;
(2) hero 1440×720; (3) section header + divider; (4) a row of three cards (a paper, a talk, a mentee) with
chips/badges/tags; (5) timeline excerpt with 4 events; (6) the four research icons at 34px and 96px;
(7) a restyled "citations per year" chart; (8) footer. Render dark AND light at 1440px wide.
Plus DESIGN.md: concept, tokens added/changed, motif rules (stroke widths, radii, via sizes, spacing),
what to retire from the current site, implementation notes and risks.
