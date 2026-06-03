# CLAUDE.md

## Project Overview

Personal academic website for Joshua S. Speagle (joshspeagle.github.io). Static HTML/CSS/JS on GitHub Pages. **Redesigned June 2026** onto a design-token system with self-hosted fonts and an animated hero. All HTML is pre-rendered from `content.json` by `build_html.py` for SEO; lightweight JS adds interactivity (theme toggle, the hero canvas, and a generic search/filter/sort/load-more list).

## Development Workflow

```bash
npm install                      # one-time: fetch self-hosted fonts (@fontsource)
python scripts/setup_fonts.py    # vendor fonts -> assets/fonts/ + fonts.css
python scripts/build_tokens.py   # tokens.json -> assets/css/tokens.css
python scripts/build_html.py     # regenerate all pages from content.json
python -m http.server 8000       # local dev server
```

- **Content edits go in `assets/data/content.json`, not HTML files.** Then run `build_html.py`.
- **Full rebuild**: `npm run build` (runs tokens → fonts → `build_html.py`).
- **Python packages**: use `uv pip install` instead of `pip install`.
- **Deployment**: push to `master`, GitHub Pages auto-deploys.

## Architecture

### Build system (content.json → static HTML)

`scripts/build_html.py` reads `assets/data/content.json` and fills each page's `#<page>-content` container(s). The **9 HTML pages** (Home, Publications, Talks, Teaching, Mentorship, Awards, Service, Software, News) are **static shells** (head, nav, hero/header band, footer); only the content area is generated — so the static HTML *is* the SEO layer and JS only adds interactivity. Idempotent.

- Home sections: `generate_home_*` in `build_html.py`.
- Publications: `generate_publications_redesign` pre-renders **all ~130 papers** from `publications_data.json` (no Chart.js, no runtime JSON fetch).
- Other pages: one generator each in `scripts/pages_<page>.py` (talks/teaching/mentorship/awards/service/software/news), sharing `scripts/pages_shared.py` (`scaffold()`, `esc`, `attr_esc`).

### Design tokens & fonts

- `assets/data/tokens.json` → `scripts/build_tokens.py` → `assets/css/tokens.css` (single source of truth: `:root` dark + `[data-theme="light"]`).
- Self-hosted fonts: `npm install` (`@fontsource/*`) → `scripts/setup_fonts.py` vendors woff2 into `assets/fonts/` + writes `assets/css/fonts.css`. **Source Serif 4** (serif) · **Inter** (sans) · **JetBrains Mono** (mono); CJK (沈佳士) falls back to system fonts.

### Key Files

| File | Purpose |
|------|---------|
| `assets/data/content.json` | All site content (incl. `software` + `news` sections) |
| `assets/data/publications_data.json` | Publication metadata (pipeline output) |
| `assets/data/tokens.json` | Design tokens (source) |
| `scripts/build_html.py` | Build: fills page content from content.json |
| `scripts/build_tokens.py` · `scripts/setup_fonts.py` | tokens → CSS · vendor fonts |
| `scripts/pages_shared.py` + `scripts/pages_<page>.py` | per-page content generators |
| `assets/css/{fonts,tokens,redesign}.css` | the only stylesheets |
| `assets/js/redesign/hero.js` | animated inference-field hero (decorative, `aria-hidden`) |
| `assets/js/redesign/listview.js` | generic search/filter/sort/load-more (data-attr driven) |
| `assets/js/redesign/publications.js` | publications list interactivity |
| `robots.txt`, `sitemap.xml` | SEO — update `sitemap.xml` when adding pages |

### CSS Load Order

`fonts.css` → `tokens.css` → `redesign.css`. *(The legacy `theme-variables/main/components/circuit-components/mobile/publications-stats` CSS and the old `content-loader.js`/`main.js`/`pages/*.js`/`utils/*` JS were removed in the redesign.)*

### Interactivity & patterns

- **Lists** (`listview.js`): wrap in `<div data-listview data-lv-batch="N">` with `[data-lv-search]`, optional `[data-lv-sort-control]`, `[data-lv-filters]` (`.chip[data-cat]`), and `[data-lv-list]` of `[data-lv-item]` cards carrying `data-cat/data-search/data-year/data-num/data-title`. `pages_shared.scaffold()` emits this; `listview.js` wires it.
- **Theme**: `data-theme` on `<html>` (inline script per page; toggle persists to `localStorage['preferred-theme']`).
- **Accessibility**: WCAG 2.1 AA contrast in both themes; visible focus; skip link to focusable `<main>`.
- **Category colors**: `--cat-sla/ii/ic/du`; papers badge categories with ≥20% probability; student-led get an amber accent.

## Content Update Checklist

When the user asks to "update the website", walk through each category below and ask what (if anything) has changed. All edits go in `assets/data/content.json` unless noted. After edits, run the build script and update the footer date.

