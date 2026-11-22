#!/usr/bin/env python3
"""Correctness checks over the built site. Standard library only.

Run after `python scripts/build_html.py` (npm run check). Unlike the CI staleness
diff — which only proves the build is reproducible — these checks can fail on a
build that is reproducible and wrong.

  1. listview contract  every [data-lv-item] under a listview offering a 'year'
                        sort carries a numeric data-year
  2. containers         every registered page exists and its content container is
                        present and non-empty
  3. token lint         every var(--x) used in the CSS is defined; no raw hex in
                        redesign.css outside the allowlist (scripts/check_allow_hex.txt)
  4. palette            pairwise luminance separation of the four --cat-* tokens
                        per theme (WARNING only — reported with numbers)
  5. links              internal links resolve, #anchors exist, ids are unique.
                        Non-HTML targets count too: the nav's CV_speagle.pdf at the
                        repo root fails this check if it is renamed or removed.
  6. well-formedness    tag balance via html.parser
  7. citations          expanded {{cite}}/{{citations_floor}}, totalPapers parity,
                        content paperBibcode targets, and https:// feed.xml links
  8. affiliations       Astronomy & Astrophysics precedes Statistical Sciences
  9. public boundary    no CRLF endings, local machine paths, or internal notes

Exit status 1 if any check fails; warnings never fail the run.

Usage: python scripts/check_build.py
"""

import json
import os
import re
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse

from check_writing import check_all as check_writing

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))

from build_html import PAGES, container_id  # noqa: E402

CSS_DIR = PROJECT_ROOT / "assets" / "css"
REDESIGN_CSS = CSS_DIR / "redesign.css"
TOKENS_CSS = CSS_DIR / "tokens.css"
FONTS_CSS = CSS_DIR / "fonts.css"
HEX_ALLOWLIST = Path(__file__).resolve().parent / "check_allow_hex.txt"

# Void elements never have a closing tag.
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
        "meta", "param", "source", "track", "wbr"}
# Elements whose end tag may legally be omitted in the markup we generate.
OPTIONAL_END = {"li", "p", "option"}

errors = []
warnings = []


def fail(msg):
    errors.append(msg)


def warn(msg):
    warnings.append(msg)


# ---------------------------------------------------------------------------
# HTML parsing helpers
# ---------------------------------------------------------------------------

