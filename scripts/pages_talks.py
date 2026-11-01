"""Pre-render module for the redesigned Talks page (#talks-content).

Exposes generate_content(data) -> str returning the inner HTML for the
#talks-content container:
  1. Topline Stat Tiles (Total Talks & Events, Invited Talks, Colloquia & Seminars,
     Tutorials & Panels, Global Cities Visited)
  2. Row 1 (Full-Width Card): Interactive 3-D Orthographic Globe + City & Venue Inspector
     (powered by Natural Earth 110m geometry in assets/js/redesign/talks-globe.js)
  3. Row 2 (2-Panel Speaking Visualization Dashboard):
     - Left Panel: Speaking Activity by Year & Format (stacked bar chart with hover tooltips)
     - Right Panel: Speaking Breakdown by Research Theme & Format (stacked horizontal bars)
  4. Featured Talks spotlight + interactive search, sort, and category filter listview.
"""
import json
import re
from collections import Counter, defaultdict

from pages_shared import (accent_class, attr_esc, card_meta, esc, parse_latest_year,
                          scaffold, slug, term_month, url_attr, warn)

# City / region -> (display label, lat, lon, region_key, search_key)
# Grouped slightly only where two suburbs share a metro pin on a world map.
_CITY_COORDS = {
    "toronto, on": ("Toronto, ON", 43.65, -79.38, "na", "Toronto"),
    "toronto, canada": ("Toronto, ON", 43.65, -79.38, "na", "Toronto"),
    "hamilton, on": ("Hamilton, ON", 43.26, -79.87, "na", "Hamilton"),
    "waterloo, on": ("Waterloo / Guelph, ON", 43.47, -80.52, "na", "Waterloo"),
    "guelph, on": ("Waterloo / Guelph, ON", 43.47, -80.52, "na", "Guelph"),
    "kingston, on": ("Kingston, ON", 44.23, -76.49, "na", "Kingston"),
    "ottawa, on": ("Ottawa, ON", 45.42, -75.70, "na", "Ottawa"),
    "montreal, qc": ("Montreal, QC", 45.50, -73.57, "na", "Montreal"),
    "halifax, ns": ("Halifax, NS", 44.65, -63.57, "na", "Halifax"),
    "banff, ab": ("Banff, AB", 51.18, -115.57, "na", "Banff"),
    "victoria, bc": ("Victoria, BC", 48.43, -123.37, "na", "Victoria"),
    "cambridge, ma": ("Cambridge / Boston, MA", 42.37, -71.11, "na", "Cambridge"),
    "boston, ma": ("Cambridge / Boston, MA", 42.37, -71.11, "na", "Boston"),
    "wellesley, usa": ("Cambridge / Boston, MA", 42.37, -71.11, "na", "Wellesley"),
    "amherst, ma": ("Amherst, MA", 42.37, -72.52, "na", "Amherst"),
    "new york, ny": ("New York, NY", 40.71, -74.01, "na", "New York"),
    "princeton, nj": ("Princeton, NJ", 40.35, -74.66, "na", "Princeton"),
    "villanova, pa": ("Philadelphia / Villanova, PA", 40.04, -75.34, "na", "Villanova"),
    "state college, pa": ("State College, PA", 40.79, -77.86, "na", "Penn State"),
    "university park, pa": ("State College, PA", 40.79, -77.86, "na", "University Park"),
    "pittsburgh, pa": ("Pittsburgh, PA", 40.44, -79.99, "na", "Pittsburgh"),
    "pittsburgh, usa": ("Pittsburgh, PA", 40.44, -79.99, "na", "Pittsburgh"),
    "baltimore, usa": ("Baltimore, MD", 39.29, -76.61, "na", "Baltimore"),
    "washington, dc": ("Washington, DC", 38.91, -77.04, "na", "Washington"),
    "ann arbor, mi": ("Ann Arbor, MI", 42.28, -83.74, "na", "Ann Arbor"),
    "columbus, oh": ("Columbus, OH", 39.96, -83.00, "na", "Columbus"),
    "chicago, il": ("Chicago, IL", 41.88, -87.63, "na", "Chicago"),
    "gainesville, fl": ("Gainesville, FL", 29.65, -82.32, "na", "Gainesville"),
    "new orleans, la": ("New Orleans, LA", 29.95, -90.07, "na", "New Orleans"),
    "grapevine, tx": ("Dallas / Grapevine, TX", 32.93, -97.08, "na", "Grapevine"),
    "austin, tx": ("Austin, TX", 30.27, -97.74, "na", "Austin"),
    "berkeley, ca": ("Bay Area (Berkeley / Stanford), CA", 37.60, -122.20, "na", "Berkeley"),
    "stanford, ca": ("Bay Area (Berkeley / Stanford), CA", 37.60, -122.20, "na", "Stanford"),
    "mountain view, usa": ("Bay Area (Berkeley / Stanford), CA", 37.60, -122.20, "na", "Mountain View"),
    "long beach, ca": ("Long Beach, CA", 33.77, -118.19, "na", "Long Beach"),
    "la jolla, usa": ("La Jolla / San Diego, CA", 32.83, -117.27, "na", "La Jolla"),
    "london, uk": ("London, UK", 51.51, -0.13, "eu", "London"),
    "cambridge, uk": ("Cambridge, UK", 52.21, 0.12, "eu", "Cambridge, UK"),
    "leiden, netherlands": ("Leiden, Netherlands", 52.16, 4.49, "eu", "Leiden"),
    "heidelberg, germany": ("Heidelberg, Germany", 49.40, 8.67, "eu", "Heidelberg"),
    "garching, germany": ("Garching / Munich, Germany", 48.25, 11.65, "eu", "Garching"),
    "berlin, germany": ("Berlin, Germany", 52.52, 13.40, "eu", "Berlin"),
    "vienna, austria": ("Vienna, Austria", 48.21, 16.37, "eu", "Vienna"),
    "balatonalmádi, hungary": ("Balatonalmádi, Hungary", 47.03, 18.02, "eu", "Hungary"),
    "barcelona, spain": ("Barcelona, Spain", 41.39, 2.17, "eu", "Barcelona"),
    "chania, greece": ("Chania, Greece", 35.51, 24.02, "eu", "Chania"),
    "beijing, china": ("Beijing, China", 39.90, 116.41, "as", "Beijing"),
    "tokyo, japan": ("Tokyo / Tsukuba, Japan", 35.80, 139.90, "as", "Japan"),
    "tsukuba, japan": ("Tokyo / Tsukuba, Japan", 35.80, 139.90, "as", "Japan"),
    "singapore": ("Singapore", 1.35, 103.82, "as", "Singapore"),
}


