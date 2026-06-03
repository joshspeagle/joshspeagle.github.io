"""Generate a 1200x630 OpenGraph/Twitter social card (assets/images/og-card.png).

Run once (or after rebranding):  python scripts/make_og_card.py
Palette copied verbatim from assets/css/theme-variables.css.
"""
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle

# Brand palette (theme-variables.css)
BG = "#0a0a2c"
BG2 = "#1a0a2c"
BLUE = "#64b5f6"
GREEN = "#81c784"
ORANGE = "#ffb74d"
TEXT = "#e8e9ea"

OUT = Path(__file__).resolve().parent.parent / "assets" / "images" / "og-card.png"

# 1200x630 px at dpi=100 -> 12x6.3 inches
fig = plt.figure(figsize=(12, 6.3), dpi=100)
ax = fig.add_axes([0, 0, 1, 1])
ax.set_xlim(0, 1)
ax.set_ylim(0, 1)
ax.axis("off")

# Diagonal two-tone background
ax.add_patch(Rectangle((0, 0), 1, 1, facecolor=BG, zorder=0))
ax.fill_betweenx([0, 1], [1, 0], [1, 1], color=BG2, zorder=1, alpha=0.9)

# Accent bar along the bottom
ax.add_patch(Rectangle((0, 0), 1, 0.022, facecolor=BLUE, zorder=3))
ax.add_patch(Rectangle((0, 0), 0.6, 0.022, facecolor=GREEN, zorder=3))
ax.add_patch(Rectangle((0, 0), 0.25, 0.022, facecolor=ORANGE, zorder=3))

ax.text(0.06, 0.62, "Joshua S. Speagle",
        fontsize=58, fontweight="bold", color=TEXT,
        ha="left", va="center", zorder=4)
ax.text(0.06, 0.45, "Statistical AI for Cosmic Discovery",
        fontsize=30, color=BLUE, ha="left", va="center", zorder=4)
ax.text(0.06, 0.33, "Assistant Professor  |  University of Toronto",
        fontsize=22, color=TEXT, alpha=0.85, ha="left", va="center", zorder=4)

fig.savefig(OUT, dpi=100, facecolor=BG)
print(f"Wrote {OUT}")
