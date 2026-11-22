"""Content generator for the Awards & Honors page (#awards-content).

Renders:
  1. Research Prizes & Academic Awards (from sections.awards.awards)
  2. Fellowships & Additional Honors (from sections.awards.fellowships)
"""
from pages_shared import (accent_class, card_meta, esc, expand_item_citations,
                          load_publications_by_bibcode, url_attr)


def _render_cards(entries, default_accents, pubs_by_bib):
    cards = []
    for i, entry in enumerate(entries):
        title = entry.get("title", "")
        organization = entry.get("organization", "")
        bib = (entry.get("paperBibcode") or "").strip()
        description = expand_item_citations(entry.get("description", ""), bib, pubs_by_bib)
        year = str(entry.get("year") or "")
        cat = entry.get("category") or "Research Prize"
        url = (entry.get("url") or "").strip() or (f"https://ui.adsabs.harvard.edu/abs/{bib}" if bib else "")
        url_lbl = entry.get("urlLabel") or ("ADS / Paper" if bib else "Program")
        acc = accent_class(entry.get("accent") or default_accents[i % len(default_accents)], f"award {title!r}")
        title_html = (
            f'<a href="{url_attr(url)}" target="_blank" rel="noopener">{esc(title)}</a>'
            if url else esc(title)
        )
        link_html = (
            f'<div class="paper-links"><a class="reslink" href="{url_attr(url)}" '
            f'target="_blank" rel="noopener">{esc(url_lbl)} ↗</a></div>'
            if url else ""
        )
        cards.append(
            f'<article class="item award-card feat-card accent-{acc}">'
            f'{card_meta(year, (organization, True))}'
            f'<div class="item-head"><h3 class="item-title">{title_html}</h3></div>'
            f'<p class="item-meta">{esc(description)}</p>'
            f'<div class="paper-badges"><div class="paper-tag-group">'
            f'<span class="badge b-{acc}">{esc(cat)}</span></div>{link_html}</div>'
            '</article>'
        )
    return "".join(cards)


def generate_content(data):
    """Build the Awards & Honors page HTML."""
    section = data.get("sections", {}).get("awards", {})
    pubs_by_bib = load_publications_by_bibcode()
    prizes_html = _render_cards(section.get("awards", []), ["du", "ic", "sla", "ii"], pubs_by_bib)
    prizes_sec = (
        '<div class="sec-head"><h2 class="section-title">Research Prizes &amp; Academic Awards</h2>'
        '<div class="rule" aria-hidden="true"></div></div>'
        f'<div class="mentee-grid awards-grid">{prizes_html}</div>'
    )
    fel_html = _render_cards(section.get("fellowships", []), ["sla", "ic", "ii", "du"], pubs_by_bib)
    fel_sec = (
        '<div class="sec-head awards-sec-head"><h2 class="section-title">Fellowships &amp; Additional Honors</h2>'
        '<div class="rule" aria-hidden="true"></div></div>'
        f'<div class="mentee-grid awards-grid">{fel_html}</div>'
    ) if fel_html else ""
    return f'<div class="container">{prizes_sec}{fel_sec}</div>'
