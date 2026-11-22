#!/usr/bin/env python3
"""Consistency, accessibility, link, CSS-token, and editorial checks for ``writing/``.

Integrated into ``scripts/check_build.py`` and runnable standalone.

Stage toggles:
  STRICT_REFS:    Promote uncited bibliography keys to errors (after bibliography cleanup).
  STRICT_CONTENT: Promote drifted section anchors, missing .in-brief / .practice-steps,
                  and prose checks to errors (after page content overhaul).
"""

from __future__ import annotations

import json
import re
import subprocess
from html.parser import HTMLParser
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
WRITING_ROOT = REPO_ROOT / "writing"
BLOG_CSS_DIR = REPO_ROOT / "assets" / "blog" / "css"
TOKENS_CSS = REPO_ROOT / "assets" / "css" / "tokens.css"

STRICT_REFS = False
STRICT_CONTENT = False


def _load_js_state(series_dir: Path) -> tuple[dict, dict, dict]:
    """Load refs, concepts, and manifest pages via Node."""
    refs_js = series_dir / "js/refs.js"
    concepts_js = series_dir / "js/concepts.js"
    cfg_js = series_dir / "js/data/config.js"
    js = (
        "const fs=require('fs'),vm=require('vm');"
        "const c={document:null};c.window=c;c.globalThis=c;c.global=c;c.self=c;"
        "for(const p of process.argv.slice(1)){"
        " if(fs.existsSync(p)) vm.runInNewContext(fs.readFileSync(p,'utf8'),c);"
        "}"
        "const tp=c.TP||c.Blog||{};"
        "console.log(JSON.stringify({refs:tp.refs||{},concepts:tp.concepts||{},pages:tp.pages||[]}));"
    )
    proc = subprocess.run(
        ["node", "-e", js, str(cfg_js), str(refs_js), str(concepts_js)],
        check=True,
        capture_output=True,
        text=True,
    )
    data = json.loads(proc.stdout)
    return data["refs"], data["concepts"], {p["file"]: p for p in data["pages"]}


class _HtmlIndex(HTMLParser):
    """Collect unique element IDs and verify basic well-formedness for a page."""

    VOID = frozenset(
        {
            "area", "base", "br", "col", "embed", "hr", "img", "input",
            "link", "meta", "param", "source", "track", "wbr",
        }
    )

    def __init__(self, rel: str) -> None:
        super().__init__(convert_charrefs=True)
        self.rel = rel
        self.ids: set[str] = set()
        self.dup_ids: list[str] = []
        self.stack: list[str] = []
        self.balance_errors: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = dict(attrs)
        el_id = attr_map.get("id")
        if el_id:
            if el_id in self.ids:
                self.dup_ids.append(el_id)
            self.ids.add(el_id)
        if tag not in self.VOID:
            self.stack.append(tag)

    def handle_endtag(self, tag: str) -> None:
        if tag in self.VOID:
            return
        if not self.stack:
            self.balance_errors.append(f"[{self.rel}] Unexpected closing </{tag}>")
            return
        if self.stack[-1] == tag:
            self.stack.pop()
            return
        if tag in self.stack:
            while self.stack and self.stack[-1] != tag:
                self.stack.pop()
            if self.stack:
                self.stack.pop()
        else:
            self.balance_errors.append(f"[{self.rel}] Unmatched closing </{tag}>")


def _extract_css_vars(css_text: str) -> set[str]:
    clean = re.sub(r"/\*[\s\S]*?\*/", "", css_text)
    return set(re.findall(r"(--[a-zA-Z0-9-]+)\s*:", clean))


