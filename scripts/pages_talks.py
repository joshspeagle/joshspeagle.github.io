"""Pre-render module for the redesigned Talks page (#talks-content).

Exposes generate_content(data) -> str returning the inner HTML for the
#talks-content container. Cards follow the generic listview item convention
(see pages_shared) so assets/js/redesign/listview.js can search/filter/sort them.

Talk records (sections.talks.categories[].talks[]) have these fields:
  title, event, location, date, year, type   (all plain text; no url/HTML)
"""
from pages_shared import (accent_class, attr_esc, esc, parse_latest_year, scaffold,
                          slug, term_month, warn)


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
    """Sortable integer key 'YYYYMM' so same-year talks order by month.

    Month falls back to 0 (undated/TBD entries sort to the end of their year).
    """
    try:
        y = int(year)
    except (TypeError, ValueError):
        return 0
    return y * 100 + _month(date)


def _talk_item(talk, cat_id, cat_name, accent):
    """Render one talk as a listview item card."""
    title = talk.get("title", "")
    event = talk.get("event", "")
    location = talk.get("location", "")
    date = talk.get("date", "")
    year = _year(talk)
    ttype = talk.get("type", "")

    # data-when: prefer the human date string, fall back to the year.
    when = date or (str(year) if year else "")

    # data-search / data-title: lowercased, attribute-safe (plain text, no HTML).
    search_blob = " ".join(
        str(x) for x in (title, event, location, date, ttype, cat_name) if x
    )
    data_search = attr_esc(search_blob)
    data_title = attr_esc(title)
    data_year = str(year) if year else ""
    # data-num encodes YYYYMM so same-year talks sort by month (tiebreaker in listview.js).
    data_num = str(_sort_num(date, year))

    # .item-meta: event (emphasised) + location + talk type.
    meta_bits = []
    if event:
        meta_bits.append(f"<strong>{esc(event)}</strong>")
    if location:
        meta_bits.append(esc(location))
    if ttype:
        meta_bits.append(esc(ttype))
    meta_html = " · ".join(meta_bits)

    if when:
        iso = _iso_date(date, year)
        when_html = (
            f'<time class="item-when" datetime="{esc(iso)}">{esc(when)}</time>' if iso
            else f'<span class="item-when">{esc(when)}</span>'
        )
    else:
        when_html = ""

    return (
        f'<article class="item accent-{accent}" data-lv-item'
        f' data-cat="{slug(cat_id)}"'
        f' data-search="{data_search}"'
        f' data-year="{data_year}"'
        f' data-num="{data_num}"'
        f' data-title="{data_title}">'
        f'<div class="item-head">'
        f'<h3 class="item-title">{esc(title)}</h3>'
        f'{when_html}'
        f'</div>'
        f'<p class="item-meta">{meta_html}</p>'
        f'<div class="item-tags"><span class="badge talk-badge">'
        f'<span class="dot d-{accent}"></span>{esc(cat_name)}</span></div>'
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
    iso = _iso_date(date, year)
    when_html = (
        f'<time class="item-when" datetime="{esc(iso)}">{esc(when)}</time>' if (when and iso)
        else (f'<span class="item-when">{esc(when)}</span>' if when else "")
    )

    meta_bits = [b for b in (
        f"<strong>{esc(event)}</strong>" if event else "",
        esc(location) if location else "",
        esc(ttype) if ttype else "",
    ) if b]
    meta_html = " · ".join(meta_bits)

    return (
        f'<article class="item feat-card accent-{accent}">'
        f'<div class="item-head">'
        f'<h3 class="item-title">{esc(title)}</h3>'
        f'{when_html}'
        f'</div>'
        f'<p class="item-meta">{meta_html}</p>'
        f'<div class="item-tags"><span class="badge talk-badge">'
        f'<span class="dot d-{accent}"></span>{esc(cat_name)}</span></div>'
        f'</article>'
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

    for cat in categories:
        cat_id = cat.get("id", "")
        cat_name = cat.get("name", "")
        accent = cat.get("accent")
        if not accent:
            warn(f"talks category {cat_id!r} has no declared accent; using a neutral stripe")
            accent = "mute"
        accent = accent_class(accent, f"talks category {cat_id!r}")
        talks = cat.get("talks", [])
        filters.append((cat_id, cat_name, len(talks), accent))
        total += len(talks)
        for talk in talks:
            if _year(talk):
                any_year = True
            if talk.get("featured"):
                featured.append((talk, cat_id, cat_name, accent))
            items.append(_talk_item(talk, cat_id, cat_name, accent))

    items_html = "".join(items)

    # Featured spotlight (talks flagged featured=true). It lives INSIDE the listview
    # root and is marked data-lv-pinned so JS can hide it while a filter is active.
    featured_html = ""
    if featured:
        fcards = "".join(_featured_card(t, cid, cname, acc) for (t, cid, cname, acc) in featured)
        featured_html = (
            '<section class="pub-featured" data-lv-pinned data-chip aria-labelledby="talks-featured-head">'
            '<h2 id="talks-featured-head" class="pub-featured-head">Featured talks</h2>'
            f'<div class="featured-grid">{fcards}</div>'
            '</section>\n'
        )

    sorts = [("year", "Newest first")] if any_year else None
    default_sort = "year" if any_year else "default"

    return scaffold(
        items_html,
        filters,
        total,
        sorts=sorts,
        batch=20,
        search_ph="Search talks, events, venues…",
        default_sort=default_sort,
        pinned_html=featured_html,
    )