class DocParser(HTMLParser):
    """Collects elements, ids, links and unbalanced tags in one pass."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.unbalanced = []
        self.ids = []
        self.links = []          # (href, tag)
        self.elements = []       # (tag, attrs dict, start_pos)
        self.text_by_pos = {}

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        self.elements.append((tag, a, self.getpos()))
        if "id" in a:
            self.ids.append(a["id"])
        if tag == "a" and "href" in a:
            self.links.append((a["href"], tag))
        if tag not in VOID:
            self.stack.append((tag, self.getpos()))

    def handle_startendtag(self, tag, attrs):
        a = dict(attrs)
        self.elements.append((tag, a, self.getpos()))
        if "id" in a:
            self.ids.append(a["id"])

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                for extra, pos in self.stack[i + 1:]:
                    if extra not in OPTIONAL_END:
                        self.unbalanced.append(f"unclosed <{extra}> at line {pos[0]}")
                del self.stack[i:]
                return
        self.unbalanced.append(f"stray </{tag}>")


def parse(path):
    parser = DocParser()
    parser.feed(path.read_text(encoding="utf-8"))
    for tag, pos in parser.stack:
        if tag not in OPTIONAL_END:
            parser.unbalanced.append(f"unclosed <{tag}> at line {pos[0]}")
    return parser


# ---------------------------------------------------------------------------
# 1. listview contract + 6. well-formedness (both need the parsed docs)
# ---------------------------------------------------------------------------

def check_documents():
    docs = {}
    for key, page in PAGES.items():
        path = PROJECT_ROOT / page["file"]
        if not path.exists():
            fail(f"{page['file']}: registered page was never written")
            continue
        html = path.read_text(encoding="utf-8")
        doc = parse(path)
        docs[key] = (path, html, doc)

        # -- well-formedness
        for problem in doc.unbalanced[:5]:
            fail(f"{page['file']}: {problem}")

        # -- duplicate ids
        seen, dupes = set(), set()
        for i in doc.ids:
            (dupes if i in seen else seen).add(i)
        for d in sorted(dupes):
            fail(f"{page['file']}: duplicate id {d!r}")

        # -- content container present and non-empty
        if page["layout"] == "hero":
            wanted = ["about", "research", "team", "join"]
        else:
            wanted = [container_id(key)]
        for cid in wanted:
            m = re.search(r'<(\w+)[^>]*\bid="%s"[^>]*>(.*?)</\1>' % re.escape(cid),
                          html, re.S)
            if cid not in doc.ids:
                fail(f"{page['file']}: content container #{cid} is missing")
            elif m and len(m.group(2).strip()) < 40:
                fail(f"{page['file']}: content container #{cid} is empty")

        # -- listview contract: a 'year' sort needs data-year on every item
        for lv_start, lv_html in listviews(html):
            if 'value="year"' not in lv_html and 'data-lv-sort="year"' not in lv_html:
                continue
            for item in re.finditer(r'<article\b[^>]*\bdata-lv-item\b[^>]*>', lv_html):
                attrs = item.group(0)
                year = re.search(r'data-year="([^"]*)"', attrs)
                if not year or not year.group(1).strip().isdigit():
                    title = re.search(r'data-title="([^"]{0,60})"', attrs)
                    fail(f"{page['file']}: listview item without a numeric data-year "
                         f"under a 'year' sort ({title.group(1) if title else attrs[:60]})")
    return docs


def listviews(html):
    """Yield the HTML of each [data-listview] root (#pub-root carries the attribute
    too, so one scan covers every list on the site)."""
    for m in re.finditer(r'<div[^>]*\bdata-listview\b', html):
        yield m.start(), html[m.start():html.find("</main>", m.start())]


# ---------------------------------------------------------------------------
# 3. token lint
# ---------------------------------------------------------------------------

def check_tokens():
    css = REDESIGN_CSS.read_text(encoding="utf-8")
    defined = set()
    for path in (TOKENS_CSS, REDESIGN_CSS, FONTS_CSS):
        if path.exists():
            defined |= set(re.findall(r"(--[a-z0-9-]+)\s*:", path.read_text(encoding="utf-8")))
    used = set(re.findall(r"var\(\s*(--[a-z0-9-]+)", css))
    for missing in sorted(used - defined):
        fail(f"redesign.css uses {missing} but nothing defines it")

    allowed = set()
    if HEX_ALLOWLIST.exists():
        allowed = {ln.split("#", 1)[0].strip().lower() if not ln.strip().startswith("#") else ln.strip().lower()
                   for ln in HEX_ALLOWLIST.read_text(encoding="utf-8").splitlines()
                   if ln.strip() and not ln.strip().startswith("//")}
    stripped = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    hexes = {h.lower() for h in re.findall(r"#[0-9a-fA-F]{3,8}\b", stripped)}
    for h in sorted(hexes - allowed):
        fail(f"redesign.css: raw colour {h} outside the token system "
             f"(add it to scripts/check_allow_hex.txt only as a temporary exception)")


# ---------------------------------------------------------------------------
# 4. palette separation (WARNING only)
# ---------------------------------------------------------------------------

def _luminance(hexstr):
    h = hexstr.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    rgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb]
    return 100 * (0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2])


def _contrast_ratio(hex_a, hex_b):
    la = _luminance(hex_a) / 100.0
    lb = _luminance(hex_b) / 100.0
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def check_palette():
    css = TOKENS_CSS.read_text(encoding="utf-8")
    if "color-scheme: dark;" not in css:
        fail("tokens.css: missing color-scheme: dark declaration")
    if "color-scheme: light;" not in css:
        fail("tokens.css: missing color-scheme: light declaration")
    if not re.search(r'@media print\s*\{\s*:root,\s*\[data-theme="dark"\]', css):
        fail("tokens.css: missing @media print light-token override for :root, [data-theme=\"dark\"]")

    blocks = {"dark": css.split('[data-theme="light"]')[0]}
    if '[data-theme="light"]' in css:
        blocks["light"] = css.split('[data-theme="light"]')[1].split("@media print")[0]
    for theme, block in blocks.items():
        cats = dict(re.findall(r"(--cat-[a-z]+)\s*:\s*(#[0-9a-fA-F]{3,8})", block))
        cats = {k: v for k, v in cats.items() if k != "--cat-sec"}
        if len(cats) < 4:
            continue
        lums = {k: _luminance(v) for k, v in cats.items()}
        pairs = sorted(
            ((abs(lums[a] - lums[b]), a, b) for i, a in enumerate(cats) for b in list(cats)[i + 1:]))
        closest = pairs[0]
        detail = " · ".join(f"{k}={lums[k]:.1f}" for k in sorted(lums))
        if closest[0] < 7.8:
            warn(f"palette ({theme}): {closest[1]} and {closest[2]} are only "
                 f"{closest[0]:.1f} relative-luminance points apart — they will not "
                 f"separate in greyscale. [{detail}]")

    tokens_path = PROJECT_ROOT / "assets" / "data" / "tokens.json"
    tv = json.loads(tokens_path.read_text(encoding="utf-8")).get("themeVarying", {})
    for theme in ("dark", "light"):
        for tok in ("text", "text-2", "text-3", "energy-text", "acc-panels", "acc-invited", "cat-sla"):
            for bg in ("bg-0", "chip"):
                ratio = _contrast_ratio(tv[tok][theme], tv[bg][theme])
                if ratio < 4.5:
                    fail(f"WCAG contrast ({theme}): {tok} on {bg} is {ratio:.2f}:1 (< 4.5:1)")
        for tok, vals in tv.items():
            if not (isinstance(vals, dict) and (tok.startswith("role-") or tok.startswith("stage-"))):
                continue
            for bg in ("bg-0", "chip", "chip-2"):
                ratio = _contrast_ratio(vals[theme], tv[bg][theme])
                if ratio < 3.0:
                    fail(f"WCAG UI contrast ({theme}): {tok} on {bg} is {ratio:.2f}:1 (< 3.0:1)")

    for seg in ("cat-sla", "cat-ii", "cat-ic", "cat-du"):
        ratio = _contrast_ratio(tv["chip"]["dark"], tv[seg]["dark"])
        if ratio < 4.5:
            fail(f"WCAG .mix-seg (dark): chip on {seg} is {ratio:.2f}:1 (< 4.5:1)")
    mix_pairs = (
        ("light", tv["chip"]["light"], "cat-sla"),
        ("light", tv["chip"]["light"], "cat-ic"),
        ("light", tv["energy-ink"]["light"], "cat-ii"),
        ("light", tv["energy-ink"]["light"], "cat-du"),
        ("print", "#ffffff", "cat-sla"),
        ("print", "#ffffff", "cat-ic"),
        ("print", tv["energy-ink"]["light"], "cat-ii"),
        ("print", tv["energy-ink"]["light"], "cat-du"),
    )
    for mode, fg, seg in mix_pairs:
        ratio = _contrast_ratio(fg, tv[seg]["light"])
        if ratio < 4.5:
            fail(f"WCAG .mix-seg ({mode}): foreground on {seg} is {ratio:.2f}:1 (< 4.5:1)")


# ---------------------------------------------------------------------------
# 5. internal links + anchors
# ---------------------------------------------------------------------------

def check_links(docs):
    """Every relative href must resolve to a file that exists — .html pages and the
    CV PDF alike — and every #fragment must name a real id on the target page."""
    for key, (path, html, doc) in docs.items():
        ids = set(doc.ids)
        for href, _tag in doc.links:
            if not href or href.startswith(("http://", "https://", "mailto:", "tel:", "data:")):
                continue
            url = urlparse(href)
            target, frag = unquote(url.path), url.fragment
            if target:
                candidate = (PROJECT_ROOT / target.lstrip("/")) if target.startswith("/") \
                    else (PROJECT_ROOT / target)
                if not candidate.exists():
                    fail(f"{PAGES[key]['file']}: link to missing file {href!r}")
                    continue
                if frag:
                    other = parse(candidate)
                    if frag not in set(other.ids):
                        fail(f"{PAGES[key]['file']}: link {href!r} targets a missing anchor")
            elif frag and frag not in ids:
                fail(f"{PAGES[key]['file']}: anchor #{frag} does not exist on this page")


