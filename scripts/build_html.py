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

# HTML files to process
HTML_FILES = {
    "index": PROJECT_ROOT / "index.html",
    "publications": PROJECT_ROOT / "publications.html",
    "mentorship": PROJECT_ROOT / "mentorship.html",
    "talks": PROJECT_ROOT / "talks.html",
    "teaching": PROJECT_ROOT / "teaching.html",
    "awards": PROJECT_ROOT / "awards.html",
    "service": PROJECT_ROOT / "service.html",
}

# GitHub SVG icon used in quick links
GITHUB_SVG = (
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" '
    'style="vertical-align: middle; margin-right: 4px;">'
    '<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 '
    "0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52"
    "-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64"
    "-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 "
    "1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56"
    ".82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 "
    '0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>'
    "</svg>"
)


# ---------------------------------------------------------------------------
# Publication icon SVGs (dark-theme defaults)
# ---------------------------------------------------------------------------

def get_publication_icon(icon_type):
    """Return SVG for a publication icon using dark theme colors."""
    icons = {
        "ads": (
            '<svg width="40" height="40" viewBox="0 0 100 100">'
            '<circle cx="40" cy="40" r="25" stroke="#64b5f6" stroke-width="4" fill="none"/>'
            '<line x1="57" y1="57" x2="75" y2="75" stroke="#64b5f6" stroke-width="6" stroke-linecap="round"/>'
            '<text x="40" y="48" font-family="Arial, sans-serif" font-size="28" font-weight="bold" '
            'text-anchor="middle" fill="#64b5f6">a</text>'
            "</svg>"
        ),
        "scholar": (
            '<svg width="40" height="40" viewBox="0 0 100 100">'
            '<path d="M50 20 L20 35 L20 45 C20 45 20 70 50 70 C80 70 80 45 80 45 L80 35 Z" '
            'stroke="#4285f4" stroke-width="3" fill="none"/>'
            '<path d="M20 35 L50 20 L80 35" stroke="#4285f4" stroke-width="3" fill="none"/>'
            '<path d="M65 30 L65 15 L70 15 L70 33" stroke="#4285f4" stroke-width="3" fill="none"/>'
            "</svg>"
        ),
        "arxiv": (
            '<svg width="40" height="40" viewBox="0 0 100 100">'
            '<text x="50" y="58" font-family="Georgia, serif" font-size="26" '
            'text-anchor="middle" fill="#b31b1b" font-weight="500">arXiv</text>'
            "</svg>"
        ),
        "orcid": (
            '<svg width="40" height="40" viewBox="0 0 256 256" fill="#A6CE39">'
            '<path d="M256,128c0,70.7-57.3,128-128,128S0,198.7,0,128S57.3,0,128,0S256,57.3,256,128z"/>'
            '<path fill="white" d="M86.3,186.2H70.9V79.1h15.4v107.1z M78.6,66.9c-5.2,0-9.4-4.2-9.4-9.4'
            "s4.2-9.4,9.4-9.4s9.4,4.2,9.4,9.4S83.8,66.9,78.6,66.9z M194.5,186.2h-26.5c-1.6,0-2.8-1.3"
            "-2.8-2.8V128c0-13.1-4.7-22-14.4-22c-10.4,0-15.6,7-15.6,22v55.4c0,1.5-1.3,2.8-2.8,2.8h-26.5"
            "c-1.6,0-2.8-1.3-2.8-2.8V79.1c0-1.5,1.3-2.8,2.8-2.8h25.4c1.6,0,2.8,1.3,2.8,2.8v9.5h0.4"
            "c5.7-8.8,16.4-14,27.9-14c21.3,0,35,14,35,41.4v67.5C197.3,184.9,196.1,186.2,194.5,186.2z"
            '"/>'
            "</svg>"
        ),
    }
    return icons.get(icon_type, "")


# ---------------------------------------------------------------------------
# Container replacement helpers
# ---------------------------------------------------------------------------

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


def replace_element_text(html, element_id, new_text):
    """Replace the text content of an element identified by id.

    Handles simple elements like: <h1 id="page-title"><!-- old --></h1>
    Uses the first closing tag since these elements have no nested same-type tags.
    """
    pattern = re.compile(
        r"(<(\w+)\b[^>]*\bid\s*=\s*[\"']"
        + re.escape(element_id)
        + r"[\"'][^>]*>)"
        r"(.*?)"
        r"(</\2\s*>)",
        re.DOTALL,
    )
    match = pattern.search(html)
    if match:
        html = html[: match.start(3)] + new_text + html[match.start(4):]
    return html


# ---------------------------------------------------------------------------
# Shared content generators (header, footer, quick links, navigation)
# ---------------------------------------------------------------------------

def generate_header(data):
    """Generate header HTML."""
    header = data["header"]
    return (
        f'<h1 class="name">{header["name"]}</h1>\n'
        f'<p class="chinese-name">{header["chineseName"]}</p>\n'
        f'<p class="tagline">{header["tagline"]}</p>'
    )


def generate_footer(data):
    """Generate footer HTML."""
    footer = data["footer"]
    return (
        f"<p>{footer['copyright']}</p>\n"
        f'<p style="font-size: 0.9rem; opacity: 0.7; margin-top: 0.5rem;">'
        f"{footer['credit']}</p>"
    )


def generate_quick_links(data):
    """Generate quick links HTML."""
    parts = []
    for link in data["quickLinks"]:
        if link.get("dropdown") and link.get("items"):
            dropdown_items = []
            for sub_item in link["items"]:
                if sub_item.get("disabled"):
                    reason = sub_item.get("disabledReason", "Coming soon")
                    dropdown_items.append(
                        f'<span class="dropdown-item disabled" title="{reason}">'
                        f'{sub_item["text"]}</span>'
                    )
                else:
                    dropdown_items.append(
                        f'<a href="{sub_item["href"]}" class="dropdown-item">'
                        f'{sub_item["text"]}</a>'
                    )
            parts.append(
                '<div class="quick-link-dropdown">'
                '<button class="quick-link-inline dropdown-toggle" '
                'aria-expanded="false" aria-haspopup="true" '
                f'aria-label="{link["ariaLabel"]}">'
                f'{link["icon"]} {link["text"]}'
                '<span class="dropdown-arrow">\u25bc</span>'
                "</button>"
                '<div class="dropdown-menu">'
                + "".join(dropdown_items)
                + "</div></div>"
            )
        elif link.get("icon") == "github":
            parts.append(
                f'<a href="{link["url"]}" class="quick-link-inline" '
                f'aria-label="{link["ariaLabel"]}">'
                f"{GITHUB_SVG} {link['text']}</a>"
            )
        else:
            parts.append(
                f'<a href="{link["url"]}" class="quick-link-inline" '
                f'aria-label="{link["ariaLabel"]}">'
                f'{link["icon"]} {link["text"]}</a>'
            )
    return "".join(parts)


def generate_navigation_home(data):
    """Generate navigation HTML for the home page."""
    nav_links = "".join(
        f'<a href="{item["href"]}" class="nav-link">{item["text"]}</a>'
        for item in data["navigation"]
    )
    return (
        nav_links
        + '<button class="nav-toggle" id="navToggle" type="button" '
        'aria-label="Toggle navigation">'
        '<span id="navToggleIcon">+</span></button>'
    )


def generate_navigation_subpage():
    """Generate navigation HTML for sub-pages."""
    return (
        '<a href="index.html" class="nav-link home-button">'
        '<span class="home-icon">\U0001f3e0</span> Home</a>'
        '<button class="nav-link top-button" data-action="scroll-top" '
        'type="button" aria-label="Scroll to top">'
        '<span class="top-icon">\u2b06\ufe0f</span> Top</button>'
    )


# ---------------------------------------------------------------------------
# Index page section generators
# ---------------------------------------------------------------------------

def _webp_src(src):
    """Convert an image src to its WebP equivalent path."""
    return re.sub(r"\.(jpg|jpeg|png|JPG)$", ".webp", src)


