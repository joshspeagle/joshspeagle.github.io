# CLAUDE.md

## Project Overview

Personal academic website for Joshua S. Speagle — live at **joshspeagle.com** (custom apex domain via the tracked `CNAME`; the repo `joshspeagle.github.io` is the GitHub Pages source). Static HTML/CSS/JS on GitHub Pages. **Redesigned June 2026** onto a design-token system with self-hosted fonts and an animated hero; **restyled September 2026 to "chips on the board" (Design G)** — a navy substrate with a copper solder-pad grid, cards as bolted-on *chips*, copper traces routed behind the page, and amber *energy* reserved for motion and the one action per screen. All HTML is pre-rendered for SEO by `build_html.py` from `content.json` (plus the data caches `publications_data.json` and `software_data.json`); lightweight JS adds interactivity (theme toggle, the hero network canvas, the board layer, and a generic search/filter/sort/load-more list).

## Development Workflow

```bash
npm ci                           # one-time: fetch the pinned self-hosted fonts (@fontsource)
npm run build                    # tokens -> fonts -> every page + sitemap.xml
npm run check                    # correctness checks over the built site
python -m http.server 8000       # local dev server
```

- **Every `.html` file is build output.** Edit `assets/data/content.json` (or `tokens.json`) and rebuild — hand edits to a page are overwritten on the next build.
- **`package.json` is the single source of build order**: `npm run build` = `build_tokens.py` → `setup_fonts.py` → `build_html.py`. (`npm run fonts` runs just the font vendoring step.)
- **Python packages**: use `uv pip install`. The publication-pipeline deps are pinned in `requirements.txt` (`uv pip install -r requirements.txt`); the front-end build scripts (`build_html.py`/`build_tokens.py`/`setup_fonts.py`) use only the stdlib.
- **Deployment**: push to `master`; GitHub Pages auto-deploys to **joshspeagle.com** (custom domain via `CNAME`). Keep `sitemap.xml`/`robots.txt` URLs on that domain.
- **Dates come from the data, never the clock**: `content.json`'s `site.lastUpdated` (bump it when you edit content), `publications_data.json`'s `metrics.lastUpdated` and `software_data.json`'s `lastUpdated` (both pipeline-owned) drive every footer stamp, `sitemap.xml` `lastmod` and the © year. A rebuild is therefore byte-identical on any day, on any checkout depth.
- **CI gate**: `.github/workflows/build-check.yml` runs `npm run build && npm run check` on every push to `master`, every PR, and manual dispatch, then **fails if the committed static build is stale**. Always `npm run build` (and `npm run check`) and commit the regenerated HTML/CSS/sitemap/feed before pushing.

## Architecture

### Build system (content.json → static HTML)

`scripts/build_html.py` **writes all 11 pages in full** — there are no hand-maintained shells. A `PAGES` registry (one row per document: output file, nav label, `<title>`, canonical path, layout, scripts, sitemap priority, data sources) drives `render_shell()`, which emits `<head>` (including a **derived** meta/OG description), the skip link, the nav (with `aria-current` computed per page), `<main>`, the footer (with a **derived** "Updated <Month Year>") and the scripts. Content is assembled in Python and never spliced into existing markup, so a renamed container fails loudly instead of silently no-op'ing. `sitemap.xml` is written from the same registry. Idempotent.

- **Pages**: Home (hero + `#about`/`#research`/`#team`/`#join`), the nine secondary pages (a `#<page>-header` band from `pages.<page>` + a `#<page>-content` container), and `404.html` — a registered page whose copy lives at `pages.notfound`, so it can no longer drift from the shared nav/footer.
- **Derived, never hand-typed**: `<title>` (from `pages.<page>.title`), meta + `og:description` (a hand-written `pages.<page>.description` when present, else ≤160 chars from the tagline; Publications from the live pipeline metrics), the footer/`lastmod` dates (see above), the schema.org JSON-LD (a `Person` on every indexed page, plus a `CollectionPage` on Publications), and `feed.xml` — an RSS 2.0 feed of `sections.news.items` with stable non-permalink guids, linked from every page as `rel="alternate"`.
- *(Biography is a dedicated page holding the career timeline — `sections.biography.timeline` via `generate_biography`; the nav "Biography" links to it, not a homepage anchor.)*

