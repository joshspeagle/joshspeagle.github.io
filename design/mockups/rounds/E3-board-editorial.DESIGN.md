# E3 — The board, editorial

## The idea

The page is laid out like a printed research annual, not a website: wide margins, a
narrow left rail of labels, and a wide main column where **rules replace boxes**. Almost
every "card" on the current site becomes a ruled list row — the four research areas, the
ART highlights, the values, the whole publication list. Two things are allowed to be
solid blocks of colour: the top band and one copper action per page. Numbers that matter
are set large in Source Serif 4; everything else is quiet.

Down the boundary between the rail and the main column runs a single copper trace. It is
the only ornament on the site. It starts inside the hero animation, drops out of the
network, turns 45° and becomes the spine of the page; a small square node sits on it at
every section; short taps branch off it to the blocks it feeds; a fainter return bus runs
down the right margin and both converge on a ground symbol above the footer. The page is
one component on one board.

## Palette

| | dark (default) | light |
|---|---|---|
| substrate | `#0d0a08` | `#f7f2ea` cream |
| band (nav, footer, page head) | `#151009` | `#efe6d8` |
| ink / secondary / muted | `#f2ece5` · `#c3b6aa` · `#8d7f73` | `#1c1611` · `#524639` · `#7d6d5e` |
| rules | `#2b221b` / `#3a2e24` | `#ded2c1` / `#c9bba7` |
| copper (accent, trace, one button) | `#e0783f` | `#a94d16` |
| areas — SLA / II / IC / DU | `#a58cf5` `#4bc4bd` `#6ba4ef` `#e4b143` | `#6746c8` `#0e7d78` `#2f66b8` `#8a6412` |

Type: **Source Serif 4** display + large numerals · **Inter** body · **JetBrains Mono**
years, counts, IDs · **Archivo Narrow** (self-hosted, @fontsource) for the small uppercase
labels, table heads and square tags — it gives the micro-type a printed-document voice
that Inter cannot.

## Board mechanics

* **Routing is measured, not drawn.** `board.js` waits for layout, reads the position of
  every `[data-node]` (one per section, in the rail) and every `[data-tap]` /
  `[data-tap-r]` block, then emits one SVG behind the content. Corners are chamfered to
  45° by a small `route()` helper, so everything is orthogonal-plus-45° like real copper.
* **Nothing crosses a line of text.** The spine lives in the 26 px channel between rail
  and column. Left-column blocks tap the spine with a short 45° stub and a square via;
  right-column blocks (the portrait, the dog photos) tap the *return bus* in the right
  margin instead, so no trace ever runs across a paragraph. Long horizontal runs happen
  only in margins and in the gap above the footer.
* **The signal.** The spine is stroked a second time with a 120 px dash; scroll progress
  drives `stroke-dashoffset`, so a soft copper segment (blurred halo + hairline core)
  travels the rail as you read, and each node brightens while the head is within 90 px.
  It is the only animation on the page below the hero. `prefers-reduced-motion` (and
  `#still`) parks it at 34 % travel, which is what the stills show.
* **Fallback.** No JS → no SVG at all: the rail nodes are plain CSS squares and the page
  is complete without a single trace. The board is an enhancement, never structure.
* **Hero.** Canvas, 30 fps cap, pauses off-screen and on hidden tabs. Left: a sparse sky
  of stars and three galaxies (the observations). Middle: a 4–5–5–3 network drawn as a
  constellation, nodes as stars, edges as traces. Signals travel left→right, lighting
  each node they touch; every signal that exits the last layer lands on the right as one
  sample, and the samples accumulate into a rotated posterior with two iso-density
  contours. Under reduced motion it renders one pre-filled frame with five pulses
  mid-flight. The trace that becomes the page's spine leaves this drawing.

## What this retires

Rounded cards with 1 px borders and hover-lift; the pill-and-dot badge rows; the mono
kicker above every section; the boxed callout; the four icon cards; the Chart.js panels
(three flat SVG figures instead); the starfield-plus-two-buttons hero; the second copper
button per screen.

## Why it isn't Claude-y

No glass, no gradients, no blur on UI, no rounded chip rows, no sparkle, no `FIG. 01`
stamps, no numbered decoration — the only numbers on the page are counts and years. The
structure is carried by rules, a solid band and a left rail of labels, which is the
grammar of Josh's own first-year guide, not of a SaaS landing page. The one flourish is
a physical one: a copper trace with current in it.
