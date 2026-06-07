"""News & Updates page content (redesign). generate_content(data) -> inner HTML for #news-content."""
from collections import Counter
from pages_shared import scaffold, esc, attr_esc, url_attr

_TYPE = {
    "press": ("Press", "press"), "paper": ("Paper", "ic"), "talk": ("Talk", "sla"),
    "award": ("Award", "du"), "group": ("Group", "ii"), "software": ("Software", "violet"),
}


def _news_card(n):
    typ = n.get("type", "note")
    label, accent = _TYPE.get(typ, ("Update", "violet"))
    year = n.get("year", 0)
    link = n.get("link", "")
    outlet = n.get("outlet", "")
    cta = f"Read at {outlet} →" if outlet else "Read more →"
    more = f' <a class="reslink" href="{url_attr(link)}" target="_blank" rel="noopener">{esc(cta)}</a>' if link else ""
    byline = f'<span class="news-outlet">{esc(outlet)}</span>' if outlet else ""
    search = attr_esc(f'{n.get("title","")} {n.get("blurb","")} {outlet} {label}')
    return (
        f'<article class="item accent-{accent}" data-lv-item data-cat="{typ}" data-search="{search}" '
        f'data-year="{year}" data-num="{year}" data-title="{attr_esc(n.get("title",""))}">'
        f'<div class="item-head"><h3 class="item-title">{esc(n.get("title",""))}</h3><span class="item-when">{esc(n.get("date",""))}</span></div>'
        f'<div class="item-meta">{esc(n.get("blurb",""))}{more}</div>'
        f'<div class="item-tags"><span class="badge"><span class="dot d-{accent}"></span>{esc(label)}</span>{byline}</div>'
        f'</article>'
    )


def generate_content(data):
    items_data = data["sections"]["news"].get("items", [])
    items = "".join(_news_card(n) for n in items_data)
    counts = Counter(n.get("type", "note") for n in items_data)
    filters = [(k, _TYPE.get(k, (k.title(), "violet"))[0], counts[k]) for k in counts]
    return scaffold(items, filters, len(items_data), sorts=[("year", "Newest first")],
                    batch=0, search_ph="Search updates…", default_sort="year")
