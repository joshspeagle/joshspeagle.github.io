"""Redesigned content generator for the Service page (#service-content).

Renders:
  1. Topline Stat Tiles (Leadership & Committee Roles, Professional Societies,
     Conferences & Workshops, Journals Refereed)
  2. Community Leadership, Governance & EDI intro box with direct links to
     SSC Data Science & Analytics, MScAC Data Science, SURP, and STATSTRO
  3. Visual Leadership & Governance Timeline by Academic Year (2020–21 to 2026–27)
     with role-delineating underbraces, stacked conference bars, and expandable
     multi-role rows
  4. Interactive Listview grouped into 3 clearly headed sections:
     - Professional Societies (SSC, AAS, ASA, LSST ISSC, CASCA)
     - University of Toronto Governance (Statistical Sciences & Astronomy & Astrophysics)
     - Workshops & Conferences (STATSTRO, CASCA AGM, Globular Clusters)
"""
from pages_shared import (accent_class, attr_esc, card_meta, chip, date_range,
                          esc, listview_status, period_end_year, slug as _slug,
                          strip_tags as _strip_tags, url_attr, warn)


_ACADEMIC_YEARS = ["2020–21", "2021–22", "2022–23", "2023–24", "2024–25", "2025–26", "2026–27"]


def _period_text(pos):
    """Joined period string for a position dict ('' if none)."""
    if not isinstance(pos, dict):
        return ""
    if isinstance(pos.get("periods"), list):
        return ", ".join(str(p).strip() for p in pos["periods"] if str(p).strip())
    return str(pos.get("term") or pos.get("period") or "").strip()


def _organizations(category):
    """Return the list of organization dicts for a category (empty if none)."""
    orgs = category.get("organizations")
    return orgs if isinstance(orgs, list) else []


def _render_track(acc, spans, stacks=None):
    """Render a 7-column academic-year grid track with Row 1 year cells/stacks and Row 2 underbraces.

    Args:
      acc: Accent key ('sla', 'ii', 'du').
      spans: List of (c_start, c_end, brace_label, is_lead, tooltip) with 0-based indices into _ACADEMIC_YEARS.
      stacks: Optional dict mapping col_index -> list of (bar_label, is_lead, tooltip) for stacked bars.
    """
    stacks = stacks or {}
    col_info = {}
    for c0, c1, lbl, is_lead, tip in spans:
        for c in range(c0, c1 + 1):
            col_info[c] = (is_lead, tip or f"{lbl} ({_ACADEMIC_YEARS[c]})")

    cells_html = []
    for c, ay in enumerate(_ACADEMIC_YEARS):
        gcol = c + 1
        if c in stacks:
            bars = []
            for blbl, blead, btip in stacks[c]:
                lcls = " tm-full-year" if blead else ""
                bars.append(
                    f'<span class="srv-stack-bar tm-on tm-{acc}{lcls}" title="{attr_esc(btip)}">'
                    f'<i class="tm-dot"></i><span class="srv-stack-lbl">{esc(blbl)}</span></span>'
                )
            cells_html.append(
                f'<div class="tm-cell-stack" style="grid-column:{gcol};grid-row:1">{"".join(bars)}</div>'
            )
        elif c in col_info:
            is_lead, tip = col_info[c]
            lcls = " tm-full-year" if is_lead else ""
            cells_html.append(
                f'<span class="tm-cell tm-on tm-{acc}{lcls}" style="grid-column:{gcol};grid-row:1" '
                f'title="{attr_esc(tip)}"><i class="tm-dot"></i></span>'
            )
        else:
            cells_html.append(
                f'<span class="tm-cell" style="grid-column:{gcol};grid-row:1"></span>'
            )

    braces_html = []
    for c0, c1, lbl, is_lead, tip in spans:
        lcls = " is-lead" if is_lead else ""
        braces_html.append(
            f'<div class="srv-brace tm-{acc}{lcls}" style="grid-column:{c0 + 1}/{c1 + 2};grid-row:2" '
            f'title="{attr_esc(tip)}">'
            f'<span class="srv-brace-line" aria-hidden="true"></span>'
            f'<span class="srv-brace-lbl">{esc(lbl)}</span>'
            f'</div>'
        )

    return f'<div class="tm-cells srv-track">{"".join(cells_html)}{"".join(braces_html)}</div>'


