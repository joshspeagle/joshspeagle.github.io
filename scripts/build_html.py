#!/usr/bin/env python3
"""
Build script to inject static HTML content into page templates.

Reads content.json and generates static HTML for SEO and performance.
JS content-loader.js acts as progressive enhancement (skips populated containers).

Usage: python scripts/build_html.py
"""

import json
import math
import re
import sys
from pathlib import Path

# Project root is one level up from scripts/
PROJECT_ROOT = Path(__file__).resolve().parent.parent
CONTENT_JSON = PROJECT_ROOT / "assets" / "data" / "content.json"
PUBLICATIONS_JSON = PROJECT_ROOT / "assets" / "data" / "publications_data.json"

# Redesign per-page content generators (scripts/ on path so they import cleanly)
sys.path.insert(0, str(Path(__file__).resolve().parent))
from pages_talks import generate_content as gen_talks
from pages_teaching import generate_content as gen_teaching
from pages_mentorship import generate_content as gen_mentorship
from pages_awards import generate_content as gen_awards
from pages_service import generate_content as gen_service
from pages_software import generate_content as gen_software
from pages_news import generate_content as gen_news

# HTML files to process
HTML_FILES = {
    "index": PROJECT_ROOT / "index.html",
    "publications": PROJECT_ROOT / "publications.html",
    "mentorship": PROJECT_ROOT / "mentorship.html",
    "talks": PROJECT_ROOT / "talks.html",
    "teaching": PROJECT_ROOT / "teaching.html",
    "awards": PROJECT_ROOT / "awards.html",
    "service": PROJECT_ROOT / "service.html",
    "software": PROJECT_ROOT / "software.html",
    "news": PROJECT_ROOT / "news.html",
}

# GitHub SVG icon used in quick links
def _find_closing_tag(html, tag_name, start_after):
    """Find the matching closing tag for an element, handling nesting.

    start_after: index in html right after the opening tag's '>'
    Returns the index of the start of the matching </tag> or -1.
    """
    depth = 1
    pos = start_after
    open_pattern = re.compile(r"<" + re.escape(tag_name) + r"[\s>/]", re.IGNORECASE)
    close_pattern = re.compile(r"</" + re.escape(tag_name) + r"\s*>", re.IGNORECASE)

    while depth > 0 and pos < len(html):
        # Find the next opening or closing tag of same type
        open_match = open_pattern.search(html, pos)
        close_match = close_pattern.search(html, pos)

        if close_match is None:
            return -1  # Malformed HTML

        if open_match is not None and open_match.start() < close_match.start():
            # Check it's not a self-closing tag like <br/> or void element
            # Find the end of this opening tag
            tag_end = html.find(">", open_match.start())
            if tag_end != -1 and html[tag_end - 1] == "/":
                # Self-closing, skip it
                pos = tag_end + 1
            else:
                depth += 1
                pos = tag_end + 1 if tag_end != -1 else open_match.end()
        else:
            depth -= 1
            if depth == 0:
                return close_match.start()
            pos = close_match.end()

    return -1


def replace_container_content(html, selector_type, selector, new_content):
    """Replace content inside a container element.

    selector_type: 'id' or 'class'
    selector: the id value or class name to match
    new_content: HTML string to place inside the container

    Returns the modified HTML string.
    """
    if selector_type == "id":
        pattern = re.compile(
            r"<(\w+)\b[^>]*\bid\s*=\s*[\"']" + re.escape(selector) + r"[\"'][^>]*>",
            re.DOTALL,
        )
    elif selector_type == "class":
        pattern = re.compile(
            r"<(\w+)\b[^>]*\bclass\s*=\s*[\"'][^\"']*\b"
            + re.escape(selector)
            + r"\b[^\"']*[\"'][^>]*>",
            re.DOTALL,
        )
    else:
        return html

    match = pattern.search(html)
    if not match:
        return html

    tag_name = match.group(1)
    content_start = match.end()  # Right after the opening tag's '>'
    closing_start = _find_closing_tag(html, tag_name, content_start)

    if closing_start == -1:
        return html

    replacement = "\n" + new_content + "\n"
    return html[:content_start] + replacement + html[closing_start:]


def _esc(s):
    """Escape bare & in plain-text fields without double-encoding existing entities."""
    return re.sub(r"&(?!(?:amp|lt|gt|quot|#\d+);)", "&amp;", str(s or ""))

