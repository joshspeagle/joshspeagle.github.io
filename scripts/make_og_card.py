"""Generate a 1200x630 OpenGraph/Twitter social card (assets/images/og-card.png).

Run once (or after rebranding):  python scripts/make_og_card.py

Palette and type are kept in sync with the June 2026 redesign: design tokens live in
assets/data/tokens.json -> assets/css/tokens.css, and the card reuses the vendored
brand fonts in assets/fonts/ (Source Serif 4 for the name, Inter for the rest).
"""
import tempfile
from pathlib import Path

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
from matplotlib.colors import LinearSegmentedColormap

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "images" / "og-card.png"
FONTS = ROOT / "assets" / "fonts"

# Brand colors (mirror assets/css/tokens.css, dark theme)
BG0 = "#06080f"          # --bg-0
BG2 = "#0a1228"          # --bg-2
VIOLET = "#8b7bff"       # --violet
VIOLET_BRIGHT = "#a99bff"  # --violet-bright
CYAN = "#6fd2ff"         # gradient cyan end (--grad)
TEXT = "#eef1fb"         # --text
TEXT2 = "#aeb6d6"        # --text-2


def hex2rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)]) / 255.0


def brand_font(woff2_name):
    """Load a vendored woff2 as a matplotlib FontProperties (via an uncompressed temp copy).

    Returns None on any failure so callers fall back to matplotlib's default font.
    """
    try:
        from fontTools.ttLib import TTFont
        src = FONTS / woff2_name
        f = TTFont(src)
        f.flavor = None  # strip woff2 compression -> plain sfnt freetype can read
        tmp = Path(tempfile.gettempdir()) / (woff2_name.rsplit(".", 1)[0] + ".ttf")
        f.save(tmp)
        return fm.FontProperties(fname=str(tmp))
    except Exception as e:  # pragma: no cover - cosmetic fallback
        print(f"  (font {woff2_name} unavailable: {e}; using default)")
        return None


serif_bold = brand_font("source-serif-4-700-normal.woff2")
sans_semi = brand_font("inter-600-normal.woff2")
sans_reg = brand_font("inter-400-normal.woff2")


def star_points(cx, cy, r_out, r_in):
    """Four-point sparkle star (✦), matching the favicon mark."""
    return [
        (cx, cy + r_out), (cx + r_in * 0.5, cy + r_in * 0.5),
        (cx + r_out, cy), (cx + r_in * 0.5, cy - r_in * 0.5),
        (cx, cy - r_out), (cx - r_in * 0.5, cy - r_in * 0.5),
        (cx - r_out, cy), (cx - r_in * 0.5, cy + r_in * 0.5),
    ]


fig = plt.figure(figsize=(12, 6.3), dpi=100)
ax = fig.add_axes([0, 0, 1, 1])
ax.set_xlim(0, 1)
ax.set_ylim(0, 1)
ax.axis("off")

# --- Background: vertical bg-0 -> bg-2 gradient + a soft violet glow top-right ---
H, W = 315, 600  # half-res; imshow upsamples smoothly
yy, xx = np.mgrid[0:H, 0:W]
t = (yy / H)[..., None]
base = hex2rgb(BG0) * (1 - t) + hex2rgb(BG2) * t
cx, cy = 0.82 * W, 0.14 * H
r = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
glow = (np.clip(1 - r / (0.62 * W), 0, 1) ** 2)[..., None]
img = np.clip(base * (1 - 0.28 * glow) + hex2rgb(VIOLET) * (0.28 * glow), 0, 1)
ax.imshow(img, extent=[0, 1, 0, 1], aspect="auto", origin="upper", zorder=0)

# --- Decorative brand star inside the glow (echoes the favicon) ---
ax.add_patch(plt.Polygon(star_points(0.86, 0.78, 0.11, 0.042),
                         closed=True, facecolor=VIOLET_BRIGHT, alpha=0.9,
                         edgecolor="none", zorder=1))
ax.add_patch(plt.Polygon(star_points(0.7, 0.9, 0.03, 0.011),
                         closed=True, facecolor=CYAN, alpha=0.7,
                         edgecolor="none", zorder=1))

# --- Text block (left-aligned) ---
ax.text(0.06, 0.60, "Joshua S. Speagle", fontsize=64, color=TEXT,
        fontproperties=serif_bold, fontweight="bold",
        ha="left", va="center", zorder=4)
ax.text(0.063, 0.44, "Astronomy · Statistics · AI", fontsize=31, color=VIOLET_BRIGHT,
        fontproperties=sans_semi, ha="left", va="center", zorder=4)
ax.text(0.063, 0.33, "Assistant Professor of Astrostatistics · University of Toronto",
        fontsize=22, color=TEXT2, fontproperties=sans_reg,
        ha="left", va="center", zorder=4)

# --- Gradient accent bar along the bottom (violet -> cyan, the --grad signature) ---
ax_bar = fig.add_axes([0, 0, 1, 0.022])
ax_bar.axis("off")
cmap = LinearSegmentedColormap.from_list("vc", [VIOLET_BRIGHT, CYAN])
ax_bar.imshow(np.linspace(0, 1, 256).reshape(1, -1), aspect="auto", cmap=cmap)

fig.savefig(OUT, dpi=100, facecolor=BG0)
print(f"Wrote {OUT}")
