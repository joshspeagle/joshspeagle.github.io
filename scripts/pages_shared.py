"""Shared helpers for the site build: escaping, text cleanup, date parsing, and the
generic listview `scaffold()` used by the per-page content generators
(pages_<page>.py: talks, teaching, mentorship, awards, service, software, news).

This module is the ONLY place escaping helpers live — build_html.py imports them
from here rather than redefining them (see the escaping contract below).

Escaping contract
-----------------
  esc(s)          entity-aware escape of bare '&' — for text that MAY carry inline markup
  esc_text(s)     esc() + '<'/'>' — for text that must never carry markup
  attr_esc(s)     esc() + '"' + lowercase — for data-search / data-title sort+filter keys
  url_attr(s)     esc() + '"', '<', '>' — for href/src (never lowercased; URLs are case-sensitive)
  accent_class(s) validates a declared accent name before it is pasted into a class
                  attribute (`accent-<x>` / `d-<x>`); anything else becomes 'mute'

Each page module exposes `generate_content(data) -> str` returning the inner HTML for that
page's `#<page>-content` container. Use `scaffold(...)` to wrap the page's pre-rendered
cards in the generic interactive listview (search + filter chips + optional sort + load-more),
which is enhanced by assets/js/redesign/listview.js.

`data-chip` marks a block the board (assets/js/redesign/board.js) routes ONE copper
trace into. scaffold() puts it on the list column; a page adds it to its stat/tiles
block, each figure card and the featured board. Keep it to <= 8 per page — list
*items* are chips visually but never carry a trace of their own.

Per-item card convention (so listview.js can filter/search/sort):
  <article class="item accent-<accent>" data-lv-item
           data-cat="<key>"            (space-separated keys allowed; matches a filter chip)
           data-search="<lowercased searchable text: title + people + keywords>"
           data-year="<int>"           (REQUIRED whenever the list offers a 'year' sort)
           data-num="<int>"            (secondary numeric sort, e.g. citations/count)
           data-title="<lowercased>">  (for sort='az')
     ...content (use .item-head/.item-title/.item-when/.item-meta/.item-tags, .badge/.tag)...
  </article>
"""
import math
import re
import sys

# ---------------------------------------------------------------------------
# Escaping (single source of truth for the whole build)
# ---------------------------------------------------------------------------

def esc(s):
    """Escape bare & in plain text without double-encoding existing entities."""
    return re.sub(r"&(?!(?:amp|lt|gt|quot|#\d+);)", "&amp;", str(s or ""))

def esc_text(s):
    """Full plain-text escape (&, <, >) for fields that must never carry markup."""
    return esc(s).replace("<", "&lt;").replace(">", "&gt;")

def attr_esc(s):
    """Lowercase + escape for a double-quoted HTML attribute value (data-search/title).
    These keys are plain text, so any inline markup in the source data is stripped."""
    return esc_text(strip_tags(s)).replace('"', "&quot;").lower()

def url_attr(s):
    """Escape a URL for a double-quoted href/src attribute. Unlike attr_esc this does
    NOT lowercase (URLs are case-sensitive), and it escapes &, ", <, >."""
    return esc(str(s or "")).replace('"', "&quot;").replace("<", "&lt;").replace(">", "&gt;")

def strip_tags(s):
    """Remove any HTML tags from a string (for building plain search/sort text)."""
    return re.sub(r"<[^>]+>", "", str(s or ""))

def slug(s):
    """Lowercase, hyphenated, attribute-safe slug (used for filter-chip keys)."""
    s = re.sub(r"[^a-z0-9]+", "-", strip_tags(s).lower()).strip("-")
    return s or "other"

def warn(msg):
    """Print a build WARNING to stderr (visible in the build log and in CI)."""
    print(f"  WARNING: {msg}", file=sys.stderr)


# ---------------------------------------------------------------------------
# Icon sprite (Design G)
#
# Emitted ONCE per document by build_html.render_shell(), immediately after
# <body>, so every <use href="#..."> on the page (and every symbol board.js
# stamps into #board) resolves without a network request:
#   star4   the brand asterism, also the "latest point" marker in the figures
#   mark / mark-s   the trace-ending-in-a-star logo (outline / solid nav weight)
#   via     a hollow ring: a junction on the board
#   pad     a filled disc: a category pad
#   gnd     the ground symbol that terminates the trunk above the footer
#   ic-sla / ic-ii / ic-ic / ic-du   the four research areas
#   ic-team a two-vias-joined glyph for the collaborative-team highlight
# ---------------------------------------------------------------------------

