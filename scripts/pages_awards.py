"""Redesign content generator for the Awards & Honors page (#awards-content).

Exposes generate_content(data) -> str, returning the inner HTML for the
#awards-content container: one .item card per award, wrapped in the generic
interactive listview via pages_shared.scaffold().
"""
from pages_shared import scaffold, esc, attr_esc


def generate_content(data):
    """Build the awards listview HTML from content.json's sections.awards.awards."""
    section = data.get("sections", {}).get("awards", {})
    awards = section.get("awards", [])

    items = []
    for award in awards:
        title = award.get("title", "")
        organization = award.get("organization", "")
        description = award.get("description", "")
        year = award.get("year", "")

        # Numeric year for sorting; fall back to 0 if missing/non-numeric.
        try:
            year_num = int(year)
        except (TypeError, ValueError):
            year_num = 0

        # data-search / data-title: lowercased, attribute-safe, no HTML tags.
        # These fields are plain text, so attr_esc handles lowercasing + escaping.
        data_title = attr_esc(title)
        data_search = attr_esc(f"{title} {organization}")

        meta = f"{esc(organization)} — {esc(description)}"

        items.append(
            f'<article class="item accent-du" data-lv-item '
            f'data-cat="award" '
            f'data-search="{data_search}" '
            f'data-year="{year_num}" '
            f'data-num="{year_num}" '
            f'data-title="{data_title}">'
            f'<div class="item-head">'
            f'<h3 class="item-title">{esc(title)}</h3>'
            f'<span class="item-when">{esc(year)}</span>'
            f'</div>'
            f'<p class="item-meta">{meta}</p>'
            f'</article>'
        )

    items_html = "".join(items)

    return scaffold(
        items_html,
        filters=[],
        total=len(awards),
        sorts=[("year", "Newest first"), ("az", "A–Z")],
        batch=0,
        search_ph="Search awards…",
        default_sort="year",
    )