def generate_about(data):
    """Generate the about section HTML."""
    about = data["sections"]["about"]
    profile = about["profileImage"]
    return (
        f'<div class="intro-grid" role="region" aria-labelledby="about-heading">\n'
        f'<section role="main" aria-labelledby="about-heading">\n'
        f'<h2 id="about-heading" class="section-title">{about["title"]}</h2>\n'
        f'<p aria-describedby="about-highlight">{about["content"]}</p>\n'
        f'\n'
        f'<aside class="highlight-box" role="complementary" aria-labelledby="highlight-heading">\n'
        f'<h3 id="highlight-heading">{about["highlightBox"]["title"]}</h3>\n'
        f'<p id="about-highlight">{about["highlightBox"]["content"]}</p>\n'
        f"</aside>\n"
        f'\n'
        f'<address class="contact-info" role="contentinfo" aria-labelledby="contact-heading">\n'
        f'<h3 id="contact-heading">{about["contactInfo"]["title"]}</h3>\n'
        f'<p><strong>Email:</strong> <a href="mailto:{about["contactInfo"]["email"]}" '
        f'aria-label="Send email to {about["contactInfo"]["email"]}">'
        f'{about["contactInfo"]["email"]}</a></p>\n'
        f'<p><strong>Office:</strong> <span aria-label="Office location">'
        f'{about["contactInfo"]["office"]}</span></p>\n'
        f"</address>\n"
        f"</section>\n"
        f'<figure class="profile-figure" role="img" aria-labelledby="profile-caption">\n'
        f"<picture>\n"
        f'<source srcset="{_webp_src(profile["src"])}" type="image/webp">\n'
        f'<img src="{profile["src"]}" alt="{profile["alt"]}" '
        f'class="profile-image" width="384" height="513">\n'
        f"</picture>\n"
        + (
            f'<figcaption id="profile-caption" style="text-align: center; font-size: 0.8rem; '
            f'margin-top: 0.5rem; opacity: 0.8;">\n'
            f'{profile["credit"]} <a href="{profile["creditLink"]}" '
            f'aria-label="Photo credit link">{profile["creditName"]}</a>\n'
            f"</figcaption>\n"
            if profile.get("credit") else ""
        ) +
        f"</figure>\n"
        f"</div>"
    )


def generate_team(data):
    """Generate the team section HTML."""
    team = data["sections"]["team"]
    highlights_html = "".join(
        f'<article class="art-highlight" role="listitem" aria-labelledby="highlight-{i}-title">\n'
        f'<h4 id="highlight-{i}-title">{h["icon"]} {h["title"]}</h4>\n'
        f'<p aria-describedby="highlight-{i}-title">{h["content"]}</p>\n'
        f"</article>\n"
        for i, h in enumerate(team["highlights"])
    )
    cta_html = "".join(
        f'<a href="{btn["url"]}" '
        f'class="art-button{"-secondary" if btn["type"] == "secondary" else ""}" '
        f'aria-label="{btn["text"]} - opens {"external link" if "http" in btn["url"] else "page"}"'
        f'{" target=\"_blank\" rel=\"noopener noreferrer\"" if "http" in btn["url"] else ""}>'
        f'{btn["text"]}</a>\n'
        for btn in team["cta"]
    )
    return (
        f'<div class="art-showcase" role="region" aria-labelledby="team-heading">\n'
        f'<figure class="art-logo" role="img" aria-labelledby="team-logo-caption">\n'
        f'<img src="{team["logo"]["src"]}" alt="{team["logo"]["alt"]}" '
        f'class="art-logo-img" loading="lazy">\n'
        f'<figcaption id="team-logo-caption" class="sr-only">Astrostatistics Research Team logo</figcaption>\n'
        f"</figure>\n"
        f'<section class="art-content" aria-labelledby="team-heading">\n'
        f'<h2 id="team-heading" class="section-title">{team["title"]}</h2>\n'
        f'<p class="art-tagline" aria-describedby="team-description">{team["tagline"]}</p>\n'
        f'\n'
        f'<p id="team-description">{team["content"]}</p>\n'
        f'\n'
        f'<div class="art-highlights" role="list" aria-label="Team highlights">\n'
        f"{highlights_html}"
        f"</div>\n"
        f'\n'
        f'<nav class="art-cta" role="navigation" aria-label="Team related links">\n'
        f"{cta_html}"
        f"</nav>\n"
        f"</section>\n"
        f"</div>"
    )


def generate_research(data):
    """Generate the research section HTML."""
    research = data["sections"]["research"]
    areas_html = "".join(
        f'<div class="research-card" role="listitem" aria-labelledby="area-{i}-title">\n'
        f'<h4 id="area-{i}-title">{area["icon"]} {area["title"]}</h4>\n'
        f'<p>{area["description"]}</p>\n'
        f"</div>\n"
        for i, area in enumerate(research["areas"])
    )
    pub_cards_html = "".join(
        _create_publication_card(pub)
        for pub in research["publications"]["links"]
    )
    return (
        f'<section role="region" aria-labelledby="research-heading">\n'
        f'<h2 id="research-heading" class="section-title">{research["title"]}</h2>\n'
        f'\n'
        f'<p>{research["intro"]}</p>\n'
        f'\n'
        f'<div class="content-grid" role="list" aria-label="Research focus areas">\n'
        f"{areas_html}"
        f"</div>\n"
        f'\n'
        f'<div class="research-context">\n'
        f'<p>{research["additionalContent"]}</p>\n'
        f"</div>\n"
        f'\n'
        f'<aside class="highlight-box" role="complementary" aria-labelledby="publications-heading">\n'
        f'<h3 id="publications-heading">{research["publications"]["title"]}</h3>\n'
        f'<p aria-describedby="publications-cards">{research["publications"]["intro"]}</p>\n'
        f'<div id="publications-cards" class="publication-cards" role="list" '
        f'aria-label="Key publications">\n'
        f"{pub_cards_html}"
        f"</div>\n"
        f"</aside>\n"
        f"</section>"
    )


def _create_publication_card(pub):
    """Create a publication card for the home page research section."""
    icon_svg = get_publication_icon(pub["icon"])
    return (
        f'<a href="{pub["url"]}" class="publication-card" '
        f'aria-label="View publications on {pub["name"]}">\n'
        f'<div class="card-icon">\n{icon_svg}\n</div>\n'
        f'<div class="card-content">\n'
        f'<h4>{pub["name"]}</h4>\n'
        f'<p>{pub["description"]}</p>\n'
        f"</div>\n"
        f'<div class="card-arrow">\u2192</div>\n'
        f"</a>\n"
    )


def generate_collaboration(data):
    """Generate the collaboration section HTML."""
    collab = data["sections"]["collaboration"]
    values_html = "".join(
        f'<article role="listitem" aria-labelledby="value-{i}-title">\n'
        f'<h4 id="value-{i}-title">{v["title"]}</h4>\n'
        f'<p aria-describedby="value-{i}-title">{v["content"]}</p>\n'
        f"</article>\n"
        for i, v in enumerate(collab["values"]["items"])
    )
    opp_cards_html = "".join(
        _create_opportunity_card(card)
        for card in collab["opportunities"]["cards"]
    )
    return (
        f'<section role="region" aria-labelledby="collaboration-heading">\n'
        f'<h2 id="collaboration-heading" class="section-title">{collab["title"]}</h2>\n'
        f'\n'
        f'<p aria-describedby="values-section">{collab["intro"]}</p>\n'
        f'\n'
        f'<aside class="highlight-box" role="complementary" aria-labelledby="values-heading">\n'
        f'<h3 id="values-heading"><strong>{collab["values"]["title"]}</strong></h3>\n'
        f'<div class="two-column" role="list" aria-label="Collaboration values">\n'
        f"{values_html}"
        f"</div>\n"
        f"</aside>\n"
        f'\n'
        f'<aside id="values-section" class="highlight-box" role="complementary" '
        f'aria-labelledby="opportunities-heading">\n'
        f'<h3 id="opportunities-heading">{collab["opportunities"]["title"]}</h3>\n'
        f'<div class="research-grid" role="list" aria-label="Collaboration opportunities">\n'
        f"{opp_cards_html}"
        f"</div>\n"
        f"</aside>\n"
        f"</section>"
    )


def _create_opportunity_card(card):
    """Create an opportunity card for the collaboration section."""
    html = (
        f'<div class="research-card" role="listitem">\n'
        f'<h4>{card["title"]}</h4>\n'
        f'<p>{card["content"]}</p>\n'
    )
    if "fellowships" in card:
        f_info = card["fellowships"]
        links = ", ".join(
            f'<a href="{lnk["url"]}">{lnk["name"]}</a>'
            + (f' ({lnk["note"]})' if lnk.get("note") else "")
            for lnk in f_info["links"]
        )
        html += f"<br><p><strong>{f_info['intro']}</strong> {links}</p>\n"
    if "programs" in card:
        p_info = card["programs"]
        links = ", ".join(
            f'<a href="{lnk["url"]}">{lnk["name"]}</a>'
            for lnk in p_info["links"]
        )
        html += f"<br><p><strong>{p_info['intro']}</strong> {links}</p>\n"
    if "opportunities" in card:
        opps = ", ".join(
            (
                f'<a href="{opp["url"]}">{opp["name"]}</a>'
                + (f' ({opp["abbr"]})' if opp.get("abbr") else "")
            )
            if opp.get("url")
            else (opp["name"] + (f' ({opp["note"]})' if opp.get("note") else ""))
            for opp in card["opportunities"]
        )
        html += f"<br><p><strong>Programs:</strong> {opps}</p>\n"
    html += "</div>\n"
    return html


