# E2 — The board, condensed

## The idea

A crafted print piece that happens to be a website. Structure comes from **flat colour bands**, not from
cards: one solid ink band carries the nav, the hero and the headline figures in both themes, and the page
below it alternates cream/deeper-cream (light) or near-black/slightly-warmer-black (dark). Inside those
bands everything is square — tiles with a solid left edge in the research-area tint, small flat labels,
thin 1px rules, and real tables where the content is tabular (contact, ART, values, authorship roles).

The display voice is **Barlow Condensed 600/700, uppercase** — the angular, confident deck type from the
AFTER infographic. Inter carries every word you actually read; JetBrains Mono carries only numbers,
identifiers and the `p(θ|D)` label. No mono eyebrows, no pills, no rounded corners, one accent.

Behind all of it, at 13–18% alpha, a copper **trace network** connects the boxes that are really on the
page, and one soft signal travels down it as you scroll.

## Palette

| | dark (default) | light |
|---|---|---|
| substrate | `#0b0908` | `#fbf7f0` warm cream |
| tinted band | `#100e0c` | `#f2e9dc` |
| tile | `#15120f` | `#ffffff` |
| header/footer band | `#13100d` | `#191310` — **stays dark on cream**, as in the infographic |
| rules | `#2c2621` / `#3d3630` | `#ddd0be` / `#c6b6a1` |
| body text | `#f4efe9`, muted `#a99e94` | `#1c1613`, muted `#6a5d52` |
| copper | text `#e08a4a`, solid `#c96f2c` | text `#a5460d`, solid `#b4501a` |

Research areas are the only other hue: violet / teal / blue / amber, bright on dark and darkened for text
on cream (`#6338cf` `#0a6d5f` `#14539f` `#8a5504`). They appear as a 3px left edge and a small flat label
— never as a chart theme, never as a gradient. All body/muted/copper pairs clear 4.5:1 in both themes.

## The board layer

**Routing.** `board.js` measures the real DOM after fonts load and draws one SVG behind `<main>` with a
three-move grammar: a **spine** running vertically in the left gutter (content edge − 34px) from the bottom
of the header band to below the last section; a **tap** off the spine into every `[data-node]` section
header — an 11px 45° leg, then flat into the heading's left edge, with a square node at the junction; and
a **bus** across every `[data-bus]` tile row, a horizontal trace 15px above the row with a short drop into
each tile, so the tiles in a row are visibly wired to each other and back to the spine. Because the
geometry is measured, the traces land on the boxes that are actually there at any width; a resize redraws.

**The signal.** The hero drawing is the network at its densest — four inputs, three hidden boxes, one
`INFERENCE p(θ|D)` chip — and its single output routes down and off the left edge, where the spine picks
it up. The spine carries one dash (7% of its length) as a two-layer stroke: a 9px blurred copper glow at
24% and a 1.5px core at 78%. Its position is the reader's scroll position plus a ~40s drift, so the signal
tracks you down the page and never sits perfectly still; each section node lights as the head passes.

**Fallbacks.** `prefers-reduced-motion: reduce`, `#still`, or `data-still` freezes the signal at 42% of the
page — visible, mid-travel, no animation (this is what the renders show). With no JS at all, a static
copper hairline in the gutter keeps the spine.

## What this retires from the current site

The starfield canvas hero and the violet→cyan gradient button; the rounded translucent card grids and their
hover-lift; the mono uppercase kicker above every section; the pill badges with coloured dots; the emoji
icons on ART and the research areas; Chart.js and the four heavy publication figures — replaced by one flat
mix bar, one flat column chart, and a table, because two of those figures were tables pretending to be
pictures.

## Why it isn't Claude-y

There is no glass, no blur, no gradient, no rounded card, no glow on any UI element, and no decorative
numbering. The only glow on the site is the background signal, and it is soft and off the reading path.
Colour is disciplined to one warm accent plus a four-value taxonomy that means something. The hierarchy is
carried by type size, weight and flat colour blocks — the same instruments Josh used in his own infographic
when he rewrote the busy version into the good one.
