"""Pre-render module for the Teaching page (#teaching-content).

Exposes generate_content(data) -> str, returning the inner HTML for the
#teaching-content container. The interactive list of courses is built from
sections.teaching.courseHistory and wrapped with the generic listview scaffold
(search + department filter chips + sort) enhanced by assets/js/redesign/listview.js.
A static "Short courses & workshops" block is appended after the scaffold.

Per-item card contract is documented in pages_shared.py.
"""
import re

from pages_shared import scaffold, esc, attr_esc


def _strip_tags(s):
    """Remove any HTML tags from a string (for building data-search text)."""
    return re.sub(r"<[^>]+>", "", str(s or ""))


def _slug(s):
    """Lowercase, hyphenated, attribute-safe slug for data-cat / chip keys."""
    s = _strip_tags(s).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "other"


def _departments(course):
    """Return a list of department names for a course.

    Supports both 'department' (string) and 'departments' (list) keys.
    """
    if course.get("departments"):
        return [d for d in course["departments"] if d]
    dept = course.get("department")
    return [dept] if dept else []


def _latest_year(terms):
    """Parse the latest 4-digit year mentioned across a list of term strings.

    Handles ranges (e.g. "Full Year 2023-2024") and annotations
    (e.g. "Winter 2022 (partial)") by scanning for every 19xx/20xx token.
    """
    years = [int(y) for t in (terms or []) for y in re.findall(r"(?:19|20)\d{2}", str(t))]
    return max(years) if years else 0


def generate_content(data):
    """Build the inner HTML for #teaching-content."""
    teaching = (data or {}).get("sections", {}).get("teaching", {}) or {}
    courses = teaching.get("courseHistory", []) or []
    short_courses = teaching.get("shortCourses", []) or []

    # ---- Department filter chips (unique departments, counted) ----
    dept_order = []          # preserve first-seen order
    dept_counts = {}         # slug -> count
    dept_label = {}          # slug -> display label
    for course in courses:
        for dept in _departments(course):
            slug = _slug(dept)
            if slug not in dept_counts:
                dept_counts[slug] = 0
                dept_label[slug] = dept
                dept_order.append(slug)
            dept_counts[slug] += 1

    filters = [(slug, dept_label[slug], dept_counts[slug]) for slug in dept_order]

    # ---- Course cards ----
    cards = []
    for course in courses:
        code = course.get("code", "")
        title = course.get("title", "")
        level = course.get("level", "")
        description = course.get("description", "")
        terms = course.get("terms", []) or []
        depts = _departments(course)

        cat = " ".join(_slug(d) for d in depts) or "other"
        when = esc(" · ".join(terms))
        dept_display = " / ".join(depts)
        title_display = " · ".join(p for p in [code, title] if p)
        year = _latest_year(terms)

        search_src = " ".join([
            _strip_tags(code), _strip_tags(title), _strip_tags(level),
            _strip_tags(dept_display), _strip_tags(description),
            _strip_tags(" ".join(terms)),
        ])
        data_search = attr_esc(search_src)
        data_title = attr_esc(_strip_tags(title_display))

        meta_left = " · ".join(p for p in [esc(level), esc(dept_display)] if p)
        meta = meta_left
        if description:
            meta = f"{meta} — {esc(description)}" if meta else esc(description)

        tags = f'<span class="badge">{esc(level)}</span>' if level else ""

        cards.append(
            f'<article class="item accent-violet" data-lv-item '
            f'data-cat="{cat}" data-search="{data_search}" '
            f'data-year="{year}" data-num="{year}" data-title="{data_title}">'
            f'<div class="item-head">'
            f'<h3 class="item-title">{esc(title_display)}</h3>'
            f'<span class="item-when">{when}</span>'
            f'</div>'
            f'<p class="item-meta">{meta}</p>'
            f'<div class="item-tags">{tags}</div>'
            f'</article>'
        )

    items_html = "".join(cards)

    listview = scaffold(
        items_html,
        filters,
        total=len(courses),
        sorts=[("year", "Most recent"), ("az", "A–Z")],
        batch=0,
        search_ph="Search courses…",
        default_sort="year",
    )

    # ---- Static "Short courses & workshops" block ----
    sc_items = []
    for sc in short_courses:
        title = sc.get("title", "")
        program = sc.get("program", "")
        location = sc.get("location", "")
        terms = sc.get("terms", []) or []
        when = esc(" · ".join(terms))

        meta_parts = [p for p in [esc(program), esc(location)] if p]
        meta = " · ".join(meta_parts)

        sc_items.append(
            f'<article class="item accent-violet">'
            f'<div class="item-head">'
            f'<h3 class="item-title">{esc(title)}</h3>'
            f'<span class="item-when">{when}</span>'
            f'</div>'
            f'<p class="item-meta">{meta}</p>'
            f'<div class="item-tags"><span class="badge talk-badge">Workshop</span></div>'
            f'</article>'
        )

    short_block = (
        '<div class="container">'
        '<h2 class="item-section-title">Short courses &amp; workshops</h2>'
        f'<div class="pub-list">{"".join(sc_items)}</div>'
        '</div>'
    )

    # ---- Intro: teaching stats + philosophy ----
    ts = teaching.get("teachingStats") or {}
    # "Departments" intentionally omitted from the topline stats (still used for course filter chips).
    stat_defs = [(ts.get("uniqueCourses"), "Courses"), (ts.get("totalOfferings"), "Offerings"),
                 (ts.get("yearsTeaching"), "Years teaching")]
    tiles = "".join(
        f'<div class="pub-stat"><span class="n">{v}</span><span class="l">{esc(l)}</span></div>'
        for v, l in stat_defs if v is not None
    )
    stats_html = f'<div class="pub-stats">{tiles}</div>' if tiles else ""

    phil = teaching.get("philosophy") or {}
    phil_html = ""
    if phil.get("content"):
        phil_html = (
            f'<aside class="callout"><h3>{esc(phil.get("title", "Teaching Philosophy"))}</h3>'
            f'<p>{esc(phil["content"])}</p></aside>'
        )
    top_html = f'<div class="container">{stats_html}{phil_html}</div>' if (stats_html or phil_html) else ""

    return top_html + listview + short_block