# ---------------------------------------------------------------------------
# 7. citations + metrics parity + RSS absolute URLs
# ---------------------------------------------------------------------------

def _walk_values_for_key(obj, key):
    if isinstance(obj, dict):
        if key in obj and obj[key]:
            yield obj[key]
        for v in obj.values():
            yield from _walk_values_for_key(v, key)
    elif isinstance(obj, list):
        for item in obj:
            yield from _walk_values_for_key(item, key)


def check_citations(docs):
    content = json.loads((PROJECT_ROOT / "assets" / "data" / "content.json").read_text(encoding="utf-8"))
    pub_data = json.loads((PROJECT_ROOT / "assets" / "data" / "publications_data.json").read_text(encoding="utf-8"))
    pubs = pub_data.get("publications", [])
    metrics = pub_data.get("metrics", {})
    total_papers = metrics.get("totalPapers")
    if total_papers != len(pubs):
        fail(f"publications_data.json: metrics.totalPapers ({total_papers}) != len(publications) ({len(pubs)})")

    bibcodes = {str(p.get("bibcode")).strip() for p in pubs if p.get("bibcode")}
    for ref in _walk_values_for_key(content, "paperBibcode"):
        if str(ref).strip() not in bibcodes:
            fail(f"content.json: paperBibcode {ref!r} missing from publications_data.json")

    for key, (_path, html, _doc) in docs.items():
        if "{{cite" in html or "{{citations_floor" in html:
            fail(f"{PAGES[key]['file']}: unexpanded citation placeholder")

    if "publications" in docs:
        pub_html = docs["publications"][1]
        m = re.search(r'<a[^>]*role-tile-total[^>]*><span class="n">(\d+)</span>', pub_html)
        if not m or int(m.group(1)) != len(pubs):
            found = m.group(1) if m else "missing"
            fail(f"publications.html: total papers tile ({found}) != len(publications) ({len(pubs)})")

    feed_path = PROJECT_ROOT / "feed.xml"
    if feed_path.exists():
        feed_xml = feed_path.read_text(encoding="utf-8")
        if "{{cite" in feed_xml or "{{citations_floor" in feed_xml:
            fail("feed.xml: unexpanded citation placeholder")
        for m in re.finditer(r"<item>.*?<link>(.*?)</link>", feed_xml, re.S):
            link = m.group(1).strip()
            if not link.startswith("https://"):
                fail(f"feed.xml: item <link> must start with https:// (got {link!r})")


