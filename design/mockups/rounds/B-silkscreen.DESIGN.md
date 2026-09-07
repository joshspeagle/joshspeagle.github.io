# Variant B — "Silkscreen"

**Files** · `index.html` (self-contained mockup, 8 panels) · `dark.png` · `light.png` (1440 px wide, full page)

---

## 1. Concept

A printed circuit board has two ink layers: **copper**, which carries current, and **silkscreen**, the white
legend printed on top that names, numbers and registers everything. Variant B builds the whole site out of the
silkscreen layer. The circuit is drawn entirely in the neutral border/text tones — it is *structure*, never
decoration — so the four research-area tokens (`--cat-sla` violet · `--cat-ii` cyan · `--cat-ic` blue ·
`--cat-du` amber) become the only marks on the page that mean something by hue. Every section is numbered
(`01 / ABOUT`), every panel is a board with corner registration marks, every card carries mono metadata that is
real information — year, venue, role — never a decorative reference designator.

The hero states the thesis literally, left to right: **01 / DATA** is a sky drawn as a grid of solder pads with
an asterism routed across it; those nodes fan into a seven-lane **bus**; the bus enters a chip labelled
**02 / MODEL — INFERENCE · p(θ | D)**; three output pins feed **03 / POSTERIOR**, drawn as contour traces with a
lit via at the MAP estimate. Astronomy in, statistics out, on one board.

---

## 2. Tokens

### 2.1 Added (three, all derived — no new hue enters the system)

| Token | Dark | Light | Role |
|---|---|---|---|
| `--trace` | `rgba(138,151,194,.46)` | `rgba(103,100,93,.50)` | structural trace, 1 px. Spine, bus, axes, dividers |
| `--trace-dim` | `rgba(138,151,194,.28)` | `rgba(103,100,93,.30)` | board edges, outer contours, chart gridlines |
| `--trace-grid` | `rgba(138,151,194,.16)` | `rgba(103,100,93,.18)` | page dot-grid, sky pads, hatch |
| `--via-hole` | `#0a0e20` | `#fffefb` | the drill hole punched out of a via ring = board substrate |

`--trace*` are pure alpha ramps of the existing `--text-3` in each theme, so they cannot drift out of the
palette and they collapse correctly in greyscale. `--via-hole` is not a colour decision — it is whatever the
board under the via is.

### 2.2 Geometry tokens added

```
--r-board: 2px    /* board corners. Technical, near-square */
--r-pad:   1px    /* SMD pad / chip corners */
--fid:     9px    /* corner fiducial arm length */
--sw-hair: 1px  --sw-trace: 1.4px  --sw-bus: 1.8px
```

### 2.3 Changed / retired

| Retire | Replace with | Why |
|---|---|---|
| `--radius-card: 14px`, `--radius-panel: 20px` | `--r-board: 2px` | 14 px corners read "web card"; a board reads as a board only at ≈2 px |
| `--radius-pill: 40px` on buttons and chips | `--r-pad: 1px` | pills fight the drawing; SMD pads are square |
| `--grad` / `--grad-text` (violet→cyan gradients on the H1, buttons, timeline rail) | flat `--violet`, flat `--text` | a gradient assigns hue to something that has no category. It also collides with `--cat-ii` cyan |
| `--shadow-glow` | nothing | glow is not a printing process |
| Card left colour-stripe (4 px solid bar) | neutral edge trace broken by one category-coloured via | the stripe spends a lot of colour on one bit of information; the via spends 7 px |
| Hero starfield canvas (random particles + parallax) | the composed board drawing | random noise says nothing; the composition says data → model → posterior |
| Timeline `background: var(--grad)` rail | 1 px `--trace` trunk + branch | see §3.5 |

---

## 3. Motif rules

### 3.1 Routing
* Traces move **only at 0°, 90° and 45°**. No arcs anywhere except posterior contours, which are data.
* Bends are mitred, never radiused, `stroke-linejoin: round` for optical softening at 1.4 px only.
* Bus lanes are pitched at **15 px**; fan-in diagonals are always exactly 45°, so run length = |Δy|.
* Terminations: every trace ends in a via, a pad, a pin, or the board edge. **A trace never just stops.**

### 3.2 Stroke ladder (four widths, no others)

| Width | Use |
|---|---|
| 1 px | silkscreen grid, dividers, timeline spine, chart axes and gridlines |
| 1.4 px | structural traces, board edges, via rings, chip outline |
| 1.8 px | the bus, the chart series — the one "carrying" line in a drawing |
| 2.4 px (32u) | brand mark at ≤ 28 px only (optical size, see §3.7) |

### 3.3 The via kit (`<defs>`, centre-origin so `<use x y>` places the centre)

