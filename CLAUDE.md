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
- **CI gate**: `.github/workflows/build-check.yml` reruns the full build (`setup_fonts.py` + `build_tokens.py` + `build_html.py`) on every push to `master`, every PR, and manual dispatch, then **fails the run if the committed static build is stale** (`git diff --quiet` → "Static build is out of date. Run npm run build locally and commit the result."). Always `npm run build` and commit the regenerated HTML/CSS before pushing.

## Architecture

### Build system (content.json → static HTML)

`scripts/build_html.py` reads `assets/data/content.json` and fills each page's content container(s): `#<page>-content` for the nine secondary pages, and the per-section ids `#about`/`#research`/`#team`/`#join` for Home (there is no `#home-content`). For the nine secondary pages it **also** fills the header band — the `#<page>-header` container — from the top-level `pages.<page>` object (`kicker`/`title`/`tagline`) via `generate_page_header`, so that band is data-driven, not hand-edited per shell. The **10 HTML pages** (Home, Publications, Talks, Teaching, Mentorship, Awards, Service, Software, News, Biography) are **static shells** (head, nav, hero frame, footer); the content area and (for secondary pages) the header band are generated — so the static HTML *is* the SEO layer and JS only adds interactivity. Idempotent. *(Biography is a dedicated page holding the career timeline — `sections.biography.timeline` via `generate_biography`; the nav "Biography" links to it, not a homepage anchor. A further shell, `404.html`, is also a redesign static shell but is hand-maintained — it's absent from build_html.py's `HTML_FILES` map and is not regenerated. Footers are likewise static in each shell; the `footer` key in content.json is currently unused.)*

- Home sections: `generate_home_*` in `build_html.py`.
- Publications: `generate_publications_redesign` pre-renders **all ~137 papers** from `publications_data.json` (no Chart.js, no runtime JSON fetch).
- Other pages: one generator each in `scripts/pages_<page>.py` (talks/teaching/mentorship/awards/service/software/news), sharing `scripts/pages_shared.py` (`scaffold()`, `esc`, `attr_esc`). Most use `scaffold()`; **Software** renders a bespoke layout (metric strip + featured board + data-viz showcase + grouped list) from `software_data.json` — see "Software Stats Pipeline".

### Design tokens & fonts

- `assets/data/tokens.json` → `scripts/build_tokens.py` → `assets/css/tokens.css` (single source of truth: `:root` dark + `[data-theme="light"]`).
- Self-hosted fonts: `npm install` (`@fontsource/*`) → `scripts/setup_fonts.py` vendors woff2 into `assets/fonts/` + writes `assets/css/fonts.css`. **Source Serif 4** (serif) · **Inter** (sans) · **JetBrains Mono** (mono); CJK (沈佳士) falls back to system fonts.

### Key Files

