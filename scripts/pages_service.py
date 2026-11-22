"""Content generator for the Service page (#service-content).

Renders:
  1. Topline Stat Tiles (Committees & Leadership Roles, Professional Societies,
     Conferences & Workshops, Journals Refereed)
  2. Community Leadership, Governance & EDI intro box with direct links to
     U of T Astronomy & Astrophysics SURP, SSC Data Science & Analytics,
     MScAC Data Science, and STATSTRO
  3. Programmatic Leadership & Governance Timeline (derived from content.json)
  4. Interactive Listview grouped into categories plus the Manuscript Referee Service block:
     - Professional Societies (SSC, AAS, ASA, LSST ISSC, CASCA)
     - University of Toronto Governance (David A. Dunlap Astronomy & Astrophysics
       and Statistical Sciences)
     - Workshops & Conferences (STATSTRO, CASCA AGM, Globular Clusters)
"""
import re

from pages_shared import (accent_class, attr_esc, card_meta, chip, date_range,
                          esc, listview_status, lv_trigger_attrs, period_end_year,
                          slug as _slug, stat_tile, strip_tags as _strip_tags, url_attr, warn)


_ACADEMIC_YEARS = ["2020–21", "2021–22", "2022–23", "2023–24", "2024–25", "2025–26", "2026–27"]
_AY_START = 2020
_AY_LAST = len(_ACADEMIC_YEARS) - 1
_ACTIVE_END_YEAR = f"{_AY_START + _AY_LAST}-{_AY_START + _AY_LAST + 1}"
_RANGE_RE = re.compile(r"(\d{4})(?:[–-](\d{2,4}|Present))?")
_LEAD_WORDS = ("chair", "president", "director", "founder", "organizer", "soc", "loc")


def _visible(seq):
    return [x for x in (seq or []) if not (isinstance(x, dict) and x.get("hidden"))]


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


def _is_lead_role(label):
    low = (label or "").lower()
    return any(k in low for k in _LEAD_WORDS) and "past" not in low and "elect" not in low


