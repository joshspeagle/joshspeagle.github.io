#!/usr/bin/env python3
"""Automated ADS library curation and authorship-role classifier.

Cross-references `assets/data/publications_data.json` against the mentee rosters in
`assets/data/content.json` and the cached NASA ADS libraries in
`assets/data/ads_library_cache.json` to:
  1. Identify papers missing from the master `all` ADS library (`YiaebBefTHKZdblrny2Vsw`).
  2. Propose authorship role library assignments (`primary`, `postdoc`, `student`,
     `significant`) for any unclassified or newly fetched papers using author
     position and mentee name matching.
  3. Update `assets/data/ads_library_cache.json` (`--apply-cache`) and push new
     bibcodes directly to the live NASA ADS libraries via the ADS `biblib` REST API
     (`POST https://api.adsabs.harvard.edu/v1/biblib/documents/<library_id>` with
     `--push-ads`), or generate a Playwright browser-automation script (`--playwright`)
     when interactive ADS web-UI verification is desired.

Usage:
  python3 scripts/curate_ads_libraries.py                  # Audit & propose additions
  python3 scripts/curate_ads_libraries.py --apply-cache    # Apply proposed additions to ads_library_cache.json
  python3 scripts/curate_ads_libraries.py --push-ads       # Push bibcodes to live NASA ADS libraries via API
"""

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CONTENT_JSON = PROJECT_ROOT / "assets" / "data" / "content.json"
PUBLICATIONS_JSON = PROJECT_ROOT / "assets" / "data" / "publications_data.json"
LIBRARY_CACHE_JSON = PROJECT_ROOT / "assets" / "data" / "ads_library_cache.json"

ADS_BIBLIB_DOCUMENTS_URL = "https://api.adsabs.harvard.edu/v1/biblib/documents/{library_id}"


def _strip_tags(text: str) -> str:
    return re.sub(r"<[^>]+>", "", str(text or "")).strip()


def _load_env_key(var_name: str = "ADS_API_KEY") -> Optional[str]:
    val = os.environ.get(var_name)
    if val:
        return val.strip()
    env_file = PROJECT_ROOT / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            if k.strip() == var_name:
                return v.strip().strip('"').strip("'")
    return None


def _norm_surname_initial(raw_name: str) -> Tuple[str, str, Set[str]]:
    """Extract (surname_lower, first_initial_lower, given_tokens_lower) from either
    'First \"Nick\" Last' (content.json) or 'Last, First M.' / 'First Last' (ADS/Scholar).
    """
    clean = _strip_tags(raw_name)
    # Extract nicknames in quotes or parentheses as alternative given names
    nicknames = {
        m.strip().lower()
        for m in re.findall(r'["“”\']([^"“”\']+)["“”\']|\(([^)]+)\)', clean)
        for m in m if m
    }
    clean_no_nick = re.sub(r'["“”\'][^"“”\']+["“”\']|\([^)]+\)', " ", clean)
    clean_no_nick = re.sub(r"\s+", " ", clean_no_nick).strip()

    if "," in clean_no_nick:
        last_part, given_part = [p.strip() for p in clean_no_nick.split(",", 1)]
        surname = last_part.lower()
        given_tokens = {
            t.strip(".").lower()
            for t in re.split(r"[\s.-]+", given_part)
            if t.strip(".")
        } | nicknames
        first_init = next((t[0] for t in given_part.split() if t.strip(".")), "")
        return surname, first_init.lower(), given_tokens

    tokens = [t.strip(".") for t in clean_no_nick.split() if t.strip(".")]
    if not tokens:
        return "", "", set()
    surname = tokens[-1].lower()
    given_tokens = {t.lower() for t in tokens[:-1]} | nicknames
    first_init = tokens[0][0].lower() if len(tokens) > 1 else ""
    return surname, first_init, given_tokens


