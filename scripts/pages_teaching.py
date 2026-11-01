"""Pre-render module for the Teaching page (#teaching-content).

Exposes generate_content(data) -> str, returning the inner HTML for the
#teaching-content container:
  1. Topline Stat Tiles (U of T Courses, Semester Offerings, Summer Schools & Tutorials, Years Active)
  2. Teaching Philosophy lead box + link to docs/teaching_speagle.pdf + 3 Pillar Cards
     (Conceptual Mastery, Experiential Project-Based Workflows, Accessibility & Open Materials)
  3. Visual Course & Curriculum Timeline (2020-2026 across Astronomy, Statistics, Joint, and Summer Schools)
  4. Interactive Listview split into two distinct sections:
     - Section 1: University of Toronto Courses (Undergraduate & Graduate, with Academic Calendar & Repo links)
     - Section 2: Short Courses, Summer Schools & Tutorials
"""
import re
from pages_shared import (accent_class, all_years, attr_esc, card_meta, chip, date_range, esc,
                          listview_status, parse_latest_year, slug as _slug,
                          strip_tags as _strip_tags, term_month as _term_month, url_attr, warn)


_ACADEMIC_YEARS = ["2021–22", "2022–23", "2023–24", "2024–25", "2025–26", "2026–27"]


def _term_to_academic_year(term):
    """Map a course or workshop term string to (academic_year_label, session_label)."""
    s = str(term or "").strip()
    m_span = re.search(r"(\d{4})\s*[-–]\s*(\d{4})", s)
    if m_span:
        y1, y2 = int(m_span.group(1)), int(m_span.group(2))
        return f"{y1}–{str(y2)[-2:]}", "Full Year"
    yrs = all_years([s])
    if not yrs:
        return None, ""
    y = yrs[0]
    low = s.lower()
    if any(k in low for k in ("fall", "sep", "oct", "nov", "dec")):
        return f"{y}–{str(y + 1)[-2:]}", "Fall"
    if any(k in low for k in ("winter", "spring", "jan", "feb", "mar", "apr")):
        return f"{y - 1}–{str(y)[-2:]}", "Winter"
    # Summer sessions (May-Aug) belong to the academic year that began the preceding September
    return f"{y - 1}–{str(y)[-2:]}", "Summer"


def _link_html(rec, label="Academic Calendar"):
    """Outbound links for a course or workshop (Program / Calendar + Slides + optional GitHub repo)."""
    if not isinstance(rec, dict):
        return ""
    out = []
    prog_url = (rec.get("programUrl") or "").strip()
    if prog_url:
        out.append(f'<a class="reslink" href="{url_attr(prog_url)}" target="_blank" rel="noopener">Program ↗</a>')
    url = (rec.get("url") or "").strip()
    if url:
        lbl = rec.get("urlLabel") or ("Academic Calendar" if "calendar.utoronto.ca" in url else label)
        out.append(f'<a class="reslink" href="{url_attr(url)}" target="_blank" rel="noopener">{esc(lbl)} ↗</a>')
    repo_url = (rec.get("repoUrl") or "").strip()
    if repo_url:
        repo_lbl = rec.get("repoLabel") or "Course Repo (GitHub)"
        out.append(f'<a class="reslink" href="{url_attr(repo_url)}" target="_blank" rel="noopener">{esc(repo_lbl)} ↗</a>')
    return "".join(out)


def _departments(course):
    """Return a list of department names for a course."""
    if course.get("departments"):
        return [d for d in course["departments"] if d]
    dept = course.get("department")
    return [dept] if dept else []


def _sort_key(terms):
    """YYYYMM-style key so same-year items order by recency."""
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


