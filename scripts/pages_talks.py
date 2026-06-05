"""Pre-render module for the redesigned Talks page (#talks-content).

Exposes generate_content(data) -> str returning the inner HTML for the
#talks-content container. Cards follow the generic listview item convention
(see pages_shared) so assets/js/redesign/listview.js can search/filter/sort them.

Talk records (sections.talks.categories[].talks[]) have these fields:
  title, event, location, date, year, type   (all plain text; no url/HTML)
"""
from pages_shared import scaffold, esc, attr_esc

_MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}


def _iso_date(date, year):
    """Best-effort ISO date for <time datetime>: 'Mon YYYY' -> 'YYYY-MM', else the year."""
    parts = str(date or "").split()
    if len(parts) >= 2 and parts[0][:3].lower() in _MONTHS and parts[1].isdigit():
        return f"{parts[1]}-{_MONTHS[parts[0][:3].lower()]:02d}"
    return str(year) if year else ""


def _talk_item(talk, cat_id, cat_name):
    """Render one talk as a listview item card."""
    title = talk.get("title", "")
    event = talk.get("event", "")
    location = talk.get("location", "")
    date = talk.get("date", "")
    year = talk.get("year", "")
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
        f'<article class="item accent-{esc(cat_id)}" data-lv-item'
        f' data-cat="{esc(cat_id)}"'
        f' data-search="{data_search}"'
        f' data-year="{data_year}"'
        f' data-num="{data_year}"'
        f' data-title="{data_title}">'
        f'<div class="item-head">'
        f'<h3 class="item-title">{esc(title)}</h3>'
        f'{when_html}'
        f'</div>'
        f'<p class="item-meta">{meta_html}</p>'
        f'<div class="item-tags"><span class="badge talk-badge">'
        f'<span class="dot d-{esc(cat_id)}"></span>{esc(cat_name)}</span></div>'
        f'</article>'
    )


def generate_content(data):
    """Build the inner HTML for #talks-content."""
    talks_section = data.get("sections", {}).get("talks", {})
    categories = talks_section.get("categories", [])

    items = []
    filters = []
    total = 0
    any_year = False

    for cat in categories:
        cat_id = cat.get("id", "")
        cat_name = cat.get("name", "")
        talks = cat.get("talks", [])
        filters.append((cat_id, cat_name, len(talks)))
        total += len(talks)
        for talk in talks:
            if talk.get("year"):
                any_year = True
            items.append(_talk_item(talk, cat_id, cat_name))

    items_html = "".join(items)

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
    )