def _link_html(rec, label="Event"):
    """Optional outbound link for a record carrying a `url` (event page, slides, recording)."""
    url = (rec.get("url") or "").strip() if isinstance(rec, dict) else ""
    if not url:
        return ""
    return (f'<a class="reslink" href="{url_attr(url)}" target="_blank" rel="noopener">'
            f'{esc(rec.get("urlLabel") or label)} ↗</a>')


def _month(date):
    """Month number (1-12) parsed from a 'Mon YYYY' date string, else 0."""
    return term_month(str(date or "").split()[0] if str(date or "").split() else "")


def _year(talk):
    """The talk's year: the stored value, else parsed from its date string."""
    try:
        return int(talk.get("year"))
    except (TypeError, ValueError):
        return parse_latest_year(talk.get("date"))


def _iso_date(date, year):
    """Best-effort ISO date for <time datetime>: 'Mon YYYY' -> 'YYYY-MM', else the year."""
    m = _month(date)
    parts = str(date or "").split()
    if m and len(parts) >= 2 and parts[1].isdigit():
        return f"{parts[1]}-{m:02d}"
    return str(year) if year else ""


def _sort_num(date, year):
    """Sortable integer key 'YYYYMM' so same-year talks order by month."""
    try:
        y = int(year)
    except (TypeError, ValueError):
        return 0
    return y * 100 + _month(date)


