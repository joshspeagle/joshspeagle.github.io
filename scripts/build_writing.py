#!/usr/bin/env python3
"""Build and synchronize interactive blog series under ``writing/``.

Discovers every subdirectory of ``writing/`` containing a ``manifest.json``,
canonicalizes shared asset paths (``/assets/vendor/``, ``/assets/blog/``,
``/assets/css/``), injects the synchronous theme boot script and favicon,
populates progressive no-JS fallbacks (header, pager, figure numbers/refs,
inline citations, and reference lists), and normalizes LF line endings.

Idempotent: running twice produces zero byte changes.

Usage:
    python scripts/build_writing.py
"""

from __future__ import annotations

import html
import json
import re
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
WRITING_ROOT = REPO_ROOT / "writing"

THEME_BOOT = (
    '<script data-theme-boot>'
    "(function(){try{var t=localStorage.getItem('preferred-theme')||'dark';"
    "document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark');"
    "}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();"
    "</script>"
)

CORE_CSS_SUFFIXES = (
    "assets/css/fonts.css",
    "assets/css/tokens.css",
    "vendor/katex/katex.min.css",
    "assets/blog/css/editorial.css",
    "assets/blog/css/diagram-map.css",
    "css/site.css",
    "css/components/playbook-map.css",
)

TEXT_EXTS = {".html", ".css", ".js", ".json"}


def normalize_lf(directory: Path) -> None:
    """Ensure LF line endings across all text files under *directory*."""
    if not directory.exists():
        return
    for path in sorted(directory.rglob("*")):
        if path.is_file() and path.suffix.lower() in TEXT_EXTS:
            raw = path.read_bytes()
            clean = raw.replace(b"\r\n", b"\n")
            if clean != raw:
                path.write_bytes(clean)