| # | Category | What to review | Last edited |
|---|----------|---------------|-------------|
| 1 | **Home — About Me** | Title, affiliations, highlight box, contact info, profile image | 2026-04-06 |
| 2 | **Home — Team** | ART description, highlights, CTAs | 2026-03-08 |
| 3 | **Home — Research Areas** | Four area descriptions, publication link meta stats (citations, h-index, paper count) | 2026-03-08 |
| 4 | **Home — Opportunities** | Postdoc/grad/undergrad cards, fellowship links | 2026-03-08 |
| 5 | **Home — Biography** | Career timeline entries, personal note | 2026-03-08 |
| 6 | **Mentorship — Current** | Postdocs, doctoral, masters, undergrad mentees | 2026-04-06 |
| 7 | **Mentorship — Completed** | Former mentees and their outcomes (TODO: verify current jobs/outcomes) | 2026-04-06 |
| 8 | **Talks** | Invited, contributed, colloquia, panels, public, interviews, workshops, lectures & tutorials | 2026-04-06 |
| 9 | **Teaching** | Course history, short courses & workshops, teaching stats | 2026-04-06 |
| 10 | **Awards** | New awards or honors | 2026-03-09 |
| 11 | **Service** | Society roles, committee memberships, conference org, referee list | 2026-04-06 |
| 12 | **Software** | `sections.software.tools` — packages (dynesty/brutus/…), install, links | 2026-06-03 |
| 13 | **News** | `sections.news.items` — recent papers/talks/awards/milestones | 2026-06-03 |
| 14 | **Publications** | Pre-rendered from `publications_data.json`; automated pipeline — see "Publication Pipeline" | 2026-03-09 |
| 15 | **Footer** | Static in each page shell (copyright year, "last updated") | 2026-06-03 |

Update the "Last edited" column each time a category is modified.

## Content Editing

### Adding Mentees

Add to the appropriate array (`currentMentees` or `formerMentees`) in `content.json`:
```json
{
  "name": "Name",
  "timeline": "Season Year-Season Year",
  "supervision": "Primary Supervisor",
  "status": "Graduate student (<a href='url'>Institution</a>)",
  "cosupervisors": "<a href='url'>Name</a> (<a href='dept'>Dept</a>)",
  "project": "Project description",
  "fellowships": ["Fellowship Name"]
}
```

### Publication Categories

Four categories: Statistical Learning & AI, Interpretability & Insight, Inference & Computation, Discovery & Understanding. Papers show badges for categories with ≥20% probability. Student-led papers get orange highlighting.

## Publication Pipeline

```bash
cd scripts && python -X utf8 update_publications_unified.py    # -X utf8 required on Windows
cd scripts && python postprocessing.py                         # Run post-processing standalone
cd scripts && python postprocessing.py --dry-run               # Preview without saving
```

**Before running**: Ask the user to update their ADS libraries first (primary, significant, student, postdoc authorship categories are pulled from manually curated ADS libraries).

**Pipeline**: Backs up data → fetches from Scholar/ADS/OpenAlex → merges → saves → runs `PostProcessor.run_all()` (featured flags, LLM categorization sync, citation timeline, ADS library cache, authorship categories, ADS bibliometric time series).

**Scripts** (8 files in `scripts/`):
| File | Purpose |
|------|---------|
| `config.py` | Config + path utilities (`get_data_path()`, `get_project_root()`) |
| `fetch_google_scholar.py` | Google Scholar fetcher |
| `fetch_ads.py` | ADS fetcher |
| `fetch_openalex.py` | OpenAlex fetcher |
| `merge_data.py` | Multi-source data merger |
| `postprocessing.py` | Consolidated post-processing (6 steps, single load/save) |
| `update_publications_unified.py` | Main pipeline orchestrator |
| `llm_categorization_rubric.md` | LLM agent categorization instructions |

**Data files**: `assets/data/publications_data.json` (main), `assets/data/ads_library_cache.json` (ADS library bibcodes).

**Requirements**: `.env` with `ADS_API_KEY` (required), `OPENALEX_EMAIL` (optional).

## LLM Paper Categorization

Paper categorization uses LLM agents reading full papers against `scripts/llm_categorization_rubric.md`. Replaces old keyword-based scoring.

**When**: After pipeline runs (new papers), manual additions, or re-categorization requests.

**Process**: Spawn parallel agents (batches of 5-10) that each:
1. Read the rubric at `scripts/llm_categorization_rubric.md`
2. Fetch full paper via arXiv HTML (`https://arxiv.org/html/{arxiv_id}`), fall back to abstract
3. Categorize into four areas (see categories above)
4. Update the paper's entry in `publications_data.json`: set `categoryProbabilities`, `researchArea`, and add `llm_categorization` field (format documented in the rubric)

Papers are "done" when they have an `llm_categorization` field with a valid timestamp.
