"""Software & Code page content (redesign). generate_content(data) -> inner HTML for #software-content.

Renders from two sources:
  - assets/data/content.json  -> sections.software  (hand-curated: groups, featured, showcase, curation map)
  - assets/data/software_data.json (auto-generated cache from fetch_software.py: GitHub + PyPI stats)

Layout:
  1. Topline metric tiles (Repositories, GitHub Stars, Monthly PyPI Downloads, PyPI Packages)
  2. 2-Panel Software Ecosystem Dashboard:
     - Panel 1: Flagship Scientific Packages (Stars, Forks & Monthly PyPI Downloads)
     - Panel 2: Ecosystem Breakdown by Research Domain & Role
  3. Featured Tools board + Interactive Data-Visualization Showcase (allsky)
  4. Search, Sort (Most starred / Recently updated / A-Z), and Domain + Role filter chips
     above a 2-column repository grid.
"""
import json
import math
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
    """Load the software_data.json stats cache."""
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
    out = [f'<a class="reslink" href="{url_attr(repo["url"])}" target="_blank" rel="noopener">GitHub ↗</a>']
    if cur.get("docs"):
        out.append(f'<a class="reslink" href="{url_attr(cur["docs"])}" target="_blank" rel="noopener">Docs ↗</a>')
    if cur.get("paper"):
        out.append(f'<a class="reslink" href="{url_attr(cur["paper"])}" target="_blank" rel="noopener">Paper ↗</a>')
    if cur.get("url") and cur.get("url") != repo.get("url"):
        out.append(f'<a class="reslink" href="{url_attr(cur["url"])}" target="_blank" rel="noopener">Live App ↗</a>')
    return "".join(out)


def _feat_card(name, repo, cur, accent="ic"):
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
        install = f'<div class="install"><code>$ pip install {esc(cur["pypi"])}</code></div>'
    blurb = esc(cur.get("blurb") or repo.get("description") or "")
    pushed = _fdate(repo.get("pushed", ""))
    lang = "Python" if cur.get("pypi") else _LANG.get(repo.get("language") or "", ("", ""))[0]
    title_url = cur.get("docs") or repo.get("url") or "#"
    return (
        f'<article class="item feat-card accent-{accent}">'
        f'{card_meta((lang, True), f"Updated {pushed}" if pushed else "")}'
        f'<div class="item-head"><h3 class="item-title">'
        f'<a href="{url_attr(title_url)}" target="_blank" rel="noopener">{esc(name)}</a></h3></div>'
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
        '<section class="sw-showcase" data-lv-pinned aria-labelledby="sw-viz-head">'
        '<h2 id="sw-viz-head" class="pub-featured-head">Interactive Data Visualization</h2>'
        f'<a class="viz-card" href="{url_attr(url)}" target="_blank" rel="noopener">'
        f'{img_html}'
        f'<div class="viz-body"><h3 class="item-title">{title}</h3>'
        f'<p class="item-meta">{blurb}</p>'
        '<span class="btn-ghost viz-cta">Open the live 3-D visualization ↗</span>'
        '</div></a></section>')


