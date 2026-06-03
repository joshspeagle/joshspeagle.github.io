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


def _card(rec, cat, label, color, completed):
    name_html = rec.get("name") or ""          # already HTML (may contain <a>)
    name_plain = _strip_tags(name_html).strip()
    period = rec.get("timelinePeriod") or ""
    sup, proj = _supervision_and_project(rec)

    # data-* keys
    search_src = (name_plain + " " + _strip_tags(proj)).strip()
    data_search = attr_esc(search_src)
    data_title = attr_esc(name_plain)
    data_year = _parse_year(period)

    # meta line: "{supervisionType} — {project}"
    if sup and proj:
        meta = f"{esc(sup)} — {esc(proj)}"
    else:
        meta = esc(sup or proj or "")

    # tags: stage badge + Alum (if completed) + each fellowship/scholarship as a badge
    tags = [f'<span class="badge b-{color}">{esc(label)}</span>']
    if completed:
        tags.append('<span class="tag feat">Alum</span>')
    awards = list(rec.get("fellowships") or []) + list(rec.get("scholarships") or [])
    for a in awards:
        if a:
            tags.append(f'<span class="badge">{a}</span>')   # award strings already HTML (<a>)
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

    intro = (
        f'<div class="container"><p class="section-intro">'
        f'{n_current} current and {n_former} former mentees across postdocs, '
        f"doctoral, master's, and undergraduates.</p></div>"
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