def generate_biography(data):
    """Generate the biography section HTML."""
    bio = data["sections"]["biography"]
    timeline_html = "".join(
        _create_timeline_item(item) for item in bio["timeline"]
    )
    photos_html = "".join(
        f'<figure class="dog-photo" role="img" aria-labelledby="photo-{i}-caption">\n'
        f"<picture>\n"
        f'<source srcset="{_webp_src(photo["src"])}" type="image/webp">\n'
        f'<img src="{photo["src"]}" alt="{photo["alt"]}" loading="lazy" '
        f'width="800" height="533">\n'
        f"</picture>\n"
        f'<figcaption id="photo-{i}-caption">\n'
        f'{photo["caption"]}'
        + (
            f' <a href="{photo["creditLink"]}" aria-label="Photo credit link">'
            f'{photo["creditName"]}</a>'
            if photo.get("creditLink")
            else ""
        )
        + "\n</figcaption>\n</figure>\n"
        for i, photo in enumerate(bio["dogPhotos"])
    )
    return (
        f'<section role="region" aria-labelledby="bio-heading">\n'
        f'<h2 id="bio-heading" class="section-title">{bio["title"]}</h2>\n'
        f'\n'
        f'<div class="timeline-container" role="list" aria-label="Career timeline">\n'
        f'<div class="timeline-line" aria-hidden="true"></div>\n'
        f"{timeline_html}"
        f"</div>\n"
        f'\n'
        f'<p aria-labelledby="personal-note">{bio["personalNote"]}</p>\n'
        f'\n'
        f'<aside class="dog-photos" role="complementary" '
        f'aria-labelledby="personal-photos-heading">\n'
        f'<h3 id="personal-photos-heading" class="sr-only">Personal Photos</h3>\n'
        f"{photos_html}"
        f"</aside>\n"
        f"</section>"
    )


def _create_timeline_item(item):
    """Create a timeline item for the biography section."""
    item_id = re.sub(r"[^a-zA-Z0-9]", "", item["title"]).lower()
    current_dot = " current" if item.get("current") else ""
    return (
        f'<article class="timeline-item {item["position"]}" role="listitem" '
        f'aria-labelledby="timeline-{item_id}-title">\n'
        f'<div class="timeline-dot{current_dot}" aria-hidden="true"></div>\n'
        f'<div class="timeline-content{current_dot}">\n'
        f'<h3 id="timeline-{item_id}-title">{item["title"]}</h3>\n'
        f'<time class="timeline-date" datetime="{item["date"]}">{item["date"]}</time>\n'
        f'<p aria-describedby="timeline-{item_id}-title">{item["content"]}</p>\n'
        f'<div class="timeline-location" aria-label="Location: {item["location"]}">'
        f'\U0001f4cd {item["location"]}</div>\n'
        f"</div>\n"
        f"</article>\n"
    )


# ---------------------------------------------------------------------------
# Awards page generator
# ---------------------------------------------------------------------------

def generate_awards(data):
    """Generate awards content HTML."""
    section = data["sections"]["awards"]
    awards = section.get("awards", [])
    cards_html = "".join(
        f'<div class="research-card award-item" role="listitem" '
        f'aria-labelledby="award-title-{i}" '
        f'aria-describedby="award-desc-{i} award-meta-{i}" tabindex="0">\n'
        f'<div class="award-header">\n'
        f'<h4 id="award-title-{i}">{award["title"]}</h4>\n'
        f'<div class="award-meta" id="award-meta-{i}" aria-label="Award details">\n'
        f'<span class="award-year" aria-label="Year received">{award["year"]}</span>\n'
        f'<span class="award-separator" aria-hidden="true">\u2022</span>\n'
        f'<span class="award-organization" aria-label="Awarding organization">'
        f'{award["organization"]}</span>\n'
        f"</div>\n"
        f"</div>\n"
        f'<p class="award-description" id="award-desc-{i}">{award["description"]}</p>\n'
        f"</div>\n"
        for i, award in enumerate(awards)
    )
    return (
        f'<div class="awards-container" role="main" aria-label="Awards and honors">\n'
        f'<div class="research-grid" role="list" '
        f'aria-label="List of {len(awards)} awards and honors">\n'
        f"{cards_html}"
        f"</div>\n"
        f"</div>"
    )


# ---------------------------------------------------------------------------
# Service page generator
# ---------------------------------------------------------------------------

def generate_service(data):
    """Generate service content HTML."""
    section = data["sections"]["service"]
    categories = [c for c in section.get("categories", []) if not c.get("hidden")]

    parts = []
    for cat_idx, category in enumerate(categories):
        cat_id = re.sub(r"\s+", "-", category["title"]).lower()
        orgs_html = ""
        if "organizations" in category:
            org_parts = []
            for org_idx, org in enumerate(category["organizations"]):
                if org.get("hidden"):
                    continue
                positions_html = "".join(
                    f'<div class="position-item" role="listitem" '
                    f'aria-labelledby="pos-{cat_idx}-{org_idx}-{pos_idx}" '
                    f'aria-describedby="periods-{cat_idx}-{org_idx}-{pos_idx}">\n'
                    f'<div class="position-header">\n'
                    f'<span class="position-role" id="pos-{cat_idx}-{org_idx}-{pos_idx}">'
                    f'{pos["role"]}</span>\n'
                    f'<div class="position-periods" '
                    f'id="periods-{cat_idx}-{org_idx}-{pos_idx}" '
                    f'aria-label="Service periods" role="list">\n'
                    + "".join(
                        f'<span class="period-tag" role="listitem" '
                        f'aria-label="Service period {period}">{period}</span>\n'
                        for period in pos["periods"]
                    )
                    + "</div>\n</div>\n</div>\n"
                    for pos_idx, pos in enumerate(org["positions"])
                )
                org_parts.append(
                    f'<div class="service-organization-group" role="listitem" '
                    f'aria-labelledby="org-{cat_idx}-{org_idx}" tabindex="0">\n'
                    f'<h4 class="organization-name" id="org-{cat_idx}-{org_idx}">'
                    f'{org["name"]}</h4>\n'
                    f'<div class="organization-positions" role="list" '
                    f'aria-label="Positions at {org["name"]}">\n'
                    f"{positions_html}"
                    f"</div>\n"
                    f"</div>\n"
                )
            orgs_html = "".join(org_parts)
        elif "items" in category:
            item_parts = []
            for item_idx, item in enumerate(category["items"]):
                item_parts.append(
                    f'<div class="service-item" role="listitem" '
                    f'aria-labelledby="item-{cat_idx}-{item_idx}" tabindex="0">\n'
                    f'<div class="service-item-header">\n'
                    f'<h4 class="service-role" id="item-{cat_idx}-{item_idx}">'
                    f'{item["role"]}</h4>\n'
                    f'<div class="service-period" aria-label="Service period">'
                    f'{item["period"]}</div>\n'
                    f"</div>\n"
                    + (
                        f'<div class="service-organization" aria-label="Organization">'
                        f'{item["organization"]}</div>\n'
                        if item.get("organization")
                        else ""
                    )
                    + "</div>\n"
                )
            orgs_html = "".join(item_parts)

        parts.append(
            f'<section class="service-category" role="region" '
            f'aria-labelledby="category-{cat_id}" '
            f'aria-describedby="category-desc-{cat_idx}">\n'
            f'<h3 id="category-{cat_id}" class="service-category-title">'
            f'{category["title"]}</h3>\n'
            f'<div class="service-organizations" role="list" '
            f'id="category-desc-{cat_idx}" '
            f'aria-label="Organizations and positions in {category["title"]}">\n'
            f"{orgs_html}"
            f"</div>\n"
            f"</section>\n"
        )

    return (
        f'<div class="service-container" role="main" '
        f'aria-label="Professional service and leadership">\n'
        + "".join(parts)
        + "</div>"
    )


# ---------------------------------------------------------------------------
# Talks page generator
# ---------------------------------------------------------------------------