def _software_dashboard(shown, curation, groups, group_accent):
    """2-panel visual dashboard for Software & Code:
    Panel 1: Flagship Package Adoption (GitHub Stars, Forks & PyPI Downloads)
    Panel 2: Ecosystem Breakdown by Research Domain & Maintainer Role
    """
    # Panel 1: Top packages by stars (sqrt-scaled bar so dynesty 416 and 18-55 star packages both show clearly)
    ranked = sorted(
        [(name, r) for name, r in shown.items() if (r.get("stars") or 0) >= 5],
        key=lambda kv: (kv[1].get("stars") or 0, kv[1].get("downloads_month") or 0),
        reverse=True
    )[:7]
    max_stars = max((r.get("stars") or 1 for _, r in ranked), default=1)
    pkg_rows = []
    for name, r in ranked:
        stars = r.get("stars") or 0
        forks = r.get("forks") or 0
        dl = _human(r.get("downloads_month"))
        cur = curation.get(name, {})
        gid = cur.get("group", "inference")
        acc = group_accent.get(gid, "ic")
        w = max(10.0, math.sqrt(stars / max_stars) * 100.0)
        dl_badge = f'<span class="sw-dl-pill">{dl}/mo PyPI</span>' if dl else ""
        fork_txt = f" · {forks} forks" if forks else ""
        title = f"{name}: {stars:,} stars{fork_txt}" + (f" · {dl}/mo downloads" if dl else "")
        pkg_rows.append(
            '<div class="mc-row sw-pkg-row">'
            f'<span class="mc-label"><span class="dot d-{acc}"></span><code>{esc(name)}</code></span>'
            f'<span class="mc-track" role="img" aria-label="{attr_esc(title)}" title="{attr_esc(title)}">'
            f'<span class="mc-seg mc-{acc}" style="width:{w:.1f}%"></span></span>'
            f'<span class="mc-total">{dl_badge}<strong>★ {stars:,}</strong></span>'
            '</div>'
        )
    panel1_leg = (
        '<div class="pf-leg" aria-hidden="true">'
        '<span class="pf-key"><i class="pf-kw mc-ic"></i>Inference</span>'
        '<span class="pf-key"><i class="pf-kw mc-du"></i>Stellar &amp; Cosmology</span>'
        '<span class="pf-key"><i class="pf-kw mc-sla"></i>AI &amp; LLM</span>'
        '<span class="pf-key"><i class="pf-kw mc-ii"></i>Visualization</span>'
        '<span class="pf-key">· Bar width ∝ √(GitHub ★)</span>'
        '</div>'
    )
    panel1 = (
        '<figure class="pub-fig mentor-chart">'
        '<figcaption class="pub-fig-head"><span class="t">Flagship package adoption</span>'
        '<span class="m">GitHub stars &amp; PyPI downloads</span></figcaption>'
        f'<div class="mc-rows">{"".join(pkg_rows)}</div>{panel1_leg}'
        '</figure>'
    )

    # Panel 2: Repositories by Domain stacked by Maintainer Role
    from collections import defaultdict
    dom_roles = defaultdict(lambda: {"lead": 0, "collab": 0, "fork": 0})
    role_counts = {"lead": 0, "collab": 0, "fork": 0}
    for name, r in shown.items():
        cur = curation.get(name, {})
        gid = cur.get("group") or "scratch"
        if r.get("isFork"):
            rk = "fork"
        elif r.get("external") or cur.get("external"):
            rk = "collab"
        else:
            rk = "lead"
        dom_roles[gid][rk] += 1
        role_counts[rk] += 1

    max_dom = max((sum(v.values()) for v in dom_roles.values()), default=1) or 1
    dom_rows = []
    for g in groups:
        gid = g["id"]
        rc = dom_roles.get(gid)
        if not rc or sum(rc.values()) == 0:
            continue
        cnt = sum(rc.values())
        acc = group_accent.get(gid, "mute")
        lbl = g["label"]
        segs = []
        for rk, cls in (("lead", "mc-role-lead"), ("collab", "mc-role-collab"), ("fork", "mc-role-fork")):
            if rc[rk]:
                segs.append(f'<span class="mc-seg {cls}" style="width:{rc[rk] / max_dom * 100.0:.1f}%"></span>')
        parts = []
        if rc["lead"]:
            parts.append(f'{rc["lead"]} lead')
        if rc["collab"]:
            parts.append(f'{rc["collab"]} co-maintainer')
        if rc["fork"]:
            parts.append(f'{rc["fork"]} fork')
        title = f"{lbl}: {cnt} repositories ({', '.join(parts)})"
        dom_rows.append(
            '<div class="mc-row sw-dom-row">'
            f'<span class="mc-label"><span class="dot d-{acc}"></span>{esc(lbl)}</span>'
            f'<span class="mc-track" role="img" aria-label="{attr_esc(title)}" title="{attr_esc(title)}">'
            f'{"".join(segs)}</span>'
            f'<span class="mc-total"><strong>{cnt}</strong></span>'
            '</div>'
        )
    panel2_leg = (
        '<div class="pf-leg">'
        f'<span class="pf-key"><i class="pf-kw seg-primary"></i>Lead author ({role_counts["lead"]})</span>'
        f'<span class="pf-key"><i class="pf-kw seg-significant"></i>Co-author / Collab ({role_counts["collab"]})</span>'
        f'<span class="pf-key"><i class="pf-kw seg-other"></i>Contributed forks ({role_counts["fork"]})</span>'
        '</div>'
    )
    panel2 = (
        '<figure class="pub-fig mentor-chart">'
        '<figcaption class="pub-fig-head"><span class="t">Ecosystem by domain &amp; role</span>'
        f'<span class="m">{len(shown)} repositories across {len(dom_rows)} categories</span></figcaption>'
        f'<div class="mc-rows">{"".join(dom_rows)}</div>{panel2_leg}'
        '</figure>'
    )

    return f'<div class="pub-figures sw-figures">{panel1}{panel2}</div>'


