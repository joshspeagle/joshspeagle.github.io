#!/usr/bin/env python3
"""Generate the site favicon set (violet four-point star on dark bg) + web manifest.

Writes to the REPO ROOT (so the files are served at /favicon.svg etc.):
    favicon.svg, favicon-16x16.png, favicon-32x32.png,
    apple-touch-icon.png (180x180), site.webmanifest

Run from anywhere:  python scripts/generate_favicons.py
"""
import os

from PIL import Image, ImageDraw

# Brand colors (hardcoded; predate the June 2026 redesign — current design tokens
# live in assets/data/tokens.json -> assets/css/tokens.css. Re-tune here on rebrand.)
BG = (13, 20, 33, 255)        # #0d1421 dark background
STAR = (167, 139, 250, 255)   # violet accent (#a78bfa)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def star_points(cx, cy, r_out, r_in):
    """Four-point sparkle star (✦): 8 vertices alternating outer/inner."""
    # Outer points at N/E/S/W; inner waist points on the diagonals.
    return [
        (cx, cy - r_out),                  # top
        (cx + r_in * 0.5, cy - r_in * 0.5),
        (cx + r_out, cy),                  # right
        (cx + r_in * 0.5, cy + r_in * 0.5),
        (cx, cy + r_out),                  # bottom
        (cx - r_in * 0.5, cy + r_in * 0.5),
        (cx - r_out, cy),                  # left
        (cx - r_in * 0.5, cy - r_in * 0.5),
    ]


def render_png(size, path, supersample=8):
    """Render a single PNG at `size` px with rounded-square dark bg + violet star."""
    s = size * supersample
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    radius = int(s * 0.22)
    draw.rounded_rectangle([0, 0, s - 1, s - 1], radius=radius, fill=BG)
    cx = cy = s / 2
    r_out = s * 0.40
    r_in = s * 0.16
    draw.polygon(star_points(cx, cy, r_out, r_in), fill=STAR)
    img = img.resize((size, size), Image.LANCZOS)
    img.save(path, "PNG")
    print(f"wrote {path} ({size}x{size})")


SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect x="0" y="0" width="64" height="64" rx="14" ry="14" fill="#0d1421"/>
  <path d="M32 6 L37.1 26.9 L58 32 L37.1 37.1 L32 58 L26.9 37.1 L6 32 L26.9 26.9 Z" fill="#a78bfa"/>
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
  "theme_color": "#0d1421",
  "background_color": "#0d1421",
  "display": "browser"
}
"""


def main():
    with open(os.path.join(ROOT, "favicon.svg"), "w", encoding="utf-8") as f:
        f.write(SVG)
    print(f"wrote {os.path.join(ROOT, 'favicon.svg')}")
    render_png(16, os.path.join(ROOT, "favicon-16x16.png"))
    render_png(32, os.path.join(ROOT, "favicon-32x32.png"))
    render_png(180, os.path.join(ROOT, "apple-touch-icon.png"))
    with open(os.path.join(ROOT, "site.webmanifest"), "w", encoding="utf-8") as f:
        f.write(MANIFEST)
    print(f"wrote {os.path.join(ROOT, 'site.webmanifest')}")


if __name__ == "__main__":
    main()