def generate_talks(data):
    """Generate talks content HTML."""
    section = data["sections"]["talks"]
    categories = section.get("categories", [])

    # Calculate total talks
    total_talks = sum(len(cat["talks"]) for cat in categories)

    # Statistics
    stats = section.get("statistics", {})
    stats_html = ""
    if stats:
        stats_html = (
            '<div class="talks-overview">\n'
            '<div class="stats-grid">\n'
            f'<div class="stat-item">\n'
            f'<span class="stat-number">{total_talks}</span>\n'
            f'<span class="stat-label">Total Presentations</span>\n'
            f"</div>\n"
            f'<div class="stat-item">\n'
            f'<span class="stat-number">{stats["totalYears"]}</span>\n'
            f'<span class="stat-label">Years Active</span>\n'
            f"</div>\n"
            f'<div class="stat-item">\n'
            f'<span class="stat-number">{stats["countries"]}</span>\n'
            f'<span class="stat-label">Countries</span>\n'
            f"</div>\n"
            f'<div class="stat-item">\n'
            f'<span class="stat-number">{stats["invitedTalks"]}</span>\n'
            f'<span class="stat-label">Invited Talks</span>\n'
            f"</div>\n"
            "</div>\n"
            "</div>\n"
        )

    # Filter buttons
    filter_buttons_html = (
        '<nav class="talks-filters" role="navigation" aria-label="Filter talks by category">\n'
        f'<button class="filter-btn active" data-filter="all" aria-pressed="true" '
        f'aria-label="Reset to show all categories, {total_talks} talks total">\n'
        f"All ({total_talks})\n"
        f"</button>\n"
    )
    for cat in categories:
        filter_buttons_html += (
            f'<button class="filter-btn talk-badge talk-badge-{cat["color"]}" '
            f'data-filter="{cat["id"]}" aria-pressed="true" '
            f'aria-label="Toggle {cat["name"]}, {len(cat["talks"])} talks">\n'
            f'{cat["name"]} ({len(cat["talks"])})\n'
            f"</button>\n"
        )
    filter_buttons_html += (
        "</nav>\n"
        '<div aria-live="polite" aria-atomic="true" class="sr-only" id="filter-status"></div>\n'
    )

    # Flatten and sort all talks chronologically
    month_order = {
        "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
        "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12,
    }
    all_talks = []
    for cat in categories:
        for talk in cat["talks"]:
            all_talks.append({
                **talk,
                "categoryId": cat["id"],
                "categoryName": cat["name"],
                "categoryColor": cat["color"],
            })
    all_talks.sort(key=lambda t: (
        -t.get("year", 0),
        -month_order.get(t.get("date", "").split(" ")[0], 0),
    ))

    # Generate talk items
    talks_list_html = '<div class="talks-list" role="list">\n'
    for idx, talk in enumerate(all_talks):
        is_invited = talk["categoryId"] == "invited"
        invited_class = " invited-talk" if is_invited else ""

        # Compute month number for datetime attribute
        month_str = talk.get("date", "").split(" ")[0]
        month_num = str(month_order.get(month_str, 1)).zfill(2)

        talks_list_html += (
            f'<article class="talk-item{invited_class}" role="listitem" '
            f'data-category="{talk["categoryId"]}" '
            f'aria-labelledby="talk-{idx}-title">\n'
            f'<div class="talk-header">\n'
            f'<h4 class="talk-title" id="talk-{idx}-title" '
            f'aria-label="{talk["title"]}, {talk["type"]} at {talk["event"]}, {talk["date"]}">\n'
            f'{talk["title"]}\n'
            f"</h4>\n"
            f'<div class="talk-meta">\n'
            f'<time class="talk-date" datetime="{talk.get("year", "")}-{month_num}">'
            f'{talk["date"]}</time>\n'
            f'<span class="talk-type talk-badge talk-badge-{talk["categoryColor"]}" '
            f'role="text">{talk["type"]}</span>\n'
            f"</div>\n"
            f"</div>\n"
            f'\n'
            f'<div class="talk-details" aria-describedby="talk-{idx}-title">\n'
            f'<div class="talk-venue">\n'
            f'<strong aria-label="Event: {talk["event"]}">{talk["event"]}</strong>\n'
            f'<span class="talk-location" aria-label="Location: {talk["location"]}">'
            f'{talk["location"]}</span>\n'
            f"</div>\n"
        )
        if talk.get("url"):
            talks_list_html += (
                f'<div class="talk-links">\n'
                f'<a href="{talk["url"]}" target="_blank" rel="noopener noreferrer" '
                f'class="external-link" '
                f'aria-label="View recording for {talk["title"]}">\n'
                f"View Recording\n"
                f"</a>\n"
                f"</div>\n"
            )
        talks_list_html += "</div>\n</article>\n"
    talks_list_html += "</div>\n"

    # Combine everything
    tagline_html = ""
    if section.get("tagline"):
        tagline_html = f'<div class="page-intro">\n<p>{section["tagline"]}</p>\n'
        if section.get("note"):
            tagline_html += f'<p class="note">{section["note"]}</p>\n'
        tagline_html += "</div>\n"

    return tagline_html + stats_html + filter_buttons_html + talks_list_html


# ---------------------------------------------------------------------------
# Teaching page generator
# ---------------------------------------------------------------------------

def sort_terms_chronologically(terms):
    """Sort academic terms chronologically (most recent first)."""
    term_order = {"winter": 1, "summer": 2, "fall": 3, "full": 0}

    def sort_key(t):
        # Extract year
        year_match = re.search(r"\d{4}", t)
        year = int(year_match.group()) if year_match else 0
        # Extract term name
        term_name = t.lower().split(" ")[0]
        return (-year, term_order.get(term_name, 4))

    return sorted(terms, key=sort_key)


