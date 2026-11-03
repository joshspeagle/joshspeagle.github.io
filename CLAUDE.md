# Repository Instructions (`joshspeagle.github.io`)

This repository contains the source data, build pipeline, design system, and generated static HTML for Joshua S. Speagle's personal academic website (`https://joshspeagle.com`), hosted on GitHub Pages from the `master` branch root.

---

## 1. Architecture & Single Source of Truth

All twelve HTML pages at the repository root (`index.html`, `publications.html`, `software.html`, `talks.html`, `teaching.html`, `mentorship.html`, `biography.html`, `news.html`, `awards.html`, `service.html`, `writing.html`, `404.html`), while self-contained multi-page interactive series live under `writing/<series-slug>/` (such as `writing/dl-tuning-playbook/`), along with `sitemap.xml`, `feed.xml`, `assets/css/tokens.css`, `assets/css/fonts.css`, and `assets/data/publications.bib`, are **generated build outputs**. Never hand-edit the generated `.html` files or `assets/css/tokens.css`; edit the underlying JSON data, Python generators, or `assets/css/redesign.css` and run the build.

### Data Files (`assets/data/`)
- **`assets/data/content.json`** — Hand-curated site copy and structured records:
  - `site`: `lastUpdated` (`YYYY-MM-DD`), `jobTitle`, `affiliation`, and build credit.
  - `pages`: Per-page header metadata (`kicker`, `title`, `tagline`, and homepage section headings).
  - `sections`:
    - `about`: Homepage **About Me** paragraphs (`paragraphs`), `contactInfo`, and `profileImage`.
    - `research`: Four core research areas (`areas`), context note (`additionalContent`), and external bibliography links.
    - `team`: **Astrostatistics Research Team (ART)** overview, highlights, and CTAs.
    - `collaboration`: Homepage **Working With Me** career-stage summary (`stagesSummary`), group `values`, and the full 6-card prospective student/postdoc fellowship and program directory (`opportunities`, rendered on `mentorship.html#opportunities`).
    - `biography`: Chronological career `timeline`, `personalNote`, and `dogPhotos` (all rendered on `biography.html`).
    - `mentorship`: Introduction callout and `menteesByStage` (`postdoctoral`, `doctoral`, `mastersProjects`, `bachelors`, `secondary`, plus `completed` cohorts).
    - `publications`: Featured paper metadata, author profile links, and curated ADS library IDs (`libraries`).
    - `talks`, `teaching`, `awards`, `service`, `news`, `writing`: Structured records rendered by their respective `scripts/pages_*.py` modules (`writing` stores multi-part interactive `series`, curriculum `acts`, and unified `entries`).
    - `software`: GitHub username (`githubUser`), category `groups`, `featured` packages, interactive `showcase` (`allsky`), and the repository `curation` dictionary.
- **`assets/data/publications_data.json`** — Automated publication cache maintained by `scripts/update_publications_unified.py` (metrics, yearly citation series, RIQ series, and 130+ paper records with `categoryProbabilities` and `researchArea`).
- **`assets/data/software_data.json`** — Automated software cache maintained by `scripts/fetch_software.py` (GitHub stars, forks, push dates, archive flags, and monthly PyPI download counts).
- **`assets/data/tokens.json`** — Single source of truth for all CSS custom properties (compiled into `assets/css/tokens.css` by `scripts/build_tokens.py`).