SPRITE = (
    '  <svg class="sprite" aria-hidden="true" focusable="false"><defs>\n'
    '<symbol id="star4" viewBox="0 0 8 8"><path d="M4 0 L4.9 3.1 L8 4 L4.9 4.9 L4 8 L3.1 4.9 L0 4 L3.1 3.1 Z" fill="currentColor"/></symbol>\n'
    '<symbol id="mark" viewBox="0 0 32 32"><path d="M5 26 L11 20 H19 L25 14 V7.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 20 L23 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="5" cy="26" r="2.1" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="11" cy="20" r="2.1" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="23" cy="24" r="2.1" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="19" cy="20" r="2.4" fill="currentColor"/><g transform="translate(21.3,3.3) scale(.92)"><use href="#star4"/></g></symbol>\n'
    '<symbol id="mark-s" viewBox="0 0 32 32"><path d="M5 26 L11 20 H19 L25 14 V8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 20 L23 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="5" cy="26" r="2.6" fill="currentColor"/><circle cx="11" cy="20" r="2.6" fill="currentColor"/><circle cx="23" cy="24" r="2.6" fill="currentColor"/><circle cx="19" cy="20" r="2.9" fill="currentColor"/><g transform="translate(20.4,2.4) scale(1.15)"><use href="#star4"/></g></symbol>\n'
    '<symbol id="via" viewBox="0 0 16 16"><circle cx="8" cy="8" r="4.6" fill="none" stroke="currentColor" stroke-width="2.6"/></symbol>\n'
    '<symbol id="pad" viewBox="0 0 16 16"><circle cx="8" cy="8" r="3.6" fill="currentColor"/></symbol>\n'
    '<symbol id="gnd" viewBox="0 0 24 24"><path d="M12 3V11M4.5 11H19.5M7.5 15H16.5M10.5 19H13.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></symbol>\n'
    '<symbol id="ic-sla" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4.4 5.9L8.2 9.7V12h2"/><path d="M4.4 18.1L8.2 14.3V12"/><path d="M14 12h1.8l3.8-3.8"/><path d="M14 12h6"/><path d="M14 12h1.8l3.8 3.8"/></g><circle cx="3.4" cy="5" r="1.25" fill="currentColor"/><circle cx="3.4" cy="19" r="1.25" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="20.6" cy="7.4" r="1.25" fill="currentColor"/><circle cx="21" cy="12" r="1.25" fill="currentColor"/><circle cx="20.6" cy="16.6" r="1.25" fill="currentColor"/></symbol>\n'
    '<symbol id="ic-ii" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 9.8V17.5A2 2 0 0 0 7.5 19.5H16.5A2 2 0 0 0 18.5 17.5V9.8"/><path d="M4.2 7.4L19.8 5"/><path d="M9.9 16.2H11.9L14.2 13.9"/></g><circle cx="9" cy="16.2" r="1.3" fill="currentColor"/><circle cx="15.5" cy="13.1" r="1.7" fill="none" stroke="currentColor"/></symbol>\n'
    '<symbol id="ic-ic" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="13.6" cy="13" rx="7.4" ry="5.4" transform="rotate(-20 13.6 13)"/><ellipse cx="13.6" cy="13" rx="4.9" ry="3.5" transform="rotate(-20 13.6 13)"/><ellipse cx="13.6" cy="13" rx="2.4" ry="1.7" transform="rotate(-20 13.6 13)"/><path d="M2.6 3.4h2.2l7.1 7.1"/></g><circle cx="1.9" cy="3.4" r="1.2" fill="currentColor"/><circle cx="13.6" cy="13" r="1.5" fill="currentColor"/></symbol>\n'
    '<symbol id="ic-du" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M7 9.4V6.4A1.4 1.4 0 0 1 8.4 5H11"/><path d="M15 5H17.6A1.4 1.4 0 0 1 19 6.4V9.4"/><path d="M19 13.6V16.6A1.4 1.4 0 0 1 17.6 18H15"/><path d="M11 18H8.4A1.4 1.4 0 0 1 7 16.6V13.6"/></g><g transform="translate(9.4,7.9) scale(.9)"><use href="#star4"/></g><circle cx="3.2" cy="16.6" r="1.15" fill="currentColor"/><circle cx="21.6" cy="3.4" r="0.95" fill="currentColor"/></symbol>\n'
    '<symbol id="ic-team" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8.6 7.4H12l3.4 3.9"/><path d="M8.6 16.6H12l3.4-3.9"/><circle cx="5.4" cy="7.4" r="2.2"/><circle cx="5.4" cy="16.6" r="2.2"/><circle cx="18.6" cy="12" r="2.2"/></g><circle cx="18.6" cy="12" r="0.9" fill="currentColor"/></symbol>\n'

    '  </defs></svg>'
)