def _render_row(org, sub, badge_txt, acc, spans, stacks=None, expand_id=None, parent_id=None):
    """Render a primary or expandable sub-row in the service timeline."""
    track = _render_track(acc, spans, stacks=stacks)
    if expand_id:
        badge_el = (
            f'<button type="button" class="badge b-{acc} tm-lvl srv-expand-btn" '
            f'data-tm-expand="{attr_esc(expand_id)}" aria-expanded="false">'
            f'{esc(badge_txt)} <span class="srv-exp-caret" aria-hidden="true">▾</span></button>'
        )
    else:
        badge_el = f'<span class="badge b-{acc} tm-lvl">{esc(badge_txt)}</span>' if badge_txt else ""

    sub_cls = " srv-subrow is-hidden" if parent_id else ""
    sub_attr = f' data-tm-sub="{attr_esc(parent_id)}"' if parent_id else ""
    prefix = '<span class="srv-sub-Indent" aria-hidden="true">↳</span>' if parent_id else f'<span class="dot d-{acc}"></span>'

    return (
        f'<div class="tm-row srv-row{sub_cls}"{sub_attr}>'
        f'<div class="tm-course">'
        f'<div class="srv-org-wrap">{prefix}'
        f'<div class="srv-org-text"><strong>{esc(org)}</strong>'
        f'<span class="srv-org-sub">{esc(sub)}</span></div></div>'
        f'{badge_el}</div>'
        f'{track}'
        f'</div>'
    )


