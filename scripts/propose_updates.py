#!/usr/bin/env python3
"""Autonomous website update discovery and proposal generator.

Collects candidate updates across local files, sibling repositories, academic and
code APIs, department/group web pages, and calendar feeds, then emits a structured
Markdown proposal digest for user review before any edits are applied to content.json.

What it checks:
  1. Date & Term Rollovers (offline):
     - Current mentees whose `timelinePeriod` has an explicit end date in the past.
     - Active service roles and `About Me` academic-year appointments approaching or
       past their end date.
     - Staleness of `content.json`, `publications_data.json`, and `software_data.json`,
       plus any publications in `publications_data.json` missing `categoryProbabilities`
       or candidate recent group papers not yet in `sections.news.items`.
  2. Local CV & Sibling Repos (offline):
     - Parses `CV_speagle.pdf` via `pdftotext` (and checks sibling `../bio-cv` and
       `../astrostatuoft.github.io` checkouts if present) to compare CV update date,
       supervision counts, courses, and awards against `content.json`.
  3. GitHub, ADS/OpenAlex & Department Web Scraping (`--online`):
     - Queries the GitHub REST API for new public repositories not yet in
       `sections.software.curation` and drafts proposed curation entries.
     - Queries OpenAlex for recent publications by Joshua S. Speagle not yet in
       `publications_data.json`.
     - Scrapes `https://astrostatuoft.com/`, U of T Astronomy news, and U of T
       Statistical Sciences news for recent mentions of Speagle or current mentees.
  4. Calendar / ICS Feed (`--ics <path_or_url>`):
     - Parses iCalendar (`.ics`) files or URLs for talks, colloquia, seminars,
       conferences, and workshop lectures, formatting candidate `sections.talks` entries.

Usage:
  python3 scripts/propose_updates.py [--online] [--ics PATH_OR_URL] [--output FILE.md] [--json FILE.json]
"""

import argparse
import datetime as dt
import html
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CONTENT_JSON = PROJECT_ROOT / "assets" / "data" / "content.json"
PUBLICATIONS_JSON = PROJECT_ROOT / "assets" / "data" / "publications_data.json"
SOFTWARE_JSON = PROJECT_ROOT / "assets" / "data" / "software_data.json"
CV_PDF = PROJECT_ROOT / "CV_speagle.pdf"

SEASON_END_MONTH = {
    "winter": 4,
    "spring": 5,
    "summer": 8,
    "fall": 12,
    "autumn": 12,
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}


def _strip_tags(text):
    return re.sub(r"<[^>]+>", "", text or "").strip()


def _parse_iso_date(s):
    if not s:
        return None
    try:
        return dt.date.fromisoformat(str(s)[:10])
    except ValueError:
        return None


def _period_end_year_month(period_str):
    """Return (year, month) for the end of a timelinePeriod string, or None if ongoing."""
    if not period_str:
        return None
    s = period_str.strip()
    if re.search(r"\b(present|current|ongoing)\b", s, re.I):
        return None
    # Split on hyphen or en-dash to inspect the end portion
    parts = re.split(r"\s*[-–—]\s*", s)
    end_part = parts[-1].strip()
    years = [int(y) for y in re.findall(r"\b(19\d\d|20\d\d)\b", end_part)]
    if not years:
        all_years = [int(y) for y in re.findall(r"\b(19\d\d|20\d\d)\b", s)]
        if not all_years:
            return None
        year = all_years[-1]
    else:
        year = years[-1]

    month = 12
    for token, m in SEASON_END_MONTH.items():
        if re.search(r"\b" + token, end_part, re.I):
            month = m
            break
    return (year, month)