_HOME_ICONS = [
    ('<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="13" cy="12" r="2"/><circle cx="20" cy="6" r="2"/><circle cx="20" cy="18" r="2"/><path d="M7 6.6 11 11M7 17.4 11 13M15 11l4-4M15 13l4 4"/></svg>', "sla"),
    ('<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="M14.5 14.5 20 20"/><path d="M10 7.5v5M7.5 10h5"/></svg>', "ii"),
    ('<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 19h18"/><path d="M3 19c4 0 4-12 9-12s5 12 9 12"/></svg>', "ic"),
    ('<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12c5-3 9-1 9-1s-3 5-9 4-9 1-9 1 4-1 9-4z"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><path d="M3 16c2 0 3-1 3-1M21 8s-1 1-3 1"/></svg>', "du"),
]


def generate_home_about(data):
    about = data["sections"]["about"]
    return (
        '<div class="container">\n'
        '<p class="section-kicker">Who I am</p>\n'
        '<h2 class="section-title">Astrostatistics at the University of Toronto</h2>\n'
        f'<p class="about">{about.get("content", "")}</p>\n'
        "</div>"
    )


def generate_home_research(data):
    areas = data["sections"]["research"]["areas"][:4]
    cards = []
    for i, area in enumerate(areas):
        icon, cls = _HOME_ICONS[i] if i < len(_HOME_ICONS) else _HOME_ICONS[-1]
        cards.append(
            f'<article class="research-card {cls}">{icon}'
            f'<h3>{_esc(area.get("title", ""))}</h3>'
            f'<p>{_esc(area.get("description", ""))}</p></article>'
        )
    intro = ("I develop statistical &amp; machine-learning methods and apply them to the largest "
             "astronomical surveys — from billions of stars and galaxies down to individual objects.")
    return (
        '<div class="container">\n'
        '<p class="section-kicker">What I do</p>\n'
        '<h2 class="section-title">Four research areas</h2>\n'
        f'<p class="section-intro">{intro}</p>\n'
        f'<div class="research-grid">{"".join(cards)}</div>\n'
        "</div>"
    )


def generate_home_team(data):
    team = data["sections"]["team"]
    hls = "".join(
        f'<div class="card"><h3>{_esc(h.get("title", ""))}</h3><p>{_esc(h.get("content", ""))}</p></div>'
        for h in team.get("highlights", [])
    )
    btns = []
    for c in team.get("cta", []):
        cls = "btn-primary" if c.get("type") == "primary" else "btn-ghost"
        btns.append(f'<a class="btn {cls}" href="{c.get("url", "#")}">{_esc(c.get("text", ""))}</a>')
    return (
        '<div class="container">\n'
        '<p class="section-kicker">The team</p>\n'
        f'<h2 class="section-title">{_esc(team.get("title", ""))}</h2>\n'
        f'<p class="team-tagline">{_esc(team.get("tagline", ""))}</p>\n'
        f'<p class="lead">{team.get("content", "")}</p>\n'
        f'<div class="grid-2" style="margin-top:var(--space-5)">{hls}</div>\n'
        f'<div class="cta" style="margin-top:var(--space-6)">{"".join(btns)}</div>\n'
        "</div>"
    )


def generate_home_collab(data):
    collab = data["sections"]["collaboration"]
    cards = []
    for c in collab.get("opportunities", {}).get("cards", []):
        fel = ""
        f = c.get("fellowships")
        if f and f.get("links"):
            links = " · ".join(
                f'<a href="{l.get("url", "#")}">{_esc(l.get("name", ""))}</a>' for l in f["links"]
            )
            fel = f'<p class="fellowships">{_esc(f.get("intro", "Fellowships:"))} {links}</p>'
        cards.append(
            f'<div class="card"><h3>{_esc(c.get("title", ""))}</h3>'
            f'<p>{_esc(c.get("content", ""))}</p>{fel}</div>'
        )
    vals = "".join(
        f'<div class="card"><h3>{_esc(v.get("title", ""))}</h3><p>{_esc(v.get("content", ""))}</p></div>'
        for v in collab.get("values", {}).get("items", [])
    )
    return (
        '<div class="container">\n'
        '<p class="section-kicker">Join us</p>\n'
        f'<h2 class="section-title">{_esc(collab.get("title", ""))}</h2>\n'
        f'<p class="section-intro">{_esc(collab.get("intro", ""))}</p>\n'
        f'<div class="grid-3">{"".join(cards)}</div>\n'
        f'<div class="grid-2" style="margin-top:var(--space-6)">{vals}</div>\n'
        "</div>"
    )


