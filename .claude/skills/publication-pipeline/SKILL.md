---
name: publication-pipeline
description: Use when refreshing publications from ADS/Scholar/OpenAlex, categorizing papers into the four research areas with LLM agents, or auditing papers for missing ADS/arXiv/DOI identifiers. Covers update_publications_unified.py, postprocessing.py, the categorization workflow, and the identifierNote annotation convention.
---

# Publication Pipeline

```bash
cd scripts && python -X utf8 update_publications_unified.py    # -X utf8 required on Windows
cd scripts && python postprocessing.py                         # Run post-processing standalone
cd scripts && python postprocessing.py --dry-run               # Preview without saving
cd scripts && python export_bib.py                             # Regenerate publications.bib
cd scripts && python export_bib.py --check                     # Fail if the .bib is stale
```

**Before running**: Ask the user to update their ADS libraries first (primary, significant, student, postdoc authorship categories are pulled from manually curated ADS libraries).

**Pipeline**: Backs up data → fetches from Scholar/ADS/OpenAlex → merges → saves → runs `PostProcessor.run_all()` → regenerate `publications.bib`.

`PostProcessor.run_all()` steps, in order:

| Step | Method | What it does |
|---|---|---|
| 1 | `flag_featured` | Sets `featured` on the three showcase papers. |
| 2a | `normalize_publication_text` | Strips publisher/LaTeX artifacts from titles and abstracts. |
| 2b | `backfill_journals` | Gives every paper a venue string. |
| 2c | `deduplicate` | Collapses records sharing a DOI / bibcode / arXiv id. |
| 2d | `ensure_categorization` | Syncs LLM probabilities and **derives** `researchArea`. |
| 3 | `fix_citations_timeline` | Scholar metrics + `totalPapers` + citations by year. |
| 4 | `update_ads_library_cache` | Refreshes `ads_library_cache.json`. |
| 5 | `apply_authorship_categories` | Assigns `authorshipCategory` from the curated libraries. |
| 5b | `reconcile_role_counts` | Writes `metrics.roleReconciliation` + `metrics.notes`. |
| 6 | `fetch_ads_metrics` | ADS bibliometric time series + per-role RIQ. |

Steps 2a–2d and 5b are pure functions on the data — `normalize_text`, `deduplicate_publications`, `argmax_research_area`, `journal_from_bibcode`, `identity_keys` — and are importable from `postprocessing` **without** the pipeline's third-party dependencies (`requests`/`dotenv` are imported lazily inside the network steps). `merge_data.py` and `update_publications_unified.py` reuse them.

### Derived fields — do not hand-edit

- **`researchArea`** is always `argmax(categoryProbabilities)`, recomputed for every paper on every run. To move a paper, edit its probabilities (or re-run the LLM categorization), never the area. The page files each paper under exactly that one area — accent stripe, `data-cat` and filter chip all read it (`_pub_cat_key` in build_html.py), so the four chips partition the corpus — while badges advertise every area ≥ 0.20 (`_pub_badge_keys`), which is a superset.
- **`journal`** is backfilled from the bibcode's journal code via `BIBCODE_JOURNALS` (`ApJ..` → The Astrophysical Journal, `JCAP.` → …); a paper with an arXiv id and no bibcode gets `arXiv e-prints`. Anything that resolves to neither is logged as a WARNING for a hand-written venue — add the code to `BIBCODE_JOURNALS` if it is a real journal.
- **`metrics.totalPapers`**, `citationsByPublicationYear`, `metrics.notes` and `metrics.roleReconciliation` are all recomputed. `metrics.lastUpdated` is the *fetch* timestamp; corrections made without a refetch belong in the top-level `manualEdits` list.

### De-duplication

Two passes. `merge_data._check_for_duplicates` groups by normalised title; `merge_data._dedupe_by_identifier` (and `PostProcessor.deduplicate` as a backstop) then joins on **DOI, bibcode or arXiv id**, treating an arXiv bibcode (`2023arXiv230706378L`) as its arXiv id so a preprint and its published record collapse. The most complete record wins, fields only the losers carried are merged in, and their Scholar ids are kept in `scholar_id_aliases`. This is the pass that catches Scholar listing a preprint and the published paper under *different titles* — the failure that once double-counted a paper.

### Text normalisation