def _check_css_tokens(errors: list[str]) -> None:
    defined: set[str] = set()
    if TOKENS_CSS.exists():
        defined |= _extract_css_vars(TOKENS_CSS.read_text(encoding="utf-8"))
    css_files = sorted(BLOG_CSS_DIR.glob("*.css")) if BLOG_CSS_DIR.exists() else []
    for f in css_files:
        defined |= _extract_css_vars(f.read_text(encoding="utf-8"))
    for f in css_files:
        txt = re.sub(r"/\*[\s\S]*?\*/", "", f.read_text(encoding="utf-8"))
        for m in re.finditer(r"var\(\s*(--[a-zA-Z0-9-]+)\s*(?:,|\))", txt):
            name = m.group(1)
            # Strip trailing fallback only check: require definition when no fallback
            end = txt.find(")", m.end() - 1)
            expr = txt[m.start() : end + 1] if end > m.start() else ""
            if "," not in expr and name not in defined:
                errors.append(f"[{f.relative_to(REPO_ROOT)}] Undefined CSS custom property {name}")


def _check_leak_and_crlf(errors: list[str]) -> None:
    machine_forbidden = (
        re.compile(r"/mnt/[a-z]/"),
        re.compile(r"/home/[a-zA-Z0-9_-]+"),
        re.compile(r"file://"),
    )
    shared_forbidden = (
        re.compile(r"notes/revamp"),
        re.compile(r"\bDS §"),
    ) + machine_forbidden
    roots = [REPO_ROOT / "assets/blog", REPO_ROOT / "writing"]
    for base in roots:
        if not base.exists():
            continue
        pats = shared_forbidden if base == REPO_ROOT / "assets/blog" else machine_forbidden
        for p in sorted(base.rglob("*")):
            if not p.is_file() or p.suffix.lower() not in {".html", ".css", ".js", ".json"}:
                continue
            raw = p.read_bytes()
            rel = p.relative_to(REPO_ROOT)
            if b"\r\n" in raw:
                errors.append(f"[{rel}] Contains CRLF line endings (run build to normalize)")
            txt = raw.decode("utf-8", errors="replace")
            for pat in pats:
                if pat.search(txt):
                    errors.append(f"[{rel}] Internal/machine reference matched {pat.pattern}")


def _check_hidden_preview(series_dir: Path, html_path: Path, raw: str, manifest: dict, errors: list[str]) -> None:
    if not manifest.get("noindex", True):
        return
    rel = html_path.relative_to(REPO_ROOT)
    if not re.search(r'<meta\b[^>]*name=["\']robots["\'][^>]*noindex', raw, re.IGNORECASE):
        errors.append(f"[{rel}] Missing noindex robots meta while manifest.noindex is true")


def _extract_prose_text(raw: str) -> str:
    main_m = re.search(r"<main\b[^>]*>([\s\S]*?)</main>", raw)
    body = main_m.group(1) if main_m else raw
    body = re.sub(r"<(?:script|style|svg|pre|code|blockquote)\b[^>]*>[\s\S]*?</(?:script|style|svg|pre|code|blockquote)>", " ", body)
    body = re.sub(r'"[^"]*"|\u201c[^\u201d]*\u201d', " ", body)
    body = re.sub(r"<[^>]+>", " ", body)
    return re.sub(r"\s+", " ", body).strip()


def _check_prose_rules(rel: str, raw: str, bucket: list[str]) -> None:
    prose = _extract_prose_text(raw)
    if "\u2014" in raw:
        # Check rendered body outside SVGs/code/JSON-LD attributes.
        body_no_code = re.sub(r"<(?:script|style|pre|code)\b[^>]*>[\s\S]*?</(?:script|style|pre|code)>", " ", raw)
        body_no_code = re.sub(r"data-[a-z-]+=\"[^\"]*\"", " ", body_no_code)
        if "\u2014" in body_no_code:
            bucket.append(f"[{rel}] Contains em-dash (\u2014)")

    contractions = re.findall(
        r"\b(?:don't|doesn't|didn't|can't|couldn't|won't|wouldn't|shouldn't|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|I'm|I've|I'd|I'll|you're|you've|you'll|you'd|we're|we've|we'll|we'd|they're|they've|they'll|it's|that's|there's|here's|what's|let's)\b",
        prose,
        flags=re.IGNORECASE,
    )
    if contractions:
        bucket.append(f"[{rel}] Non-quote contractions found: {sorted(set(c.lower() for c in contractions))[:6]}")

    banned_ci = re.compile(
        r"\b(?:rules\s+out|profile\s+likelihood|favours|earns\s+its\s+keep|"
        r"spends\s+a\s+token|the\s+bill\s+comes\s+due|load-bearing|how\s+it\s+has\s+landed|"
        r"the\s+usual\s+way\s+in|a\s+lever\s+arm|a\s+dial\s+worth\s+turning)\b",
        re.IGNORECASE,
    )
    for m in banned_ci.finditer(prose):
        bucket.append(f"[{rel}] Disallowed/banned phrase: {m.group(0)!r}")
    for tok in ("Toy S", "Toy D"):
        if re.search(rf"\b{re.escape(tok)}\b", prose):
            bucket.append(f"[{rel}] Leaked internal identifier: {tok!r}")

    sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+", prose) if len(s.split()) >= 5]
    if len(sents) >= 10:
        long_ratio = sum(1 for s in sents if len(s.split()) > 35) / len(sents)
        if long_ratio > 0.10:
            bucket.append(f"[{rel}] Long sentences (>35 words): {long_ratio:.1%} (> 10%)")