def _meta_line(when, date, year, ttype):
    """Card metadata: the date (as a <time> when we can date it) and the kind of talk."""
    lead = ""
    if when:
        iso = _iso_date(date, year)
        lead = (f'<time datetime="{esc(iso)}">{esc(when)}</time>' if iso else esc(when))
    return card_meta((ttype, True), lead_html=lead)


def _talk_tags_html(talk, cat_name, accent):
    """Render category badge plus optional structured tags (eventAbbr, coPresenters, role, sessionType, award)."""
    pills = [f'<span class="badge b-{accent}">{esc(cat_name)}</span>']
    if talk.get("eventAbbr"):
        pills.append(f'<span class="tag tag-institution">{esc(talk["eventAbbr"])}</span>')
    if talk.get("role"):
        pills.append(f'<span class="tag tag-program">{esc(talk["role"])}</span>')
    if talk.get("sessionType"):
        pills.append(f'<span class="tag">{esc(talk["sessionType"])}</span>')
    for c in (talk.get("coPresenters") or []):
        cname = c.get("name", "")
        curl = (c.get("url") or "").strip()
        if cname:
            if curl:
                pills.append(
                    f'<span class="tag tag-program">with <a href="{url_attr(curl)}" '
                    f'target="_blank" rel="noopener">{esc(cname)}</a></span>'
                )
            else:
                pills.append(f'<span class="tag tag-program">with {esc(cname)}</span>')
    if talk.get("award"):
        pills.append(f'<span class="tag feat">★ {esc(talk["award"])}</span>')
    return "".join(pills)


def _talk_item(talk, cat_id, cat_name, accent):
    """Render one talk as a listview item card."""
    title = talk.get("title", "")
    event = talk.get("event", "")
    location = talk.get("location", "")
    date = talk.get("date", "")
    year = _year(talk)
    ttype = talk.get("type", "")
    co_list = talk.get("coPresenters") or []

    when = date or (str(year) if year else "")

    co_names = " ".join(c.get("name", "") for c in co_list)
    search_blob = " ".join(
        str(x) for x in (
            title, event, talk.get("eventAbbr", ""), co_names,
            talk.get("role", ""), talk.get("award", ""), location, date, ttype, cat_name
        ) if x
    )
    data_search = attr_esc(search_blob)
    data_title = attr_esc(title)
    data_year = str(year) if year else ""
    data_num = str(_sort_num(date, year))

    meta_bits = []
    if event:
        meta_bits.append(f"<strong>{esc(event)}</strong>")
    if location:
        meta_bits.append(esc(location))
    meta_html = " · ".join(meta_bits)

    url = (talk.get("url") or "").strip()
    title_html = (
        f'<a href="{url_attr(url)}" target="_blank" rel="noopener">{esc(title)}</a>'
        if url else esc(title)
    )

    return (
        f'<article class="item accent-{accent}" data-lv-item'
        f' data-cat="{slug(cat_id)}"'
        f' data-search="{data_search}"'
        f' data-year="{data_year}"'
        f' data-num="{data_num}"'
        f' data-title="{data_title}">'
        f'{_meta_line(when, date, year, ttype)}'
        f'<div class="item-head">'
        f'<h3 class="item-title">{title_html}</h3>'
        f'</div>'
        f'<p class="item-meta">{meta_html}</p>'
        f'<div class="paper-badges"><div class="paper-tag-group">'
        f'{_talk_tags_html(talk, cat_name, accent)}</div>'
        f'<div class="paper-links">{_link_html(talk)}</div></div>'
        f'</article>'
    )