def _service_timeline():
    """Visual academic-year governance timeline (2020–21 to 2026–27) with underbraces and stacked event bars."""
    groups = [
        (
            "Professional Societies",
            "sla",
            [
                _render_row(
                    "SSC Data Science & Analytics",
                    "Statistical Society of Canada",
                    "Executive",
                    "sla",
                    [
                        (4, 4, "Pres.-Elect", False, "SSC Data Science & Analytics: President-Elect (2024–25)"),
                        (5, 5, "President", True, "SSC Data Science & Analytics: President (2025–26)"),
                        (6, 6, "Past Pres.", False, "SSC Data Science & Analytics: Past President (2026–27)"),
                    ],
                ),
                _render_row(
                    "AAS Working Group (WGAA)",
                    "Astroinformatics & Astrostatistics",
                    "2 Terms",
                    "sla",
                    [
                        (0, 2, "Steering Committee · Term 1", False, "AAS WGAA: Steering Committee (3-year Term 1, 2020–23)"),
                        (3, 5, "Steering Committee · Term 2", False, "AAS WGAA: Steering Committee (3-year Term 2, 2023–26)"),
                    ],
                ),
                _render_row(
                    "ASA Astrostatistics (AIG)",
                    "American Statistical Association",
                    "Officer",
                    "sla",
                    [
                        (0, 2, "Web Director", False, "ASA AIG: Web Director (2020–23)"),
                        (3, 3, "Interim Chair", True, "ASA AIG: Program Chair (Interim, 2023–24)"),
                    ],
                ),
                _render_row(
                    "CASCA & LSST ISSC",
                    "Postdoc & Publication Committees",
                    "2 roles",
                    "sla",
                    [
                        (0, 2, "CASCA Postdoc Comm.", False, "CASCA: Postdoc Committee Member (2020–23)"),
                        (3, 3, "LSST Pub. Chair", True, "LSST ISSC: Publication Committee Chair (2023–24)"),
                    ],
                    expand_id="soc-comm",
                ),
                _render_row(
                    "CASCA Postdoc Committee",
                    "Canadian Astronomical Society",
                    "Member",
                    "sla",
                    [(0, 2, "Committee Member", False, "CASCA Postdoc Committee (2020–23)")],
                    parent_id="soc-comm",
                ),
                _render_row(
                    "LSST ISSC Publication Committee",
                    "Rubin / LSST Science Collaboration",
                    "Chair",
                    "sla",
                    [(3, 3, "Committee Chair", True, "LSST ISSC Publication Committee Chair (2023–24)")],
                    parent_id="soc-comm",
                ),
            ],
        ),
        (
            "University of Toronto Governance",
            "ii",
            [
                _render_row(
                    "U of T MScAC Data Science",
                    "Statistical Sciences & Computer Science",
                    "Director",
                    "ii",
                    [(6, 6, "Interim Director", True, "U of T MScAC Data Science Concentration: Interim Director (2026–27)")],
                ),
                _render_row(
                    "U of T Astronomy SURP",
                    "Summer Undergraduate Research Program",
                    "Chair & Member",
                    "ii",
                    [
                        (1, 1, "Member", False, "Astronomy & Astrophysics SURP Committee: Member (2021–22)"),
                        (2, 3, "Committee Chair", True, "Astronomy & Astrophysics SURP Committee: Chair (2022–24)"),
                        (5, 6, "Member", False, "Astronomy & Astrophysics SURP Committee: Member (2025–27)"),
                    ],
                ),
                _render_row(
                    "U of T Statistical Sciences",
                    "Department of Statistical Sciences",
                    "Admissions",
                    "ii",
                    [(2, 6, "Graduate Admissions Committee", False, "Statistical Sciences: Graduate Admissions Committee (2022–27)")],
                ),
                _render_row(
                    "U of T Astronomy Committees",
                    "Curriculum, Mentoring & Admissions",
                    "3 roles",
                    "ii",
                    [
                        (0, 0, "Grad Adm.", False, "Astronomy & Astrophysics: Graduate Admissions Committee (2020–21)"),
                        (1, 2, "Training & Mentoring Co-Chair", True, "Astronomy & Astrophysics: Training & Mentoring Co-Chair (2021–23)"),
                        (3, 3, "UG Curric.", False, "Astronomy & Astrophysics: Undergraduate Curriculum Committee (2023–24)"),
                        (5, 6, "UG Curriculum", False, "Astronomy & Astrophysics: Undergraduate Curriculum Committee (2025–27)"),
                    ],
                    expand_id="ut-astro",
                ),
                _render_row(
                    "Training & Mentoring Committee",
                    "Department of Astronomy & Astrophysics",
                    "Co-Chair",
                    "ii",
                    [(1, 2, "Committee Co-Chair", True, "Training & Mentoring Committee Co-Chair (2021–23)")],
                    parent_id="ut-astro",
                ),
                _render_row(
                    "Undergraduate Curriculum Committee",
                    "Department of Astronomy & Astrophysics",
                    "Member",
                    "ii",
                    [
                        (3, 3, "Member", False, "Undergraduate Curriculum Committee (2023–24)"),
                        (5, 6, "Member", False, "Undergraduate Curriculum Committee (2025–27)"),
                    ],
                    parent_id="ut-astro",
                ),
                _render_row(
                    "Graduate Admissions Committee",
                    "Department of Astronomy & Astrophysics",
                    "Member",
                    "ii",
                    [(0, 0, "Committee Member", False, "Graduate Admissions Committee (2020–21)")],
                    parent_id="ut-astro",
                ),
            ],
        ),
        (
            "Workshops & Conferences",
            "du",
            [
                _render_row(
                    "STATSTRO Workshop",
                    "Annual U of T Astrostatistics Workshop",
                    "Annual",
                    "du",
                    [
                        (1, 3, "Stellar Stats · Co-Founder", True, "Stellar Stats Workshop: Co-Founder & Co-Organizer (2021–24)"),
                        (4, 6, "STATSTRO · Co-Organizer", True, "STATSTRO Workshop: Co-Founder & Co-Organizer (2024–27)"),
                    ],
                ),
                _render_row(
                    "Conferences & Symposia",
                    "Scientific & Local Organizing Committees",
                    "2 conf.",
                    "du",
                    [(3, 3, "2× SOC / LOC Co-Chair", True, "2023–24: CASCA AGM & Globular Clusters (SOC/LOC Co-Chair)")],
                    stacks={
                        3: [
                            ("CASCA AGM", True, "CASCA Annual General Meeting (2024): SOC Co-Chair & LOC Member"),
                            ("Clusters", True, "Globular Clusters & Their Tidal Tails (2024): SOC Co-Chair & LOC Co-Chair"),
                        ]
                    },
                    expand_id="conf-org",
                ),
                _render_row(
                    "CASCA Annual General Meeting",
                    "Canadian Astronomical Society (2024)",
                    "SOC / LOC",
                    "du",
                    [(3, 3, "SOC Co-Chair · LOC", True, "CASCA Annual General Meeting (2024): SOC Co-Chair & LOC Member")],
                    parent_id="conf-org",
                ),
                _render_row(
                    "Globular Clusters & Their Tidal Tails",
                    "International Symposium (2024)",
                    "SOC / LOC",
                    "du",
                    [(3, 3, "SOC & LOC Co-Chair", True, "Globular Clusters & Their Tidal Tails (2024): SOC & LOC Co-Chair")],
                    parent_id="conf-org",
                ),
            ],
        ),
    ]

    group_blocks = []
    for gtitle, gacc, grows in groups:
        group_blocks.append(
            f'<div class="srv-group-hd"><span class="dot d-{gacc}"></span><span>{esc(gtitle)}</span></div>'
            + "".join(grows)
        )

    head_cells = "".join(f'<span class="tm-yr">{ay}</span>' for ay in _ACADEMIC_YEARS)
    legend = (
        '<div class="pf-leg">'
        '<span class="pf-key"><i class="pf-kw seg-postdoc"></i>Professional Societies</span>'
        '<span class="pf-key"><i class="pf-kw seg-student"></i>University of Toronto Governance</span>'
        '<span class="pf-key"><i class="pf-kw seg-primary"></i>Workshops &amp; Conferences</span>'
        '<span class="pf-key"><i class="tm-dot" style="background:var(--text)"></i>Chair / President / Co-Chair term</span>'
        '</div>'
    )
    return (
        '<figure class="pub-fig wide teach-matrix-fig srv-matrix-fig">'
        '<figcaption class="pub-fig-head"><span class="t">Leadership &amp; governance timeline by academic year (2020–21 to 2026–27)</span>'
        '<span class="m">role transitions, multi-year terms &amp; stacked conference organization (click ▾ badges to expand)</span></figcaption>'
        '<div class="tm-table srv-table">'
        f'<div class="tm-head"><span class="tm-course-hd">Organization &amp; Scope</span><div class="tm-cells srv-head-cells">{head_cells}</div></div>'
        f'{"".join(group_blocks)}'
        '</div>'
        f'{legend}'
        '</figure>'
    )