- Home sections: `generate_home_*` in `build_html.py`.
- Publications: `generate_publications_redesign` pre-renders **all 136 papers** from `publications_data.json` (no Chart.js, no runtime JSON fetch). A paper is *filed* under one area — `_pub_cat_key()` = argmax(`categoryProbabilities`), which is also its accent stripe and its filter chip, so the four chips partition the corpus — while `_pub_badge_keys()` *badges* every area ≥ 0.20.
- Other pages: one generator each in `scripts/pages_<page>.py` (talks/teaching/mentorship/awards/service/software/news), sharing `scripts/pages_shared.py`. Most use `scaffold()`; **Software** renders a bespoke layout from `software_data.json`.
- **`pages_shared.py` owns all escaping and validation** — `esc` (bare `&`), `esc_text` (+`<`/`>`), `attr_esc` (tag-stripped, lowercased, for `data-search`/`data-title`), `url_attr` (every `href`/`src`) — `accent_class` (a declared accent must look like a CSS identifier or it falls back to `mute`) — plus `clean_text()` (strips arXiv "Abstract " prefixes and unwraps simple TeX in pipeline prose at render time), the shared year/period parsers (`parse_latest_year`, `all_years`, `period_end_year`, `period_end_key`) and `percent_shares()` (whole-number shares that always total 100). `build_html.py` imports them; nothing redefines them.
- **Accents are declared, not derived**: talks categories, service categories, teaching departments (`sections.teaching.accents`) and news types (`sections.news.types`) each name their CSS colour class in `content.json`. A missing one prints a build WARNING and falls back to a neutral stripe instead of emitting a class no stylesheet defines.

### Design tokens & fonts

- `assets/data/tokens.json` → `scripts/build_tokens.py` → `assets/css/tokens.css` (single source of truth: `:root` dark + `[data-theme="light"]`; `_`-prefixed keys are notes, not tokens).
- **Design G palette**: `--bg-0/1/2` (substrate) · `--chip`/`--chip-2` (every card surface) · `--border`/`--border-2` · `--copper-rgb` (every trace, via, pin, rule and link underline — always used as `rgb(var(--copper-rgb) / α)`) · `--energy`/`--energy-rgb`/`--energy-hot`/`--energy-ink` (amber). **`--energy-text` is energy used as INK**: the light `--energy` is a 2.8:1 fill, so text, focus rings and active borders take `--energy-text` (`#6b3a00` in light) instead — never `--energy`.
- **Taxonomy colour is declared, never hard-coded**: `--cat-*` (the four research areas + secondary school), `--acc-*` (talks types, teaching departments, service org-types, news types, software groups, authorship) and `--role-*` (the publication-figure series). Every light value clears 3:1 on the light `--chip` (`#fffefb`), because that is what a 2px chip edge or a 7px pad swatch has to survive. `scripts/check_allow_hex.txt` is down to `#000`/`#fff` (print only) — put new colours in `tokens.json`, not in the CSS.
- Geometry: `--radius-chip` 3px (chips, buttons, inputs, pads), `--radius-sm` 2px. No pills, no gradients, no glassmorphism.
- Self-hosted fonts: `npm install` (`@fontsource/*`) → `scripts/setup_fonts.py` vendors woff2 into `assets/fonts/` + writes `assets/css/fonts.css`. **Source Serif 4** (serif) · **Inter** (sans) · **JetBrains Mono** (mono); CJK (沈佳士) falls back to system fonts.

### Non-obvious file notes

- `requirements.txt` pins deps for the **publication pipeline only** — the front-end build scripts are stdlib.
- **The CV lives in this repo**: `CV_speagle.pdf` at the root, linked from the nav (desktop + mobile) via `CV_FILE` in `build_html.py`, root-prefix-aware like the icons. To update it, replace the file under the same name, bump `site.lastUpdated`, and rebuild — `npm run check` fails if it goes missing, since the link check covers non-HTML targets too. The old `joshspeagle.com/bio-cv/` site comes from the separate **`bio-cv`** repo, is no longer linked from here, and should be archived.
- `scripts/generate_favicons.py` · `scripts/make_og_card.py` draw the `#mark` geometry (amber on `#06080f`) with Pillow and generate the favicon set + `site.webmanifest` and the OG/Twitter social card (`assets/images/og-card.png`). Both are deterministic and are NOT part of `npm run build` — re-run them by hand on rebrand. The OG card wants `fontTools` + `brotli` to read the vendored woff2 brand fonts (it falls back to a default font and says so).
- Update `sitemap.xml` when adding pages.
- **Two `http://` URLs in `content.json` must stay `http`**: the `allsky` S3 static-website endpoint (S3 website hosting serves no TLS) and `http://briandnord.com/` (its https certificate does not cover the apex domain, so an upgrade shows a full-page interstitial). Every other external link is https.
- `assets/js/redesign/pubchart.js` only adds tooltips — the publication figures themselves are **inline SVG built in `build_html.py`** by `_citations_svg`/`_roles_svg`/`_riq_svg`. Edit the chart shapes there, not in the JS.
- `assets/data/publications.bib` is generated from `publications_data.json` by `scripts/export_bib.py`; Publications links it as "BibTeX ↓" and `npm run check` fails when it drifts (`export_bib.py --check`).
- `scripts/check_build.py` (`npm run check`, stdlib only) is the correctness gate: the `data-year` contract for any listview offering a year sort, non-empty content containers on every registered page, undefined CSS custom properties, raw hex outside `scripts/check_allow_hex.txt`, internal link/anchor/duplicate-id checks, tag balance, and a **warning** (with numbers) when the four `--cat-*` tokens sit too close in relative luminance.