def _featured_card(talk, cat_id, cat_name, accent):
    """Render one featured talk as a highlighted spotlight card."""
    title = talk.get("title", "")
    event = talk.get("event", "")
    location = talk.get("location", "")
    date = talk.get("date", "")
    year = _year(talk)
    ttype = talk.get("type", "")

    when = date or (str(year) if year else "")

    meta_bits = [b for b in (
        f"<strong>{esc(event)}</strong>" if event else "",
        esc(location) if location else "",
    ) if b]
    meta_html = " · ".join(meta_bits)

    url = (talk.get("url") or "").strip()
    title_html = (
        f'<a href="{url_attr(url)}" target="_blank" rel="noopener">{esc(title)}</a>'
        if url else esc(title)
    )

    return (
        f'<article class="item feat-card accent-{accent}">'
        f'{_meta_line(when, date, year, ttype)}'
        f'<div class="item-head">'
        f'<h3 class="item-title">{title_html}</h3>'
        f'</div>'
        f'<p class="item-meta">{meta_html}</p>'
        f'<div class="paper-badges"><div class="paper-tag-group">'
        f'{_talk_tags_html(talk, cat_name, accent)}</div>'
        f'<div class="paper-links">{_link_html(talk)}</div></div>'
        f'</article>'
    )


def _world_globe_section(categories):
    """Build the full-width interactive 3-D globe + City & Venue Inspector panel."""
    city_talks = defaultdict(list)
    city_info = {}
    virtual_talks = []

    for cat in categories:
        cname = cat.get("name", "")
        for t in cat.get("talks", []):
            loc_raw = (t.get("location") or "").strip()
            loc_key = loc_raw.lower()
            entry = {
                "title": esc(t.get("title", "")),
                "event": esc(t.get("event", "")),
                "date": esc(t.get("date", "")),
                "year": _year(t),
                "category": esc(cname),
                "url": url_attr((t.get("url") or "").strip()) if (t.get("url") or "").strip() else "",
                "sortNum": _sort_num(t.get("date", ""), _year(t)),
            }
            if "virtual" in loc_key or "radio" in loc_key or not loc_key:
                virtual_talks.append(entry)
                continue
            if loc_key in _CITY_COORDS:
                label, lat, lon, reg, skey = _CITY_COORDS[loc_key]
                city_info[label] = (lat, lon, reg, skey)
                city_talks[label].append(entry)

    cities_payload = []
    for label, (lat, lon, reg, skey) in sorted(
        city_info.items(), key=lambda kv: (-len(city_talks[kv[0]]), kv[0])
    ):
        talks_sorted = sorted(city_talks[label], key=lambda x: -x["sortNum"])
        cities_payload.append({
            "label": label,
            "lat": lat,
            "lon": lon,
            "region": reg,
            "searchKey": skey,
            "count": len(talks_sorted),
            "talks": talks_sorted,
        })

    virtual_sorted = sorted(virtual_talks, key=lambda x: -x["sortNum"])
    virtual_payload = {
        "label": "Virtual & Broadcast",
        "lat": 0.0,
        "lon": 0.0,
        "region": "virtual",
        "searchKey": "Virtual",
        "count": len(virtual_sorted),
        "talks": virtual_sorted,
    }

    reg_counts = Counter()
    for c in cities_payload:
        reg_counts[c["region"]] += c["count"]
    total_all = sum(reg_counts.values()) + len(virtual_sorted)

    payload_json = json.dumps(
        {"cities": cities_payload, "virtual": virtual_payload},
        ensure_ascii=False,
        separators=(",", ":"),
    ).replace("</", "<\\/")

    # Pre-render initial chips & Toronto inspector detail for instant SSR / accessibility
    chips_ssr = []
    for idx, c in enumerate(cities_payload):
        active = " is-active" if idx == 0 else ""
        chips_ssr.append(
            f'<button type="button" class="globe-city-chip{active} reg-{c["region"]}" '
            f'data-city-select="{attr_esc(c["label"])}">'
            f'<span class="gcc-dot"></span>'
            f'<span class="gcc-name">{esc(c["label"])}</span>'
            f'<span class="gcc-cnt">{c["count"]}</span>'
            '</button>'
        )

    first = cities_payload[0] if cities_payload else virtual_payload
    first_talks_html = "".join(
        '<li class="gcd-talk">'
        f'<div class="gcd-talk-top"><span class="gcd-year">{t["date"] or t["year"]}</span>'
        f'<span class="gcd-cat">{t["category"]}</span></div>'
        f'<div class="gcd-title">{t["title"]}</div>'
        f'<div class="gcd-event">{t["event"]}</div>'
        '</li>'
        for t in first["talks"]
    )

    return (
        '<figure class="pub-fig wide talks-globe-fig">'
        '<figcaption class="pub-fig-head talks-globe-head">'
        '<div class="tgh-left">'
        '<span class="t">Global speaking footprint</span>'
        '<span class="m">drag globe to rotate · click any pin or city chip to inspect venues</span>'
        '</div>'
        '<div class="tgh-controls" role="toolbar" aria-label="Globe camera and projection controls">'
        '<div class="tgh-group" role="group" aria-label="Region camera presets">'
        f'<button type="button" class="globe-ctrl-btn" data-globe-region="all" aria-pressed="true">All ({total_all})</button>'
        f'<button type="button" class="globe-ctrl-btn reg-na" data-globe-region="na" aria-pressed="false">North America ({reg_counts["na"]})</button>'
        f'<button type="button" class="globe-ctrl-btn reg-eu" data-globe-region="eu" aria-pressed="false">Europe ({reg_counts["eu"]})</button>'
        f'<button type="button" class="globe-ctrl-btn reg-as" data-globe-region="as" aria-pressed="false">Asia ({reg_counts["as"]})</button>'
        f'<button type="button" class="globe-ctrl-btn reg-virtual" data-globe-region="virtual" aria-pressed="false">Virtual ({len(virtual_sorted)})</button>'
        '</div>'
        '<div class="tgh-group" role="group" aria-label="Map projection mode">'
        '<button type="button" class="globe-ctrl-btn" data-globe-mode="3d" aria-pressed="true">3D Globe</button>'
        '<button type="button" class="globe-ctrl-btn" data-globe-mode="2d" aria-pressed="false">2D Map</button>'
        '</div>'
        '</div>'
        '</figcaption>'
        '<div class="talks-globe-layout">'
        '<div class="talks-globe-stage">'
        '<canvas id="talks-globe-canvas" width="600" height="440" '
        'aria-label="Interactive 3-D orthographic globe of speaking cities"></canvas>'
        '<div class="talks-globe-zoom" role="group" aria-label="Globe zoom and rotation">'
        '<button type="button" class="globe-zoom-btn" data-globe-zoom="in" title="Zoom in" aria-label="Zoom in">+</button>'
        '<button type="button" class="globe-zoom-btn" data-globe-zoom="out" title="Zoom out" aria-label="Zoom out">&minus;</button>'
        '<button type="button" class="globe-zoom-btn" data-globe-zoom="spin" aria-pressed="false" title="Toggle auto-rotation">Spin</button>'
        '</div>'
        '<div class="talks-globe-tip" hidden></div>'
        '<div class="pf-leg talks-globe-leg">'
        f'<span class="pf-key"><i class="pf-kw seg-student"></i>North America ({reg_counts["na"]} talks)</span>'
        f'<span class="pf-key"><i class="pf-kw seg-postdoc"></i>Europe ({reg_counts["eu"]} talks)</span>'
        f'<span class="pf-key"><i class="pf-kw seg-primary"></i>Asia ({reg_counts["as"]} talks)</span>'
        f'<span class="pf-key"><i class="pf-kw seg-other"></i>Virtual / Broadcast ({len(virtual_sorted)})</span>'
        '</div>'
        '</div>'
        '<aside class="talks-city-inspector" aria-label="Speaking city and venue inspector">'
        '<div class="tci-label">Select a speaking hub (' + str(len(cities_payload)) + ' metro areas)</div>'
        f'<div class="globe-city-chips" data-globe-chips>{"".join(chips_ssr)}</div>'
        '<div class="globe-city-detail" data-globe-detail>'
        '<div class="gcd-head">'
        '<div>'
        '<div class="gcd-kicker"><span class="gcd-reg-dot reg-na"></span>North America · 43.7°N, 79.4°W</div>'
        f'<h4 class="gcd-city">{esc(first["label"])}</h4>'
        '</div>'
        f'<div class="gcd-badge">{first["count"]} talks</div>'
        '</div>'
        f'<ul class="gcd-list">{first_talks_html}</ul>'
        '<div class="gcd-foot">'
        f'<button type="button" class="btn gcd-filter-btn" data-globe-filter-list="{attr_esc(first["searchKey"])}">'
        f'Filter talk archive below to “{esc(first["searchKey"])}”'
        '</button>'
        '</div>'
        '</div>'
        '</aside>'
        '</div>'
        f'<script type="application/json" id="talks-globe-data">{payload_json}</script>'
        '</figure>'
    )


