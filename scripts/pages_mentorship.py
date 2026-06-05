"""Pre-render module for the redesigned Mentorship page (#mentorship-content).

Renders an Overview (Total/Current/Former stats + a career-stage breakdown
chart), then mentees split into Current and Former sections, each grouped by
stage (postdoctoral / doctoral / mastersProjects / bachelors). A group-aware
search box (assets/js/redesign/mentorgroups.js) filters cards live and collapses
empty groups/sections.

Each stage maps to one of the four redesign category colors (postdoc->sla,
doctoral->ii, masters->ic, bachelors->du) used for the card accent, stage badge,
group-heading dot, and the breakdown chart bars.
"""
import re

from pages_shared import esc, attr_esc

# Stage key -> (filter cat key, display label, color suffix used for accent + badge)
_STAGES = [
    ("postdoctoral",    "postdoc",   "Postdoc",       "sla"),
    ("doctoral",        "doctoral",  "Doctoral",      "ii"),
    ("mastersProjects", "masters",   "Master's",      "ic"),
    ("bachelors",       "bachelors", "Undergraduate", "du"),
]

# Plain labels (singular/contextual) for the chips
_CHIP_LABEL = {
    "postdoc":   "Postdocs",
    "doctoral":  "Doctoral",
    "masters":   "Master's",
    "bachelors": "Undergrad",
}


def _strip_tags(s):
    """Remove HTML tags from a string (for plain-text search/sort keys)."""
    return re.sub(r"<[^>]+>", "", str(s or ""))


def _parse_year(period):
    """Pull the latest 4-digit year out of a timelinePeriod string, else 0."""
    years = re.findall(r"(19|20)\d{2}", str(period or ""))
    if not years:
        return 0
    # findall with the alternation group returns only the prefix; re-scan fully:
    full = re.findall(r"\b((?:19|20)\d{2})\b", str(period or ""))
    return max(int(y) for y in full) if full else 0


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
    tag_vals = list(rec.get("programs") or []) + list(rec.get("awards") or []) + list(rec.get("courses") or [])

    # data-* keys (plain text for search/sort) — include role + all tag text
    search_src = " ".join(_strip_tags(x) for x in
                          (name_plain, sup, proj, current_status, " ".join(cosup), " ".join(tag_vals)))
    data_search = attr_esc(search_src)
    data_title = attr_esc(name_plain)
    data_year = _parse_year(period)

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

    # tags: role (formal/informal) + stage + Alum + programs + course/thesis + awards
    # Supervisory role sits up on the title row (see below), not in the tag cluster.
    role_html = ""
    if sup:
        role_cls = "role-badge role-informal" if "informal" in sup.lower() else "role-badge"
        role_html = f'<span class="badge {role_cls}">{esc(sup)}</span>'
    tags = [f'<span class="badge b-{color}">{esc(label)}</span>']
    if completed:
        tags.append('<span class="tag feat">Alum</span>')
    # Three distinct, searchable tag families: programs, course/thesis context, awards.
    for prog in (rec.get("programs") or []):
        tags.append(f'<span class="badge tag-program">{esc(prog)}</span>')   # esc keeps links intact
    for crs in (rec.get("courses") or []):
        tags.append(f'<span class="badge tag-course">{esc(crs)}</span>')
    for aw in (rec.get("awards") or []):
        tags.append(f'<span class="badge tag-award">{esc(aw)}</span>')
    tags_html = "".join(tags)
    meta_html = f'<p class="item-meta">{meta}</p>' if meta else ""

    return (
        f'<article class="item accent-{color}" data-lv-item '
        f'data-cat="{cat}" data-search="{data_search}" data-year="{data_year}" '
        f'data-num="{data_year}" data-title="{data_title}">'
        '<div class="item-head">'
        f'<div class="item-headline"><h3 class="item-title">{name_html}</h3>{role_html}</div>'
        f'<span class="item-when">{esc(period)}</span>'
        '</div>'
        f'{meta_html}'
        f'{subs_html}'
        f'<div class="item-tags">{tags_html}</div>'
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

    legend = (
        '<div class="mc-legend" aria-hidden="true">'
        '<span class="mc-key">Current</span>'
        '<span class="mc-key mc-faded-key">Former</span>'
        '</div>'
    )
    return (
        '<figure class="mentor-chart">'
        '<figcaption class="mc-cap">Mentees by career stage</figcaption>'
        f'{legend}{"".join(rows)}'
        '</figure>'
    )


def _stage_groups(source, completed_flag):
    """Render the per-stage card groups for one section (Current or Former)."""
    groups = []
    for stage_key, cat, label, color in _STAGES:
        recs = source.get(stage_key) or []
        if not recs:
            continue
        cards = "".join(_card(rec, cat, label, color, completed=completed_flag) for rec in recs)
        groups.append(
            '<div class="mentor-group" data-mentor-group>'
            f'<h3 class="mentor-group-head"><span class="dot d-{color}"></span>'
            f'{esc(_CHIP_LABEL[cat])} <span class="mentor-count" data-mentor-count>{len(recs)}</span></h3>'
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
    intro_box = (f'<aside class="highlight-box"><h3>On Mentorship</h3><p>{esc(prose)}</p></aside>'
                 if prose else "")
    stats = (
        '<div class="pub-stats teach-stats">'
        f'<div class="pub-stat"><span class="n">{total}</span><span class="l">Total mentees</span></div>'
        f'<div class="pub-stat"><span class="n">{n_current}</span><span class="l">Current</span></div>'
        f'<div class="pub-stat"><span class="n">{n_former}</span><span class="l">Former</span></div>'
        '</div>'
    )
    top = (
        '<div class="container">'
        f'{intro_box}{stats}{_breakdown_chart(mbs, completed)}'
        '</div>'
    )

    # ---- Current / Former sections (grouped by stage) + group-aware search ----
    sections_html = ""
    cur_groups = _stage_groups(mbs, completed_flag=False)
    if cur_groups:
        sections_html += (
            '<section class="mentor-block" data-mentor-section>'
            '<h2 class="item-section-title">Current mentees '
            f'<span class="mentor-sec-count" data-mentor-seccount>{n_current}</span></h2>'
            f'{cur_groups}</section>'
        )
    former_groups = _stage_groups(completed, completed_flag=True)
    if former_groups:
        sections_html += (
            '<section class="mentor-block" data-mentor-section>'
            '<h2 class="item-section-title">Former mentees '
            f'<span class="mentor-sec-count" data-mentor-seccount>{n_former}</span></h2>'
            f'{former_groups}</section>'
        )

    body = (
        '<div class="container" data-mentor-root>'
        '<div class="pub-controls">'
        '<input type="search" class="pub-search" data-mentor-search '
        'placeholder="Search mentees by name, project, or co-supervisor…" aria-label="Search mentees">'
        '</div>'
        f'{sections_html}'
        '<p class="pub-empty" data-mentor-empty hidden>No mentees match your search. '
        '<button type="button" class="linkbtn" data-mentor-reset>Show all</button></p>'
        '</div>'
    )

    return top + body
