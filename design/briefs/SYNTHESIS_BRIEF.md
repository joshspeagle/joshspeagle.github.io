# Synthesis brief — Variant D ("Quiet copper, lit by a star")

Build on A (mockups/A-quiet-copper: index.html + DESIGN.md — read both fully) and graft, exactly:

FROM B (mockups/B-silkscreen):
1. The HERO COMPOSITION wholesale: sky drawn as a 20px grid of faint solder pads with an asterism routed
   across it → 45° fan into a 7-lane bus at 15px pitch → the INFERENCE chip (label "INFERENCE · p(θ | D)")
   → three output pins → posterior drawn as contour traces with ONE lit node at the MAP. Redraw it in A's
   language: copper 1.25px traces, A's 18%→100% source-end opacity gradient (eye starts at the data),
   A's four corner fiducials, A's rule that the only lit thing is the mode. Keep B's silkscreen labels
   "01 / DATA · 02 / MODEL · 03 / POSTERIOR" across the top.
   ALSO from C: a back layer — a sparse deterministic star field plus hairline sky links at ~40% of the
   front-copper alpha, so the sky has two layers the way a board does; and C's irregular (non-elliptical)
   posterior contour bloom instead of concentric ellipses.
2. The BRAND MARK: B's asterism (one continuous trace, two 45° bends, one 90° run, one branch off a
   filled junction, terminating in a four-point star) with its three optical cuts (112/56/28), tile 64,
   favicon 32, favicon 16 reduced to three marks, clear space = one via diameter — recoloured copper,
   with A's unequal-arm rule so it never scans as a pinwheel.
3. The NUMBERED SECTION INDEX ("01 / ABOUT") as real information shared across nav, footer columns and
   sitemap — set in A's --copper-ink at 11px / .2em, closed by A's trace divider, but adopt B's TAP: the
   45° stub that drops to a via marking where the next section solders on.
4. The CARD METADATA LINE (year · venue · role in mono, load-bearing fields in --text-2 600) above A's
   rail-and-pad card.
5. CHART FURNITURE onto A's chart: dotted silkscreen grid, 45° hatch area at 16% instead of a gradient
   fill, edge stamps "FIG. 01 / SOURCE: NASA ADS / GRID = 1,000"; keep A's copper leader + lit endpoint
   direct label. Retire the pseudo-log 100/500/1000/2000/3000 axis for a LINEAR axis with a direct
   endpoint label (C's point).
6. The shape law, stated verbatim in DESIGN.md: "a circle is a node, a square is a label".
7. The caption rule: tracked uppercase only for ≤8 words; sentence case beyond.
8. The <defs>/centre-origin symbol placement note and CSS-set optical stroke so one icon symbol serves 34px and 96px.

FROM C (mockups/C-living-constellation):
9. Replace A's #via-lit with C's FOUR-POINT STAR sparkle at 13–17px (keep A's halo geometry) — the one
   lit mark in every view is literally a star (the ART logo's atom). Use it ONLY for "the live one":
   current timeline role, chart peak, posterior mode, the DU icon's found object. At most one per view.
10. C's --glow / --halo pair: dark = soft bloom, light = 1px ring; one CSS rule, two designed answers;
    applies to nothing but the lit star.
11. C's "NOW" pad on the current timeline role.
12. C's paint contract for symbols: symbols paint from inherited stroke and fill only; callers set both on <use>.
13. C's deterministic seeded (LCG) star field so builds are byte-identical.

EXPLICITLY REFUSE: C's eight-token palette and multi-hue research icons (keep A's four icons, single hue
each); C's large filleted corners; B's global 2px radius purge (keep 8/14/20/40; spend --r-board 2px only
on the hero frame and chart frame); B's all-caps mono CTA (A's sentence-case copper button stays);
B's retirement of --grad/--grad-text (keep them for the H1 tagline only); any second animation loop —
allow at most one slow stroke-dashoffset pulse on the hero bus, behind prefers-reduced-motion.

ONE EXISTING-TOKEN CHANGE: nudge light --bg-1 / --bg-2 from cool blue-grey toward warm #f0efe9 / #ebe9e2
so copper stops fighting a lavender panel.

WRITE THE RULES DOWN in DESIGN.md as lint notes for tokens.json comments + CLAUDE.md: copper is only
ever a stroke or hollow ring, a category colour is only ever a fill; traces are 0/45/90 only; one lit
star per view; ≤7 traces per composition; one divider per section; one rail per card.

Deliverable: mockups/D-synthesis/index.html (same 8 panels + the token-proof panel), dark.png, light.png,
DESIGN.md (complete, self-contained spec — the implementation team will build from THIS document alone,
so it must include: every token with dark/light values; the full <symbol> sprite source (via, pad, star,
fid, gnd, the four research icons, the brand mark) as copy-pasteable SVG; stroke/size/spacing tables;
the hero SVG geometry rules; the divider/rail/timeline construction rules; what to retire in redesign.css).
