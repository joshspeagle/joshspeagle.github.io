# Synthesis F — "The board, editorial" (E3) wearing E2's ink band, with E1's flat figures

Build on E3 (mockups/E3-board-editorial: home.html, publications.html, hero.js, board.js, DESIGN.md — read all).
KEEP from E3, unchanged in behaviour:
- The animated canvas hero: observations (sparse sky + galaxies, left) → constellation network whose nodes
  light as pulses cross (middle) → samples landing and accumulating into a posterior with iso-density
  contours (right); labels OBSERVATIONS / NETWORK / POSTERIOR beneath; 30 fps cap, off-screen pause,
  pre-filled still under prefers-reduced-motion. Give the drawing MORE presence than E3 (it is the site's
  signature): larger, nodes with a soft copper glow when lit, samples visibly landing.
- board.js: the measured spine that leaves the hero network at 45°, runs the rail channel with a square
  node at every section, taps sideways into the blocks it feeds (never across text), a fainter right-margin
  return bus, a ground symbol above the footer; the scroll-driven dash/glow that lights each section node as
  it passes; no-JS = no board. All corners 45° chamfers (fix E3's soft rounding on the return bus).
- Rules instead of boxes; research areas as ruled rows with real paper counts; Opportunities as an
  IF-YOU-ARE / THEN table; publications role table with a WHAT IT MEANS column; the first-person note
  explaining the figures (write one for the homepage too); one copper action + one text link per screen.
GRAFT from E2 (mockups/E2-board-condensed), in this order:
1. The solid ink band carrying nav + hero + the four headline figures as ONE block, staying dark on the
   cream light theme (his infographic's signature move); the hero canvas lives inside the band.
2. The publications header: title on the band with the ADS / Scholar / arXiv / ORCID identifier table ruled
   beside it.
3. Alternating ground tones between sections (structure from flat colour, not more rules).
4. The solid orange square tag ("ASTROSTATISTICS · UNIVERSITY OF TORONTO") in place of any letterspaced kicker.
5. E2's tighter vertical rhythm and density (E3's lower half is too airy); 3px solid left-edge tiles ONLY
   where a tile genuinely remains (e.g. the ART block, featured papers).
GRAFT from E1 (mockups/E1-board-serif): the flattened publications figure suite — hard-segmented share bar
(no blended joins) with square swatch legend, thin copper area line for citations with a single labelled
endpoint, flat role columns, the RIQ bar set (keep RIQ, E3 dropped it) — and the 10px category square
leading each paper row.
CUT, without negotiation: E3's 01–05 rail numbering and every uppercase eyebrow (the rail keeps ONLY real
information: a paper count, a date, a location, a link); E2's primary+ghost button pairs (hero and ART);
E1's floating margin glow dots; E2's condensed all-caps NAME (the name and section titles stay Source Serif 4
— that is A's warmth); Barlow Condensed entirely; Archivo Narrow only for table heads and square tags;
blended segment edges on any share bar.
MOBILE (390): drop the rail and the return bus; keep the hero animation with a reduced node count; keep the
spine as a single left hairline with section vias so the board still reads.
DELIVERABLES in mockups/F-synthesis/: home.html, publications.html, talks.html (prove the ruled-row list +
flat filters pattern on a list page with real talks from content.json), hero.js, board.js, board.css (or
inline), renders home-dark/home-light/pubs-dark/pubs-light/talks-dark at 1440 + home-mobile at 390,
DESIGN.md ≤ 2 pages (palette both themes, type roles, spacing, the board mechanics, hero mechanics, the
retire list for the current redesign.css, and what to port into build_html.py / pages_*.py).