| Symbol | Geometry | Means |
|---|---|---|
| `#via` | ring Ø 7.2, drill Ø 2.2, sw 1.4 | a node: a star, a bus source, a timeline event, a section anchor |
| `#via-j` | ring Ø 9, drill Ø 2.4, sw 1.6 | a junction where traces merge |
| `#via-lit` | 1.6 halo + ring + solid Ø 3.4 core | the *current* / *active* node. **Max one per view** |
| `#pad` | solid r 1.6 | an observation or a posterior sample |
| `#dot` | solid r 2.2 | a plotted value on a chart series |
| `#tie` | solid r 2.2 | trace-to-trace tie point |
| `#star4` | concave diamond, r 5 | the brightest node in an asterism. Brand only |
| `#gnd` | stem + 3 decreasing bars | the end of a spine (footer, timeline) |

**Shape rule, enforced everywhere:** a **circle is a node**; a **square is a label**. Vias, pads and stars are
round. Chips, tags and pins are square. Nothing violates this, so shape alone tells you what a mark is —
which is what makes the drawing survive greyscale.

### 3.4 Colour rule for vias (the one place the system needs a decision)

* **Violet via** = structure. Section anchors, bus sources, hero nodes, the current timeline role, the nav mark.
* **Category-coloured via** = classified content. On a card, the single via on the edge trace carries the
  dominant research area, and it is the only coloured element on that card.
* **Neutral via** = an inert node with no meaning of its own (sky stars, past timeline events).

Everything else — every trace, every frame, every fiducial arm, every axis — is neutral. Hue is therefore never
the only channel: a category is always *also* named in the pad's label text.

### 3.5 Boards and fiducials
* A "board" is `1px solid var(--trace-dim)`, radius 2 px, with **9 × 9 px corner brackets** in violet at 62 %
  on all four corners (registration marks — they say "this panel is a printed object", and they give the eye a
  crop even when the panel background is nearly invisible in dark mode).
* Implemented as `.board::before/::after` plus one `<span class="fid">` — four brackets, zero extra markup weight.
* Page ground is a 24 px `radial-gradient` dot grid at `--trace-grid`: the pad grid of an empty board.

### 3.6 Silkscreen typography
* **Section kicker** — `01 / ABOUT`: 46 px lead trace, then mono .72 rem, number in `--text` at 700 / .18 em,
  slash in `--trace`, word in `--text-3` at .30 em. The number is a real index, so nav, sitemap and footer
  columns all share it (`01 / RESEARCH`, `02 / TEACHING`, `03 / ELSEWHERE`).
* **Card metadata** — mono .70 rem / .10 em uppercase, `year · venue · role`, dot separators in `--trace`,
  the load-bearing fields (`2024`, `Student-led`) in `--text-2` 600.
* **Edge text** — mono .62 rem / .26 em, used only on board edges: sheet stamps, footer rules, figure captions.
* **Body text stays Inter and headings stay Source Serif 4.** The mono is a *legend* layer, never prose.
* **Captions under panels** are mono but sentence case at .72 rem / 1.65 — tracked uppercase is unreadable past
  about eight words, which is a rule the current site breaks in several places.

### 3.7 The brand mark
A five-node asterism routed as one continuous trace on a 32u grid: `(5,26) → (11,20) → (19,20) → (25,14) → (25,7)`
with a branch `(19,20) → (23,24)` off a filled junction, terminating in a 4-point silkscreen star. Two 45° bends,
one 90° run, one branch — it is simultaneously a constellation and a net.

Three optical cuts, one drawing:

| Cut | Sizes | What changes |
|---|---|---|
| `#mark` | ≥ 32 px | annular vias (ring + drill), stroke 1.5u |
| `#mark-s` | 16–28 px | vias fill solid, stroke 2.4u, star +15 % |
| `#mark-16` | 16 px favicon | reduced to **three marks**: node, junction, star, with the trace to the star removed so nothing fuses |
| `#mark-box` | tiles / favicon 32 | mark inside a board outline with a pin-1 chamfer |

Clear space = one via diameter (7.2 px at nominal). Nav lockup: mark at 30 px, 1 px vertical rule, name in
Source Serif 700 with a mono `ASTROSTATISTICS · UNIVERSITY OF TORONTO` under-line.

### 3.8 Timeline
One trace, top to bottom, terminating in a ground symbol. Each event is a via on the trunk, aligned to the
baseline of its mono date line. **An overlapping role leaves the trunk at 45°, runs parallel 14 px to the
right for the length of its entry, and rejoins at 45°** — the tie points are solid dots. The entry's text
indents 14 px to match. The current role is the only `#via-lit` on the page. No second column, no dashed
"meanwhile" rail, no colour needed to say "concurrent".

### 3.9 Research icons
24u grid, 45°/90° routing, one stroke, terminated ends, drawn from the same via kit. Optical stroke is set from
CSS on the `<use>` so a single symbol serves both sizes: **1.3u at 34 px, 0.8u at 96 px** (a fixed stroke would
render 2.1 px and 6 px — the same drawing would look like two different families).

