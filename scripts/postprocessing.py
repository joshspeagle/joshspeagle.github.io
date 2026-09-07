#!/usr/bin/env python3
"""
Consolidated post-processing for publications data.

Runs all post-processing steps with a single load/save cycle:
  1. Flag featured publications
  2a. Normalise titles/abstracts (strip publisher + LaTeX artifacts)
  2b. Backfill missing venues from the bibcode journal code
  2c. De-duplicate by DOI / bibcode / arXiv id
  2d. Ensure categorization (sync LLM probabilities, derive researchArea)
  3. Fix citations timeline (Google Scholar metrics)
  4. Update ADS library cache
  5. Apply authorship categories, then reconcile them against the RIQ corpora
  6. Fetch ADS bibliometric time series

Steps 2a/2b/2c are pure functions on the data (`normalize_text`,
`deduplicate_publications`, `argmax_research_area`) and are importable without
the pipeline's third-party dependencies.
"""

import argparse
import json
import logging
import os
import re
import shutil
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from config import get_project_root, get_data_path, get_backup_dir

# `requests` and `python-dotenv` are only needed by the network-facing steps
# (ADS library cache / ADS metrics / Scholar timeline). They are imported lazily
# inside those methods so that the pure helpers in this module — text
# normalisation, de-duplication, argmax categorisation — can be imported by the
# stdlib-only build scripts without the pipeline's third-party dependencies.

# Set up logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Suppress verbose external library logging
logging.getLogger("scholarly").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)

# ---------------------------------------------------------------------------
# ADS Library configurations
# ---------------------------------------------------------------------------
ADS_LIBRARIES = {
    "primary": "Jy98AvjOQXqykOSJ-bn96Q",
    "significant": "X5RfsxxzRXC-BWjU11xa4A",
    "student": "yyWDBaVwS0GIrIkz2GKltg",
    "postdoc": "6-JKiyOATdqEzuDGuUMWwg",
}
ADS_ALL_LIBRARY = "YiaebBefTHKZdblrny2Vsw"

# ADS Metrics API endpoint
ADS_METRICS_ENDPOINT = "https://api.adsabs.harvard.edu/v1/metrics"

# Featured publications (partial title matching)
FEATURED_PAPERS = [
    {
        "title_pattern": "Trustworthy scientific inference",
        "description": "Carzon et al.",
    },
    {
        "title_pattern": "A Deep, High-angular-resolution 3D Dust Map",
        "description": "Zucker, Saydjari and Speagle et al.",
    },
    {
        "title_pattern": "ChronoFlow: A Data-driven Model for Gyrochronology",
        "description": "Van-Lane et al.",
    },
]


# ---------------------------------------------------------------------------
# Research areas
# ---------------------------------------------------------------------------
# Canonical order. `researchArea` is *derived*, never hand-set: it is always the
# argmax of `categoryProbabilities`, so the accent stripe / filter bucket a paper
# renders under can never contradict the badges it renders (see D5 in the audit).
RESEARCH_AREAS = [
    "Statistical Learning & AI",
    "Interpretability & Insight",
    "Inference & Computation",
    "Discovery & Understanding",
]


def argmax_research_area(
    probabilities: Optional[Dict[str, float]], fallback: Optional[str] = None
) -> Optional[str]:
    """Return the highest-probability research area.

    Ties break toward the earlier entry in ``RESEARCH_AREAS`` so the result is
    deterministic across runs. Returns ``fallback`` when there is nothing to
    argmax over (no probabilities, or all of them zero/absent).
    """
    if not probabilities:
        return fallback
    scored = [
        (float(probabilities.get(area, 0.0) or 0.0), -i, area)
        for i, area in enumerate(RESEARCH_AREAS)
    ]
    best = max(scored)
    return best[2] if best[0] > 0 else fallback


# ---------------------------------------------------------------------------
# Title / abstract normalisation
# ---------------------------------------------------------------------------
# ADS and arXiv hand back titles and abstracts that still carry publisher and
# LaTeX artifacts: a leading "Abstract" label, `$…$` math, `\textit{}` wrappers,
# TeX quote pairs and backslash symbol commands. The site writes abstracts into
# the page as HTML, so we normalise once here rather than in the renderer.
#
# NOT touched: `<SUB>`/`<SUP>` markup (ADS's own, and rendered by the site) and
# HTML entities.

# `\cmd{…}` wrappers whose braces carry the visible text — unwrapped to the text.
_TEX_WRAPPERS = (
    "ensuremath", "textit", "textbf", "textrm", "texttt", "textsc", "textsf",
    "emph", "text", "mathrm", "mathit", "mathbf", "mathcal", "mathbb", "mathsf",
    "boldsymbol", "operatorname", "hat", "widehat", "tilde", "widetilde",
    "bar", "overline", "vec", "rm", "it", "bf", "tt", "sf",
)

