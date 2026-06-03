"""Generate assets/css/tokens.css from assets/data/tokens.json (single source of truth).
Emits :root (dark defaults + base tokens) and [data-theme="light"] overrides.
Re-runnable; idempotent. Run: python scripts/build_tokens.py
"""
import os, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "data", "tokens.json")
OUT = os.path.join(ROOT, "assets", "css", "tokens.css")

def main():
    data = json.load(open(SRC, encoding="utf-8"))
    tv = data["themeVarying"]
    base = data["base"]

    out = ["/* Design tokens — generated from assets/data/tokens.json by scripts/build_tokens.py. Do NOT hand-edit. */", ""]
    out.append(":root {")
    out.append("  /* base (theme-independent) */")
    for k, v in base.items():
        if k.startswith("_"):
            continue
        out.append(f"  --{k}: {v};")
    out.append("  /* color — dark (default) */")
    for k, v in tv.items():
        out.append(f"  --{k}: {v['dark']};")
    out.append("}")
    out.append("")
    out.append('[data-theme="light"] {')
    for k, v in tv.items():
        out.append(f"  --{k}: {v['light']};")
    out.append("}")
    out.append("")

    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(out))
    print(f"Wrote {OUT} ({len(tv)} themed + {len([k for k in base if not k.startswith('_')])} base tokens)")

if __name__ == "__main__":
    main()