def generate_home_bio(data):
    bio = data["sections"]["biography"]
    items = "".join(
        '<div class="tl-item">'
        f'<div class="tl-date">{_esc(t.get("date", ""))}</div>'
        f'<div class="tl-title">{_esc(t.get("title", ""))}</div>'
        f'<div class="tl-loc">{_esc(t.get("location", ""))}</div>'
        f'<div class="tl-content">{t.get("content", "")}</div>'
        "</div>"
        for t in bio.get("timeline", [])
    )
    return (
        '<div class="container">\n'
        '<p class="section-kicker">Short biography</p>\n'
        f'<h2 class="section-title">{_esc(bio.get("title", ""))}</h2>\n'
        f'<div class="timeline">{items}</div>\n'
        f'<p class="personal-note">{_esc(bio.get("personalNote", ""))}</p>\n'
        "</div>"
    )


# ---------------------------------------------------------------------------
# Publications page generator (redesign)
# ---------------------------------------------------------------------------

# researchArea label -> (key, badge label with escaped &)
_PUB_CAT_MAP = {
    "Statistical Learning & AI": ("sla", "Statistical Learning &amp; AI"),
    "Interpretability & Insight": ("ii", "Interpretability &amp; Insight"),
    "Inference & Computation": ("ic", "Inference &amp; Computation"),
    "Discovery & Understanding": ("du", "Discovery &amp; Understanding"),
}

# Stable order for emitting category badges (matches the 4 areas)
_PUB_CAT_ORDER = [
    "Statistical Learning & AI",
    "Interpretability & Insight",
    "Inference & Computation",
    "Discovery & Understanding",
]


def _attr_esc(s):
    """Lowercase and attribute-escape a value for data-* attributes (escape & and ")."""
    s = str(s or "").lower()
    s = s.replace("&", "&amp;")
    s = s.replace('"', "&quot;")
    return s


def _format_author(author):
    """Convert an author string to 'F. Last' initials form.

    Handles 'Last, First M.' and 'First M. Last' formats. Returns (display, is_speagle).
    """
    is_speagle = "speagle" in author.lower()
    if "," in author:
        last, _, first = author.partition(",")
        last = last.strip()
        first = first.strip()
    else:
        parts = author.strip().split()
        if len(parts) >= 2:
            last = parts[-1]
            first = " ".join(parts[:-1])
        else:
            last = author.strip()
            first = ""
    initial = ""
    fp = first.strip()
    if fp:
        # Use the first alphabetic character of the first name as the initial
        for ch in fp:
            if ch.isalpha():
                initial = ch.upper() + ". "
                break
    display = _esc(f"{initial}{last}".strip())
    if is_speagle:
        display = f"<strong>{display}</strong>"
    return display


def _format_authors_html(authors):
    """Show first 3 authors as 'F. Last', append ' et al.' if more than 3."""
    if not authors:
        return ""
    shown = [_format_author(a) for a in authors[:3]]
    html = ", ".join(shown)
    if len(authors) > 3:
        html += " et al."
    return html


