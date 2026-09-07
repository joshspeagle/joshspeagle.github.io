"""Pre-render module for the redesigned Mentorship page (#mentorship-content).

Renders an Overview (Total/Current/Former stats + a career-stage breakdown
chart), then mentees split into Current and Former sections, each grouped by
stage (postdoctoral / doctoral / mastersProjects / bachelors). The sections sit in
a grouped listview (assets/js/redesign/listview.js): a search box plus two chip
rows (career stage, and current vs former) filter cards live, collapse empty
groups/sections and keep the per-group / per-section counts honest.

The overview stats and chart are deliberately all-time totals and are captioned as
such — they sit outside the listview and do not react to the filters (E9).

Each stage maps to one of the four redesign category colors (postdoc->sla,
doctoral->ii, masters->ic, bachelors->du) used for the card accent, stage badge,
group-heading dot, and the breakdown chart bars.
"""
from pages_shared import (attr_esc, card_meta, chip, date_range, esc, listview_status,
                          parse_latest_year, period_end_key, strip_tags as _strip_tags)

# Stage key -> (filter cat key, display label, color suffix used for accent + badge)
_STAGES = [
    ("postdoctoral",    "postdoc",   "Postdoc",          "sla"),
    ("doctoral",        "doctoral",  "Doctoral",         "ii"),
    ("mastersProjects", "masters",   "Master's",         "ic"),
    ("bachelors",       "bachelors", "Undergraduate",    "du"),
    ("secondary",       "secondary", "Secondary school", "sec"),
]

# Plain labels (singular/contextual) for chips, group headings, and chart rows
_CHIP_LABEL = {
    "postdoc":   "Postdocs",
    "doctoral":  "Doctoral",
    "masters":   "Master's",
    "bachelors": "Undergraduates",
    "secondary": "Secondary school",
}


def _supervision_and_project(rec):
    """Return (supervisionType, project) handling both single-project records and
    the bachelors-style records that carry a projects[] array."""
    sup = rec.get("supervisionType") or ""
    proj = rec.get("project") or ""
    if not proj and isinstance(rec.get("projects"), list) and rec["projects"]:
        titles = [p.get("title", "") for p in rec["projects"] if p.get("title")]
        proj = "; ".join(titles)
        if not sup:
            sups = [p.get("supervisionType", "") for p in rec["projects"] if p.get("supervisionType")]
            if sups:
                sup = sups[0]
    return sup, proj


def _cosupervisors(rec):
    """All co-supervisor HTML strings (record-level + any inside bachelors projects[])."""
    cs = list(rec.get("coSupervisors") or [])
    for p in (rec.get("projects") or []):
        cs += list(p.get("coSupervisors") or [])
    seen, out = set(), []
    for c in cs:
        if c and c not in seen:
            seen.add(c)
            out.append(c)
    return out


