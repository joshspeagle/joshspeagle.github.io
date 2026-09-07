# Design brief G — "Chips on the board" (round 3)

## Where we are (read this first; it is the owner's own steer)
Round 1 produced A (quiet copper), B (silkscreen), C (living constellation) and a synthesis D. Round 2 (E1/E2/E3)
took his infographic as a target aesthetic and stripped out the things he liked. His verbatim verdicts:
- "I liked the visual language and color palette of A, with some of the angular elements of B."
- "I like the 'bolted on' aesthetics of chips on a circuitboard with energy flowing into them on a darker
  background (at least in dark mode). This is closer to the softer style of A (including the overall
  aesthetic, etc.), with the angular iconography of B."
- "E looks very bland and kinda gross with the brown-orange."  (E's fault: a warm brown-black ground with
  muddy brown-orange everywhere. A's copper worked because it was thin lines on a COOL dark-navy ground.)
- On D: "too busy" and "Claude-y" (spec-sheet chrome: fiducials, edge stamps, numbered everything).
- On the hero: "the idea at the top of the page — an animation going from astronomical data on the left,
  through machine learning / deep learning, to inferences on the right (SBI or MCMC style); information
  flows through a neural network that lights up to generate samples (diffusion / normalizing-flow style),
  with the network maybe looking like a constellation." This stays, animated, and feeds the board.
- His colour: "orange and dark." He wants "a very different suite to build on for the actual visual language
  elements for the entire website" — distinctive, given his research (astronomy + statistics + AI).
Look at: mockups/A-quiet-copper/dark.png + light.png (the softness, the palette, the card rail, the timeline),
mockups/B-silkscreen/dark.png (the asterism mark, square pads, 45° routing, the hero composition),
mockups/E3-board-editorial/home-dark.png (what he called bland/gross — do NOT do this),
mockups/D-synthesis/dark.png (what he called busy — do NOT do this), and the current site
crops/index-dark-desktop-0.png … -3.png (the content; its hero animation is the base to keep and improve).

## The concept
The page is a dark board. Content blocks are CHIPS bolted onto it: a card is a component package — a slightly
raised surface with soft depth (A's card feel), square-ish corners (2–4 px, like a real IC), and pins/pads on
the edge where a trace arrives. Traces run in the background at low alpha (copper, thin, 45°/90°) and
visibly END at chip pins. ENERGY flows: as a chip enters the viewport a bright pulse travels its trace and
enters the pin; the chip's edge glows briefly and settles. The hero is the source: the data → constellation
network → posterior animation at the top is where the energy comes from, and the board's traces leave it.
Quiet by default; alive when you scroll; never in the reading path. Dark mode is primary and must be
beautiful; light mode is a cream board with the same copper/energy language.

## Palette rules (this is where E failed)
- Substrate stays COOL and dark: the current site's --bg-0 #06080f / --bg-1 #0a0e20 / --bg-2 #0a1228 family
  (a designer may deepen or tune slightly, but no brown or warm-grey grounds). Text stays the cool
  --text #eef1fb / --text-2 #aeb6d6 / --text-3 #8a97c2 family. Chip surfaces: a slightly lighter cool tone.
- Copper (A's #b8805e-ish) is ONLY for thin traces, rings, pins — never text, never fills, never large areas.
- ENERGY is a bright orange-amber (think the orange of his hoodie in the photo, ~#f28c28 → white-hot at the
  pulse core), used for the pulse, a lit pin, one CTA, and small glows. It is transient and additive; it does
  not tint the page.
- The four research-area tokens stay hue-coded flat tints on cards/labels: violet, cyan, blue — and re-pick the
  fourth (Discovery & Understanding, currently amber #ffb454) AWAY from orange so orange means only "energy /
  brand"; propose a replacement (e.g. a warm rose or a green) and show the four separate in greyscale.
- No gradients on text. No violet radial blobs. Glows only where energy is.
- Light mode: cream ground (#f6f6f1 family), copper traces, the same orange energy, chips as pale panels.

## Iconography (B's angularity)
The brand mark is an asterism drawn as a trace: one continuous route with 45° bends ending in a four-point
star; square pads for terminals, hollow rings for vias; research-area icons drawn in the same vocabulary, one
hue each; chips (filter pills) become square pads/labels; silkscreen mono labels used SPARINGLY (dates, codes,
one label per figure) — no eyebrow on every section, no numbering, no fiducials, no edge stamps.

## Deliverables per variant (in mockups/<variant>/)
1. suite.html — the visual-language SUITE sheet (like A's panel sheet, but in this concept): brand mark +
   nav lockup; palette (dark + light, with the four category tints and the energy colour, and a greyscale
   row); hero (1440×720 composition, still frame of the animation); section header + divider; a row of
   chips-as-cards (paper, talk, mentee, software) with traces arriving at pins and one pulse mid-flight;
   buttons, labels, filters; biography timeline excerpt; the four research icons; one chart; footer.
2. home.html — the full homepage with the real copy (content.json / index.html), the animated hero (port and
   improve assets/js/redesign/hero.js — keep its narrative; nodes glow as pulses pass; samples accumulate
   into a contoured posterior; 30 fps cap; off-screen pause; still frame under reduced-motion), and a
   board.js that routes traces from the hero to the real chips and animates the energy on scroll (reduced-
   motion → parked pulse; no JS → static traces or none).
3. Renders via render.cjs: suite-dark.png, suite-light.png, home-dark.png, home-light.png (1440) and
   home-mobile.png (390). render.cjs emulates reduced-motion, so the still frame must show a pulse mid-flight.
4. DESIGN.md ≤ 2 pages: palette values, chip anatomy (surface, corner, pin geometry), trace rules, energy
   rules (what lights, how long, how bright), type roles (keep Source Serif 4 / Inter / JetBrains Mono),
   what to retire from the current redesign.css, and how hero.js/board.js port into the real build.
Fonts: file:///home/user/joshspeagle.github.io/assets/css/fonts.css. Theme via data-theme from localStorage
'preferred-theme' (default dark). Never modify the repo.
