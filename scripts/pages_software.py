"""Software & Code page content (redesign). generate_content(data) -> inner HTML for #software-content.

Renders from two sources:
  - assets/data/content.json  -> sections.software  (hand-curated: groups, featured, showcase, curation map)
  - assets/data/software_data.json (auto-generated cache from fetch_software.py: GitHub + PyPI stats)

Layout: topline metric strip -> Featured tools board -> Data-visualization showcase ->
flat, date-sorted repo list with group filter chips (wired by listview.js).
Repos absent from the curation map are bucketed into "scratch" (forks always go to scratch).
"""
import json
import re
from datetime import datetime

from config import get_data_path
from pages_shared import accent_class, attr_esc, card_meta, esc, listview_status, slug, url_attr

# GitHub language -> (short label, css token)
_LANG = {
    "Python": ("Python", "py"),
    "JavaScript": ("JavaScript", "js"),
    "Jupyter Notebook": ("Jupyter", "jn"),
    "HTML": ("Web", "web"), "SCSS": ("Web", "web"), "CSS": ("Web", "web"),
    "Astro": ("Web", "web"), "TeX": ("TeX", "x"),
}


def _load_cache():
    """Load the software_data.json stats cache.

    A missing or corrupt cache raises (OSError / json.JSONDecodeError): build_html
    reports the page as failed and exits non-zero, rather than silently publishing a
    Software page with "0 repositories, 0 GitHub stars" (C4).
    """
    with open(get_data_path("software_data.json"), encoding="utf-8") as f:
        return json.load(f)


def _human(n):
    if not n:
        return None
    return f"{round(n/1000)}k" if n >= 1000 else str(n)


def _fdate(s):
    try:
        return datetime.strptime(s[:10], "%Y-%m-%d").strftime("%b %Y")
    except Exception:
        return ""


def _links(repo, cur):
    out = [f'<a class="reslink" href="{url_attr(repo["url"])}" target="_blank" rel="noopener">GitHub</a>']
    if cur.get("docs"):
        out.append(f'<a class="reslink" href="{url_attr(cur["docs"])}" target="_blank" rel="noopener">Docs</a>')
    if cur.get("paper"):
        out.append(f'<a class="reslink" href="{url_attr(cur["paper"])}" target="_blank" rel="noopener">Paper</a>')
    return "".join(out)


def _feat_card(name, repo, cur):
    stats = []
    if repo.get("stars"):
        stats.append(("{:,}".format(repo["stars"]), "stars"))
    if repo.get("forks"):
        stats.append((str(repo["forks"]), "forks"))
    dl = _human(repo.get("downloads_month"))
    if dl:
        stats.append((dl, "downloads / mo"))
    stats_html = "".join(
        f'<div class="tool-stat"><span class="n">{esc(n)}</span><span class="l">{esc(l)}</span></div>'
        for n, l in stats)
    install = ""
    if cur.get("pypi"):
        install = f'<div class="install">$ pip install {esc(cur["pypi"])}</div>'
    blurb = esc(cur.get("blurb") or repo.get("description") or "")
    pushed = _fdate(repo.get("pushed", ""))
    lang = _LANG.get(repo.get("language") or "", ("", ""))[0]
    return (
        f'<article class="item feat-card accent-violet">'
        f'{card_meta((lang, True), f"Updated {pushed}" if pushed else "")}'
        f'<div class="item-head"><h3 class="item-title">{esc(name)}</h3></div>'
        f'<div class="item-meta">{blurb}</div>'
        f'<div class="tool-stats">{stats_html}</div>'
        f'{install}'
        f'<div class="item-tags">'
        f'<span class="paper-links">{_links(repo, cur)}</span></div>'
        f'</article>')


