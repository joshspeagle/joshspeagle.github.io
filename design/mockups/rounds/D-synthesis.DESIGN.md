# Variant D — "Quiet copper, lit by a star"

**Files** · `index.html` (self-contained mockup: 8 panels, the token-proof plate and the mobile-crop proof)
· `dark.png` · `light.png` · `build.py` + `geom.py` (the generator; everything is deterministic)
· `sprite.svg` — **written by `build.py` from the same `SPRITE_DEFS` string it inlines into `index.html`**, so
the standalone sprite and the mockup's sprite cannot drift.

**This document is the implementation contract.** It is written so the build team can ship the system from
this file alone: every token with both theme values, the complete sprite as copy-pasteable SVG, the stroke /
size / spacing tables, the hero geometry, the construction rules for the divider, the card rail and the
timeline, and the list of `redesign.css` rules to retire.

---

## 1. Concept

The site already draws a constellation behind the hero. D does not add a second idea on top of it — it
re-materialises the one that is there as **copper routed on a substrate**. Every line on the page becomes a
trace, every terminal becomes a via or a land, every section gets a number, and **exactly one mark in any view
is lit — and that mark is literally a star**, the four-point sparkle out of the ART logo.

Three sources, one system:

* **From A (quiet copper)** — the discipline. One structural ink, held to gridline weight; copper is the
  page's skeleton and never carries a category, a statistic or a mood. Four corner fiducials. The source-end fade
  (18% → 85%, A's own values) so the eye starts at the data.
* **From B (silkscreen)** — the *argument*. The hero states the thesis literally, left to right: a sky of
  solder pads → a 45° fan into a seven-lane bus → the INFERENCE package → three pins → a posterior. The
  numbered section index, the card metadata line, the chart's figure furniture, the shape law.
* **From C (living constellation)** — the *life*. The one lit node is a star, not a ring; `--glow`/`--halo`
  are one CSS rule with two designed answers; a back layer of deterministic sky; a posterior that is an
  irregular bloom rather than a stack of ellipses.

Read the hero in two seconds: **data on the left, a model in the middle, an answer on the right, and the
answer is the only thing glowing.** That is Josh's job description drawn once, at large size, on the front page.

---

## 2. Tokens

### 2.1 Every token, both themes

This is the complete set the build depends on — the inherited tokens reprinted so this document alone is
enough, then the new ones. Inherited values are copied verbatim from `assets/data/tokens.json` and are
**unchanged** except the two marked ▲ in §2.2.

| token | dark | light |
|---|---|---|
| `--bg-0` | `#06080f` | `#f6f6f1` |
| `--bg-1` | `#0a0e20` | ▲ `#f0efe9` |
| `--bg-2` | `#0a1228` | ▲ `#ebe9e2` |
| `--surface` | `rgba(255,255,255,0.04)` | `#fffefb` |
| `--surface-2` | `rgba(255,255,255,0.06)` | `#f4f3ee` |
| `--border` | `rgba(255,255,255,0.08)` | `#e4e2d7` |
| `--text` | `#eef1fb` | `#14161d` |
| `--text-2` | `#aeb6d6` | `#46444c` |
| `--text-3` | `#8a97c2` | `#67645d` |
| `--violet` | `#8b7bff` | `#5b43d6` |
| `--violet-bright` | `#a99bff` | `#7c5cff` |
| `--cyan` | `#34d3e0` | `#0e9aa8` |
| `--blue` | `#5aa9ff` | `#1565c0` |
| `--cat-sla` (Statistical Learning & AI) | `#8b7bff` | `#5b43d6` |
| `--cat-ii` (Interpretability & Insight) | `#34d3e0` | `#0a7280` |
| `--cat-ic` (Inference & Computation) | `#5aa9ff` | `#1565c0` |
| `--cat-du` (Discovery & Understanding) | `#ffb454` | `#8f4d00` |
| `--cat-sec` (secondary / other) | `#ff85c0` | `#b1257a` |
| `--shadow-card` | `0 8px 30px rgba(0,0,0,0.35)` | `0 10px 30px rgba(40,38,28,0.10)` |
| `--radius-sm` | `8px` | same |
| `--radius-card` | `14px` | same |
| `--radius-panel` | `20px` | same |
| `--radius-pill` | `40px` | same |
| `--font-serif` | `'Source Serif 4', Georgia, 'Times New Roman', serif` | same |
| `--font-sans` | `'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif` | same |
| `--font-mono` | `'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace` | same |
| `--font-cjk` | `'PingFang SC','Hiragino Sans GB','Microsoft YaHei','Noto Sans CJK SC',sans-serif` | same |

### 2.1b The new set — two colours and one pair

| token | dark | light | role — never reassigned |
|---|---|---|---|
| `--copper-rgb` / `--copper` | `184 128 94` → `#b8805e` | `168 113 74` → `#a8714a` | **Board.** Every trace, rule, rail, via ring, fiducial, land, chart axis, board edge. |
| `--copper-ink` | derived | derived | copper pushed toward the ink colour so it can carry small type. `color-mix(in srgb, var(--copper) 62%, var(--text))` → `#cdab9a` / `#704e39`. |
| `--star-lit` | `#efe6ff` | `#2b1d7a` | **The live one.** The current role, the peak year, the posterior mode. At most one per view. |
| `--glow` | `rgba(155,140,255,.55)` | `transparent` | dark's answer to "this is lit": a bloom. |
| `--halo` | `transparent` | `rgba(43,29,122,.34)` | light's answer to "this is lit": a 1 px ring. |
| `--grad` | `linear-gradient(112deg,var(--violet-bright),var(--cyan))` | `linear-gradient(112deg,var(--violet),var(--cyan))` | **kept, but only for the H1 tagline phrase.** Nothing else on the site is allowed a gradient. |

### 2.2 The only change to an inherited token (▲ in §2.1)

The light theme's panel backgrounds were cool blue-greys, and warm copper on them read faintly lavender.

| token | was | now |
|---|---|---|
| light `--bg-1` | `#eef0f5` | **`#f0efe9`** |
| light `--bg-2` | `#e9ecf4` | **`#ebe9e2`** |

Everything else in `tokens.json` is untouched: `--cat-sla` violet, `--cat-ii` cyan, `--cat-ic` blue,
`--cat-du` amber, `--cat-sec` pink, all type tokens, all radii.

### 2.3 Geometry tokens

```css
--r-board: 2px;      /* spent ONLY on the hero frame and the chart frame */
                     /* in HTML: border-radius:var(--r-board)              */
                     /* in SVG:  .board-frame{rx:var(--r-board);ry:var(--r-board)}
                        — rx/ry are real CSS properties on <rect>; keep a
                        literal rx="2" attribute alongside as the fallback  */
--sw-hair:   1px;    /* silkscreen: grids, die outlines, tick marks, caption rules */
--sw-trace:  1.25px; /* every trace, rule, rail, card rail, chart leader */
--sw-struct: 1.75px; /* chip outline, chart series — the one "carrying" line */
```

`--radius-sm/card/panel/pill` = `8 / 14 / 20 / 40 px`, **unchanged**. B's global 2 px purge is refused: the
site's cards are cards. The chip package uses 10 px (`--radius-sm` + 2) and its die outline 5 px, so the two
rectangles read as a package and its contents rather than as two cards.

### 2.4 Copper alphas — the only ones in the system

| α | use |
|---|---|
| `.85` | a live trace (hero routing, chip outline) |
| `.75` | a rail, an axis baseline, the timeline trunk |
| `.55` | a section rule, a board edge |
| `.46` | the sky pad grid |
| `.38` | the tap stub, the chart silkscreen grid |
| `.28` | the back layer (sky links) — **exactly ⅓ of a live trace** (`.85 × ⅓ = .283`). That is the ratio to reuse when a new drawing needs a back layer: take the front value and divide by three. |
| `.055` | the page substrate grid |

### 2.5 Contrast, measured

`--copper-ink` resolves to **`#cdab9a`** (dark) and **`#704e39`** (light). Every figure below is the WCAG 2.1
ratio computed from the literal hexes in §2.1 / §2.1b — recomputable with three lines of Python, and it was.

|  | dark | light | floor |
|---|---|---|---|
| `--copper-ink` on `--bg-1` | **9.00** | **6.40** | 4.5 (text) |
| `--copper` as a 1.25 px line on `--bg-1` | **5.73** | **3.56** | 3.0 (graphics) |
| `--star-lit` on `--bg-0` | **16.61** | **12.42** | 3.0 |
| `--text-3` (mono legend) on `--bg-1` | 6.64 | 5.12 | 4.5 |
| `--text-2` (body) on `--bg-1` | 9.54 | 8.32 | 4.5 |
| primary button label on its copper fill | 5.97 (`#0d0803` on `--copper`) | 7.32 (`#fffefb` on `--copper-ink`) | 4.5 |

**Rule that falls out of the table: lines and vias use `--copper`; letters use `--copper-ink`.** Raw copper on
the warm light substrate is 3.6:1 — fine for a hairline, short of AA for a mono kicker. The one place raw
copper carries text is the dark primary button, and there the copper is the *background*, not the letter.

Greyscale (Rec.709 on the sRGB bytes): copper **137** dark / **122** light; `--cat-du` **189** / **85**;
`--star-lit` **234** / **39**; `--cat-sla` **136** / **83**. Copper and amber are never in the same band and the
sign of their separation flips between themes. The lit star is the extreme value in both directions in both
themes, so it survives greyscale, print and every simulated colour-vision deficiency.

**The one collision, named:** in *dark*, copper (137) and `--cat-sla` (136) are the same grey; in *light*,
`--star-lit` (39) and `--cat-sla` (83) are close and their colour contrast is only 2.06:1. Neither is a
failure, because neither pair is ever asked to be told apart by tone: the paint law means copper is never a
fill and `--cat-sla` is never a line, and the shape law means a star is four points and a category is a disc.
The distance rule in §7.6 is the belt to that pair of braces, and the last row of the token-proof plate
(panel 01b) shows the collision in colour and in greyscale, next to the shipped spacing.

---

## 3. The laws

Six of them. They are short on purpose; they are meant to be pasted into `tokens.json` as comments and into
`CLAUDE.md` as lint notes.

> **1. The paint law.** Copper is only ever a **stroke or a hollow ring**. A category colour is only ever a
> **fill**. **Three** named exceptions, and no fourth:
>   1. a **land** — a filled copper rectangle that is physically a piece of board (a chip pin, a gold finger,
>      a board-edge tab), always a rectangle, always ≤ 8 px on its short side, never carrying text;
>   2. a **research-area icon** — one glyph drawn entirely in one category hue, stroke and fill together;
>   3. an **action surface** — the primary button. A solid copper pill (`--copper` in dark, `--copper-ink` in
>      light) carrying its own text colour (`#0d0803` / `#fffefb`), **at most one per view**, never used for a
>      state, a tag, a chip or a badge. It is the only copper fill in the system that carries text, and it is
>      allowed because a button is not a drawing: it is a surface you press.
>
> *Reading, in one line:* **a line is copper · a hollow ring is structure · a filled rectangle is board · a
> filled circle is content** — a category `#pad` in a `--cat-*` hue, or a plotted `#dot` in the series colour.
> (`#dot` is why the one-liner says *content* and not *category*: a chart's values are filled circles too, and
> §4.3 says which glyph is which.)
>
> **2. The shape law** (verbatim from B). **A circle is a node, a square is a label.** Vias, pads, dots and
> stars are round. Chips, tags, pins and lands are square. Nothing violates it, so shape alone tells you what a
> mark is — which is what makes the drawing survive greyscale.
>
> **3. Traces are 0°, 90° and 45° only.** No arcs anywhere except posterior contours, which are data, not
> traces, and one licensed tilt named in §7.6. A trace turns **at most twice between two consecutive
> terminals** — so a net that crosses three vias may turn six times, but no single run between two of them
> may wander. **A trace never just stops** — it ends in a via, a land, a star or the board edge.
>
> **4. One lit star per production view.** `#star-lit` means "the live one" and nothing else: the current
> role, the peak year, the posterior mode, the object the Discovery icon has found. It is never "featured",
> never "important", never "new". *View* means a rendered page or a viewport crop of one — a mobile crop of
> the hero is a view, and panel 02b holds itself to the cap. **Specification plates are exempt** and are the
> only exemption: a swatch sheet whose subject *is* the token (panel 01b, panel 06) shows the mark at every
> licensed size on purpose. If a plate ever ships to a reader, the cap applies again.
>
> **5. Density caps.** ≤ 7 traces in any composition · one divider per section · one rail per card ·
> one animation loop on the whole site.
>
> **A trace is one signal net — one source terminal to one sink terminal — not one `<path>`.** Three rules
> for counting, because an uncountable cap is not a cap:
>   1. **Count nets, not paths.** A net may be several `<path>` elements and may bend, fan and re-converge.
>   2. **Count the front layer only.** The back layer (§6.6) is scenery and a `.pulse` overlay duplicates a net
>      already counted; neither is a trace.
>   3. **Routing inside a glyph belongs to the glyph.** The sky asterism's spine, its two entry/exit stubs and
>      its one dead-end branch are the shape of the *source*, the way a chip's die outline is the shape of the
>      package. They are not nets.
>
> By that convention the hero draws **seven** — one per bus lane. Each net runs sky leaf → tap via (x = 784) →
> 45° bend → lane → in-land, and three of the seven continue out of the package to a posterior landing. Twenty
> one `<path>` elements, seven signals. Elsewhere: the card rail is one, the timeline trunk-plus-branch is one,
> the chart leader is one, the section divider is one. Nothing on the site exceeds seven.
>
> **6. The caption rule.** Tracked uppercase mono for **≤ 8 words**. Anything longer is sentence case.
> **A `·` ends one stamp and begins another**, so the count is per stamp, not per line: an edge stamp reading
> `ONE LIT STAR PER VIEW · PULSE 1.15 s` is two stamps of five and three, and it passes. A stamp may not be
> split at a `·` to smuggle a sentence through — each side has to stand alone as a label. Anything that needs a
> verb is sentence case in `--text-3`, not tracked caps. (Enforced in `content.json` copy, not just in CSS.)

---

## 4. The sprite

Emit **once per page**, from `pages_shared.py`, into a zero-size `<svg>` at the top of `<body>`.
**4,744 bytes of markup** (7,406 as shipped in `sprite.svg`, the difference being the comments, which a
build step may strip). Everything else on the page is a `<use>`.

### 4.1 Placement and paint contract

* **Board furniture** lives in `<defs>` as **centre-origin `<g>`**, placed by
  `<use href="#via" transform="translate(x,y)"/>` — optionally `… scale(k)`. It is deliberately *not*
  `<symbol>`: `<use x y>` on a `<symbol>` positions the top-left of the viewport, which makes every placement
  an arithmetic error waiting to happen.
* **Icons and the brand mark** stay `<symbol viewBox="0 0 24 24">` / `"0 0 32 32"`, because they are placed by
  a CSS box, and `stroke-width` set on the `<use>` (or its host `<svg>`) inherits into the shadow tree — so
  one symbol serves 34 px and 96 px.
* **Paint contract** (from C): document CSS selectors do not reach into a `<use>` shadow tree, so every symbol
  paints itself from the two **inherited** paint properties only — `stroke` for routing and rings, `fill` for
  pads, dots and stars. **Callers set both on the `<use>`.** No `currentColor`, no `context-fill`, no
  custom-property tricks that vary by engine.

Three caller classes cover the whole site:

```css
.cu    { stroke: var(--copper);                    fill: var(--copper); }   /* mark only */
.cu-d  { stroke: rgb(var(--copper-rgb) / .55);     fill: none; }            /* every via, fid, gnd */
.lit   { fill: var(--star-lit); stroke: var(--halo);
         filter: drop-shadow(0 0 5px var(--glow)) drop-shadow(0 0 14px var(--glow)); }
```

A category pad is `style="fill:var(--cat-ic)"` on the `<use>`. That is the whole colouring system.

### 4.2 The sprite, complete

```html
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>

  <!-- BOARD FURNITURE — centre-origin <g>.  <use transform="translate(x,y) [scale(k)]"> -->
  <g id="via">   <circle r="4.6" fill="none" stroke-width="1.6"/></g>
  <g id="via-j"> <circle r="5.4" fill="none" stroke-width="1.9"/><circle r="1.5" fill="none" stroke-width="1.1"/></g>
  <g id="pad">   <circle r="3.6" stroke="none"/></g>
  <g id="dot">   <circle r="2.4" stroke="none"/></g>
  <g id="fid">
    <circle r="5" fill="none" stroke-width="1.3"/>
    <path d="M0,-7.6 V-4.6 M0,4.6 V7.6 M-7.6,0 H-4.6 M4.6,0 H7.6" fill="none" stroke-width="1.3" stroke-linecap="round"/>
  </g>
  <g id="gnd">
    <path d="M0,-9 V0 M-7.5,0 H7.5 M-4.6,3.6 H4.6 M-1.9,7.2 H1.9" fill="none" stroke-width="1.6" stroke-linecap="round"/>
  </g>
  <!-- THE ONE LIT MARK.  Halo r = 1.61 x the star radius (A's via-lit ratio). -->
  <g id="star-lit">
    <circle r="10.5" fill="none" stroke-width="1"/>
    <path d="M0,-6.50 C0,-1.10 1.10,0 6.50,0 C1.10,0 0,1.10 0,6.50 C0,1.10 -1.10,0 -6.50,0 C-1.10,0 0,-1.10 0,-6.50 Z" stroke="none"/>
  </g>
  <g id="star">
    <path d="M0,-5.00 C0,-0.85 0.85,0 5.00,0 C0.85,0 0,0.85 0,5.00 C0,0.85 -0.85,0 -5.00,0 C-0.85,0 0,-0.85 0,-5.00 Z" stroke="none"/>
  </g>

  <pattern id="skypads" width="20" height="20" patternUnits="userSpaceOnUse">
    <rect x="8.9" y="8.9" width="2.2" height="2.2" rx="0.4" fill="rgb(var(--copper-rgb)/0.46)"/>
  </pattern>
  <pattern id="hatch45" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <line x1="0" y1="0" x2="0" y2="8" stroke="var(--violet)" stroke-width="1" opacity=".16"/>
  </pattern>

  <!-- ===== BRAND MARK — 32u grid ==========================================
       One continuous trace (5,26)-(11,20)-(19,20)-(25,14)-(25,7.5), a branch
       off the junction at (19,20) to (23,24), terminating in a four-point star.
       Two 45 deg bends, one 90 deg run, one branch: a constellation and a net.
       UNEQUAL-ARM RULE: the chain is four runs (8.49 / 8.00 / 8.49 / 6.50 u)
       with a 5.66 u branch off the junction.  No two ADJACENT runs are equal,
       the branch is the shortest thing in the mark, and the chain turns
       45 / 0 / 45 / 90, so it can never resolve into a pinwheel or a plus.
       ===================================================================== -->
  <symbol id="mark" viewBox="0 0 32 32">
    <g fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 26 L11 20 H19 L25 14 V7.5"/><path d="M19 20 L23 24"/>
    </g>
    <circle cx="5"  cy="26" r="2.1" fill="none" stroke-width="1.4"/>
    <circle cx="11" cy="20" r="2.1" fill="none" stroke-width="1.4"/>
    <circle cx="23" cy="24" r="2.1" fill="none" stroke-width="1.4"/>
    <circle cx="19" cy="20" r="2.6" fill="none" stroke-width="2.1"/>
    <g transform="translate(25,7) scale(.92)"><use href="#star"/></g>
  </symbol>
  <!-- 16-28 px optical cut: the drills would silt up, so the rings go solid.
       OPTICAL, not semantic — the mark is one glyph, exempt from the paint law. -->
  <symbol id="mark-s" viewBox="0 0 32 32">
    <g fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 26 L11 20 H19 L25 14 V8"/><path d="M19 20 L23 24"/>
    </g>
    <circle cx="5"  cy="26" r="2.6" stroke="none"/>
    <circle cx="11" cy="20" r="2.6" stroke="none"/>
    <circle cx="23" cy="24" r="2.6" stroke="none"/>
    <circle cx="19" cy="20" r="2.9" stroke="none"/>
    <g transform="translate(25,7) scale(1.15)"><use href="#star"/></g>
  </symbol>
  <!-- 16 px favicon: three marks only — node, junction, star -->
  <symbol id="mark-16" viewBox="0 0 32 32">
    <path d="M9 23 L17 15" fill="none" stroke-width="3.6" stroke-linecap="round"/>
    <circle cx="9"  cy="23" r="3.4" stroke="none"/>
    <circle cx="17" cy="15" r="4.2" stroke="none"/>
    <g transform="translate(25,7) scale(1.4)"><use href="#star"/></g>
  </symbol>
  <!-- boxed: tile 64 / favicon 32.  Board outline with a pin-1 chamfer. -->
  <symbol id="mark-box" viewBox="0 0 32 32">
    <path d="M7 1.5 H30.5 V30.5 H1.5 V8 Z" fill="none" stroke-width="1.1" opacity=".45"/>
    <g transform="translate(16,16) scale(.78) translate(-16,-16)">
      <g fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 26 L11 20 H19 L25 14 V7.5"/><path d="M19 20 L23 24"/>
      </g>
      <circle cx="5"  cy="26" r="2.4" stroke="none"/>
      <circle cx="11" cy="20" r="2.4" stroke="none"/>
      <circle cx="23" cy="24" r="2.4" stroke="none"/>
      <circle cx="19" cy="20" r="2.8" stroke="none"/>
      <g transform="translate(25,7) scale(1.05)"><use href="#star"/></g>
    </g>
  </symbol>

  <!-- ===== RESEARCH ICONS — 24u grid, 90/45 only, one hue each ============
       stroke-width is set in CSS on the <use>: 1.25u @96 px, 1.7u @34 px.
       ===================================================================== -->
  <symbol id="ic-sla" viewBox="0 0 24 24">
    <g fill="none">
      <path d="M4.4 5.9L8.2 9.7V12h2"/><path d="M4.4 18.1L8.2 14.3V12"/>
      <path d="M14 12h1.8l3.8-3.8"/><path d="M14 12h6"/><path d="M14 12h1.8l3.8 3.8"/>
    </g>
    <g stroke="none">
      <circle cx="3.4" cy="5" r="1.25"/><circle cx="3.4" cy="19" r="1.25"/>
      <circle cx="12" cy="12" r="1.7"/>
      <circle cx="20.6" cy="7.4" r="1.25"/><circle cx="21" cy="12" r="1.25"/><circle cx="20.6" cy="16.6" r="1.25"/>
    </g>
  </symbol>
  <symbol id="ic-ii" viewBox="0 0 24 24">
    <g fill="none">
      <path d="M5.5 9.8V17.5A2 2 0 0 0 7.5 19.5H16.5A2 2 0 0 0 18.5 17.5V9.8"/>
      <path d="M4.2 7.4L19.8 5"/><path d="M9.9 16.2H11.9L14.2 13.9"/>
      <circle cx="15.5" cy="13.1" r="1.7"/>
    </g>
    <circle cx="9" cy="16.2" r="1.3" stroke="none"/>
  </symbol>
  <symbol id="ic-ic" viewBox="0 0 24 24">
    <g fill="none">
      <ellipse cx="13.6" cy="13" rx="7.4" ry="5.4" transform="rotate(-20 13.6 13)"/>
      <ellipse cx="13.6" cy="13" rx="4.9" ry="3.5" transform="rotate(-20 13.6 13)"/>
      <ellipse cx="13.6" cy="13" rx="2.4" ry="1.7" transform="rotate(-20 13.6 13)"/>
      <path d="M2.6 3.4h2.2l7.1 7.1"/>
    </g>
    <g stroke="none"><circle cx="1.9" cy="3.4" r="1.2"/><circle cx="13.6" cy="13" r="1.5"/></g>
  </symbol>
  <!-- DU: a fiducial closed on something found.  The found object is the
       four-point star — the only place a star appears inside an icon. -->
  <symbol id="ic-du" viewBox="0 0 24 24">
    <g fill="none">
      <path d="M7 9.4V6.4A1.4 1.4 0 0 1 8.4 5H11"/><path d="M15 5H17.6A1.4 1.4 0 0 1 19 6.4V9.4"/>
      <path d="M19 13.6V16.6A1.4 1.4 0 0 1 17.6 18H15"/><path d="M11 18H8.4A1.4 1.4 0 0 1 7 16.6V13.6"/>
    </g>
    <g stroke="none">
      <g transform="translate(13,11.5) scale(.80)"><use href="#star"/></g>
      <circle cx="3.2" cy="16.6" r="1.15"/><circle cx="21.6" cy="3.4" r="0.95"/>
    </g>
  </symbol>
</defs></svg>
```

### 4.3 Glyph meanings and licensed sizes

| glyph | means | native Ø | licensed scales → displayed size |
|---|---|---|---|
| `#via` | a structural node: a source, an event, a section anchor, a landing | 10.8 px | nine licensed scales, and no others: `.55`→6.0 (pin 1, back layer) · `.58`→6.3 (kicker bullet) · `.60`→6.5 (timeline branch tie) · `.62`→6.7 (zone marker, bus tap, posterior landing) · `.72`→7.8 (sky node) · `.75`→8.1 (divider anchor) · `.80`→8.6 (adjacency proof) · `.82`→8.9 (timeline event, sky junction) · `1.0`→10.8 (nominal, clear-space unit) |
| `#via-j` | a junction where three or more traces meet | 12.7 px | `.82`→10.4 · `1.0`→12.7 |
| `#pad` | **a category.** A filled circle, always in a `--cat-*` hue | 7.2 px | `.72`→5.2 · `.78`→5.6 |
| `#dot` | a plotted value on a chart series | 4.8 px | `.92`→4.4 |
| `#star-lit` | **the live one.** ≤ 1 per view | 13 px star / 21 px halo | `1.0`→13 (chart peak) · `1.15`→15 (current role) · `1.30`→17 (hero mode) |
| `#star` | the mark's terminal, and the DU icon's found object. **Never used loose on a page.** | 10 px | inside symbols only |
| `#fid` | board registration. Hero frame corners only, at 50% α | 15.2 px | `.9`→13.7 |
| `#gnd` | the page ends here. Footer only | 18 px | `1.0` |

Never below 6 px: a ring with a 1.6 px stroke goes soft under that on a 1× display.

---

## 5. Stroke, size and spacing tables

### 5.1 Strokes — four widths, no others

| width | use |
|---|---|
| **1 px** | silkscreen: page/hero grids, die outlines, tick marks, caption rules, the back layer |
| **1.25 px** | **the trace.** Section rules, card rails, the timeline trunk, hero routing, chart leader, chart grid |
| **1.75 px** | structural outline: the chip body, the chart series |
| **1.5 / 2.4 / 3.6 u** | the brand mark's three optical cuts (32u grid) at ≥32 / 16–28 / 16 px |

Round caps, round joins, everywhere. **The corner radius of the motif *is* the stroke radius** — there is no
separate corner value to remember or to get wrong.

### 5.2 Type

| role | family | size | tracking | colour |
|---|---|---|---|---|
| section kicker `01 / About` | mono | 11 px | .20 em | number `--copper-ink` 700 · slash `--copper` .75 · word `--text-3` |
| card metadata line | mono | 10.5 px | .10 em, uppercase | `--text-3`; load-bearing fields `--text-2` 600; separators `--copper` .8 |
| state pill (NOW · Student-led · Invited · Concurrent) | mono | 10.5 px | .15 em, uppercase | `--copper-ink` on a 1 px `--copper` .6 pill |
| chip / tag | mono | 11 px | .05 em | `--text-2`, with a 5.2 px category `#pad` |
| edge stamp (figure furniture, board edges) | mono | 9.5 px | .24 em, uppercase | `--text-3` |
| silkscreen label in SVG | mono | 11 px | 2.6 px | `--text-3`; the numeral `--text` 700 |
| body / headings | Inter / Source Serif 4 | unchanged | | |

Mono is a **legend** layer. It never sets prose.

### 5.3 Spacing

Unchanged 4 px scale (4/8/12/16/24/32/48/64/80). Constants the drawing adds:

| constant | value |
|---|---|
| page substrate grid | **32 px**, copper .055 |
| hero silkscreen grid | **48 px**, copper .07 — the hero reads calmer than the page |
| sky pad grid | **20 px**, a 2.2 px land at copper .46 |
| bus lane pitch | **15 px** |
| card rail gutter | 48 px; rail at x = 10 → 18 |
| timeline gutter | 74 px; trunk at x = 24; branch offset **+16 px** |
| timeline row pitch | 152 px |
| board-edge land | 22 × 6 px at a 30 px pitch |
| mark clear space | **one via diameter** (10.8 px at nominal) on every side |

---

## 6. Hero geometry (1440 × 720)

The whole composition is one inline SVG at `viewBox="0 0 1440 720"`. Nothing here is a canvas; nothing is
fetched at runtime; the static HTML *is* the drawing.

### 6.1 Zones and the reading line

| zone | x range | silkscreen label at y = 118 |
|---|---|---|
| copy block | 100 → 600 | — |
| **01 / DATA** — sky | 604 → 804 | via (610,114) · `01` 624 · `/` 646 · `DATA` 660 · rule 716→824 |
| fan + bus | 784 → 986 | — |
| **02 / MODEL** — chip | 986 → 1136 | via (952,114) · `02` 966 · `/` 988 · `MODEL` 1002 · rule 1072→1128 |
| **03 / POSTERIOR** | 1150 → 1380 | via (1176,114) · `03` 1190 · `/` 1212 · `POSTERIOR` 1226 · rule 1334→1396 |

### 6.2 The sky (01 / DATA)

* `<rect x=604 y=148 width=200 height=380 fill="url(#skypads)"/>` — a 10 × 19 pad field.
* One routed asterism on the pad lattice: a vertical **spine** at x = 664 from y = 248 to 448, two **junction
  vias** (`#via-j`) at (664,248) and (664,448), a **midpoint via** at (664,348), an entry stub from the board
  edge `M604 178 L664 238`, an exit stub `M664 458 L614 508`, and one dead-end branch `M704 208 L744 168` that
  keeps the drawing from reading as a machine-made fan.
* **Seven terminals** at x = 784, y = `188 248 308 348 388 448 508`. Leaves alternate 45°-up / straight /
  45°-down off each junction.
* Painted with `stroke="url(#skyFade)"`, a `userSpaceOnUse` gradient x1 = 604 → x2 = 800, **.18 → .80**.

### 6.3 The fan and the bus

Seven lanes at **15 px pitch**, `y = 303 318 333 348 363 378 393`, centred on the chip.

Every lane is `M 784,tapY  H bendX  L 930,laneY  H 986`, with **`bendX = 930 − |laneY − tapY|`** so every
diagonal is exactly 45°. The seven bend x's come out symmetric — `815 860 905 — 905 860 815` — and lane 4 runs
dead straight, which is the spine of the composition.

Painted with `stroke="url(#traceFade)"`, `userSpaceOnUse` x1 = 604 → x2 = 986, stops **.18 → .85 at 42% → .85**.
That is A's rule: the eye starts at the data.

### 6.4 The chip (02 / MODEL)

```
package  x 986  y 282  w 150  h 132  rx 10   fill --surface-2   stroke copper .85 @1.75
die      x 1004 y 300  w 114  h  96  rx  5   fill none          stroke copper .32 @1
in lands  <rect x=972  y=laneY-3 w=14 h=6 rx=1.5>   x7   fill copper .9
out lands <rect x=1136 y=pinY-3  w=14 h=6 rx=1.5>   x3   pinY = 318 348 378
top lands <rect x=1024 y=276 w=6 h=12 rx=1.5> and <rect x=1060 y=276 w=6 h=12>
                                                       fill copper .9  (orientation
                                                       keys: the package has a top)
pin-1     #via at (1000,296) scale .55
text      "INFERENCE"  x 1061 y 342  12 px / 2.4 tracking / --text-2
          "p(θ | D)"   x 1061 y 362  10.5 px / 1.4 tracking / --text-3
rule      M1016 372 H1106   copper .35 @1
```

**Seven traces in, three out.** That is the density cap and it is also the argument: inference is a reduction.

### 6.5 The posterior (03 / POSTERIOR)

Not concentric ellipses. One irregular closed curve sampled at 84 points, with two low harmonics, and a centre
that walks toward the mode as the level shrinks — so the bloom is a posterior, not a target.

```python
PC = dict(cx=1280.0, cy=348.0, rx=92.0, ry=74.0, ph=0.9)

def cpt(t, m):
    f  = 1 + .13*cos(2*t + PC['ph']) + .06*cos(3*t - 1.7*PC['ph'])
    cx = PC['cx'] - 10*(1 - m)          # inner levels shift toward the mode
    cy = PC['cy'] +  6*(1 - m)
    return (cx + PC['rx']*m*f*cos(t), cy + PC['ry']*m*f*sin(t))

contour(m) = "M" + " L".join(cpt(2πi/84, m) for i in range(84)) + " Z"
MODE       = (PC['cx'] - 10, PC['cy'] + 6)          # (1270, 354)
```

| level `m` | stroke | α |
|---|---|---|
| 1.00 | `--violet` | .26 |
| 0.78 | `--violet` | .38 |
| 0.56 | `--violet` | .52 |
| 0.34 | `--violet-bright` | .66 |
| 0.16 | `--violet-bright` | .82 |

plus one fill at `color-mix(in srgb, var(--violet) 12%, transparent)` on the m = 1 path. All contours at
1.25 px. *Contours are data, so they are the one licensed exception to the 0/45/90 rule.*

**The three output routes** land on the m = 1 contour at `t = π+1.05, π, π−1.05`, i.e. (1240.0, 291.9),
(1180.8, 348.0), (1232.0, 415.3), each closed by a `#via`:

```
M1150 318 H1163 L1189 292 H1240.0
M1150 348 H1180.8
M1150 378 H1170 L1207 415 H1232.0
```

**The mode** is `#star-lit` at (1270, 354) `scale(1.30)` = 17 px, class `lit`, with the direct label `MODE` in
mono 11 / 1.6 at (1296, 358). It is the only lit thing in the composition, and on the page.

### 6.6 The back layer

A board has two layers, and so does the sky.

* **Star field** — 420 candidate points from a seeded LCG (`seed = 20260907`, glibc constants), thinned where
  the copy block and the chip sit, kept at r 0.4–1.35 and α .12–.45. Class `.field`: `fill: var(--text)`,
  `opacity:.92` dark / `.34` light. **Seeded, so every build is byte-identical** — this is generated at build
  time and committed, and the CI staleness gate depends on it.
* **Sky links** — two small routed asterisms, top-left (above the copy) and bottom-right (below the
  posterior), at **copper .28 — one third of the .85 live-trace alpha** (§2.4), 1 px, with `#via` nodes at 30% α. They give
  the sky depth without competing; they are never allowed to cross a silkscreen label.

### 6.7 Frame and edge

* Four `#fid` at (44,44) (1396,44) (44,676) (1396,676), `scale(.9)`, copper at 50%.
* `--r-board: 2px` on the hero container. This and the chart frame are the only two places it is spent.
* Two edge stamps at y = 682: `BOARD REV. D · TRACES 0 / 45 / 90 ONLY` at x = 100 and
  `ONE LIT STAR PER VIEW · PULSE 1.15 s` anchored end at x = 1340. Both are two stamps of ≤ 5 words each,
  which is what the `·` means — see law 6.

### 6.8 Motion — one loop, and only here

```css
.pulse { opacity: 0; }                                   /* the honest default */
@media (prefers-reduced-motion: no-preference) {
  .pulse { opacity: 1; stroke-dasharray: 26 660; animation: flow 11s linear infinite; }
  @keyframes flow { from { stroke-dashoffset: 686 } to { stroke-dashoffset: 0 } }
}
```

Seven overlay paths duplicating the bus lanes, `stroke: var(--copper)` at 1.6 px, staggered
`animation-delay: i × 1.15s`. **Nothing else on the site animates.** The pulse is opt-in by media query rather
than opt-out, so the static drawing is the default and there is no fallback code to write.

### 6.9 Mobile — crop, never scale

Below ~900 px the composition **crops**: same markup, same coordinates, no transform, only the `viewBox`
window moves. Two windows, both `390 × 448` at scale 1.0, are drawn live in **panel 02b** so the plan is
checkable rather than asserted:

| crop | `viewBox` | keeps | drops |
|---|---|---|---|
| **A — data** | `560 96 390 448` | `01 / DATA`, the pad sky, the routed asterism, the 45° fan, the bus leaving the right edge | the package and the posterior; **no lit star, correctly** |
| **B — answer** | `998 96 390 448` | `03 / POSTERIOR`, the package bleeding off the left edge, three output pins, the whole posterior, the mode | the sky and the fan |

Both windows are chosen so that **no glyph is cut mid-letter**: A's right edge falls in the gap before the
`02` zone marker at x = 952, B's left edge falls in the gap between the `/` at x = 988 and `MODEL` at
x = 1002. When you move a window, move it to a gap.

Why crop: at 390/1440 a uniform scale puts the 15 px bus pitch at 4.1 px and the 1.25 px trace at 0.34 px —
below a device pixel, so the bus greys out into a smear. Cropping keeps every dimension in the spec exactly
as specified. Each half is a complete sentence, so a breakpoint may ship either one.

### 6.10 The stat row

Under the buttons, in the card-metadata voice (mono 11 / .12 em uppercase, `--text-3`, figures `--text-2` 600,
`·` separators in copper .8): **`137 papers · 18,160 citations · 28 mentees`**. It is copy, not routing, so it
lives in the hero *copy* block and never in the SVG — but it is live content and it stays. The citation total
is the same number the chart's top-right edge stamp carries (§7.5); if one changes, both change, and the
figure lives once in `content.json`.

---

## 7. Construction rules

### 7.1 The section divider — a rule with a via and a tap

One divider per section. Width = the content column; height 42.

```html
<svg width="W" height="42" viewBox="0 0 W 42">
  <path d="M0 10 H90"      stroke="rgb(var(--copper-rgb)/0.55)" stroke-width="1.25"/>
  <use href="#via" transform="translate(102,10) scale(.72)" class="cu-d" stroke-opacity=".75"/>
  <path d="M114 10 H W"    stroke="rgb(var(--copper-rgb)/0.55)" stroke-width="1.25"/>
  <path d="M186 10 L206 30 H262" stroke="rgb(var(--copper-rgb)/0.38)" stroke-width="1.25"
        fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <use href="#via" transform="translate(268,30) scale(.58)" class="cu-d" stroke-opacity=".5"/>
</svg>
```

Read it as: the rule runs unbroken so the page never looks torn; **the via at x = 102 is this section's own
anchor**; **the 45° stub is a tap that drops to a second via, marking where the next section solders on.**
The stub's terminal via may carry an edge stamp naming that section (`02 / RESEARCH SOLDERS ON HERE`).

Two lighter variants: a short rule terminating in a `#pad` for a sub-section, and a run of gold-finger lands
for a page or footer boundary.

### 7.2 The numbered index — one number, four surfaces

The kicker's number is not decoration; it is the site's table of contents, and the **same** number appears in:

| surface | form |
|---|---|
| section kicker | `#via` · **01** `--copper-ink` 700 · `/` copper .75 · `ABOUT` `--text-3`, 11 px / .2 em |
| nav dropdown item | `02.1` `--copper-ink` 700, 11 px / .16 em, then the label in `--text-2` |
| footer column head | `02 / Research`, mono 10.5 px / .18 em, number in `--copper-ink` |
| sitemap row | identical to the footer form |

A reader who learns "02 / Research" once knows it everywhere. Assign the numbers **in `content.json`**, once,
so nothing can drift.

### 7.3 The card — metadata line, rail, chips

```html
<article class="card">          <!-- padding 20px 22px 20px 48px -->
  <svg class="rail" width="26" height="H" viewBox="0 0 26 H">
    <use href="#pad" transform="translate(10,20) scale(.78)" style="fill:var(--cat-ic)"/>
    <path d="M10 27 V34 L18 42 V H-34" stroke="rgb(var(--copper-rgb)/0.7)" stroke-width="1.25"
          fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <use href="#via" transform="translate(18,H-28) scale(.58)" class="cu-d" stroke-opacity=".7"/>
  </svg>
  <p class="metaline"><b>2024</b><i>·</i>MNRAS 528, 1913<i>·</i><span class="state">Student-led</span></p>
  <h4>…</h4>
  <p class="desc">…</p>
  <div class="foot"> …chips… <span class="cites"><use #via/> 41 citations</span></div>
</article>
```

* **The category is the pad at the top of the rail** — a filled circle in the research-area hue, and the only
  hue on the card's furniture. The rail below it is copper, because a rail is structure.
* **The metadata line** carries `year · venue · role` in mono, load-bearing fields in `--text-2` 600,
  separators in copper .8. It is real information, never a decorative reference designator.
* **Chips** keep their pill. A **filled `#pad`** in a `--cat-*` hue names a category; a **hollow `#via`** in
  copper names a structural fact (citations, paper counts, dates).
* **States get no hue at all.** `NOW`, `Student-led`, `Invited`, `Concurrent` are outlined copper pills.
  See §8: this frees `--cat-du` amber, which the current site spends on both "Discovery & Understanding" *and*
  "student-led".

One rail per card. Rail height is driven by the card, so generate the `<svg>` height from the row, or split
the rail into a CSS `linear-gradient` edge with a transparent band and keep only the pad and via as SVG.

### 7.4 The timeline — trunk, branch, ground, one lit star

```
ground       <use href="#gnd" transform="translate(24,12) rotate(180)">  copper .75
             the CLOSED end of the career; rotate(180) puts the bars above the
             stem so the trunk drops out of ground.  Law 3: a trace never just stops.
trunk        M24 12  V497      copper .75 @1.25
fade-out     M24 497 V612      stroke="url(#railFade)"  (.75 -> 0)
branch       M24 307 L40 323 V371 L24 387   copper .75 @1.25   (45 out, parallel, 45 back)
branch edge  .tl-row.branch .sub { border-left: 1px solid rgb(var(--copper-rgb)/.4);
                                   padding-left: 16px; }
             the SVG branch runs in the 74 px gutter and the CSS edge continues it
             beside the concurrent entry's text.  They are ONE rail in two media,
             offset by the same 16 px; "one rail per card" (law 5) counts nets, not
             media, and a timeline row is not a card.
events       #via  scale .82   at (24, 41) (24,193) (24,345)
branch tie   #via  scale .60   at (40,347)
current      #star-lit scale 1.15 (15 px) class="lit" at (24,497)
```

* An event is a via on the trunk, aligned to the baseline of its mono date line.
* **A concurrent role leaves the trunk at 45°, runs parallel 16 px to the right for the length of its entry,
  and rejoins at 45°.** The entry's text indents to match. No second column, no dashed "meanwhile" rail, no
  colour needed to say "concurrent" — the drawing says it.
* **The current role is the page's one lit star**, and the trunk *fades out* below it instead of stopping.
  The career is ongoing and the drawing says so. The trunk terminates in `#gnd` on the *closed* end (the
  earliest event) and never on the present — the two ends are drawn differently because they mean different
  things: one is finished, one is not.
* Row heights are explicit in the mockup so the trunk can be one path. In production `generate_biography`
  already knows the entries: emit the trunk with computed `y` offsets, or make the trunk a per-row CSS border
  and keep only the branch in SVG.

### 7.5 Charts

* Gridlines: copper .5, `stroke-dasharray="1 4"`, round caps — **dotted silkscreen, never solid rules.**
* The baseline is the only solid rule (copper .75 @1.25); the y-axis is copper .28 @1; ticks are 7 px.
* **Linear axis.** The pseudo-log `100 / 500 / 1,000 / 2,000 / 3,000` scale is retired: it flattens a decade
  of growth and misreports the shape.
* Area = `url(#hatch45)` — a 45° hatch at 16%, which is a fill you can print. Not a gradient.
* Series: 1.75 px in `--violet`; `#dot` markers at every value; **the terminal point is the one `#star-lit`**,
  13 px, carrying a **direct label on a copper leader** (`M1140 41 L1112 13 H1000`, then the value in mono 12
  at `--text` 600). No legend, no tooltip dependency.
* Figure furniture, all mono 9.5 / .24 em in `--text-3`: `FIG. 01` at top-left, `18,160 TOTAL · SOURCE: NASA
  ADS` at top-right, and a caption rule at the foot carrying `CITATIONS · ANNUAL · GRID = 1,000` (six words —
  inside the caption rule) and `REV. D`.
* `--r-board` on the figure frame, spent as the token: `class="board-frame"` (`rx:var(--r-board)`) with a
  literal `rx="2"` attribute as the fallback, because `rx` is a CSS property on `<rect>` but not every engine
  has always treated it as one. The card around it keeps `--radius-panel`.
* **A chart with one series may use `--violet`.** A chart with several must use the four category tokens and
  label each series directly — never a colour key.

### 7.6 Research icons

24 u grid, 90°/45°, one hue per icon, `stroke-linecap/linejoin: round`.

**One licensed tilt, and it is named:** `#ic-ii`'s lifted lid, `M4.2 7.4 L19.8 5`, runs at **8.7°**. A lid on
the 45° grid is a lid thrown open; a lid at 0° is a lid that is shut. Neither says *opened*. The tilt is
licensed the way the posterior contours and the star are licensed — by name, in this document, once — and it
is the only off-grid segment in the entire icon set. Everything else in every icon is 0°, 45° or 90°. Stroke is set from CSS on the `<use>`:
**1.25 u at 96 px** (renders 5.0 CSS px) and **1.7 u at 34 px** (renders 2.4 CSS px). A fixed stroke would
render 5 px and 2.4 px from the same number, and the two sizes would look like two different families. This is
the only optical exception in the system, and it is documented on the panel itself.

| | drawing | reads as |
|---|---|---|
| SLA | two inputs at 45° into a junction, three outputs | a learned mapping |
| II | the black box with its lid lifted, internal routing terminated | opening the box |
| IC | three posterior contours with a trace routed to the mode | inference |
| DU | a fiducial closed on a four-point star, two nodes outside it | something found, and marked |

Only DU carries a star, because only DU has found something. Rule: **a lit star and a category pad never
occupy the same 24 px** — in light theme `--star-lit` (#2b1d7a) sits near `--cat-sla` (#5b43d6) at 2.06:1
colour contrast and 39 against 83 in greyscale. The last row of the token-proof plate (panel 01b) draws the
forbidden 14 px pairing beside the shipped 72 px one, in colour and in greyscale, so the rule is demonstrated
and not merely asserted. Shape carries the pair even at 14 px — a star is four points, a category is a disc —
but the distance rule is the belt to that brace, and it is the rule a linter can check.

### 7.7 Brand mark, favicon, OG

Three optical cuts plus a boxed lockup, all from one geometry (§4.2). Clear space = one via diameter.
Nav lockup: `#mark-s` at 24 px, 11 px gap, name in Source Serif 600 at 17 px. Full lockup: `#mark` at 34 px,
a 1 px copper rule, name at 20 px, with `ASTROSTATISTICS · UNIVERSITY OF TORONTO` in mono 9.5 / 2.1 beneath.
Re-run `generate_favicons.py` from `#mark-box` (32/180/512) and `#mark-16` (16), and `make_og_card.py` from
`#mark`. **Ship the 16 px triad as its own asset** — never let a build step downscale the full mark.

---

## 8. What to retire

### 8.1 In `redesign.css`

| retire | replace with |
|---|---|
| `.card { border-left: 3px solid var(--cat-*) }` — the category stripe, on paper / talk / mentee / award / news cards | the rail: category `#pad` → 1.25 px copper trace → terminal `#via` (§7.3) |
| `border-top: 1px solid var(--border)` used as a **section divider** | the trace divider with via and tap (§7.1). Keep the plain border *inside* cards, where a trace would be noise |
| `.timeline::before { background: var(--grad) }` and the violet ring markers | the copper trunk, `#via` events, `#star-lit` current role (§7.4) |
| `.chip .dot { background: … }` where the dot means a **structural** fact (counts, dates) | a hollow copper `#via`. Keep it filled only where it means a category |
| `.stamp { color: var(--cat-du) }` for **student-led** | `.state` — an outlined copper pill. Amber is Discovery & Understanding and nothing else |
| `--shadow-glow` and every `box-shadow` glow | `.lit` — `--glow` / `--halo`, on the lit star only |
| solid chart gridlines in `_citations_svg` / `_roles_svg` / `_riq_svg` | dotted silkscreen, `1 4` (§7.5) |
| the chart's gradient area fill | `url(#hatch45)` at 16% |
| the pseudo-log citations axis | a linear axis with a direct endpoint label |
| the legend row under the publication figures | direct labels on the series |
| `.hero canvas` + `assets/js/redesign/hero.js` (random particles, parallax) | the composed hero SVG (§6). Delete the script; the drawing is pre-rendered |
| the lone `✦` glyph in the nav lockup and page kickers | `#mark-s` in the lockup, `#via` in kickers — one brand glyph, not two |
| `--grad` / `--grad-text` on buttons, the timeline rail and section headings | flat tokens. **Keep the gradient on the H1 tagline phrase only** |

### 8.2 In `tokens.json`

Add `"copper-rgb": {"dark": "184 128 94", "light": "168 113 74"}` and `"star-lit"`, `"glow"`, `"halo"` to
`themeVarying`; change light `bg-1` → `#f0efe9` and `bg-2` → `#ebe9e2`. `--copper` and `--copper-ink` are two
plain lines of CSS in `redesign.css`; `build_tokens.py` needs no change. **Put §3's six laws in the file as
comments** — the system is enforced by rules, not by the colours themselves.

### 8.3 In `content.json` copy

Audit every tracked-uppercase string against the caption rule (§3.6): ≤ 8 words stays uppercase, anything
longer becomes sentence case. The current site breaks this in several places.

---

## 9. Implementation notes

* **All of it is static CSS and inline SVG**, generated at build time by `build_html.py` / `pages_<page>.py`,
  so it stays inside the existing SEO story: the static HTML *is* the drawing. No runtime fetch, no chart
  library, no canvas.
* Port `geom.py` (~60 lines: `star_path`, `LCG`, `cpt`/`contour`) next to `_citations_svg` in `build_html.py`.
  Its seeded output is what makes the CI staleness gate reliable.
* One `SPRITE` constant emitted once per page from `pages_shared.py`. Generators emit `<use>` calls only.
  In this mockup that constant is `SPRITE_DEFS` in `build.py`; it is inlined into `index.html` **and** written
  to `sprite.svg` by the same run, which is the pattern to copy — one source, two outputs, never two copies.
* Card fiducials, the card edge trace and its via gap can be pure CSS (`linear-gradient` with a transparent
  band) so cards of any height work with no per-card SVG.
* `aria-hidden="true"` on the hero SVG; the composition's meaning is carried by the silkscreen labels DATA /
  MODEL / POSTERIOR and by the H1 copy. Category information is never hue-only: chips carry the full name,
  the timeline carries the NOW pill, the chart endpoint carries its number.

---

## 10. Risks

1. **The paint law is enforced by a rule, not by the colours.** Copper and amber are genuinely separated
   (§2.5), but the moment someone uses copper for a badge or amber for a rule it collapses. This is the one
   thing to hold the line on in review, and the reason §3 belongs in `CLAUDE.md`.
2. **Amber's double duty is a real bug in the current site**, not a nuance: `--cat-du` means both "Discovery &
   Understanding" and "student-led". D fixes it by making states hue-free. Anyone who re-adds an amber
   student-led stamp re-breaks the canon.
3. **`--star-lit` in light is a deep violet**, close in feel to `--cat-sla` — 2.06:1, and 39 against 83 in
   greyscale. The rule in §7.6 (never in the same 24 px) is the mitigation, and the last row of the
   token-proof plate draws the forbidden pairing next to the shipped one in both colour and greyscale, so a
   reviewer can see what is being prevented. A page that puts a lit star beside a violet category pad reads
   ambiguously; shape saves it, distance guarantees it.
4. **Density creep.** Numbered kickers + fiducials + edge stamps + two grid layers is a lot of legend. If it
   ever reads busy, drop in this order: the page substrate grid, then the hero edge stamps, then the back
   layer. Never the fiducials, which are what make the panel read as a printed object.
5. **The 15 px bus does not survive a uniform mobile scale.** §6.9 is a crop plan, not a suggestion, and
   panel 02b renders both windows at 390 px from the identical markup so the plan can be checked before it is
   built rather than after.
6. **Timeline branch geometry** is drawn against fixed 152 px rows here. In production it must be generated
   from measured offsets, or a long entry will break the alignment.
7. **`#star-lit` now means three things that are the same thing** — current role, peak year, posterior mode.
   That is deliberate ("the live one"). It must not be reused for "featured" or "important", which is the
   obvious next temptation.
8. **Two hero SVGs to maintain** (the composition and the sprite) rather than a canvas that draws itself.
   That is the price of being pre-rendered, printable, and readable by search engines — and it is worth it.