_ACCENT_RE = re.compile(r"^[a-z][a-z0-9-]*$")


def accent_class(accent, what=""):
    """Validate a declared accent name before it is interpolated into a class
    attribute (`accent-<x>`, `d-<x>`). Accents come from content.json, so they are
    never escaped by esc()/attr_esc() on the way in; anything that is not a plain
    CSS-identifier tail falls back to the neutral 'mute' stripe with a warning."""
    name = str(accent or "").strip()
    if _ACCENT_RE.match(name):
        return name
    warn(f"invalid accent {accent!r}{' for ' + what if what else ''}; using a neutral stripe")
    return "mute"


# ---------------------------------------------------------------------------
# Text cleanup for pipeline-sourced prose (publication titles + abstracts)
# ---------------------------------------------------------------------------

# TeX commands that map to a single character.
_TEX_CHARS = {
    r"\alpha": "α", r"\beta": "β", r"\gamma": "γ", r"\delta": "δ", r"\epsilon": "ε",
    r"\zeta": "ζ", r"\eta": "η", r"\theta": "θ", r"\kappa": "κ", r"\lambda": "λ",
    r"\mu": "μ", r"\nu": "ν", r"\xi": "ξ", r"\pi": "π", r"\rho": "ρ",
    r"\sigma": "σ", r"\tau": "τ", r"\phi": "φ", r"\chi": "χ", r"\psi": "ψ",
    r"\omega": "ω", r"\Delta": "Δ", r"\Lambda": "Λ", r"\Omega": "Ω",
    r"\Sigma": "Σ", r"\Phi": "Φ",
    r"\sim": "∼", r"\approx": "≈", r"\propto": "∝", r"\times": "×",
    r"\pm": "±", r"\mp": "∓", r"\leq": "≤", r"\geq": "≥", r"\ll": "≪", r"\gg": "≫",
    r"\lesssim": "≲", r"\gtrsim": "≳", r"\odot": "⊙", r"\infty": "∞", r"\deg": "°",
}
# Font/emphasis wrappers whose braces are simply unwrapped.
_TEX_WRAPPERS = ("textit", "textbf", "textrm", "texttt", "textsf", "emph", "mathrm", "mathit")

_SUP = str.maketrans("0123456789+-=()n", "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿ")
_SUB = str.maketrans("0123456789+-=()", "₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎")


def _script(match, table):
    """Render a simple ^{...} / _{...} group as Unicode super/subscript when every
    character maps; otherwise drop only the braces."""
    body = match.group(1)
    try:
        if body and all(c in table for c in map(ord, body)):
            return body.translate(table)
    except TypeError:  # pragma: no cover - defensive
        pass
    return body


def clean_text(s):
    """Normalize pipeline-sourced prose for display (render side only — the JSON is
    left untouched): strip a leading 'Abstract ', map TeX quotes to curly quotes, and
    unwrap simple inline math (\\alpha, $...$, \\textit{...}, ^{...}, _{...})."""
    s = str(s or "")
    s = re.sub(r"^\s*abstract[:.]?\s+", "", s, flags=re.I)
    s = s.replace("``", "\u201c").replace("''", "\u201d")
    for wrapper in _TEX_WRAPPERS:
        s = re.sub(r"\\" + wrapper + r"\{([^{}]*)\}", r"\1", s)
    for cmd, ch in _TEX_CHARS.items():
        s = re.sub(re.escape(cmd) + r"(?![A-Za-z])", ch, s)
    s = re.sub(r"\^\{([^{}]*)\}", lambda m: _script(m, _SUP), s)
    s = re.sub(r"_\{([^{}]*)\}", lambda m: _script(m, _SUB), s)
    s = re.sub(r"\$([^$]*)\$", r"\1", s)          # unwrap inline math delimiters
    s = re.sub(r"\\[,;!\s]", " ", s)              # TeX spacing macros
    return re.sub(r"\s+", " ", s).strip()