def build_mentee_index(content: Dict) -> Dict[str, List[Dict]]:
    """Return {'postdoc': [...], 'student': [...]} of mentee name matchers from content.json."""
    mbs = content.get("sections", {}).get("mentorship", {}).get("menteesByStage", {})
    completed = mbs.get("completed", {}) or {}

    roster = {"postdoc": [], "student": []}
    stage_map = [
        ("postdoc", mbs.get("postdoctoral", []), True),
        ("postdoc", completed.get("postdoctoral", []), False),
        ("student", mbs.get("doctoral", []), True),
        ("student", completed.get("doctoral", []), False),
        ("student", mbs.get("mastersProjects", []), True),
        ("student", completed.get("mastersProjects", []), False),
        ("student", mbs.get("bachelors", []), True),
        ("student", completed.get("bachelors", []), False),
        ("student", mbs.get("secondary", []), True),
        ("student", completed.get("secondary", []), False),
    ]

    for role_bucket, records, is_active in stage_map:
        for rec in records or []:
            name = _strip_tags(rec.get("name", ""))
            if not name:
                continue
            surname, first_init, given_tokens = _norm_surname_initial(name)
            if not surname:
                continue
            years = [int(y) for y in re.findall(r"(?:19|20)\d{2}", str(rec.get("timelinePeriod", "")))]
            start_yr = min(years) if years else 2016
            end_yr = 2099 if is_active else (max(years) + 2 if years else 2099)
            roster[role_bucket].append({
                "name": name,
                "surname": surname,
                "first_init": first_init,
                "given_tokens": given_tokens,
                "start_yr": start_yr - 1,
                "end_yr": end_yr,
                "active": is_active,
            })
    return roster


def _author_matches_mentee(author_str: str, mentee: Dict, pub_year: int) -> bool:
    """Check whether an author string matches a mentee record within their supervision window."""
    if pub_year and not (mentee["start_yr"] <= pub_year <= mentee["end_yr"]):
        return False
    surname, first_init, given_tokens = _norm_surname_initial(author_str)
    if not surname or surname != mentee["surname"]:
        return False
    # If author string has a full given name, check overlap first
    full_given = {t for t in given_tokens if len(t) > 1}
    mentee_full = {t for t in mentee["given_tokens"] if len(t) > 1}
    if full_given and mentee_full:
        return bool(full_given & mentee_full)
    # Fall back to first initial match
    if first_init and mentee["first_init"]:
        return first_init == mentee["first_init"]
    return False


def _is_speagle(author_str: str) -> bool:
    s = str(author_str or "").lower()
    return "speagle" in s


def classify_paper_role(pub: Dict, mentee_index: Dict[str, List[Dict]]) -> Tuple[str, str]:
    """Infer ('primary'|'postdoc'|'student'|'significant'|'other', reason) for a paper."""
    authors = pub.get("authors") or []
    year = int(pub.get("year") or 0)
    if not authors:
        return "other", "No author list available"

    first_author = authors[0]
    if _is_speagle(first_author):
        return "primary", f"First author ({first_author})"

    # Check if 1st author is a mentored student or postdoc
    for m in mentee_index.get("student", []):
        if _author_matches_mentee(first_author, m, year):
            return "student", f"First author matches student mentee {m['name']} ({first_author})"
    for m in mentee_index.get("postdoc", []):
        if _author_matches_mentee(first_author, m, year):
            return "postdoc", f"First author matches postdoctoral mentee {m['name']} ({first_author})"

    # Check if 2nd author is a mentored student/postdoc AND Speagle is 2nd/3rd co-lead
    if len(authors) >= 2:
        second_author = authors[1]
        speagle_pos = next((i + 1 for i, a in enumerate(authors) if _is_speagle(a)), 99)
        if speagle_pos <= 4:
            for m in mentee_index.get("student", []):
                if _author_matches_mentee(second_author, m, year):
                    return "student", f"Second author matches student mentee {m['name']} with Speagle #{speagle_pos}"
            for m in mentee_index.get("postdoc", []):
                if _author_matches_mentee(second_author, m, year):
                    return "postdoc", f"Second author matches postdoc mentee {m['name']} with Speagle #{speagle_pos}"

    # Significant contribution heuristic: Speagle is #2 or #3 author, or <=6 authors total
    speagle_pos = next((i + 1 for i, a in enumerate(authors) if _is_speagle(a)), 99)
    if speagle_pos in (2, 3):
        return "significant", f"Speagle is author #{speagle_pos} of {len(authors)}"
    if len(authors) <= 5 and speagle_pos <= 5:
        return "significant", f"Small-group paper ({len(authors)} authors, Speagle #{speagle_pos})"

    return "other", f"Co-author (Speagle #{speagle_pos} of {len(authors)})"


