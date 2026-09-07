# Variant A — "Quiet copper"

**Files** · `index.html` (self-contained mockup, 8 panels + a token-proof panel) · `dark.png` · `light.png`

---

## 1. Concept

The site already draws a constellation behind the hero. Variant A does not add a second idea on top of it —
it re-materialises the one that is there. Every line on the page is re-cast as **copper routed on a
substrate**: nav underlines, section rules, card stripes, the biography rail, chart gridlines and the footer
edge all become traces, and every terminal on those traces becomes a via or a pad. The constellation and the
board are the same drawing, so astronomy and computation are not two motifs sitting beside each other — they
are one, and the reader gets that in about a second without a word of explanation.

The discipline is that copper is **structure and nothing else**. It never carries a category, never carries a
statistic, never carries a mood. It carries *the page's own skeleton*. Because it is the only new colour and
it only ever appears as a hairline or a hollow ring, the four research-area tokens keep their entire signalling
budget, and the page stays as quiet as it is now — quieter, in fact, because a 3px violet stripe becomes a
1.25px trace.

---

## 2. Tokens

### The one new token

| token | dark | light | greyscale (Rec.709) | HSL sat |
|---|---|---|---|---|
| `--copper` | `#b8805e` | `#a8714a` | **137** / **122** | 37% / 39% |
| `--cat-du` (existing, unchanged) | `#ffb454` | `#8f4d00` | **189** / **86** | 100% / 100% |

Authored once, in two forms so alphas can be derived without a second colour:

```css
:root                { --copper-rgb: 184 128 94;  --copper: rgb(var(--copper-rgb)); }
[data-theme="light"] { --copper-rgb: 168 113 74; }
```

Everything else is a *derivation*, not a new token:

* `rgb(var(--copper-rgb) / α)` — the only opacities used are **.75** (live trace), **.55** (section rule),
  **.38** (chart silkscreen), **.30** (caption rules, dashed separators), **.07/.055** (substrate grid).
* `--copper-ink: color-mix(in srgb, var(--copper) 62%, var(--text))` — copper pushed toward the ink colour so
  it can carry small type. Required: raw copper on the light substrate is **3.69:1**, fine for a 1px line
  (AA graphics needs 3:1) but short of 4.5:1 for a mono kicker. `--copper-ink` measures **6.7:1** light /
  **9.1:1** dark. Rule: *lines and vias use `--copper`; letters use `--copper-ink`.*

### Why it does not collide with the amber Discovery token

Shown side by side and through `grayscale(1)` in panel 01b of the mockup. Three separations, all present at once —
per the figure canon, hue is never the only channel:

1. **Saturation** — copper is ~38% saturated, `--cat-du` is 100%. Copper looks like a *material*; amber looks
   like a *signal*.
2. **Luminance** — 52 grey levels apart in dark (137 vs 189), 36 apart in light (122 vs 86). Note the sign
   flips between themes: in dark, amber is the brighter of the two; in light, amber is the darker. In neither
   theme do they land in the same greyscale band.
3. **Role, which is the real firewall** — copper is *only ever* a stroke or a hollow ring; `--cat-du` is *only
   ever* a filled mark (a pad in a chip, a bar, a stamp). A reader never has to tell two similar browns apart,
   because one of them is never a fill and the other is never a line. Panel 01b shows the single layout where
   they are genuinely adjacent (a copper rule carrying an amber Discovery badge and an amber student-led stamp),
   in colour and in greyscale.

Everything else in `tokens.json` is untouched: `--cat-sla` violet, `--cat-ii` cyan, `--cat-ic` blue,
`--cat-du` amber, `--cat-sec` pink, all backgrounds, all type tokens.

---

## 3. Motif rules

These are the whole system. If a mark is not on this list it does not get drawn.

**Routing**
* Segments run at **90° or 45° only**. Never a third angle, never a curve. (The one licensed exception is a
  posterior contour, which is a *datum*, not a trace.)
* A trace turns **at most twice** between its source and its terminal.
* **Round caps, round joins.** The corner radius of the motif *is* the stroke radius — there is no separate
  corner-rounding value to remember or to get wrong.

**Weights** — three, and only three.
| use | width |
|---|---|
| trace (gridline weight — rules, rails, card stripes, hero routing) | **1.25 px** |
| structural outline (chip body, chart series) | **1.75 px** |
| brand mark | **1.6 units** on the 24-grid |

