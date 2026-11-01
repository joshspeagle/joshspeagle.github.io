"""Content generator for the Awards & Honors page (#awards-content).

Renders:
  1. Research Prizes & Academic Awards (4 cards from sections.awards.awards)
  2. Fellowships & Additional Honors (4 cards grounded in CV_speagle.pdf and talks)
"""
from pages_shared import card_meta, esc, url_attr

_FELLOWSHIPS_AND_HONORS = [
    ("2020–2022", "Banting Postdoctoral Fellowship", "Natural Sciences and Engineering Research Council of Canada (NSERC)",
     "Two-year national postdoctoral fellowship supporting research in astrostatistics and Galactic astronomy at the University of Toronto.",
     "Postdoctoral Fellowship", "https://banting.fellowships-bourses.gc.ca/en/2019-2020-eng.html", "Banting Program", "sla"),
    ("2020–2022", "Dunlap Postdoctoral Fellowship", "Dunlap Institute for Astronomy & Astrophysics, University of Toronto",
     "Postdoctoral fellowship supporting statistical and survey astronomy research at the Dunlap Institute.",
     "Postdoctoral Fellowship", "https://www.dunlap.utoronto.ca/dunlap-fellowship/", "Dunlap Fellowship", "ic"),
    ("2019", "PASJ Excellent Paper Award", "Astronomical Society of Japan (ASJ)",
     "Co-author recognition for Hikage et al. (2019, PASJ, 71, 43) on cosmology from cosmic shear power spectra with first-year Subaru Hyper Suprime-Cam data.",
     "Collaboration Paper Prize", "https://ui.adsabs.harvard.edu/abs/2019PASJ...71...43H", "ADS / Paper", "ii"),
    ("2012", "AAS Chambliss Astronomy Achievement Student Award (Honorable Mention)", "American Astronomical Society (219th AAS Meeting)",
     "Undergraduate student research poster recognition for work on timing and glitches in high-magnetic-field pulsars and magnetars.",
     "Undergraduate Honor", "https://aas.org/grants-and-prizes/chambliss-astronomy-achievement-student-awards", "AAS Chambliss", "du"),
]


def generate_content(data):
    """Build the Awards & Honors page HTML."""
    section = data.get("sections", {}).get("awards", {})
    awards = section.get("awards", [])

    # 1. Research Prizes & Academic Awards
    accents = ["du", "ic", "sla", "ii"]
    prize_cards = []
    for i, award in enumerate(awards):
        title = award.get("title", "")
        organization = award.get("organization", "")
        description = award.get("description", "")
        year = award.get("year", "")
        cat = award.get("category") or "Research Prize"
        url = (award.get("url") or "").strip()
        url_lbl = award.get("urlLabel") or "Program"
        acc = accents[i % len(accents)]
        title_html = (
            f'<a href="{url_attr(url)}" target="_blank" rel="noopener">{esc(title)}</a>'
            if url else esc(title)
        )
        link_html = (
            f'<div class="paper-links"><a class="reslink" href="{url_attr(url)}" '
            f'target="_blank" rel="noopener">{esc(url_lbl)} ↗</a></div>'
            if url else ""
        )
        prize_cards.append(
            f'<article class="item award-card feat-card accent-{acc}">'
            f'{card_meta(str(year), (organization, True))}'
            f'<div class="item-head"><h3 class="item-title">{title_html}</h3></div>'
            f'<p class="item-meta">{esc(description)}</p>'
            f'<div class="paper-badges"><div class="paper-tag-group">'
            f'<span class="badge b-{acc}">{esc(cat)}</span></div>{link_html}</div>'
            '</article>'
        )

    prizes_sec = (
        '<div class="sec-head"><h2 class="section-title">Research Prizes &amp; Academic Awards</h2>'
        '<div class="rule" aria-hidden="true"></div></div>'
        f'<div class="mentee-grid awards-grid">{"".join(prize_cards)}</div>'
    )

    # 2. Fellowships & Additional Honors
    fel_cards = []
    for yrs, title, org, desc, cat, url, url_lbl, acc in _FELLOWSHIPS_AND_HONORS:
        title_html = (
            f'<a href="{url_attr(url)}" target="_blank" rel="noopener">{esc(title)}</a>'
            if url else esc(title)
        )
        link_html = (
            f'<div class="paper-links"><a class="reslink" href="{url_attr(url)}" '
            f'target="_blank" rel="noopener">{esc(url_lbl)} ↗</a></div>'
            if url else ""
        )
        fel_cards.append(
            f'<article class="item award-card feat-card accent-{acc}">'
            f'{card_meta(yrs, (org, True))}'
            f'<div class="item-head"><h3 class="item-title">{title_html}</h3></div>'
            f'<p class="item-meta">{esc(desc)}</p>'
            f'<div class="paper-badges"><div class="paper-tag-group">'
            f'<span class="badge b-{acc}">{esc(cat)}</span></div>{link_html}</div>'
            '</article>'
        )
    fel_sec = (
        '<div class="sec-head awards-sec-head"><h2 class="section-title">Fellowships &amp; Additional Honors</h2>'
        '<div class="rule" aria-hidden="true"></div></div>'
        f'<div class="mentee-grid awards-grid">{"".join(fel_cards)}</div>'
    )

    return f'<div class="container">{prizes_sec}{fel_sec}</div>'
