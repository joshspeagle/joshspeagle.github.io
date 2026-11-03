"""
Writing page generator (writing.html). generate_content(data) -> inner HTML for #writing-content.

Renders the Writing hub featuring multi-part interactive series and technical essays:
  1. Four topline stat tiles (Interactive Series, Series Parts, Interactive Figures,
     Playbook Rules).
  2. A Tier-1 Featured Series Spotlight + 4-Act Interactive Curriculum Explorer for
     "Notes on the Deep Learning Tuning Playbook", wired to localStorage ('tp-posts-opened')
     so returning readers see their reading progress and next-part resume link.
  3. A unified search and filterable feed (by entry kind and curriculum act) covering
     the Series Overview, all 9 Parts, the Reference Companion, and the Design Sheet.
"""

from pages_shared import (
    accent_class,
    attr_esc,
    card_meta,
    chip,
    clean_text,
    esc,
    esc_text,
    listview_status,
    slug,
    url_attr,
)


def _render_series_spotlight(series, entries_by_part):
    """Render the Tier-1 Featured Series Spotlight and 4-Act Curriculum Grid."""
    title = esc_text(series.get("title", ""))
    kicker = esc_text(series.get("kicker", "Featured Interactive Series"))
    status = esc_text(series.get("status", ""))
    summary_html = clean_text(series.get("summary", ""))
    landing_url = url_attr(series.get("landingUrl", "writing/dl-tuning-playbook/index.html"))
    start_url = url_attr(series.get("startUrl", "writing/dl-tuning-playbook/pages/01-the-tuning-loop.html"))
    ref_url = url_attr(series.get("referenceUrl", "writing/dl-tuning-playbook/pages/reference.html"))
    ds_url = url_attr(series.get("designSheetUrl", "writing/dl-tuning-playbook/design-sheet.html"))
    repo_url = url_attr(series.get("sourceRepoUrl", "https://github.com/google-research/tuning_playbook"))
    repo_label = esc_text(series.get("sourceRepoLabel", "Google Research Playbook"))
    storage_key = attr_esc(series.get("storageKey", "tp-posts-opened"))

    status_pill = (
        f'<span class="badge b-sla writing-preview-badge" title="Unlisted preview for colleague &amp; student feedback">'
        f'{status}</span>' if status else ''
    )

    # Render the 4-Act Interactive Curriculum Grid
    act_cols = []
    for act in series.get("acts", []):
        act_num = esc_text(act.get("num", ""))
        act_title = esc_text(act.get("title", ""))
        act_desc = esc_text(act.get("description", ""))
        act_acc = accent_class(act.get("accent", "ic"), f'writing act {act.get("id")!r}')
        part_cards = []
        for pnum in act.get("parts", []):
            p = entries_by_part.get(pnum)
            if not p:
                continue
            p_url = url_attr(p.get("url", ""))
            p_short = esc_text(p.get("shortTitle") or p.get("title", ""))
            p_figs = int(p.get("figures", 0))
            fig_label = f"{p_figs} fig{'s' if p_figs != 1 else ''}" if p_figs else "essay"
            part_cards.append(
                f'<a class="wr-part-card" href="{p_url}" data-part-num="{pnum}" '
                f'data-part-url="{p_url}" data-part-short="{attr_esc(p_short)}">'
                f'<div class="wr-part-top">'
                f'<span class="wr-part-num">Part {pnum}</span>'
                f'<span class="wr-part-meta" data-part-status data-default-label="{attr_esc(fig_label)}">{esc_text(fig_label)}</span>'
                f'</div>'
                f'<div class="wr-part-title">{p_short}</div>'
                f'</a>'
            )
        # In Act IV, also surface the Reference Companion and Design Sheet cards
        if act.get("id") == "act-4":
            part_cards.append(
                f'<a class="wr-part-card wr-part-aux" href="{ref_url}">'
                f'<div class="wr-part-top">'
                f'<span class="wr-part-num">Reference</span>'
                f'<span class="wr-part-meta">64 rules · 114 terms</span>'
                f'</div>'
                f'<div class="wr-part-title">Reference companion &amp; glossary</div>'
                f'</a>'
            )
            part_cards.append(
                f'<a class="wr-part-card wr-part-aux" href="{ds_url}">'
                f'<div class="wr-part-top">'
                f'<span class="wr-part-num">Design</span>'
                f'<span class="wr-part-meta">Tokens &amp; specs</span>'
                f'</div>'
                f'<div class="wr-part-title">Visual &amp; component design sheet</div>'
                f'</a>'
            )

        act_cols.append(
            f'<div class="wr-act-col accent-{act_acc}">'
            f'<div class="wr-act-head">'
            f'<span class="wr-act-kicker"><span class="dot d-{act_acc}"></span>{act_num}</span>'
            f'<h3 class="wr-act-title">{act_title}</h3>'
            f'<p class="wr-act-desc">{act_desc}</p>'
            f'</div>'
            f'<div class="wr-act-parts">{"".join(part_cards)}</div>'
            f'</div>'
        )

    acts_html = f'<div class="wr-acts-grid">{"".join(act_cols)}</div>'

    return (
        f'<section class="art-panel writing-spotlight" data-chip data-lv-pinned '
        f'data-series-progress data-storage-key="{storage_key}" data-total-parts="9" '
        f'aria-labelledby="wr-series-title">'
        f'<div class="writing-spotlight-top">'
        f'<div class="writing-spotlight-heading">'
        f'<div class="eyebrow">{kicker} {status_pill}</div>'
        f'<h2 id="wr-series-title" class="art-panel-title"><a href="{landing_url}">{title}</a></h2>'
        f'</div>'
        f'<div class="wr-progress-box" aria-live="polite">'
        f'<div class="wr-progress-head">'
        f'<span class="wr-progress-label" data-progress-label>Reading progress: 0 of 9 parts opened</span>'
        f'<span class="wr-progress-pct" data-progress-pct>0%</span>'
        f'</div>'
        f'<div class="wr-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="9" aria-valuenow="0" '
        f'aria-label="Series reading progress" data-progress-bar>'
        f'<span class="wr-progress-fill" data-progress-fill style="width:0%"></span>'
        f'</div>'
        f'</div>'
        f'</div>'
        f'<p class="art-panel-lede">{summary_html}</p>'
        f'<div class="art-cta writing-cta-row">'
        f'<a class="btn btn-primary" href="{landing_url}">Open Series Overview &amp; Flowchart</a>'
        f'<a class="btn btn-ghost" href="{start_url}" data-progress-cta>Start with Part 1</a>'
        f'<a class="btn btn-ghost" href="{ref_url}">Reference Companion (64 Rules)</a>'
        f'<a class="btn btn-ghost" href="{repo_url}" target="_blank" rel="noopener noreferrer">{repo_label}</a>'
        f'</div>'
        f'<div class="wr-curriculum-head">'
        f'<span class="wr-curriculum-kicker">Four-Act Curriculum Map</span>'
        f'<span class="wr-curriculum-hint">Select any part to jump directly into the interactive post</span>'
        f'</div>'
        f'{acts_html}'
        f'</section>'
    )


