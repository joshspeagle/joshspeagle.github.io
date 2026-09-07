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
  5. links              internal links resolve, #anchors exist, ids are unique
  6. well-formedness    tag balance via html.parser

Exit status 1 if any check fails; warnings never fail the run.

Usage: python scripts/check_build.py
"""

import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse

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


def check_palette():
    css = TOKENS_CSS.read_text(encoding="utf-8")
    blocks = {"dark": css.split('[data-theme="light"]')[0]}
    if '[data-theme="light"]' in css:
        blocks["light"] = css.split('[data-theme="light"]')[1]
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


# ---------------------------------------------------------------------------
# 5. internal links + anchors
# ---------------------------------------------------------------------------

def check_links(docs):
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


def main():
    docs = check_documents()
    check_tokens()
    check_palette()
    check_links(docs)

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
