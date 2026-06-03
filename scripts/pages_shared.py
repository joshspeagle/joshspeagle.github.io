"""Shared helpers for the redesigned per-page content generators
(pages_talks.py, pages_teaching.py, pages_mentorship.py, pages_awards.py, pages_service.py).

Each page module exposes `generate_content(data) -> str` returning the inner HTML for that
page's `#<page>-content` container. Use `scaffold(...)` to wrap the page's pre-rendered
cards in the generic interactive listview (search + filter chips + optional sort + load-more),
which is enhanced by assets/js/redesign/listview.js.

Per-item card convention (so listview.js can filter/search/sort):
  <article class="item accent-<cat>" data-lv-item
           data-cat="<key>"            (space-separated keys allowed; matches a filter chip)
           data-search="<lowercased searchable text: title + people + keywords>"
           data-year="<int>"           (for sort='year')
           data-num="<int>"            (secondary numeric sort, e.g. citations/count)
           data-title="<lowercased>">  (for sort='az')
     ...content (use .item-head/.item-title/.item-when/.item-meta/.item-tags, .badge/.tag)...
  </article>
"""
import re

def esc(s):
    """Escape bare & in plain text without double-encoding existing entities."""
    return re.sub(r"&(?!(?:amp|lt|gt|quot|#\d+);)", "&amp;", str(s or ""))

def attr_esc(s):
    """Lowercase + escape for a double-quoted HTML attribute value (data-search/title)."""
    return esc(str(s or "")).replace('"', "&quot;").lower()

def _chip(cat, label, count, active=False):
    dot = "" if cat == "all" else f'<span class="dot d-{cat}"></span>'
    cls = "chip is-active" if active else "chip"
    ap = "true" if active else "false"
    ct = f' <span class="ct">{count}</span>' if count is not None else ""
    return f'<button class="{cls}" data-cat="{cat}" aria-pressed="{ap}">{dot}{esc(label)}{ct}</button>'

def scaffold(items_html, filters, total, sorts=None, batch=20,
             search_ph="Search…", default_sort="default", heading="Results",
             empty_msg="No items match your search or filters."):
    """Wrap pre-rendered cards in the interactive listview root.

    filters: list of (cat_key, label, count) for category chips (the 'All' chip is added).
    total:   count shown on the 'All' chip.
    sorts:   list of (value, label) for the sort <select>, or None to omit sorting.
    batch:   load-more page size (0 = show all, no load-more button).
    """
    chips = [_chip("all", "All", total, active=True)]
    chips += [_chip(c, label, count) for (c, label, count) in filters]
    chips_html = "".join(chips)

    sort_html = ""
    if sorts:
        opts = "".join(f'<option value="{v}">{esc(label)}</option>' for v, label in sorts)
        sort_html = f'<select class="pub-sort" data-lv-sort-control aria-label="Sort">{opts}</select>'

    more_html = '<div class="pub-loadmore-wrap"><button type="button" class="btn btn-ghost" data-lv-more>Load more</button></div>' if batch else ""

    return (
        '<div class="container">\n'
        f'<h2 class="sr-only">{esc(heading)}</h2>\n'
        f'<div data-listview data-lv-batch="{batch}" data-lv-sort="{default_sort}">\n'
        '<div class="pub-controls">\n'
        f'<input type="search" class="pub-search" data-lv-search placeholder="{esc(search_ph)}" aria-label="{esc(search_ph)}">\n'
        f'{sort_html}\n'
        f'<div class="pub-filters" data-lv-filters role="group" aria-label="Filter">{chips_html}</div>\n'
        '</div>\n'
        f'<div class="pub-list" data-lv-list>{items_html}</div>\n'
        f'<p class="pub-empty" data-lv-empty hidden>{esc(empty_msg)} <button type="button" class="linkbtn" data-lv-reset>Show all</button></p>\n'
        f'{more_html}\n'
        '</div>\n'
        '</div>'
    )
