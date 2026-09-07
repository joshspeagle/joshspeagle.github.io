"""Pre-render module for the Teaching page (#teaching-content).

Exposes generate_content(data) -> str, returning the inner HTML for the
#teaching-content container. Formal courses (sections.teaching.courseHistory)
and short courses/workshops (sections.teaching.shortCourses) are rendered into
a single interactive listview wrapped by the generic scaffold (search + sort +
filter chips) enhanced by assets/js/redesign/listview.js. Chips are the course
departments (Astronomy/Statistics, color-coded) plus a "Workshops" chip; each
card's left stripe + badge dot is colored to match its chip.

Per-item card contract is documented in pages_shared.py.
"""
from pages_shared import (accent_class, all_years, attr_esc, esc, parse_latest_year,
                          scaffold, slug as _slug, strip_tags as _strip_tags,
                          term_month as _term_month, warn)


def _departments(course):
    """Return a list of department names for a course.

    Supports both 'department' (string) and 'departments' (list) keys.
    """
    if course.get("departments"):
        return [d for d in course["departments"] if d]
    dept = course.get("department")
    return [dept] if dept else []


def _sort_key(terms):
    """YYYYMM-style key so same-year items order by recency: latest year, with the
    month/season of the term(s) carrying that year. 0 if no year present."""
    terms = terms or []
    year = parse_latest_year(terms)
    if not year:
        return 0
    month = max((_term_month(t) for t in terms if str(year) in str(t)), default=0)
    return year * 100 + month


def _accent(accents, name, kind="department"):
    """Declared accent colour class for a department (or the workshops/joint keys)."""
    accent = accents.get(name)
    if not accent:
        warn(f"teaching {kind} {name!r} has no accent in sections.teaching.accents; "
             f"using a neutral stripe")
        return "mute"
    return accent_class(accent, f"teaching {kind} {name!r}")


def generate_content(data):
    """Build the inner HTML for #teaching-content."""
    teaching = (data or {}).get("sections", {}).get("teaching", {}) or {}
    accents = teaching.get("accents", {}) or {}
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

    filters = [(slug, dept_label[slug], dept_counts[slug], _accent(accents, dept_label[slug]))
               for slug in dept_order]
    if short_courses:
        filters.append(("workshops", "Workshops", len(short_courses),
                        _accent(accents, "workshops", "workshops chip")))

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
        year = parse_latest_year(terms)

        search_src = " ".join([
            _strip_tags(code), _strip_tags(title), _strip_tags(level),
            _strip_tags(dept_display), _strip_tags(description),
            _strip_tags(" ".join(terms)),
        ])
        data_search = attr_esc(search_src)
        data_title = attr_esc(_strip_tags(title_display))

        # Description carries the meta line; level + department(s) become badges.
        meta = esc(description) if description else ""

        level_badge = f'<span class="badge">{esc(level)}</span>' if level else ""
        dept_badges = "".join(
            f'<span class="badge talk-badge"><span class="dot d-{_accent(accents, d)}"></span>'
            f'{esc(d)}</span>'
            for d in depts
        )
        tags = level_badge + dept_badges
        # left stripe: the joint accent for multi-department courses, else the dept accent
        if len(depts) >= 2:
            accent = _accent(accents, "joint", "joint-course stripe")
        elif depts:
            accent = _accent(accents, depts[0])
        else:
            accent = "mute"

        cards.append(
            f'<article class="item accent-{accent}" data-lv-item '
            f'data-cat="{cat}" data-search="{data_search}" '
            f'data-year="{year}" data-num="{_sort_key(terms)}" data-title="{data_title}">'
            f'<div class="item-head">'
            f'<h3 class="item-title">{esc(title_display)}</h3>'
            f'<span class="item-when">{when}</span>'
            f'</div>'
            f'<p class="item-meta">{meta}</p>'
            f'<div class="item-tags">{tags}</div>'
            f'</article>'
        )

    # ---- Workshop / short-course cards (same unified listview, "workshops" chip) ----
    for sc in short_courses:
        title = sc.get("title", "")
        program = sc.get("program", "")
        location = sc.get("location", "")
        terms = sc.get("terms", []) or []
        when = esc(" · ".join(terms))
        year = parse_latest_year(terms)

        meta = " · ".join(p for p in [esc(program), esc(location)] if p)

        search_src = " ".join([
            _strip_tags(title), _strip_tags(program), _strip_tags(location),
            _strip_tags(" ".join(terms)), "workshop short course",
        ])
        data_search = attr_esc(search_src)
        data_title = attr_esc(_strip_tags(title))

        cards.append(
            f'<article class="item accent-{_accent(accents, "workshops")}" data-lv-item '
            f'data-cat="workshops" data-search="{data_search}" '
            f'data-year="{year}" data-num="{_sort_key(terms)}" data-title="{data_title}">'
            f'<div class="item-head">'
            f'<h3 class="item-title">{esc(title)}</h3>'
            f'<span class="item-when">{when}</span>'
            f'</div>'
            f'<p class="item-meta">{meta}</p>'
            f'<div class="item-tags"><span class="badge talk-badge">'
            f'<span class="dot d-{_accent(accents, "workshops")}"></span>Workshop</span></div>'
            f'</article>'
        )

    items_html = "".join(cards)

    listview = scaffold(
        items_html,
        filters,
        total=len(courses) + len(short_courses),
        sorts=[("year", "Most recent"), ("az", "A–Z")],
        batch=0,
        search_ph="Search courses & workshops…",
        default_sort="year",
    )

    # ---- Intro: teaching stats + philosophy ----
    # Auto-compute the topline stats from courseHistory. "Years active" counts every
    # distinct year taught — both ends of a range like "Full Year 2023-2024" (a span
    # understates gap years and reads 0 for a single year); departments drive the
    # chips, not a tile.
    _years = all_years(t for c in courses for t in (c.get("terms") or []))
    stat_defs = [
        (len(courses), "Courses"),
        (sum(len(c.get("terms") or []) for c in courses), "Offerings"),
        (len(_years), "Years active"),
    ]
    tiles = "".join(
        f'<div class="pub-stat"><span class="n">{v}</span><span class="l">{esc(l)}</span></div>'
        for v, l in stat_defs if v is not None
    )
    stats_html = f'<div class="pub-stats teach-stats">{tiles}</div>' if tiles else ""

    phil = teaching.get("philosophy") or {}
    phil_html = ""
    if phil.get("content"):
        phil_html = (
            f'<aside class="highlight-box"><h2>{esc(phil.get("title", "Teaching Philosophy"))}</h2>'
            f'<p>{esc(phil["content"])}</p></aside>'
        )
    top_html = f'<div class="container">{stats_html}{phil_html}</div>' if (stats_html or phil_html) else ""

    return top_html + listview