def generate_teaching(data):
    """Generate teaching content HTML."""
    section = data["sections"]["teaching"]
    courses = section.get("courseHistory", [])
    stats = section.get("teachingStats", {})
    philosophy = section.get("philosophy", {})

    # Determine unique departments and levels
    all_departments = []
    for course in courses:
        if "departments" in course:
            all_departments.extend(course["departments"])
        elif "department" in course:
            all_departments.append(course["department"])
    unique_departments = list(dict.fromkeys(all_departments))
    unique_levels = list(dict.fromkeys(course["level"] for course in courses))

    # Filter buttons
    filter_html = (
        '<nav class="teaching-filters" role="navigation" '
        'aria-label="Filter courses by department and level">\n'
        '<div class="filter-section">\n'
        '<h4 class="filter-section-title">All Courses</h4>\n'
        f'<button class="filter-btn active" data-filter="all" data-filter-type="general" '
        f'aria-pressed="true" '
        f'aria-label="Reset to show all courses, {stats.get("totalOfferings", 0)} total">\n'
        f'All Courses ({stats.get("totalOfferings", 0)})\n'
        f"</button>\n"
        f"</div>\n"
        f'\n'
        f'<div class="filter-section">\n'
        f'<h4 class="filter-section-title">By Department</h4>\n'
        f'<div class="filter-buttons-row">\n'
    )
    for dept in unique_departments:
        dept_courses = [
            c for c in courses
            if (c.get("departments") and dept in c["departments"])
            or c.get("department") == dept
        ]
        count = sum(len(c["terms"]) for c in dept_courses)
        dept_slug = dept.lower().replace(" ", "-")
        filter_html += (
            f'<button class="filter-btn active dept-badge dept-badge-{dept_slug}" '
            f'data-filter="{dept_slug}" data-filter-type="department" '
            f'aria-pressed="true" aria-label="Toggle {dept} courses, {count} offerings">\n'
            f"{dept} ({count})\n"
            f"</button>\n"
        )
    filter_html += "</div>\n</div>\n\n"
    filter_html += (
        '<div class="filter-section">\n'
        '<h4 class="filter-section-title">By Level</h4>\n'
        '<div class="filter-buttons-row">\n'
    )
    for level in unique_levels:
        level_courses = [c for c in courses if c["level"] == level]
        count = sum(len(c["terms"]) for c in level_courses)
        filter_html += (
            f'<button class="filter-btn active level-badge level-badge-{level.lower()}" '
            f'data-filter="{level.lower()}" data-filter-type="level" '
            f'aria-pressed="true" aria-label="Toggle {level} courses, {count} offerings">\n'
            f"{level} ({count})\n"
            f"</button>\n"
        )
    filter_html += (
        "</div>\n</div>\n"
        "</nav>\n"
        '<div aria-live="polite" aria-atomic="true" class="sr-only" '
        'id="teaching-filter-status"></div>\n'
    )

    # Course cards
    course_html = '<div class="course-history">\n'
    for idx, course in enumerate(courses):
        depts_data = (
            course["departments"]
            if "departments" in course
            else [course["department"]]
        )
        depts_attr = " ".join(d.lower().replace(" ", "-") for d in depts_data)
        dept_badges = "".join(
            f'<span class="dept-badge dept-badge-{d.lower().replace(" ", "-")}">{d}</span>\n'
            for d in depts_data
        )
        sorted_terms = sort_terms_chronologically(course["terms"])
        terms_badges = "".join(
            f'<span class="term-badge">{term}</span>\n' for term in sorted_terms
        )
        course_html += (
            f'<article class="course-card" '
            f'data-departments="{depts_attr}" '
            f'data-level="{course["level"].lower()}" '
            f'aria-labelledby="course-{idx}-title" role="article">\n'
            f'<div class="course-header">\n'
            f'<div class="course-title-section">\n'
            f'<h4 class="course-title" id="course-{idx}-title">\n'
            f'<span class="course-code">{course["code"]}</span>\n'
            f'{course["title"]}\n'
            f"</h4>\n"
            f'<div class="course-badges">\n'
            f'<span class="level-badge level-badge-{course["level"].lower()}">'
            f'{course["level"]}</span>\n'
            f"{dept_badges}"
            f"</div>\n"
            f"</div>\n"
            f"</div>\n"
            f'\n'
            f'<div class="course-details">\n'
            f'<p class="course-description">{course["description"]}</p>\n'
            f'<div class="course-terms">\n'
            f"<strong>Terms Taught:</strong>\n"
            f'<div class="terms-list">\n'
            f"{terms_badges}"
            f"</div>\n"
            f"</div>\n"
            f"</div>\n"
            f"</article>\n"
        )
    course_html += "</div>\n"

    # Short courses & workshops
    short_courses = section.get("shortCourses", [])
    short_courses_html = ""
    if short_courses:
        short_courses_html = '<div class="course-history">\n'
        for idx, sc in enumerate(short_courses):
            sorted_terms = sort_terms_chronologically(sc["terms"])
            terms_badges = "".join(
                f'<span class="term-badge">{term}</span>\n' for term in sorted_terms
            )
            short_courses_html += (
                f'<article class="course-card" '
                f'aria-labelledby="short-course-{idx}-title" role="article">\n'
                f'<div class="course-header">\n'
                f'<div class="course-title-section">\n'
                f'<h4 class="course-title" id="short-course-{idx}-title">\n'
                f'{sc["title"]}\n'
                f"</h4>\n"
                f'<div class="course-badges">\n'
                f'<span class="dept-badge dept-badge-workshop">Workshop</span>\n'
                f"</div>\n"
                f"</div>\n"
                f"</div>\n"
                f'\n'
                f'<div class="course-details">\n'
                f'<p class="course-description">{sc["program"]}'
                f'{" — " + sc["location"] if sc.get("location") else ""}</p>\n'
                f'<div class="course-terms">\n'
                f"<strong>Dates:</strong>\n"
                f'<div class="terms-list">\n'
                f"{terms_badges}"
                f"</div>\n"
                f"</div>\n"
                f"</div>\n"
                f"</article>\n"
            )
        short_courses_html += "</div>\n"

    return (
        f'<div class="page-intro">\n'
        f'<div class="highlight-box">\n'
        f'<h3>{philosophy.get("title", "Teaching Philosophy")}</h3>\n'
        f'<p>{philosophy.get("content", "")}</p>\n'
        f"</div>\n"
        f"</div>\n"
        f'\n'
        f'<div class="highlight-box">\n'
        f"<h3>Teaching History</h3>\n"
        f"{filter_html}"
        f"{course_html}"
        f"</div>\n"
        + (
            f'\n<div class="highlight-box">\n'
            f"<h3>Short Courses &amp; Workshops</h3>\n"
            f"{short_courses_html}"
            f"</div>"
            if short_courses else ""
        )
    )


# ---------------------------------------------------------------------------
# Mentorship page generators
# ---------------------------------------------------------------------------

def _count_mentees(mentees_list):
    """Count real mentees (not placeholders)."""
    if not mentees_list:
        return 0
    return sum(1 for m in mentees_list if m.get("privacy") != "placeholder")


def _filter_real_mentees(mentees_list):
    """Filter out placeholder mentees."""
    if not mentees_list:
        return []
    return [m for m in mentees_list if m.get("privacy") != "placeholder"]


def _create_mentee_card(mentee, mtype, is_completed=False):
    """Create a mentee card HTML."""
    has_multiple_projects = isinstance(mentee.get("projects"), list)

    primary_supervision = (
        (mentee["projects"][0].get("supervisionType") or mentee.get("supervisionType"))
        if has_multiple_projects
        else mentee.get("supervisionType", "")
    )

    if primary_supervision == "Primary Supervisor":
        level = "primary"
    elif primary_supervision == "Co-Supervisor":
        level = "co"
    else:
        level = "secondary"

    supervision_badge = (
        f'<span class="supervision-badge {level} {mtype}-context" role="status" '
        f'aria-label="Supervision type: {primary_supervision}">'
        f"{primary_supervision}</span>"
    )

    # Projects content
    project_label = (
        "Project" if mtype in ("bachelors", "mastersProjects") else "Research Interests"
    )
    projects_content = ""
    if has_multiple_projects:
        for proj in mentee["projects"]:
            projects_content += (
                f'<p class="project"><strong>{project_label}:</strong> '
                f'{proj["title"]}</p>\n'
            )
            if proj.get("coSupervisors"):
                projects_content += (
                    f'<p class="co-supervisors">Co-supervisors: '
                    f'{", ".join(proj["coSupervisors"])}</p>\n'
                )
    else:
        projects_content = (
            f'<p class="project"><strong>{project_label}:</strong> '
            f'{mentee.get("project", "")}</p>\n'
        )
        if mentee.get("coSupervisors"):
            projects_content += (
                f'<p class="co-supervisors">Co-supervisors: '
                f'{", ".join(mentee["coSupervisors"])}</p>\n'
            )

    # Awards/fellowships
    awards = mentee.get("fellowships") or mentee.get("scholarships") or []
    awards_html = ""
    if awards:
        badges = "".join(
            f'<span class="position-badge" role="listitem">{a}</span>' for a in awards
        )
        awards_html = (
            f'<div class="position-info" role="list" '
            f'aria-label="Awards and fellowships">{badges}</div>'
        )

    # Status
    status_html = ""
    if is_completed:
        outcome = mentee.get("outcome", "").strip()
        if outcome:
            status_html += f'<p class="outcome"><strong>Outcome:</strong> {outcome}</p>\n'
        current = mentee.get("currentStatus", "").strip()
        if current:
            status_html += f'<p class="current-status">{current}</p>\n'
    else:
        current = mentee.get("currentStatus", "").strip()
        if current:
            status_html += f'<p class="current-status">{current}</p>\n'

    mentee_id = re.sub(r"[^a-zA-Z0-9]", "", mentee.get("name", "")).lower()
    return (
        f'<article class="mentee-card {mtype}" role="listitem" '
        f'aria-labelledby="mentee-{mentee_id}-name">\n'
        f'<header class="mentee-header">\n'
        f'<h5 id="mentee-{mentee_id}-name" class="mentee-name">{mentee["name"]}</h5>\n'
        f'<time class="timeline" datetime="{mentee.get("timelinePeriod", "")}">'
        f'{mentee.get("timelinePeriod", "")}</time>\n'
        f"</header>\n"
        f'\n'
        f'<div class="badge-row" role="group" aria-labelledby="mentee-{mentee_id}-name">\n'
        f"{supervision_badge}\n"
        f"{awards_html}\n"
        f"</div>\n"
        f'\n'
        f'<div class="mentee-content" aria-describedby="mentee-{mentee_id}-name">\n'
        f"{projects_content}"
        f"{status_html}"
        f'<p class="career-context" role="note">'
        f'<em>My role: {mentee.get("myCareerStage", "")}</em></p>\n'
        f"</div>\n"
        f"</article>\n"
    )