def _showcase(sw, repos):
    sc = sw.get("showcase")
    if not sc:
        return ""
    url = sc.get("url", "#")
    img = sc.get("image", "")
    title = esc(sc.get("title", sc.get("repo", "")))
    blurb = esc(sc.get("blurb", ""))
    # <picture> + webp sibling + intrinsic width/height (no layout shift), matching
    # how every other photo on the site is served (D18).
    dims = ""
    if sc.get("imageWidth") and sc.get("imageHeight"):
        dims = f' width="{int(sc["imageWidth"])}" height="{int(sc["imageHeight"])}"'
    webp = re.sub(r"\.(jpe?g|png)$", ".webp", img, flags=re.I)
    src_html = (f'<source srcset="{url_attr(webp)}" type="image/webp">'
                if webp != img else "")
    img_html = (f'<div class="viz-img"><picture>{src_html}'
                f'<img src="{url_attr(img)}" loading="lazy" decoding="async"{dims} '
                f'alt="Preview of the {title} visualization"></picture></div>') if img else ""
    return (
        '<section class="sw-showcase" aria-labelledby="sw-viz-head">'
        '<h2 id="sw-viz-head" class="pub-featured-head">Data visualization</h2>'
        f'<a class="viz-card" data-chip href="{url_attr(url)}" target="_blank" rel="noopener">'
        f'{img_html}'
        f'<div class="viz-body"><h3 class="item-title">{title}</h3>'
        f'<p class="item-meta">{blurb}</p>'
        '<span class="viz-cta">Open the live visualization ↗</span>'
        '</div></a></section>')


def _list_card(name, repo, cur, group_id, group_label, accent, featured):
    # The date slot keeps the live numbers; the card's metadata line says what the
    # repo is written in and when it last moved.
    when_bits = []
    if repo.get("stars"):
        when_bits.append(f'★ {repo["stars"]}')
    if repo.get("forks"):
        fk = repo["forks"]
        when_bits.append(f'{fk} fork' + ("s" if fk != 1 else ""))
    dl = _human(repo.get("downloads_month"))
    if dl:
        when_bits.append(f'{dl}/mo')
    when = esc(" · ".join(b for b in when_bits if b))
    pushed = _fdate(repo.get("pushed", ""))
    lang = _LANG.get(repo.get("language") or "", ("", ""))[0]
    blurb = esc(cur.get("blurb") or repo.get("description") or "")
    tags = ""
    if featured:
        tags += '<span class="tag feat">★ Featured</span>'
    if repo.get("isFork"):
        tags += '<span class="tag fork">fork</span>'
    if repo.get("external"):
        tags += '<span class="tag external">collaborator</span>'
    if repo.get("archived"):
        tags += '<span class="tag archived">archived</span>'
    # Search over everything the card actually shows: name, blurb, group, the language
    # pill, and the fork / collaborator / archived tags (E8).
    search_bits = [name, cur.get("blurb", "") or repo.get("description", ""), group_label,
                   repo.get("language") or ""]
    if repo.get("isFork"):
        search_bits.append("fork")
    if repo.get("external"):
        search_bits.append("collaborator external")
    if repo.get("archived"):
        search_bits.append("archived")
    search = attr_esc(" ".join(b for b in search_bits if b))
    num = (repo.get("pushed", "") or "")[:10].replace("-", "")
    return (
        f'<article class="item accent-{accent}" data-lv-item data-cat="{slug(group_id)}" '
        f'data-num="{num}" data-title="{attr_esc(name)}" data-search="{search}">'
        f'{card_meta((lang, True), f"Updated {pushed}" if pushed else "")}'
        f'<div class="item-head"><h3 class="item-title">{esc(name)}</h3>'
        f'<span class="item-when">{when}</span></div>'
        f'<div class="item-meta">{blurb}</div>'
        f'<div class="item-tags">{tags}<span class="paper-links">{_links(repo, cur)}</span></div>'
        f'</article>')