**Vias and pads** — two glyphs, one meaning each, drawn as reusable `<symbol>`s:
| glyph | meaning | geometry |
|---|---|---|
| `#via` (hollow ring) | a hole you can probe: a source, an event, a structural node | r = 4.6 of 16, stroke 2.6 → **pad ⌀ / trace ≈ 1.5**, the classic board ratio |
| `#pad` (filled) | a terminal, or a category mark | r = 3.6 of 16 |
| `#via-lit` (halo + ring + dot) | **the current / newest / peak node** — one meaning, never reassigned | halo r 7.4 @ 16% |
| `#fid` | board registration mark; hero corners only | — |
| `#gnd` | the page ends here; footer only | — |

Displayed sizes: **9–10 px** inside chips and captions, **12–14 px** on rails and in the hero, **20–24 px** for
a lit node. Never larger — a via is punctuation, not an illustration.

**Spacing** — unchanged from the site's scale (4/8/12/16/24/32/48/64/80). New constants: the substrate grid is
**32 px** (48 px inside the hero, so the hero reads calmer than the page); the biography rail sits at **x = 24**
in a 74 px gutter; card rails at **x = 10 → 18** in a 48 px gutter.

**Radii** — unchanged (`8 / 14 / 20 / 40`). The chip package uses **10 px** (= `radius-sm` + 2) and its die
outline **5 px**, so the two rectangles are visibly a package and its contents rather than two cards.

---

## 4. Panel-by-panel notes

1. **Brand mark.** The site's existing 4-point sparkle, re-drawn as a chip fanout: one hub via, four traces
   leaving it, four terminal pads, one junction pad on a bend. The arms are deliberately *unequal* — one has
   no bend at all — because four equal arms with matching L-bends reads as a pinwheel, which is a silhouette
   this mark must not have. Survives to 16 px because the hub is a ring (a hole reads at any size) and the
   pads are 1.25 units against a 1.6 stroke.
2. **Hero.** Four traces leave a sparse sky, turn once, and land on the left pads of an inference package;
   three leave the right pads and terminate on a posterior. Seven traces total, all at 1.25 px, no glow on the
   routing — the only lit element in the whole composition is the posterior mode. Incoming traces fade in from
   18% opacity at the sky end (a gradient, one `linearGradient`), so the eye starts at the data and is walked
   left→right through the model to the answer. Four fiducials mark the frame corners.
3. **Section headers.** Silkscreen mono kicker (`01 / ABOUT`, 11 px, .2 em, prefixed by a 10 px via) → serif
   H2 → a divider that is a trace, not a border: run, via at 8%, run, one 45° step down at the far end.
   Two lighter variants for sub-sections (short rule terminating in a pad) and for page boundaries
   (gold-finger pads).
4. **Cards.** The 3px category stripe is replaced by a 1.25 px trace in the category colour that drops out of a
   hollow via, turns once at 45° into the card, and ends in a landing pad. Chips keep their pill; the filled
   dot becomes a **pad** when it names a category and a **via** when it names a structural fact
   (citations, paper counts). Student-led work keeps its amber stamp — panel 01b is the proof that this still
   reads next to copper.
5. **Timeline.** One copper trace, top to bottom. Events are vias on it. Concurrent appointments **split the
   trace into a parallel branch that rejoins** — the Banting/Dunlap overlap is now legible as a fact about the
   career rather than a footnote. The current role is a `#via-lit`, and the rail **fades out** below it
   (gradient stroke) instead of stopping: the career is ongoing, and the drawing says so.
6. **Research icons.** 24-grid, same via vocabulary, four unmistakably different silhouettes:
   *SLA* a fanout (2 in, junction, 3 out) · *II* the black box **opened**, lid lifted, internal routing visible ·
   *IC* three posterior contours with a trace routed to the mode · *DU* a fiducial closed on a lit via, two
   stars outside it. Stroke is 1.25 units at 96 px and opens to **1.7 at 34 px** — the single optical exception
   in the system, documented on the panel itself.
7. **Chart.** Gridlines become silkscreen (copper, dashed 3/5, behind everything, no label except at the axis);
   the baseline is the only solid rule. Markers become pads, the peak becomes a `#via-lit`, and the value is a
   **direct label on a copper leader** — so the chart is complete without a legend, a tooltip or a colour key,
   and it survives greyscale and print.
