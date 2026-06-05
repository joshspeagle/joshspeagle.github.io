"""Redesigned content generator for the Service page (#service-content).

Emits ONE card per role/position (not per organization), wrapped in the generic
interactive listview (search + color-coded category chips) enhanced by
assets/js/redesign/listview.js. Card: title = the role; byline = the parent org;
the period shows as the date and an optional `note` as a sub-line.

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
    - an object with "role", one of "term" / "period" / "periods", and optionally
      an explicit "title" (then the role moves into the byline) and a "note".

Some categories (e.g. "Manuscript Referee Service") carry "items"
({role, organization, period}) instead of "organizations"; both shapes render.
Categories and organizations flagged "hidden": true are skipped, and categories
with no visible cards produce no chip. Each category is color-coded via its slug
(see .item.accent-<slug> / .d-<slug> in redesign.css).
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


def _period_text(pos):
    """Joined period string for a position dict ('' if none)."""
    if not isinstance(pos, dict):
        return ""
    if isinstance(pos.get("periods"), list):
        return ", ".join(str(p).strip() for p in pos["periods"] if str(p).strip())
    return str(pos.get("term") or pos.get("period") or "").strip()


def _end_year(period):
    """End year for sorting (newest first): ongoing roles ('…-Present') sort top,
    else the latest year mentioned, else 0."""
    if "present" in str(period or "").lower():
        return 9999
    years = re.findall(r"(?:19|20)\d{2}", str(period or ""))
    return max(int(y) for y in years) if years else 0


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

        # One card per role/position. title = the role (or an explicit `title`, in
        # which case the role drops into the byline); byline = parent org; the
        # period shows as the date, an optional `note` as a sub-line.
        cards = []   # (title, byline, period, note)
        for org in orgs:
            org_name = (org.get("name", "") or "").strip()
            for pos in (org.get("positions") or []):
                if isinstance(pos, str):
                    cards.append((pos.strip(), org_name, "", ""))
                    continue
                role = (pos.get("role") or "").strip()
                period = _period_text(pos)
                note = (pos.get("note") or "").strip()
                if pos.get("title"):
                    title = pos["title"].strip()
                    byline = " · ".join(x for x in (role, org_name) if x)
                else:
                    title, byline = role, org_name
                cards.append((title, byline, period, note))
        for it in extra:                                   # {role, organization, period} shape
            cards.append(((it.get("organization", "") or "").strip(),
                          (it.get("role") or "").strip(),
                          (it.get("period") or it.get("term") or "").strip(), ""))

        if not cards:
            continue
        filters.append((cat_slug, cat_title, len(cards)))

        for title, byline, period, note in cards:
            search_src = " ".join(_strip_tags(x) for x in (title, byline, period, note, cat_title)).strip()
            year = _end_year(period)
            when_html = f'<span class="item-when">{esc(period)}</span>' if period else ""
            meta_html = f'<p class="item-meta">{esc(byline)}</p>' if byline else ""
            note_html = f'<p class="item-sub">{esc(note)}</p>' if note else ""
            items_html.append(
                f'<article class="item accent-{attr_esc(cat_slug)}" data-lv-item '
                f'data-cat="{attr_esc(cat_slug)}" '
                f'data-search="{attr_esc(search_src)}" '
                f'data-year="{year}" data-num="{year}" '
                f'data-title="{attr_esc(_strip_tags(title))}">'
                f'<div class="item-head"><h3 class="item-title">{esc(title)}</h3>{when_html}</div>'
                f'{meta_html}{note_html}'
                f'<div class="item-tags"><span class="badge talk-badge">'
                f'<span class="dot d-{attr_esc(cat_slug)}"></span>{esc(cat_title)}</span></div>'
                f'</article>'
            )
            total += 1

    return scaffold(
        "".join(items_html),
        filters,
        total,
        sorts=[("year", "Newest first"), ("default", "By category")],
        batch=0,
        search_ph="Search service…",
        default_sort="year",
    )