# ---------------------------------------------------------------------------
# 8. affiliations order
# ---------------------------------------------------------------------------

def _assert_order(text, first, second, context):
    i_first = text.find(first)
    i_second = text.find(second)
    if i_first == -1 or i_second == -1:
        fail(f"{context}: missing expected affiliation string ({first!r} / {second!r})")
    elif i_first > i_second:
        fail(f"{context}: {first!r} must precede {second!r}")


def check_affiliations(docs):
    content = json.loads((PROJECT_ROOT / "assets" / "data" / "content.json").read_text(encoding="utf-8"))
    depts = [d.get("name", "") for d in content.get("site", {}).get("departments", [])]
    _assert_order(" | ".join(depts), "Astronomy", "Statistical Sciences", "content.json site.departments")

    if "home" in docs:
        home_html = docs["home"][1]
        foot_idx = home_html.find('class="foot-meta"')
        if foot_idx != -1:
            foot_end = home_html.find("</p>", foot_idx)
            _assert_order(
                home_html[foot_idx:foot_end if foot_end != -1 else foot_idx + 400],
                "Astronomy",
                "Statistical Sciences",
                "index.html footer",
            )
        about_idx = home_html.find('id="about"')
        if about_idx != -1:
            about_end = home_html.find("</section>", about_idx)
            _assert_order(
                home_html[about_idx:about_end if about_end != -1 else about_idx + 2000],
                "David A. Dunlap Department of Astronomy",
                "Department of Statistical Sciences",
                "index.html #about",
            )

    if "service" in docs:
        srv_html = docs["service"][1]
        intro_idx = srv_html.find('<aside class="highlight-box">')
        if intro_idx != -1:
            intro_end = srv_html.find("</aside>", intro_idx)
            _assert_order(
                srv_html[intro_idx:intro_end if intro_end != -1 else intro_idx + 2000],
                "David A. Dunlap Department of Astronomy",
                "Department of Statistical Sciences",
                "service.html intro",
            )
        uoft_idx = srv_html.find('University of Toronto <span class="mentor-sec-count"')
        if uoft_idx != -1:
            uoft_end = srv_html.find("</section>", uoft_idx)
            _assert_order(
                srv_html[uoft_idx:uoft_end if uoft_end != -1 else len(srv_html)],
                "David A. Dunlap Department of Astronomy",
                "Department of Statistical Sciences",
                "service.html U of T section",
            )