# `\cmd` symbol commands, mapped to the Unicode character they stand for.
_TEX_SYMBOLS = {
    # lower-case Greek
    "alpha": "α", "beta": "β", "gamma": "γ", "delta": "δ", "epsilon": "ε",
    "varepsilon": "ε", "zeta": "ζ", "eta": "η", "theta": "θ", "vartheta": "ϑ",
    "iota": "ι", "kappa": "κ", "lambda": "λ", "mu": "μ", "nu": "ν", "xi": "ξ",
    "pi": "π", "rho": "ρ", "sigma": "σ", "varsigma": "ς", "tau": "τ",
    "upsilon": "υ", "phi": "φ", "varphi": "φ", "chi": "χ", "psi": "ψ",
    "omega": "ω",
    # upper-case Greek
    "Gamma": "Γ", "Delta": "Δ", "Theta": "Θ", "Lambda": "Λ", "Xi": "Ξ",
    "Pi": "Π", "Sigma": "Σ", "Upsilon": "Υ", "Phi": "Φ", "Psi": "Ψ",
    "Omega": "Ω",
    # relations and operators
    "sim": "∼", "simeq": "≃", "approx": "≈", "propto": "∝", "equiv": "≡",
    "times": "×", "pm": "±", "mp": "∓", "cdot": "·", "cdots": "⋯",
    "ll": "≪", "gg": "≫", "le": "≤", "leq": "≤", "ge": "≥", "geq": "≥",
    "lt": "<", "gt": ">", "ne": "≠", "neq": "≠",
    "lesssim": "≲", "gtrsim": "≳", "sqrt": "√", "partial": "∂", "nabla": "∇",
    "infty": "∞", "int": "∫", "sum": "∑", "prod": "∏",
    # arrows and decorations
    "rightarrow": "→", "Rightarrow": "⇒", "to": "→", "leftarrow": "←",
    "Leftarrow": "⇐", "langle": "⟨", "rangle": "⟩",
    # astronomy shorthands
    "odot": "⊙", "oplus": "⊕", "star": "⋆", "ast": "∗", "prime": "′",
    "deg": "°", "arcsec": "″", "arcmin": "′", "micron": "μm",
    # dots / spacing / grouping that carry no glyph
    "dots": "…", "ldots": "…", "quad": " ", "qquad": " ", "left": "", "right": "",
    "displaystyle": "", "nonumber": "", "limits": "", "nolimits": "",
    # bare font switches (`\\rm [Fe/H]`); the braced `{\\rm …}` form is unwrapped above
    "rm": "", "it": "", "bf": "", "tt": "", "sf": "", "textstyle": "",
    # word-shaped math operators keep their letters
    "log": "log", "ln": "ln", "exp": "exp", "sin": "sin", "cos": "cos",
    "tan": "tan", "max": "max", "min": "min",
}

# `\n` in this corpus is an escaped newline from the arXiv/ADS text dump, not a
# LaTeX command — the only real `\n…` commands that occur in astronomy prose are
# `\nu` and `\nabla`, guarded here explicitly.
_TEX_ESCAPED_NEWLINE = re.compile(r"\\n(?!u(?![A-Za-z])|abla\b)")
_TEX_LEADING_ABSTRACT = re.compile(r"^\s*Abstract\b[\s:.—–-]+")
_TEX_COMMAND = re.compile(r"\\([A-Za-z]+)")
# TeX spacing macros: `\,` `\;` `\:` and `\ ` are spaces, `\!` is negative space.
_TEX_SPACING = re.compile(r"\\[,;:]|\\ ")
_TEX_NEGSPACE = re.compile(r"\\!")
_TEX_MATH = re.compile(r"\$([^$]*)\$")
_TEX_ESCAPED_CHAR = re.compile(r"\\([%&_#{}$])")
_WRAPPER_RE = re.compile(
    r"\\(" + "|".join(_TEX_WRAPPERS) + r")\s*\{([^{}]*)\}"
)
# The `{\rm foo}` / `{\it foo}` form, where the switch lives inside the group.
_SWITCH_GROUP_RE = re.compile(
    r"\{\s*\\(" + "|".join(_TEX_WRAPPERS) + r")\s+([^{}]*)\}"
)


def _replace_tex_command(match: "re.Match") -> str:
    """Substitute one `\\cmd` symbol command; leave unmapped macros verbatim.

    Whitespace after the macro name is left in place — `\\sim 10^4` becomes
    `∼ 10^4`, not `∼10^4` — so that word-shaped operators (`\\log N`) and
    glyph-less font switches (`\\rm [Fe/H]`) can never run into the next token.
    An unmapped macro is returned untouched so it stays visible and can be added
    to `_TEX_SYMBOLS` rather than silently vanishing.
    """
    name = match.group(1)
    return _TEX_SYMBOLS.get(name, match.group(0))


def normalize_text(value: Optional[str]) -> Optional[str]:
    """Normalise a publication title or abstract for display.

    Idempotent: normalising already-normalised text is a no-op.

    Steps, in order: collapse doubled backslashes; turn escaped newlines into
    spaces; drop a leading "Abstract" label; unescape `\\%`-style characters;
    unwrap `\\textit{…}`-style wrappers; map `\\alpha`-style commands to Unicode;
    map TeX quote pairs to curly quotes; unwrap `$…$`; collapse whitespace.
    """
    if not isinstance(value, str) or not value:
        return value

    s = value
    # 1. Doubled backslashes are a JSON/BibTeX escaping artifact (`$\\approx$`).
    while "\\\\" in s:
        s = s.replace("\\\\", "\\")
    # 2. Escaped newlines from the source text dump, and TeX spacing macros.
    s = _TEX_ESCAPED_NEWLINE.sub(" ", s)
    s = _TEX_NEGSPACE.sub("", _TEX_SPACING.sub(" ", s))
    # 3. Publisher's "Abstract" run-in label.
    s = _TEX_LEADING_ABSTRACT.sub("", s)
    # 4. Protect escaped literals (`\%`, `\&`, `\_`, `\$`) from steps 5-8.
    s = _TEX_ESCAPED_CHAR.sub(lambda m: "\x00%d\x00" % ord(m.group(1)), s)
    # 5. Wrappers, innermost first (`\textit{\rm x}` needs two passes).
    for _ in range(4):
        new = _SWITCH_GROUP_RE.sub(r"\2", _WRAPPER_RE.sub(r"\2", s))
        if new == s:
            break
        s = new
    # 6. Symbol commands. Unknown commands are left verbatim rather than eaten,
    #    so an unmapped macro stays visible and can be added to _TEX_SYMBOLS.
    s = _TEX_COMMAND.sub(_replace_tex_command, s)
    # 7. TeX quote pairs. ADS writes arcseconds as `^''` — that is a double
    #    prime, not a close quote. Sources also routinely write `` and '' with no
    #    surrounding space ("models to``inverse problems''to infer"), so restore
    #    one, but never against an HTML tag (`<SUB>` and friends).
    s = s.replace("^''", "\u2033")
    s = s.replace("``", "\u201c").replace("''", "\u201d")
    s = re.sub(r"(?<=[^\s(\[{>])(\u201c)", r" \1", s)
    s = re.sub(r"(\u201d)(?=[^\s.,;:!?)\]}<])", r"\1 ", s)
    # 8. Inline math delimiters (content already de-TeX'd by step 6). Inside
    #    math, `~` is a non-breaking space rather than "approximately".
    for _ in range(4):
        new = _TEX_MATH.sub(lambda m: m.group(1).replace("~", " "), s)
        if new == s:
            break
        s = new
    # 9. Restore protected literals and tidy whitespace.
    s = re.sub(r"\x00(\d+)\x00", lambda m: chr(int(m.group(1))), s)
    s = re.sub(r"[ \t\r\n\f\v]+", " ", s).strip()
    return s