def _teaching_matrix(courses, short_courses, accents):
    """Visual timeline matrix of courses and summer school offerings across academic years 2021–22 to 2025–26."""
    ay_list = _ACADEMIC_YEARS
    rows_html = []
    for c in courses:
        code = c.get("code", "")
        title = c.get("title", "")
        level = c.get("level", "")
        depts = _departments(c)
        if len(depts) >= 2:
            acc = "sla"
        elif depts and "stat" in depts[0].lower():
            acc = "ii"
        elif depts and "astro" in depts[0].lower():
            acc = "ic"
        else:
            acc = "mute"

        by_ay = {}
        for t in (c.get("terms") or []):
            ay, sess = _term_to_academic_year(t)
            if ay:
                by_ay[ay] = (sess, str(t))

        cells = []
        for ay in ay_list:
            if ay in by_ay:
                sess, raw_t = by_ay[ay]
                fy_cls = " tm-full-year" if sess == "Full Year" else ""
                cells.append(
                    f'<span class="tm-cell tm-on tm-{acc}{fy_cls}" '
                    f'title="{attr_esc(code + " · " + raw_t + " (" + ay + ")")}">'
                    f'<i class="tm-dot"></i><span class="tm-term-lbl">{esc(sess)}</span></span>'
                )
            else:
                cells.append('<span class="tm-cell"></span>')

        short_title = (title.replace("Module: ", "")
                       .replace("Introduction to ", "Intro to ")
                       .replace(" and Data Science", " & Data Sci."))
        rows_html.append(
            '<div class="tm-row">'
            f'<div class="tm-course"><span class="tm-course-main"><span class="dot d-{acc}"></span>'
            f'<strong>{esc(code)}</strong> <span class="tm-ctitle">{esc(short_title)}</span></span>'
            f'<span class="badge b-{acc} tm-lvl">{esc(level)}</span></div>'
            f'<div class="tm-cells">{"".join(cells)}</div>'
            '</div>'
        )

    # Aggregate row for Summer Schools & Tutorials by Academic Year (Sept-Aug)
    sc_ay = {}
    for sc in short_courses:
        for t in (sc.get("terms") or []):
            ay, _ = _term_to_academic_year(t)
            if ay in ay_list:
                sc_ay[ay] = sc_ay.get(ay, 0) + 1
    w_acc = "du"
    w_cells = "".join(
        f'<span class="tm-cell tm-on tm-{w_acc}" title="{sc_ay[ay]} workshop/summer-school session(s) in {ay}">'
        f'<b>{sc_ay[ay]}×</b></span>'
        if sc_ay.get(ay) else '<span class="tm-cell"></span>'
        for ay in ay_list
    )
    rows_html.append(
        '<div class="tm-row tm-row-workshops">'
        f'<div class="tm-course"><span class="tm-course-main"><span class="dot d-{w_acc}"></span>'
        f'<strong>Workshops &amp; Schools</strong> <span class="tm-ctitle">Summer schools &amp; tutorials</span></span>'
        f'<span class="badge b-{w_acc} tm-lvl">Intensive</span></div>'
        f'<div class="tm-cells">{w_cells}</div>'
        '</div>'
    )

    head_cells = "".join(f'<span class="tm-yr">{ay}</span>' for ay in ay_list)
    legend = (
        '<div class="pf-leg">'
        '<span class="pf-key"><i class="pf-kw seg-significant"></i>Astronomy &amp; Astrophysics</span>'
        '<span class="pf-key"><i class="pf-kw seg-student"></i>Statistical Sciences</span>'
        '<span class="pf-key"><i class="pf-kw seg-postdoc"></i>Joint Astrostatistics</span>'
        '<span class="pf-key"><i class="pf-kw seg-primary"></i>Summer Schools &amp; Tutorials</span>'
        '</div>'
    )
    return (
        '<figure class="pub-fig wide teach-matrix-fig">'
        '<figcaption class="pub-fig-head"><span class="t">Teaching &amp; curriculum timeline by academic year (2021–22 to 2026–27)</span>'
        '<span class="m">full-year (Y), fall (F) &amp; winter (W) courses plus summer schools</span></figcaption>'
        '<div class="tm-table">'
        f'<div class="tm-head"><span class="tm-course-hd">Course / Module</span><div class="tm-cells">{head_cells}</div></div>'
        f'{"".join(rows_html)}'
        '</div>'
        f'{legend}'
        '</figure>'
    )


