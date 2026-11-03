"""
Writing page generator (writing.html). generate_content(data) -> inner HTML for #writing-content.

Renders `sections.writing` from content.json as an editorial index:
  1. One panel per multi-part series, with its summary, entry links, and a book-style
     table of contents grouped by act (part number, title, and one-line summary).
  2. A plain chronological list of standalone essays, when `essays` has entries.

The act and part titles mirror the series' own landing page under writing/<series-slug>/,
so the two stay in step when a part is renamed.
"""

from pages_shared import clean_text, esc_text, url_attr


def _render_part(part):
    """Render one table-of-contents row for a series part."""
    return (
        f'<li class="wr-part">'
        f'<a class="wr-part-link" href="{url_attr(part.get("url", "#"))}">'
        f'<span class="wr-part-num" aria-hidden="true">{int(part.get("num", 0)):02d}</span>'
        f'<span class="wr-part-body">'
        f'<span class="wr-part-title">{esc_text(part.get("title", ""))}</span>'
        f'<span class="wr-part-summary">{esc_text(part.get("summary", ""))}</span>'
        f'</span>'
        f'</a></li>'
    )


def _render_series(series):
    """Render a series panel: heading, summary, entry links, and the act-grouped contents."""
    sid = series.get("id", "series")
    title = esc_text(series.get("title", ""))
    landing = url_attr(series.get("landingUrl", "#"))
    start = url_attr(series.get("startUrl", landing))
    acts = series.get("acts", [])
    n_parts = sum(len(a.get("parts", [])) for a in acts)

    meta_bits = [esc_text(series.get("kind", "Series")), f"{n_parts} parts", esc_text(series.get("date", ""))]
    meta = " · ".join(b for b in meta_bits if b)

    summary = "".join(f"<p>{clean_text(p)}</p>" for p in series.get("summary", []))

    links = [f'<a class="btn" href="{start}">Start with Part 1</a>',
             f'<a class="btn-ghost" href="{landing}">Introduction &amp; overview</a>']
    minor = []
    if series.get("referenceUrl"):
        minor.append(f'<a href="{url_attr(series["referenceUrl"])}">Rules, glossary &amp; references</a>')
    if series.get("sourceUrl"):
        minor.append(f'<a href="{url_attr(series["sourceUrl"])}" target="_blank" '
                     f'rel="noopener noreferrer">The original Playbook on GitHub ↗</a>')
    minor_html = f'<p class="wr-series-minor">{" · ".join(minor)}</p>' if minor else ""

    act_blocks = []
    for act in acts:
        parts = "".join(_render_part(p) for p in act.get("parts", []))
        act_blocks.append(
            f'<div class="wr-act">'
            f'<div class="wr-act-head">'
            f'<span class="wr-act-num">{esc_text(act.get("num", ""))}</span>'
            f'<h3 class="wr-act-title">{esc_text(act.get("title", ""))}</h3>'
            f'<p class="wr-act-desc">{esc_text(act.get("description", ""))}</p>'
            f'</div>'
            f'<ol class="wr-parts">{parts}</ol>'
            f'</div>'
        )

    return (
        f'<article class="wr-series" id="{esc_text(sid)}" aria-labelledby="{esc_text(sid)}-title">'
        f'<header class="wr-series-head">'
        f'<p class="wr-series-meta">{meta}</p>'
        f'<h2 class="wr-series-title" id="{esc_text(sid)}-title"><a href="{landing}">{title}</a></h2>'
        f'<div class="wr-series-summary">{summary}</div>'
        f'<div class="cta wr-series-cta">{"".join(links)}</div>'
        f'{minor_html}'
        f'</header>'
        f'<div class="wr-contents">'
        f'<h3 class="wr-contents-label">Contents</h3>'
        f'{"".join(act_blocks)}'
        f'</div>'
        f'</article>'
    )


def _render_essays(essays):
    """Render standalone essays as a simple dated list (newest first)."""
    if not essays:
        return ""
    rows = []
    for e in sorted(essays, key=lambda e: e.get("dateSort", e.get("date", "")), reverse=True):
        rows.append(
            f'<li class="wr-essay">'
            f'<span class="wr-essay-date">{esc_text(e.get("date", ""))}</span>'
            f'<a class="wr-essay-title" href="{url_attr(e.get("url", "#"))}">{esc_text(e.get("title", ""))}</a>'
            f'<p class="wr-essay-summary">{clean_text(e.get("summary", ""))}</p>'
            f'</li>'
        )
    return (
        '<section class="wr-essays" aria-labelledby="wr-essays-title">'
        '<div class="sec-head"><h2 class="section-title" id="wr-essays-title">Essays</h2>'
        '<div class="rule" aria-hidden="true"></div></div>'
        f'<ul class="wr-essay-list">{"".join(rows)}</ul>'
        '</section>'
    )


def generate_content(data):
    """Build the #writing-content inner HTML from content.json."""
    w = data.get("sections", {}).get("writing", {})
    series_html = "".join(_render_series(s) for s in w.get("series", []))
    return '<div class="container">' + series_html + _render_essays(w.get("essays", [])) + '</div>'