_YEAR_CAT_GROUPS = [
    ("invited", "Invited", ["invited"]),
    ("colloquia", "Colloquia & Seminars", ["colloquia"]),
    ("lectures", "Tutorials & Panels", ["lectures", "panels"]),
    ("contributed", "Contributed & Posters", ["contributed", "posters"]),
    ("public", "Public & Media", ["public", "media"]),
]

_SEG_CLS_MAP = {
    "invited": "seg-primary",
    "colloquia": "seg-student",
    "lectures": "seg-postdoc",
    "contributed": "seg-significant",
    "public": "seg-other",
}


def _talks_by_year_svg(categories):
    """Stacked bar chart of talks per year by category group."""
    by_year = defaultdict(Counter)
    for cat in categories:
        cid = cat.get("id", "")
        gkey = next((gk for gk, _, cids in _YEAR_CAT_GROUPS if cid in cids), "contributed")
        for t in cat.get("talks", []):
            y = _year(t)
            if y:
                by_year[y][gkey] += 1
    if not by_year:
        return ""
    years = list(range(min(by_year), max(by_year) + 1))
    maxstack = max((sum(by_year[y].values()) for y in years), default=1)
    scale = maxstack * 1.12
    ticks = [t for t in range(0, maxstack + 5, 5) if 0 < t <= scale]
    n = len(years)
    slot = 100.0 / n
    yp = lambda v: (1.0 - v / scale) * 100.0

    plot = ["".join(f'<span class="pf-gl" style="top:{yp(t):.2f}%"></span>' for t in ticks)]
    for i, y in enumerate(years):
        col = by_year[y]
        tot = sum(col.values())
        left = i * slot + slot * 0.14
        width = slot * 0.72
        if tot:
            segs = "".join(
                f'<i class="pf-seg {_SEG_CLS_MAP[gk]}" style="height:{col[gk] / tot * 100:.2f}%"></i>'
                for gk, _, _ in _YEAR_CAT_GROUPS if col.get(gk)
            )
            plot.append(
                f'<span class="pf-bar" style="left:{left:.2f}%;width:{width:.2f}%;'
                f'height:{100.0 - yp(tot):.2f}%">{segs}</span>'
            )
            parts = ", ".join(f"{col[gk]} {glab.lower()}" for gk, glab, _ in _YEAR_CAT_GROUPS if col.get(gk))
            summ = esc(f"{y}: {tot} event{'s' if tot != 1 else ''} — {parts}").replace('"', "&quot;")
            plot.append(
                f'<span class="pf-col" style="left:{i * slot:.2f}%;width:{slot:.2f}%" '
                f'tabindex="0" aria-label="{summ}" data-tip="{summ}"></span>'
            )
    yticks = "".join(f'<span class="pf-yt" style="top:{yp(t):.2f}%">{t}</span>' for t in ticks)
    xticks = "".join(
        f'<span class="pf-xt" style="left:{i * slot + slot / 2:.2f}%">{y}</span>'
        for i, y in enumerate(years) if y % 2 == 0
    )
    legend = "".join(
        f'<span class="pf-key"><i class="pf-kw {_SEG_CLS_MAP[gk]}"></i>{glab}</span>'
        for gk, glab, _ in _YEAR_CAT_GROUPS
    )
    return (
        '<div class="pf-chart" style="--pf-yc:3" role="group" aria-label="Talks and events per year by category">'
        f'<div class="pf-y">{yticks}</div>'
        f'<div class="pf-plot">{"".join(plot)}<span class="pf-base"></span></div>'
        f'<div class="pf-x">{xticks}</div>'
        f'<div class="pf-leg">{legend}</div>'
        '</div>'
    )