| File | Purpose |
|------|---------|
| `assets/data/content.json` | All site content (incl. `software` + `news` sections) |
| `assets/data/publications_data.json` | Publication metadata (pipeline output) |
| `assets/data/software_data.json` | GitHub/PyPI stats cache for the Software page (output of `fetch_software.py`) |
| `assets/data/tokens.json` | Design tokens (source) |
| `scripts/build_html.py` | Build: fills page content **and** secondary-page header bands from content.json |
| `scripts/build_tokens.py` · `scripts/setup_fonts.py` | tokens → CSS · vendor fonts |
| `scripts/pages_shared.py` + `scripts/pages_<page>.py` | per-page content generators (talks/teaching/mentorship/awards/service/software/news) |
| `scripts/fetch_software.py` | Refreshes `software_data.json` from GitHub + PyPI (on-demand; see "Software Stats Pipeline") |
| `scripts/generate_favicons.py` · `scripts/make_og_card.py` | asset generation: favicon set + `site.webmanifest` · OG/Twitter social card (`assets/images/og-card.png`). Re-run on rebrand. |
| `assets/css/{fonts,tokens,redesign}.css` | the only stylesheets |
| `assets/js/redesign/hero.js` | animated inference-field hero (decorative, `aria-hidden`) |
| `assets/js/redesign/listview.js` | generic search/filter/sort/load-more (data-attr driven) |
| `assets/js/redesign/publications.js` | publications list interactivity |
| `assets/js/redesign/pubchart.js` | tooltip enhancement for the inline-SVG publication figures (built in `build_html.py`: `_citations_svg`/`_roles_svg`/`_riq_svg`) |
| `assets/js/redesign/mentorgroups.js` | group-aware live search for the Mentorship page (filters cards within `[data-mentor-group]`/`[data-mentor-section]`, collapses empty groups, updates live counts) |
| `requirements.txt` | Python deps for the publication pipeline only |
| `.github/workflows/build-check.yml` | CI — fails the build if the committed static output is stale |
| `CNAME` | custom apex domain (`joshspeagle.com`) |
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
| 1 | **Home — About Me** | `sections.about` — title, affiliations, highlight box, contact info, profile image | 2026-07-13 |
| 2 | **Home — Team** | `sections.team` — ART description, highlights, CTAs | 2026-03-08 |
| 3 | **Home — Research Areas** | `sections.research` — four area descriptions, `additionalContent`, `publications.links`. NB: the meta stats (papers/citations/h-index) are **auto-computed** by `_pub_metrics()` in `build_html.py` from `publications_data.json` — not editable here; the card `intro` is also hardcoded there, overriding `sections.research.intro`. | 2026-03-08 |
| 4 | **Home — Collaboration** | `sections.collaboration` — `opportunities` (postdoc/grad/undergrad cards, fellowship links) **and** `values` (EDI, Open Science) | 2026-07-13 |
| 5 | **Home — Biography** | `sections.biography` — career timeline entries, personal note, dog photos | 2026-07-13 |
| 6 | **Mentorship — Current** | `sections.mentorship.menteesByStage` (`postdoctoral`/`doctoral`/`bachelors`/`mastersProjects`) | 2026-04-06 |
| 7 | **Mentorship — Completed** | `sections.mentorship.menteesByStage.completed.<stage>` — former mentees. (NB: `currentStatus`/`outcome` are no longer displayed, so no job/outcome verification needed — just add newly-finished mentees & fix periods/names.) | 2026-07-13 |
| 8 | **Talks** | `sections.talks` — invited, contributed, colloquia, panels, public, interviews, workshops, lectures & tutorials | 2026-07-13 |
| 9 | **Teaching** | `sections.teaching` — course history, short courses & workshops, teaching stats | 2026-04-06 |
| 10 | **Awards** | `sections.awards` — new awards or honors | 2026-03-09 |
| 11 | **Service** | `sections.service` — society roles, committee memberships, conference org, referee list | 2026-07-13 |
| 12 | **Software** | `sections.software` — the **curation** map (per-repo `group`/`featured`/`pypi`/`docs`/`paper`/`blurb`), plus `groups`, `featured`, `showcase`. Stars/forks/downloads are auto-pulled into `software_data.json` by `fetch_software.py`. **New repos must be added to `curation` or the fetch fails** (forks auto-route to `scratch`). See "Software Stats Pipeline". | 2026-06-07 |
| 13 | **News** | `sections.news.items` — recent papers/talks/awards/milestones | 2026-06-03 |
| 14 | **Publications** | Pre-rendered from `publications_data.json`; automated pipeline — see "Publication Pipeline" | 2026-07-13 |
| 15 | **Footer** | Static in each page shell (copyright year, "last updated"); the `footer` key in content.json is unused | 2026-06-03 |

> Page **header bands** (`kicker`/`title`/`tagline` above the listview) for all nine secondary pages — `publications`/`talks`/`teaching`/`mentorship`/`awards`/`service`/`software`/`news`/`biography` — live in the top-level `pages.<page>` object (separate from `sections.*`) and are **rendered by `build_html.py`** into each shell's `#<page>-header` container. Edit them there, not in the HTML. `tagline` is emitted as raw HTML (so inline `<strong>` etc. work); `kicker`/`title` are escaped.

Update the "Last edited" column each time a category is modified.

## Content Editing

### Adding Mentees