def _render_entry_card(entry):
    """Render one Tier-3 listview card for a series overview, part, reference page, or standalone essay."""
    kind = slug(entry.get("kind", "part"))
    act = slug(entry.get("act", "all"))
    accent = accent_class(entry.get("accent", "ic"), f'writing entry {entry.get("id")!r}')
    year = int(entry.get("year", 2026))
    order = int(entry.get("order", 0))
    date_str = entry.get("date", "Nov 2026")
    badge_txt = entry.get("badge", "Essay")
    title = entry.get("title", "")
    url = entry.get("url", "#")
    summary = entry.get("summary", "")
    details = entry.get("details", "")
    figs = int(entry.get("figures", 0))
    part_num = entry.get("partNum")
    pb_sections = entry.get("playbookSections") or []
    tags = entry.get("tags") or []

    fig_meta = f"{figs} interactive figure{'s' if figs != 1 else ''}" if figs > 0 else ""
    meta = card_meta((badge_txt, True), date_str, fig_meta)

    # Expandable drawer with mathematical models, interactive figures, and Playbook sections
    drawer_parts = []
    if details:
        drawer_parts.append(f'<p>{esc(details)}</p>')
    if pb_sections:
        sec_items = ", ".join(f'<em>{esc_text(s)}</em>' for s in pb_sections)
        drawer_parts.append(
            f'<p class="wr-drawer-pb"><strong>Playbook sections covered:</strong> {sec_items}</p>'
        )

    drawer_html = ""
    if drawer_parts:
        drawer_html = (
            f'<details class="paper-abs-toggle">'
            f'<summary>Models, figures &amp; Playbook sections</summary>'
            f'<div class="paper-abs">{"".join(drawer_parts)}</div>'
            f'</details>'
        )

    # Tag badges + action links
    tag_badges = [f'<span class="badge b-{accent}">{esc_text(badge_txt)}</span>']
    for t in tags[:3]:
        tag_badges.append(f'<span class="tag">{esc_text(t)}</span>')

    if kind == "series":
        primary_label = "Open Series Landing Page →"
    elif kind == "part" and part_num:
        primary_label = f"Read Part {part_num} →"
    else:
        primary_label = f"Open {entry.get('shortTitle', 'Page')} →"

    links = [f'<a class="reslink" href="{url_attr(url)}">{esc_text(primary_label)}</a>']
    if kind == "part":
        links.append(
            '<a class="reslink" href="writing/dl-tuning-playbook/index.html#process">Tuning Flowchart →</a>'
        )
        links.append(
            '<a class="reslink" href="writing/dl-tuning-playbook/pages/reference.html">64-Rule Reference →</a>'
        )
    elif kind == "series":
        links.append(
            '<a class="reslink" href="writing/dl-tuning-playbook/pages/01-the-tuning-loop.html">Start with Part 1 →</a>'
        )
        links.append(
            '<a class="reslink" href="writing/dl-tuning-playbook/pages/reference.html">Reference Companion →</a>'
        )

    read_when = (
        '<span class="item-when wr-card-read-badge" data-part-read-badge hidden>✓ Opened</span>'
        if part_num else ''
    )

    search_blob = " ".join([
        title,
        summary,
        details,
        badge_txt,
        " ".join(pb_sections),
        " ".join(tags),
    ])
    part_attr = f' data-part-num="{int(part_num)}"' if part_num else ""
    cats = f"{kind} {act}" if act and act != "all" else kind

    return (
        f'<article class="item writing-card accent-{accent}" data-lv-item '
        f'data-cat="{cats}" data-year="{year}" data-num="{100 - order}" '
        f'data-title="{attr_esc(title)}"{part_attr} '
        f'data-search="{attr_esc(search_blob)}">'
        f'{meta}'
        f'<div class="item-head"><h3 class="item-title">'
        f'<a href="{url_attr(url)}">{esc_text(title)}</a></h3>'
        f'{read_when}</div>'
        f'<div class="item-meta">{esc(summary)}</div>'
        f'{drawer_html}'
        f'<div class="paper-badges"><div class="paper-tag-group">{"".join(tag_badges)}</div>'
        f'<div class="paper-links">{"".join(links)}</div></div>'
        f'</article>'
    )


