---
name: software-stats-pipeline
description: Use when refreshing the Software page's GitHub/PyPI stats or adding a new repo to it — running fetch_software.py, the curation map fields in content.json, and why the fetch deliberately exits non-zero on an unclassified repo.
---

# Software Stats Pipeline

The Software page is rendered from two sources: the hand-curated `sections.software` in `content.json` (taxonomy + which repos are featured/grouped + per-repo overrides) and an auto-generated stats cache, `assets/data/software_data.json`.

```bash
cd scripts && python fetch_software.py                        # refresh stars/forks/downloads
cd scripts && python fetch_software.py --allow-unclassified   # drop unknown repos into "scratch" instead of failing
cd scripts && python build_html.py                            # re-render software.html from the refreshed cache
```

- **On-demand only** — there is no scheduled job. Run `fetch_software.py` whenever you want fresh numbers, then `build_html.py`, then commit both `software_data.json` and `software.html`.
- **Source**: GitHub REST API (all **public** repos; private repos excluded, forks flagged) + `pypistats.org` monthly downloads for any repo whose curation entry has a `pypi` name. Stdlib only. Honors `$GITHUB_TOKEN` for a higher rate limit (anonymous is 60/hr).
- **Explicit classification**: every **non-fork** public repo must appear in `sections.software.curation` with a `group`. If GitHub returns one that isn't there, the fetch prints it and **exits non-zero** so new repos can't ship unclassified. Forks auto-route to the `scratch` group.
- **Curation fields** per repo: `group` (required; one of the `groups` ids), `pypi` (PyPI package name if it differs from the repo name, e.g. `brutus → astro-brutus`), `docs`, `paper`, `blurb` (display override; else the GitHub description is used), `hidden` (omit from the page). `featured` (top board) and `showcase` (the data-viz spotlight, e.g. `allsky`) are set at the `sections.software` level, not per-repo.
- **External collaborations**: a repo you don't own (a collaborator's repo, or an org repo you contribute to) is curated with `external: "owner/repo"` instead of relying on the `githubUser` repo listing — e.g. `"lf2i": { "group": "inference", "external": "lee-group-cmu/lf2i", ... }`. `fetch_software.py` fetches each `external` entry individually via `GET /repos/{owner}/{repo}` and merges it into the same stats cache with `"external": true`; it's excluded from both the unclassified-repo check (it was never expected to appear in your own repo listing) and the "curated repo no longer public" check. The page renders it with a "collaborator" tag (`.tag.external` in `redesign.css`, alongside the existing `.tag.fork`) instead of a fork badge.

Unlike the other secondary pages, **Software** does not use `pages_shared.scaffold()` — `scripts/pages_software.py` renders a bespoke layout (metric strip + featured board + data-viz showcase + grouped list).