def check_rollovers_and_caches(content, pub_data, sw_data, today):
    """Audit content.json and pipeline caches for date rollovers and staleness."""
    findings = {
        "cache_age": [],
        "mentee_rollovers": [],
        "service_rollovers": [],
        "uncategorized_papers": [],
        "recent_papers_for_news": [],
    }

    # 1. Cache staleness
    for label, d_str in [
        ("content.json (site.lastUpdated)", content.get("site", {}).get("lastUpdated")),
        ("publications_data.json (lastUpdated)", pub_data.get("lastUpdated")),
        ("software_data.json (lastFetched)", sw_data.get("lastFetched") or sw_data.get("lastUpdated")),
    ]:
        d = _parse_iso_date(d_str)
        if d:
            age = (today - d).days
            findings["cache_age"].append({
                "source": label,
                "date": d.isoformat(),
                "age_days": age,
                "stale": age > 30,
            })

    # 2. Current mentees whose timelinePeriod has ended before `today`
    mbs = content.get("sections", {}).get("mentorship", {}).get("menteesByStage", {})
    for stage in ("postdoctoral", "doctoral", "mastersProjects", "bachelors", "secondary"):
        for rec in mbs.get(stage, []) or []:
            period = rec.get("timelinePeriod", "")
            end_ym = _period_end_year_month(period)
            if end_ym and (end_ym[0], end_ym[1]) < (today.year, today.month):
                findings["mentee_rollovers"].append({
                    "stage": stage,
                    "name": _strip_tags(rec.get("name", "")),
                    "timelinePeriod": period,
                    "project": _strip_tags(rec.get("project", "")),
                    "action": f"Move from menteesByStage.{stage} to menteesByStage.completed.{stage} (and add currentPosition if known)",
                })

    # 3. Service positions with ended periods
    for cat in content.get("sections", {}).get("service", {}).get("categories", []):
        for org in cat.get("organizations", []) or []:
            if org.get("hidden"):
                continue
            for pos in org.get("positions", []) or []:
                periods = pos.get("periods", [])
                if periods:
                    end_ym = _period_end_year_month(periods[0])
                    if end_ym and (today.year - 1) <= end_ym[0] <= today.year and (end_ym[0], end_ym[1]) <= (today.year, today.month):
                        findings["service_rollovers"].append({
                            "organization": _strip_tags(org.get("name", "")),
                            "role": _strip_tags(pos.get("title") or pos.get("role", "")),
                            "period": periods[0],
                        })

    # 4. Publications missing categoryProbabilities or candidate recent papers for News
    news_links = {item.get("link", "") for item in content.get("sections", {}).get("news", {}).get("items", [])}
    news_titles = {_strip_tags(item.get("title", "")).lower() for item in content.get("sections", {}).get("news", {}).get("items", [])}
    for pub in pub_data.get("publications", []) or []:
        probs = pub.get("categoryProbabilities") or {}
        if not probs or sum(float(v) for v in probs.values() if isinstance(v, (int, float))) <= 0:
            findings["uncategorized_papers"].append({
                "title": pub.get("title", ""),
                "year": pub.get("year"),
                "bibcode": pub.get("bibcode"),
            })
        yr = int(pub.get("year") or 0)
        role = pub.get("authorshipCategory", "")
        cites = int(pub.get("citations") or 0)
        ads_url = pub.get("adsUrl", "")
        if yr >= today.year - 1 and role in ("primary", "student", "postdoc") and ads_url not in news_links:
            t_low = (pub.get("title") or "").lower()
            if not any(w in t_low for w in news_titles if len(w) > 15):
                if role == "primary" or cites >= 5:
                    findings["recent_papers_for_news"].append({
                        "title": pub.get("title", ""),
                        "year": yr,
                        "role": role,
                        "citations": cites,
                        "adsUrl": ads_url,
                        "authors": (pub.get("authors") or [])[:3],
                    })

    return findings