def generate_content(data):
    """Build the #writing-content inner HTML from content.json."""
    w = data.get("sections", {}).get("writing", {})
    stats_cfg = w.get("stats", {})
    series_list = w.get("series", [])
    entries = w.get("entries", [])

    series_count = int(stats_cfg.get("seriesCount", len(series_list) or 1))
    posts_count = int(stats_cfg.get("postsCount", sum(1 for e in entries if e.get("kind") == "part")))
    figs_count = int(stats_cfg.get("figuresCount", 20))
    rules_count = int(stats_cfg.get("rulesCount", 64))

    topline = (
        '<div class="pub-stats">'
        f'<div class="pub-stat role-tile-total"><span class="n">{series_count}</span><span class="l">Interactive Series</span></div>'
        f'<div class="pub-stat role-tile-primary"><span class="n">{posts_count}</span><span class="l">Series Parts</span></div>'
        f'<div class="pub-stat role-tile-student"><span class="n">{figs_count}</span><span class="l">Interactive Figures</span></div>'
        f'<div class="pub-stat role-tile-significant"><span class="n">{rules_count}</span><span class="l">Playbook Rules</span></div>'
        '</div>'
    )

    entries_by_part = {
        int(e["partNum"]): e for e in entries if e.get("partNum") is not None
    }

    pinned_html = "".join(
        _render_series_spotlight(s, entries_by_part) for s in series_list
    )

    kind_counts = {}
    act_counts = {}
    for e in entries:
        k = slug(e.get("kind", "part"))
        a = slug(e.get("act", "all"))
        kind_counts[k] = kind_counts.get(k, 0) + 1
        act_counts[a] = act_counts.get(a, 0) + 1

    kind_chips = "".join([
        chip("all", "All Entries", len(entries), active=True),
        chip("series", "Series Overview", kind_counts.get("series", 0), accent="sla"),
        chip("part", "Series Parts", kind_counts.get("part", 0), accent="ic"),
        chip("reference", "Reference & Design", kind_counts.get("reference", 0), accent="du"),
    ])

    act_chips = "".join([
        chip("all", "All Acts", len(entries), active=True),
        chip("act-1", "Act I: Loop & Setup", act_counts.get("act-1", 0), accent="ic"),
        chip("act-2", "Act II: Search & Decisions", act_counts.get("act-2", 0), accent="ii"),
        chip("act-3", "Act III: Horizon & Stability", act_counts.get("act-3", 0), accent="sla"),
        chip("act-4", "Act IV: Systems & Reference", act_counts.get("act-4", 0), accent="du"),
    ])

    cards = "".join(_render_entry_card(e) for e in entries)

    list_html = (
        '<div id="writing-root" data-listview data-lv-batch="0" data-lv-sort="default">'
        + pinned_html
        + '<div class="sec-head"><h2 class="section-title">All Series Parts, Guides &amp; Reference Pages</h2>'
          '<div class="rule" aria-hidden="true"></div></div>'
        + '<div class="pub-controls">'
        '<input type="search" class="pub-search" data-lv-search '
        'placeholder="Search posts, concepts (e.g. critical batch size, Sobol, warmup), or Playbook sections…" '
        'aria-label="Search writing entries">'
        '<select class="pub-sort" data-lv-sort-control aria-label="Sort writing entries">'
        '<option value="default">Series / reading order</option>'
        '<option value="year">Newest first</option>'
        '<option value="az">Title (A–Z)</option></select>'
        f'<div class="pub-filters" data-lv-filters role="group" aria-label="Filter by format">{kind_chips}</div>'
        f'<div class="pub-filters" data-lv-filters role="group" aria-label="Filter by curriculum act">{act_chips}</div>'
        '</div>'
        + listview_status()
        + f'<div class="pub-list" data-lv-list data-chip>{cards}</div>'
        + '<p class="pub-empty" data-lv-empty hidden>No entries match your search or filters. '
          '<button type="button" class="linkbtn" data-lv-reset>Show all</button></p>'
        + '</div>'
    )

    return '<div class="container">' + topline + list_html + '</div>'