Mentees live under `sections.mentorship.menteesByStage` in `content.json`. Add a **current** mentee to the relevant stage array — `postdoctoral`, `doctoral`, `mastersProjects`, `bachelors`, or `secondary` (high school); add a **former** mentee to the corresponding `menteesByStage.completed.<stage>` array. Each stage has its own color (sla/ii/ic/du/sec) used for the badge, group-heading dot, accent stripe, and breakdown-chart bar. A current entry:
```json
{
  "name": "<a href='url'>Name</a>",
  "timelinePeriod": "Season Year-Season Year",
  "supervisionType": "Primary Supervisor",
  "coSupervisors": ["<a href='url'>Name</a> (<a href='dept'>Dept</a>)"],
  "project": "Project description",
  "myCareerStage": "Assistant Professor",
  "currentStatus": "Graduate student (<a href='url'>Institution</a>)",
  "programs": ["A&A SURP"],
  "awards": ["NSERC PGS-D"],
  "courses": ["Senior Thesis"]
}
```
**Tagging** (all rendered as badges on the card and included in search):
- `supervisionType` — one of `Primary Supervisor` / `Co-Supervisor` / `Secondary Supervisor` / `Informal Supervisor` (formal = on paper; **informal** = involved but not on paper). Rendered as a role badge (formal tinted, informal muted).
- `programs` — list of research programs/opportunities (e.g. `A&A SURP`, `DSI SUDS`, `A&S ROP`, `NSERC USRA`, `Co-op Program`, `MITACS Globalink`). Cyan badge.
- `awards` — list of fellowships/scholarships/honors (e.g. `Dunlap Fellow`, `Banting Fellow`, `NSERC CGS-M`). Amber badge. (Replaces the old `fellowships`/`scholarships` fields.)
- `courses` — academic-credit context; values are exactly `Research Course`, `Junior Thesis`, or `Senior Thesis` (avoid raw course codes). Neutral badge.
- `institution` — home institution for **non-Toronto** students (e.g. visiting/external undergrads); outline badge. Omit for U of T students.

Variations: **bachelors** with several stints may use a `projects` array (`title`/`supervisionType`/`coSupervisors`) **instead of** the top-level `project`/`supervisionType` fields — such an entry is complete even though those top-level fields are absent (read the `projects` array before flagging an entry as missing data). For **former** mentees the `currentStatus`/`outcome` fields are no longer displayed (too hard to keep current), though the data may persist. Award/program/course strings may be plain text or `<a>`-linked HTML (`esc()` preserves links). Match the field names of a sibling entry exactly — misspelled keys silently fail to render.

### Publication Categories

Four categories: Statistical Learning & AI, Interpretability & Insight, Inference & Computation, Discovery & Understanding. Papers show badges for categories with ≥20% probability. Student-led papers get orange highlighting.

## Software Stats Pipeline

The Software page is rendered from two sources: the hand-curated `sections.software` in `content.json` (taxonomy + which repos are featured/grouped + per-repo overrides) and an auto-generated stats cache, `assets/data/software_data.json`.

```bash
cd scripts && python fetch_software.py                  # refresh stars/forks/downloads
cd scripts && python fetch_software.py --allow-unclassified   # drop unknown repos into "scratch" instead of failing
cd scripts && python build_html.py                      # re-render software.html from the refreshed cache
```

- **On-demand only** — there is no scheduled job. Run `fetch_software.py` whenever you want fresh numbers, then `build_html.py`, then commit both `software_data.json` and `software.html`.
- **Source**: GitHub REST API (all **public** repos; private repos excluded, forks flagged) + `pypistats.org` monthly downloads for any repo whose curation entry has a `pypi` name. Stdlib only. Honors `$GITHUB_TOKEN` for a higher rate limit (anonymous is 60/hr).
- **Explicit classification**: every **non-fork** public repo must appear in `sections.software.curation` with a `group`. If GitHub returns one that isn't there, the fetch prints it and **exits non-zero** so new repos can't ship unclassified. Forks auto-route to the `scratch` group.
- **Curation fields** per repo: `group` (required; one of the `groups` ids), `pypi` (PyPI package name if it differs from the repo name, e.g. `brutus → astro-brutus`), `docs`, `paper`, `blurb` (display override; else the GitHub description is used), `hidden` (omit from the page). `featured` (top board) and `showcase` (the data-viz spotlight, e.g. `allsky`) are set at the `sections.software` level, not per-repo.