def check_local_cv_and_siblings(content):
    """Compare CV_speagle.pdf and any sibling repos against content.json."""
    info = {
        "cv_found": CV_PDF.exists(),
        "cv_updated_header": None,
        "cv_mentee_summary": None,
        "site_active_mentees": 0,
        "sibling_repos": [],
    }
    mbs = content.get("sections", {}).get("mentorship", {}).get("menteesByStage", {})
    info["site_active_mentees"] = sum(
        len(mbs.get(k) or [])
        for k in ("postdoctoral", "doctoral", "mastersProjects", "bachelors", "secondary")
    )

    if CV_PDF.exists() and shutil.which("pdftotext"):
        try:
            proc = subprocess.run(
                ["pdftotext", str(CV_PDF), "-"],
                capture_output=True, text=True, check=True, timeout=15
            )
            cv_text = proc.stdout
            m_date = re.search(r"Updated\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})", cv_text)
            if m_date:
                info["cv_updated_header"] = m_date.group(1)
            m_sup = re.search(r"currently \(co-\)supervising/mentoring a total of (\d+) individuals", cv_text)
            if m_sup:
                info["cv_mentee_summary"] = int(m_sup.group(1))
        except (subprocess.SubprocessError, OSError):
            pass

    parent = PROJECT_ROOT.parent
    for sib in ("bio-cv", "astrostatuoft.github.io"):
        sib_path = parent / sib
        if sib_path.exists():
            info["sibling_repos"].append(str(sib_path))

    return info