def load_refs(refs_js: Path) -> dict[str, dict]:
    """Load bibliography records exported by ``js/refs.js`` via Node."""
    if not refs_js.exists():
        return {}
    js = (
        "const fs=require('fs'),vm=require('vm');"
        "const c={document:null};"
        "c.window=c;c.globalThis=c;c.global=c;c.self=c;"
        "vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),c);"
        "console.log(JSON.stringify((c.TP&&c.TP.refs)||(c.Blog&&c.Blog.refs)||{}));"
    )
    proc = subprocess.run(
        ["node", "-e", js, str(refs_js)],
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(proc.stdout)


def _surname(ref: dict) -> str:
    authors = ref.get("authors", "")
    first = authors.split(",")[0].strip().split()
    return first[-1].lower() if first else ""


def _after_title(title: str) -> str:
    return " " if title.endswith(("?", "!", ".")) else ". "


def _rewrite_head(
    text: str, repo_rel: str, manifest: dict, has_flowmap: bool
) -> str:
    head_m = re.search(r"(<head\b[^>]*>)([\s\S]*?)(</head>)", text, re.IGNORECASE)
    if not head_m:
        return text
    open_tag, inner, close_tag = head_m.group(1), head_m.group(2), head_m.group(3)

    # Remove stale theme boot script and duplicate icons.
    inner = re.sub(
        r'\s*<script[^>]*data-theme-boot[^>]*>[\s\S]*?</script>',
        "",
        inner,
        flags=re.IGNORECASE,
    )
    inner = re.sub(
        r'\s*<link\b[^>]*rel=["\']icon["\'][^>]*>',
        "",
        inner,
        flags=re.IGNORECASE,
    )

    # Ensure hidden preview robots tag when configured.
    if manifest.get("noindex", True) and not re.search(
        r'<meta\b[^>]*name=["\']robots["\']', inner, re.IGNORECASE
    ):
        inner = re.sub(
            r'(<meta\b[^>]*name=["\']viewport["\'][^>]*>)',
            r'\1\n  <meta name="robots" content="noindex, nofollow, noarchive">',
            inner,
            count=1,
            flags=re.IGNORECASE,
        )

    # Collect custom stylesheets (figures / page overrides) while removing core/vendor links.
    custom_css: list[str] = []

    def _collect_css(m: re.Match) -> str:
        tag = m.group(0)
        href_m = re.search(r'href=["\']([^"\']+)["\']', tag)
        if not href_m:
            return tag
        href = href_m.group(1)
        if any(href.endswith(sfx) or sfx in href for sfx in CORE_CSS_SUFFIXES):
            return ""
        custom_css.append(href)
        return ""

    inner = re.sub(
        r'\s*<link\b[^>]*rel=["\']stylesheet["\'][^>]*>',
        _collect_css,
        inner,
        flags=re.IGNORECASE,
    )

    core_links = [
        f'  <link rel="icon" type="image/svg+xml" href="{repo_rel}favicon.svg">',
        f"  {THEME_BOOT}",
        f'  <link rel="stylesheet" href="{repo_rel}assets/css/fonts.css">',
        f'  <link rel="stylesheet" href="{repo_rel}assets/css/tokens.css">',
        f'  <link rel="stylesheet" href="{repo_rel}assets/vendor/katex/katex.min.css">',
        f'  <link rel="stylesheet" href="{repo_rel}assets/blog/css/editorial.css">',
    ]
    if has_flowmap:
        core_links.append(
            f'  <link rel="stylesheet" href="{repo_rel}assets/blog/css/diagram-map.css">'
        )
    for href in custom_css:
        core_links.append(f'  <link rel="stylesheet" href="{href}">')

    inner = inner.rstrip() + "\n" + "\n".join(core_links) + "\n"
    return text[: head_m.start()] + open_tag + inner + close_tag + text[head_m.end() :]


def _remap_scripts(
    text: str, repo_rel: str, series_rel: str, has_flowmap: bool
) -> str:
    body_m = re.search(r"(<body\b[^>]*>)([\s\S]*)(</body>)", text, re.IGNORECASE)
    if not body_m:
        return text
    open_body, body, close_body = body_m.group(1), body_m.group(2), body_m.group(3)

    # Extract trailing <script src="..."></script> block (at bottom of body).
    script_tags: list[str] = []

    def _pull_script(m: re.Match) -> str:
        script_tags.append(m.group(1))
        return ""

    tail_m = re.search(r'(\s*(?:<script\b[^>]*src="[^"]+"[^>]*>\s*</script>\s*)+)$', body)
    if not tail_m:
        return text
    body_prefix = body[: tail_m.start()]
    re.sub(r'<script\b[^>]*src="([^"]+)"[^>]*>\s*</script>', _pull_script, tail_m.group(1))

    out_srcs: list[str] = []
    seen: set[str] = set()

    def _add(src: str) -> None:
        if src not in seen:
            seen.add(src)
            out_srcs.append(src)

    cfg_src = f"{series_rel}js/data/config.js"
    flow_data_src = f"{series_rel}js/data/flowmap-data.js"
    flow_js_src = f"{repo_rel}assets/blog/js/flowmap.js"

    for raw_src in script_tags:
        s = raw_src.strip()
        if s.endswith("d3.v7.min.js"):
            _add(f"{repo_rel}assets/vendor/d3.v7.min.js")
        elif s.endswith("katex.min.js"):
            _add(f"{repo_rel}assets/vendor/katex/katex.min.js")
        elif s.endswith("auto-render.min.js"):
            _add(f"{repo_rel}assets/vendor/katex/auto-render.min.js")
        elif s.endswith("lib/format.js") or s.endswith("core/format.js"):
            _add(f"{repo_rel}assets/blog/js/core/format.js")
        elif s.endswith("lib/prng.js") or s.endswith("core/prng.js"):
            _add(f"{repo_rel}assets/blog/js/core/prng.js")
        elif s.endswith("lib/placer.js") or s.endswith("core/placer.js"):
            _add(f"{repo_rel}assets/blog/js/core/placer.js")
        elif s.endswith("js/data/config.js"):
            _add(cfg_src)
        elif s.endswith("js/refs.js"):
            _add(cfg_src)
            _add(f"{series_rel}js/refs.js")
        elif s.endswith("js/site.js") or s.endswith("blog/js/article.js"):
            _add(cfg_src)
            _add(f"{repo_rel}assets/blog/js/article.js")
        elif (
            s.endswith("js/data/flowmap-data.js")
            or s.endswith("components/playbook-map.js")
            or s.endswith("blog/js/flowmap.js")
        ):
            if has_flowmap:
                _add(flow_data_src)
                _add(flow_js_src)
        elif s.endswith("js/chart.js") or s.endswith("core/chart.js"):
            _add(f"{repo_rel}assets/blog/js/core/chart.js")
        elif s.endswith("js/runtime.js") or s.endswith("core/runtime.js"):
            _add(f"{repo_rel}assets/blog/js/core/runtime.js")
        else:
            _add(s)

    if has_flowmap and flow_js_src not in seen:
        _add(flow_data_src)
        _add(flow_js_src)

    rendered = "\n".join(f'  <script src="{src}"></script>' for src in out_srcs)
    new_body = body_prefix.rstrip() + "\n\n" + rendered + "\n"
    return text[: body_m.start()] + open_body + new_body + close_body + text[body_m.end() :]


def _populate_header_and_pager(
    text: str, rel_in_series: str, repo_rel: str, series_rel: str, manifest: dict
) -> str:
    pages = manifest.get("pages", [])
    numbered = [p for p in pages if not p.get("unnumbered")]
    cur_idx = next((i for i, p in enumerate(pages) if p["file"] == rel_in_series), -1)
    page = pages[cur_idx] if cur_idx >= 0 else None

    part_badge = ""
    if page and not page.get("unnumbered"):
        part_num = next((i + 1 for i, p in enumerate(numbered) if p["file"] == rel_in_series), 0)
        part_badge = f'<span class="where">Part {part_num} of {len(numbered)}</span>'
    elif rel_in_series == manifest.get("designSheetPage"):
        part_badge = '<span class="where">Design sheet</span>'

    owner = html.escape(manifest.get("ownerName", "Josh Speagle"))
    wlabel = html.escape(manifest.get("writingLabel", "Writing"))
    short = html.escape(manifest.get("shortTitle", "Notes"))
    ref_page = manifest.get("referencePage", "pages/reference.html")

    # Ensure main has an id and link static skip link to it.
    text = re.sub(
        r"<main\b(?![^>]*\bid=)([^>]*)>",
        r'<main id="content"\1>',
        text,
        count=1,
    )
    main_id_m = re.search(r'<main\b[^>]*\bid="([^"]+)"', text)
    main_id = main_id_m.group(1) if main_id_m else "content"

    header_inner = (
        f'<a class="skip" href="#{html.escape(main_id)}">Skip to content</a>'
        f'<div class="header-brand-group">'
        f'<a class="brand-crumb brand-home" href="{repo_rel}index.html">{owner}</a>'
        f'<span class="brand-sep" aria-hidden="true">/</span>'
        f'<a class="brand-crumb brand-writing" href="{repo_rel}writing.html">{wlabel}</a>'
        f'<span class="brand-sep" aria-hidden="true">/</span>'
        f'<a class="brand" href="{series_rel}index.html"><span class="brand-series">{short}</span></a>'
        f"{part_badge}"
        f"</div>"
        f'<nav aria-label="Series navigation" id="site-nav" class="site-nav">'
        f'<a class="btn small" href="{series_rel}index.html">Contents</a>'
        f'<a class="btn small" href="{series_rel}{ref_page}">Reference</a>'
        f"</nav>"
    )
    text = re.sub(
        r'(<header\s+class="site-header"[^>]*>)[\s\S]*?(</header>)',
        lambda m: f"{m.group(1)}{header_inner}{m.group(2)}",
        text,
        count=1,
    )

    if cur_idx >= 0:
        pager_parts: list[str] = []
        if cur_idx > 0:
            prev_p = pages[cur_idx - 1]
            pager_parts.append(
                f'<a class="prev" href="{series_rel}{prev_p["file"]}">'
                f'<small>&larr; Previous Post</small>{html.escape(prev_p["title"])}</a>'
            )
        if cur_idx + 1 < len(pages):
            next_p = pages[cur_idx + 1]
            pager_parts.append(
                f'<a class="next" href="{series_rel}{next_p["file"]}">'
                f'<small>Next Post &rarr;</small>{html.escape(next_p["title"])}</a>'
            )
        pager_html = "".join(pager_parts)
        text = re.sub(
            r'(<nav\s+class="pager"[^>]*>)[\s\S]*?(</nav>)',
            lambda m: f"{m.group(1)}{pager_html}{m.group(2)}",
            text,
            count=1,
        )
    return text


def _populate_figures(text: str) -> str:
    main_m = re.search(r"(<main\b[^>]*>)([\s\S]*?)(</main>)", text)
    if not main_m:
        return text
    main_open, main_body, main_close = main_m.group(1), main_m.group(2), main_m.group(3)

    n = 0
    fig_labels: dict[str, str] = {}

    def _number_fig(m: re.Match) -> str:
        nonlocal n
        tag, inner, end = m.group(1), m.group(2), m.group(3)
        cls_m = re.search(r'\bclass="([^"]*)"', tag)
        classes = set(cls_m.group(1).split()) if cls_m else set()
        if "recap" in classes and 'data-numbered="true"' not in tag:
            return m.group(0)
        if not ("fig" in classes or "schematic" in classes):
            return m.group(0)
        pb_m = re.search(r'data-playbook-fig="([^"]+)"', tag)
        if pb_m:
            label = f"Playbook Figure {pb_m.group(1)}"
        else:
            n += 1
            label = f"Figure {n}"
        id_m = re.search(r'\bid="([^"]+)"', tag)
        if id_m:
            fig_labels[id_m.group(1)] = label

        def _fill_num(sm: re.Match) -> str:
            existing = sm.group(2).strip()
            if existing and 'data-static-fignum="1"' not in sm.group(1):
                return sm.group(0)
            return f'<span class="fig-num" data-static-fignum="1">{label}</span>'

        inner = re.sub(
            r'(<span\s+class="fig-num"[^>]*>)([\s\S]*?)(</span>)',
            _fill_num,
            inner,
            count=1,
        )
        is_interactive_plot = (
            "fig" in classes
            and "schematic" not in classes
            and "exercise" not in classes
            and "source" not in classes
            and "<svg" not in inner
            and "<img" not in inner
            and 'class="fig-nojs"' not in inner
        )
        if is_interactive_plot:
            nojs_snippet = '<noscript class="fig-nojs"><p>Interactive figure: enable JavaScript to adjust controls and view live plots.</p></noscript>'
            if re.search(r'<div\s+class="fig-panels">\s*</div>', inner):
                inner = re.sub(
                    r'(<div\s+class="fig-panels">\s*</div>)',
                    rf'\1\n        {nojs_snippet}',
                    inner,
                    count=1,
                )
            elif re.search(r'<p\s+class="fig-caption"', inner):
                inner = re.sub(
                    r'(\s*<p\s+class="fig-caption")',
                    rf'\n        {nojs_snippet}\1',
                    inner,
                    count=1,
                )
            else:
                inner = inner.rstrip() + f"\n        {nojs_snippet}\n      "
        return f"{tag}{inner}{end}"

    main_body = re.sub(
        r'(<figure\b[^>]*>)([\s\S]*?)(</figure>)', _number_fig, main_body
    )
    main_body = re.sub(
        r'(<a\b[^>]*\bclass="[^"]*\bfigref\b[^"]*")>\s*data-static-figref="[^"]*">([\s\S]*?</a>)',
        r'\1 data-static-figref="1">\2',
        main_body,
    )

    def _fill_figref(m: re.Match) -> str:
        open_a, inner, close_a = m.group(1), m.group(2), m.group(3)
        href_m = re.search(r'href="#([^"]+)"', open_a)
        if not href_m:
            return m.group(0)
        fid = href_m.group(1)
        if fid not in fig_labels:
            return m.group(0)
        if inner.strip() and 'data-static-figref="1"' not in open_a:
            return m.group(0)
        tag_head = re.sub(r'\s*data-static-figref="[^"]*"', "", open_a[:-1]).rstrip()
        return f'{tag_head} data-static-figref="1">{fig_labels[fid]}{close_a}'

    main_body = re.sub(
        r'(<a\b[^>]*\bclass="[^"]*\bfigref\b[^"]*"[^>]*>)([\s\S]*?)(</a>)',
        _fill_figref,
        main_body,
    )
    return text[: main_m.start()] + main_open + main_body + main_close + text[main_m.end() :]


def _populate_citations(text: str, refs: dict[str, dict]) -> str:
    if not refs:
        return text

    has_allrefs = 'id="allrefs"' in text
    has_reflist = 'id="reflist"' in text
    if not (has_allrefs or has_reflist) and 'data-ref="' not in text:
        return text

    keys: list[str] = []
    for m in re.finditer(r'<cite\b[^>]*\bdata-ref="([^"]+)"[^>]*>', text):
        k = m.group(1).strip()
        if k and k not in keys:
            keys.append(k)

    def _sort_key(k: str) -> tuple:
        r = refs.get(k)
        if not r:
            return (1, "", 0, "")
        return (0, _surname(r), int(r.get("year", 0)), r.get("title", "").lower())

    if has_allrefs:
        papers = sorted((k for k in refs if k != "playbook"), key=_sort_key)
        order = (["playbook"] if "playbook" in refs else []) + papers + [
            k for k in keys if k not in refs
        ]
    else:
        order = sorted(keys, key=_sort_key)

    def _rewrite_cite(m: re.Match) -> str:
        attrs, inner = m.group(1), m.group(2)
        ref_m = re.search(r'data-ref="([^"]+)"', attrs)
        if not ref_m:
            return m.group(0)
        key = ref_m.group(1).strip()
        clean_inner = re.sub(r'<span\s+class="cit-num"[^>]*>[\s\S]*?</span>', "", inner)
        clean_inner = re.sub(r"\s+", " ", clean_inner).strip()
        if key not in order:
            return m.group(0)
        n = order.index(key) + 1
        num_span = f'<span class="cit-num"><a href="#ref-{html.escape(key)}">[{n}]</a></span>'
        if clean_inner:
            return f"<cite{attrs}>{clean_inner}\u00a0{num_span}</cite>"
        return f"<cite{attrs}>{num_span}</cite>"

    text = re.sub(r"<cite\b([^>]*)>([\s\S]*?)</cite>", _rewrite_cite, text)

    list_items: list[str] = []
    for key in order:
        r = refs.get(key)
        if not r:
            list_items.append(f'<li id="ref-{html.escape(key)}">{html.escape(key)} (missing entry)</li>')
            continue
        authors = html.escape(r.get("authors", ""))
        year = html.escape(str(r.get("year", "")))
        title = html.escape(r.get("title", ""))
        venue = html.escape(r.get("venue", ""))
        url = html.escape(r.get("url", ""))
        sep = _after_title(r.get("title", ""))
        list_items.append(
            f'<li id="ref-{html.escape(key)}">'
            f'{authors} ({year}). <a href="{url}" target="_blank" rel="noopener">{title}</a>'
            f"{sep}{venue}.</li>"
        )
    items_html = "".join(list_items)
    target_id = "allrefs" if has_allrefs else "reflist"
    text = re.sub(
        rf'(<ol\s+id="{target_id}"[^>]*>)[\s\S]*?(</ol>)',
        lambda m: f"{m.group(1)}{items_html}{m.group(2)}",
        text,
        count=1,
    )
    return text


def build_all() -> int:
    """Synchronize all writing series HTML pages and return count updated."""
    if not WRITING_ROOT.exists():
        return 0
    updated = 0
    for manifest_path in sorted(WRITING_ROOT.glob("*/manifest.json")):
        series_dir = manifest_path.parent
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        refs = load_refs(series_dir / "js/refs.js")

        rel_files = [p["file"] for p in manifest.get("pages", [])]
        ds = manifest.get("designSheetPage")
        if ds and ds not in rel_files and (series_dir / ds).exists():
            rel_files.append(ds)

        for rel_file in rel_files:
            html_path = series_dir / rel_file
            if not html_path.exists():
                continue
            orig = html_path.read_text(encoding="utf-8")
            text = orig.replace("\r\n", "\n")

            depth = len(html_path.relative_to(REPO_ROOT).parent.parts)
            repo_rel = "../" * depth
            series_depth = len(html_path.relative_to(series_dir).parent.parts)
            series_rel = "../" * series_depth

            # Remove hardcoded data-theme="auto" on root/body.
            text = re.sub(r'(<html\b[^>]*?)\s+data-theme="auto"', r"\1", text)
            text = re.sub(r'(<body\b[^>]*?)\s+data-theme="auto"', r"\1", text)

            has_flowmap = (
                'class="playbook-map"' in text
                or 'class="flowmap"' in text
                or "flowmap.js" in text
                or "playbook-map.js" in text
            )

            text = _rewrite_head(text, repo_rel, manifest, has_flowmap)
            text = _remap_scripts(text, repo_rel, series_rel, has_flowmap)
            text = _populate_header_and_pager(text, rel_file, repo_rel, series_rel, manifest)
            text = _populate_figures(text)
            text = _populate_citations(text, refs)

            if text != orig:
                html_path.write_bytes(text.encode("utf-8"))
                updated += 1

        normalize_lf(series_dir)

    normalize_lf(REPO_ROOT / "assets/blog")
    print(f"build_writing: updated {updated} page(s).")
    return updated


def main() -> int:
    build_all()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