`normalize_text()` is applied to every title and abstract and is idempotent. It collapses doubled backslashes, turns escaped newlines and TeX spacing macros into spaces, drops a leading `Abstract` label, unwraps `\textit{}`/`\emph{}`/`\mathrm{}`/`{\rm …}`-style wrappers, maps `\alpha`/`\sim`/`\pm`/… to Unicode, turns ``` `` ```/`''` into curly quotes (restoring the space the sources drop), and unwraps `$…$`. **Unmapped macros are left verbatim on purpose** — if one shows up on the page, add it to `_TEX_SYMBOLS` rather than letting it vanish silently. ADS `<SUB>`/`<SUP>` markup and HTML entities are deliberately untouched: the page renders abstracts as HTML.

### Role counts and the RIQ corpora

The four curated ADS libraries are the **single source of truth** for `authorshipCategory`. Membership resolves by bibcode *or* arXiv id, so a library entry filed under a preprint bibcode still lands on the published record.

The RIQ curves come back from ADS computed over the raw bibcode lists, which are larger than the paper counts, so `metrics.roleReconciliation.byRole` records both: `libraryBibcodes` (what ADS measured), `papers` (distinct site records, which agrees with the `authorshipCategory` tally), `duplicateBibcodes` (preprint+published pairs of one paper) and `unmatchedBibcodes` (library entries with no site record). Each unmatched bibcode needs a gloss in `metrics.roleReconciliation.unmatchedBibcodeNotes`; the step carries existing glosses forward, drops them once a bibcode resolves, and WARNs about any that lack one.

**Pipeline scripts**: `config.py` (path utilities `get_data_path()`/`get_project_root()`), `fetch_google_scholar.py`, `fetch_ads.py`, `fetch_openalex.py`, `merge_data.py`, `postprocessing.py` (single load/save), `update_publications_unified.py` (orchestrator), `export_bib.py` (BibTeX export), and `llm_categorization_rubric.md` (agent instructions). These are 9 of the ~20 files in `scripts/`; the rest are the front-end build + page generators + asset utilities.

**Data files**: `assets/data/publications_data.json` (main), `assets/data/ads_library_cache.json` (ADS library bibcodes; the only live copy — resolved via `config.get_data_path()`), `assets/data/publications.bib` (**generated** — `scripts/export_bib.py` renders it from `publications_data.json`; never hand-edit it, and re-run the export whenever the publication list changes. `--check` makes it a build gate).

**Requirements**: `uv pip install -r requirements.txt` (scholarly, ads, pyalex, beautifulsoup4, rich, tqdm, …), plus a `.env` with `ADS_API_KEY` (required) and `OPENALEX_EMAIL` (optional).

## LLM Paper Categorization

Paper categorization uses LLM agents reading full papers against `scripts/llm_categorization_rubric.md`. Replaces old keyword-based scoring.

The four categories: **Statistical Learning & AI**, **Interpretability & Insight**, **Inference & Computation**, **Discovery & Understanding**. Papers show badges for every category with ≥20% probability, but are filed (stripe + chip) under their argmax area; student-led papers get orange highlighting.

**When**: After pipeline runs (new papers), manual additions, or re-categorization requests.

**Process**: Spawn parallel agents (batches of 5-10) that each:

1. Read the rubric at `scripts/llm_categorization_rubric.md`
2. Fetch full paper via arXiv HTML (`https://arxiv.org/html/{arxiv_id}`), fall back to abstract
3. Categorize into the four areas above
4. Update the paper's entry in `publications_data.json`: set `categoryProbabilities` and add the `llm_categorization` field (format documented in the rubric). **Do not set `researchArea`** — `postprocessing.ensure_categorization` derives it as the argmax and will overwrite whatever is there.

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

Recovery is usually a direct ADS/arXiv/publisher lookup by title — the `scholarUrl` field often embeds the DOI, arXiv id or ADS bibcode, and `fetch_google_scholar._extract_identifiers` now parses all three forms (doi.org, a publisher path containing a DOI, `arxiv.org/abs/…`, `ui.adsabs.harvard.edu/abs/…`). `identifierNote` (like `llm_categorization`) is a manual annotation on the paper entry and persists across pipeline runs — `update_publications_unified._carry_forward_existing_fields` preserves it along with `llm_categorization`, `categoryProbabilities`, `researchArea`, `featured`, `scholar_id_aliases` and `journal`, matching on identifier first and title second. A paper is "identifier-complete" when it has the trio **or** a `settled:` note. (`identifierNote` is maintenance-only — not rendered on the site.)

> **Watch for near-duplicate titles, but verify before merging**: multi-part series can share a base title (e.g. the two 2017 "Deriving photometric redshifts using fuzzy archetypes…" papers are Part I *Methodology* / Part II *Implementation* — distinct bibcodes/DOIs, **not** a duplicate). Compare `bibcode`/`doi` before deduping.