def _create_mentee_section(title, mentees, mtype, is_completed=False):
    """Create a mentee section HTML."""
    if not mentees:
        return ""

    real_mentees = _filter_real_mentees(mentees)
    section_id = re.sub(r"[^a-zA-Z0-9]", "", title).lower()

    if not real_mentees and mentees:
        return (
            f'<section class="mentee-section" role="region" '
            f'aria-labelledby="{section_id}-heading">\n'
            f'<h4 id="{section_id}-heading">{title}</h4>\n'
            f'<p class="privacy-note" role="note">'
            f"<em>Mentee information will be displayed with appropriate permissions.</em></p>\n"
            f"</section>\n"
        )

    if not real_mentees:
        return ""

    # Use lazy loading threshold of 20 (matching JS)
    lazy_threshold = 20
    should_lazy_load = len(real_mentees) > lazy_threshold

    if should_lazy_load:
        initial_batch = real_mentees[:lazy_threshold]
        remaining_count = len(real_mentees) - lazy_threshold
        cards_html = "".join(
            _create_mentee_card(m, mtype, is_completed) for m in initial_batch
        )
        return (
            f'<section class="mentee-section" role="region" '
            f'aria-labelledby="{section_id}-heading">\n'
            f'<h4 id="{section_id}-heading">{title} ({len(real_mentees)})</h4>\n'
            f'<div class="mentee-cards" role="list" aria-label="Mentees in {title} category" '
            f'data-section-id="{section_id}" data-type="{mtype}" '
            f'data-completed="{str(is_completed).lower()}">\n'
            f"{cards_html}"
            f"</div>\n"
            f'<div class="mentee-load-more" id="load-more-{section_id}">\n'
            f'<button class="load-more-btn" data-action="load-more-mentees" '
            f'data-section="{section_id}" data-type="{mtype}" '
            f'data-completed="{str(is_completed).lower()}" '
            f'aria-label="Load more mentees in {title} section">\n'
            f"Load More ({remaining_count} remaining)\n"
            f"</button>\n"
            f"</div>\n"
            f"</section>\n"
        )
    else:
        cards_html = "".join(
            _create_mentee_card(m, mtype, is_completed) for m in real_mentees
        )
        return (
            f'<section class="mentee-section" role="region" '
            f'aria-labelledby="{section_id}-heading">\n'
            f'<h4 id="{section_id}-heading">{title} ({len(real_mentees)})</h4>\n'
            f'<div class="mentee-cards" role="list" aria-label="Mentees in {title} category">\n'
            f"{cards_html}"
            f"</div>\n"
            f"</section>\n"
        )


def _create_bar_chart(counts):
    """Create a simple bar chart HTML, matching the JS createInteractiveBarChart."""
    total = (
        counts["postdoctoral"]
        + counts["doctoral"]
        + counts["mastersProjects"]
        + counts["bachelors"]
    )
    if total == 0:
        return '<p class="no-data">No mentee data available</p>'

    max_count = max(
        counts["postdoctoral"],
        counts["doctoral"],
        counts["mastersProjects"],
        counts["bachelors"],
    )
    max_height = 150

    def bar_height(count):
        if max_count == 0:
            return 0
        return max(int((math.sqrt(count) / math.sqrt(max_count)) * max_height), 15)

    return (
        '<div class="vertical-bar-chart">\n'
        '<div class="bars-container">\n'
        f'<div class="bar-column">\n'
        f'<div class="bar-segment postdoc" style="height: {bar_height(counts["postdoctoral"])}px;"></div>\n'
        f'<div class="count">{counts["postdoctoral"]}</div>\n'
        f"</div>\n"
        f'<div class="bar-column">\n'
        f'<div class="bar-segment doctoral" style="height: {bar_height(counts["doctoral"])}px;"></div>\n'
        f'<div class="count">{counts["doctoral"]}</div>\n'
        f"</div>\n"
        f'<div class="bar-column">\n'
        f'<div class="bar-segment mastersProjects" style="height: {bar_height(counts["mastersProjects"])}px;"></div>\n'
        f'<div class="count">{counts["mastersProjects"]}</div>\n'
        f"</div>\n"
        f'<div class="bar-column">\n'
        f'<div class="bar-segment bachelors" style="height: {bar_height(counts["bachelors"])}px;"></div>\n'
        f'<div class="count">{counts["bachelors"]}</div>\n'
        f"</div>\n"
        "</div>\n"
        "</div>"
    )


def generate_mentorship_overview(data):
    """Generate mentorship overview section."""
    section = data["sections"]["mentorship"]
    stages = section["menteesByStage"]
    completed = stages.get("completed", {})

    # Count current
    current_counts = {
        "postdoctoral": _count_mentees(stages.get("postdoctoral")),
        "doctoral": _count_mentees(stages.get("doctoral")),
        "mastersProjects": _count_mentees(stages.get("mastersProjects")),
        "bachelors": _count_mentees(stages.get("bachelors")),
    }
    # Count former
    former_counts = {
        "postdoctoral": _count_mentees(completed.get("postdoctoral")),
        "doctoral": _count_mentees(completed.get("doctoral")),
        "mastersProjects": _count_mentees(completed.get("mastersProjects")),
        "bachelors": _count_mentees(completed.get("bachelors")),
    }

    total_current = sum(current_counts.values())
    total_former = sum(former_counts.values())
    total = total_current + total_former

    return (
        '<section role="region" aria-labelledby="overview-heading">\n'
        '<h2 id="overview-heading" class="section-title">Overview</h2>\n'
        '<div class="supervision-overview-container">\n'
        '<section class="supervision-stats" role="region" aria-labelledby="stats-heading">\n'
        '<h3 id="stats-heading">Supervision Overview</h3>\n'
        '<div class="stats-column" role="list" aria-label="Supervision statistics">\n'
        '<div class="stat" role="listitem" aria-labelledby="total-stat">\n'
        f'<strong id="total-stat" aria-describedby="total-desc">{total}</strong>\n'
        '<span id="total-desc">Total</span>\n'
        "</div>\n"
        '<div class="stat" role="listitem" aria-labelledby="current-stat">\n'
        f'<strong id="current-stat" aria-describedby="current-desc">{total_current}</strong>\n'
        '<span id="current-desc">Current</span>\n'
        "</div>\n"
        '<div class="stat" role="listitem" aria-labelledby="former-stat">\n'
        f'<strong id="former-stat" aria-describedby="former-desc">{total_former}</strong>\n'
        '<span id="former-desc">Former</span>\n'
        "</div>\n"
        "</div>\n"
        "</section>\n"
        "\n"
        '<section class="career-stage-breakdowns" role="region" '
        'aria-labelledby="breakdown-heading">\n'
        '<h3 id="breakdown-heading">Career Stage Breakdown</h3>\n'
        '<div class="shared-legend" role="list" aria-label="Chart legend">\n'
        '<div class="legend-item" role="listitem">\n'
        '<span class="legend-color postdoc" aria-hidden="true"></span>\n'
        "<span>Postdoctoral</span>\n"
        "</div>\n"
        '<div class="legend-item" role="listitem">\n'
        '<span class="legend-color doctoral" aria-hidden="true"></span>\n'
        "<span>Doctoral/Masters</span>\n"
        "</div>\n"
        '<div class="legend-item" role="listitem">\n'
        '<span class="legend-color mastersProjects" aria-hidden="true"></span>\n'
        "<span>Master's Projects</span>\n"
        "</div>\n"
        '<div class="legend-item" role="listitem">\n'
        '<span class="legend-color bachelors" aria-hidden="true"></span>\n'
        "<span>Bachelors/Other</span>\n"
        "</div>\n"
        "</div>\n"
        '<div class="dual-chart-container" role="img" aria-labelledby="charts-description">\n'
        '<p id="charts-description" class="sr-only">'
        "Bar charts showing distribution of mentees by career stage for current and former "
        "supervision</p>\n"
        '<div class="chart-section" role="img" aria-labelledby="current-chart-title">\n'
        '<h4 id="current-chart-title">Current</h4>\n'
        '<div class="chart-container" aria-label="Current mentees by career stage">\n'
        f"{_create_bar_chart(current_counts)}\n"
        "</div>\n"
        "</div>\n"
        '<div class="chart-section" role="img" aria-labelledby="former-chart-title">\n'
        '<h4 id="former-chart-title">Former</h4>\n'
        '<div class="chart-container" aria-label="Former mentees by career stage">\n'
        f"{_create_bar_chart(former_counts)}\n"
        "</div>\n"
        "</div>\n"
        "</div>\n"
        "</section>\n"
        "</div>\n"
        "</section>"
    )


def generate_mentorship_current(data):
    """Generate current mentees section."""
    stages = data["sections"]["mentorship"]["menteesByStage"]
    return (
        '<section role="region" aria-labelledby="current-mentees-heading">\n'
        '<h2 id="current-mentees-heading" class="section-title">Current Mentees</h2>\n'
        + _create_mentee_section(
            "Postdoctoral Researchers", stages.get("postdoctoral"), "postdoc"
        )
        + _create_mentee_section(
            "Doctoral & Masters Students", stages.get("doctoral"), "doctoral"
        )
        + _create_mentee_section(
            "Master's Projects", stages.get("mastersProjects"), "mastersProjects"
        )
        + _create_mentee_section(
            "Bachelors Students & Other Researchers",
            stages.get("bachelors"),
            "bachelors",
        )
        + "</section>"
    )