def generate_content(data):
    section = (data.get("sections", {}) or {}).get("service", {}) or {}
    categories = section.get("categories", []) or []

    grouped_sections = []
    chips_html = []
    total = 0
    n_societies = 0
    n_conferences = 0
    n_referee = 0

    for category in categories:
        if category.get("hidden"):
            if "referee" in (category.get("title") or "").lower():
                n_referee = len(category.get("items") or [])
            continue
        cat_title = category.get("title", "") or ""
        cat_slug = _slug(cat_title)
        accent = category.get("accent")
        if not accent:
            warn(f"service category {cat_title!r} has no declared accent; "
                 f"using a neutral stripe")
            accent = "mute"
        accent = accent_class(accent, f"service category {cat_title!r}")
        orgs = [o for o in _organizations(category) if not (isinstance(o, dict) and o.get("hidden"))]
        extra = [it for it in (category.get("items") or []) if not (isinstance(it, dict) and it.get("hidden"))]

        if "societ" in cat_title.lower():
            n_societies = len(orgs)

        cards = []   # (title, byline, period, note, url, tags)
        for org in orgs:
            org_name = (org.get("name", "") or "").strip()
            for pos in (org.get("positions") or []):
                if isinstance(pos, str):
                    cards.append((pos.strip(), org_name, "", "", "", []))
                    continue
                role = (pos.get("role") or "").strip()
                period = _period_text(pos)
                note = (pos.get("note") or "").strip()
                tags = pos.get("tags") or []
                if pos.get("title"):
                    title = pos["title"].strip()
                    byline = " · ".join(x for x in (role, org_name) if x)
                else:
                    title, byline = role, org_name
                cards.append((title, byline, period, note, (pos.get("url") or "").strip(), tags))
        for it in extra:
            cards.append(((it.get("organization", "") or "").strip(),
                          (it.get("role") or "").strip(),
                          (it.get("period") or it.get("term") or "").strip(),
                          (it.get("note") or "").strip(),
                          (it.get("url") or "").strip(),
                          it.get("tags") or []))

        if not cards:
            continue
        if "workshop" in cat_title.lower() or "conference" in cat_title.lower():
            n_conferences = len(cards)

        chips_html.append((cat_slug, cat_title, len(cards), accent))

        card_els = []
        for title, byline, period, note, url, tags in cards:
            search_src = " ".join(_strip_tags(x) for x in (title, byline, period, note, cat_title, " ".join(tags))).strip()
            year = period_end_year(period)
            meta_html = f'<p class="item-meta"><strong>{esc(byline)}</strong></p>' if byline else ""
            note_html = f'<p class="item-sub">{esc(note)}</p>' if note else ""
            link_html = (f'<div class="paper-links"><a class="reslink" href="{url_attr(url)}" '
                         f'target="_blank" rel="noopener">Website ↗</a></div>') if url else ""
            title_html = (
                f'<a href="{url_attr(url)}" target="_blank" rel="noopener">{esc(title)}</a>'
                if url and "<a " not in title else esc(title)
            )
            is_ongoing = "present" in period.lower() or "2026-2027" in period
            tag_spans = []
            if is_ongoing:
                tag_spans.append('<span class="badge b-ic">Active</span>')
            for t in tags:
                tag_spans.append(f'<span class="tag">{esc(t)}</span>')
            if not tag_spans:
                tag_spans.append(f'<span class="badge b-{accent}">{esc(cat_title)}</span>')

            card_els.append(
                f'<article class="item accent-{accent}" data-lv-item '
                f'data-cat="{attr_esc(cat_slug)}" '
                f'data-search="{attr_esc(search_src)}" '
                f'data-year="{year}" data-num="{year}" '
                f'data-title="{attr_esc(_strip_tags(title))}">'
                f'{card_meta(date_range(period), (cat_title, True))}'
                f'<div class="item-head"><h3 class="item-title">{title_html}</h3></div>'
                f'{meta_html}{note_html}'
                f'<div class="paper-badges"><div class="paper-tag-group">{"".join(tag_spans)}</div>{link_html}</div>'
                f'</article>'
            )
            total += 1

        grouped_sections.append(
            f'<section class="mentor-block service-section" data-lv-section data-lv-group>'
            f'<div class="mentor-sec-header">'
            f'<h2 class="item-section-title"><span class="dot d-{accent}"></span>{esc(cat_title)} '
            f'<span class="mentor-sec-count" data-lv-count>{len(cards)}</span></h2>'
            f'</div>'
            f'<div class="mentee-grid">{"".join(card_els)}</div>'
            f'</section>'
        )

    all_chips = [chip("all", "All service", total, active=True)] + [
        chip(cslug, ctitle, ccount, accent=cacc) for cslug, ctitle, ccount, cacc in chips_html
    ]

    stats_html = (
        '<div class="pub-stats service-stats">'
        f'<div class="pub-stat role-tile-total"><span class="n">{total}</span><span class="l">Committees &amp; leadership roles</span></div>'
        f'<div class="pub-stat role-tile-postdoc"><span class="n">{n_societies}</span><span class="l">Professional societies</span></div>'
        f'<div class="pub-stat role-tile-primary"><span class="n">{n_conferences}</span><span class="l">Conferences &amp; workshops</span></div>'
        f'<div class="pub-stat role-tile-student"><span class="n">{n_referee or 8}</span><span class="l">Journals refereed</span></div>'
        '</div>'
    )

    intro_box = (
        '<aside class="highlight-box">'
        '<div class="ment-intro-head">'
        '<h2>Community Leadership, Governance &amp; EDI</h2>'
        '<div class="ment-intro-links">'
        '<a class="reslink" href="https://statstro.com/" target="_blank" rel="noopener">STATSTRO Workshop ↗</a>'
        '</div></div>'
        '<p>Much of my academic service focuses on building cross-disciplinary bridges between astronomy, '
        'statistics, and data science, including serving as President of the '
        '<a href="https://ssc.ca/en/about/sections-regions/data-science-and-analytics" target="_blank" rel="noopener">'
        'SSC Data Science &amp; Analytics Section</a> (2025–2026), Interim Director of the '
        '<a href="https://mscac.utoronto.ca/concentrations/ds/" target="_blank" rel="noopener">'
        'U of T MScAC Data Science Concentration</a> (2026–2027), Chair and committee member of the '
        '<a href="https://www.astro.utoronto.ca/academics/undergraduate-studies/surp-2/" target="_blank" rel="noopener">'
        'Astronomy &amp; Astrophysics SURP</a>, and co-organizing the annual '
        '<a href="https://statstro.com/" target="_blank" rel="noopener">STATSTRO Workshop</a>.</p>'
        '</aside>'
    )

    timeline_html = _service_timeline()

    return (
        '<div class="container">'
        f'{stats_html}{intro_box}{timeline_html}'
        '<div data-listview data-lv-batch="0">'
        '<div class="pub-controls">'
        '<input type="search" class="pub-search" data-lv-search '
        'placeholder="Search committees, societies, conferences, or roles…" aria-label="Search service">'
        f'<div class="pub-filters" data-lv-filters role="group" aria-label="Filter by category">'
        f'{"".join(all_chips)}</div>'
        '</div>'
        f'{listview_status()}'
        f'{"".join(grouped_sections)}'
        '<p class="pub-empty" data-lv-empty hidden>No service roles match your search or filters. '
        '<button type="button" class="linkbtn" data-lv-reset>Show all</button></p>'
        '</div>'
        '</div>'
    )