# ---------------------------------------------------------------------------
# Venue backfill
# ---------------------------------------------------------------------------
# Characters 5-9 of an ADS bibcode are the journal code. Google Scholar records
# arrive with an empty `venue`, so a Scholar-only paper used to render with no
# venue at all even when its bibcode named the journal (audit D14).
BIBCODE_JOURNALS = {
    "A&A..": "Astronomy and Astrophysics",
    "A&ARv": "The Astronomy and Astrophysics Review",
    "AJ...": "The Astronomical Journal",
    "ApJ..": "The Astrophysical Journal",
    "ApJL.": "The Astrophysical Journal Letters",
    "ApJS.": "The Astrophysical Journal Supplement Series",
    "ARA&A": "Annual Review of Astronomy and Astrophysics",
    "BAAS.": "Bulletin of the American Astronomical Society",
    "JCAP.": "Journal of Cosmology and Astroparticle Physics",
    "JOSS.": "The Journal of Open Source Software",
    "MLS&T": "Machine Learning: Science and Technology",
    "MNRAS": "Monthly Notices of the Royal Astronomical Society",
    "NatAs": "Nature Astronomy",
    "Natur": "Nature",
    "NRvMP": "Nature Reviews Methods Primers",
    "OJAp.": "The Open Journal of Astrophysics",
    "PASJ.": "Publications of the Astronomical Society of Japan",
    "PASP.": "Publications of the Astronomical Society of the Pacific",
    "PhRvD": "Physical Review D",
    "PhRvL": "Physical Review Letters",
    "PhDT.": "Ph.D. Thesis",
    "RNAAS": "Research Notes of the American Astronomical Society",
    "arXiv": "arXiv e-prints",
    "ascl.": "Astrophysics Source Code Library",
    "mla..": "Machine Learning for Astrophysics",
}


def journal_from_bibcode(bibcode: Optional[str]) -> Optional[str]:
    """Map an ADS bibcode to its journal name, or None if the code is unknown."""
    bibcode = (bibcode or "").strip()
    if len(bibcode) < 9:
        return None
    return BIBCODE_JOURNALS.get(bibcode[4:9])


# ---------------------------------------------------------------------------
# Identifier-based de-duplication
# ---------------------------------------------------------------------------


def norm_doi(doi: Optional[str]) -> str:
    """Normalise a DOI for use as a join key (lowercase, no URL/`doi:` prefix)."""
    doi = (doi or "").strip().lower()
    for prefix in ("https://doi.org/", "http://doi.org/",
                   "https://dx.doi.org/", "http://dx.doi.org/", "doi:"):
        if doi.startswith(prefix):
            doi = doi[len(prefix):]
            break
    return doi.strip()


def norm_arxiv(arxiv: Optional[str]) -> str:
    """Normalise an arXiv id (drop an `arXiv:` prefix and any `v2` suffix)."""
    arxiv = (arxiv or "").strip().lower()
    if arxiv.startswith("arxiv:"):
        arxiv = arxiv[len("arxiv:"):]
    return re.sub(r"v\d+$", "", arxiv.strip()).strip()


_ARXIV_BIBCODE = re.compile(r"^\d{4}arXiv(\d{4})(\d{5})", re.IGNORECASE)


def arxiv_id_from_bibcode(bibcode: Optional[str]) -> Optional[str]:
    """`2023arXiv230706378L` -> `2307.06378`; None for a journal bibcode."""
    match = _ARXIV_BIBCODE.match((bibcode or "").strip())
    return f"{match.group(1)}.{match.group(2)}" if match else None


def identity_keys(pub: Dict) -> set:
    """The set of identifier keys a publication can be joined on.

    Two records that share *any* key are the same paper. An arXiv bibcode is
    reduced to its arXiv id so that the preprint and the published record of one
    paper collapse together.
    """
    keys = set()
    doi = norm_doi(pub.get("doi"))
    if doi:
        keys.add(("doi", doi))
    arxiv = norm_arxiv(pub.get("arxivId"))
    for raw in (pub.get("bibcode"), pub.get("id")):
        bibcode = (raw or "").strip()
        if not bibcode:
            continue
        from_bibcode = arxiv_id_from_bibcode(bibcode)
        if from_bibcode:
            arxiv = arxiv or from_bibcode
        else:
            keys.add(("bibcode", bibcode))
    if arxiv:
        keys.add(("arxiv", arxiv))
    return keys


def _completeness_score(pub: Dict) -> Tuple:
    """Sort key for "which of these duplicate records do we keep?"."""
    return (
        1 if pub.get("bibcode") or pub.get("id") else 0,
        1 if pub.get("journal") else 0,
        sum(1 for k in ("doi", "arxivId", "bibcode", "adsUrl") if pub.get(k)),
        len(pub.get("sources") or []),
        int(pub.get("citations") or 0),
        sum(1 for v in pub.values() if v not in (None, "", [], {})),
    )