def _card(rec, cat, label, color, completed):
    name_html = rec.get("name") or ""          # already HTML (may contain <a>)
    name_plain = _strip_tags(name_html).strip()
    period = rec.get("timelinePeriod") or ""
    sup, proj = _supervision_and_project(rec)
    cosup = _cosupervisors(rec)
    current_status = rec.get("currentStatus") or ""
    career = rec.get("myCareerStage") or ""
    tag_vals = (list(rec.get("programs") or []) + list(rec.get("awards") or [])
                + list(rec.get("courses") or []) + [rec.get("institution") or ""])

    # data-* keys (plain text for search/sort) — include role + all tag text
    search_src = " ".join(_strip_tags(x) for x in
                          (name_plain, sup, proj, current_status, " ".join(cosup), " ".join(tag_vals)))
    data_search = attr_esc(search_src)
    data_title = attr_esc(name_plain)
    data_year = parse_latest_year(period)

    # meta line: just the project / research interests (the role is now a badge below)
    meta = esc(proj)

    # detail lines: co-supervisors, current status (current mentees only), my career stage
    subs = []
    if cosup:
        subs.append(f'<span class="md-label">Co-supervised with</span> {", ".join(cosup)}')
    # "Where they are now" shows only for current mentees; for former mentees it was
    # too hard to keep accurate, so the status/outcome line is intentionally omitted.
    if not completed and current_status:
        subs.append(current_status)
    subs_html = "".join(f'<p class="item-sub">{x}</p>' for x in subs)
    # "My career stage then" is a quiet footnote at the very bottom of the card.
    foot_html = f'<p class="item-foot">My career stage then: {esc(career)}</p>' if career else ""

    # The period, the career stage and my supervisory role place the mentee, so they
    # lead the card as its metadata line; the tag cluster keeps only what is specific
    # to this person (institution, programs, courses, awards).
    tags = []
    institution = rec.get("institution") or ""
    if institution:                                  # home institution for non-Toronto students
        tags.append(f'<span class="badge tag-institution">{esc(institution)}</span>')
    # Three distinct, searchable tag families: programs, course/thesis context, awards.
    for prog in (rec.get("programs") or []):
        tags.append(f'<span class="badge tag-program">{esc(prog)}</span>')   # esc keeps links intact
    for crs in (rec.get("courses") or []):
        tags.append(f'<span class="badge tag-course">{esc(crs)}</span>')
    for aw in (rec.get("awards") or []):
        tags.append(f'<span class="badge tag-award">{esc(aw)}</span>')
    tags_block = f'<div class="item-tags">{"".join(tags)}</div>' if tags else ""
    meta_html = f'<p class="item-meta">{meta}</p>' if meta else ""

    # data-cat carries both filter dimensions (career stage + current/former); the two
    # chip rows are independent single-select groups that listview.js ANDs together.
    return (
        f'<article class="item accent-{color}" data-lv-item '
        f'data-cat="{cat} {"former" if completed else "current"}" '
        f'data-search="{data_search}" data-year="{data_year}" '
        f'data-num="{data_year}" data-title="{data_title}">'
        f'{card_meta(date_range(period), label, (sup, True))}'
        '<div class="item-head">'
        f'<div class="item-headline"><h4 class="item-title">{name_html}</h4></div>'
        '</div>'
        f'{meta_html}'
        f'{subs_html}'
        f'{tags_block}'
        f'{foot_html}'
        '</article>'
    )


def _breakdown_chart(mbs, completed):
    """Career-stage breakdown: one horizontal bar per stage, split into a solid
    'current' segment and a faded 'former' segment, scaled to the largest stage."""
    stats = []
    for stage_key, cat, label, color in _STAGES:
        cur = len(mbs.get(stage_key) or [])
        former = len(completed.get(stage_key) or [])
        stats.append((cat, color, cur, former, cur + former))
    max_total = max((t for *_, t in stats), default=1) or 1

    rows = []
    for cat, color, cur, former, tot in stats:
        seg_cur = (f'<span class="mc-seg mc-{color}" style="width:{cur / max_total * 100:.2f}%"></span>'
                   if cur else "")
        seg_for = (f'<span class="mc-seg mc-{color} mc-faded" style="width:{former / max_total * 100:.2f}%"></span>'
                   if former else "")
        title = f"{_CHIP_LABEL[cat]}: {cur} current, {former} former ({tot} total)"
        rows.append(
            '<div class="mc-row">'
            f'<span class="mc-label">{esc(_CHIP_LABEL[cat])}</span>'
            f'<span class="mc-track" role="img" aria-label="{attr_esc(title)}" title="{attr_esc(title)}">'
            f'{seg_cur}{seg_for}</span>'
            f'<span class="mc-total">{tot}</span>'
            '</div>'
        )

    # Same key markup as the publication figures, so the two charts read as one system.
    legend = (
        '<div class="pf-leg" aria-hidden="true">'
        '<span class="pf-key"><i class="pf-kw mc-kw-current"></i>Current</span>'
        '<span class="pf-key"><i class="pf-kw mc-kw-former"></i>Former</span>'
        '</div>'
    )
    return (
        '<figure class="mentor-chart" data-chip>'
        '<figcaption class="mc-cap">Mentees by career stage</figcaption>'
        f'<div class="mc-rows">{"".join(rows)}</div>{legend}'
        '</figure>'
    )


