"""Redesigned content generator for the Service page (#service-content).

Flattens each ORGANIZATION within the service categories into a single list
card, wrapped in the generic interactive listview (search + category chips)
enhanced by assets/js/redesign/listview.js.

Section shape (content.json -> sections.service):
    {
      "title": ..., "tagline": ...,
      "categories": [
        {
          "title": "Professional Societies",
          "organizations": [
            {"name": "...", "positions": [ <position>, ... ]},
            ...
          ]
        },
        ...
      ]
    }

A <position> may be:
    - a plain string (rendered as-is), OR
    - an object with "role" and one of "term" / "period" / "periods"
      (periods is a list of period strings).

Some categories (e.g. "Manuscript Referee Service") carry "items"
({role, organization, period}) instead of "organizations"; both shapes render.
Categories and organizations flagged "hidden": true are skipped, and categories
with no visible rows produce no chip.
"""
import re

from pages_shared import scaffold, esc, attr_esc


def _slug(s):
    """Slugify a category title: lowercase, non-alphanumeric runs -> single hyphen."""
    s = re.sub(r"<[^>]+>", "", str(s or ""))           # strip any HTML tags
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return s or "cat"


def _strip_tags(s):
    """Remove HTML tags for building plain searchable/sortable text."""
    return re.sub(r"<[^>]+>", "", str(s or ""))


def _position_text(pos):
    """Render a single position as 'Role (period[, period])' (or just the string)."""
    if isinstance(pos, str):
        return pos.strip()
    if not isinstance(pos, dict):
        return str(pos or "").strip()

    role = (pos.get("role") or "").strip()

    # Gather period(s) from the various shapes the data may use.
    periods = []
    if isinstance(pos.get("periods"), list):
        periods = [str(p).strip() for p in pos["periods"] if str(p).strip()]
    elif pos.get("term"):
        periods = [str(pos["term"]).strip()]
    elif pos.get("period"):
        periods = [str(pos["period"]).strip()]

    when = ", ".join(periods)
    if role and when:
        return f"{role} ({when})"
    return role or when


def _organizations(category):
    """Return the list of organization dicts for a category (empty if none)."""
    orgs = category.get("organizations")
    return orgs if isinstance(orgs, list) else []


def generate_content(data):
    section = (data.get("sections", {}) or {}).get("service", {}) or {}
    categories = section.get("categories", []) or []

    items_html = []
    filters = []
    total = 0

    for category in categories:
        if category.get("hidden"):
            continue
        cat_title = category.get("title", "") or ""
        cat_slug = _slug(cat_title)
        orgs = [o for o in _organizations(category) if not (isinstance(o, dict) and o.get("hidden"))]
        extra = [it for it in (category.get("items") or []) if not (isinstance(it, dict) and it.get("hidden"))]

        # Unify the two shapes into (title_html, meta_text) rows.
        rows = []
        for org in orgs:
            pos_texts = [t for t in (_position_text(p) for p in (org.get("positions") or [])) if t]
            rows.append((org.get("name", "") or "", " · ".join(pos_texts)))
        for it in extra:
            meta = " · ".join(p for p in [(it.get("role") or "").strip(),
                                          (it.get("period") or it.get("term") or "").strip()] if p)
            rows.append((it.get("organization", "") or "", meta))

        if not rows:
            continue
        filters.append((cat_slug, cat_title, len(rows)))

        for title_html, meta_text in rows:
            title_plain = _strip_tags(title_html)
            search_src = (title_plain + " " + meta_text).strip()
            items_html.append(
                f'<article class="item accent-ic" data-lv-item '
                f'data-cat="{attr_esc(cat_slug)}" '
                f'data-search="{attr_esc(search_src)}" '
                f'data-year="0" data-num="0" '
                f'data-title="{attr_esc(title_plain)}">'
                f'<div class="item-head"><h3 class="item-title">{title_html}</h3></div>'
                f'<p class="item-meta">{esc(meta_text)}</p>'
                f'<div class="item-tags"><span class="badge">{esc(cat_title)}</span></div>'
                f'</article>'
            )
            total += 1

    return scaffold(
        "".join(items_html),
        filters,
        total,
        sorts=None,
        batch=0,
        search_ph="Search service…",
        default_sort="default",
    )