def generate_content(data):
    sw = data["sections"]["software"]
    cache = _load_cache()
    repos = cache.get("repos", {})
    curation = sw.get("curation", {})
    groups = sw.get("groups", [])
    group_label = {g["id"]: g["label"] for g in groups}
    group_accent = {g["id"]: accent_class(g.get("accent", "violet"), f'software group {g["id"]!r}')
                    for g in groups}
    group_order = [g["id"] for g in groups]
    featured_names = sw.get("featured", [])

    def group_of(name, repo):
        cur = curation.get(name, {})
        if cur.get("group"):
            return cur["group"]
        return "scratch"  # forks + anything uncurated land here

    # ---------- topline metrics (auto-computed) ----------
    shown = {n: r for n, r in repos.items() if not curation.get(n, {}).get("hidden")}
    total_stars = sum(r.get("stars", 0) for r in shown.values())
    total_dl = sum(r.get("downloads_month") or 0 for r in shown.values())
    metrics = [(str(len(shown)), "repositories"), ("{:,}".format(total_stars), "GitHub stars")]
    if total_dl:
        metrics.append((_human(total_dl), "downloads / mo"))
    metrics_html = "".join(
        f'<div class="pub-metric"><span class="n">{esc(n)}</span><span class="l">{esc(l)}</span></div>'
        for n, l in metrics)
    topline = ('<div class="sw-topline">'
               f'<div class="pub-metrics-chip" data-chip><div class="pub-metrics">{metrics_html}</div></div>'
               '</div>')

    # ---------- featured board ----------
    fcards = "".join(_feat_card(n, repos[n], curation.get(n, {}))
                     for n in featured_names if n in repos)
    featured_html = (
        '<section class="pub-featured" data-chip aria-labelledby="sw-feat-head">'
        '<h2 id="sw-feat-head" class="pub-featured-head">Featured tools</h2>'
        f'<div class="featured-grid">{fcards}</div></section>') if fcards else ""

    # ---------- data-viz showcase ----------
    showcase_html = _showcase(sw, repos)

    # ---------- flat, date-sorted list + group filter chips ----------
    rows = sorted(shown.items(), key=lambda kv: (kv[1].get("pushed") or ""), reverse=True)
    counts = {}
    for name, repo in rows:
        counts[group_of(name, repo)] = counts.get(group_of(name, repo), 0) + 1
    chips = [f'<button class="chip is-active" data-cat="all" aria-pressed="true">All <span class="ct">{len(rows)}</span></button>']
    for gid in group_order:
        if counts.get(gid):
            acc = group_accent[gid]
            chips.append(f'<button class="chip" data-cat="{slug(gid)}" aria-pressed="false">'
                         f'<span class="dot d-{acc}"></span>{esc(group_label[gid])} '
                         f'<span class="ct">{counts[gid]}</span></button>')
    cards = "".join(
        _list_card(name, repo, curation.get(name, {}), group_of(name, repo),
                   group_label.get(group_of(name, repo), ""), group_accent.get(group_of(name, repo), "mute"),
                   name in featured_names)
        for name, repo in rows)
    list_html = (
        '<div class="container"><h2 class="sr-only">All repositories</h2>'
        '<div data-listview data-lv-batch="0" data-lv-sort="num">'
        '<div class="pub-controls">'
        '<input type="search" class="pub-search" data-lv-search placeholder="Search all repositories…" aria-label="Search repositories">'
        '<select class="pub-sort" data-lv-sort-control aria-label="Sort">'
        '<option value="num">Recently updated</option><option value="az">A–Z</option></select>'
        f'<div class="pub-filters" data-lv-filters role="group" aria-label="Filter">{"".join(chips)}</div>'
        '</div>'
        f'{listview_status()}'
        f'<div class="pub-list" data-lv-list>{cards}</div>'
        '<p class="pub-empty" data-lv-empty hidden>No repositories match your search or filters. '
        '<button type="button" class="linkbtn" data-lv-reset>Show all</button></p>'
        '</div></div>')

    return ('<div class="container">' + topline + featured_html + showcase_html + '</div>' + list_html)