_TALK_THEMES = [
    ("ai", "Scientific AI, Deep Learning & Foundation Models"),
    ("inference", "Bayesian Inference, Nested Sampling & MCMC"),
    ("galactic", "Stellar Populations, Milky Way & 3-D Dust"),
    ("outreach", "Community, Mentorship & Public Outreach"),
    ("extragalactic", "Galaxy Evolution & Photometric Redshifts"),
]


def _classify_talk_theme(talk, cid):
    """Classify a talk into one of Josh's 5 core speaking themes."""
    title = (talk.get("title") or "").lower()
    if cid in ("public", "media") or any(
        k in title for k in ("career", "diverse careers", "doing research", "what exactly are we doing", "what the ***")
    ):
        return "outreach"
    if any(
        k in title for k in (
            "photometric redshift", "color-redshift", "star-forming galaxies",
            "quasar", "cosmological cartography", "more data + more parameters",
            "connecting galaxy evolution", "from light to mass",
        )
    ):
        return "extragalactic"
    if re.search(
        r"\b(ai|artificial intelligence|deep learning|llm|llms|vlm|vlms|foundation model|"
        r"machine learning|machine-learning|neural|inductive bias|sbi|simulation-based)\b",
        title,
    ):
        return "ai"
    if any(
        k in title for k in (
            "nested sampling", "dynesty", "mcmc", "bayesian", "frasian",
            "astro-statistical", "uncertainty quantification", "monte carlo",
            "statistical thinking", "posterior", "unaccounted uncertainties", "photometric biases",
        )
    ):
        if any(k in title for k in ("stellar", "milky way", "dust", "gaia", "brutus", "gspice")):
            return "galactic"
        return "inference"
    if any(
        k in title for k in (
            "stellar", "milky way", "dust", "gaia", "brutus", "gspice", "galactic",
            "globular cluster", "local group", "bubble", "molecular cloud",
            "radcliffe", "star cluster", "stars", "panchromatic", "rr lyrae", "pulsar",
        )
    ):
        return "galactic"
    return "inference"