def deduplicate_publications(
    publications: List[Dict],
) -> Tuple[List[Dict], List[Dict]]:
    """Collapse records that share a DOI, bibcode or arXiv id.

    Google Scholar frequently lists the preprint and the published version of one
    paper as two entries; before this step they both reached the site, so the
    paper was double-counted, rendered twice and could carry two different
    `researchArea` values (audit D4).

    The most complete record wins. Fields only the losers carried are merged in,
    and their `scholar_id`s are kept in `scholar_id_aliases` so the provenance of
    the merge survives. Returns ``(kept, dropped)``; ``dropped`` records are
    annotated with `_mergedInto` for logging.
    """
    parent: Dict[Tuple[str, str], int] = {}
    groups: Dict[int, List[int]] = {}
    for index, pub in enumerate(publications):
        matched = {parent[k] for k in identity_keys(pub) if k in parent}
        if matched:
            target = min(matched)
            for key in identity_keys(pub):
                parent[key] = target
            for other in matched - {target}:
                for key, value in list(parent.items()):
                    if value == other:
                        parent[key] = target
                groups[target].extend(groups.pop(other, []))
            groups[target].append(index)
        else:
            groups[index] = [index]
            for key in identity_keys(pub):
                parent[key] = index

    unkeyed = [i for i, p in enumerate(publications) if not identity_keys(p)]
    for i in unkeyed:
        groups.setdefault(i, [i])

    kept: List[Dict] = []
    dropped: List[Dict] = []
    keeper_of: Dict[int, Dict] = {}
    for members in groups.values():
        ordered = sorted(set(members))
        winner_index = max(ordered, key=lambda i: _completeness_score(publications[i]))
        winner = publications[winner_index]
        for i in ordered:
            if i == winner_index:
                continue
            loser = publications[i]
            for key, value in loser.items():
                if key == "scholar_id":
                    continue
                if winner.get(key) in (None, "", [], {}) and value not in (None, "", [], {}):
                    winner[key] = value
            alias = loser.get("scholar_id")
            if alias and alias != winner.get("scholar_id"):
                aliases = winner.setdefault("scholar_id_aliases", [])
                if alias not in aliases:
                    aliases.append(alias)
            loser["_mergedInto"] = winner.get("bibcode") or winner.get("doi") or winner.get("title")
            dropped.append(loser)
        keeper_of[winner_index] = winner

    for index, pub in enumerate(publications):
        if index in keeper_of:
            kept.append(pub)
    return kept, dropped


