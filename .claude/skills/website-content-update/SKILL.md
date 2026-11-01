---
name: website-content-update
description: Autonomous discovery, proposal, and execution workflow for updating Joshua S. Speagle's website (joshspeagle.com). Use whenever the user asks to update the website, sync with their CV or calendar, refresh publications or software stats, roll over a semester/term, or check for outdated content.
---

# Autonomous Website Content Update Workflow

## Overview

Updating `joshspeagle.com` follows a **discover-first, propose-second, sign-off-third** workflow. Do not walk the user through a manual category-by-category interview asking what changed. Instead, gather candidate updates automatically from local files, academic/code APIs, web pages, and calendar sources, draft the exact `content.json` entries, and present a consolidated **Update Proposal Digest** for sign-off.

---

## Phase 1: Autonomous Discovery & Preflight (Run Before Asking Questions)

Execute the following discovery steps automatically at the start of an update session:

### 1. Run the Unified Preflight Script
```bash
python scripts/propose_updates.py --online
```
If the user has an iCalendar (`.ics`) export or URL, pass `--ics <path_or_url>`. If a Google Calendar plugin or MCP tool is connected in the current session, query events over the past 6 months and next 6 months for keywords (`talk`, `colloquium`, `seminar`, `keynote`, `panel`, `lecture`, `workshop`, `conference`, `AST`, `STA`, `defense`).

### 2. Refresh Automated Data Pipelines (Publications, ADS Libraries & Software)
Check the cache dates reported by `propose_updates.py`. If `publications_data.json` or `software_data.json` is stale (or if the user requested a full refresh):

- **ADS Authorship Library Curation (`scripts/curate_ads_libraries.py`):**
  ```bash
  python scripts/curate_ads_libraries.py
  python scripts/curate_ads_libraries.py --apply-cache --push-ads
  ```
  Automatically matches new or unclassified papers against the mentee rosters in `assets/data/content.json` and author-position rules (`primary`, `postdoc`, `student`, `significant`, `all`), updates `assets/data/ads_library_cache.json`, and pushes approved bibcodes to the live NASA ADS libraries via `POST https://api.adsabs.harvard.edu/v1/biblib/documents/<library_id>`.

- **Publications (`assets/data/publications_data.json` & `assets/data/publications.bib`):**
  ```bash
  cd scripts && ~/.venvs/default/bin/python update_publications_unified.py
  python scripts/export_bib.py
  ```
  If any newly fetched papers lack `categoryProbabilities`, classify them using `scripts/llm_categorization_rubric.md`, write the probabilities back to `publications_data.json`, and re-run `update_publications_unified.py --skip-fetch` so `researchArea` is derived.

- **Software (`assets/data/software_data.json`):**
  ```bash
  cd scripts && python fetch_software.py --propose-unclassified
  ```
  If `fetch_software.py` reports unclassified non-fork repositories on GitHub, draft their `sections.software.curation` entries (suggested `group`, 1-sentence `blurb`, and `pypi` package name if published on PyPI) to include in the proposal digest.

### 3. Bidirectional Sync with `/mnt/d/Dropbox/CV/` (`scripts/sync_cv.py`)
- Run the bidirectional CV synchronization check (and update/export when approved):
  ```bash
  python scripts/sync_cv.py
  python scripts/sync_cv.py --update-docx --export-pdf --sync-pdf
  ```
