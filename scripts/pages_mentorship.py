"""Pre-render module for the redesigned Mentorship page (#mentorship-content).

Flattens every mentee in sections.mentorship.menteesByStage (current + completed,
across postdoctoral / doctoral / mastersProjects / bachelors) into a single
interactive listview of .item cards, then wraps them with pages_shared.scaffold().

Each stage is mapped to one of the four redesign category colors for the item
accent and the stage badge (postdoc->sla, doctoral->ii, masters->ic,
bachelors->du). The filter-chip category keys are the stage keys themselves
(postdoc/doctoral/masters/bachelors) per the page contract.
"""
import re

from pages_shared import scaffold, esc, attr_esc

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
    program = rec.get("program") or ""

    # data-* keys (plain text for search/sort)
    search_src = " ".join(_strip_tags(x) for x in (name_plain, proj, current_status, " ".join(cosup)))
    data_search = attr_esc(search_src)
    data_title = attr_esc(name_plain)
    data_year = _parse_year(period)

    # meta line: supervision role · project / research interests
    if sup and proj:
        meta = f"<strong>{esc(sup)}</strong> · {esc(proj)}"
    elif sup:
        meta = f"<strong>{esc(sup)}</strong>"
    else:
        meta = esc(proj)

    # detail lines: co-supervisors, current status (current mentees only), my career stage
    subs = []
    if cosup:
        subs.append(f'<span class="md-label">Co-supervised with</span> {", ".join(cosup)}')
    # "Where they are now" shows only for current mentees; for former mentees it was
    # too hard to keep accurate, so the status/outcome line is intentionally omitted.
    if not completed and current_status:
        subs.append(current_status)
    if career:
        subs.append(f'<span class="faint">My career stage then: {esc(career)}</span>')
    subs_html = "".join(f'<p class="item-sub">{x}</p>' for x in subs)

    # tags: stage badge + Alum + program + each fellowship/scholarship
    tags = [f'<span class="badge b-{color}">{esc(label)}</span>']
    if completed:
        tags.append('<span class="tag feat">Alum</span>')
    if program:
        tags.append(f'<span class="badge talk-badge">{esc(program)}</span>')
    for a in (list(rec.get("fellowships") or []) + list(rec.get("scholarships") or [])):
        if a:
            tags.append(f'<span class="badge talk-badge">{a}</span>')   # award strings already HTML (<a>)
    tags_html = "".join(tags)

    return (
        f'<article class="item accent-{color}" data-lv-item '
        f'data-cat="{cat}" data-search="{data_search}" data-year="{data_year}" '
        f'data-num="{data_year}" data-title="{data_title}">'
        '<div class="item-head">'
        f'<h3 class="item-title">{name_html}</h3>'
        f'<span class="item-when">{esc(period)}</span>'
        '</div>'
        f'<p class="item-meta">{meta}</p>'
        f'{subs_html}'
        f'<div class="item-tags">{tags_html}</div>'
        '</article>'
    )


def generate_content(data):
    section = (data.get("sections") or {}).get("mentorship") or {}
    mbs = section.get("menteesByStage") or {}
    completed = mbs.get("completed") or {}

    items = []
    counts = {"postdoc": 0, "doctoral": 0, "masters": 0, "bachelors": 0}
    n_current = 0
    n_former = 0

    for stage_key, cat, label, color in _STAGES:
        # current
        for rec in (mbs.get(stage_key) or []):
            items.append(_card(rec, cat, label, color, completed=False))
            counts[cat] += 1
            n_current += 1
        # completed
        for rec in (completed.get(stage_key) or []):
            items.append(_card(rec, cat, label, color, completed=True))
            counts[cat] += 1
            n_former += 1

    items_html = "".join(items)
    total = len(items)

    filters = [(cat, _CHIP_LABEL[cat], counts[cat]) for _, cat, _, _ in _STAGES]

    prose = (section.get("introduction") or {}).get("content") or ""
    intro_box = f'<aside class="highlight-box"><p>{esc(prose)}</p></aside>' if prose else ""
    intro = (
        '<div class="container">'
        f'<p class="section-intro">{n_current} current and {n_former} former mentees '
        f"across postdocs, doctoral, master's, and undergraduates.</p>"
        f'{intro_box}'
        '</div>'
    )

    body = scaffold(
        items_html,
        filters,
        total,
        sorts=[("az", "Name A–Z")],
        batch=20,
        search_ph="Search mentees…",
        default_sort="default",
    )

    return intro + "\n" + body
