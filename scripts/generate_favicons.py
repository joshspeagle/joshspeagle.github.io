#!/usr/bin/env python3
"""Generate the site favicon set + web manifest from the Design G brand mark.

The mark is the sprite's #mark (see pages_shared.SPRITE): a copper-style trace that
steps up out of a via, branches once, and ends in a four-point star — drawn here in
the amber energy colour on the dark substrate. The 16px cut reduces to the part that
still reads at that size: the hub, the last leg of the trace, and the star.

Writes to the REPO ROOT (so the files are served at /favicon.svg etc.):
    favicon.svg, favicon-16x16.png, favicon-32x32.png,
    apple-touch-icon.png (180x180), site.webmanifest

Deterministic: same inputs, byte-identical outputs. Requires Pillow.
Run from anywhere:  python scripts/generate_favicons.py
"""
import os

from PIL import Image, ImageDraw

# Brand colors — kept in sync with the design tokens (assets/data/tokens.json ->
# assets/css/tokens.css). Re-tune here on rebrand.
BG = (6, 8, 15, 255)            # --bg-0 dark   #06080f
ENERGY = (242, 177, 58, 255)    # --energy dark #f2b13a
BG_HEX, ENERGY_HEX = "#06080f", "#f2b13a"

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# --- The mark, in the sprite's 32x32 coordinate space -----------------------
TRACE = [(5, 26), (11, 20), (19, 20), (25, 14), (25, 7.5)]   # main trace
BRANCH = [(19, 20), (23, 24)]                                # the one stub
VIAS = [(5, 26, 2.1), (11, 20, 2.1), (23, 24, 2.1)]          # hollow junctions
HUB = (19, 20, 2.4)                                          # the filled hub
STROKE, VIA_STROKE = 1.5, 1.4
# star4 (viewBox 0 0 8 8) placed at translate(21.3, 3.3) scale(0.92)
_STAR = [(4, 0), (4.9, 3.1), (8, 4), (4.9, 4.9), (4, 8), (3.1, 4.9), (0, 4), (3.1, 3.1)]
STAR = [(21.3 + 0.92 * x, 3.3 + 0.92 * y) for x, y in _STAR]

FULL_BOX = (1.0, -1.0, 31.0, 31.0)     # the whole mark, with a little air

# The 16px cut: everything but the hub, the last leg and the star falls apart at that
# size, so the small icon draws that trio on its own, enlarged, in the same space.
SMALL_HUB = (8.5, 23.5, 3.4)
SMALL_TRACE = [(8.5, 23.5), (18.5, 13.5)]
SMALL_STROKE = 2.8
SMALL_STAR = [(22.0 + 1.95 * (x - 4), 10.0 + 1.95 * (y - 4)) for x, y in _STAR]


def render_png(size, path, supersample=8, small=False):
    """Render one PNG: a rounded dark square with the amber mark on it."""
    s = size * supersample
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.22), fill=BG)

    x0, y0, x1, _y1 = FULL_BOX
    k = s / (x1 - x0)
    T = lambda p: ((p[0] - x0) * k, (p[1] - y0) * k)          # noqa: E731
    dot = lambda p, r: draw.ellipse([T(p)[0] - r, T(p)[1] - r,               # noqa: E731
                                     T(p)[0] + r, T(p)[1] + r], fill=ENERGY)

    def polyline(points, width):
        """A stroked polyline with round caps and joins (Pillow has no line caps)."""
        w = width * k
        draw.line([T(p) for p in points], fill=ENERGY, width=max(1, round(w)), joint="curve")
        for p in points:
            dot(p, w / 2)

    def ring(cx, cy, r, width):
        """A hollow via. Pillow strokes an ellipse INSIDE its box, so the box is grown
        by half the stroke to put the stroke on the radius, as SVG does."""
        w, px, py, rr = width * k, *T((cx, cy)), r * k
        draw.ellipse([px - rr - w / 2, py - rr - w / 2, px + rr + w / 2, py + rr + w / 2],
                     outline=ENERGY, width=max(1, round(w)))

    if small:
        polyline(SMALL_TRACE, SMALL_STROKE)
        dot(SMALL_HUB[:2], SMALL_HUB[2] * k)
        draw.polygon([T(p) for p in SMALL_STAR], fill=ENERGY)
        img.resize((size, size), Image.LANCZOS).save(path, "PNG")
        print(f"wrote {path} ({size}x{size})")
        return

    polyline(TRACE, STROKE)
    polyline(BRANCH, STROKE)
    for cx, cy, r in VIAS:
        ring(cx, cy, r, VIA_STROKE)
    dot((HUB[0], HUB[1]), HUB[2] * k)
    draw.polygon([T(p) for p in STAR], fill=ENERGY)

    img.resize((size, size), Image.LANCZOS).save(path, "PNG")
    print(f"wrote {path} ({size}x{size})")


def _svg_path(points):
    return "M" + " L".join(f"{x} {y}" for x, y in points)


SVG = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="64" height="64">
  <rect width="32" height="32" rx="7" ry="7" fill="{BG_HEX}"/>
  <g fill="none" stroke="{ENERGY_HEX}" stroke-width="{STROKE}" stroke-linecap="round" stroke-linejoin="round">
    <path d="{_svg_path(TRACE)}"/>
    <path d="{_svg_path(BRANCH)}"/>
  </g>
  <g fill="none" stroke="{ENERGY_HEX}" stroke-width="{VIA_STROKE}">
""" + "".join(f'    <circle cx="{cx}" cy="{cy}" r="{r}"/>\n' for cx, cy, r in VIAS) + f"""  </g>
  <circle cx="{HUB[0]}" cy="{HUB[1]}" r="{HUB[2]}" fill="{ENERGY_HEX}"/>
  <path d="{_svg_path(STAR)} Z" fill="{ENERGY_HEX}"/>
</svg>
"""

MANIFEST = """{
  "name": "Joshua S. Speagle",
  "short_name": "J. Speagle",
  "icons": [
    { "src": "/favicon-16x16.png", "sizes": "16x16", "type": "image/png" },
    { "src": "/favicon-32x32.png", "sizes": "32x32", "type": "image/png" },
    { "src": "/apple-touch-icon.png", "sizes": "180x180", "type": "image/png" }
  ],
  "theme_color": "#06080f",
  "background_color": "#06080f",
  "display": "browser"
}
"""


def main():
    with open(os.path.join(ROOT, "favicon.svg"), "w", encoding="utf-8") as f:
        f.write(SVG)
    print(f"wrote {os.path.join(ROOT, 'favicon.svg')}")
    render_png(16, os.path.join(ROOT, "favicon-16x16.png"), small=True)
    render_png(32, os.path.join(ROOT, "favicon-32x32.png"))
    render_png(180, os.path.join(ROOT, "apple-touch-icon.png"))
    with open(os.path.join(ROOT, "site.webmanifest"), "w", encoding="utf-8") as f:
        f.write(MANIFEST)
    print(f"wrote {os.path.join(ROOT, 'site.webmanifest')}")


if __name__ == "__main__":
    main()
