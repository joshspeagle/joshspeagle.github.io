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

    more_html = '<div class="pub-loadmore-wrap"><button type="button" class="btn btn-ghost" data-lv-more>Load more</button></div>' if batch else ""

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
        f'<div class="pub-list" data-lv-list>{items_html}</div>\n'
        f'<p class="pub-empty" data-lv-empty hidden>{esc(empty_msg)} <button type="button" class="linkbtn" data-lv-reset>Show all</button></p>\n'
        f'{more_html}\n'
        '</div>\n'
        '</div>'
    )