## Publication Pipeline

```bash
cd scripts && python -X utf8 update_publications_unified.py    # -X utf8 required on Windows
cd scripts && python postprocessing.py                         # Run post-processing standalone
cd scripts && python postprocessing.py --dry-run               # Preview without saving
```

**Before running**: Ask the user to update their ADS libraries first (primary, significant, student, postdoc authorship categories are pulled from manually curated ADS libraries).

**Pipeline**: Backs up data → fetches from Scholar/ADS/OpenAlex → merges → saves → runs `PostProcessor.run_all()` (featured flags, LLM categorization sync, citation timeline, ADS library cache, authorship categories, ADS bibliometric time series).

**Pipeline scripts** (8 of the ~20 files in `scripts/`; the rest are the front-end build + page generators + asset utilities):
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

**Data files**: `assets/data/publications_data.json` (main), `assets/data/ads_library_cache.json` (ADS library bibcodes; the only live copy — resolved via `config.get_data_path()`), `assets/data/publications.bib` (BibTeX export, manual artifact — not produced by these scripts).

**Requirements**: `uv pip install -r requirements.txt` (scholarly, ads, pyalex, beautifulsoup4, rich, tqdm, …), plus a `.env` with `ADS_API_KEY` (required) and `OPENALEX_EMAIL` (optional).

## LLM Paper Categorization

Paper categorization uses LLM agents reading full papers against `scripts/llm_categorization_rubric.md`. Replaces old keyword-based scoring.

**When**: After pipeline runs (new papers), manual additions, or re-categorization requests.

**Process**: Spawn parallel agents (batches of 5-10) that each:
1. Read the rubric at `scripts/llm_categorization_rubric.md`
2. Fetch full paper via arXiv HTML (`https://arxiv.org/html/{arxiv_id}`), fall back to abstract
3. Categorize into four areas (see categories above)
4. Update the paper's entry in `publications_data.json`: set `categoryProbabilities`, `researchArea`, and add `llm_categorization` field (format documented in the rubric)

Papers are "done" when they have an `llm_categorization` field with a valid timestamp.

## Publication Identifier Completeness

Each paper ideally carries the full **ADS + arXiv + DOI trio** (`bibcode`/`adsUrl`, `arxivId`, `doi`); the publications page renders one link per identifier present. The pipeline enriches Scholar-sourced papers by **title-matching** against ADS/OpenAlex, so a paper ends up missing identifiers when either (a) it isn't in ADS (non-astro venue, workshop/proceeding, erratum, thesis, News & Views, decadal white paper) or (b) the title match failed (curly apostrophes / em-dashes / `?`, subscripts like `σ8`, long subtitles).

**After every pipeline run**, list papers missing the trio and make sure each is accounted for:
```bash
cd scripts && python -c "import json;d=json.load(open('../assets/data/publications_data.json'));\
print([p['title'][:60] for p in d['publications'] if not(p.get('bibcode') and p.get('arxivId') and p.get('doi'))])"
```
For each, add a manual **`identifierNote`** field explaining why, prefixed with a status:
- **`settled: ...`** — the missing identifier(s) genuinely don't exist (thesis, erratum, News & Views, non-astro/DataCite-only, white paper with no arXiv). Skip it on future updates.
- **`recheck: ...`** — an identifier likely exists but wasn't captured (title-match miss) or will appear later (preprint awaiting publication). Re-attempt the lookup on the next update; when recovered, set the field(s) and drop/downgrade the note.

Recovery is usually a direct ADS/arXiv/publisher lookup by title — the `scholarUrl` field often embeds the DOI or arXiv id. `identifierNote` (like `llm_categorization`) is a manual annotation on the paper entry and persists across pipeline runs. A paper is "identifier-complete" when it has the trio **or** a `settled:` note. (`identifierNote` is maintenance-only — not rendered on the site.)

> **Watch for near-duplicate titles, but verify before merging**: multi-part series can share a base title (e.g. the two 2017 "Deriving photometric redshifts using fuzzy archetypes…" papers are Part I *Methodology* / Part II *Implementation* — distinct bibcodes/DOIs, **not** a duplicate). Compare `bibcode`/`doi` before deduping.
