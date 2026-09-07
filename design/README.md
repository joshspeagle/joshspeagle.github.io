# Design record — the September 2026 tune-up

The reference material behind the current visual system ("chips on the board", spec in `../DESIGN.md`). Kept so future changes can see what was tried, what was rejected, and why.

- `audit-2026-09.md` — the eight-lens audit of the June-2026 site (visual, UX, copy, build, bugs, a11y/perf/SEO, data, dataviz), every finding verified; the tune-up worked through Tracks A–D of this document.
- `briefs/` — the design briefs in order: `DESIGN_BRIEF.md` (round 1: A quiet copper, B silkscreen, C living constellation → D synthesis), `DESIGN_BRIEF_E.md` (round 2, "the page is the board", with Josh's feedback verbatim and the anti-template list), `SYNTHESIS_BRIEF*.md` (the D and F syntheses, both superseded), `DESIGN_BRIEF_G.md` (the direction that became the site), `COPY_BRIEF.md` (the copy pass: voice notes and content decisions).
- `mockups/G/` — the approved mockup, hand-built, which the site was ported from: `home.html` + `suite.html` (open from a checkout; they load the repo's fonts and photo by relative path), `board.css`, `hero2.js` (the feed-forward hero), `board.js` (the trace/pulse layer), renders, and `standalone.html`, a self-contained copy with fonts embedded that runs the animation anywhere (`?energy=amber|red` compares energy colours).
- `mockups/rounds/` — one render and the designer's DESIGN.md for each rejected round-1/round-2 variant (A–D, E1–E3). A's warmth and B's angular iconography survived into G; D and E were rejected as too busy / too template-like.
- `before/` — the June-2026 site before the tune-up, for comparison.
- `links/` — the link-hunt brief and the evidence file for every outbound link added to talks, courses and service roles (confidence + the phrase that matched).
- `copy/` — before/after text dumps of every page from the copy pass.

Not archived: the full screenshot sets (tens of MB) — the live site and `git log` are the record — and Josh's own reference documents.