| | Drawing | Reads as |
|---|---|---|
| SLA | three pads fan in at 45° to a tall part, one output via | a learned mapping |
| II | a part with its shield lifted off; internal traces terminated in vias; pins both sides | opening the black box |
| IC | three posterior contours with a sampler walk entering from the corner to the mode via | inference |
| DU | the brand asterism: junction, branch, one 4-point star | the sky |

DU deliberately *is* the brand mark's geometry — the discovery area and the identity are the same drawing.

### 3.10 Charts
* Gridlines: `--trace-dim`, `stroke-dasharray: 1 4`, round caps — silkscreen dotting, not solid rules.
* Axes are traces with real tick marks; no chart junk, no box.
* Series: 1.8 px in `--violet`, `#dot` markers at every value, terminal point promoted to `#via-lit`.
* Direct label on the terminal point with a 1 px leader (`3,658 IN 2025`) — no legend, no tooltip dependency.
* Area is a **45° hatch pattern at 16 % opacity**, not a gradient fill: a fill you can print.
* Figure furniture in mono edge text: `FIG. 01`, source, and `GRID = 1,000` so the reader never has to
  reverse-engineer the scale.

---

## 4. Spacing

Everything sits on the existing 4 px `--space-*` scale; the drawing adds one rule: **SVG geometry is on a 2 px
sub-grid, and any repeated element (bus lanes, pin pads, sky pads) is on an even pitch** — 15 px lanes, 20 px sky
pads, 24 px page grid. Panel padding 34/36. Card padding 22 with 27 on the trace edge, so the text column starts
clear of the via. Board frames never touch content: minimum 20 px.

---

## 5. Implementation notes

* **All of it is static CSS + inline SVG.** One `<svg><defs>` sprite in the page footer holds the via kit, the
  brand cuts and the four icons; everything else is `<use href="#…">`. In `build_html.py` this becomes one
  `SPRITE` constant emitted once per page, and the generators emit `<use>` calls.
* Vias are centre-origin `<g>` in `<defs>` rather than `<symbol>` on purpose: `<use x y>` on a `<symbol>`
  positions the *top-left of the viewport*, which makes every placement an arithmetic error waiting to happen.
  Icons, which are placed by CSS box, stay `<symbol viewBox="0 0 24 24">`.
* Corner fiducials, the card edge trace and its via gap are pure CSS (`linear-gradient` with a transparent
  band), so cards of any height work with no JS and no per-card SVG.
* The hero is a single 820×420 `viewBox` SVG at `width:100%`; it scales to any column width. **Animation**:
  one `<animate>`-free approach — a `stroke-dasharray` pulse travelling the seven bus lanes, one lane every
  900 ms, driven by a 4 kB rAF loop; `@media (prefers-reduced-motion: reduce)` drops it and the static drawing
  is the fallback (it already reads without motion).
* Timeline row heights are explicit in the mockup so the spine SVG can be drawn once. In production
  `generate_biography` already knows the entries, so it emits the spine with computed `y` offsets — or, if
  variable heights are wanted, the trunk becomes a per-row CSS border and only the branch stays SVG.
* Contrast, both themes, checked against `--surface`: body `--text-2` (dark 8.9:1 / light 9.4:1), mono metadata
  and captions `--text-3` (dark 5.6:1 / light 5.2:1), pad labels `--text-2`. Category text is never coloured —
  only the 5 px pad square is — so `--cat-du` amber is not asked to pass as text.
* Greyscale check: with hue removed, the page still parses, because every category is named in text, every
  node is distinguished by ring-vs-solid, and the only "loud" mark is the lit via.

---

## 6. Risks

1. **Density fatigue.** Numbered kickers + fiducials + edge stamps + dot grid is a lot of legend. Mitigation
   already applied: fiducials only on *panel-level* boards, edge stamps only on the hero, chart and footer, and
   the page dot grid at 16 % — if it still reads busy, drop the dot grid first, fiducials second.
2. **Mono legibility.** Tracked uppercase mono is the variant's signature and its main accessibility risk. The
   rule above (tracked uppercase for ≤ 8 words; sentence case for anything longer) has to be enforced in
   `content.json` copy, not just in CSS.
3. **The 45° discipline is easy to break.** Any future contributor drawing a trace at an arbitrary angle
   destroys the effect instantly. Worth a lint note in `CLAUDE.md`: *traces are 0/45/90 only*.
4. **Retiring the gradient is a real loss** of the current site's warmth. Variant B is colder and more
   instrument-like by design; if the H1 gradient is non-negotiable it can stay, but then the hero has hue with
   no meaning and rule §3.4 is weakened.
5. **Two hero SVGs to maintain** (the composition + the sprite) rather than a canvas that draws itself. That is
   the price of it being pre-rendered, printable and readable by search engines.
6. **Light theme is warm paper, dark is deep board.** The traces are alpha ramps of two *different* neutrals, so
   the two themes are genuinely different drawings, not an inversion — good, but it means every new trace colour
   must be added to both blocks or it silently falls back.
