---
name: publication-pipeline
description: Use when refreshing publications from ADS/Scholar/OpenAlex, categorizing papers into the four research areas with LLM agents, or auditing papers for missing ADS/arXiv/DOI identifiers. Covers update_publications_unified.py, postprocessing.py, the categorization workflow, and the identifierNote annotation convention.
---

# Publication Pipeline

```bash
cd scripts && python -X utf8 update_publications_unified.py    # -X utf8 required on Windows
cd scripts && python postprocessing.py                         # Run post-processing standalone
cd scripts && python postprocessing.py --dry-run               # Preview without saving
```

**Before running**: Ask the user to update their ADS libraries first (primary, significant, student, postdoc authorship categories are pulled from manually curated ADS libraries).

**Pipeline**: Backs up data → fetches from Scholar/ADS/OpenAlex → merges → saves → runs `PostProcessor.run_all()` (featured flags, LLM categorization sync, citation timeline, ADS library cache, authorship categories, ADS bibliometric time series).

**Pipeline scripts**: `config.py` (path utilities `get_data_path()`/`get_project_root()`), `fetch_google_scholar.py`, `fetch_ads.py`, `fetch_openalex.py`, `merge_data.py`, `postprocessing.py` (6 steps, single load/save), `update_publications_unified.py` (orchestrator), and `llm_categorization_rubric.md` (agent instructions). These are 8 of the ~20 files in `scripts/`; the rest are the front-end build + page generators + asset utilities.

**Data files**: `assets/data/publications_data.json` (main), `assets/data/ads_library_cache.json` (ADS library bibcodes; the only live copy — resolved via `config.get_data_path()`), `assets/data/publications.bib` (BibTeX export, manual artifact — not produced by these scripts).

**Requirements**: `uv pip install -r requirements.txt` (scholarly, ads, pyalex, beautifulsoup4, rich, tqdm, …), plus a `.env` with `ADS_API_KEY` (required) and `OPENALEX_EMAIL` (optional).

## LLM Paper Categorization

Paper categorization uses LLM agents reading full papers against `scripts/llm_categorization_rubric.md`. Replaces old keyword-based scoring.

The four categories: **Statistical Learning & AI**, **Interpretability & Insight**, **Inference & Computation**, **Discovery & Understanding**. Papers show badges for categories with ≥20% probability; student-led papers get orange highlighting.

**When**: After pipeline runs (new papers), manual additions, or re-categorization requests.

**Process**: Spawn parallel agents (batches of 5-10) that each:

1. Read the rubric at `scripts/llm_categorization_rubric.md`
2. Fetch full paper via arXiv HTML (`https://arxiv.org/html/{arxiv_id}`), fall back to abstract
3. Categorize into the four areas above
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