### Interactivity & patterns

- **Lists** (`listview.js` — the *only* list widget; Publications and Mentorship use it too): wrap in `<div data-listview data-lv-batch="N">` with `[data-lv-search]`, optional `[data-lv-sort-control]`, one or more `[data-lv-filters]` groups (`.chip[data-cat]`; each group is an independent single-select dimension and the groups are ANDed), a `[data-lv-status]` sr-only live region, and `[data-lv-list]` of `[data-lv-item]` cards carrying `data-cat/data-search/data-year/data-num/data-title` (`data-cat` may be space-separated). `pages_shared.scaffold()` emits this; `listview.js` wires it. Two extras: `[data-lv-pinned]` blocks (a "Featured" board) hide while a query or non-`all` chip is active, and **grouped mode** — any `[data-lv-group]` containers (optionally inside `[data-lv-section]`) switch the widget to in-place filtering that hides empty groups/sections and updates their `[data-lv-count]`/`[data-lv-seccount]` tallies (Mentorship).
- **The board** (`board.js`, loaded on every page after `site.js`): measures every `[data-chip]` block after layout and draws, into the one `<svg id="board">` emitted right after `<body>`, a copper trunk in the left gutter (fed from the hero network on Home, from the header band's bottom-left elsewhere), one branch per chip, a via at each junction and a copper pin on the chip edge; a pulse rides each branch when its chip scrolls into view and leaves the chip `.lit` for 1.8 s. Pure progressive enhancement — no JS, no board. **Density rule: ≤ 8 traced `[data-chip]` blocks per page** (chips inside a `[data-bus]` row share one tap). List *items* are chips visually but never carry a trace; `pages_shared.scaffold()` puts the single `data-chip` on the list column.
- **Icon sprite**: `pages_shared.SPRITE` (`star4`, `mark`, `mark-s`, `via`, `pad`, `gnd`, `ic-sla/ii/ic/du`, `ic-team`) is emitted once per page by `render_shell()`; reference it with `<use href="#…">`. `board.js` stamps `#via` and `#gnd` from it too, so it must stay in the shell.
- **Site chrome** (`site.js`, loaded on every page): the nav and the theme toggle. Desktop dropdowns are pure CSS (`:hover`/`:focus-within`) and JS only mirrors that into `aria-expanded`; mobile is a one-at-a-time accordion closed by Escape / an outside click / following a link.
- **Theme**: `data-theme` on `<html>` (a one-line inline boot script per page — the only inline JS left; the toggle in `site.js` persists to `localStorage['preferred-theme']` and repoints `<meta name="theme-color">` at the current `--bg-0`).
- **Accessibility**: WCAG 2.1 AA contrast in both themes; visible focus; skip link to focusable `<main>`.
- **Category colors**: `--cat-sla/ii/ic/du`; papers badge every category with ≥20% probability but are filed (accent + chip) under their argmax area; student-led get an amber accent. A card's accent is a **2px top edge** driven by the `--edge` custom property (never a left stripe); a pad's swatch is a 7px square driven by `--pad-hue`. Both are set by the `.accent-*` / `.b-*` / `.d-*` class the generators already emit.
- **Publication categories** (domain glossary): Statistical Learning & AI, Interpretability & Insight, Inference & Computation, Discovery & Understanding.

## Task workflows (skills)

Detailed procedures live in `.claude/skills/` and load on demand:

- **`website-content-update`** — the 16-category checklist to walk when the user asks to "update the website" (including how to swap in a new CV).
- **`adding-mentees`** — the `menteesByStage` schema and badge tagging vocabulary for the Mentorship page.
- **`software-stats-pipeline`** — refreshing GitHub/PyPI stats and the `curation` map for the Software page.
- **`publication-pipeline`** — the ADS/Scholar/OpenAlex pipeline, LLM paper categorization, and identifier-completeness auditing.