# ---------------------------------------------------------------------------
# 9. public boundary + line endings
# ---------------------------------------------------------------------------

_BOUNDARY_SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", ".vscode", ".idea",
    ".mypy_cache", ".ruff_cache", ".pytest_cache", ".cite-check", "docs", "drafts",
}
_BOUNDARY_SKIP_PREFIXES = (
    "assets/vendor/", "assets/fonts/", "assets/data/backups/",
    "scripts/_deprecated/", "scripts/temp/",
)
_BOUNDARY_EXTS = {".html", ".css", ".js", ".py", ".md", ".txt", ".xml", ".json"}
_BOUNDARY_EXEMPT_REGEX = {"scripts/check_build.py", "scripts/check_writing.py"}
_BOUNDARY_PATTERNS = (
    ("machine /mnt/ path", re.compile(r"(?:^|[\s\"'(=`])/mnt/[a-z]/")),
    ("machine home path", re.compile(r"(?:^|[\s\"'(=`])/(?:home|Users)/[a-zA-Z0-9_-]+(?:/|[\s\"'`),;]|$)")),
    ("local Windows path", re.compile(r"(?:D:\\+Dropbox|C:\\+Users\\)")),
    ("local virtualenv path", re.compile(r"\.venvs/")),
    ("file URI", re.compile(r"file:///")),
    ("internal notes path", re.compile(r"notes/(?:revamp|specs|review|refs|discrepancy)")),
    ("design notes reference", re.compile(r"design notes\.md")),
    ("internal audit code", re.compile(r"(?:D3/E10|\bD20\b|\bDesign [A-Z]\b)")),
    ("internal review reference", re.compile(r"(?:earlier review R\d+|synthesis ruling R\d+|Work order:|§6\.\d+)")),
)


def _iter_boundary_files():
    if (PROJECT_ROOT / ".git").exists():
        proc = subprocess.run(
            ["git", "-C", str(PROJECT_ROOT), "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
            capture_output=True,
            check=False,
        )
        if proc.returncode == 0:
            for item in proc.stdout.split(b"\x00"):
                if not item:
                    continue
                rel_posix = item.decode("utf-8", errors="replace")
                path = PROJECT_ROOT / rel_posix
                if path.is_file() and path.suffix.lower() in _BOUNDARY_EXTS:
                    if not rel_posix.startswith(_BOUNDARY_SKIP_PREFIXES):
                        yield rel_posix, path
            return

    for root_str, dirs, files in os.walk(PROJECT_ROOT):
        rel_dir = Path(root_str).relative_to(PROJECT_ROOT)
        rel_dir_posix = rel_dir.as_posix()
        pruned = []
        for d in sorted(dirs):
            if d in _BOUNDARY_SKIP_DIRS:
                continue
            child_posix = d if rel_dir_posix == "." else f"{rel_dir_posix}/{d}"
            if f"{child_posix}/".startswith(_BOUNDARY_SKIP_PREFIXES):
                continue
            pruned.append(d)
        dirs[:] = pruned
        for fname in sorted(files):
            path = Path(root_str) / fname
            if path.suffix.lower() not in _BOUNDARY_EXTS:
                continue
            rel_posix = fname if rel_dir_posix == "." else f"{rel_dir_posix}/{fname}"
            yield rel_posix, path


def check_public_boundary():
    for rel_posix, path in _iter_boundary_files():
        raw = path.read_bytes()
        if b"\r\n" in raw:
            fail(f"{rel_posix}: contains CRLF line endings")
        if rel_posix in _BOUNDARY_EXEMPT_REGEX:
            continue
        text = raw.decode("utf-8", errors="replace")
        for label, pat in _BOUNDARY_PATTERNS:
            m = pat.search(text)
            if m:
                fail(f"{rel_posix}: public boundary violation ({label}: {m.group(0).strip()!r})")


def main():
    docs = check_documents()
    check_tokens()
    check_palette()
    check_links(docs)
    check_citations(docs)
    check_affiliations(docs)
    check_writing(errors, warnings)
    check_public_boundary()

    for w in warnings:
        print(f"  WARNING: {w}")
    for e in errors:
        print(f"  ERROR: {e}", file=sys.stderr)
    if errors:
        print(f"\ncheck_build: {len(errors)} error(s), {len(warnings)} warning(s).",
              file=sys.stderr)
        return 1
    print(f"check_build: all checks passed ({len(docs)} pages, {len(warnings)} warning(s)).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