def generate_content(data):
    """Build the inner HTML for #teaching-content."""
    teaching = (data or {}).get("sections", {}).get("teaching", {}) or {}
    accents = teaching.get("accents", {}) or {}
    courses = teaching.get("courseHistory", []) or []
    short_courses = teaching.get("shortCourses", []) or []

    # ---- Department filter chips ----
    dept_order = []
    dept_counts = {}
    dept_label = {}
    for course in courses:
        for dept in _departments(course):
            s = _slug(dept)
            if s not in dept_counts:
                dept_counts[s] = 0
                dept_label[s] = dept
                dept_order.append(s)
            dept_counts[s] += 1

    total_items = len(courses) + len(short_courses)
    chips_html = [chip("all", "All teaching", total_items, active=True)]
    for s in dept_order:
        chips_html.append(chip(s, dept_label[s], dept_counts[s], accent=_accent(accents, dept_label[s])))
    if short_courses:
        chips_html.append(chip("workshops", "Workshops & Summer Schools", len(short_courses),
                               accent=_accent(accents, "workshops", "workshops chip")))

    # ---- University Course cards ----
    course_cards = []
    for course in courses:
        code = course.get("code", "")
        title = course.get("title", "")
        level = course.get("level", "")
        description = course.get("description", "")
        terms = course.get("terms", []) or []
        depts = _departments(course)

        cat = " ".join(_slug(d) for d in depts) or "other"
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
        meta = esc(description) if description else ""

        if len(depts) >= 2:
            accent = _accent(accents, "joint", "joint-course stripe")
        elif depts:
            accent = _accent(accents, depts[0])
        else:
            accent = "mute"

        tags = f'<span class="badge b-{accent}">{esc(level)}</span>' if level else ""
        url = (course.get("url") or "").strip()
        title_html = (
            f'<a href="{url_attr(url)}" target="_blank" rel="noopener">{esc(title_display)}</a>'
            if url else esc(title_display)
        )

        course_cards.append(
            f'<article class="item accent-{accent}" data-lv-item '
            f'data-cat="{cat}" data-search="{data_search}" '
            f'data-year="{year}" data-num="{_sort_key(terms)}" data-title="{data_title}">'
            f'{card_meta(date_range(" · ".join(terms)), (dept_display, True))}'
            f'<div class="item-head">'
            f'<h3 class="item-title">{title_html}</h3>'
            f'</div>'
            f'<p class="item-meta">{meta}</p>'
            f'<div class="paper-badges"><div class="paper-tag-group">{tags}</div>'
            f'<div class="paper-links">{_link_html(course, "Course Page")}</div></div>'
            f'</article>'
        )

    # ---- Workshop / short-course cards ----
    workshop_cards = []
    w_accent = _accent(accents, "workshops")
    for sc in short_courses:
        title = sc.get("title", "")
        program = sc.get("program", "")
        program_abbr = sc.get("programAbbr", "")
        co_instructors = sc.get("coInstructors") or []
        location = sc.get("location", "")
        terms = sc.get("terms", []) or []
        year = parse_latest_year(terms)

        meta_parts = [
            f"<strong>{esc(program)}</strong>" if program else "",
            esc(location) if location else "",
        ]
        meta = " · ".join(p for p in meta_parts if p)

        co_names = " ".join(c.get("name", "") for c in co_instructors)
        search_src = " ".join([
            _strip_tags(title), _strip_tags(program), _strip_tags(program_abbr),
            _strip_tags(co_names), _strip_tags(location),
            _strip_tags(" ".join(terms)), "workshop short course summer school",
        ])
        data_search = attr_esc(search_src)
        data_title = attr_esc(_strip_tags(title))
        url = (sc.get("url") or "").strip()
        title_html = (
            f'<a href="{url_attr(url)}" target="_blank" rel="noopener">{esc(title)}</a>'
            if url else esc(title)
        )

        tag_pills = [
            f'<span class="badge b-{w_accent}">{len(terms)} session{"s" if len(terms) != 1 else ""}</span>'
        ]
        if program_abbr:
            tag_pills.append(f'<span class="tag tag-institution">{esc(program_abbr)}</span>')
        for c in co_instructors:
            cname = c.get("name", "")
            curl = (c.get("url") or "").strip()
            if cname:
                if curl:
                    tag_pills.append(
                        f'<span class="tag tag-program">with <a href="{url_attr(curl)}" '
                        f'target="_blank" rel="noopener">{esc(cname)}</a></span>'
                    )
                else:
                    tag_pills.append(f'<span class="tag tag-program">with {esc(cname)}</span>')

        workshop_cards.append(
            f'<article class="item accent-{w_accent}" data-lv-item '
            f'data-cat="workshops" data-search="{data_search}" '
            f'data-year="{year}" data-num="{_sort_key(terms)}" data-title="{data_title}">'
            f'{card_meta(date_range(" · ".join(terms)), ("Summer School / Tutorial", True))}'
            f'<div class="item-head">'
            f'<h3 class="item-title">{title_html}</h3>'
            f'</div>'
            f'<p class="item-meta">{meta}</p>'
            f'<div class="paper-badges"><div class="paper-tag-group">'
            f'{"".join(tag_pills)}</div>'
            f'<div class="paper-links">{_link_html(sc, "Program / Slides")}</div></div>'
            f'</article>'
        )

    # ---- Intro: teaching stats + 3-pillar philosophy + curriculum timeline ----
    active_ays = {
        _term_to_academic_year(t)[0]
        for c in courses for t in (c.get("terms") or [])
        if _term_to_academic_year(t)[0]
    }
    n_offerings = sum(len(c.get("terms") or []) for c in courses)
    n_sc_sessions = sum(len(sc.get("terms") or []) for sc in short_courses)
    stats_html = (
        '<div class="pub-stats teach-stats">'
        f'<div class="pub-stat role-tile-total"><span class="n">{len(courses)}</span><span class="l">University courses</span></div>'
        f'<div class="pub-stat role-tile-significant"><span class="n">{n_offerings}</span><span class="l">Course offerings</span></div>'
        f'<div class="pub-stat role-tile-primary"><span class="n">{len(short_courses)}</span><span class="l">Workshop series ({n_sc_sessions}x)</span></div>'
        f'<div class="pub-stat role-tile-student"><span class="n">{len(active_ays)}</span><span class="l">Academic years taught</span></div>'
        '</div>'
    )

    phil = teaching.get("philosophy") or {}
    phil_html = ""
    if phil.get("content"):
        pillars = phil.get("pillars", []) or []
        pillar_accents = ["ic", "du", "sla"]
        pillars_html = ""
        if pillars:
            p_cards = "".join(
                f'<article class="value-card vc-{pillar_accents[i % len(pillar_accents)]}">'
                f'<h3>{esc(p.get("title", ""))}</h3>'
                f'<p>{p.get("content", "")}</p></article>'
                for i, p in enumerate(pillars)
            )
            pillars_html = f'<div class="teach-pillars-grid">{p_cards}</div>'
        phil_html = (
            '<aside class="highlight-box teach-phil-box">'
            '<div class="ment-intro-head">'
            f'<h2>{esc(phil.get("title", "Teaching Philosophy"))}</h2>'
            '</div>'
            f'<p>{phil["content"]}</p>'
            '</aside>'
            f'{pillars_html}'
        )

    matrix_html = _teaching_matrix(courses, short_courses, accents)
    workshops_intro = (teaching.get("workshops") or {}).get("content", "")

    body_html = (
        '<div class="container">'
        f'{stats_html}{phil_html}{matrix_html}'
        '<div data-listview data-lv-batch="0">'
        '<div class="pub-controls">'
        '<input type="search" class="pub-search" data-lv-search '
        'placeholder="Search courses, course codes, workshops, or topics…" aria-label="Search courses and workshops">'
        f'<div class="pub-filters" data-lv-filters role="group" aria-label="Filter by department or format">'
        f'{"".join(chips_html)}</div>'
        '</div>'
        f'{listview_status()}'
        '<section class="mentor-block teach-section" data-lv-section data-lv-group>'
        '<div class="mentor-sec-header">'
        '<h2 class="item-section-title">University of Toronto Courses '
        f'<span class="mentor-sec-count" data-lv-count>{len(courses)}</span></h2>'
        '<span class="mentor-sec-sub">Undergraduate and graduate courses in Astronomy &amp; Astrophysics and Statistical Sciences</span>'
        '</div>'
        f'<div class="mentee-grid">{"".join(course_cards)}</div>'
        '</section>'
        '<section class="mentor-block teach-section" data-lv-section data-lv-group>'
        '<div class="mentor-sec-header">'
        '<h2 class="item-section-title">Short Courses, Summer Schools &amp; Tutorials '
        f'<span class="mentor-sec-count" data-lv-count>{len(short_courses)}</span></h2>'
        f'<p class="section-intro teach-ws-intro">{workshops_intro}</p>'
        '</div>'
        f'<div class="mentee-grid">{"".join(workshop_cards)}</div>'
        '</section>'
        '<p class="pub-empty" data-lv-empty hidden>No courses or workshops match your search or filters. '
        '<button type="button" class="linkbtn" data-lv-reset>Show all</button></p>'
        '</div>'
        '</div>'
    )

    return body_html