class PostProcessor:
    """Consolidated post-processor for publications data.

    Loads publications_data.json once, runs all steps in-memory,
    and saves once at the end.
    """

    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.data_path = get_data_path()
        self.cache_path = get_data_path("ads_library_cache.json")
        self.data: Optional[Dict] = None
        self.ads_api_key: Optional[str] = None

    # ------------------------------------------------------------------
    # Load / save
    # ------------------------------------------------------------------

    def load(self) -> Dict:
        """Load publications data from the canonical path."""
        logger.info(f"Loading publications data from {self.data_path}")
        with open(self.data_path, "r", encoding="utf-8") as f:
            self.data = json.load(f)
        pubs = self.data.get("publications", [])
        logger.info(f"Loaded {len(pubs)} publications")
        return self.data

    def save(self):
        """Save publications data back to the canonical path."""
        if self.dry_run:
            logger.info("[DRY RUN] Would save to %s", self.data_path)
            return
        self.data_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.data_path, "w", encoding="utf-8") as f:
            json.dump(self.data, f, indent=2, ensure_ascii=False)
        logger.info(f"Saved publications data to {self.data_path}")

    # ------------------------------------------------------------------
    # Step 1: Flag featured publications
    # ------------------------------------------------------------------

    def flag_featured(self):
        """Flag specific publications as featured."""
        pubs = self.data.get("publications", [])
        count = 0
        for paper in FEATURED_PAPERS:
            pattern = paper["title_pattern"].lower()
            for pub in pubs:
                if pattern in pub.get("title", "").lower():
                    pub["featured"] = True
                    count += 1
                    logger.info(f"Flagged featured: {paper['description']}")
                    break
            else:
                logger.warning(f"Featured paper not found: {paper['description']}")
        logger.info(f"Flagged {count} featured publications")

    # ------------------------------------------------------------------
    # Step 2a: Normalise titles and abstracts
    # ------------------------------------------------------------------

    def normalize_publication_text(self):
        """Strip publisher/LaTeX artifacts from every title and abstract.

        ADS and arXiv hand back a leading "Abstract" label, `$...$` math,
        ``\textit{}`` wrappers and TeX quote pairs; the site writes abstracts
        into the page as HTML, so they are normalised here once (audit E6).
        """
        pubs = self.data.get("publications", [])
        changed = {"title": 0, "abstract": 0}
        for pub in pubs:
            for field in ("title", "abstract"):
                before = pub.get(field)
                after = normalize_text(before)
                if after != before:
                    pub[field] = after
                    changed[field] += 1
        logger.info(
            f"Normalised text: {changed['title']} titles, {changed['abstract']} abstracts"
        )

    # ------------------------------------------------------------------
    # Step 2b: Backfill missing venues
    # ------------------------------------------------------------------

    def backfill_journals(self):
        """Give every paper a venue string (audit D14).

        Derived from the ADS bibcode's journal code where there is one; a paper
        with an arXiv id and no bibcode is a preprint and gets "arXiv e-prints",
        matching what the ADS-sourced preprints already carry. Anything left
        (a workshop paper or an erratum with a DataCite-only DOI) is logged for a
        hand-written venue rather than guessed at.
        """
        filled = 0
        unresolved = []
        for pub in self.data.get("publications", []):
            if pub.get("journal"):
                continue
            venue = journal_from_bibcode(pub.get("bibcode") or pub.get("id"))
            if not venue and norm_arxiv(pub.get("arxivId")):
                venue = "arXiv e-prints"
            if venue:
                pub["journal"] = venue
                filled += 1
            else:
                unresolved.append((pub.get("title") or "")[:70])
        for title in unresolved:
            logger.warning("No venue derivable — set `journal` by hand: %r", title)
        logger.info(f"Backfilled venue for {filled} publications")

    # ------------------------------------------------------------------
    # Step 2c: De-duplicate by identifier
    # ------------------------------------------------------------------

    def deduplicate(self):
        """Collapse records sharing a DOI, bibcode or arXiv id (audit D4).

        `merge_data.py` de-duplicates by normalised title, which misses the case
        where Google Scholar lists a preprint and its published version under
        different titles. This is the identifier-level backstop.
        """
        pubs = self.data.get("publications", [])
        kept, dropped = deduplicate_publications(pubs)
        for loser in dropped:
            logger.warning(
                "Duplicate dropped: %r (merged into %s)",
                (loser.get("title") or "")[:70], loser.get("_mergedInto"),
            )
        if dropped:
            self.data["publications"] = kept
            logger.info(
                f"De-duplicated: {len(pubs)} -> {len(kept)} publications "
                f"({len(dropped)} merged away)"
            )
        else:
            logger.info(f"De-duplicated: no duplicates among {len(pubs)} publications")

    # ------------------------------------------------------------------
    # Step 2d: Ensure categorization (sync LLM, derive researchArea)
    # ------------------------------------------------------------------

    def ensure_categorization(self):
        """Sync `categoryProbabilities` from LLM data and derive `researchArea`.

        - Papers WITH `llm_categorization`: take its probabilities. The agents
          write them under `categorization` (see `llm_categorization_rubric.md`);
          `categoryProbabilities` is accepted as an alias.
        - `researchArea` is ALWAYS recomputed as argmax(categoryProbabilities),
          for every paper, so a card's accent stripe and filter bucket can never
          contradict the badges it renders (audit D5). It is a derived field: do
          not hand-edit it, edit the probabilities.
        - Strip `_scoring_info` from all papers (keyword scoring artifact).
        """
        pubs = self.data.get("publications", [])
        synced = 0
        stripped = 0
        rederived = 0
        for pub in pubs:
            # Sync from LLM categorization if present
            llm = pub.get("llm_categorization")
            if llm and isinstance(llm, dict):
                probs = llm.get("categoryProbabilities") or llm.get("categorization")
                if isinstance(probs, dict) and probs:
                    pub["categoryProbabilities"] = probs
                    synced += 1

            # researchArea is derived, never authored
            area = argmax_research_area(
                pub.get("categoryProbabilities"), pub.get("researchArea")
            )
            if area and area != pub.get("researchArea"):
                logger.debug(
                    "researchArea %r -> %r for %s",
                    pub.get("researchArea"), area, pub.get("title", "")[:60],
                )
                pub["researchArea"] = area
                rederived += 1

            # Strip keyword scoring artifact
            if "_scoring_info" in pub:
                del pub["_scoring_info"]
                stripped += 1

        # Strip top-level processing_history (keyword scoring artifact)
        if "processing_history" in self.data:
            del self.data["processing_history"]
            logger.info("Stripped processing_history from top-level data")

        logger.info(
            f"Categorization: synced {synced} from LLM, re-derived researchArea for "
            f"{rederived}, stripped _scoring_info from {stripped}"
        )

    # ------------------------------------------------------------------
    # Step 3: Fix citations timeline
    # ------------------------------------------------------------------

    def fix_citations_timeline(self):
        """Update metrics with Google Scholar citations timeline."""
        try:
            from fetch_google_scholar import GoogleScholarFetcher

            fetcher = GoogleScholarFetcher()
            scholar_metrics = fetcher.fetch_author_metrics()
        except Exception as e:
            logger.warning(f"Could not fetch Scholar metrics: {e}")
            return

        pubs = self.data.get("publications", [])
        current_metrics = self.data.get("metrics", {})

        # Citations per year from Google Scholar
        new_cpy = scholar_metrics.get("citationsPerYear", {})

        # Fallback: keep existing data if Scholar returns empty
        if not new_cpy:
            old_cpy = current_metrics.get("citationsPerYear", {})
            if old_cpy and sum(old_cpy.values()) > 0:
                new_cpy = old_cpy
                logger.info("Using existing citationsPerYear (Scholar returned empty)")
            else:
                logger.warning("No citationsPerYear data available")

        # Citations by publication year (calculated)
        citations_by_pub_year = {}
        for pub in pubs:
            year = pub.get("year")
            if year and year >= 2000:
                yr = str(year)
                citations_by_pub_year[yr] = (
                    citations_by_pub_year.get(yr, 0) + pub.get("citations", 0)
                )

        actual_paper_count = len(pubs)
        updated_metrics = {
            **current_metrics,
            "totalPapers": actual_paper_count,
            "hIndex": scholar_metrics.get(
                "hIndex", current_metrics.get("hIndex", 0)
            ),
            "i10Index": scholar_metrics.get(
                "i10Index", current_metrics.get("i10Index", 0)
            ),
            "totalCitations": scholar_metrics.get(
                "totalCitations", current_metrics.get("totalCitations", 0)
            ),
            "citationsPerYear": new_cpy,
            "citationsByPublicationYear": citations_by_pub_year,
            "lastUpdated": datetime.now().isoformat() + "Z",
        }

        sources = updated_metrics.get("sources", [])
        if "google_scholar" not in sources:
            sources.append("google_scholar")
            updated_metrics["sources"] = sources

        self.data["metrics"] = updated_metrics
        self.data["lastUpdated"] = datetime.now().isoformat() + "Z"
        logger.info(
            f"Citations timeline updated: {len(new_cpy)} years, "
            f"{updated_metrics['totalCitations']} total citations"
        )

    # ------------------------------------------------------------------
    # Step 4: Update ADS library cache
    # ------------------------------------------------------------------

    def update_ads_library_cache(self) -> Dict[str, List[str]]:
        """Fetch latest bibcodes from ADS libraries and update cache."""
        if not self.ads_api_key:
            logger.warning("No ADS API key — skipping library cache update")
            return self._load_existing_cache()

        headers = {"Authorization": f"Bearer {self.ads_api_key}"}
        new_cache: Dict[str, List[str]] = {}

        # Fetch "all" library
        if ADS_ALL_LIBRARY:
            bibcodes = self._fetch_library_bibcodes(ADS_ALL_LIBRARY, headers)
            if bibcodes:
                new_cache["all"] = bibcodes

        # Fetch category libraries
        for category, library_id in ADS_LIBRARIES.items():
            bibcodes = self._fetch_library_bibcodes(library_id, headers)
            if bibcodes:
                new_cache[category] = bibcodes

        # Merge with existing cache
        merged = self._merge_cache(new_cache)

        # Save cache
        if not self.dry_run:
            self.cache_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.cache_path, "w") as f:
                json.dump(merged, f, indent=2)
            logger.info(f"Saved ADS library cache to {self.cache_path}")

        return merged

    def _fetch_library_bibcodes(
        self, library_id: str, headers: Dict
    ) -> List[str]:
        """Fetch all bibcodes from an ADS library with pagination."""
        import requests

        url = f"https://api.adsabs.harvard.edu/v1/biblib/libraries/{library_id}"
        try:
            resp = requests.get(url, headers=headers, timeout=30)
            resp.raise_for_status()
            metadata = resp.json().get("metadata", {})
            total = metadata.get("num_documents", 0)
        except Exception as e:
            logger.error(f"Library {library_id} metadata fetch failed: {e}")
            return []

        if total == 0:
            return []

        all_bibcodes: List[str] = []
        start = 0
        while start < total:
            try:
                resp = requests.get(
                    url,
                    headers=headers,
                    params={"start": start, "rows": min(200, total - start)},
                    timeout=30,
                )
                resp.raise_for_status()
                docs = resp.json().get("documents", [])
                if not docs:
                    break
                all_bibcodes.extend(docs)
                start += len(docs)
            except Exception as e:
                logger.error(f"Library {library_id} page fetch failed: {e}")
                break

        logger.info(f"Library {library_id}: {len(all_bibcodes)} bibcodes")
        return all_bibcodes

    def _load_existing_cache(self) -> Dict[str, List[str]]:
        """Load existing ADS library cache."""
        try:
            with open(self.cache_path, "r") as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}

    def _merge_cache(self, new_cache: Dict[str, List[str]]) -> Dict[str, List[str]]:
        """Merge new cache with existing, preserving manual entries."""
        existing = self._load_existing_cache()
        merged = existing.copy()
        for category, bibcodes in new_cache.items():
            if category in merged:
                merged_set = set(merged[category]) | set(bibcodes)
                merged[category] = sorted(merged_set, reverse=True)
            else:
                merged[category] = bibcodes
        return merged

    # ------------------------------------------------------------------
    # Step 5: Apply authorship categories
    # ------------------------------------------------------------------

    ROLE_PRIORITY = ("primary", "postdoc", "student", "significant")

    def _publication_index(self) -> Dict[Tuple[str, str], Dict]:
        """Map every identifier key a publication answers to onto that record."""
        index: Dict[Tuple[str, str], Dict] = {}
        for pub in self.data.get("publications", []):
            for key in identity_keys(pub):
                index.setdefault(key, pub)
        return index

    def _resolve_bibcode(self, bibcode: str, index: Dict[Tuple[str, str], Dict]):
        """Find the publication a curated ADS bibcode refers to, or None.

        A curated library can hold the arXiv bibcode of a paper the site stores
        under its published bibcode (or the reverse), so the arXiv id is tried as
        a second key. This is why the naive bibcode-equality match used to leave
        71 papers uncategorised (audit C9/D7).
        """
        bibcode = (bibcode or "").strip()
        if not bibcode:
            return None
        hit = index.get(("bibcode", bibcode))
        if hit is not None:
            return hit
        arxiv = arxiv_id_from_bibcode(bibcode)
        if arxiv:
            return index.get(("arxiv", arxiv))
        return None

    def apply_authorship_categories(self, cache: Dict[str, List[str]]):
        """Apply authorship categories from the curated ADS library cache.

        The four curated ADS libraries are the single source of truth for
        authorship role. Membership is resolved by bibcode *or* arXiv id, so a
        library entry filed under a paper's preprint bibcode still lands on the
        published record the site holds.
        """
        pubs = self.data.get("publications", [])
        index = self._publication_index()

        members: Dict[str, List[Dict]] = {}
        unmatched: Dict[str, List[str]] = {}
        for role in self.ROLE_PRIORITY:
            resolved: List[Dict] = []
            missing: List[str] = []
            seen = set()
            for bibcode in cache.get(role, []):
                pub = self._resolve_bibcode(bibcode, index)
                if pub is None:
                    missing.append(bibcode)
                elif id(pub) not in seen:
                    seen.add(id(pub))
                    resolved.append(pub)
            members[role] = resolved
            unmatched[role] = missing
            logger.info(
                "Library %s: %d bibcodes -> %d distinct papers (%d unmatched)",
                role, len(cache.get(role, [])), len(resolved), len(missing),
            )

        # Clear first so a paper removed from a library loses its role.
        for pub in pubs:
            pub.pop("authorshipCategory", None)

        # Priority: primary > postdoc > student > significant
        assigned = 0
        for role in self.ROLE_PRIORITY:
            for pub in members[role]:
                if "authorshipCategory" not in pub:
                    pub["authorshipCategory"] = role
                    assigned += 1

        logger.info(
            f"Applied authorship categories to {assigned} of {len(pubs)} publications"
        )
        self._role_membership = {r: len(members[r]) for r in self.ROLE_PRIORITY}
        self._role_unmatched = {r: v for r, v in unmatched.items() if v}
        return members

    # ------------------------------------------------------------------
    # Step 5b: Reconcile role counts against the RIQ corpora
    # ------------------------------------------------------------------

    def reconcile_role_counts(self, cache: Dict[str, List[str]]):
        """Record how the ADS libraries map onto the site's publication list.

        The RIQ curves come back from the ADS Metrics API computed over the raw
        bibcode lists, which are *larger* than the site's paper counts for two
        reasons: a library can hold both the preprint and the published bibcode
        of one paper, and it can hold records the site does not list at all. Both
        are counted here and written into `metrics` so the numbers on the page
        can be explained rather than guessed at (audit C9).
        """
        metrics = self.data.setdefault("metrics", {})
        index = self._publication_index()
        riq = metrics.get("riqByCategory") or {}

        summary = {}
        for role in ("all",) + self.ROLE_PRIORITY:
            bibcodes = cache.get(role, [])
            if not bibcodes:
                continue
            matched, missing = [], []
            for bibcode in bibcodes:
                pub = self._resolve_bibcode(bibcode, index)
                (missing if pub is None else matched).append(
                    bibcode if pub is None else id(pub)
                )
            distinct = len(set(matched))
            summary[role] = {
                "libraryBibcodes": len(bibcodes),
                "papers": distinct,
                "duplicateBibcodes": len(matched) - distinct,
                "unmatchedBibcodes": sorted(missing),
            }
            entry = riq.get(role)
            if isinstance(entry, dict):
                entry["papers"] = distinct
                entry["libraryBibcodes"] = len(bibcodes)
                entry["unmatchedBibcodes"] = sorted(missing)

        # Bibcodes in a curated library with no record on the site. They are
        # carried with a hand-written gloss (why the paper is not listed, or that
        # it should be added) which survives across runs and is dropped
        # automatically once the bibcode resolves.
        previous = metrics.get("roleReconciliation") or {}
        existing_notes = previous.get("unmatchedBibcodeNotes") or {}
        all_unmatched = sorted(
            {b for role in summary.values() for b in role["unmatchedBibcodes"]}
        )
        notes = {b: existing_notes[b] for b in all_unmatched if b in existing_notes}
        for bibcode in all_unmatched:
            if bibcode not in notes:
                logger.warning(
                    "ADS library bibcode %s has no publication record and no note — "
                    "add one to metrics.roleReconciliation.unmatchedBibcodeNotes",
                    bibcode,
                )
        metrics["roleReconciliation"] = {
            "byRole": summary,
            "unmatchedBibcodeNotes": notes,
        }
        if riq:
            metrics["riqByCategory"] = riq

        all_summary = summary.get("all", {})
        pubs = self.data.get("publications", [])
        total = len(pubs)
        with_role = sum(1 for p in pubs if p.get("authorshipCategory"))
        metrics["notes"] = {
            "lastUpdated": (
                "Timestamp of the last ADS/Scholar fetch, not of the last edit. "
                "Corrections applied to the cache without a refetch are listed in "
                "top-level `manualEdits`."
            ),
            "totalPapers": (
                "Distinct publication records on the site. `researchArea` is derived "
                "as argmax(categoryProbabilities); duplicates are collapsed by DOI / "
                "bibcode / arXiv id in postprocessing.py."
            ),
            "totalCitations": (
                "Google Scholar author total (a Scholar+ADS blend). It is deliberately "
                "larger than the sum of the per-paper `citations` field, which is "
                "ADS-only and matches citationsByPublicationYear."
            ),
            "riqByCategory": (
                "RIQ series come from the ADS Metrics API computed over the curated ADS "
                "libraries, so `libraryBibcodes` (what ADS measured) exceeds `papers` "
                "(distinct site records): a library may hold both the preprint and the "
                "published bibcode of one paper, and may hold records the site does not "
                "list. `papers` agrees with the authorshipCategory tallies; "
                "`unmatchedBibcodes` lists the library entries with no site record."
            ),
            "roleCoverage": (
                f"{with_role} of {total} papers carry an authorshipCategory. The rest are "
                "co-authored papers that sit in no curated role library; the roles "
                'figure buckets them as "Other".'
            ),
        }
        if all_summary:
            logger.info(
                "Role reconciliation: all library %d bibcodes -> %d distinct papers, "
                "%d duplicate bibcodes, %d unmatched",
                all_summary["libraryBibcodes"], all_summary["papers"],
                all_summary["duplicateBibcodes"], len(all_summary["unmatchedBibcodes"]),
            )

    # ------------------------------------------------------------------
    # Step 6: Fetch ADS bibliometric time series
    # ------------------------------------------------------------------

    def fetch_ads_metrics(self):
        """Fetch h/g/i10/tori time series from ADS Metrics API."""
        if not self.ads_api_key:
            logger.warning("No ADS API key — skipping ADS metrics fetch")
            return

        # Get bibcodes from cache or publications
        cache = self._load_existing_cache()
        bibcodes = cache.get("all", [])
        if not bibcodes:
            bibcodes = [
                p.get("bibcode")
                for p in self.data.get("publications", [])
                if p.get("bibcode")
            ]
        if not bibcodes:
            logger.warning("No bibcodes available for ADS metrics")
            return

        headers = {
            "Authorization": f"Bearer {self.ads_api_key}",
            "Content-Type": "application/json",
        }

        # Fetch overall metrics
        raw = self._fetch_metrics_api(bibcodes, headers)
        if not raw:
            return

        parsed = self._parse_ads_metrics(raw)

        # Fetch per-category RIQ breakdown
        bibcodes_by_cat = {
            "all": bibcodes,
            "primary": cache.get("primary", []),
            "significant": cache.get("significant", []),
            "student": cache.get("student", []),
            "postdoc": cache.get("postdoc", []),
        }
        riq_by_category = {}
        for category, cat_bibcodes in bibcodes_by_cat.items():
            if not cat_bibcodes:
                continue
            cat_raw = self._fetch_metrics_api(cat_bibcodes, headers)
            if cat_raw:
                ts = cat_raw.get("time series", {})
                indicators = cat_raw.get("indicators", {})
                tori_series = ts.get("tori", {})
                riq_series = {}
                if tori_series:
                    years = sorted(int(y) for y in tori_series.keys())
                    first_year = years[0]
                    for year in years:
                        tori_val = tori_series.get(str(year), 0)
                        years_active = year - first_year + 1
                        if tori_val > 0 and years_active > 0:
                            riq_series[str(year)] = round(
                                (tori_val**0.5) / years_active * 1000, 1
                            )
                riq_by_category[category] = {
                    "current": indicators.get("riq", 0),
                    "papers": len(cat_bibcodes),
                    "riq_series": riq_series,
                }
                logger.info(
                    f"  {category}: RIQ={indicators.get('riq', 0):.1f}, "
                    f"h={indicators.get('h', 0)}, papers={len(cat_bibcodes)}"
                )

        parsed["riqByCategory"] = riq_by_category

        # Write to metrics
        metrics = self.data.setdefault("metrics", {})
        metrics["adsMetricsTimeSeries"] = parsed.get("adsMetricsTimeSeries", {})
        metrics["adsMetricsCurrent"] = parsed.get("adsMetricsCurrent", {})
        metrics["adsMetricsCurrentRefereed"] = parsed.get(
            "adsMetricsCurrentRefereed", {}
        )
        metrics["riqByCategory"] = parsed.get("riqByCategory", {})
        metrics["adsMetricsLastUpdated"] = parsed.get(
            "adsMetricsLastUpdated", datetime.now().isoformat() + "Z"
        )

        logger.info("ADS bibliometric time series updated")

    def _fetch_metrics_api(
        self, bibcodes: List[str], headers: Dict
    ) -> Optional[Dict]:
        """Call the ADS Metrics API."""
        import requests

        try:
            resp = requests.post(
                ADS_METRICS_ENDPOINT,
                headers=headers,
                json={"bibcodes": bibcodes, "types": ["indicators", "timeseries"]},
                timeout=60,
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.error(f"ADS metrics API error: {e}")
            return None

    def _parse_ads_metrics(self, raw: Dict) -> Dict:
        """Parse raw ADS metrics response."""
        indicators = raw.get("indicators", {})
        indicators_ref = raw.get("indicators refereed", {})
        ts = raw.get("time series", {})

        result = {
            "adsMetricsCurrent": {
                m: indicators.get(m, 0)
                for m in ["h", "g", "m", "i10", "i100", "tori", "riq", "read10"]
            },
            "adsMetricsCurrentRefereed": {
                m: indicators_ref.get(m, 0)
                for m in ["h", "g", "m", "i10", "i100", "tori", "riq", "read10"]
            },
            "adsMetricsTimeSeries": {
                m: ts[m] for m in ["h", "g", "i10", "i100", "tori", "read10"] if m in ts
            },
            "adsMetricsLastUpdated": datetime.now().isoformat() + "Z",
        }
        logger.info(
            f"Parsed ADS metrics: {len(result['adsMetricsTimeSeries'])} time series"
        )
        return result

    # ------------------------------------------------------------------
    # Run all steps
    # ------------------------------------------------------------------

    def run_all(self):
        """Run the complete post-processing pipeline."""
        # Load .env for API keys
        from dotenv import load_dotenv

        env_path = get_project_root() / ".env"
        if env_path.exists():
            load_dotenv(dotenv_path=env_path)
        else:
            load_dotenv()
        self.ads_api_key = os.getenv("ADS_API_KEY")

        # Load data
        self.load()

        # Step 1: Featured flags
        logger.info("--- Step 1: Flag featured publications ---")
        self.flag_featured()

        # Step 2: Normalise text, de-duplicate, then categorise
        logger.info("--- Step 2a: Normalise titles and abstracts ---")
        self.normalize_publication_text()

        logger.info("--- Step 2b: Backfill missing venues ---")
        self.backfill_journals()

        logger.info("--- Step 2c: De-duplicate by identifier ---")
        self.deduplicate()

        logger.info("--- Step 2d: Ensure categorization ---")
        self.ensure_categorization()

        # Step 3: Fix citations timeline
        logger.info("--- Step 3: Fix citations timeline ---")
        self.fix_citations_timeline()

        # Step 4: Update ADS library cache
        logger.info("--- Step 4: Update ADS library cache ---")
        cache = self.update_ads_library_cache()

        # Step 5: Apply authorship categories
        logger.info("--- Step 5: Apply authorship categories ---")
        self.apply_authorship_categories(cache)

        logger.info("--- Step 5b: Reconcile role counts ---")
        self.reconcile_role_counts(cache)

        # Step 6: Fetch ADS metrics
        logger.info("--- Step 6: Fetch ADS bibliometric metrics ---")
        self.fetch_ads_metrics()

        # Save once
        self.save()
        logger.info("Post-processing complete.")


def main():
    parser = argparse.ArgumentParser(
        description="Consolidated post-processing for publications data"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without writing files",
    )
    args = parser.parse_args()

    processor = PostProcessor(dry_run=args.dry_run)
    processor.run_all()


if __name__ == "__main__":
    main()
