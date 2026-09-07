"""News & Press page content. generate_content(data) -> inner HTML for #news-content.

Item types (label + accent colour class) are declared in content.json under
sections.news.types; an item whose type is undeclared falls back to a neutral badge
and prints a build warning.
"""
from collections import Counter

from pages_shared import (accent_class, attr_esc, card_meta, esc, scaffold, slug,
                          url_attr, warn)

_FALLBACK = {"label": "Update", "accent": "mute"}


def _type_meta(types, typ):
    meta = types.get(typ)
    if not meta:
        warn(f"news item type {typ!r} is not declared in sections.news.types; "
             f"using a neutral badge")
        return {"label": str(typ or "Update").title(), "accent": _FALLBACK["accent"]}
    return meta


def _news_card(n, meta_by_type):
    typ = n.get("type", "note")
    meta = meta_by_type[typ]
    label = meta.get("label", typ)
    accent = accent_class(meta.get("accent", _FALLBACK["accent"]), f"news type {typ!r}")
    year = n.get("year", 0)
    link = n.get("link", "")
    outlet = n.get("outlet", "")
    cta = f"Read at {outlet} →" if outlet else "Read more →"
    more = f' <a class="reslink" href="{url_attr(link)}" target="_blank" rel="noopener">{esc(cta)}</a>' if link else ""
    byline_html = (f'<div class="item-tags"><span class="news-outlet">{esc(outlet)}</span></div>'
                   if outlet else "")
    search = attr_esc(f'{n.get("title","")} {n.get("blurb","")} {outlet} {label}')
    return (
        f'<article class="item accent-{accent}" data-lv-item data-cat="{slug(typ)}" data-search="{search}" '
        f'data-year="{year}" data-num="{year}" data-title="{attr_esc(n.get("title",""))}">'
        f'{card_meta(n.get("date", ""), (label, True))}'
        f'<div class="item-head"><h3 class="item-title">{esc(n.get("title",""))}</h3></div>'
        f'<div class="item-meta">{esc(n.get("blurb",""))}{more}</div>'
        f'{byline_html}'
        f'</article>'
    )


def generate_content(data):
    section = data["sections"]["news"]
    types = section.get("types", {}) or {}
    items_data = section.get("items", [])
    counts = Counter(n.get("type", "note") for n in items_data)
    # Resolve each type once (one build warning per undeclared type, not one per card).
    meta_by_type = {k: _type_meta(types, k) for k in counts}
    items = "".join(_news_card(n, meta_by_type) for n in items_data)
    filters = [(k, meta_by_type[k].get("label", k),
                counts[k], meta_by_type[k].get("accent", _FALLBACK["accent"]))
               for k in counts]
    return scaffold(items, filters, len(items_data), sorts=[("year", "Newest first")],
                    batch=0, search_ph="Search updates…", default_sort="year")