def generate_mentorship_former(data):
    """Generate former mentees section."""
    completed = data["sections"]["mentorship"]["menteesByStage"].get("completed", {})
    has_former = (
        completed.get("postdoctoral")
        or completed.get("doctoral")
        or completed.get("bachelors")
    )
    if not has_former:
        return ""
    return (
        '<section role="region" aria-labelledby="former-mentees-heading">\n'
        '<h2 id="former-mentees-heading" class="section-title">Former Mentees</h2>\n'
        + _create_mentee_section(
            "Postdoctoral Researchers",
            completed.get("postdoctoral"),
            "postdoc",
            True,
        )
        + _create_mentee_section(
            "Doctoral & Masters Students",
            completed.get("doctoral"),
            "doctoral",
            True,
        )
        + _create_mentee_section(
            "Master's Projects",
            completed.get("mastersProjects"),
            "mastersProjects",
            True,
        )
        + _create_mentee_section(
            "Bachelors Students & Other Researchers",
            completed.get("bachelors"),
            "bachelors",
            True,
        )
        + "</section>"
    )


# ---------------------------------------------------------------------------
# Publications page generator (static portions only)
# ---------------------------------------------------------------------------

def _format_data_sources(sources):
    """Format data source names."""
    mapping = {
        "google_scholar": "Google Scholar",
        "ads": "ADS",
        "openalex": "OpenAlex",
    }
    return " & ".join(mapping.get(s, s) for s in sources)


