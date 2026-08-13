---
name: website-content-update
description: Use when the user asks to "update the website" or refresh site content — walks the 15-category content checklist (about, team, research, collaboration, biography, mentorship, talks, teaching, awards, service, software, news, publications, footer), asking what changed in each. All edits go in assets/data/content.json.
---

# Content Update Checklist

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
| 8 | **Talks** | `sections.talks` — invited, contributed, colloquia, panels, public, interviews, workshops, lectures & tutorials | 2026-08-02 |
| 9 | **Teaching** | `sections.teaching` — course history, short courses & workshops, teaching stats | 2026-04-06 |
| 10 | **Awards** | `sections.awards` — new awards or honors | 2026-03-09 |
| 11 | **Service** | `sections.service` — society roles, committee memberships, conference org, referee list | 2026-07-13 |
| 12 | **Software** | `sections.software` — the **curation** map (per-repo `group`/`featured`/`pypi`/`docs`/`paper`/`blurb`), plus `groups`, `featured`, `showcase`. Stars/forks/downloads are auto-pulled into `software_data.json` by `fetch_software.py`. **New repos must be added to `curation` or the fetch fails** (forks auto-route to `scratch`). See the `software-stats-pipeline` skill. | 2026-06-07 |
| 13 | **News** | `sections.news.items` — recent papers/talks/awards/milestones | 2026-06-03 |
| 14 | **Publications** | Pre-rendered from `publications_data.json`; automated pipeline — see the `publication-pipeline` skill | 2026-07-13 |
| 15 | **Footer** | Static in each page shell (copyright year, "last updated"); the `footer` key in content.json is unused | 2026-06-03 |

> Page **header bands** (`kicker`/`title`/`tagline` above the listview) for all nine secondary pages — `publications`/`talks`/`teaching`/`mentorship`/`awards`/`service`/`software`/`news`/`biography` — live in the top-level `pages.<page>` object (separate from `sections.*`) and are **rendered by `build_html.py`** into each shell's `#<page>-header` container. Edit them there, not in the HTML. `tagline` is emitted as raw HTML (so inline `<strong>` etc. work); `kicker`/`title` are escaped.

Update the "Last edited" column each time a category is modified.

For adding or editing mentees specifically (category 6/7), see the `adding-mentees` skill.