### Build & Generator Scripts (`scripts/`)
- `scripts/build_tokens.py` — Compiles `assets/data/tokens.json` into `assets/css/tokens.css`.
- `scripts/setup_fonts.py` — Copies self-hosted WOFF2 font files from `node_modules/@fontsource/*` into `assets/fonts/` and writes `assets/css/fonts.css` (skips smoothly when `node_modules/` is absent and fonts are already committed).
- `scripts/build_html.py` — Renders all 12 HTML pages, `sitemap.xml`, and `feed.xml`.
- `scripts/pages_shared.py` and `scripts/pages_{mentorship,software,teaching,talks,service,awards,news,writing}.py` — Per-page HTML generators imported by `build_html.py`.
- `scripts/check_build.py` — Verifies tag balance, unique element IDs, required section containers (`#about`, `#research`, `#team`, `#join` on `index.html`), listview `data-year` attributes, CSS token definitions, raw hex restrictions (`scripts/check_allow_hex.txt`), and internal link/anchor resolution across all built pages.
- `scripts/export_bib.py` — Generates `assets/data/publications.bib` from `assets/data/publications_data.json` (and verifies synchronization with `--check`).
- `scripts/curate_ads_libraries.py` — Audits `assets/data/publications_data.json` against `assets/data/ads_library_cache.json` and the mentee rosters in `assets/data/content.json`, auto-classifies unclassified papers into `primary`, `postdoc`, `student`, `significant`, and `all` ADS libraries, updates `ads_library_cache.json` (`--apply-cache`), and pushes new bibcodes directly to NASA ADS via the `biblib` REST API (`--push-ads`).
- `scripts/sync_cv.py` — Bidirectional CV <-> Website synchronization utility that compares summary statistics, mentorship counts, publication counts, and service roles across `assets/data/content.json`, `assets/data/publications_data.json`, `/mnt/d/Dropbox/CV/CV_speagle.docx`, `/mnt/d/Dropbox/CV/CV_speagle.pdf`, `CV_speagle.pdf`, and `docs/CV_speagle.pdf`.
- `scripts/propose_updates.py` — Autonomous preflight scanner that audits cache freshness, bidirectional CV diffs (`sync_cv.py`), ADS library curation (`curate_ads_libraries.py`), expired mentee/service `timelinePeriod`s, uncategorized or news-worthy papers, unclassified GitHub repos, OpenAlex works, department/group news pages, and `.ics` calendar feeds.

---

## 2. Build, Verification & CI Commands

Always run the build and verification suite after modifying any data file, script, or stylesheet:

```bash
npm run build        # runs build_tokens.py -> setup_fonts.py -> build_html.py
npm run build        # run a second time to verify idempotency ("No changes needed")
npm run check        # runs check_build.py && export_bib.py --check
npm run propose      # runs propose_updates.py (add -- --online for live API/web checks)
```

If `assets/data/publications_data.json` changes, regenerate the BibTeX file before running `npm run check`:
```bash
python scripts/export_bib.py
```

The GitHub Actions workflow (`.github/workflows/update-publications.yml`) runs `npm run build`, `git diff --exit-code` (failing if committed build outputs are stale relative to `assets/data/` or `scripts/`), and `npm run check`.

---

## 3. Writing & Documentation Standards

All front-facing copy in `assets/data/content.json` and generator strings in `scripts/*.py`, as well as internal documentation and code comments, must follow these standards:

1. **Direct, Natural Voice:** Write in clear, conversational first-person prose (`I` for personal statements, `we` for the Astrostatistics Research Team). Use complete sentences with explicit logical connectors (*because*, *while*, *so*) rather than telegraphic fragments or matched-pair slogans.
2. **No Mannered Language:** Avoid stock AI metaphors and filler idioms (do not use phrases such as *"earns its keep"*, *"spends a token"*, *"the bill comes due"*, *"load-bearing"*, *"how it has landed"*, *"pitch in"*, *"settle in"*, *"the usual way in"*, *"a lever arm"*, or *"a dial worth turning"*).
3. **Clean Living Documentation:** Open documentation files and module docstrings with their purpose. Do not embed historical audit pass codes (such as `(audit A5)` or `(D14)`) in code comments or docs.
4. **Verified Facts & Links:** Never invent quantitative metrics, dates, or URLs. Two external URLs in `content.json` (`http://allsky.s3-website.us-east-2.amazonaws.com/` and `http://briandnord.com/`) do not support HTTPS and must remain `http://`.

---

## 4. Autonomous Content Update Workflow

When asked to update the website, sync with a new CV or calendar, or check for outdated content, follow `.claude/skills/website-content-update/SKILL.md`:

1. **Discover Automatically First:** Run `python scripts/propose_updates.py --online` (plus `--ics <calendar>` or connected Google Calendar tools when available), check `CV_speagle.pdf`, and run the publication/software pipelines if caches are stale.
2. **Propose a Consolidated Digest:** Present a single structured **Update Proposal Digest** with drafted entries for user sign-off rather than asking a manual multi-question intake checklist.
3. ** specialized Skills (`.claude/skills/`):**
   - `.claude/skills/website-content-update/SKILL.md` — End-to-end autonomous update discovery and proposal workflow.
   - `.claude/skills/publication-pipeline/SKILL.md` — Refreshing `publications_data.json` from ADS, Google Scholar, and OpenAlex, plus topic classification (`scripts/llm_categorization_rubric.md`).
   - `.claude/skills/software-stats-pipeline/SKILL.md` — Refreshing `software_data.json` from GitHub and PyPI and classifying new repositories.
   - `.claude/skills/adding-mentees/SKILL.md` — Schema and ordering rules for `sections.mentorship.menteesByStage`.
