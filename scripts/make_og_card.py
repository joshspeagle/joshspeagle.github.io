"""Generate the 1200x630 OpenGraph/Twitter social card (assets/images/og-card.png).

Design G — "chips on the board": the navy substrate with its copper solder-pad grid,
a few copper traces routed in from the left gutter (vias, a pin, the ground symbol),
the brand mark in amber, and the name/tagline lockup. Deterministic: no randomness,
no clock, so re-running it is byte-identical.

Run once (or after rebranding):  python scripts/make_og_card.py
Requires Pillow; fontTools (+ brotli) to use the vendored brand woff2 files — without
it the card falls back to a system font and says so.
"""
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "images" / "og-card.png"
FONTS = ROOT / "assets" / "fonts"

# Brand colors (mirror assets/css/tokens.css, dark theme)
BG0 = (6, 8, 15)            # --bg-0
BG2 = (10, 18, 40)          # --bg-2
COPPER = (184, 128, 94)     # --copper-rgb
ENERGY = (242, 177, 58)     # --energy
TEXT = (238, 241, 251)      # --text
TEXT2 = (174, 182, 214)     # --text-2
TEXT3 = (138, 151, 194)     # --text-3

W, H = 1200, 630
SS = 2                      # supersample factor


def brand_font(woff2_name, size):
    """Load a vendored woff2 at `size` px (via an uncompressed temp copy).

    Returns None on any failure so callers fall back to Pillow's default font.
    """
    try:
        from fontTools.ttLib import TTFont
        src = FONTS / woff2_name
        f = TTFont(src)
        f.flavor = None            # strip woff2 compression -> plain sfnt
        tmp = Path(tempfile.gettempdir()) / (woff2_name.rsplit(".", 1)[0] + ".ttf")
        f.save(tmp)
        return ImageFont.truetype(str(tmp), size)
    except Exception as e:                       # pragma: no cover - cosmetic fallback
        print(f"  (font {woff2_name} unavailable: {e}; using the default font)")
        try:
            return ImageFont.load_default(size=size)      # Pillow >= 10.1 takes a size
        except TypeError:                                 # older Pillow: no-arg only
            return ImageFont.load_default()


def main():
    img = Image.new("RGB", (W * SS, H * SS), BG0)
    d = ImageDraw.Draw(img, "RGBA")
    s = SS

    # --- substrate: bg-0 -> bg-2 vertical wash + the copper solder-pad grid ---
    for y in range(H):
        t = y / (H - 1)
        row = tuple(round(a + (b - a) * t) for a, b in zip(BG0, BG2))
        d.rectangle([0, y * s, W * s, (y + 1) * s], fill=row)
    for gy in range(16, H, 32):
        for gx in range(16, W, 32):
            r = 1.1 * s
            d.ellipse([gx * s - r, gy * s - r, gx * s + r, gy * s + r], fill=COPPER + (36,))

    def trace(points, width=1.5, alpha=110):
        pts = [(x * s, y * s) for x, y in points]
        d.line(pts, fill=COPPER + (alpha,), width=max(1, round(width * s)), joint="curve")

    def via(cx, cy, r=5.0, width=2.2, alpha=190):
        w = width * s
        d.ellipse([cx * s - r * s - w / 2, cy * s - r * s - w / 2,
                   cx * s + r * s + w / 2, cy * s + r * s + w / 2],
                  outline=COPPER + (alpha,), width=max(1, round(w)))

    def pin(cx, cy, lit=False):
        col = ENERGY + (255,) if lit else COPPER + (215,)
        d.rectangle([(cx - 5) * s, (cy - 3) * s, (cx + 5) * s, (cy + 3) * s], fill=col)

    # --- the board: a trunk in the left gutter with three branches ---
    TX = 74
    trace([(TX, 84), (TX, 548)], width=1.7, alpha=140)                 # trunk
    trace([(TX, 224), (TX + 18, 242), (240, 242)])                     # -> the name
    via(TX, 224); pin(246, 242)
    trace([(TX, 344), (TX + 18, 362), (196, 362)])                     # -> the tagline
    via(TX, 344); pin(202, 362, lit=True)
    trace([(TX, 432), (TX + 18, 450), (172, 450)])                     # -> the affiliation
    via(TX, 432); pin(178, 450)
    # ground symbol terminating the trunk
    for i, (half, y) in enumerate(((17, 548), (11, 557), (5, 566))):
        d.line([(TX - half) * s, y * s, (TX + half) * s, y * s],
               fill=COPPER + (190,), width=max(1, round(1.7 * s)))
    # a second, quieter trace along the top right
    trace([(1200, 108), (1010, 108), (992, 126), (992, 210)], width=1.2, alpha=70)
    via(992, 210, r=4.0, width=1.8, alpha=110)

    # --- the brand mark, amber (the sprite's #mark, scaled into the card) ---
    MK, MX, MY = 3.05, 152, 96          # scale + origin in the mark's 32x32 space
    M = lambda p: ((MX + p[0] * MK) * s, (MY + p[1] * MK) * s)        # noqa: E731

    def mark_line(points, width):
        w = width * MK * s
        d.line([M(p) for p in points], fill=ENERGY, width=max(1, round(w)), joint="curve")
        for p in points:                                    # round caps
            x, y = M(p)
            d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=ENERGY)

    mark_line([(5, 26), (11, 20), (19, 20), (25, 14), (25, 7.5)], 1.5)
    mark_line([(19, 20), (23, 24)], 1.5)
    for cx, cy in ((5, 26), (11, 20), (23, 24)):
        w, (px, py), rr = 1.4 * MK * s, M((cx, cy)), 2.1 * MK * s
        d.ellipse([px - rr - w / 2, py - rr - w / 2, px + rr + w / 2, py + rr + w / 2],
                  outline=ENERGY, width=max(1, round(w)))
    hx, hy, hr = *M((19, 20)), 2.4 * MK * s
    d.ellipse([hx - hr, hy - hr, hx + hr, hy + hr], fill=ENERGY)
    star = [(4, 0), (4.9, 3.1), (8, 4), (4.9, 4.9), (4, 8), (3.1, 4.9), (0, 4), (3.1, 3.1)]
    d.polygon([M((21.3 + 0.92 * x, 3.3 + 0.92 * y)) for x, y in star], fill=ENERGY)

    # --- the lockup ---
    serif = brand_font("source-serif-4-700-normal.woff2", 72 * s)
    sans_semi = brand_font("inter-600-normal.woff2", 33 * s)
    sans_reg = brand_font("inter-400-normal.woff2", 23 * s)
    mono = brand_font("jetbrains-mono-400-normal.woff2", 15 * s)

    d.text((262 * s, 242 * s), "Joshua S. Speagle", font=serif, fill=TEXT, anchor="lm")
    d.text((218 * s, 362 * s), "Astronomy · Statistics · AI", font=sans_semi, fill=ENERGY, anchor="lm")
    d.text((194 * s, 450 * s), "Assistant Professor of Astrostatistics",
           font=sans_reg, fill=TEXT2, anchor="lm")
    d.text((194 * s, 486 * s), "University of Toronto", font=sans_reg, fill=TEXT3, anchor="lm")
    d.text((194 * s, 552 * s), "J O S H S P E A G L E . C O M", font=mono, fill=TEXT3, anchor="lm")

    # --- amber energy rail along the bottom edge ---
    d.rectangle([0, (H - 6) * s, W * s, H * s], fill=ENERGY)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.resize((W, H), Image.LANCZOS).save(OUT, "PNG")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