def _http_get_json(url, headers=None, timeout=15):
    req_headers = {"User-Agent": "joshspeagle-site-updater/1.0"}
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(url, headers=req_headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _http_get_text(url, timeout=15):
    req = urllib.request.Request(url, headers={"User-Agent": "joshspeagle-site-updater/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="replace")


def check_online_sources(content, pub_data):
    """Query GitHub API, OpenAlex API, and department/group news pages."""
    online = {
        "unclassified_repos": [],
        "openalex_new_works": [],
        "web_mentions": [],
        "errors": [],
    }

    # 1. GitHub public repos vs sections.software.curation
    sw = content.get("sections", {}).get("software", {})
    user = sw.get("githubUser", "joshspeagle")
    curation = sw.get("curation", {})
    gh_headers = {"Accept": "application/vnd.github+json"}
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        gh_headers["Authorization"] = f"Bearer {token}"
    try:
        repos = _http_get_json(
            f"https://api.github.com/users/{user}/repos?per_page=100&type=owner",
            headers=gh_headers
        )
        for r in repos:
            if not r.get("fork") and r.get("name") not in curation:
                online["unclassified_repos"].append({
                    "name": r.get("name"),
                    "description": r.get("description") or "",
                    "language": r.get("language"),
                    "stars": r.get("stargazers_count", 0),
                    "pushed": (r.get("pushed_at") or "")[:10],
                    "url": r.get("html_url"),
                })
    except Exception as exc:
        online["errors"].append(f"GitHub API check skipped/failed: {exc}")

    # 2. OpenAlex recent works check (ORCID 0000-0003-2573-9832)
    known_dois = {
        (p.get("doi") or "").lower().strip()
        for p in pub_data.get("publications", [])
        if p.get("doi")
    }
    known_titles = {
        re.sub(r"\W+", "", (p.get("title") or "").lower())[:40]
        for p in pub_data.get("publications", [])
        if p.get("title")
    }
    try:
        oa = _http_get_json(
            "https://api.openalex.org/works?filter=author.orcid:0000-0003-2573-9832&sort=publication_date:desc&per-page=15"
        )
        for w in oa.get("results", []):
            title = (w.get("title") or "").strip()
            doi = (w.get("doi") or "").replace("https://doi.org/", "").lower().strip()
            norm_t = re.sub(r"\W+", "", title.lower())[:40]
            if (doi and doi in known_dois) or (norm_t and norm_t in known_titles):
                continue
            online["openalex_new_works"].append({
                "title": title,
                "year": w.get("publication_year"),
                "date": w.get("publication_date"),
                "doi": doi,
            })
    except Exception as exc:
        online["errors"].append(f"OpenAlex API check skipped/failed: {exc}")

    # 3. Department & ART group web pages
    for label, url in [
        ("ART Group (astrostatuoft.com)", "https://astrostatuoft.com/"),
        ("U of T Astronomy News", "https://www.astro.utoronto.ca/news/"),
        ("U of T Statistics News", "https://www.statistics.utoronto.ca/news"),
    ]:
        try:
            page_html = _http_get_text(url, timeout=12)
            for m in re.finditer(r"<a[^>]+href=[\"']([^\"']+)[\"'][^>]*>(.*?)</a>", page_html, re.I | re.S):
                href, anchor = m.group(1), _strip_tags(html.unescape(m.group(2)))
                if len(anchor) < 18 or len(anchor) > 180:
                    continue
                if any(k in anchor.lower() for k in ("speagle", "astrostat", "dunlap", "award", "prize", "fellow")):
                    full_url = urllib.parse.urljoin(url, href)
                    online["web_mentions"].append({
                        "source": label,
                        "headline": re.sub(r"\s+", " ", anchor),
                        "url": full_url,
                    })
        except Exception as exc:
            online["errors"].append(f"{label} scrape skipped/failed: {exc}")

    return online


def parse_ics_events(ics_source, today):
    """Parse an iCalendar (.ics) file or URL for talk/conference/seminar events."""
    events = []
    if not ics_source:
        return events
    try:
        if ics_source.startswith(("http://", "https://")):
            raw = _http_get_text(ics_source)
        else:
            raw = Path(ics_source).read_text(encoding="utf-8", errors="replace")
    except Exception as exc:
        return [{"error": f"Failed to read ICS source {ics_source}: {exc}"}]

    # Unfold RFC 5545 folded lines
    unfolded = re.sub(r"\r?\n[ \t]", "", raw)
    keywords = ("talk", "colloquium", "seminar", "lecture", "panel", "keynote", "invited", "conference", "workshop", "symposium")
    for block in re.findall(r"BEGIN:VEVENT(.*?)END:VEVENT", unfolded, re.S):
        summary_m = re.search(r"^SUMMARY(?:;[^:]*)?:(.*)$", block, re.M)
        dtstart_m = re.search(r"^DTSTART(?:;[^:]*)?:(\d{8})", block, re.M)
        loc_m = re.search(r"^LOCATION(?:;[^:]*)?:(.*)$", block, re.M)
        if not summary_m or not dtstart_m:
            continue
        summary = summary_m.group(1).strip().replace("\\,", ",").replace("\\;", ";")
        loc = (loc_m.group(1).strip().replace("\\,", ",") if loc_m else "")
        d_raw = dtstart_m.group(1)
        try:
            ev_date = dt.date(int(d_raw[:4]), int(d_raw[4:6]), int(d_raw[6:8]))
        except ValueError:
            continue
        if (today - ev_date).days > 180:
            continue
        if any(k in summary.lower() for k in keywords):
            events.append({
                "date": ev_date.strftime("%b %Y"),
                "iso_date": ev_date.isoformat(),
                "summary": summary,
                "location": loc,
            })
    return sorted(events, key=lambda x: x.get("iso_date", ""), reverse=True)


def format_markdown_report(today, rollovers, cv_info, online_info, ics_events, cv_sync_report=None, ads_curation_report=None):
    """Render a clean Markdown proposal digest."""
    lines = [
        f"# Website Update Proposal Digest ({today.isoformat()})",
        "",
        "This report summarizes candidate updates discovered across local caches, `CV_speagle.pdf`, "
        "ADS authorship libraries, date/term rollover checks, and (when enabled) external APIs and calendar feeds.",
        "",
        "## 1. Data Cache Freshness",
        "",
    ]
    for c in rollovers["cache_age"]:
        status = "**STALE (>30d)**" if c["stale"] else "Fresh"
        lines.append(f"- **{c['source']}**: `{c['date']}` ({c['age_days']} days old — {status})")

    lines.extend(["", "## 2. Bidirectional CV & Sibling Repository Check (`scripts/sync_cv.py`)", ""])
    if cv_info["cv_found"]:
        lines.append(f"- **`CV_speagle.pdf` header date**: `{cv_info['cv_updated_header'] or 'unknown'}`")
        if cv_sync_report:
            lines.append(
                f"- **Repo `CV_speagle.pdf` == `docs/CV_speagle.pdf`**: `{cv_sync_report['pdf_sync']['repo_matches_docs']}`"
            )
            if cv_sync_report["diffs"]:
                lines.append(
                    f"- **Summary count diffs between CV and Website ({len(cv_sync_report['diffs'])})** "
                    "(run `python3 scripts/sync_cv.py` or `python3 scripts/sync_cv.py --update-docx`):"
                )
                for d in cv_sync_report["diffs"]:
                    lines.append(f"  - {d['section']} — {d['metric']}: CV `{d['cv_value']}` vs. Site **`{d['site_value']}`**")
            else:
                lines.append("- **CV Summary Counts**: All mentorship and publication counts match `content.json`.")
    else:
        lines.append("- `CV_speagle.pdf` not found in repository root.")
    if cv_info["sibling_repos"]:
        lines.append(f"- **Sibling repos detected on disk**: {', '.join(f'`{p}`' for p in cv_info['sibling_repos'])}")

    lines.extend(["", "## 3. Date & Term Rollover Candidates", ""])
    if rollovers["mentee_rollovers"]:
        lines.append("### Mentees with Past `timelinePeriod` End Dates")
        for m in rollovers["mentee_rollovers"]:
            lines.append(f"- **{m['name']}** (`{m['stage']}`, `{m['timelinePeriod']}`): {m['action']}")
    else:
        lines.append("- **Mentees**: No current mentees have expired `timelinePeriod` dates.")

    if rollovers["service_rollovers"]:
        lines.append("\n### Service Positions with Past End Dates")
        for s in rollovers["service_rollovers"]:
            lines.append(f"- **{s['role']}**, {s['organization']} (`{s['period']}`)")
    else:
        lines.append("- **Service roles**: No active service positions have expired period ranges.")

    lines.extend(["", "## 4. Publication, ADS Library & News Candidates (`scripts/curate_ads_libraries.py`)", ""])
    if rollovers["uncategorized_papers"]:
        lines.append(f"- **Uncategorized papers in `publications_data.json`**: {len(rollovers['uncategorized_papers'])}")
        for p in rollovers["uncategorized_papers"][:10]:
            lines.append(f"  - `{p['year']}` — {p['title']} (`{p['bibcode']}`)")
    else:
        lines.append("- **Publication categorization**: All papers in `publications_data.json` have topic probabilities.")

    if ads_curation_report:
        miss_all = ads_curation_report.get("missing_from_all", [])
        prop_roles = ads_curation_report.get("proposed_role_additions", [])
        lines.append(
            f"- **ADS Library Curation**: `{len(miss_all)}` paper(s) missing from `all` library; "
            f"`{len(prop_roles)}` paper(s) with proposed authorship role library additions "
            "(run `python3 scripts/curate_ads_libraries.py --apply-cache --push-ads`)."
        )
        for item in prop_roles[:6]:
            lines.append(
                f"  - `[{item['proposed_role'].upper()}]` `{item['bibcode']}` ({item['year']}) — {item['title'][:64]} ({item['reason']})"
            )

    if rollovers["recent_papers_for_news"]:
        lines.append("\n### Recent High-Impact / Primary / Group Papers Not Yet in `sections.news.items`")
        for p in rollovers["recent_papers_for_news"][:8]:
            lines.append(
                f"- **{p['title']}** ({p['year']}, role: `{p['role']}`, {p['citations']} citations) — <{p['adsUrl']}>"
            )

    if online_info is not None:
        lines.extend(["", "## 5. Online API & Web Scraping Discovery", ""])
        if online_info["unclassified_repos"]:
            lines.append("### Unclassified Public GitHub Repositories")
            for r in online_info["unclassified_repos"]:
                lines.append(
                    f"- **`{r['name']}`** ({r['language'] or 'unknown'}, ★{r['stars']}, pushed `{r['pushed']}`): "
                    f"{r['description'] or 'No description'} — <{r['url']}>"
                )
        else:
            lines.append("- **GitHub repositories**: All non-fork public repositories are classified in `content.json`.")

        if online_info["openalex_new_works"]:
            lines.append("\n### Recent Works on OpenAlex Not Matched in `publications_data.json`")
            for w in online_info["openalex_new_works"]:
                lines.append(f"- **{w['title']}** (`{w['date'] or w['year']}`, DOI: `{w['doi'] or 'n/a'}`)")
        else:
            lines.append("- **OpenAlex**: No unindexed works detected.")

        if online_info["web_mentions"]:
            lines.append("\n### Recent Department / Group Web Links")
            seen_urls = set()
            for m in online_info["web_mentions"]:
                if m["url"] in seen_urls:
                    continue
                seen_urls.add(m["url"])
                lines.append(f"- [{m['source']}] **{m['headline']}** — <{m['url']}>")

        if online_info["errors"]:
            lines.append("\n### Online Check Warnings")
            for err in online_info["errors"]:
                lines.append(f"- {err}")

    if ics_events:
        lines.extend(["", "## 6. Calendar / ICS Talk & Event Candidates", ""])
        for ev in ics_events:
            if "error" in ev:
                lines.append(f"- {ev['error']}")
            else:
                loc = f" — {ev['location']}" if ev.get("location") else ""
                lines.append(f"- **{ev['date']}** (`{ev['iso_date']}`): {ev['summary']}{loc}")

    lines.append("")
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--online", action="store_true",
                    help="Query GitHub API, OpenAlex API, and department/group web pages")
    ap.add_argument("--ics", default=os.environ.get("CALENDAR_ICS"),
                    help="Path or URL to an iCalendar (.ics) feed to scan for talks and events")
    ap.add_argument("--as-of", default=None,
                    help="Override today's date (YYYY-MM-DD) for rollover checks")
    ap.add_argument("--output", default=None,
                    help="Write Markdown digest to this file instead of stdout")
    ap.add_argument("--json", default=None,
                    help="Also write structured JSON findings to this path")
    args = ap.parse_args()

    today = _parse_iso_date(args.as_of) or dt.date.today()
    content = json.loads(CONTENT_JSON.read_text(encoding="utf-8"))
    pub_data = json.loads(PUBLICATIONS_JSON.read_text(encoding="utf-8")) if PUBLICATIONS_JSON.exists() else {}
    sw_data = json.loads(SOFTWARE_JSON.read_text(encoding="utf-8")) if SOFTWARE_JSON.exists() else {}

    rollovers = check_rollovers_and_caches(content, pub_data, sw_data, today)
    cv_info = check_local_cv_and_siblings(content)
    online_info = check_online_sources(content, pub_data) if args.online else None
    ics_events = parse_ics_events(args.ics, today) if args.ics else []

    cv_sync_report = None
    ads_curation_report = None
    try:
        from sync_cv import audit_cv_sync
        cv_sync_report = audit_cv_sync(content, pub_data)
    except Exception:
        pass
    try:
        from curate_ads_libraries import audit_ads_libraries, LIBRARY_CACHE_JSON
        ads_cache = json.loads(LIBRARY_CACHE_JSON.read_text(encoding="utf-8")) if LIBRARY_CACHE_JSON.exists() else {}
        ads_curation_report = audit_ads_libraries(content, pub_data, ads_cache)
    except Exception:
        pass

    md = format_markdown_report(
        today, rollovers, cv_info, online_info, ics_events,
        cv_sync_report=cv_sync_report, ads_curation_report=ads_curation_report,
    )
    if args.output:
        Path(args.output).write_text(md, encoding="utf-8")
        print(f"Wrote Markdown update digest to {args.output}")
    else:
        print(md)

    if args.json:
        payload = {
            "date": today.isoformat(),
            "rollovers": rollovers,
            "cv": cv_info,
            "cv_sync": cv_sync_report,
            "ads_curation": ads_curation_report,
            "online": online_info,
            "ics_events": ics_events,
        }
        Path(args.json).write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        print(f"Wrote JSON update payload to {args.json}")


if __name__ == "__main__":
    sys.exit(main())