def _generate_paper_card(pub):
    """Build a single .paper article card per the contract."""
    title = pub.get("title", "")
    year = pub.get("year", "")
    journal = pub.get("journal", "")
    authors = pub.get("authors", []) or []
    cites_int = int(pub.get("citations", 0) or 0)
    cites_comma = f"{cites_int:,}"

    research_area = pub.get("researchArea", "")
    catkey = _PUB_CAT_MAP.get(research_area, ("du", "Discovery &amp; Understanding"))[0]

    is_student = pub.get("authorshipCategory") == "student"
    is_featured = bool(pub.get("featured"))

    # Class list and student tag
    cls = f"paper {catkey}"
    if is_student:
        cls += " student"

    tags = ""
    if is_featured:
        tags += '<span class="tag feat">★ Featured</span>'
    if is_student:
        tags += '<span class="tag stu">Student-led</span>'

    # Category badges for any category >= 0.20
    probs = pub.get("categoryProbabilities", {}) or {}
    badges = ""
    for cat in _PUB_CAT_ORDER:
        prob = probs.get(cat, 0)
        try:
            prob = float(prob)
        except (TypeError, ValueError):
            prob = 0
        if prob >= 0.20:
            key, label = _PUB_CAT_MAP[cat]
            badges += f'<span class="badge b-{key}">{label}</span>'

    # Links
    links = ""
    if pub.get("adsUrl"):
        links += (
            f'<a class="reslink" href="{pub["adsUrl"]}" '
            f'target="_blank" rel="noopener">ADS</a>'
        )
    if pub.get("doi"):
        links += (
            f'<a class="reslink" href="https://doi.org/{pub["doi"]}" '
            f'target="_blank" rel="noopener">DOI</a>'
        )

    authors_html = _format_authors_html(authors)
    meta = " · ".join(
        part for part in [authors_html, _esc(journal), str(year)] if part
    )

    return (
        f'<article class="{cls}" data-cat="{catkey}" data-year="{year}" '
        f'data-cites="{cites_int}" data-title="{_attr_esc(title)}" '
        f'data-authors="{_attr_esc(" ".join(authors))}">'
        f'<div class="paper-main">'
        f'<h3 class="paper-title">{_esc(title)}</h3>'
        f'<div class="paper-meta">{meta}</div>'
        f'<div class="paper-badges">{tags}{badges}'
        f'<span class="paper-links">{links}</span></div>'
        f'</div>'
        f'<div class="paper-cite"><span class="n">{cites_comma}</span>'
        f'<span class="l">citations</span></div>'
        f'</article>'
    )


def generate_publications_redesign(data):
    """Generate the inner HTML for #publications-content (redesign).

    Reads publications_data.json directly and emits the dashboard, controls,
    filter chips, and all paper cards pre-sorted newest-first then most-cited.
    """
    pub_data = json.loads(PUBLICATIONS_JSON.read_text(encoding="utf-8"))
    metrics = pub_data.get("metrics", {})
    pubs = pub_data.get("publications", [])

    total_papers = metrics.get("totalPapers", len(pubs))
    total_citations = metrics.get("totalCitations", 0)
    h_index = metrics.get("hIndex", 0)
    i10_index = metrics.get("i10Index", 0)

    # Per-category counts (by argmax researchArea)
    cat_counts = {"sla": 0, "ii": 0, "ic": 0, "du": 0}
    papers_with_year = []
    for p in pubs:
        if not p.get("year"):
            continue
        papers_with_year.append(p)
        key = _PUB_CAT_MAP.get(p.get("researchArea", ""), ("du", ""))[0]
        cat_counts[key] += 1

    all_count = len(papers_with_year)

    # Pre-sort: newest year first, then most cited
    papers_with_year.sort(
        key=lambda p: (-int(p.get("year", 0) or 0), -int(p.get("citations", 0) or 0))
    )

    cards = "".join(_generate_paper_card(p) for p in papers_with_year)

    dashboard = (
        '<div class="pub-dashboard">'
        '<div class="pub-stats">'
        f'<div class="pub-stat"><span class="n">{total_papers:,}</span>'
        '<span class="l">Papers</span></div>'
        f'<div class="pub-stat"><span class="n">{total_citations:,}</span>'
        '<span class="l">Citations</span></div>'
        f'<div class="pub-stat"><span class="n">{h_index}</span>'
        '<span class="l">h-index</span></div>'
        f'<div class="pub-stat"><span class="n">{i10_index}</span>'
        '<span class="l">i10-index</span></div>'
        '</div>'
        '<figure class="pub-chart">'
        '<figcaption class="pub-chart-head">'
        '<span class="t">Citations per year</span>'
        '<span class="m">peak 3,804 in 2025 · 16,908 total</span>'
        '</figcaption>'
        '<img class="chart-dark" src="assets/images/pubchart-dark.png" '
        'alt="Citations per year, 2015 to 2026" width="1000" height="330">'
        '<img class="chart-light" src="assets/images/pubchart-light.png" '
        'alt="Citations per year, 2015 to 2026" width="1000" height="330">'
        '</figure>'
        '</div>'
    )

    controls = (
        '<div class="pub-controls">'
        '<input type="search" id="pub-search" class="pub-search" '
        'placeholder="Search title or author…" aria-label="Search publications">'
        '<select id="pub-sort" class="pub-sort" aria-label="Sort publications">'
        '<option value="year">Newest first</option>'
        '<option value="cites">Most cited</option></select>'
        '<div class="pub-filters" id="pub-filters" role="group" '
        'aria-label="Filter by research area">'
        f'<button class="chip is-active" data-cat="all" aria-pressed="true">'
        f'All <span class="ct">{all_count}</span></button>'
        f'<button class="chip" data-cat="du" aria-pressed="false">'
        f'<span class="dot d-du"></span>Discovery &amp; Understanding '
        f'<span class="ct">{cat_counts["du"]}</span></button>'
        f'<button class="chip" data-cat="ic" aria-pressed="false">'
        f'<span class="dot d-ic"></span>Inference &amp; Computation '
        f'<span class="ct">{cat_counts["ic"]}</span></button>'
        f'<button class="chip" data-cat="sla" aria-pressed="false">'
        f'<span class="dot d-sla"></span>Statistical Learning &amp; AI '
        f'<span class="ct">{cat_counts["sla"]}</span></button>'
        f'<button class="chip" data-cat="ii" aria-pressed="false">'
        f'<span class="dot d-ii"></span>Interpretability &amp; Insight '
        f'<span class="ct">{cat_counts["ii"]}</span></button>'
        '</div>'
        '</div>'
    )

    list_section = (
        f'<div id="pub-list" class="pub-list">{cards}</div>'
        '<p id="pub-empty" class="pub-empty" hidden>'
        'No papers match your search/filters. '
        '<button type="button" class="linkbtn" id="pub-reset">Show all</button></p>'
        '<div class="pub-loadmore-wrap">'
        '<button type="button" id="pub-loadmore" class="btn btn-ghost">Load more</button></div>'
    )

    return (
        '<div class="container">'
        + dashboard
        + controls
        + list_section
        + '</div>'
    )


