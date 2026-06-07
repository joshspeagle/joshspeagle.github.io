#!/usr/bin/env python3
"""Refresh assets/data/software_data.json from GitHub + PyPI (on demand).

Usage:
    cd scripts && python fetch_software.py [--allow-unclassified] [--user joshspeagle]

What it does
------------
1. Pulls every PUBLIC repo for the user from the GitHub REST API (private repos are
   excluded; forks are kept but flagged). Uses $GITHUB_TOKEN if set (higher rate limit).
2. Pulls recent monthly download counts from pypistats.org for any repo whose curation
   entry carries a "pypi" package name.
3. Writes the stats cache that build_html.py / pages_software.py render from.

Explicit classification guarantee
---------------------------------
The curation map lives in content.json -> sections.software.curation. Every NON-FORK
public repo must appear there (with a "group"). If GitHub returns a non-fork repo that
is missing from curation, this script prints it and exits non-zero, so a newly created
repo can never slip onto the site unclassified. Forks are auto-assigned to "scratch".
Pass --allow-unclassified to write the cache anyway (the page will bucket them in scratch).

Stdlib only (no third-party deps), matching the other front-end build scripts.
"""
import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.error

from config import get_data_path

GITHUB_API = "https://api.github.com"
PYPISTATS = "https://pypistats.org/api/packages/{}/recent"
UA = "joshspeagle.com software-page build (urllib)"


def _get_json(url, headers=None, retries=4):
    """GET a URL and parse JSON, with simple backoff on 429/5xx."""
    headers = headers or {}
    headers.setdefault("User-Agent", UA)
    delay = 2
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r), None
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503) and attempt < retries - 1:
                time.sleep(delay)
                delay *= 2
                continue
            return None, f"HTTP {e.code} for {url}"
        except Exception as e:  # noqa: BLE001
            if attempt < retries - 1:
                time.sleep(delay)
                delay *= 2
                continue
            return None, f"{type(e).__name__}: {e}"
    return None, "exhausted retries"


def fetch_repos(user):
    """Return all public repos (incl. forks) for `user` as a list of GitHub repo dicts."""
    headers = {"Accept": "application/vnd.github+json"}
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    repos, page = [], 1
    while True:
        url = f"{GITHUB_API}/users/{user}/repos?per_page=100&page={page}&type=owner&sort=pushed"
        data, err = _get_json(url, headers)
        if err:
            sys.exit(f"ERROR fetching repos (page {page}): {err}\n"
                     "If rate-limited, set GITHUB_TOKEN and retry.")
        if not data:
            break
        repos.extend(data)
        if len(data) < 100:
            break
        page += 1
    # public only
    return [r for r in repos if not r.get("private")]


def fetch_downloads(pkg):
    """Monthly downloads for a PyPI package, or None."""
    data, err = _get_json(PYPISTATS.format(pkg), {"Accept": "application/json"})
    if err or not data:
        print(f"  ! pypistats: no data for {pkg} ({err or 'empty'})")
        return None
    return (data.get("data") or {}).get("last_month")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--user", default=None, help="GitHub username (default: sections.software.githubUser)")
    ap.add_argument("--allow-unclassified", action="store_true",
                    help="write the cache even if non-fork repos are missing from curation")
    args = ap.parse_args()

    content_path = get_data_path("content.json")
    with open(content_path, encoding="utf-8") as f:
        sw = json.load(f)["sections"]["software"]
    curation = sw.get("curation", {})
    user = args.user or sw.get("githubUser", "joshspeagle")

    print(f"Fetching public repos for {user} …")
    gh = fetch_repos(user)
    print(f"  {len(gh)} public repos")

    # reconcile: every non-fork repo must be curated
    unclassified = [r["name"] for r in gh if not r.get("fork") and r["name"] not in curation]
    if unclassified:
        print("\nUNCLASSIFIED non-fork repos (add to sections.software.curation with a group):")
        for n in sorted(unclassified):
            print(f"  - {n}")
        if not args.allow_unclassified:
            sys.exit("\nRefusing to write cache. Classify the repos above (or rerun with "
                     "--allow-unclassified to drop them into 'scratch').")
    missing = [n for n in curation if n not in {r["name"] for r in gh}]
    if missing:
        print(f"\nNote: curated repos no longer public on GitHub (renamed/deleted): {', '.join(sorted(missing))}")

    repos = {}
    for r in gh:
        name = r["name"]
        cur = curation.get(name, {})
        pkg = cur.get("pypi")
        dl = fetch_downloads(pkg) if pkg else None
        repos[name] = {
            "url": r["html_url"],
            "stars": r.get("stargazers_count", 0),
            "forks": r.get("forks_count", 0),
            "language": r.get("language"),
            "description": r.get("description") or "",
            "pushed": (r.get("pushed_at") or "")[:10],
            "archived": bool(r.get("archived")),
            "isFork": bool(r.get("fork")),
            "downloads_month": dl,
        }

    out = {"lastUpdated": time.strftime("%Y-%m-%d"), "githubUser": user, "repos": repos}
    out_path = get_data_path("software_data.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"\nWrote {out_path} ({len(repos)} repos).")


if __name__ == "__main__":
    main()
