"""Vendor self-hosted webfonts from node_modules/@fontsource into assets/fonts/
and generate assets/css/fonts.css (@font-face rules). Re-runnable; idempotent.

Run: npm install  (once, to populate node_modules)  ->  python scripts/setup_fonts.py
"""
import os, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NM = os.path.join(ROOT, "node_modules", "@fontsource")
FONTS_DIR = os.path.join(ROOT, "assets", "fonts")
CSS_OUT = os.path.join(ROOT, "assets", "css", "fonts.css")

# package -> (css family name, [(weight, style), ...])
SPEC = {
    "inter":          ("Inter",          [(300, "normal"), (400, "normal"), (500, "normal"), (600, "normal"), (700, "normal"), (400, "italic")]),
    "source-serif-4": ("Source Serif 4", [(400, "normal"), (600, "normal"), (700, "normal"), (400, "italic")]),
    "jetbrains-mono": ("JetBrains Mono",  [(400, "normal"), (500, "normal"), (700, "normal")]),
}

def main():
    if not os.path.isdir(NM):
        raise SystemExit("node_modules/@fontsource not found — run `npm install` first.")
    os.makedirs(FONTS_DIR, exist_ok=True)
    faces = []
    for pkg, (family, weights) in SPEC.items():
        files_dir = os.path.join(NM, pkg, "files")
        for weight, style in weights:
            suffix = "italic" if style == "italic" else "normal"
            src = os.path.join(files_dir, f"{pkg}-latin-{weight}-{suffix}.woff2")
            if not os.path.exists(src):
                print(f"  MISSING: {src}")
                continue
            dst_name = f"{pkg}-{weight}-{suffix}.woff2"
            shutil.copyfile(src, os.path.join(FONTS_DIR, dst_name))
            faces.append((family, weight, style, dst_name))

    lines = [
        "/* Self-hosted fonts — vendored from @fontsource by scripts/setup_fonts.py. Do NOT hand-edit. */",
        "/* CJK glyphs (e.g. 沈佳士) intentionally fall back to the system CJK font. */",
        "",
    ]
    for family, weight, style, fn in faces:
        lines += [
            "@font-face {",
            f"  font-family: '{family}';",
            f"  font-style: {style};",
            f"  font-weight: {weight};",
            "  font-display: swap;",
            f"  src: url('../fonts/{fn}') format('woff2');",
            "}",
        ]
    with open(CSS_OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"Vendored {len(faces)} font files -> {FONTS_DIR}")
    print(f"Wrote {CSS_OUT}")

if __name__ == "__main__":
    main()