def build_page(page_name, html, data):
    """Fill each page's content container(s) from content.json. Redesign pages are
    static shells (head/nav/hero/footer); only the #<page>-content area is generated."""

    if page_name == "index":
        # Redesign Home: regenerate content sections from content.json.
        html = replace_container_content(html, "id", "about", generate_home_about(data))
        html = replace_container_content(html, "id", "research", generate_home_research(data))
        html = replace_container_content(html, "id", "team", generate_home_team(data))
        html = replace_container_content(html, "id", "join", generate_home_collab(data))
        html = replace_container_content(html, "id", "bio", generate_home_bio(data))

    elif page_name == "awards":
        html = replace_container_content(html, "id", "awards-content", gen_awards(data))

    elif page_name == "service":
        html = replace_container_content(html, "id", "service-content", gen_service(data))

    elif page_name == "talks":
        html = replace_container_content(html, "id", "talks-content", gen_talks(data))

    elif page_name == "teaching":
        html = replace_container_content(html, "id", "teaching-content", gen_teaching(data))

    elif page_name == "mentorship":
        html = replace_container_content(html, "id", "mentorship-content", gen_mentorship(data))

    elif page_name == "software":
        html = replace_container_content(html, "id", "software-content", gen_software(data))

    elif page_name == "news":
        html = replace_container_content(html, "id", "news-content", gen_news(data))

    elif page_name == "publications":
        html = replace_container_content(
            html, "id", "publications-content", generate_publications_redesign(data)
        )

    return html


def main():
    """Main entry point."""
    # Load content data
    print(f"Loading content from {CONTENT_JSON}...")
    if not CONTENT_JSON.exists():
        print(f"ERROR: {CONTENT_JSON} not found", file=sys.stderr)
        sys.exit(1)

    data = json.loads(CONTENT_JSON.read_text(encoding="utf-8"))

    # Process each HTML file
    for page_name, html_path in HTML_FILES.items():
        if not html_path.exists():
            print(f"  WARNING: {html_path} not found, skipping")
            continue

        print(f"  Processing {html_path.name}...")
        original_html = html_path.read_text(encoding="utf-8")
        updated_html = build_page(page_name, original_html, data)

        if updated_html != original_html:
            html_path.write_text(updated_html, encoding="utf-8")
            print(f"    -> Updated {html_path.name}")
        else:
            print(f"    -> No changes needed for {html_path.name}")

    print("Done! Static HTML content has been injected into page templates.")


if __name__ == "__main__":
    main()