8. **Footer.** A gold-finger board edge, the four link columns, then the ground symbol and the mark. The page
   ends the way a board ends.

---

## 5. What to retire

* **The 3 px left accent stripe** on paper / talk / mentee / award cards → rail trace + via + pad.
* **`border-top: 1px solid var(--border)`** as a section divider → the trace divider (panel 03). Keep the plain
  border only inside cards, where a trace would be noise.
* **The violet biography rail and its violet ring markers** → copper rail. The rail is structure; violet is
  Statistical Learning & AI, and it should not be spent on furniture.
* **Round filled dots inside chips** where they mean "structural" (counts, dates) → hollow vias. Keep them
  filled where they mean "category".
* **The hero's current random point-cloud constellation** → the deliberate sky → chip → posterior composition.
  The current one is decorative; this one is an argument.
* **Chart.js-style solid gridlines** in `_citations_svg` / `_roles_svg` / `_riq_svg` → silkscreen dashes.
* **The lone 4-point sparkle glyph** used in the nav and page kickers → the new mark / a `#via`, so there is one
  brand glyph rather than two.

---

## 6. Implementation notes

* **Tokens.** Add one entry to `themeVarying` in `assets/data/tokens.json`
  (`"copper-rgb": {"dark": "184 128 94", "light": "168 113 74"}`), then two lines of plain CSS in
  `redesign.css` for `--copper` and `--copper-ink`. `build_tokens.py` needs no change.
* **Symbols.** Emit the `<symbol>` library **once per page**, from `pages_shared.py`, into a
  `<svg width="0" height="0">` at the top of `<body>`; everything else is `<use href="#via" x y width height>`.
  The whole set is under 2 KB and it is what makes the motif cheap to apply — a card rail is one `<path>` and
  two `<use>`s. `stroke-width` is set on the host `<svg>` element and inherits into the shadow tree, so one
  symbol serves both the 96 px and 34 px icon sizes.
* **Colour on symbols.** Symbols use `currentColor` only; instances are coloured by setting `color:` on the
  host `<svg>`. That is how one `#via` becomes a copper structural node in the timeline and an amber
  student-led node on a card.
* **No new JS.** Everything above is static SVG. If pulses along the hero traces are wanted later, they are
  `stroke-dashoffset` animations on the existing paths, gated behind `prefers-reduced-motion`, and the static
  render is the fallback — no fallback code to write.
* **Pre-rendering.** All of it is generated at build time by `build_html.py` / `pages_<page>.py`, so it stays
  inside the existing SEO story: the static HTML *is* the drawing.
* **Favicon / OG.** Re-run `generate_favicons.py` and `make_og_card.py` from the new mark; the mark is a single
  24-unit path set and exports cleanly at 16/32/180/512.

## 7. Risks

* **Copper vs. amber remains the thing to hold the line on.** The separation is real (§2) but it is enforced by
  a *rule*, not by the colours alone. If someone later uses copper for a badge, or amber for a rule, it
  collapses. Worth a comment in `tokens.json` and a lint-ish note in `CLAUDE.md`.
* **Copper is warm; the light theme's `--bg-1` / `--bg-2` are cool blue-greys.** Against the warm
  `#f6f6f1` substrate the panel backgrounds now read faintly lavender. Not a defect introduced here — the
  cards look fine — but nudging light `--bg-1` toward `#f0efe9` would make the light theme noticeably more
  coherent. That is a change to an *existing* token, so it is flagged rather than made.
* **Density creep.** The motif is addictive; the restraint is the design. Suggested cap, enforceable by review:
  **one divider per section, one rail per card, ≤7 traces in any composition.**
* **Small vias at 1× on low-DPI screens.** A 9 px ring with a 1.5 px stroke can go soft. Mitigated by never
  going below 9 px and by the ring/hole ratio; worth checking on a 1× external monitor before shipping.
* **Timeline branch geometry.** The parallel-branch rail is drawn against fixed 152 px rows in this mockup. In
  production it should be generated per event from measured offsets (or built as one SVG per row with a
  branch flag), otherwise a long event description will break the alignment.
* **The `#via-lit` glyph now means three things that are the same thing** (current role, peak year, newest
  discovery). That is deliberate — "the live one" — but it must not be reused for "featured" or "important",
  which is the obvious next temptation.