def _parse_span(spec):
    """Map 'YYYY–YY', 'YYYY–Present', or 'YYYY' onto clamped indices in _ACADEMIC_YEARS."""
    m = _RANGE_RE.search(str(spec or ""))
    if not m:
        return None
    y0 = int(m.group(1))
    end_tok = m.group(2)
    if end_tok is None:
        idx = max(0, min(_AY_LAST, y0 - (_AY_START + 1)))
        return idx, idx
    c0 = max(0, min(_AY_LAST, y0 - _AY_START))
    if end_tok.lower() == "present":
        c1 = _AY_LAST
    else:
        y1 = int(end_tok)
        if y1 < 100:
            y1 += (y0 // 100) * 100
        c1 = max(c0, min(_AY_LAST, y1 - (_AY_START + 1)))
    return c0, c1


def _spans_from_pos(org_label, pos):
    """Build timeline span tuples from a content.json position dict."""
    tags = pos.get("tags") or []
    spans = []
    for tag in tags:
        txt = str(tag).strip()
        if ":" in txt:
            when, lbl = (p.strip() for p in txt.split(":", 1))
        else:
            when, lbl = _period_text(pos), txt
        span = _parse_span(when)
        if span:
            c0, c1 = span
            spans.append((c0, c1, lbl, _is_lead_role(lbl), f"{org_label}: {lbl} ({when})"))
    if not spans:
        when = _period_text(pos)
        span = _parse_span(when)
        if span:
            lbl = (pos.get("role") or pos.get("title") or "Member").strip()
            spans.append((span[0], span[1], lbl, _is_lead_role(lbl), f"{org_label}: {lbl} ({when})"))
    return spans


def _render_track(acc, spans, stacks=None):
    """Render a 7-column academic-year grid track with Row 1 year cells/stacks and Row 2 underbraces."""
    stacks = stacks or {}
    col_info = {}
    for c0, c1, lbl, is_lead, tip in spans:
        for c in range(c0, c1 + 1):
            item_tip = tip or f"{lbl} ({_ACADEMIC_YEARS[c]})"
            if c in col_info:
                prev_lead, prev_tips = col_info[c]
                tips = prev_tips if item_tip in prev_tips else prev_tips + [item_tip]
                col_info[c] = (prev_lead or is_lead, tips)
            else:
                col_info[c] = (is_lead, [item_tip])

    cells_html = []
    for c in range(len(_ACADEMIC_YEARS)):
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
            is_lead, tips = col_info[c]
            lcls = " tm-full-year" if is_lead else ""
            cells_html.append(
                f'<span class="tm-cell tm-on tm-{acc}{lcls}" style="grid-column:{gcol};grid-row:1" '
                f'title="{attr_esc(" · ".join(tips))}"><i class="tm-dot"></i></span>'
            )
        else:
            cells_html.append(
                f'<span class="tm-cell" style="grid-column:{gcol};grid-row:1"></span>'
            )

    merged_braces = []
    by_range = {}
    for c0, c1, lbl, is_lead, tip in spans:
        key = (c0, c1)
        if key in by_range:
            entry = by_range[key]
            if lbl and lbl not in entry["labels"]:
                entry["labels"].append(lbl)
            if tip and tip not in entry["tips"]:
                entry["tips"].append(tip)
            entry["is_lead"] = entry["is_lead"] or is_lead
        else:
            entry = {
                "c0": c0,
                "c1": c1,
                "labels": [lbl] if lbl else [],
                "tips": [tip] if tip else [],
                "is_lead": is_lead,
            }
            by_range[key] = entry
            merged_braces.append(entry)

    braces_html = []
    for entry in merged_braces:
        lcls = " is-lead" if entry["is_lead"] else ""
        braces_html.append(
            f'<div class="srv-brace tm-{acc}{lcls}" style="grid-column:{entry["c0"] + 1}/{entry["c1"] + 2};grid-row:2" '
            f'title="{attr_esc(" · ".join(entry["tips"]))}">'
            f'<span class="srv-brace-line" aria-hidden="true"></span>'
            f'<span class="srv-brace-lbl">{esc(" · ".join(entry["labels"]))}</span>'
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


def _short_org(name):
    return re.sub(r"\s*\([^)]+\)\s*$", "", str(name or "")).strip()


def _society_rows(orgs, acc):
    rows = []
    single_term = []
    for org in orgs:
        oname = org.get("name", "")
        short = _short_org(oname)
        for pos in (org.get("positions") or []):
            spans = _spans_from_pos(short, pos)
            if len(spans) > 1 or any(k in oname for k in ("SSC", "AAS", "ASA")):
                badge = f"{len(spans)} Terms" if "AAS" in oname else "Executive" if "SSC" in oname else "Officer"
                rows.append(_render_row(pos.get("title") or short, short, badge, acc, spans))
            else:
                single_term.append((short, pos, spans))
    if len(single_term) >= 2:
        summary_spans = [s for _, _, sp in single_term for s in sp]
        rows.append(_render_row("Society Committees", "CASCA · Rubin LSST ISSC",
                                f"{len(single_term)} roles", acc, summary_spans, expand_id="soc-comm"))
        for short, pos, sp in single_term:
            rows.append(_render_row(f"{short} {pos.get('title', '')}".strip(),
                                    short, pos.get("role", "Member"), acc, sp, parent_id="soc-comm"))
    else:
        for short, pos, sp in single_term:
            rows.append(_render_row(pos.get("title") or short, short,
                                    pos.get("role", "Member"), acc, sp))
    return rows


def _uoft_badge(pos, ptitle):
    badge = pos.get("role", "Member")
    low = badge.lower()
    if "director" in low:
        return "Director"
    if "chair" in low:
        return "Chair & Member"
    if "admissions" in ptitle.lower():
        return "Admissions"
    return badge


def _uoft_rows(orgs, acc):
    astro_rows = []
    other_rows = []
    grouped_astro = []
    for org in orgs:
        oname = org.get("name", "")
        short = _short_org(oname)
        is_astro = "astronomy" in oname.lower()
        target = astro_rows if is_astro else other_rows
        for pos in (org.get("positions") or []):
            ptitle = pos.get("title") or oname
            spans = _spans_from_pos(short, pos)
            if is_astro and "surp" not in ptitle.lower():
                grouped_astro.append((short, pos, spans))
                continue
            row_title = "U of T Astronomy SURP" if "surp" in ptitle.lower() else ptitle
            target.append(_render_row(row_title, short, _uoft_badge(pos, ptitle), acc, spans))
    if grouped_astro:
        summary_spans = sorted((s for _, _, sp in grouped_astro for s in sp), key=lambda x: x[0])
        astro_rows.append(_render_row(
            "DADDAA Governance Committees", "Curriculum, Mentoring & Admissions",
            f"{len(grouped_astro)} roles", acc, summary_spans, expand_id="ut-astro",
        ))
        for short, pos, sp in grouped_astro:
            astro_rows.append(_render_row(pos.get("title") or "", short,
                                          pos.get("role", "Member"), acc, sp, parent_id="ut-astro"))
    return astro_rows + other_rows


def _workshop_rows(orgs, extra, acc):
    rows = []
    for org in orgs:
        short = _short_org(org.get("name", ""))
        for pos in (org.get("positions") or []):
            title = pos.get("title") or short
            spans = _spans_from_pos(title, pos)
            rows.append(_render_row(title, pos.get("note") or short, "Annual", acc, spans))
    if extra:
        stacks = {}
        sum_spans = []
        sub_rows = []
        for it in extra:
            oname = it.get("organization", "")
            spans = _spans_from_pos(oname, it)
            if spans:
                c0 = spans[0][0]
                stacks.setdefault(c0, []).append((oname.split()[0], True,
                                                 f"{oname}: {it.get('role', '')}"))
                sum_spans.extend(spans)
            sub_rows.append(_render_row(oname, it.get("role", "").split(" · ")[-1],
                                        "SOC / LOC", acc, spans, parent_id="conf-org"))
        if sum_spans:
            merged_span = [(min(s[0] for s in sum_spans), max(s[1] for s in sum_spans),
                            f"{len(extra)}× SOC / LOC Co-Chair", True,
                            "; ".join(it.get("organization", "") for it in extra))]
            rows.append(_render_row("Conferences & Symposia", "Scientific & Local Organizing Committees",
                                    f"{len(extra)} conf.", acc, merged_span, stacks=stacks, expand_id="conf-org"))
            rows.extend(sub_rows)
    return rows


def _service_timeline(categories):
    """Derive academic-year governance timeline rows directly from content.json."""
    groups = []
    for cat in categories:
        if cat.get("hidden") or "referee" in (cat.get("title") or "").lower():
            continue
        ctitle = cat.get("title", "")
        acc = accent_class(cat.get("accent") or "mute", f"service timeline {ctitle!r}")
        orgs = _visible(_organizations(cat))
        extra = _visible(cat.get("items"))
        low = ctitle.lower()
        gslug = _slug(ctitle)
        if "societ" in low:
            groups.append((gslug, ctitle, acc, _society_rows(orgs, acc)))
        elif "toronto" in low:
            groups.append((gslug, "University of Toronto Governance", acc, _uoft_rows(orgs, acc)))
        else:
            groups.append((gslug, ctitle, acc, _workshop_rows(orgs, extra, acc)))

    group_blocks = [
        f'<button type="button" class="srv-group-hd srv-group-btn" {lv_trigger_attrs(cat=gslug)}>'
        f'<span class="dot d-{gacc}"></span><span>{esc(gtitle)}</span></button>{"".join(grows)}'
        for gslug, gtitle, gacc, grows in groups
    ]
    head_cells = "".join(f'<span class="tm-yr">{ay}</span>' for ay in _ACADEMIC_YEARS)
    legend = (
        '<div class="pf-leg">'
        '<span class="pf-key"><i class="pf-kw seg-postdoc"></i>Professional Societies</span>'
        '<span class="pf-key"><i class="pf-kw seg-student"></i>University of Toronto Governance</span>'
        '<span class="pf-key"><i class="pf-kw seg-primary"></i>Workshops &amp; Conferences</span>'
        '<span class="pf-key"><i class="tm-dot" style="background:var(--text)"></i>Chair / President / Co-Chair term</span>'
        '</div>'
    )
    span_lbl = f"{_ACADEMIC_YEARS[0]} to {_ACADEMIC_YEARS[-1]}"
    return (
        '<figure class="pub-fig wide teach-matrix-fig srv-matrix-fig">'
        f'<figcaption class="pub-fig-head"><span class="t">Leadership &amp; governance timeline by academic year ({span_lbl})</span>'
        '<span class="m">click a group heading to filter or ▾ badges to expand</span></figcaption>'
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
    referee_section = ""
    chips_html = []
    total = 0
    n_societies = 0
    n_conferences = 0
    n_referee = 0

    for category in categories:
        if category.get("hidden"):
            continue
        cat_title = category.get("title", "") or ""
        cat_slug = _slug(cat_title)
        accent = accent_class(category.get("accent") or "mute", f"service category {cat_title!r}")

        if "referee" in cat_title.lower():
            ritems = _visible(category.get("items"))
            n_referee = len(ritems)
            if ritems:
                rcards = "".join(
                    f'<article class="item accent-{accent}">'
                    f'{card_meta(date_range(it.get("period") or ""), ("Peer Review", True))}'
                    f'<div class="item-head"><h3 class="item-title">{esc(it.get("organization", ""))}</h3></div>'
                    f'<p class="item-meta"><strong>{esc(it.get("role", "Referee"))}</strong></p>'
                    '</article>'
                    for it in ritems
                )
                referee_section = (
                    '<section class="mentor-block service-section referee-section" id="referee-service">'
                    '<div class="mentor-sec-header">'
                    f'<h2 class="item-section-title"><span class="dot d-{accent}"></span>{esc(cat_title)} '
                    f'<span class="mentor-sec-count">{len(ritems)}</span></h2>'
                    '</div>'
                    f'<div class="mentee-grid">{rcards}</div>'
                    '</section>'
                )
            continue

        orgs = _visible(_organizations(category))
        extra = _visible(category.get("items"))

        if "societ" in cat_title.lower():
            n_societies = len(orgs)

        cards = []
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
            is_ongoing = "present" in period.lower() or _ACTIVE_END_YEAR in period
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
        + stat_tile(total, "Committees &amp; leadership roles", "role-tile-total", cat="all", pressed=True)
        + stat_tile(n_societies, "Professional societies", "role-tile-postdoc", cat="professional-societies")
        + stat_tile(n_conferences, "Conferences &amp; workshops", "role-tile-primary", cat="workshops-conferences")
        + f'<a class="pub-stat pub-statlink role-tile-student" href="#referee-service"><span class="n">{n_referee}</span><span class="l">Journals refereed</span><span class="pub-stat-go" aria-hidden="true">Jump ↓</span></a>'
        + '</div>'
    )

    intro_box = (
        '<aside class="highlight-box">'
        '<div class="ment-intro-head">'
        '<h2>Community Leadership, Governance &amp; EDI</h2>'
        '<div class="ment-intro-links">'
        '<a class="reslink" href="https://statstro.com/" target="_blank" rel="noopener">STATSTRO Workshop ↗</a>'
        '</div></div>'
        '<p>Much of my academic service focuses on building cross-disciplinary bridges between astronomy, '
        'statistics, and data science, including serving as Chair and committee member of the '
        '<a href="https://www.astro.utoronto.ca/academics/undergraduate-studies/surp-2/" target="_blank" rel="noopener">'
        'David A. Dunlap Department of Astronomy &amp; Astrophysics SURP</a>, Interim Director of the '
        '<a href="https://mscac.utoronto.ca/concentrations/ds/" target="_blank" rel="noopener">'
        'Department of Statistical Sciences MScAC Data Science Concentration</a> (2026–2027), Past President (2026–2027) '
        'and former President (2025–2026) of the '
        '<a href="https://ssc.ca/en/about/sections-regions/data-science-and-analytics" target="_blank" rel="noopener">'
        'SSC Data Science &amp; Analytics Section</a>, and co-organizer of the annual '
        '<a href="https://statstro.com/" target="_blank" rel="noopener">STATSTRO Workshop</a>.</p>'
        '</aside>'
    )

    timeline_html = _service_timeline(categories)

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
        f'{referee_section}'
        '</div>'
    )