def check_all(errors: list[str], warnings: list[str]) -> None:
    """Validate all writing series and shared blog assets."""
    _check_css_tokens(errors)
    _check_leak_and_crlf(errors)

    if not WRITING_ROOT.exists():
        return

    robots_path = REPO_ROOT / "robots.txt"
    robots_txt = robots_path.read_text(encoding="utf-8") if robots_path.exists() else ""

    content_bucket = errors if STRICT_CONTENT else warnings
    ref_bucket = errors if STRICT_REFS else warnings

    for manifest_path in sorted(WRITING_ROOT.glob("*/manifest.json")):
        series_dir = manifest_path.parent
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        refs, concepts, _pages = _load_js_state(series_dir)

        if manifest.get("noindex", True):
            if "Disallow: /writing/" not in robots_txt:
                errors.append("[robots.txt] Must contain 'Disallow: /writing/' while series noindex is true")

        rel_files = [p["file"] for p in manifest.get("pages", [])]
        ds = manifest.get("designSheetPage")
        if ds and ds not in rel_files and (series_dir / ds).exists():
            rel_files.append(ds)

        page_indexes: dict[Path, _HtmlIndex] = {}
        page_texts: dict[Path, str] = {}
        cited_keys: set[str] = set()

        for rel_file in rel_files:
            hp = (series_dir / rel_file).resolve()
            rel = str(hp.relative_to(REPO_ROOT))
            if not hp.exists():
                errors.append(f"Missing writing page: {rel}")
                continue
            raw = hp.read_text(encoding="utf-8")
            page_texts[hp] = raw
            idx = _HtmlIndex(rel)
            idx.feed(raw)
            idx.close()
            page_indexes[hp] = idx
            errors.extend(idx.balance_errors)
            for dup in idx.dup_ids:
                errors.append(f"[{rel}] Duplicate element id='{dup}'")

            _check_hidden_preview(series_dir, hp, raw, manifest, errors)
            if 'data-theme-boot' not in raw:
                errors.append(f"[{rel}] Missing synchronous data-theme-boot script in <head>")
            if 'data-theme="auto"' in raw:
                errors.append(f"[{rel}] Hardcoded data-theme=\"auto\" breaks root dark default")
            if re.search(r'>\s*data-static-figref="', raw):
                errors.append(f"[{rel}] Malformed figref attribute spilled into link text")

            # Strip <pre> and <code> snippets so design-sheet specimen code blocks are ignored.
            dom_raw = re.sub(r"<(?:pre|code)\b[^>]*>[\s\S]*?</(?:pre|code)>", " ", raw)

            # Local assets (<img src>, <script src>, <link href>)
            for pat in (r'<img[^>]+src="([^"]+)"', r'<script[^>]+src="([^"]+)"', r'<link[^>]+href="([^"]+)"'):
                for m in re.finditer(pat, dom_raw):
                    src = m.group(1)
                    if src.startswith(("http://", "https://", "data:")):
                        continue
                    target = (hp.parent / src).resolve()
                    if not target.exists():
                        errors.append(f"[{rel}] Missing local asset '{src}'")

            # Concept & ref keys
            for m in re.finditer(r'data-ref="([^"]+)"', dom_raw):
                for rk in (x.strip() for x in m.group(1).split(",") if x.strip()):
                    cited_keys.add(rk)
                    if rk not in refs:
                        errors.append(f"[{rel}] Unknown bibliography key data-ref='{rk}'")
            for m in re.finditer(r'data-concept="([^"]+)"', dom_raw):
                ck = m.group(1).strip()
                if ck not in concepts:
                    errors.append(f"[{rel}] Unknown concept key data-concept='{ck}'")

            # Inline SVG dark-mode-hostile literals
            for svg_m in re.finditer(r"<svg\b[^>]*>[\s\S]*?</svg>", dom_raw, flags=re.IGNORECASE):
                for bad in ("#000", "#111", "#222", "#333", "#444", "#555"):
                    if re.search(rf"{bad}\b", svg_m.group(0), flags=re.IGNORECASE):
                        errors.append(f"[{rel}] Hardcoded hex {bad} in inline <svg>")

            # Playbook image existence
            for m in re.finditer(r'data-playbook-img2?="([^"]+)"', dom_raw):
                img_target = (series_dir / m.group(1)).resolve()
                if not img_target.exists():
                    errors.append(f"[{rel}] Missing playbook figure asset '{m.group(1)}'")

            # Structural & content gates (staged promotion)
            is_post = hp.parent.name == "pages" and hp.name != "reference.html"
            if is_post:
                if 'class="in-brief"' not in raw:
                    content_bucket.append(f"[{rel}] Missing compact .in-brief takeaway box")
                if 'class="practice-steps"' not in raw:
                    content_bucket.append(f"[{rel}] Missing unified ol.practice-steps checklist")
                if 'class="post-roadmap"' in raw:
                    content_bucket.append(f"[{rel}] Legacy .post-roadmap still present")
                if 'class="playbook-map"' not in raw:
                    errors.append(f"[{rel}] Missing .playbook-map flowchart")
                _check_prose_rules(rel, raw, content_bucket)
            elif hp.name == "reference.html":
                if 'class="playbook-map"' not in raw:
                    content_bucket.append(f"[{rel}] Missing .playbook-map flowchart on reference page")
                _check_prose_rules(rel, raw, content_bucket)
            elif hp.name == "index.html":
                if 'class="playbook-map"' not in raw:
                    errors.append(f"[{rel}] Missing .playbook-map flowchart")
                _check_prose_rules(rel, raw, content_bucket)

        # Internal link + #anchor target checks across all indexed writing pages
        for hp, raw in page_texts.items():
            rel = str(hp.relative_to(REPO_ROOT))
            for m in re.finditer(r'<a\b[^>]*href="([^"]+)"', raw):
                href = m.group(1)
                if href.startswith(("http://", "https://", "mailto:", "javascript:")):
                    continue
                if href.startswith("#"):
                    anchor = href[1:]
                    if anchor and anchor not in page_indexes[hp].ids:
                        content_bucket.append(f"[{rel}] Broken same-page anchor #{anchor}")
                    continue
                file_part, _, anchor = href.split("?", 1)[0].partition("#")
                target = (hp.parent / file_part).resolve()
                if not target.exists():
                    errors.append(f"[{rel}] Broken internal link href='{href}'")
                elif anchor and target in page_indexes and anchor not in page_indexes[target].ids:
                    content_bucket.append(f"[{rel}] Broken cross-page anchor href='{href}'")

        # Dead bibliography keys check
        uncited = sorted(k for k in refs if k not in cited_keys)
        if uncited:
            ref_bucket.append(f"[{series_dir.name}/js/refs.js] Uncited bibliography keys: {uncited}")


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []
    check_all(errors, warnings)
    for w in warnings:
        print(f"  WARNING: {w}")
    for e in errors:
        print(f"  ERROR: {e}")
    if errors:
        print(f"check_writing: {len(errors)} error(s), {len(warnings)} warning(s).")
        return 1
    print(f"check_writing: passed ({len(warnings)} warning(s)).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
