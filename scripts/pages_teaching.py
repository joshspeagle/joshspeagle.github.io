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


_MONTHS3 = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}
_SEASONS = {"winter": 1, "spring": 4, "summer": 6, "fall": 9, "autumn": 9}


def _term_month(term):
    """Representative month (1-12) for a term/date string; month names win over
    season words (winter/spring/summer/fall). 0 if nothing is recognized."""
    t = str(term or "").lower()
    for name, num in _MONTHS3.items():
        if name in t:
            return num
    for season, num in _SEASONS.items():
        if season in t:
            return num
    return 0


def _sort_key(terms):
    """YYYYMM-style key so same-year items order by recency: latest year, with the
    month/season of the term(s) carrying that year. 0 if no year present."""
    terms = terms or []
    year = _latest_year(terms)
    if not year:
        return 0
    month = max((_term_month(t) for t in terms if str(year) in str(t)), default=0)
    return year * 100 + month


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
    if short_courses:
        filters.append(("workshops", "Workshops", len(short_courses)))

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

        # Description carries the meta line; level + department(s) become badges.
        meta = esc(description) if description else ""

        level_badge = f'<span class="badge">{esc(level)}</span>' if level else ""
        dept_badges = "".join(
            f'<span class="badge talk-badge"><span class="dot d-{_slug(d)}"></span>{esc(d)}</span>'
            for d in depts
        )
        tags = level_badge + dept_badges
        # left stripe: split blue/purple for joint (multi-dept) courses, else dept color
        accent = "astrostat" if len(depts) >= 2 else (_slug(depts[0]) if depts else "violet")

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
        year = _latest_year(terms)

        meta = " · ".join(p for p in [esc(program), esc(location)] if p)

        search_src = " ".join([
            _strip_tags(title), _strip_tags(program), _strip_tags(location),
            _strip_tags(" ".join(terms)), "workshop short course",
        ])
        data_search = attr_esc(search_src)
        data_title = attr_esc(_strip_tags(title))

        cards.append(
            f'<article class="item accent-workshops" data-lv-item '
            f'data-cat="workshops" data-search="{data_search}" '
            f'data-year="{year}" data-num="{_sort_key(terms)}" data-title="{data_title}">'
            f'<div class="item-head">'
            f'<h3 class="item-title">{esc(title)}</h3>'
            f'<span class="item-when">{when}</span>'
            f'</div>'
            f'<p class="item-meta">{meta}</p>'
            f'<div class="item-tags"><span class="badge talk-badge">'
            f'<span class="dot d-workshops"></span>Workshop</span></div>'
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
    ts = teaching.get("teachingStats") or {}
    # "Departments" intentionally omitted from the topline stats (still used for course filter chips).
    stat_defs = [(ts.get("uniqueCourses"), "Courses"), (ts.get("totalOfferings"), "Offerings"),
                 (ts.get("yearsTeaching"), "Years teaching")]
    tiles = "".join(
        f'<div class="pub-stat"><span class="n">{v}</span><span class="l">{esc(l)}</span></div>'
        for v, l in stat_defs if v is not None
    )
    stats_html = f'<div class="pub-stats teach-stats">{tiles}</div>' if tiles else ""

    phil = teaching.get("philosophy") or {}
    phil_html = ""
    if phil.get("content"):
        phil_html = (
            f'<aside class="teach-philosophy"><h3>{esc(phil.get("title", "Teaching Philosophy"))}</h3>'
            f'<p>{esc(phil["content"])}</p></aside>'
        )
    top_html = f'<div class="container">{stats_html}{phil_html}</div>' if (stats_html or phil_html) else ""

    return top_html + listview
