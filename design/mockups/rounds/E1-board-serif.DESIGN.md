# E1 — The board, warm serif

## The idea

The page is a board. A warm near-black substrate; the content sits on it as flat, square components —
solid left-edge tiles, thin rules, tabular rows. Behind and between those components runs a copper trace
network at low alpha: orthogonal and 45° routing, junction nodes, vias, pads. The traces are densest in
the hero, where they resolve into a small layered network (four input pads → three hidden nodes → one
output), and thin as you go down until the footer is a single ground edge. Nothing in the foreground
glows, sparkles, or floats. The only motion on the site is signal: a soft warm point travelling a trace
as a section comes into view.

Type does the hierarchy. **Source Serif 4** for the name and every section heading (warm, personal,
un-corporate), **Inter** for body and the small square labels, **JetBrains Mono** only for numbers, years,
counts and identifiers. No new face was needed.

## Palette

| role | dark | light |
| --- | --- | --- |
| substrate / band | `#0E0A08` / `#141009` | `#FBF7F1` / `#F5EDE2` |
| tile surface | `#171110` | `#FFFDFA` |
| rules | `#2B211B`, `#3C2C23` | `#E1D4C3`, `#C9B69F` |
| ink / secondary / tertiary | `#F3ECE4` / `#BEAC9D` / `#8E7D6E` | `#1B1511` / `#544537` / `#79685A` |
| copper (accent + traces) | `#E08B45` | `#A64D12` |
| research areas (only hue taxonomy) | `#8b7bff` `#34d3e0` `#5aa9ff` `#ffb454` | `#5b43d6` `#0a7280` `#1565c0` `#8f4d00` |

Everything else is neutral plus copper. Contrast is ≥ 4.8:1 for all body and tertiary text in both
themes and ≥ 5.5:1 for every category label on its tile.

## Board mechanics

**Routing.** Each section carries one inline SVG (`viewBox 0 0 1440 <section height>`,
`preserveAspectRatio="xMidYMin meet"`, `position:absolute; inset:0; z-index:0`) behind a `z-index:1`
content wrapper. Paths are generated from real box coordinates, so a trace always runs somewhere the
layout has actually left empty: the 40–140px page gutters, the 20px alleys between the four research
tiles, the strip under the featured rows. Corners are 45° chamfers, never quarter-round; diagonals are
exactly 45° (the router splits each run into horizontal → diagonal of length |Δy| → horizontal). Three
weights carry meaning — `t2` for the live hero network, `t1` for structural routing, `t0` for the faint
traces that pass behind text. Junctions get a 3px node, terminations a via ring, entries a square pad.

**Scroll glow.** Each section names one path as its signal route. A `<g class="spark">` sits on it via
CSS `offset-path: path(...)`, and an `IntersectionObserver` sets `data-lit` on the section as it enters
view, which runs a 3.6s `offset-distance: 0% → 100%` travel and fades the point in and out. The glow is a
radial-gradient disc (no `box-shadow` anywhere on the site), so it reads as light on copper, not a chip.

**Fallbacks.** The traces are static SVG — no JS draws or animates them. Without JS the sparks simply
rest at 44% of their path, so the board still shows signal in flight. `prefers-reduced-motion: reduce`
pins them there too (that is what the stills above show); `#still` on the URL forces the same frame.
Below 900px the section boards are hidden and the hero gets a compact three-node network in the flow.

## What this retires from the current site

The starfield hero, the gradient wordmark, the primary + ghost button pair, the rounded translucent
cards with hover-lift, the pill badges with coloured dots, the mono uppercase kicker on every section,
the emoji research icons, the Chart.js panels. Publications keeps all four figures but flattens them: a
single stacked bar for research mix, one thin area line for citations, flat stacked columns for role by
year, and five plain bars for RIQ by role — the four category hues appear only as 10px squares and small
square labels.

## Why it is not Claude-y

No glass, no gradients, no violet-to-cyan, no blob backgrounds, no rounded card grid, no pills, no
sparkles, no decorative meta ("REV. D", "FIG. 01"), no numbered sections. Every number on the page is a
real ADS figure. The one motif — copper traces on dark, a network in the hero, signal moving as you read
— comes from Josh's own brief rather than a component library, and it lives entirely behind the content
so that the foreground stays flat, angular and quiet.