def _list_card(name, repo, cur, group_id, group_label, accent, featured):
    when_bits = []
    stars = int(repo.get("stars") or 0)
    if stars:
        when_bits.append(f'★ {stars:,}')
    if repo.get("forks"):
        fk = repo["forks"]
        when_bits.append(f'{fk} fork' + ("s" if fk != 1 else ""))
    dl = _human(repo.get("downloads_month"))
    if dl:
        when_bits.append(f'{dl}/mo')
    when = esc(" · ".join(b for b in when_bits if b))
    pushed = _fdate(repo.get("pushed", ""))
    lang = "Python" if cur.get("pypi") else _LANG.get(repo.get("language") or "", ("", ""))[0]
    blurb = esc(cur.get("blurb") or repo.get("description") or "")

    role_cat = "lead"
    tags = f'<span class="badge b-{accent}">{esc(group_label)}</span>' if group_label else ""
    if featured:
        tags = '<span class="tag feat">★ Featured</span>' + tags
    if cur.get("pypi"):
        tags += f'<span class="badge b-role-primary">PyPI: {esc(cur["pypi"])}</span>'
    if repo.get("isFork"):
        tags += '<span class="tag fork">Fork</span>'
        role_cat = "fork"
    elif repo.get("external") or cur.get("external"):
        tags += '<span class="tag external">Co-Maintainer</span>'
        role_cat = "collab"
    if repo.get("archived"):
        tags += '<span class="tag archived">Archived</span>'

    search_bits = [name, cur.get("blurb", "") or repo.get("description", ""), group_label,
                   repo.get("language") or "", cur.get("pypi") or ""]
    if repo.get("isFork"):
        search_bits.append("fork")
    if repo.get("external") or cur.get("external"):
        search_bits.append("collaborator external co-maintainer")
    if repo.get("archived"):
        search_bits.append("archived")
    search = attr_esc(" ".join(b for b in search_bits if b))
    pushed_int = int((repo.get("pushed", "") or "")[:10].replace("-", "") or 0)

    return (
        f'<article class="item sw-card accent-{accent}" data-lv-item '
        f'data-cat="{slug(group_id)} role-{role_cat}" '
        f'data-year="{pushed_int}" data-num="{stars}" '
        f'data-title="{attr_esc(name)}" data-search="{search}">'
        f'{card_meta((lang, True), f"Updated {pushed}" if pushed else "")}'
        f'<div class="item-head"><h3 class="item-title">'
        f'<a href="{url_attr(repo["url"])}" target="_blank" rel="noopener">{esc(name)}</a></h3>'
        f'<span class="item-when">{when}</span></div>'
        f'<div class="item-meta">{blurb}</div>'
        f'<div class="paper-badges"><div class="paper-tag-group">{tags}</div>'
        f'<div class="paper-links">{_links(repo, cur)}</div></div>'
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
        return "scratch"

    # ---------- topline metrics (auto-computed) ----------
    shown = {n: r for n, r in repos.items() if not curation.get(n, {}).get("hidden")}
    total_stars = sum(r.get("stars", 0) for r in shown.values())
    total_forks = sum(r.get("forks", 0) for r in shown.values())
    total_dl = sum(r.get("downloads_month") or 0 for r in shown.values())
    pypi_pkgs = sum(1 for n in shown if curation.get(n, {}).get("pypi"))
    gh_user = sw.get("githubUser", "joshspeagle")

    topline = (
        '<div class="pub-stats sw-stats">'
        f'<div class="pub-stat role-tile-total"><span class="n">{len(shown)}</span><span class="l">Repositories</span></div>'
        f'<div class="pub-stat role-tile-primary"><span class="n">{total_stars:,}</span><span class="l">GitHub stars</span></div>'
        f'<div class="pub-stat role-tile-student"><span class="n">{total_forks:,}</span><span class="l">Total forks</span></div>'
        f'<div class="pub-stat role-tile-postdoc"><span class="n">{_human(total_dl) or "56k"}</span><span class="l">PyPI downloads / mo</span></div>'
        f'<a class="pub-stat pub-statlink role-tile-significant" href="https://github.com/{url_attr(gh_user)}" target="_blank" rel="noopener">'
        f'<span class="n">{pypi_pkgs}</span><span class="l">PyPI packages</span>'
        '<span class="pub-stat-go" aria-hidden="true">@joshspeagle ↗</span></a>'
        '</div>'
    )

    # ---------- 2-panel ecosystem dashboard ----------
    dashboard_html = _software_dashboard(shown, curation, groups, group_accent)

    # ---------- featured board ----------
    feat_accents = ["ic", "du", "sla"]
    fcards = "".join(
        _feat_card(n, repos[n], curation.get(n, {}), accent=feat_accents[i % len(feat_accents)])
        for i, n in enumerate(featured_names) if n in repos
    )
    featured_html = (
        '<section class="pub-featured" data-lv-pinned aria-labelledby="sw-feat-head">'
        '<h2 id="sw-feat-head" class="pub-featured-head">Flagship Packages</h2>'
        f'<div class="featured-grid">{fcards}</div></section>') if fcards else ""

    # ---------- data-viz showcase ----------
    showcase_html = _showcase(sw, repos)

    # ---------- flat list + search/sort/filter controls at the top ----------
    # Default sort: non-scratch curated packages with stars first, then recently updated
    rows = sorted(
        shown.items(),
        key=lambda kv: (
            0 if group_of(kv[0], kv[1]) != "scratch" else 1,
            -(kv[1].get("stars") or 0),
            kv[1].get("pushed") or "",
        ),
    )
    counts = {}
    role_counts = {"lead": 0, "collab": 0, "fork": 0}
    for name, repo in rows:
        gid = group_of(name, repo)
        counts[gid] = counts.get(gid, 0) + 1
        cur = curation.get(name, {})
        if repo.get("isFork"):
            role_counts["fork"] += 1
        elif repo.get("external") or cur.get("external"):
            role_counts["collab"] += 1
        else:
            role_counts["lead"] += 1

    chips = [f'<button class="chip is-active" data-cat="all" aria-pressed="true">All <span class="ct">{len(rows)}</span></button>']
    for gid in group_order:
        if counts.get(gid):
            acc = group_accent[gid]
            chips.append(f'<button class="chip" data-cat="{slug(gid)}" aria-pressed="false">'
                         f'<span class="dot d-{acc}"></span>{esc(group_label[gid])} '
                         f'<span class="ct">{counts[gid]}</span></button>')

    role_chips = (
        f'<button class="chip is-active" data-cat="all" aria-pressed="true">All roles <span class="ct">{len(rows)}</span></button>'
        f'<button class="chip" data-cat="role-lead" aria-pressed="false"><span class="dot d-du"></span>Lead / Primary <span class="ct">{role_counts["lead"]}</span></button>'
        f'<button class="chip" data-cat="role-collab" aria-pressed="false"><span class="dot d-ii"></span>Co-Maintainer <span class="ct">{role_counts["collab"]}</span></button>'
        f'<button class="chip" data-cat="role-fork" aria-pressed="false"><span class="dot d-mute"></span>Forks <span class="ct">{role_counts["fork"]}</span></button>'
    )

    cards = "".join(
        _list_card(name, repo, curation.get(name, {}), group_of(name, repo),
                   group_label.get(group_of(name, repo), ""), group_accent.get(group_of(name, repo), "mute"),
                   name in featured_names)
        for name, repo in rows)

    list_html = (
        '<div data-listview data-lv-batch="0" data-lv-sort="default">'
        + featured_html
        + showcase_html
        + '<div class="sec-head"><h2 class="section-title">All Repositories &amp; Packages</h2>'
          '<div class="rule" aria-hidden="true"></div></div>'
        + '<div class="pub-controls">'
        '<input type="search" class="pub-search" data-lv-search '
        'placeholder="Search repositories by name, topic, PyPI package, or language…" aria-label="Search repositories">'
        '<select class="pub-sort" data-lv-sort-control aria-label="Sort repositories">'
        '<option value="default">Curated &amp; most starred</option>'
        '<option value="num">Most GitHub stars</option>'
        '<option value="year">Recently updated</option>'
        '<option value="az">Name (A–Z)</option></select>'
        f'<div class="pub-filters" data-lv-filters role="group" aria-label="Filter by domain">{"".join(chips)}</div>'
        f'<div class="pub-filters" data-lv-filters role="group" aria-label="Filter by role">{role_chips}</div>'
        '</div>'
        f'{listview_status()}'
        f'<div class="pub-list sw-grid" data-lv-list>{cards}</div>'
        '<p class="pub-empty" data-lv-empty hidden>No repositories match your search or filters. '
        '<button type="button" class="linkbtn" data-lv-reset>Show all</button></p>'
        '</div>')

    return '<div class="container">' + topline + dashboard_html + list_html + '</div>'
