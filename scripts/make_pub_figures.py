"""Pre-render the Publications interpretive figures as themed SVGs (dark + light).

Reads assets/data/publications_data.json and writes, for each theme:
  assets/images/pubfig-citations-<theme>.svg   citations received per year (sqrt scale)
  assets/images/pubfig-roles-<theme>.svg       publications per year by authorship role
  assets/images/pubfig-rank-<theme>.svg        citations by rank (Lorenz curve + Gini)

No runtime JS/Chart.js — the SVGs are committed and swapped per theme via CSS
(.fig-dark / .fig-light), matching the redesign's pre-render philosophy.
Re-run after the publication pipeline updates the data:  python scripts/make_pub_figures.py
"""
import json
from collections import defaultdict, Counter
from pathlib import Path

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / "assets" / "data" / "publications_data.json").read_text(encoding="utf-8"))
IMG = ROOT / "assets" / "images"

# Authorship roles: key -> (label, dark color, light color), drawn bottom->top
ROLES = [
    ("primary",     "Primary author", "#5aa9ff", "#1565c0"),
    ("postdoc",     "Postdoc-led",    "#a99bff", "#7c5cff"),
    ("student",     "Student-led",    "#ffb454", "#b9760f"),
    ("significant", "Contributor",    "#34d3e0", "#0e9aa8"),
    ("other",       "Other",          "#7e88b0", "#9aa0b8"),
]

THEMES = {
    "dark":  {"fg": "#eef1fb", "muted": "#aeb6d6", "grid": "#ffffff", "ga": 0.10, "accent": "#a99bff", "ci": 4},
    "light": {"fg": "#14161d", "muted": "#46444c", "grid": "#000000", "ga": 0.08, "accent": "#5b43d6", "ci": 3},
}


def _style(ax, t):
    ax.set_facecolor("none")
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    for s in ("left", "bottom"):
        ax.spines[s].set_color(t["muted"])
        ax.spines[s].set_alpha(0.4)
    ax.tick_params(colors=t["muted"], labelsize=9, length=0)
    ax.grid(axis="y", color=t["grid"], alpha=t["ga"], linewidth=0.8)
    ax.set_axisbelow(True)
    for lbl in ax.get_xticklabels() + ax.get_yticklabels():
        lbl.set_color(t["muted"])


def _save(fig, name):
    fig.savefig(IMG / name, format="svg", transparent=True, bbox_inches="tight", pad_inches=0.08)
    plt.close(fig)
    print("wrote", name)


def fig_citations(theme, t):
    cpy = {int(y): v for y, v in DATA["metrics"]["citationsPerYear"].items()}
    cur = max(cpy)                       # drop the current partial year
    yrs = [y for y in sorted(cpy) if y < cur]
    vals = np.array([cpy[y] for y in yrs], float)
    fig, ax = plt.subplots(figsize=(8.2, 2.9))
    sq = np.sqrt(vals)
    ax.fill_between(yrs, sq, color=t["accent"], alpha=0.22)
    ax.plot(yrs, sq, color=t["accent"], lw=2.4, marker="o", ms=4, mfc=t["accent"], mec="none")
    ticks = [100, 500, 1000, 2000, 3000]
    ax.set_yticks([np.sqrt(v) for v in ticks])
    ax.set_yticklabels([f"{v:,}" for v in ticks])
    ax.set_xticks(yrs[::2])
    ax.set_ylim(0, np.sqrt(max(vals) * 1.12))
    ax.set_ylabel("Citations received  (√ scale)", color=t["muted"], fontsize=9)
    _style(ax, t)
    _save(fig, f"pubfig-citations-{theme}.svg")


def fig_roles(theme, t):
    roles = defaultdict(Counter)
    for p in DATA["publications"]:
        y = p.get("year")
        if not y:
            continue
        roles[int(y)][p.get("authorshipCategory") or "other"] += 1
    yrs = list(range(min(roles), max(roles) + 1))
    fig, ax = plt.subplots(figsize=(8.2, 3.1))
    bottom = np.zeros(len(yrs))
    cidx = 2 if theme == "dark" else 3
    for key, label, cd, cl in ROLES:
        vals = np.array([roles[y].get(key, 0) for y in yrs], float)
        if vals.sum() == 0:
            continue
        ax.bar(yrs, vals, bottom=bottom, color=(cd if theme == "dark" else cl), label=label, width=0.78, edgecolor="none")
        bottom += vals
    ax.set_xticks(yrs[::2])
    ax.set_ylabel("Publications", color=t["muted"], fontsize=9)
    _style(ax, t)
    leg = ax.legend(loc="upper left", frameon=False, fontsize=8.5, ncol=2, labelcolor=t["muted"], handlelength=1.1, handleheight=1.1)
    _save(fig, f"pubfig-roles-{theme}.svg")


RIQ_SERIES = [
    ("all",         "All papers",      "#aeb6d6", "#8a8a8a", (0, (4, 3))),
    ("primary",     "Primary author",  "#5aa9ff", "#1565c0", "-"),
    ("significant", "Contributor",     "#34d3e0", "#0e9aa8", "-"),
    ("student",     "Student-led",     "#ffb454", "#b9760f", "-"),
    ("postdoc",     "Postdoc-led",     "#a99bff", "#7c5cff", "-"),
]


def fig_riq(theme, t):
    """Research Impact Quotient over time by authorship role (vs. the typical band)."""
    riq = DATA["metrics"]["riqByCategory"]
    fig, ax = plt.subplots(figsize=(8.2, 3.1))
    ax.axhspan(60, 150, color=t["muted"], alpha=0.09, lw=0)          # typical astronomer range
    ax.axhline(100, color=t["muted"], ls=(0, (4, 3)), lw=1, alpha=0.55)
    maxy = 0
    for key, label, cd, cl, ls in RIQ_SERIES:
        s = (riq.get(key) or {}).get("riq_series") or {}
        if not s:
            continue
        pts = sorted((int(y), float(v)) for y, v in s.items())
        cur = max(y for y, _ in pts)
        pts = [(y, v) for y, v in pts if y < cur]                    # drop partial year
        if not pts:
            continue
        xs = [y for y, _ in pts]
        ys = [v for _, v in pts]
        maxy = max(maxy, max(ys))
        cval = (riq.get(key) or {}).get("current")
        lab = f"{label} ({cval})" if cval is not None else label
        ax.plot(xs, ys, color=(cd if theme == "dark" else cl),
                lw=1.8 if key == "all" else 2.3, ls=ls, label=lab, solid_capstyle="round")
    ax.text(0.012, 102, "typical range", transform=ax.get_yaxis_transform(),
            va="bottom", ha="left", fontsize=7.5, color=t["muted"], alpha=0.85)
    ax.set_ylim(0, maxy * 1.10)
    ax.set_ylabel("Research Impact Quotient", color=t["muted"], fontsize=9)
    _style(ax, t)
    ax.legend(loc="upper left", frameon=False, fontsize=8.2, ncol=2,
              labelcolor=t["muted"], handlelength=1.6, columnspacing=1.2)
    _save(fig, f"pubfig-riq-{theme}.svg")


def main():
    for theme, t in THEMES.items():
        fig_citations(theme, t)
        fig_roles(theme, t)
        fig_riq(theme, t)


if __name__ == "__main__":
    main()
