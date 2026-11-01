import re
"""Pre-render module for the redesigned Mentorship page (#mentorship-content).

Renders:
1. Overview box ('On Mentorship') + Group Values + 4 Topline Stat Tiles
2. 2-Panel Visual Mentorship Dashboard:
   - Panel 1: Group Composition by Career Stage (Current vs. Alumni, using the vibrant
     stage color palette: Postdoc=Violet, Doctoral=Cyan, Master's=Blue, Undergrad=Gold,
     Secondary=Coral)
   - Panel 2: Undergraduate Research Pathways Breakdown (Senior Thesis & Independent Study,
     Summer Research Fellowships, and Academic-Year ROP / Work-Study / RA)
3. Current Group Members (15) in a 2-column responsive grid by stage
4. Former Mentees & Alumni (70) in a clearly separated section below, with Former
   Undergraduates (56) sub-grouped into 3 collapsible pathway sections.
"""
from pages_shared import (attr_esc, card_meta, chip, date_range, esc, listview_status,
                          parse_latest_year, period_end_key, strip_tags as _strip_tags)

# Stage key -> (filter cat key, display label, color suffix used for accent + badge)
_STAGES = [
    ("postdoctoral",    "postdoc",   "Postdoc",          "st-postdoc"),
    ("doctoral",        "doctoral",  "Doctoral",         "st-doctoral"),
    ("mastersProjects", "masters",   "Master's",         "st-masters"),
    ("bachelors",       "bachelors", "Undergraduate",    "st-bachelors"),
    ("secondary",       "secondary", "Secondary school", "st-secondary"),
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


def _classify_ug_pathway(rec):
    """Classify an undergraduate record into one of three primary groups based strictly on content.json tags:
    - 'thesis': Senior Thesis, Junior Thesis, or Research Course
    - 'summer': Summer Research Fellowships (A&A SURP, DSI SUDS, CITA SURF)
    - 'rop': A&S ROP, Co-op Program, or Independent / Visiting Research
    """
    courses_txt = " ".join(_strip_tags(c).lower() for c in (rec.get("courses") or []))
    progs_txt = " ".join(_strip_tags(p).lower() for p in (rec.get("programs") or []))
    if any(k in courses_txt for k in ("thesis", "research course")):
        return "thesis"
    if any(k in progs_txt for k in ("surp", "suds", "surf")):
        return "summer"
    return "rop"


_UG_PATHWAYS = [
    ("thesis", "Theses & Research Courses (Senior Thesis · Junior Thesis · Research Course)", "st-doctoral"),
    ("summer", "Summer Research Fellowships (A&A SURP · DSI SUDS · CITA SURF)", "st-bachelors"),
    ("rop",    "A&S ROP, Co-op & Independent Research", "st-masters"),
]


def _card(rec, cat, label, color, completed):
    name_html = rec.get("name") or ""          # already HTML (may contain <a>)
    name_plain = _strip_tags(name_html).strip()
    period = rec.get("timelinePeriod") or ""
    sup, proj = _supervision_and_project(rec)
    cosup = _cosupervisors(rec)
    current_status = rec.get("currentStatus") or ""
    outcome = rec.get("outcome") or ""
    career = rec.get("myCareerStage") or ""
    tag_vals = (list(rec.get("programs") or []) + list(rec.get("awards") or [])
                + list(rec.get("courses") or []) + [rec.get("institution") or "", outcome])

    search_src = " ".join(_strip_tags(x) for x in
                          (name_plain, sup, proj, current_status, outcome,
                           " ".join(cosup), " ".join(tag_vals)))
    data_search = attr_esc(search_src)
    data_title = attr_esc(name_plain)
    data_year = parse_latest_year(period)

    meta = esc(proj)

    subs = []
    if cosup:
        fmt_cosup = [
            re.sub(r"\(([^)]+)\)", r'<span class="cosup-affil">(\1)</span>', c)
            for c in cosup
        ]
        subs.append(f'<span class="md-label">Co-supervised with</span> {" · ".join(fmt_cosup)}')
    if not completed and current_status:
        subs.append(f'<span class="md-label">Role</span> {esc(current_status)}')
    elif completed and outcome:
        subs.append(f'<span class="md-label">Placement</span> {esc(outcome)}')
    subs_html = "".join(f'<p class="item-sub">{x}</p>' for x in subs)
    foot_html = f'<p class="item-foot">Supervised as: {esc(career)}</p>' if career else ""

    tags = []
    institution = rec.get("institution") or ""
    if institution:
        tags.append(f'<span class="badge tag-institution">{esc(institution)}</span>')
    for prog in (rec.get("programs") or []):
        tags.append(f'<span class="badge tag-program">{esc(prog)}</span>')
    for crs in (rec.get("courses") or []):
        tags.append(f'<span class="badge tag-course">{esc(crs)}</span>')
    for aw in (rec.get("awards") or []):
        tags.append(f'<span class="badge tag-award">{esc(aw)}</span>')
    tags_block = f'<div class="item-tags">{"".join(tags)}</div>' if tags else ""
    meta_html = f'<p class="item-meta">{meta}</p>' if meta else ""

    return (
        f'<article class="item mentee-card accent-{color}" data-lv-item '
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


def _mentorship_dashboard(mbs, completed):
    """2-panel visual dashboard:
    Panel 1: Group Composition by Career Stage (Current vs. Alumni)
    Panel 2: Undergraduate Research Pathways Breakdown (Thesis vs. Summer Fellowships vs. ROP/Work-Study)
    """
    # Panel 1: Career stages
    stats = []
    for stage_key, cat, label, color in _STAGES:
        cur = len(mbs.get(stage_key) or [])
        former = len(completed.get(stage_key) or [])
        stats.append((cat, color, cur, former, cur + former))
    max_total = max((t for *_, t in stats), default=1) or 1

    stage_rows = []
    for cat, color, cur, former, tot in stats:
        if tot == 0:
            continue
        seg_cur = (f'<span class="mc-seg mc-{color}" style="width:{cur / max_total * 100:.2f}%"></span>'
                   if cur else "")
        seg_for = (f'<span class="mc-seg mc-{color} mc-faded" style="width:{former / max_total * 100:.2f}%"></span>'
                   if former else "")
        title = f"{_CHIP_LABEL[cat]}: {cur} current, {former} alumni ({tot} total)"
        badge_cur = f'<span class="mc-cur-pill mc-pill-{color}">{cur} active</span>' if cur else ""
        stage_rows.append(
            '<div class="mc-row">'
            f'<span class="mc-label"><span class="dot d-{color}"></span>{esc(_CHIP_LABEL[cat])}</span>'
            f'<span class="mc-track" role="img" aria-label="{attr_esc(title)}" title="{attr_esc(title)}">'
            f'{seg_cur}{seg_for}</span>'
            f'<span class="mc-total">{badge_cur}<strong>{tot}</strong></span>'
            '</div>'
        )
    stage_legend = (
        '<div class="pf-leg" aria-hidden="true">'
        '<span class="pf-key"><i class="pf-kw mc-kw-current"></i>Current group (solid)</span>'
        '<span class="pf-key"><i class="pf-kw mc-kw-former"></i>Alumni (striped/faded)</span>'
        '</div>'
    )
    panel1 = (
        '<figure class="pub-fig mentor-chart">'
        '<figcaption class="pub-fig-head"><span class="t">Mentorship by career stage</span>'
        '<span class="m">active vs. alumni cohorts</span></figcaption>'
        f'<div class="mc-rows">{"".join(stage_rows)}</div>{stage_legend}'
        '</figure>'
    )

    # Panel 2: Undergraduate courses & programs breakdown from actual content.json tags
    all_ugs = list(mbs.get("bachelors") or []) + list(completed.get("bachelors") or [])

    def _has_course(u, kw):
        return any(kw in _strip_tags(c).lower() for c in (u.get("courses") or []))

    def _has_prog(u, kws):
        txt = " ".join(_strip_tags(p).lower() for p in (u.get("programs") or []))
        return any(k in txt for k in kws)

    n_summer = sum(1 for u in all_ugs if _has_prog(u, ("surp", "suds", "surf")))
    n_senior = sum(1 for u in all_ugs if _has_course(u, "senior thesis"))
    n_rc     = sum(1 for u in all_ugs if _has_course(u, "research course"))
    n_junior = sum(1 for u in all_ugs if _has_course(u, "junior thesis"))
    n_other  = sum(
        1 for u in all_ugs
        if _has_prog(u, ("rop", "co-op")) or (not u.get("courses") and not u.get("programs"))
    )

    ug_items = [
        ("SURP · SUDS · CITA SURF",                n_summer, "st-bachelors"),
        ("Senior Thesis",                           n_senior, "st-doctoral"),
        ("Research Course",                         n_rc,     "st-masters"),
        ("Junior Thesis",                           n_junior, "st-postdoc"),
        ("A&S ROP, Co-op & Visiting",               n_other,  "st-secondary"),
    ]
    max_ug = max((c for _, c, _ in ug_items), default=1) or 1
    ug_rows = []
    for short_lbl, cnt, color in ug_items:
        w = cnt / max_ug * 100
        title = f"{short_lbl}: {cnt} undergraduate researchers"
        ug_rows.append(
            '<div class="mc-row mc-row-ug">'
            f'<span class="mc-label"><span class="dot d-{color}"></span>{esc(short_lbl)}</span>'
            f'<span class="mc-track" role="img" aria-label="{attr_esc(title)}" title="{attr_esc(title)}">'
            f'<span class="mc-seg mc-{color}" style="width:{w:.2f}%"></span></span>'
            f'<span class="mc-total"><strong>{cnt}</strong></span>'
            '</div>'
        )
    ug_legend = (
        '<div class="pf-leg" aria-hidden="true">'
        f'<span class="pf-key">{len(all_ugs)} researchers (10 completed both a fellowship &amp; thesis/course)</span>'
        '</div>'
    )
    panel2 = (
        '<figure class="pub-fig mentor-chart">'
        '<figcaption class="pub-fig-head"><span class="t">Undergraduate pathways</span>'
        '<span class="m">by fellowship &amp; course</span></figcaption>'
        f'<div class="mc-rows">{"".join(ug_rows)}</div>{ug_legend}'
        '</figure>'
    )

    return f'<div class="pub-figures ment-figures">{panel1}{panel2}</div>'


def _stage_groups(source, completed_flag):
    """Render the per-stage card groups for one section (Current or Former).
    For Former Undergraduates (56 total), sub-groups them into the 3 training pathways
    inside collapsible <details> blocks so the page is scannable without endless scrolling."""
    groups = []
    for stage_key, cat, label, color in _STAGES:
        recs = source.get(stage_key) or []
        if not recs:
            continue
        recs = sorted(recs, key=lambda r: period_end_key(r.get("timelinePeriod")), reverse=True)

        if completed_flag and stage_key == "bachelors":
            # Sub-group former undergraduates by pathway
            by_path = {"thesis": [], "summer": [], "rop": []}
            for r in recs:
                by_path[_classify_ug_pathway(r)].append(r)
            sub_blocks = []
            for idx, (pkey, plabel, pcolor) in enumerate(_UG_PATHWAYS):
                precs = by_path[pkey]
                if not precs:
                    continue
                cards = "".join(_card(rec, cat, label, color, completed=True) for rec in precs)
                open_attr = " open" if idx == 0 else ""
                sub_blocks.append(
                    f'<details class="ug-pathway-details" data-lv-group{open_attr}>'
                    f'<summary class="ug-pathway-summary">'
                    f'<span class="ug-pathway-title"><span class="dot d-{pcolor}"></span>{esc(plabel)}</span>'
                    f'<span class="mentor-count" data-lv-count>{len(precs)}</span>'
                    f'</summary>'
                    f'<div class="mentee-grid">{cards}</div>'
                    f'</details>'
                )
            groups.append(
                '<div class="mentor-group mentor-group-ug">'
                f'<h3 class="mentor-group-head"><span class="dot d-{color}"></span>'
                f'{esc(_CHIP_LABEL[cat])} <span class="mentor-count">{len(recs)}</span>'
                '<span class="ug-hint">Organized by program pathway · click any category to expand/collapse</span></h3>'
                f'{"".join(sub_blocks)}'
                '</div>'
            )
        else:
            cards = "".join(_card(rec, cat, label, color, completed=completed_flag) for rec in recs)
            groups.append(
                '<div class="mentor-group" data-lv-group>'
                f'<h3 class="mentor-group-head"><span class="dot d-{color}"></span>'
                f'{esc(_CHIP_LABEL[cat])} <span class="mentor-count" data-lv-count>{len(recs)}</span></h3>'
                f'<div class="mentee-grid">{cards}</div>'
                '</div>'
            )
    return "".join(groups)


def generate_content(data):
    section = (data.get("sections") or {}).get("mentorship") or {}
    collab = (data.get("sections") or {}).get("collaboration") or {}
    mbs = section.get("menteesByStage") or {}
    completed = mbs.get("completed") or {}

    n_current = sum(len(mbs.get(sk) or []) for sk, _, _, _ in _STAGES)
    n_former = sum(len(completed.get(sk) or []) for sk, _, _, _ in _STAGES)
    total = n_current + n_former
    n_postdocs = len(mbs.get("postdoctoral") or []) + len(completed.get("postdoctoral") or [])
    n_grads = (len(mbs.get("doctoral") or []) + len(completed.get("doctoral") or [])
               + len(mbs.get("mastersProjects") or []) + len(completed.get("mastersProjects") or []))

    # ---- Overview: intro highlight + group values + stats + 2-panel dashboard ----
    prose = (section.get("introduction") or {}).get("content") or ""
    intro_box = (
        '<aside class="highlight-box">'
        '<div class="ment-intro-head"><h2>On Mentorship &amp; Group Culture</h2>'
        '<div class="ment-intro-links">'
        '<a class="btn-ghost" href="index.html#join">Joining the group &amp; fellowships →</a>'
        '</div></div>'
        f'<p>{esc(prose)}</p></aside>'
        if prose else ""
    )
    vals = collab.get("values") or {}
    val_accents = ["sla", "ic"]
    val_items = "".join(
        f'<article class="value-card vc-{val_accents[i % len(val_accents)]}">'
        f'<h3>{esc(v.get("title", ""))}</h3>'
        f'<p>{esc(v.get("content", ""))}</p></article>'
        for i, v in enumerate(vals.get("items") or [])
    )
    values_html = f'<div class="values-grid">{val_items}</div>' if val_items else ""

    stats = (
        '<div class="pub-stats ment-stats">'
        f'<div class="pub-stat role-tile-total"><span class="n">{total}</span><span class="l">Total mentees</span></div>'
        f'<div class="pub-stat role-tile-student"><span class="n">{n_current}</span><span class="l">Active group</span></div>'
        f'<div class="pub-stat role-tile-postdoc"><span class="n">{n_postdocs}</span><span class="l">Postdoctoral fellows</span></div>'
        f'<div class="pub-stat role-tile-significant"><span class="n">{n_grads}</span><span class="l">Graduate students</span></div>'
        f'<div class="pub-stat role-tile-primary"><span class="n">{n_former}</span><span class="l">Alumni</span></div>'
        '</div>'
    )
    top = (
        '<div class="container">'
        f'{intro_box}{values_html}{stats}{_mentorship_dashboard(mbs, completed)}'
        '</div>'
    )

    # ---- Current / Former sections (grouped by stage), inside the listview root ----
    sections_html = ""
    cur_groups = _stage_groups(mbs, completed_flag=False)
    if cur_groups:
        sections_html += (
            '<section class="mentor-block mentor-block-current" id="current-group" data-lv-section>'
            '<div class="mentor-sec-header">'
            '<h2 class="item-section-title">Current Group Members '
            f'<span class="mentor-sec-count" data-lv-seccount>{n_current}</span></h2>'
            '<span class="mentor-sec-sub">Active postdoctoral fellows, doctoral students, and undergraduate researchers</span>'
            '</div>'
            f'{cur_groups}</section>'
        )
    former_groups = _stage_groups(completed, completed_flag=True)
    if former_groups:
        sections_html += (
            '<section class="mentor-block mentor-block-former" id="alumni-group" data-lv-section>'
            '<div class="mentor-sec-header">'
            '<h2 class="item-section-title">Former Mentees &amp; Alumni '
            f'<span class="mentor-sec-count" data-lv-seccount>{n_former}</span></h2>'
            '<span class="mentor-sec-sub">Past group members and where they went next</span>'
            '</div>'
            f'{former_groups}</section>'
        )

    stage_chips = "".join(
        chip(cat, _CHIP_LABEL[cat],
             len(mbs.get(stage_key) or []) + len(completed.get(stage_key) or []), accent=color)
        for stage_key, cat, _label, color in _STAGES
        if (mbs.get(stage_key) or completed.get(stage_key))
    )
    status_chips = (chip("current", "Current group", n_current, accent="st-doctoral")
                    + chip("former", "Former / Alumni", n_former, accent="st-postdoc"))

    body = (
        '<div class="container" data-listview data-lv-batch="0">'
        '<div class="pub-controls">'
        '<input type="search" class="pub-search" data-lv-search '
        'placeholder="Search mentees by name, project, fellowship, or co-supervisor…" aria-label="Search mentees">'
        '<div class="pub-filters" data-lv-filters role="group" aria-label="Filter by career stage">'
        f'{chip("all", "All stages", total, active=True)}{stage_chips}</div>'
        '<div class="pub-filters" data-lv-filters role="group" aria-label="Filter by current or former">'
        f'{chip("all", "Current & alumni", total, active=True)}{status_chips}</div>'
        '</div>'
        f'{listview_status()}'
        f'{sections_html}'
        '<p class="pub-empty" data-lv-empty hidden>No mentees match your search or filters. '
        '<button type="button" class="linkbtn" data-lv-reset>Show all</button></p>'
        '</div>'
    )

    return top + body