def _talks_by_topic_svg(categories):
    """Stacked horizontal bar chart of talks by research theme and format."""
    by_theme = defaultdict(Counter)
    for cat in categories:
        cid = cat.get("id", "")
        gkey = next((gk for gk, _, cids in _YEAR_CAT_GROUPS if cid in cids), "contributed")
        for t in cat.get("talks", []):
            th = _classify_talk_theme(t, cid)
            by_theme[th][gkey] += 1

    max_tot = max((sum(by_theme[tk].values()) for tk, _ in _TALK_THEMES), default=1)
    rows = []
    for tk, tlabel in _TALK_THEMES:
        col = by_theme[tk]
        tot = sum(col.values())
        pct_width = (tot / max_tot) * 100.0 if max_tot else 0.0
        segs = "".join(
            f'<i class="talks-theme-seg {_SEG_CLS_MAP[gk]}" style="width:{col[gk] / tot * 100.0:.2f}%"></i>'
            for gk, _, _ in _YEAR_CAT_GROUPS if col.get(gk)
        )
        parts = ", ".join(f"{col[gk]} {glab.lower()}" for gk, glab, _ in _YEAR_CAT_GROUPS if col.get(gk))
        tip = esc(f"{tlabel}: {tot} talks — {parts}").replace('"', "&quot;")
        rows.append(
            f'<div class="talks-theme-row" tabindex="0" aria-label="{tip}" data-tip="{tip}">'
            '<div class="ttr-head">'
            f'<span class="ttr-name">{esc(tlabel)}</span>'
            f'<span class="ttr-cnt">{tot}</span>'
            '</div>'
            '<div class="ttr-track">'
            f'<div class="ttr-fill" style="width:{pct_width:.2f}%">{segs}</div>'
            '</div>'
            '</div>'
        )

    legend = "".join(
        f'<span class="pf-key"><i class="pf-kw {_SEG_CLS_MAP[gk]}"></i>{glab}</span>'
        for gk, glab, _ in _YEAR_CAT_GROUPS
    )

    return (
        '<div class="talks-theme-chart" role="group" aria-label="Talks broken down by research theme and format">'
        f'<div class="talks-theme-rows">{"".join(rows)}</div>'
        f'<div class="pf-leg">{legend}</div>'
        '</div>'
    )