# ---------------------------------------------------------------------------
# Year / period parsing (shared by talks, teaching, mentorship, service)
# ---------------------------------------------------------------------------

_SEASON_ORD = {"winter": 1, "spring": 2, "summer": 3, "fall": 4, "autumn": 4}

_MONTHS3 = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}


def parse_latest_year(value):
    """Latest 4-digit year mentioned in a string (or in any string of an iterable).

    Handles ranges ("Full Year 2023-2024") and annotations ("Winter 2022 (partial)").
    Returns 0 when no year is present.
    """
    if value is None:
        return 0
    parts = [value] if isinstance(value, str) else list(value)
    years = [int(y) for p in parts for y in re.findall(r"(?:19|20)\d{2}", str(p))]
    return max(years) if years else 0


def all_years(value):
    """Every distinct 4-digit year mentioned in a string (or in any string of an
    iterable), ascending. Unlike parse_latest_year() this keeps both ends of a range,
    so "Full Year 2023-2024" counts as two years taught."""
    parts = [value] if isinstance(value, str) else list(value or [])
    return sorted({int(y) for p in parts for y in re.findall(r"(?:19|20)\d{2}", str(p))})


def percent_shares(values):
    """Whole-number percentages that always sum to 100 (largest-remainder method).

    Rounding each share independently can produce a legend that reads 99% or 101%;
    this floors every share and hands the leftover points to the largest remainders.
    """
    vals = [max(0.0, float(v or 0)) for v in values]
    total = sum(vals)
    if total <= 0:
        return [0] * len(vals)
    exact = [v / total * 100 for v in vals]
    out = [int(math.floor(e)) for e in exact]
    for i in sorted(range(len(out)), key=lambda i: -(exact[i] - out[i]))[:100 - sum(out)]:
        out[i] += 1
    return out


def period_end_year(period):
    """End year of a period for 'newest first' sorting: ongoing roles ('…-Present')
    sort to the top (9999), else the latest year mentioned, else 0."""
    if "present" in str(period or "").lower():
        return 9999
    return parse_latest_year(period)


def period_end_key(period):
    """(year, season) sort key taken from the text AFTER the last dash, so e.g.
    Fall 2024 > Summer 2024 > 2023. 'Present' sorts above everything."""
    end = re.split(r"\s*[-–]\s*", str(period or "").strip())[-1].strip().lower()
    if "present" in end:
        return (9999, 9)
    year = parse_latest_year(end)
    season = next((o for s, o in _SEASON_ORD.items() if s in end), 0)
    return (year, season)


_RANGE_OPEN = {"present", "now", "ongoing", "current"}
_RANGE_WORDS = _RANGE_OPEN | set(_SEASON_ORD) | set(_MONTHS3) | {
    "january", "february", "march", "april", "june", "july", "august",
    "september", "sept", "october", "november", "december"}
_RANGE_PAIR = re.compile(r"([A-Za-z0-9'’]+)\s*-\s*([A-Za-z0-9'’]+)")


def _range_token(tok):
    """True when a token can be one end of a date range (a year, a month, a season,
    or an open end like 'Present')."""
    t = tok.strip().lower()
    return bool(re.search(r"\d", t)) or t in _RANGE_WORDS


def date_range(text):
    """A date/period string with an en dash between the two ends of a range:
    "2011 - 2015" -> "2011–2015", "Fall 2026-Present" -> "Fall 2026–Present",
    "Jan-Apr 2025" -> "Jan–Apr 2025".

    Applied at render time (B14) so the ~50 date strings in content.json can stay
    however they were typed and the year parsers keep seeing plain hyphens. A hyphen
    inside a word ("Co-Supervisor", "post-common-envelope") is left alone: both sides
    must look like the end of a date.
    """
    return _RANGE_PAIR.sub(
        lambda m: f"{m.group(1)}–{m.group(2)}" if _range_token(m.group(1)) and _range_token(m.group(2))
        else m.group(0),
        str(text or ""))


def term_month(term):
    """Representative month (1-12) for a term/date string; month names win over
    season words (winter/spring/summer/fall). 0 if nothing is recognized."""
    t = str(term or "").lower()
    for name, num in _MONTHS3.items():
        if name in t:
            return num
    for season, num in {"winter": 1, "spring": 4, "summer": 6, "fall": 9, "autumn": 9}.items():
        if season in t:
            return num
    return 0