- Compares `/mnt/d/Dropbox/CV/CV_speagle.docx`, `/mnt/d/Dropbox/CV/CV_speagle.pdf`, `CV_speagle.pdf`, and `docs/CV_speagle.pdf` against `assets/data/content.json` and `assets/data/publications_data.json`:
  - Ensures `CV_speagle.pdf` and `docs/CV_speagle.pdf` are identical to the newest PDF in `/mnt/d/Dropbox/CV/`.
  - Audits the strict 2-page CV summary counts (active and cumulative mentees by stage, total papers, citation floor, h-index, and non-overlapping authorship role counts), updates `/mnt/d/Dropbox/CV/CV_speagle.docx` (`--update-docx`), exports `/mnt/d/Dropbox/CV/CV_speagle.pdf` via headless Word COM while verifying `PAGES=2` (`--export-pdf`), and syncs `CV_speagle.pdf` and `docs/CV_speagle.pdf` (`--sync-pdf`).
  - **2-Page CV Standing Rules:**
    - **MSc Mentorship Line:** When active `mastersProjects` count is `0`, omit the `MSc students/projects` bullet on Page 1 to save a line; when `mastersProjects > 0`, `sync_cv.py --update-docx` automatically restores `N MSc students/projects` right after `doctoral students`.
    - **Non-Overlapping Publication Categories:** Keep the `PUBLICATIONS` topline to 1 line (`This includes:`) and note `(non-overlapping categories)` on the second bullet (`N other papers with significant contributions (non-overlapping categories)`) alongside `primary/co-first author`, `papers led by postdocs`, and `papers led by students`.
    - **Department Ordering:** List `Astronomy & Astrophysics` before `Statistical Sciences` in both the CV header subtitle and the `University Service` section.

### 4. Check External Web Sources
Fetch and scan:
- **ART Group website** (`https://astrostatuoft.com/`) for new group members, student graduations, or group news.
- **U of T Astronomy & Astrophysics News** (`https://www.astro.utoronto.ca/news/`) and **U of T Statistical Sciences News** (`https://www.statistics.utoronto.ca/news`) for press releases, student awards (e.g., Yen Award, Fieldus Award), or faculty highlights.

---

## Phase 2: Present the Consolidated Update Proposal Digest

Group all discovered updates into a single, structured digest for user review:

1. **Pipeline Refreshes Ready to Commit:**
   - Summary of publication metrics (`totalPapers`, `totalCitations`, `hIndex`, `i10Index`, newly indexed papers) and software metrics (repo count, total stars, monthly PyPI downloads).
2. **Date & Term Rollovers:**
   - Current mentees whose `timelinePeriod` has ended (propose moving to `menteesByStage.completed.<stage>`).
   - Service roles or interim leadership appointments (`sections.about.paragraphs`, `sections.service.categories`) that have transitioned.
   - Semester course term updates in `sections.teaching.courses`.
3. **New Content Proposals (Drafted in Full):**
   - **News & Press (`sections.news.items`):** Drafted title, date (`"Mon YYYY"`), `type` (`press` | `paper` | `talk` | `award` | `group` | `software`), 1–2 sentence `blurb` in Josh's direct voice, `outlet` (if press/department), and `link`.
   - **Mentees (`sections.mentorship.menteesByStage`):** Full JSON record following `.claude/skills/adding-mentees/SKILL.md`.
   - **Talks (`sections.talks.categories`):** Category, title, event/venue, location, and date (`"Mon YYYY"`).
   - **Unclassified Software (`sections.software.curation`):** Proposed `group` and `blurb`.
4. **Targeted Questions (Only Where Needed):**
   - Ask only about facts that could not be verified from local files, APIs, calendars, or web scraping (for example, a graduating student's next position if not yet listed online).

---

## Phase 3: Apply, Rebuild & Verify

Once the user approves or adjusts the proposed digest:

1. **Apply Edits to `assets/data/content.json`:**
   - Maintain chronological ordering (newest first) in `news.items`, `talks.categories[*].items`, `teaching.courses[*].terms`, `teaching.shortCourses`, `awards.awards`, and `service.categories`.
   - Update `site.lastUpdated` in `assets/data/content.json` to today's ISO date (`YYYY-MM-DD`).
   - If a newer `CV_speagle.pdf` was provided, copy it to `./CV_speagle.pdf` in the repository root.
2. **Build and Verify:**
   ```bash
   python scripts/export_bib.py
   npm run build
   npm run build   # second run must report "No changes needed" for every page
   npm run check   # must exit 0 with 0 errors
   ```
3. **Summarize & Commit (When Requested):**
   - Report the exact files updated, metrics changed, and verification status.