def _arxiv_from_bibcode(bibcode: str) -> Optional[str]:
    m = re.match(r"^\d{4}arXiv(\d{4})(\d{5})", str(bibcode or "").strip(), re.I)
    return f"{m.group(1)}.{m.group(2)}" if m else None


def audit_ads_libraries(content: Dict, pub_data: Dict, cache: Dict[str, List[str]]) -> Dict:
    """Compare publications_data.json against ads_library_cache.json and propose updates."""
    mentee_index = build_mentee_index(content)
    libraries = content.get("sections", {}).get("publications", {}).get("libraries", {})

    # Build lookup sets per library (both literal bibcode and arXiv id equivalent)
    lib_bibs: Dict[str, Set[str]] = {}
    lib_arxivs: Dict[str, Set[str]] = {}
    for key in ("all", "primary", "postdoc", "student", "significant"):
        bibs = set(cache.get(key, []) or [])
        lib_bibs[key] = bibs
        lib_arxivs[key] = {a for b in bibs for a in [_arxiv_from_bibcode(b)] if a}

    def _in_lib(pub: Dict, lib_key: str) -> bool:
        bib = (pub.get("bibcode") or "").strip()
        arx = str(pub.get("arxivId") or "").strip().lower()
        arx = re.sub(r"^arxiv:", "", arx)
        arx = re.sub(r"v\d+$", "", arx)
        if bib and bib in lib_bibs[lib_key]:
            return True
        if bib:
            b_arx = _arxiv_from_bibcode(bib)
            if b_arx and b_arx in lib_arxivs[lib_key]:
                return True
        if arx and arx in lib_arxivs[lib_key]:
            return True
        return False

    missing_from_all = []
    proposed_role_additions = []
    role_mismatches = []

    for pub in pub_data.get("publications", []) or []:
        bibcode = (pub.get("bibcode") or "").strip()
        if not bibcode:
            continue

        in_all = _in_lib(pub, "all")
        if not in_all:
            missing_from_all.append({
                "bibcode": bibcode,
                "title": pub.get("title", ""),
                "year": pub.get("year"),
                "library_id": libraries.get("total", "YiaebBefTHKZdblrny2Vsw"),
            })

        current_roles = [r for r in ("primary", "postdoc", "student", "significant") if _in_lib(pub, r)]
        inferred_role, reason = classify_paper_role(pub, mentee_index)

        if not current_roles and inferred_role in ("primary", "postdoc", "student", "significant"):
            proposed_role_additions.append({
                "bibcode": bibcode,
                "title": pub.get("title", ""),
                "year": pub.get("year"),
                "proposed_role": inferred_role,
                "library_id": libraries.get(inferred_role, ""),
                "reason": reason,
            })
        elif current_roles and inferred_role in ("primary", "student", "postdoc") and inferred_role not in current_roles:
            role_mismatches.append({
                "bibcode": bibcode,
                "title": pub.get("title", ""),
                "year": pub.get("year"),
                "current_roles": current_roles,
                "inferred_role": inferred_role,
                "reason": reason,
            })

    return {
        "libraries": libraries,
        "missing_from_all": missing_from_all,
        "proposed_role_additions": proposed_role_additions,
        "role_mismatches": role_mismatches,
    }