# ---------------------------------------------------------------------------
# Generic listview scaffold
# ---------------------------------------------------------------------------

def listview_status():
    """The sr-only live region listview.js updates with "<n> of <N> shown" (D8).
    Emitted empty so a JS-less visit announces nothing rather than something false."""
    return '<p class="sr-only" data-lv-status role="status" aria-live="polite"></p>'


def card_meta(*parts, lead_html=""):
    """The mono metadata line every list card carries (design G §3).

    One ' · '-separated line of mono caps at the top of a card — the fields that
    place it (when · where · what kind), with the load-bearing one (the role, the
    type) in text-2 600. Pass a plain string for a quiet field or a (text, True)
    tuple for an emphasised one; `lead_html` is pre-built markup (a <time> element)
    that goes first. Every field must already be shown NOWHERE else on the card:
    the point of the line is to replace scattered date/type chrome, not add to it.
    """
    out = [lead_html] if lead_html else []
    for part in parts:
        strong = False
        if isinstance(part, tuple):
            part, strong = part
        text = str(part or "").strip()
        if not text:
            continue
        out.append(f"<b>{esc(text)}</b>" if strong else esc(text))
    return f'<p class="card-meta">{" · ".join(out)}</p>' if out else ""


def chip(cat, label, count, accent=None, active=False):
    """One filter chip. `accent` names the CSS colour class for the dot (defaults to
    the category key); `count` may be None to omit the tally.

    The key is normalized with slug() here and on the card side, so a data-supplied
    category can never break out of the attribute (and both sides still match)."""
    key = slug(cat)
    dot = "" if key == "all" else f'<span class="dot d-{accent_class(accent or key, "filter chip")}"></span>'
    cls = "chip is-active" if active else "chip"
    ap = "true" if active else "false"
    ct = f' <span class="ct">{count}</span>' if count is not None else ""
    return f'<button class="{cls}" data-cat="{key}" aria-pressed="{ap}">{dot}{esc(label)}{ct}</button>'


def scaffold(items_html, filters, total, sorts=None, batch=20,
             search_ph="Search…", default_sort="default", heading="Results",
             empty_msg="No items match your search or filters.", pinned_html=""):
    """Wrap pre-rendered cards in the interactive listview root.

    filters: list of (cat_key, label, count) or (cat_key, label, count, accent) tuples
             for the category chips (the 'All' chip is added). `accent` names the CSS
             colour class for the chip dot; it defaults to the category key.
    total:   count shown on the 'All' chip.
    sorts:   list of (value, label) for the sort <select>, or None to omit sorting.
    batch:   load-more page size (0 = show all, no load-more button).
    pinned_html: optional block rendered INSIDE the listview root ahead of the controls
             (e.g. a "Featured" board) so JS can hide it while a search/filter is active.
    """
    chips = [chip("all", "All", total, active=True)]
    for f in filters:
        cat, label, count = f[0], f[1], f[2]
        chips.append(chip(cat, label, count, accent=(f[3] if len(f) > 3 else None)))
    chips_html = "".join(chips)

    sort_html = ""
    if sorts:
        opts = "".join(f'<option value="{v}">{esc(label)}</option>' for v, label in sorts)
        sort_html = f'<select class="pub-sort" data-lv-sort-control aria-label="Sort">{opts}</select>'

    more_html = '<div class="pub-loadmore-wrap"><button type="button" class="btn-ghost" data-lv-more>Load more</button></div>' if batch else ""

    return (
        '<div class="container">\n'
        f'<div data-listview data-lv-batch="{batch}" data-lv-sort="{default_sort}">\n'
        f'{pinned_html}'
        f'<h2 class="sr-only">{esc(heading)}</h2>\n'
        '<div class="pub-controls">\n'
        f'<input type="search" class="pub-search" data-lv-search placeholder="{esc(search_ph)}" aria-label="{esc(search_ph)}">\n'
        f'{sort_html}\n'
        f'<div class="pub-filters" data-lv-filters role="group" aria-label="Filter">{chips_html}</div>\n'
        '</div>\n'
        f'{listview_status()}\n'
        f'<div class="pub-list" data-lv-list data-chip>{items_html}</div>\n'
        f'<p class="pub-empty" data-lv-empty hidden>{esc(empty_msg)} <button type="button" class="linkbtn" data-lv-reset>Show all</button></p>\n'
        f'{more_html}\n'
        '</div>\n'
        '</div>'
    )
