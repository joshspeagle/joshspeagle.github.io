"""News & Press page content. generate_content(data) -> inner HTML for #news-content.

Renders:
  1. Topline News & Press Stat Tiles
  2. Featured Press & Research Highlights 3-card spotlight grid (data-lv-pinned)
  3. Filterable chronological news feed
"""
from collections import Counter

from pages_shared import (accent_class, attr_esc, card_meta, esc, scaffold, slug,
                          strip_tags, term_month, url_attr, warn)

_FALLBACK = {"label": "Update", "accent": "mute"}

_FEATURED_TITLES = {
    "ChronoFlow: an AI model for the ages of stars",
    "A 5-D map of the Milky Way: AAS Nova featured image",
    "DECaPS2: a survey of 3.3 billion objects in the Milky Way's plane",
}


def _type_meta(types, typ):
    meta = types.get(typ)
    if not meta:
        warn(f"news item type {typ!r} is not declared in sections.news.types; "
             f"using a neutral badge")
        return {"label": str(typ or "Update").title(), "accent": _FALLBACK["accent"]}
    return meta


def _sort_num(n):
    year = int(n.get("year") or 0)
    date_str = str(n.get("date") or "")
    first_tok = date_str.split()[0] if date_str.split() else ""
    return year * 100 + term_month(first_tok)


def _linked_title(title_raw, link):
    """Wrap title in an outbound link only when the title does not already contain inline <a> tags."""
    if link and "<a " not in str(title_raw):
        target = "" if link.endswith(".html") or ".html#" in link else ' target="_blank" rel="noopener"'
        return f'<a href="{url_attr(link)}"{target}>{esc(title_raw)}</a>'
    return esc(title_raw)


def _links_html(n):
    out = []
    link = (n.get("link") or "").strip()
    outlet = (n.get("outlet") or "").strip()
    link_label = (n.get("linkLabel") or "").strip()
    if link:
        is_local = link.endswith(".html") or ".html#" in link
        arrow = "→" if is_local else "↗"
        target = "" if is_local else ' target="_blank" rel="noopener"'
        if link_label:
            cta = f"{link_label} {arrow}"
        elif outlet:
            cta = f"Read at {outlet} {arrow}"
        else:
            cta = f"Read article {arrow}"
        out.append(f'<a class="reslink" href="{url_attr(link)}"{target}>{esc(cta)}</a>')
    paper_link = (n.get("paperLink") or "").strip()
    if paper_link:
        out.append(f'<a class="reslink" href="{url_attr(paper_link)}" target="_blank" rel="noopener">ADS / Paper ↗</a>')
    return "".join(out)


def _featured_press_card(n, meta_by_type):
    typ = n.get("type", "press")
    meta = meta_by_type.get(typ, _FALLBACK)
    label = meta.get("label", typ)
    accent = accent_class(meta.get("accent", _FALLBACK["accent"]), f"news type {typ!r}")
    link = n.get("link", "")
    outlet = n.get("outlet", "")
    tags_html = f'<span class="badge b-{accent}">{esc(label)}</span>'
    if outlet:
        tags_html += f'<span class="tag tag-institution">{esc(outlet)}</span>'
    return (
        f'<article class="item feat-card accent-{accent}">'
        f'{card_meta(n.get("date", ""), (outlet or label, True))}'
        f'<h3 class="item-title">{_linked_title(n.get("title", ""), link)}</h3>'
        f'<p class="item-meta">{esc(n.get("blurb", ""))}</p>'
        f'<div class="paper-badges"><div class="paper-tag-group">{tags_html}</div>'
        f'<div class="paper-links">{_links_html(n)}</div></div>'
        f'</article>'
    )


def _news_card(n, meta_by_type):
    typ = n.get("type", "note")
    meta = meta_by_type[typ]
    label = meta.get("label", typ)
    accent = accent_class(meta.get("accent", _FALLBACK["accent"]), f"news type {typ!r}")
    year = n.get("year", 0)
    link = n.get("link", "")
    outlet = n.get("outlet", "")
    tags_html = f'<span class="badge b-{accent}">{esc(label)}</span>'
    if outlet:
        tags_html += f'<span class="tag tag-institution">{esc(outlet)}</span>'
    search = attr_esc(f'{strip_tags(n.get("title",""))} {strip_tags(n.get("blurb",""))} {outlet} {label}')
    return (
        f'<article class="item accent-{accent}" data-lv-item data-cat="{slug(typ)}" data-search="{search}" '
        f'data-year="{year}" data-num="{_sort_num(n)}" data-title="{attr_esc(n.get("title",""))}">'
        f'{card_meta(n.get("date", ""), (label, True))}'
        f'<div class="item-head"><h3 class="item-title">{_linked_title(n.get("title",""), link)}</h3></div>'
        f'<p class="item-meta">{esc(n.get("blurb",""))}</p>'
        f'<div class="paper-badges"><div class="paper-tag-group">{tags_html}</div>'
        f'<div class="paper-links">{_links_html(n)}</div></div>'
        f'</article>'
    )


def generate_content(data):
    section = data["sections"]["news"]
    types = section.get("types", {}) or {}
    items_data = section.get("items", [])
    counts = Counter(n.get("type", "note") for n in items_data)
    meta_by_type = {k: _type_meta(types, k) for k in counts}

    stats_html = (
        '<div class="container">\n'
        '<div class="pub-stats" aria-label="News and press summary">\n'
        f'<div class="pub-stat role-tile-primary"><div class="n">{len(items_data)}</div><div class="l">Updates &amp; Highlights</div></div>\n'
        f'<div class="pub-stat role-tile-postdoc"><div class="n">{counts.get("press", 0)}</div><div class="l">Press &amp; Media Features</div></div>\n'
        f'<div class="pub-stat role-tile-student"><div class="n">{counts.get("group", 0)}</div><div class="l">Group &amp; Student Milestones</div></div>\n'
        f'<div class="pub-stat role-tile-significant"><div class="n">{counts.get("award", 0) + counts.get("paper", 0) + counts.get("software", 0)}</div><div class="l">Awards &amp; Research Releases</div></div>\n'
        '</div>\n'
        '</div>\n'
    )

    featured_items = [n for n in items_data if n.get("title") in _FEATURED_TITLES]
    if len(featured_items) < 3:
        featured_items = [n for n in items_data if n.get("type") == "press"][:3]
    featured_html = (
        '<section class="pub-featured" data-lv-pinned aria-labelledby="news-featured-heading">\n'
        '<h2 id="news-featured-heading" class="pub-featured-head">Featured Press &amp; Research Highlights</h2>\n'
        f'<div class="featured-grid">{"".join(_featured_press_card(n, meta_by_type) for n in featured_items)}</div>\n'
        '</section>\n'
    ) if featured_items else ""

    items = "".join(_news_card(n, meta_by_type) for n in items_data)
    filters = [(k, meta_by_type[k].get("label", k),
                counts[k], meta_by_type[k].get("accent", _FALLBACK["accent"]))
               for k in counts]
    return stats_html + scaffold(
        items, filters, len(items_data), sorts=[("year", "Newest first")],
        batch=0, search_ph="Search news, press outlets, students, or discoveries…",
        default_sort="year", pinned_html=featured_html,
    )
