#!/usr/bin/env python3
"""Regenerate assets/data/publications.bib from publications_data.json.

Usage:
    cd scripts && python export_bib.py [--check]

`publications.bib` used to be a hand-kept ADS export that drifted out of sync
with the site's own publication list (audit C12). It is now derived: run this
after `postprocessing.py` and commit the result alongside `publications_data.json`.

    --check   exit non-zero if the committed .bib differs from what this would
              write, without touching the file (for a build/CI gate).

Entry keys are the ADS bibcode where there is one, else `arXiv:<id>`, else a
`<surname><year>` slug; keys are unique by construction. Output is deterministic
(publications in the order they appear in the JSON, fields in a fixed order), so
re-running with unchanged data produces a byte-identical file.

Stdlib only, matching the other build scripts.
"""
import argparse
import json
import re
import sys
import unicodedata

from config import get_data_path

# LaTeX escapes for the characters that would otherwise change the meaning of a
# .bib file. Backslash first, so the replacements it introduces are not re-escaped.
_LATEX_ESCAPES = (
    ("\\", r"\textbackslash{}"),
    ("&", r"\&"),
    ("%", r"\%"),
    ("$", r"\$"),
    ("#", r"\#"),
    ("_", r"\_"),
    ("{", r"\{"),
    ("}", r"\}"),
    ("~", r"\textasciitilde{}"),
    ("^", r"\textasciicircum{}"),
)

# Unicode the pipeline's own normalisation introduces, mapped back to LaTeX so
# the .bib compiles under a plain (non-unicode) engine.
_UNICODE_TO_LATEX = {
    "–": "--", "—": "---",
    "‘": "`", "’": "'", "“": "``", "”": "''",
    "…": r"\ldots{}", "−": "-",
    "±": r"$\pm$", "×": r"$\times$", "·": r"$\cdot$",
    "∼": r"$\sim$", "≃": r"$\simeq$", "≈": r"$\approx$",
    "∝": r"$\propto$", "≡": r"$\equiv$", "≠": r"$\neq$",
    "≤": r"$\leq$", "≥": r"$\geq$", "≪": r"$\ll$", "≫": r"$\gg$",
    "≲": r"$\lesssim$", "≳": r"$\gtrsim$",
    "⊙": r"$\odot$", "⊕": r"$\oplus$", "⋆": r"$\star$",
    "∗": r"$\ast$", "′": r"$\prime$", "°": r"$\deg$",
    "∞": r"$\infty$", "→": r"$\rightarrow$", "←": r"$\leftarrow$",
    "⟨": r"$\langle$", "⟩": r"$\rangle$",
    "∂": r"$\partial$", "∇": r"$\nabla$", "√": r"$\sqrt{}$",
}
_GREEK_LATEX = {
    "α": "alpha", "β": "beta", "γ": "gamma", "δ": "delta", "ε": "epsilon",
    "ζ": "zeta", "η": "eta", "θ": "theta", "ι": "iota", "κ": "kappa",
    "λ": "lambda", "μ": "mu", "ν": "nu", "ξ": "xi", "π": "pi", "ρ": "rho",
    "σ": "sigma", "ς": "varsigma", "τ": "tau", "υ": "upsilon", "φ": "phi",
    "χ": "chi", "ψ": "psi", "ω": "omega",
    "Γ": "Gamma", "Δ": "Delta", "Θ": "Theta", "Λ": "Lambda", "Ξ": "Xi",
    "Π": "Pi", "Σ": "Sigma", "Υ": "Upsilon", "Φ": "Phi", "Ψ": "Psi", "Ω": "Omega",
}
for _char, _name in _GREEK_LATEX.items():
    _UNICODE_TO_LATEX[_char] = "$\\%s$" % _name

# Accented Latin letters, decomposed into a LaTeX accent command.
_ACCENTS = {
    "̀": "`", "́": "'", "̂": "^", "̃": "~",
    "̈": '"', "̧": "c", "̊": "r", "̄": "=",
    "̆": "u", "̇": ".", "̌": "v", "̋": "H",
}
_SPECIAL_LETTERS = {
    "ø": r"\o{}", "Ø": r"\O{}", "å": r"\aa{}", "Å": r"\AA{}",
    "æ": r"\ae{}", "Æ": r"\AE{}", "ß": r"\ss{}", "ł": r"\l{}", "Ł": r"\L{}",
    "đ": r"\dj{}", "Đ": r"\DJ{}", "þ": r"\th{}", "ð": r"\dh{}",
}

_HTML_TAG = re.compile(r"<[^>]+>")
_HTML_ENTITIES = {
    "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'",
    "&nbsp;": " ", "&ndash;": "–", "&mdash;": "—",
}


