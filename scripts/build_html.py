#!/usr/bin/env python3
"""
Build script to inject static HTML content into page templates.

Reads content.json and pre-renders all page content into static HTML for SEO and
performance. JS only adds interactivity (theme toggle, hero canvas, listview); it
does not populate content. Idempotent.

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
    ('<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(-24 12 12)"/><path d="M12 12c2.6-1.1 5.2 0 6 2.2M12 12c-2.6 1.1-5.2 0-6-2.2"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/></svg>', "du"),
]


def _webp(src):
    """Return the .webp sibling path for a raster image src."""
    return re.sub(r"\.(jpe?g|png)$", ".webp", src, flags=re.I)


def _dog_photos(bio):
    """Render the personal dog photos (used in the About section)."""
    photos = ""
    for ph in bio.get("dogPhotos", []):
        if not ph.get("src"):
            continue
        if ph.get("creditLink"):
            credit = f' <a href="{ph["creditLink"]}" target="_blank" rel="noopener">{_esc(ph.get("creditName", ""))}</a>'
        elif ph.get("creditName"):
            credit = f' {_esc(ph["creditName"])}'
        else:
            credit = ""
        photos += (
            '<figure class="dog-photo"><picture>'
            f'<source srcset="{_webp(ph["src"])}" type="image/webp">'
            f'<img src="{ph["src"]}" alt="{_esc(ph.get("alt", ""))}" loading="lazy" width="800" height="533">'
            '</picture>'
            f'<figcaption>{_esc(ph.get("caption", ""))}{credit}</figcaption></figure>'
        )
    return f'<div class="dog-photos">{photos}</div>' if photos else ""


def generate_home_about(data):
    about = data["sections"]["about"]
    bio = data["sections"].get("biography", {})
    pi = about.get("profileImage", {})
    hb = about.get("highlightBox", {})
    ci = about.get("contactInfo", {})

    photo = ""
    if pi.get("src"):
        photo = (
            '<figure class="profile-figure">'
            '<picture>'
            f'<source srcset="{_webp(pi["src"])}" type="image/webp">'
            f'<img class="profile-image" src="{pi["src"]}" alt="{_esc(pi.get("alt", ""))}" '
            'width="384" height="513" loading="lazy">'
            '</picture></figure>'
        )
    highlight = ""
    if hb.get("content"):
        highlight = (
            '<aside class="callout">'
            f'<h3>{_esc(hb.get("title", ""))}</h3>'
            f'<p>{hb.get("content", "")}</p></aside>'
        )
    contact = ""
    if ci.get("email"):
        contact = (
            '<div class="contact-info">'
            f'<h3>{_esc(ci.get("title", "Contact"))}</h3>'
            f'<p><strong>Email:</strong> <a href="mailto:{ci["email"]}">{ci["email"]}</a></p>'
            f'<p><strong>Office:</strong> {_esc(ci.get("office", ""))}</p></div>'
        )
    note = bio.get("personalNote", "")
    personal = f'<p class="about-personal">{_esc(note)}</p>' if note else ""
    dogs = _dog_photos(bio)
    return (
        '<div class="container">\n'
        '<p class="section-kicker">Who I am</p>\n'
        f'<h2 class="section-title">{_esc(about.get("title", "About"))}</h2>\n'
        '<div class="intro-grid">\n'
        '<div class="intro-body">'
        f'<p class="about">{about.get("content", "")}</p>'
        f'{highlight}{contact}'
        '</div>\n'
        f'{photo}\n'
        '</div>\n'
        f'{personal}\n'
        f'{dogs}\n'
        "</div>"
    )


def generate_home_research(data):
    research = data["sections"]["research"]
    areas = research["areas"][:4]
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
    additional = research.get("additionalContent", "")
    pubs = research.get("publications", {})
    publinks = " · ".join(
        f'<a href="{l.get("url", "#")}" target="_blank" rel="noopener">{_esc(l.get("name", ""))}</a>'
        for l in pubs.get("links", [])
    )
    pubbox = ""
    if publinks:
        pubbox = (
            '<aside class="callout pub-callout">'
            f'<h3>{_esc(pubs.get("title", "Publications"))}</h3>'
            f'<p>{_esc(pubs.get("intro", ""))} {publinks}</p>'
            '<p class="callout-cta"><a href="publications.html">Browse all publications, metrics &amp; figures →</a></p>'
            '</aside>'
        )
    context = f'<p class="research-context">{_esc(additional)}</p>' if additional else ""
    return (
        '<div class="container">\n'
        '<p class="section-kicker">What I do</p>\n'
        '<h2 class="section-title">Statistics, AI &amp; astronomy</h2>\n'
        f'<p class="section-intro">{intro}</p>\n'
        f'<div class="research-grid">{"".join(cards)}</div>\n'
        f'{context}\n'
        f'{pubbox}\n'
        "</div>"
    )


def _inline_logo(logo):
    """Inline the ART logo SVG with fill->currentColor so it can be themed via CSS."""
    src = (logo or {}).get("src", "")
    if not src.endswith(".svg"):
        return ""
    try:
        svg = (PROJECT_ROOT / src).read_text(encoding="utf-8")
    except OSError:
        return ""
    svg = re.sub(r"<\?xml[^>]*\?>\s*", "", svg)
    svg = svg.replace('fill="#2f559d"', 'fill="currentColor"')
    svg = svg.replace("<svg ", '<svg class="art-logo-svg" aria-hidden="true" ', 1)
    return svg


def generate_home_team(data):
    team = data["sections"]["team"]
    logo = _inline_logo(team.get("logo"))
    logo_html = f'<figure class="art-logo" aria-label="{_esc(team.get("logo", {}).get("alt", ""))}">{logo}</figure>' if logo else ""
    hls = "".join(
        '<div class="art-highlight">'
        f'<span class="art-hl-icon" aria-hidden="true">{h.get("icon", "")}</span>'
        f'<div><h3>{_esc(h.get("title", ""))}</h3><p>{_esc(h.get("content", ""))}</p></div></div>'
        for h in team.get("highlights", [])
    )
    btns = []
    for c in team.get("cta", []):
        cls = "btn-primary" if c.get("type") == "primary" else "btn-ghost"
        url = c.get("url", "#")
        ext = url.startswith("http")
        attrs = ' target="_blank" rel="noopener"' if ext else ""
        arrow = ' <span aria-hidden="true">↗</span>' if ext else ""
        btns.append(f'<a class="btn {cls}" href="{url}"{attrs}>{_esc(c.get("text", ""))}{arrow}</a>')
    return (
        '<div class="container">\n'
        '<div class="art-panel">\n'
        f'{logo_html}\n'
        '<div class="art-body">\n'
        '<p class="art-eyebrow"><span class="art-badge">✦ Research Group</span>'
        '<a class="art-ext" href="https://astrostatuoft.com/" target="_blank" rel="noopener">astrostatuoft.com <span aria-hidden="true">↗</span></a></p>\n'
        f'<h2 class="section-title">{_esc(team.get("title", ""))}</h2>\n'
        f'<p class="team-tagline">{_esc(team.get("tagline", ""))}</p>\n'
        f'<p class="lead">{team.get("content", "")}</p>\n'
        f'<div class="art-highlights">{hls}</div>\n'
        f'<div class="cta">{"".join(btns)}</div>\n'
        '</div>\n'
        '</div>\n'
        "</div>"
    )


def _opp_link(l):
    name = _esc(l.get("name", ""))
    out = f'<a href="{l["url"]}" target="_blank" rel="noopener">{name}</a>' if l.get("url") else name
    if l.get("abbr"):
        out += f' ({_esc(l["abbr"])})'
    elif l.get("note"):
        out += f' <span class="opp-note">({_esc(l["note"])})</span>'
    return out


def _opp_links_html(card):
    """Render whatever link groups a card has: fellowships, programs, or opportunities."""
    out = ""
    for key, default in (("fellowships", "Fellowships:"), ("programs", "Programs:")):
        grp = card.get(key)
        if grp and grp.get("links"):
            links = ", ".join(_opp_link(l) for l in grp["links"])
            out += f'<p class="opp-links"><strong>{_esc(grp.get("intro", default))}</strong> {links}</p>'
    opps = card.get("opportunities")
    if isinstance(opps, list) and opps:
        links = ", ".join(_opp_link(o) for o in opps)
        out += f'<p class="opp-links"><strong>Programs:</strong> {links}</p>'
    return out


def generate_home_collab(data):
    collab = data["sections"]["collaboration"]
    vals = collab.get("values", {})
    val_items = "".join(
        f'<div class="value-item"><h4>{_esc(v.get("title", ""))}</h4>'
        f'<p>{_esc(v.get("content", ""))}</p></div>'
        for v in vals.get("items", [])
    )
    values_html = ""
    if val_items:
        values_html = (
            '<aside class="callout values-callout">'
            f'<h3>{_esc(vals.get("title", "Our Values"))}</h3>'
            f'<div class="values-grid">{val_items}</div></aside>'
        )
    opp = collab.get("opportunities", {})
    cards = "".join(
        f'<div class="card opp-card"><h3>{_esc(c.get("title", ""))}</h3>'
        f'<p>{_esc(c.get("content", ""))}</p>{_opp_links_html(c)}</div>'
        for c in opp.get("cards", [])
    )
    opp_heading = f'<h3 class="opp-heading">{_esc(opp.get("title", "Opportunities"))}</h3>' if cards else ""
    return (
        '<div class="container">\n'
        '<p class="section-kicker">Join us</p>\n'
        f'<h2 class="section-title">{_esc(collab.get("title", ""))}</h2>\n'
        f'<p class="section-intro">{_esc(collab.get("intro", ""))}</p>\n'
        f'{values_html}\n'
        f'{opp_heading}\n'
        f'<div class="grid-3 opp-grid">{cards}</div>\n'
        "</div>"
    )


def generate_home_bio(data):
    bio = data["sections"]["biography"]
    items = "".join(
        f'<div class="tl-item{" current" if t.get("current") else ""}">'
        f'<div class="tl-date">{_esc(t.get("date", ""))}</div>'
        f'<div class="tl-title">{_esc(t.get("title", ""))}'
        + ('<span class="tl-now">Now</span>' if t.get("current") else "")
        + '</div>'
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


def _truncate(s, n=320):
    """Escape + truncate prose at a word boundary for the featured-card abstract."""
    s = " ".join(str(s or "").split())
    if len(s) <= n:
        return _esc(s)
    return _esc(s[:n].rsplit(" ", 1)[0]) + "…"


def _generate_paper_card(pub, board=False):
    """Build a .paper card. board=True adds the abstract for the Featured spotlight."""
    title = pub.get("title", "")
    year = pub.get("year", "")
    journal = pub.get("journal", "")
    authors = pub.get("authors", []) or []
    cites_int = int(pub.get("citations", 0) or 0)
    cites_comma = f"{cites_int:,}"

    research_area = pub.get("researchArea", "")
    catkey = _PUB_CAT_MAP.get(research_area, ("du", "Discovery &amp; Understanding"))[0]

    role = pub.get("authorshipCategory")
    is_student = role == "student"
    is_postdoc = role == "postdoc"
    is_featured = bool(pub.get("featured"))

    # Class list and authorship accent
    cls = f"paper {catkey}"
    if board:
        cls += " feat-card"
    if is_student:
        cls += " student"
    elif is_postdoc:
        cls += " postdoc"

    tags = ""
    if is_featured:
        tags += '<span class="tag feat">★ Featured</span>'
    if is_student:
        tags += '<span class="tag stu">Student-led</span>'
    elif is_postdoc:
        tags += '<span class="tag pd">Postdoc-led</span>'

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

    # Resource links: ADS · arXiv · DOI (whichever exist)
    ads = pub.get("adsUrl")
    arxiv = pub.get("arxivId")
    doi = pub.get("doi")
    arxiv_url = f"https://arxiv.org/abs/{arxiv}" if arxiv else ""
    doi_url = f"https://doi.org/{doi}" if doi else ""
    links = ""
    if ads:
        links += f'<a class="reslink" href="{ads}" target="_blank" rel="noopener">ADS</a>'
    if arxiv_url:
        links += f'<a class="reslink" href="{arxiv_url}" target="_blank" rel="noopener">arXiv</a>'
    if doi_url:
        links += f'<a class="reslink" href="{doi_url}" target="_blank" rel="noopener">DOI</a>'

    # Title links to the best available target (arXiv -> ADS -> DOI)
    title_href = arxiv_url or ads or doi_url
    title_inner = _esc(title)
    title_html = (
        f'<a href="{title_href}" target="_blank" rel="noopener">{title_inner}</a>'
        if title_href else title_inner
    )

    authors_html = _format_authors_html(authors)
    cite_str = f"{cites_comma} citation{'s' if cites_int != 1 else ''}" if cites_int else ""
    meta = " · ".join(
        part for part in [authors_html, _esc(journal), str(year), cite_str] if part
    )

    abstract_html = ""
    if board and pub.get("abstract"):
        abstract_html = f'<p class="paper-abstract">{_truncate(pub["abstract"], 340)}</p>'

    return (
        f'<article class="{cls}" data-cat="{catkey}" data-year="{year}" '
        f'data-cites="{cites_int}" data-title="{_attr_esc(title)}" '
        f'data-authors="{_attr_esc(" ".join(authors))}">'
        f'<h3 class="paper-title">{title_html}</h3>'
        f'<div class="paper-meta">{meta}</div>'
        f'<div class="paper-badges">{tags}{badges}'
        f'<span class="paper-links">{links}</span></div>'
        f'{abstract_html}'
        f'</article>'
    )


_ROLE_META = [
    ("primary", "Primary author"), ("postdoc", "Postdoc-led"),
    ("student", "Student-led"), ("significant", "Contributor"), ("other", "Other"),
]


def _nice_ticks(maxv, target=4):
    import math
    if maxv <= 0:
        return [0, 1]
    raw = maxv / target
    mag = 10 ** math.floor(math.log10(raw))
    step = next((mag * m for m in (1, 2, 2.5, 5, 10) if mag * m >= raw), mag * 10)
    step = max(1, int(round(step)))
    return list(range(0, int(maxv) + step, step))


def _roles_svg(pubs):
    """Hand-rolled, theme-aware, accessible inline SVG: publications/year by role.

    Each segment carries data-tip (styled JS tooltip on hover); each year has a
    focusable transparent overlay with an aria-label summary (keyboard + screen
    reader). Colors come from CSS classes so one SVG adapts to both themes.
    """
    from collections import defaultdict, Counter
    by_year = defaultdict(Counter)
    for p in pubs:
        y = p.get("year")
        if y:
            by_year[int(y)][p.get("authorshipCategory") or "other"] += 1
    if not by_year:
        return ""
    years = list(range(min(by_year), max(by_year) + 1))
    maxstack = max((sum(by_year[y].values()) for y in years), default=1)
    ticks = _nice_ticks(maxstack)
    scale = max(maxstack, ticks[-1])

    esc_attr = lambda x: _esc(x).replace('"', "&quot;")
    W, H, ml, mr, mt, mb = 820, 300, 46, 14, 40, 30
    pw, ph, n = W - ml - mr, H - mt - mb, len(years)
    bw = pw / n * 0.64
    xc = lambda i: ml + (i + 0.5) * pw / n
    yv = lambda v: mt + ph - (v / scale) * ph

    s = [f'<svg class="pf-svg" viewBox="0 0 {W} {H}" role="group" '
         f'aria-label="Publications per year by my authorship role" preserveAspectRatio="xMinYMin meet">']
    for t in ticks:
        s.append(f'<line class="pf-grid" x1="{ml}" y1="{yv(t):.1f}" x2="{W - mr}" y2="{yv(t):.1f}"/>')
        s.append(f'<text class="pf-axis" x="{ml - 6}" y="{yv(t) + 3:.1f}" text-anchor="end">{t}</text>')
    for i, y in enumerate(years):
        col = by_year[y]
        base = 0
        for key, label in _ROLE_META:
            v = col.get(key, 0)
            if not v:
                continue
            y1, h = yv(base + v), (yv(base) - yv(base + v))
            tip = f"{y} · {label}: {v} publication" + ("s" if v != 1 else "")
            s.append(f'<rect class="pf-seg seg-{key}" x="{xc(i) - bw / 2:.1f}" y="{y1:.1f}" '
                     f'width="{bw:.1f}" height="{h:.1f}" data-tip="{esc_attr(tip)}"/>')
            base += v
        if base:
            parts = ", ".join(f"{col[k]} {lab.lower()}" for k, lab in _ROLE_META if col.get(k))
            summ = f"{y}: {base} publication" + ("s" if base != 1 else "") + f" — {parts}"
            s.append(f'<rect class="pf-col" x="{xc(i) - bw / 2 - 2:.1f}" y="{mt}" width="{bw + 4:.1f}" '
                     f'height="{ph}" tabindex="0" role="img" aria-label="{esc_attr(summ)}" data-tip="{esc_attr(summ)}"/>')
        if y % 2 == 0:
            s.append(f'<text class="pf-axis" x="{xc(i):.1f}" y="{H - mb + 16}" text-anchor="middle">{y}</text>')
    lx = ml
    for key, label in _ROLE_META:
        s.append(f'<rect class="pf-sw seg-{key}" x="{lx:.0f}" y="14" width="10" height="10" rx="2"/>')
        s.append(f'<text class="pf-legend" x="{lx + 14:.0f}" y="23">{label}</text>')
        lx += 14 + len(label) * 6.4 + 16
    s.append("</svg>")
    return "".join(s)


def _citations_svg(metrics):
    """Inline SVG: citations received per year (√ scale), with per-year hover/focus bands."""
    import math
    cpy = {int(y): v for y, v in (metrics.get("citationsPerYear") or {}).items()}
    if not cpy:
        return ""
    cur = max(cpy)
    years = [y for y in sorted(cpy) if y < cur] or sorted(cpy)
    vmax = max(cpy[y] for y in years)
    ticks = [t for t in (100, 500, 1000, 2000, 3000, 5000) if t <= vmax * 1.05] or [vmax]
    smax = math.sqrt(max(vmax, ticks[-1])) * 1.06
    W, H, ml, mr, mt, mb = 820, 290, 52, 14, 18, 30
    pw, ph, n = W - ml - mr, H - mt - mb, len(years)
    xc = lambda i: ml + (i * pw / (n - 1) if n > 1 else pw / 2)
    yv = lambda v: mt + ph - (math.sqrt(max(v, 0)) / smax) * ph
    esc_attr = lambda x: _esc(x).replace('"', "&quot;")
    s = [f'<svg class="pf-svg" viewBox="0 0 {W} {H}" role="group" aria-label="Citations received per year" preserveAspectRatio="xMinYMin meet">']
    for t in ticks:
        s.append(f'<line class="pf-grid" x1="{ml}" y1="{yv(t):.1f}" x2="{W - mr}" y2="{yv(t):.1f}"/>')
        s.append(f'<text class="pf-axis" x="{ml - 6}" y="{yv(t) + 3:.1f}" text-anchor="end">{t:,}</text>')
    pts = [(xc(i), yv(cpy[y])) for i, y in enumerate(years)]
    area = f"M{pts[0][0]:.1f},{mt + ph:.1f} " + " ".join(f"L{x:.1f},{y:.1f}" for x, y in pts) + f" L{pts[-1][0]:.1f},{mt + ph:.1f} Z"
    s.append(f'<path class="pf-area" d="{area}"/>')
    s.append(f'<path class="pf-cit-line" d="M' + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + '"/>')
    for x, y in pts:
        s.append(f'<circle class="pf-dot" cx="{x:.1f}" cy="{y:.1f}" r="3"/>')
    for i, y in enumerate(years):
        if y % 2 == 0:
            s.append(f'<text class="pf-axis" x="{xc(i):.1f}" y="{H - mb + 16}" text-anchor="middle">{y}</text>')
    step = pw / (n - 1) if n > 1 else pw
    for i, y in enumerate(years):
        tip = f"{y}: {cpy[y]:,} citations"
        s.append(f'<rect class="pf-band" x="{xc(i) - step / 2:.1f}" y="{mt}" width="{step:.1f}" height="{ph}" '
                 f'tabindex="0" role="img" aria-label="{esc_attr(tip)}" data-tip="{esc_attr(tip)}"/>')
    s.append("</svg>")
    return "".join(s)


_RIQ_SERIES = [
    ("all", "All papers"), ("primary", "Primary author"),
    ("significant", "Contributor"), ("student", "Student-led"), ("postdoc", "Postdoc-led"),
]


def _riq_svg(metrics):
    """Inline SVG: RIQ over time by authorship role, with the typical-range band."""
    riq = metrics.get("riqByCategory") or {}
    data = {}
    for key, _ in _RIQ_SERIES:
        ser = (riq.get(key) or {}).get("riq_series") or {}
        pts = sorted((int(y), float(v)) for y, v in ser.items())
        if pts:
            c = max(y for y, _ in pts)
            pts = [(y, v) for y, v in pts if y < c]
        data[key] = pts
    years = sorted({y for pts in data.values() for y, _ in pts})
    if not years:
        return ""
    vmax = max((v for pts in data.values() for _, v in pts), default=1)
    ticks = _nice_ticks(vmax)
    smax = max(vmax, ticks[-1]) * 1.06
    W, H, ml, mr, mt, mb = 820, 300, 46, 14, 40, 30
    pw, ph = W - ml - mr, H - mt - mb
    y0, y1 = years[0], years[-1]
    xc = lambda yr: ml + ((yr - y0) / (y1 - y0) * pw if y1 > y0 else pw / 2)
    yv = lambda v: mt + ph - (v / smax) * ph
    esc_attr = lambda x: _esc(x).replace('"', "&quot;")
    s = [f'<svg class="pf-svg" viewBox="0 0 {W} {H}" role="group" aria-label="Research Impact Quotient over time by authorship role" preserveAspectRatio="xMinYMin meet">']
    s.append(f'<rect class="pf-band-typ" x="{ml}" y="{yv(150):.1f}" width="{pw:.1f}" height="{yv(60) - yv(150):.1f}"/>')
    s.append(f'<line class="pf-mean" x1="{ml}" y1="{yv(100):.1f}" x2="{W - mr}" y2="{yv(100):.1f}"/>')
    s.append(f'<text class="pf-axis" x="{ml + 4}" y="{yv(100) - 4:.1f}">typical range</text>')
    for t in ticks:
        s.append(f'<line class="pf-grid" x1="{ml}" y1="{yv(t):.1f}" x2="{W - mr}" y2="{yv(t):.1f}"/>')
        s.append(f'<text class="pf-axis" x="{ml - 6}" y="{yv(t) + 3:.1f}" text-anchor="end">{t}</text>')
    for key, _ in _RIQ_SERIES:
        pts = data[key]
        if len(pts) < 2:
            continue
        s.append(f'<path class="pf-ln ln-{key}" d="M' + " L".join(f"{xc(yr):.1f},{yv(v):.1f}" for yr, v in pts) + '"/>')
    for yr in years:
        if yr % 2 == 0:
            s.append(f'<text class="pf-axis" x="{xc(yr):.1f}" y="{H - mb + 16}" text-anchor="middle">{yr}</text>')
    step = pw / (len(years) - 1) if len(years) > 1 else pw
    for yr in years:
        bits = []
        for key, label in _RIQ_SERIES:
            dy = {y: v for y, v in data[key]}
            if yr in dy:
                bits.append(f"{label} {round(dy[yr])}")
        if not bits:
            continue
        tip = f"{yr} — " + " · ".join(bits)
        s.append(f'<rect class="pf-band" x="{xc(yr) - step / 2:.1f}" y="{mt}" width="{step:.1f}" height="{ph}" '
                 f'tabindex="0" role="img" aria-label="{esc_attr(tip)}" data-tip="{esc_attr(tip)}"/>')
    lx = ml
    for key, label in _RIQ_SERIES:
        cur = (riq.get(key) or {}).get("current")
        lab = f"{label} ({cur})" if cur is not None else label
        s.append(f'<rect class="pf-sw seg-{key}" x="{lx:.0f}" y="14" width="10" height="10" rx="2"/>')
        s.append(f'<text class="pf-legend" x="{lx + 14:.0f}" y="23">{lab}</text>')
        lx += 14 + len(lab) * 6.2 + 16
    s.append("</svg>")
    return "".join(s)


def _mix_svg(pubs):
    """Inline SVG: a full-width 100% horizontal bar of research mix (by area)."""
    from collections import defaultdict
    # (full name, key, short legend label)
    areas = [("Statistical Learning & AI", "sla", "Statistical Learning"),
             ("Interpretability & Insight", "ii", "Interpretability"),
             ("Inference & Computation", "ic", "Inference"),
             ("Discovery & Understanding", "du", "Discovery")]
    agg = defaultdict(float)
    for p in pubs:
        cp = p.get("categoryProbabilities") or {}
        tot = sum(float(cp.get(name, 0)) for name, _, _ in areas)
        if tot <= 0:
            continue
        for name, _, _ in areas:
            agg[name] += float(cp.get(name, 0)) / tot
    grand = sum(agg.values())
    if grand <= 0:
        return ""
    fr = sorted(((key, name, short, agg[name] / grand) for name, key, short in areas), key=lambda r: -r[3])
    esc_attr = lambda x: _esc(x).replace('"', "&quot;")
    W, H, bx0, bx1, by, bh = 820, 62, 2, 818, 6, 30
    bw = bx1 - bx0
    s = [f'<svg class="pf-svg pf-mix" viewBox="0 0 {W} {H}" role="group" aria-label="Research mix: share of work by area" preserveAspectRatio="xMinYMin meet">']
    x = bx0
    for key, name, short, frac in fr:
        w = frac * bw
        tip = f"{name}: {round(frac * 100)}% of classified output"
        s.append(f'<rect class="mix-seg mix-{key}" x="{x:.1f}" y="{by}" width="{max(0, w - 2):.1f}" height="{bh}" rx="3" '
                 f'tabindex="0" role="img" aria-label="{esc_attr(tip)}" data-tip="{esc_attr(tip)}"/>')
        x += w
    lx, ly = bx0, H - 7
    for key, name, short, frac in fr:
        label = f"{short} {round(frac * 100)}%"
        s.append(f'<circle class="mix-dot mix-{key}" cx="{lx + 4:.0f}" cy="{ly - 4:.0f}" r="4"/>')
        s.append(f'<text class="pf-legend" x="{lx + 13:.0f}" y="{ly:.0f}">{_esc(label)}</text>')
        lx += 13 + len(label) * 6.3 + 20
    s.append("</svg>")
    return "".join(s)


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

    # Top summary: authorship-role buttons linking to the curated ADS libraries
    from collections import Counter
    role_counts = Counter(p.get("authorshipCategory") for p in pubs)
    _ADS_LIB = "https://ui.adsabs.harvard.edu/user/libraries/"
    role_buttons = [
        ("Total papers",   total_papers,                     "YiaebBefTHKZdblrny2Vsw"),
        ("Primary author", role_counts.get("primary", 0),    "Jy98AvjOQXqykOSJ-bn96Q"),
        ("Postdoc-led",    role_counts.get("postdoc", 0),    "6-JKiyOATdqEzuDGuUMWwg"),
        ("Student-led",    role_counts.get("student", 0),    "yyWDBaVwS0GIrIkz2GKltg"),
        ("Contributor",    role_counts.get("significant", 0), "X5RfsxxzRXC-BWjU11xa4A"),
    ]
    dashboard = '<div class="pub-stats pub-authorship">' + "".join(
        f'<a class="pub-stat pub-statlink" href="{_ADS_LIB}{lib}" target="_blank" rel="noopener" '
        f'aria-label="{label}: {cnt} papers (opens the ADS library)">'
        f'<span class="n">{cnt:,}</span><span class="l">{label}</span>'
        f'<span class="pub-stat-go" aria-hidden="true">ADS ↗</span></a>'
        for label, cnt, lib in role_buttons
    ) + '</div>'

    # peak citation year (excluding the current partial year)
    cpy = {int(y): v for y, v in metrics.get("citationsPerYear", {}).items()}
    peak_txt = f"{total_citations:,} total"
    if cpy:
        cur = max(cpy)
        complete = {y: v for y, v in cpy.items() if y < cur} or cpy
        py = max(complete, key=complete.get)
        peak_txt = f"{total_citations:,} total · peak {complete[py]:,} in {py}"

    def _fig(title, meta, svg, wide=False):
        cls = "pub-fig wide" if wide else "pub-fig"
        return (
            f'<figure class="{cls}">'
            f'<figcaption class="pub-fig-head"><span class="t">{title}</span>'
            f'<span class="m">{meta}</span></figcaption>'
            f'{svg}</figure>'
        )

    figures = (
        '<div class="pub-figures">'
        + _fig("Research mix", "share of work by area", _mix_svg(papers_with_year), wide=True)
        + _fig("Citations received per year", peak_txt, _citations_svg(metrics), wide=True)
        + _fig("Publications by year &amp; role", "hover or tab through the bars", _roles_svg(papers_with_year))
        + _fig("Research impact by role", "RIQ vs. the typical astronomer range", _riq_svg(metrics))
        + '</div>'
        '<p class="pub-fig-note"><strong>Why these figures?</strong> I find it easier to see what I work on '
        'and the impact it’s had as a picture than as a list — so rather than just enumerate papers, these '
        'summarize the record a few ways. <strong>Research '
        'mix</strong> shows what the work is about, weighting each paper by its classification across the four '
        'areas. The <strong>role breakdowns</strong> separate work led as primary author from work led by '
        'postdocs, students, and larger collaborations. (Citations use a square-root scale so the '
        'early years stay legible; the current partial year is omitted.) <strong>RIQ</strong> '
        '(Research Impact Quotient) normalizes citation impact by career length — roughly √(total citations) ÷ '
        'years active — so impact compares fairly across career stages instead of just growing with time; the '
        'shaded band is the typical range for established astronomers '
        '(<a href="https://doi.org/10.1371/journal.pone.0046428" target="_blank" rel="noopener">Pepe &amp; Kurtz 2012</a>).</p>'
    )

    # Featured spotlight (papers flagged featured=true), shown with abstracts
    featured = [p for p in papers_with_year if p.get("featured")]
    feat_html = ""
    if featured:
        fcards = "".join(_generate_paper_card(p, board=True) for p in featured)
        feat_html = (
            '<section class="pub-featured" aria-labelledby="featured-head">'
            '<h2 id="featured-head" class="pub-featured-head">Featured work</h2>'
            f'<div class="featured-grid">{fcards}</div>'
            '</section>'
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
        + figures
        + feat_html
        + '<h2 class="sr-only">All publications</h2>'
        + controls
        + list_section
        + '</div>'
    )


def build_page(page_name, html, data):
    """Fill each page's content container(s) from content.json. Redesign pages are
    static shells (head/nav/hero/footer); only the content area is generated — the
    `#<page>-content` container for the eight secondary pages, and the per-section
    ids #about/#research/#team/#join/#bio for Home (404.html is not handled here)."""

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
