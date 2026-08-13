# CLAUDE.md

## Project Overview

Personal academic website for Joshua S. Speagle — live at **joshspeagle.com** (custom apex domain via the tracked `CNAME`; the repo `joshspeagle.github.io` is the GitHub Pages source). Static HTML/CSS/JS on GitHub Pages. **Redesigned June 2026** onto a design-token system with self-hosted fonts and an animated hero. All HTML is pre-rendered for SEO by `build_html.py` from `content.json` (plus the data caches `publications_data.json` and `software_data.json`); lightweight JS adds interactivity (theme toggle, the hero canvas, and a generic search/filter/sort/load-more list).

## Development Workflow

```bash
npm install                      # one-time: fetch self-hosted fonts (@fontsource)
python scripts/setup_fonts.py    # vendor fonts -> assets/fonts/ + fonts.css
python scripts/build_tokens.py   # tokens.json -> assets/css/tokens.css
python scripts/build_html.py     # regenerate all pages from content.json
python -m http.server 8000       # local dev server
```

- **Content edits go in `assets/data/content.json`, not HTML files.** Then run `build_html.py`.
- **Full rebuild**: `npm run build` (runs tokens → fonts → `build_html.py`). (`npm run fonts` runs just the font vendoring step.)
- **Python packages**: use `uv pip install`. The publication-pipeline deps are pinned in `requirements.txt` (`uv pip install -r requirements.txt`); the front-end build scripts (`build_html.py`/`build_tokens.py`/`setup_fonts.py`) use only the stdlib.
- **Deployment**: push to `master`; GitHub Pages auto-deploys to **joshspeagle.com** (custom domain via `CNAME`). Keep `sitemap.xml`/`robots.txt` URLs on that domain.
- **CI gate**: `.github/workflows/build-check.yml` reruns the full build on every push to `master`, every PR, and manual dispatch, then **fails the run if the committed static build is stale**. Always `npm run build` and commit the regenerated HTML/CSS before pushing.

## Architecture

### Build system (content.json → static HTML)

`scripts/build_html.py` reads `assets/data/content.json` and fills each page's content container(s): `#<page>-content` for the nine secondary pages, and the per-section ids `#about`/`#research`/`#team`/`#join` for Home (there is no `#home-content`). For the nine secondary pages it **also** fills the header band — the `#<page>-header` container — from the top-level `pages.<page>` object (`kicker`/`title`/`tagline`) via `generate_page_header`, so that band is data-driven, not hand-edited per shell. The **10 HTML pages** (Home, Publications, Talks, Teaching, Mentorship, Awards, Service, Software, News, Biography) are **static shells** (head, nav, hero frame, footer); the content area and (for secondary pages) the header band are generated — so the static HTML *is* the SEO layer and JS only adds interactivity. Idempotent. *(Biography is a dedicated page holding the career timeline — `sections.biography.timeline` via `generate_biography`; the nav "Biography" links to it, not a homepage anchor. A further shell, `404.html`, is also a redesign static shell but is hand-maintained — it's absent from build_html.py's `HTML_FILES` map and is not regenerated. Footers are likewise static in each shell; the `footer` key in content.json is currently unused.)*

- Home sections: `generate_home_*` in `build_html.py`.
- Publications: `generate_publications_redesign` pre-renders **all ~137 papers** from `publications_data.json` (no Chart.js, no runtime JSON fetch).
- Other pages: one generator each in `scripts/pages_<page>.py` (talks/teaching/mentorship/awards/service/software/news), sharing `scripts/pages_shared.py` (`scaffold()`, `esc`, `attr_esc`). Most use `scaffold()`; **Software** renders a bespoke layout from `software_data.json`.

### Design tokens & fonts

- `assets/data/tokens.json` → `scripts/build_tokens.py` → `assets/css/tokens.css` (single source of truth: `:root` dark + `[data-theme="light"]`).
- Self-hosted fonts: `npm install` (`@fontsource/*`) → `scripts/setup_fonts.py` vendors woff2 into `assets/fonts/` + writes `assets/css/fonts.css`. **Source Serif 4** (serif) · **Inter** (sans) · **JetBrains Mono** (mono); CJK (沈佳士) falls back to system fonts.

### Non-obvious file notes

- `requirements.txt` pins deps for the **publication pipeline only** — the front-end build scripts are stdlib.
- `scripts/generate_favicons.py` · `scripts/make_og_card.py` generate the favicon set + `site.webmanifest` and the OG/Twitter social card (`assets/images/og-card.png`). Re-run on rebrand.
- Update `sitemap.xml` when adding pages.
- `assets/js/redesign/pubchart.js` only adds tooltips — the publication figures themselves are **inline SVG built in `build_html.py`** by `_citations_svg`/`_roles_svg`/`_riq_svg`. Edit the chart shapes there, not in the JS.
- `assets/data/publications.bib` is a manual BibTeX artifact — **not** produced by the pipeline scripts.

### Interactivity & patterns

- **Lists** (`listview.js`): wrap in `<div data-listview data-lv-batch="N">` with `[data-lv-search]`, optional `[data-lv-sort-control]`, `[data-lv-filters]` (`.chip[data-cat]`), and `[data-lv-list]` of `[data-lv-item]` cards carrying `data-cat/data-search/data-year/data-num/data-title`. `pages_shared.scaffold()` emits this; `listview.js` wires it.
- **Theme**: `data-theme` on `<html>` (inline script per page; toggle persists to `localStorage['preferred-theme']`).
- **Accessibility**: WCAG 2.1 AA contrast in both themes; visible focus; skip link to focusable `<main>`.
- **Category colors**: `--cat-sla/ii/ic/du`; papers badge categories with ≥20% probability; student-led get an amber accent.
- **Publication categories** (domain glossary): Statistical Learning & AI, Interpretability & Insight, Inference & Computation, Discovery & Understanding.

## Task workflows (skills)

Detailed procedures live in `.claude/skills/` and load on demand:

- **`website-content-update`** — the 15-category checklist to walk when the user asks to "update the website".
- **`adding-mentees`** — the `menteesByStage` schema and badge tagging vocabulary for the Mentorship page.
- **`software-stats-pipeline`** — refreshing GitHub/PyPI stats and the `curation` map for the Software page.
- **`publication-pipeline`** — the ADS/Scholar/OpenAlex pipeline, LLM paper categorization, and identifier-completeness auditing.
