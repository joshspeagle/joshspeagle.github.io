# Design brief E — "The board" (round 2, after the owner's feedback on A/B/C/D)

## What the owner said (verbatim, condensed)
- "I think we overcorrected. D is too busy. One thing I liked about A and B were that they were simple.
  I liked the warm aesthetic of A and the angular, simple style of B. Combine them to make something more unique."
- "I do like the general colour palette. My colour tends to be orange and dark."
- "There's a decent amount of Claude-i-ness in the design scheme. I want us to be creative."
- "I hoped the circuit motif, inspired by neural networks, could permeate the page with background soft glows as
  you scroll, or faintly in the background connecting various cards together to make them feel like an
  integrated circuit board."
- He attached an infographic he made, BEFORE (Claude-y) and AFTER (his taste). Look at both, carefully:
  BEFORE = pdf/small-1.png … small-6.png · AFTER = pdf/print-1.png … print-7.png. Study what changed: rounded
  pastel cards → flat square tiles with a solid left edge; pill badges with dots → small square labels in a
  solid tint; mono eyebrow labels everywhere → mono only for course codes; soft shadows and gradients → thin
  rules and solid colour blocks; a starfield hero → a strong flat header band; decoration → hierarchy.

## The concept: the page is the board
The site is a dark substrate (near-black, warm) on which the content sits as components. A faint copper trace
network runs BEHIND the content, connecting sections and cards to each other the way traces connect packages
on a PCB — so the page reads as one integrated circuit rather than a stack of cards. As the reader scrolls,
signal moves: a soft glow travels along a trace or a node lights and fades, quietly, at the edge of attention,
never in the reading path. The hero is where the network is densest (the neural-network origin); traces fan
out down the page, thinning. The foreground stays SIMPLE: flat, angular, typographic.

## Hard rules (the anti-Claude list). Do not do any of these:
1. No glassmorphism: no translucent surfaces, no backdrop blur, no rgba-white cards on dark.
2. No gradients on text or buttons. No violet-to-cyan anything. No radial "blob" backgrounds.
3. No rounded-corner card grids with 1px borders and hover-lift. Corners are square or ≤ 3px.
4. No pill badges with coloured dots. No chip rows of pills. Labels are small, square, flat.
5. No mono uppercase letter-spaced eyebrow/kicker on every section. Mono is for codes, numbers, dates.
6. No glow box-shadows on UI. (The ONLY glow on the site is the background signal, and it is soft.)
7. No decorative meta: no edge stamps, no "FIG. 01", no "REV. D", no fiducials, no "solders on here",
   no numbered everything. A number appears only where it is information.
8. No emoji. No generic line-icon sets. If an icon is needed, draw it in the trace/node vocabulary.
9. No hero of "giant name + gradient words + primary and ghost button". Compose the hero.
10. No ✦ sparkle. No "AI product" iconography.
11. Do not over-systematize: no six laws, no lint ladders, no token-proof plates. Design, then explain briefly.

## What to do instead (from the AFTER infographic, translated to a personal site)
- Flat colour blocks for structure: a header band, section bands, a solid left edge on tiles.
- Typographic hierarchy does the work: keep Source Serif 4 for display/headings (warm, personal) and Inter
  for body; mono (JetBrains Mono) only for codes/numbers/dates. One variant may propose a condensed angular
  display face IF it can be self-hosted via @fontsource — otherwise keep the serif.
- Thin 1px rules; square tiles; tables where content is tabular (teaching, service); tight, confident spacing.
- Colour: warm copper/orange accent on near-black (dark) and on warm cream (light); the four research-area
  tokens stay as small flat tints/edges (violet, teal-cyan, blue, amber) and are the ONLY hue-coded taxonomy.
  Everything else is neutral + copper.
- The circuit is BACKGROUND: copper traces at low alpha behind content, orthogonal/45° routing between the
  actual boxes; nodes at junctions; soft glows that move on scroll (JS, gated by prefers-reduced-motion,
  static traces without JS). Show it in the mockup with the glow "mid-travel" so it is visible in a still.
- Neural-network reading: in the hero the traces form a small layered network (inputs → hidden → output),
  lit softly; it is the same drawing that continues down the page as the board.

## Deliverables per variant (this time FULL PAGES, not panel sheets)
1. home.html — the complete homepage at 1440 (hero, ART panel, about, research areas, publications callout,
   join/opportunities, footer) with the real copy from /home/user/joshspeagle.github.io/assets/data/content.json
   and /home/user/joshspeagle.github.io/index.html (read them; keep the real text; don't invent numbers —
   137 papers / 18,503 citations / h-index 44 / 85 mentees are the real figures).
2. publications.html — the complete publications page (stats, the four figures re-imagined simply, featured
   work, filter controls, ≥ 8 real paper cards from /home/user/joshspeagle.github.io/assets/data/publications_data.json).
3. Renders: home-dark.png, home-light.png, pubs-dark.png, pubs-light.png at 1440 wide, plus home-mobile.png at
   390 wide (dark). Use render.cjs. Iterate at least twice on your own renders.
4. DESIGN.md — ≤ 1.5 pages: the idea, the palette (dark + light values), the board-layer mechanics (how traces
   are routed between real boxes, how the scroll glow works, the no-JS fallback), what to retire from the
   current site, and why it is not Claude-y. Keep it short.
Fonts: <link rel="stylesheet" href="file:///home/user/joshspeagle.github.io/assets/css/fonts.css">.
Theme via data-theme on <html> from localStorage 'preferred-theme' (default dark). Never modify the repo.

## ADDENDUM (owner, after round 2 started) — the hero animation is NOT negotiable
The owner: "One thing everything got rid of was the idea at the top of the page: a visual animation that
highlights going from astronomical data on the left, through machine learning / deep learning, to get
inferences on the right (SBI or MCMC style). The current version is passable and was based on having the
information *flow* through a neural network and have it light up to generate samples (diffusion model /
normalizing-flow style), with the neural network maybe looking like a constellation."
So the hero MUST keep and improve that narrative, ANIMATED:
  LEFT  — the observations: a sparse sky / galaxy field (the data);
  MIDDLE — a layered network drawn as a constellation (nodes are stars, edges are the traces); signal
           pulses travel left→right along the edges and nodes light up as the signal passes;
  RIGHT — each pulse that exits the network lands as a sample; samples accumulate into a posterior
           (a correlated 2-D cloud with iso-density contours emerging as the count grows).
It runs continuously but quietly (30 fps cap, pauses off-screen, static pre-filled frame under
prefers-reduced-motion — exactly the behaviour of the current assets/js/redesign/hero.js, which is the
starting point: read it). The board traces of the rest of the page should visibly ORIGINATE from this
network (the hero is where the circuit is densest; the page's traces are its continuation).
Judges: a variant whose hero is a static picture, or that drops data → network → samples, loses heavily on
owner_taste_fit and board_motif. The synthesis MUST specify the animated hero.