def push_to_ads_library(library_id: str, bibcodes: List[str], api_key: str) -> Tuple[bool, str]:
    """Add bibcodes to a live NASA ADS library via POST /v1/biblib/documents/<library_id>."""
    if not bibcodes:
        return True, "No bibcodes to add"
    url = ADS_BIBLIB_DOCUMENTS_URL.format(library_id=library_id)
    payload = json.dumps({"bibcode": bibcodes, "action": "add"}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            return True, body
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        return False, f"HTTP {e.code}: {err_body}"
    except Exception as e:
        return False, str(e)


def main():
    parser = argparse.ArgumentParser(description="Audit and curate NASA ADS authorship libraries.")
    parser.add_argument("--apply-cache", action="store_true", help="Write proposed additions into assets/data/ads_library_cache.json")
    parser.add_argument("--push-ads", action="store_true", help="Push proposed bibcodes to live NASA ADS libraries via REST API")
    parser.add_argument("--json", type=str, default=None, help="Write JSON report to path")
    args = parser.parse_args()

    content = json.loads(CONTENT_JSON.read_text(encoding="utf-8"))
    pub_data = json.loads(PUBLICATIONS_JSON.read_text(encoding="utf-8"))
    cache = json.loads(LIBRARY_CACHE_JSON.read_text(encoding="utf-8")) if LIBRARY_CACHE_JSON.exists() else {}

    report = audit_ads_libraries(content, pub_data, cache)

    print(f"ADS Library Curation Audit ({len(pub_data.get('publications', []))} site papers):")
    print(f"  - Papers missing from 'all' library: {len(report['missing_from_all'])}")
    print(f"  - Unclassified papers with proposed role library: {len(report['proposed_role_additions'])}")
    print(f"  - Potential mentee/primary role upgrades to review: {len(report['role_mismatches'])}")

    if report["missing_from_all"]:
        print("\nMissing from 'all' ADS Library:")
        for item in report["missing_from_all"]:
            print(f"  + [{item['bibcode']}] ({item['year']}) {item['title'][:72]}")

    if report["proposed_role_additions"]:
        print("\nProposed Role Library Additions:")
        for item in report["proposed_role_additions"]:
            print(f"  + [{item['proposed_role'].upper()}] {item['bibcode']} ({item['year']}) — {item['title'][:60]} ({item['reason']})")

    if args.apply_cache:
        changed = False
        for item in report["missing_from_all"]:
            all_list = cache.setdefault("all", [])
            if item["bibcode"] not in all_list:
                all_list.insert(0, item["bibcode"])
                changed = True
        for item in report["proposed_role_additions"]:
            role = item["proposed_role"]
            role_list = cache.setdefault(role, [])
            if item["bibcode"] not in role_list:
                role_list.insert(0, item["bibcode"])
                changed = True
        if changed:
            LIBRARY_CACHE_JSON.write_text(json.dumps(cache, indent=2) + "\n", encoding="utf-8")
            print(f"\nUpdated {LIBRARY_CACHE_JSON}")
        else:
            print("\nNo changes needed in ads_library_cache.json")

    if args.push_ads:
        api_key = _load_env_key("ADS_API_KEY")
        if not api_key:
            print("\nERROR: ADS_API_KEY not found in environment or .env; cannot push to live ADS libraries.", file=sys.stderr)
            sys.exit(1)
        by_lib: Dict[str, List[str]] = {}
        for item in report["missing_from_all"]:
            by_lib.setdefault(item["library_id"], []).append(item["bibcode"])
        for item in report["proposed_role_additions"]:
            if item["library_id"]:
                by_lib.setdefault(item["library_id"], []).append(item["bibcode"])
        for lib_id, bibs in by_lib.items():
            ok, msg = push_to_ads_library(lib_id, bibs, api_key)
            status = "OK" if ok else "FAILED"
            print(f"  [{status}] ADS library {lib_id} (+{len(bibs)} bibcodes): {msg}")

    if args.json:
        Path(args.json).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