def generate_content(data):
    """Build the inner HTML for #talks-content."""
    talks_section = data.get("sections", {}).get("talks", {})
    categories = talks_section.get("categories", [])

    items = []
    featured = []
    filters = []
    total = 0
    any_year = False
    cat_counts = {}

    for cat in categories:
        cat_id = cat.get("id", "")
        cat_name = cat.get("name", "")
        accent = cat.get("accent")
        if not accent:
            warn(f"talks category {cat_id!r} has no declared accent; using a neutral stripe")
            accent = "mute"
        accent = accent_class(accent, f"talks category {cat_id!r}")
        talks = cat.get("talks", [])
        cat_counts[cat_id] = len(talks)
        filters.append((cat_id, cat_name, len(talks), accent))
        total += len(talks)
        for talk in talks:
            if _year(talk):
                any_year = True
            if talk.get("featured"):
                featured.append((talk, cat_id, cat_name, accent))
            items.append(_talk_item(talk, cat_id, cat_name, accent))

    items_html = "".join(items)

    # Distinct metro locations count
    distinct_cities = {
        _CITY_COORDS[t.get("location", "").strip().lower()][0]
        for c in categories for t in c.get("talks", [])
        if t.get("location", "").strip().lower() in _CITY_COORDS
    }

    # 1. Topline Stat Strip + Full-Width Globe + 2-Panel Breakdown Row
    n_invited = cat_counts.get("invited", 0)
    n_colloq = cat_counts.get("colloquia", 0)
    n_lect_pan = cat_counts.get("lectures", 0) + cat_counts.get("panels", 0)
    stats_html = (
        '<div class="container">'
        '<div class="pub-stats talks-stats">'
        f'<div class="pub-stat role-tile-total"><span class="n">{total}</span><span class="l">Total talks &amp; events</span></div>'
        f'<div class="pub-stat role-tile-primary"><span class="n">{n_invited}</span><span class="l">Invited talks</span></div>'
        f'<div class="pub-stat role-tile-student"><span class="n">{n_colloq}</span><span class="l">Colloquia &amp; seminars</span></div>'
        f'<div class="pub-stat role-tile-postdoc"><span class="n">{n_lect_pan}</span><span class="l">Tutorials &amp; panels</span></div>'
        f'<div class="pub-stat role-tile-significant"><span class="n">{len(distinct_cities)}</span><span class="l">Global speaking hubs</span></div>'
        '</div>'
        '<div class="pub-figures talks-figures">'
        f'{_world_globe_section(categories)}'
        '<figure class="pub-fig">'
        '<figcaption class="pub-fig-head"><span class="t">Speaking activity by year &amp; format</span>'
        '<span class="m">hover or tab through the bars</span></figcaption>'
        f'{_talks_by_year_svg(categories)}</figure>'
        '<figure class="pub-fig">'
        '<figcaption class="pub-fig-head"><span class="t">Speaking topics by research theme &amp; format</span>'
        '<span class="m">hover or tab rows for format breakdown</span></figcaption>'
        f'{_talks_by_topic_svg(categories)}</figure>'
        '</div>'
        '</div>'
    )

    featured_html = ""
    if featured:
        fcards = "".join(_featured_card(t, cid, cname, acc) for (t, cid, cname, acc) in featured)
        featured_html = (
            '<section class="pub-featured" data-lv-pinned aria-labelledby="talks-featured-head">'
            '<h2 id="talks-featured-head" class="pub-featured-head">Featured Talks</h2>'
            f'<div class="featured-grid">{fcards}</div>'
            '</section>\n'
        )

    sorts = [("year", "Newest first")] if any_year else None
    default_sort = "year" if any_year else "default"

    return stats_html + scaffold(
        items_html,
        filters,
        total,
        sorts=sorts,
        batch=20,
        search_ph="Search talks, events, venues, cities…",
        default_sort=default_sort,
        pinned_html=featured_html,
    )
