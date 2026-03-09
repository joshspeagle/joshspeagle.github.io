# CLAUDE.md

## Project Overview

Personal academic website for Joshua S. Speagle (joshspeagle.github.io). Static HTML/CSS/JS site hosted on GitHub Pages. Static HTML is pre-rendered from `content.json` for SEO; JavaScript adds progressive enhancement (animations, filtering, lazy loading).

## Development Workflow

```bash
python scripts/build_html.py    # Regenerate static HTML after editing content.json
python -m http.server 8000      # Local development server
```

- **Content edits go in `content.json`, not HTML files.** Then run the build script.
- **Python packages**: Use `uv pip install` instead of `pip install`
- **Deployment**: Push to `master`, GitHub Pages auto-deploys

## Architecture

### Two-Layer Content System

1. **Static HTML** (SEO): `scripts/build_html.py` reads `assets/data/content.json` and injects content into all 7 HTML page templates. Idempotent.
2. **JS Enhancement**: `content-loader.js` (ES6 module) fetches `content.json` and delegates to page modules in `assets/js/pages/`. All populate functions have **"skip if populated" guards** so they preserve static HTML.

### Key Files

| File | Purpose |
|------|---------|
| `assets/data/content.json` | All site content (~2,600 lines) |
| `assets/data/publications_data.json` | Publication metadata with categories |
| `scripts/build_html.py` | Static HTML build script |
| `assets/js/main.js` | ES6 module entry point (theme, nav, animations) |
| `assets/js/content-loader.js` | ES6 module orchestrator — dynamic imports to `pages/` modules |
| `assets/js/pages/*.js` | Page-specific modules: shared, home, publications, mentorship, talks, teaching, awards, service |
| `assets/css/theme-variables.css` | CSS custom properties (**must load first**) |
| `robots.txt`, `sitemap.xml` | SEO — update `sitemap.xml` when adding new pages |

### Page Modules

Each HTML file sets `window.currentPage` (e.g., `window.currentPage = 'talks'`), which `content-loader.js` uses to dynamically import the correct page module. Both `content-loader.js` and `main.js` are loaded as `<script type="module">`.

| Page | Module | Key Features |
|------|--------|-------------|
| **Home** | `home.js` | Profile, team, research cards, opportunity cards, biography timeline |
| **Publications** | `publications.js` | Chart.js stats dashboard, category badges, batch loading (20/page) |
| **Mentorship** | `mentorship.js` | Overview charts, mentee cards, batch loading (20/page) |
| **Talks** | `talks.js` | Category filtering + pagination (filter first, then paginate within results) |
| **Teaching** | `teaching.js` | Department/level filtering |
| **Awards** | `awards.js` | Static card grid |
| **Service** | `service.js` | Static organizational hierarchy |

### CSS Load Order (Critical)

`theme-variables.css` → `main.css` → `components.css` → `circuit-components.css` → `mobile.css`

### JS Patterns

- **Event delegation**: `data-action` attributes (e.g., `load-more-publications`, `load-more-talks`, `load-more-mentees`). Handler in `content-loader.js` calls global functions set by page modules.
- **Images**: `<picture>` with WebP `<source>` and JPG fallback. Always set `width`/`height` attributes and `height: auto` in CSS.
- **Theme colors**: Use CSS custom properties from `theme-variables.css`
- **Accessibility**: WCAG 2.1 AA, keyboard navigation, ARIA labels
- **Card layouts**: Use `.research-card` and `.research-grid`

## Content Update Checklist

When the user asks to "update the website", walk through each category below and ask what (if anything) has changed. All edits go in `assets/data/content.json` unless noted. After edits, run the build script and update the footer date.

| # | Category | What to review | Last edited |
|---|----------|---------------|-------------|
| 1 | **Home — About Me** | Title, affiliations, highlight box, contact info, profile image | 2026-03-08 |
| 2 | **Home — Team** | ART description, highlights, CTAs | 2026-03-08 |
| 3 | **Home — Research Areas** | Four area descriptions, publication link meta stats (citations, h-index, paper count) | 2026-03-08 |
| 4 | **Home — Opportunities** | Postdoc/grad/undergrad cards, fellowship links | 2026-03-08 |
| 5 | **Home — Biography** | Career timeline entries, personal note | 2026-03-08 |
| 6 | **Mentorship — Current** | Postdocs, doctoral, masters, undergrad mentees | 2026-03-08 |
| 7 | **Mentorship — Completed** | Former mentees and their outcomes (TODO: verify current jobs/outcomes) | 2026-03-08 |
| 8 | **Talks** | Invited, contributed, colloquia, panels, public, interviews, workshops | 2026-03-08 |
| 9 | **Teaching** | Course history, teaching stats | 2026-03-08 |
| 10 | **Awards** | New awards or honors | 2026-03-09 |
| 11 | **Service** | Society roles, committee memberships, conference org, referee list | 2026-03-09 |
| 12 | **Publications** | Automated pipeline — see "Publication Pipeline" section | 2026-03-09 |
| 13 | **Footer** | Copyright year and "last updated" date | 2026-03-09 |

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