def latex_escape(text):
    """Turn a display string from publications_data.json into safe LaTeX.

    Handles, in order: ADS `<SUB>`/`<SUP>` markup, HTML entities, LaTeX special
    characters, the Unicode symbols the pipeline's normalisation produces, and
    accented letters.
    """
    if not text:
        return ""
    s = str(text)
    # ADS sub/superscript markup carries meaning; keep it as math.
    s = re.sub(r"<SUB>(.*?)</SUB>", r"$_{\1}$", s, flags=re.IGNORECASE | re.DOTALL)
    s = re.sub(r"<SUP>(.*?)</SUP>", r"$^{\1}$", s, flags=re.IGNORECASE | re.DOTALL)
    s = _HTML_TAG.sub("", s)
    for entity, char in _HTML_ENTITIES.items():
        s = s.replace(entity, char)
    for char, repl in _LATEX_ESCAPES:
        s = s.replace(char, repl)
    for char, repl in _UNICODE_TO_LATEX.items():
        s = s.replace(char, repl)
    for char, repl in _SPECIAL_LETTERS.items():
        s = s.replace(char, repl)
    # Accented letters: decompose and rebuild as `\'{e}` etc.
    out = []
    for char in unicodedata.normalize("NFD", s):
        if unicodedata.combining(char):
            accent = _ACCENTS.get(char)
            if accent and out:
                out[-1] = "{\\%s{%s}}" % (accent, out[-1])
            continue
        out.append(char)
    s = "".join(out)
    # Anything still outside ASCII would break a plain engine; drop it rather
    # than emit a byte the .bib can't represent.
    return "".join(c for c in s if ord(c) < 128)


def format_authors(authors):
    """Join an author list into a BibTeX `and`-separated string.

    Names arrive either as "Surname, Given" (ADS) or "Given Surname" (Scholar);
    both are braced surname-first so BibTeX's own name parser cannot mis-split a
    particle ("van Dokkum") or a collaboration name ("Euclid Collaboration").
    """
    parts = []
    for name in authors or []:
        name = latex_escape((name or "").strip())
        if not name:
            continue
        if "," in name:
            surname, given = name.split(",", 1)
        else:
            tokens = name.split()
            surname, given = (tokens[-1], " ".join(tokens[:-1])) if len(tokens) > 1 else (name, "")
        surname, given = surname.strip(), given.strip()
        parts.append("{%s}, %s" % (surname, given) if given else "{%s}" % surname)
    return " and ".join(parts)


def entry_key(pub, used):
    """A stable, unique citation key: bibcode, else arXiv id, else surname+year."""
    key = (pub.get("bibcode") or pub.get("id") or "").strip()
    if not key and pub.get("arxivId"):
        key = "arXiv:%s" % str(pub["arxivId"]).strip()
    if not key:
        authors = pub.get("authors") or []
        first = (authors[0] if authors else "anon")
        surname = first.split(",")[0] if "," in first else first.split()[-1]
        surname = re.sub(r"[^A-Za-z]", "", latex_escape(surname)) or "anon"
        key = "%s%s" % (surname.lower(), pub.get("year") or "")
    candidate, n = key, 1
    while candidate in used:
        n += 1
        candidate = "%s-%d" % (key, n)
    used.add(candidate)
    return candidate


def format_entry(pub, used):
    """Render one publication as a single `@article{...}` entry."""
    fields = []

    def add(name, value, braced=True):
        if value in (None, "", []):
            return
        fields.append((name, "{%s}" % value if braced else str(value)))

    add("author", format_authors(pub.get("authors")))
    add("title", "{%s}" % latex_escape(pub.get("title")))
    add("journal", latex_escape(pub.get("journal")))
    if pub.get("year"):
        add("year", pub["year"], braced=False)
    add("doi", pub.get("doi"))
    if pub.get("arxivId"):
        add("eprint", pub["arxivId"])
        add("archivePrefix", "arXiv")
    add("adsurl", pub.get("adsUrl"))
    add("bibcode", pub.get("bibcode") or pub.get("id"))
    keywords = pub.get("keywords") or []
    add("keywords", latex_escape(", ".join(str(k) for k in keywords)) if keywords else "")

    width = max((len(name) for name, _ in fields), default=0)
    body = ",\n".join(
        "  %s = %s" % (name.rjust(width), value) for name, value in fields
    )
    return "@article{%s,\n%s\n}\n" % (entry_key(pub, used), body)


def build_bibtex(data):
    """Render the whole publication list as a .bib document."""
    pubs = data.get("publications", [])
    header = (
        "%% BibTeX export of the publication list on joshspeagle.com.\n"
        "%% GENERATED FILE -- do not edit by hand.\n"
        "%% Regenerate with: cd scripts && python export_bib.py\n"
        "%% Source: assets/data/publications_data.json (%d entries, data as of %s)\n"
        % (len(pubs), (data.get("lastUpdated") or "unknown")[:10])
    )
    used = set()
    return header + "\n" + "\n".join(format_entry(p, used) for p in pubs)


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--check", action="store_true",
                    help="exit non-zero if publications.bib is out of date")
    args = ap.parse_args()

    with open(get_data_path(), encoding="utf-8") as f:
        data = json.load(f)
    text = build_bibtex(data)
    out_path = get_data_path("publications.bib")

    if args.check:
        try:
            current = out_path.read_text(encoding="utf-8")
        except OSError:
            current = None
        if current != text:
            sys.exit(f"{out_path} is out of date — run: python export_bib.py")
        print(f"{out_path} is up to date ({len(data.get('publications', []))} entries).")
        return

    out_path.write_text(text, encoding="utf-8")
    print(f"Wrote {out_path} ({len(data.get('publications', []))} entries).")


if __name__ == "__main__":
    main()