def _stage_groups(source, completed_flag):
    """Render the per-stage card groups for one section (Current or Former)."""
    groups = []
    for stage_key, cat, label, color in _STAGES:
        recs = source.get(stage_key) or []
        if not recs:
            continue
        # Order each group by end date automatically (newest first).
        recs = sorted(recs, key=lambda r: period_end_key(r.get("timelinePeriod")), reverse=True)
        cards = "".join(_card(rec, cat, label, color, completed=completed_flag) for rec in recs)
        groups.append(
            '<div class="mentor-group" data-lv-group>'
            f'<h3 class="mentor-group-head"><span class="dot d-{color}"></span>'
            f'{esc(_CHIP_LABEL[cat])} <span class="mentor-count" data-lv-count>{len(recs)}</span></h3>'
            f'<div class="pub-list">{cards}</div>'
            '</div>'
        )
    return "".join(groups)


def generate_content(data):
    section = (data.get("sections") or {}).get("mentorship") or {}
    mbs = section.get("menteesByStage") or {}
    completed = mbs.get("completed") or {}

    n_current = sum(len(mbs.get(sk) or []) for sk, _, _, _ in _STAGES)
    n_former = sum(len(completed.get(sk) or []) for sk, _, _, _ in _STAGES)
    total = n_current + n_former

    # ---- Overview: intro highlight + stats + breakdown chart ----
    prose = (section.get("introduction") or {}).get("content") or ""
    intro_box = (f'<aside class="highlight-box" data-chip><h2>On Mentorship</h2><p>{esc(prose)}</p></aside>'
                 if prose else "")
    stats = (
        '<div class="pub-stats teach-stats" data-chip>'
        f'<div class="pub-stat"><span class="n">{total}</span><span class="l">Total mentees</span></div>'
        f'<div class="pub-stat"><span class="n">{n_current}</span><span class="l">Current</span></div>'
        f'<div class="pub-stat"><span class="n">{n_former}</span><span class="l">Former</span></div>'
        '</div>'
    )
    # The tiles and the chart count everyone ever mentored; the listview below filters.
    # Saying so is cheaper (and more honest) than re-scaling them on every keystroke (E9).
    totals_note = ('<p class="item-foot">Totals above are all-time and do not change with '
                   'the search or filters below.</p>')
    top = (
        '<div class="container">'
        f'{intro_box}{stats}{_breakdown_chart(mbs, completed)}{totals_note}'
        '</div>'
    )

    # ---- Current / Former sections (grouped by stage), inside the listview root ----
    sections_html = ""
    cur_groups = _stage_groups(mbs, completed_flag=False)
    if cur_groups:
        sections_html += (
            '<section class="mentor-block" data-lv-section>'
            '<h2 class="item-section-title">Current mentees '
            f'<span class="mentor-sec-count" data-lv-seccount>{n_current}</span></h2>'
            f'{cur_groups}</section>'
        )
    former_groups = _stage_groups(completed, completed_flag=True)
    if former_groups:
        sections_html += (
            '<section class="mentor-block" data-lv-section>'
            '<h2 class="item-section-title">Former mentees '
            f'<span class="mentor-sec-count" data-lv-seccount>{n_former}</span></h2>'
            f'{former_groups}</section>'
        )

    # Two independent chip rows (stage, then current/former); listview.js ANDs them.
    stage_chips = "".join(
        chip(cat, _CHIP_LABEL[cat],
             len(mbs.get(stage_key) or []) + len(completed.get(stage_key) or []), accent=color)
        for stage_key, cat, _label, color in _STAGES
        if (mbs.get(stage_key) or completed.get(stage_key))
    )
    status_chips = (chip("current", "Current", n_current, accent="sla")
                    + chip("former", "Former", n_former, accent="ii"))

    body = (
        '<div class="container" data-listview data-lv-batch="0">'
        '<div class="pub-controls">'
        '<input type="search" class="pub-search" data-lv-search '
        'placeholder="Search mentees by name, project, or co-supervisor…" aria-label="Search mentees">'
        '<div class="pub-filters" data-lv-filters role="group" aria-label="Filter by career stage">'
        f'{chip("all", "All stages", total, active=True)}{stage_chips}</div>'
        '<div class="pub-filters" data-lv-filters role="group" aria-label="Filter by current or former">'
        f'{chip("all", "Current & former", total, active=True)}{status_chips}</div>'
        '</div>'
        f'{listview_status()}'
        f'{sections_html}'
        '<p class="pub-empty" data-lv-empty hidden>No mentees match your search or filters. '
        '<button type="button" class="linkbtn" data-lv-reset>Show all</button></p>'
        '</div>'
    )

    return top + body