def generate_publications(data):
    """Generate publications content HTML (static portions only).

    Only renders: research areas, metrics summary, publication links,
    featured publications placeholder, and the statistics section placeholder.
    Charts and full publication list remain dynamic.
    """
    section = data["sections"]["publications"]

    # Try to load dynamic publication data for metrics and featured papers
    pub_data = None
    if PUBLICATIONS_JSON.exists():
        try:
            pub_data = json.loads(PUBLICATIONS_JSON.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            pass

    # Research areas
    areas_html = "".join(
        f'<div role="listitem" aria-describedby="area-{i}-desc">\n'
        f'<h4>{area["icon"]} {area["title"]}</h4>\n'
        f'<p id="area-{i}-desc">{area["description"]}</p>\n'
        f"</div>\n"
        for i, area in enumerate(section["categories"]["areas"])
    )

    # Metrics
    if pub_data and pub_data.get("metrics"):
        metrics = pub_data["metrics"]
        total_papers = metrics.get("totalPapers", section["metrics"]["totalPapers"])
        total_citations = metrics.get("totalCitations", section["metrics"]["citations"])
        h_index = metrics.get("hIndex", section["metrics"]["hIndex"])
        g_index = (metrics.get("adsMetricsCurrent") or {}).get("g", "N/A")
        last_updated_raw = pub_data.get("lastUpdated", "")
        try:
            from datetime import datetime
            dt = datetime.fromisoformat(last_updated_raw.replace("Z", "+00:00"))
            last_updated = dt.strftime("%B %d, %Y")
        except (ValueError, TypeError):
            last_updated = "Unknown"
        sources_html = ""
        if metrics.get("sources"):
            sources_html = (
                f"<p><small>Data sources: {_format_data_sources(metrics['sources'])}</small></p>"
            )
    else:
        total_papers = section["metrics"]["totalPapers"]
        total_citations = section["metrics"]["citations"]
        h_index = section["metrics"]["hIndex"]
        g_index = "N/A"
        last_updated_raw = ""
        last_updated = "Unknown"
        sources_html = ""

    # Publication links
    links = section["links"]
    pub_links_html = (
        f'<a href="{links["ads"]}" class="pub-link pub-link-horizontal" role="listitem" '
        f'aria-label="View publications on ADS">\n'
        f'<div class="link-icon">{get_publication_icon("ads")}</div>\n'
        f"<span>Astrophysics Data System</span>\n"
        f"</a>\n"
        f'<a href="{links["scholar"]}" class="pub-link pub-link-horizontal" role="listitem" '
        f'aria-label="View publications on Google Scholar">\n'
        f'<div class="link-icon">{get_publication_icon("scholar")}</div>\n'
        f"<span>Google Scholar</span>\n"
        f"</a>\n"
        f'<a href="{links["orcid"]}" class="pub-link pub-link-horizontal" role="listitem" '
        f'aria-label="View ORCID profile">\n'
        f'<div class="link-icon">{get_publication_icon("orcid")}</div>\n'
        f"<span>ORCID Profile</span>\n"
        f"</a>\n"
    )

    # Featured publications from dynamic data
    featured_html = ""
    if pub_data and pub_data.get("publications"):
        featured_papers = sorted(
            [p for p in pub_data["publications"] if p.get("featured")],
            key=lambda p: (-p.get("year", 0), p.get("title", "")),
        )
        if featured_papers:
            featured_items = []
            for paper in featured_papers:
                authors = paper.get("authors", [])
                if not authors:
                    author_str = "Authors not available"
                elif len(authors) <= 4:
                    author_str = ", ".join(authors)
                else:
                    author_str = (
                        ", ".join(authors[:3])
                        + f", et al. ({len(authors)} authors)"
                    )

                arxiv_link = ""
                if paper.get("arxivId"):
                    arxiv_link = f'https://arxiv.org/abs/{paper["arxivId"]}'
                elif paper.get("scholarUrl") and "arxiv" in paper.get("scholarUrl", ""):
                    arxiv_link = paper["scholarUrl"]
                elif paper.get("adsUrl"):
                    arxiv_link = paper["adsUrl"]
                elif paper.get("scholarUrl"):
                    arxiv_link = paper["scholarUrl"]

                # Authorship highlighting
                auth_cat = paper.get("authorshipCategory", "")
                paper_class = "featured-paper"
                student_badge = ""
                postdoc_badge = ""
                if auth_cat == "student":
                    paper_class = "featured-paper student-led-paper"
                    student_badge = '<span class="student-led-badge" title="Student-Led Research">\U0001f393 Student-Led</span>'
                elif auth_cat == "postdoc":
                    paper_class = "featured-paper postdoc-led-paper"
                    postdoc_badge = '<span class="postdoc-led-badge" title="Postdoc-Led Research">\U0001f52c Postdoc-Led</span>'

                # Category badges (static dark-theme colors)
                cat_badges = _create_static_category_badges(paper)

                details = str(paper.get("year", ""))
                if paper.get("journal"):
                    details += f' \u2022 {paper["journal"]}'
                if paper.get("citations"):
                    details += f' \u2022 {paper["citations"]} citations'

                featured_items.append(
                    f'<div class="{paper_class}">\n'
                    f'<div class="paper-header">\n'
                    f'<h4><a href="{arxiv_link}" target="_blank" '
                    f'rel="noopener noreferrer">{paper["title"]}</a></h4>\n'
                    f'<div class="paper-badges">\n'
                    f"{cat_badges}\n"
                    f"{student_badge}\n"
                    f"{postdoc_badge}\n"
                    f"</div>\n"
                    f"</div>\n"
                    f'<p class="authors">{author_str}</p>\n'
                    f'<p class="paper-details">{details}</p>\n'
                    + (
                        f'<p class="abstract">{paper["abstract"]}</p>\n'
                        if paper.get("abstract")
                        else ""
                    )
                    + "</div>\n"
                )

            featured_html = (
                '<section class="highlight-box" role="region" '
                'aria-labelledby="featured-heading">\n'
                '<h3 id="featured-heading">Featured Publications</h3>\n'
                '<div class="featured-publications" role="list" '
                'aria-label="Featured publications list">\n'
                + "".join(featured_items)
                + "</div>\n"
                "</section>\n"
            )
    elif section.get("featured") and section["featured"].get("papers"):
        # Fallback to static data
        featured_items = []
        for paper in section["featured"]["papers"]:
            featured_items.append(
                f'<div class="featured-paper">\n'
                f'<h4>{paper["title"]}</h4>\n'
                f'<p class="authors">{paper["authors"]}</p>\n'
                f'<p class="paper-details">{paper["journal"]} ({paper["year"]})</p>\n'
                + (
                    f'<p class="abstract">{paper["description"]}</p>\n'
                    if paper.get("description")
                    else ""
                )
                + '<div class="paper-links">\n'
                + (
                    f'<a href="https://doi.org/{paper["doi"]}" target="_blank">DOI</a>\n'
                    if paper.get("doi")
                    else ""
                )
                + (
                    f'<a href="https://arxiv.org/abs/{paper["arxiv"]}" target="_blank">arXiv</a>\n'
                    if paper.get("arxiv")
                    else ""
                )
                + "</div>\n</div>\n"
            )
        featured_html = (
            '<div class="highlight-box">\n'
            f'<h3>{section["featured"]["title"]}</h3>\n'
            '<div class="featured-publications">\n'
            + "".join(featured_items)
            + "</div>\n"
            "</div>\n"
        )

    return (
        '<section class="highlight-box" role="region" '
        'aria-labelledby="research-areas-heading">\n'
        f'<h3 id="research-areas-heading">{section["categories"]["title"]}</h3>\n'
        f'<div class="content-grid" role="list" aria-label="Research areas">\n'
        f"{areas_html}"
        f"</div>\n"
        f"</section>\n"
        f'\n'
        f'<section class="page-intro" role="region" aria-labelledby="overview-heading">\n'
        f'<h2 id="overview-heading" class="sr-only">Publications Overview</h2>\n'
        f'<div class="content-grid">\n'
        f'<section role="region" aria-labelledby="metrics-heading">\n'
        f'<h3 id="metrics-heading">Research Metrics</h3>\n'
        f'<div class="metrics-grid" role="list" aria-label="Publication metrics">\n'
        f'<div class="metric" role="listitem">\n'
        f'<strong aria-describedby="publications-desc">{total_papers}</strong>\n'
        f'<span id="publications-desc">Publications</span>\n'
        f"</div>\n"
        f'<div class="metric" role="listitem">\n'
        f'<strong aria-describedby="citations-desc">{total_citations}</strong>\n'
        f'<span id="citations-desc">Citations</span>\n'
        f"</div>\n"
        f'<div class="metric" role="listitem">\n'
        f'<strong aria-describedby="hindex-desc">{h_index}</strong>\n'
        f'<span id="hindex-desc">h-index</span>\n'
        f"</div>\n"
        f'<div class="metric" role="listitem">\n'
        f'<strong aria-describedby="gindex-desc">{g_index}</strong>\n'
        f'<span id="gindex-desc">g-index</span>\n'
        f"</div>\n"
        f"</div>\n"
        f'<p><em>Last updated: <time datetime="{last_updated_raw}">{last_updated}</time></em></p>\n'
        f"{sources_html}\n"
        f"</section>\n"
        f'\n'
        f'<nav role="navigation" aria-labelledby="pub-links-heading">\n'
        f'<h3 id="pub-links-heading">Publication Links</h3>\n'
        f'<div class="publication-links" role="list">\n'
        f"{pub_links_html}"
        f"</div>\n"
        f"</nav>\n"
        f"</div>\n"
        f"</section>\n"
        f'\n'
        f'<section id="publications-statistics" role="region" aria-labelledby="stats-heading">\n'
        f'<h2 id="stats-heading" class="sr-only">Publication Statistics</h2>\n'
        f"<!-- Statistics dashboard will be rendered dynamically by JS -->\n"
        f"</section>\n"
        f"\n"
        f"{featured_html}"
    )


def _create_static_category_badges(paper):
    """Create category badges using dark-theme colors for static HTML."""
    probs = paper.get("categoryProbabilities", {})
    if not probs:
        return ""

    # Categories with >= 20% probability, sorted descending
    categories = sorted(
        ((cat, prob) for cat, prob in probs.items() if prob >= 0.2),
        key=lambda x: -x[1],
    )
    if not categories and paper.get("researchArea"):
        categories = [(paper["researchArea"], probs.get(paper["researchArea"], 1.0))]

    color_map = {
        "Statistical Learning & AI": ("#EF5350", "#ffffff"),
        "Interpretability & Insight": ("#26A69A", "#ffffff"),
        "Inference & Computation": ("#5C6BC0", "#ffffff"),
        "Discovery & Understanding": ("#FFCA28", "#1a1a2e"),
    }
    short_labels = {
        "Statistical Learning & AI": "ML & AI",
        "Interpretability & Insight": "Interpretability",
        "Inference & Computation": "Inference",
        "Discovery & Understanding": "Discovery",
    }

    badges = []
    for cat, _prob in categories:
        bg, text = color_map.get(cat, ("#FFCA28", "#1a1a2e"))
        label = short_labels.get(cat, cat)
        badges.append(
            f'<span class="category-badge" '
            f'style="background-color: {bg}; color: {text};" '
            f'title="{cat}">{label}</span>'
        )
    return "".join(badges)


# ---------------------------------------------------------------------------
# Main build function
# ---------------------------------------------------------------------------

def build_page(page_name, html, data):
    """Apply all content injections to an HTML page and return updated HTML."""

    # -- Common elements for ALL pages --
    html = replace_container_content(html, "class", "header-content", generate_header(data))
    html = replace_container_content(html, "class", "quick-links-inline", generate_quick_links(data))

    footer_html = generate_footer(data)
    # The footer container is: <footer class="footer"><div class="container">...</div></footer>
    # We need to target the .container inside .footer specifically
    # Use a more targeted regex for the footer container
    footer_pattern = re.compile(
        r"(<footer\s+class\s*=\s*[\"']footer[\"'][^>]*>\s*<div\s+class\s*=\s*[\"']container[\"'][^>]*>)"
        r"(.*?)"
        r"(</div>\s*</footer>)",
        re.DOTALL,
    )
    footer_match = footer_pattern.search(html)
    if footer_match:
        html = (
            html[: footer_match.start(2)]
            + "\n"
            + footer_html
            + "\n"
            + html[footer_match.start(3):]
        )

    # Navigation
    if page_name == "index":
        html = replace_container_content(
            html, "class", "nav-container", generate_navigation_home(data)
        )
    else:
        html = replace_container_content(
            html, "class", "nav-container", generate_navigation_subpage()
        )

    # -- Page-specific content --
    if page_name == "index":
        html = replace_container_content(html, "id", "about", generate_about(data))
        html = replace_container_content(html, "id", "team", generate_team(data))
        html = replace_container_content(html, "id", "research", generate_research(data))
        html = replace_container_content(
            html, "id", "collaboration", generate_collaboration(data)
        )
        html = replace_container_content(html, "id", "bio", generate_biography(data))

    elif page_name == "awards":
        section_data = data["sections"].get("awards", {})
        html = replace_element_text(html, "page-title", section_data.get("title", ""))
        html = replace_element_text(html, "page-tagline", section_data.get("tagline", ""))
        html = replace_container_content(
            html, "id", "awards-content", generate_awards(data)
        )

    elif page_name == "service":
        section_data = data["sections"].get("service", {})
        html = replace_element_text(html, "page-title", section_data.get("title", ""))
        html = replace_element_text(html, "page-tagline", section_data.get("tagline", ""))
        html = replace_container_content(
            html, "id", "service-content", generate_service(data)
        )

    elif page_name == "talks":
        section_data = data["sections"].get("talks", {})
        html = replace_element_text(html, "page-title", section_data.get("title", ""))
        html = replace_element_text(html, "page-tagline", section_data.get("tagline", ""))
        html = replace_container_content(
            html, "id", "talks-content", generate_talks(data)
        )

    elif page_name == "teaching":
        section_data = data["sections"].get("teaching", {})
        html = replace_element_text(html, "page-title", section_data.get("title", ""))
        html = replace_element_text(html, "page-tagline", section_data.get("tagline", ""))
        html = replace_container_content(
            html, "id", "teaching-content", generate_teaching(data)
        )

    elif page_name == "mentorship":
        section_data = data["sections"].get("mentorship", {})
        html = replace_element_text(html, "page-title", section_data.get("title", ""))
        html = replace_element_text(html, "page-tagline", section_data.get("tagline", ""))
        html = replace_container_content(
            html, "id", "mentorship-overview", generate_mentorship_overview(data)
        )
        html = replace_container_content(
            html, "id", "mentorship-current", generate_mentorship_current(data)
        )
        html = replace_container_content(
            html, "id", "mentorship-former", generate_mentorship_former(data)
        )

    elif page_name == "publications":
        section_data = data["sections"].get("publications", {})
        html = replace_element_text(html, "page-title", section_data.get("title", ""))
        html = replace_element_text(html, "page-tagline", section_data.get("tagline", ""))
        html = replace_container_content(
            html, "id", "publications-content", generate_publications(data)
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
