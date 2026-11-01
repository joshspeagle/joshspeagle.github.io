#!/usr/bin/env python3
"""Bidirectional CV <-> Website synchronization and audit utility.

Compares the website data (`assets/data/content.json` and
`assets/data/publications_data.json`) against Joshua S. Speagle's 2-page CV
(`/mnt/d/Dropbox/CV/CV_speagle.docx`, `/mnt/d/Dropbox/CV/CV_speagle.pdf`,
`CV_speagle.pdf`, and `docs/CV_speagle.pdf`).

What it checks & synchronizes:
  1. Supervision & Mentorship Summary Counts:
     - Active total (`I am currently (co-)supervising/mentoring a total of N individuals`)
     - Breakdown by stage (`postdoctoral researchers`, `doctoral students`,
       `MSc students/projects`, `undergraduate students`)
     - Cumulative total (`full record of the N individuals I have (co-)supervised/mentored`)
  2. Publication & Citation Summary Counts:
     - Total papers (`author on N+ papers`), citation floor (`C+ citations`),
       and `h-index=H`
     - Breakdown by authorship role (`primary/co-first author`,
       `significant contributions`, `led by postdocs`, `led by students`)
  3. Service & Governance Roles:
     - Compares service entries in `content.json` against the CV's
       `SELECTED PROFESSIONAL ACTIVITIES & SERVICE` section.
  4. PDF File Sync (`--sync-pdf`) & DOCX Update (`--update-docx`):
     - Keeps `CV_speagle.pdf` and `docs/CV_speagle.pdf` identical to
       `/mnt/d/Dropbox/CV/CV_speagle.pdf`, and can update the summary numbers in
       `/mnt/d/Dropbox/CV/CV_speagle.docx` directly.

Usage:
  python3 scripts/sync_cv.py
  python3 scripts/sync_cv.py --sync-pdf
  python3 scripts/sync_cv.py --update-docx
"""

import argparse
from collections import Counter
import datetime as dt
import hashlib
import json
import re
import shutil
import subprocess
import zipfile
from pathlib import Path
from typing import Dict, List, Optional
import xml.etree.ElementTree as ET

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CONTENT_JSON = PROJECT_ROOT / "assets" / "data" / "content.json"
PUBLICATIONS_JSON = PROJECT_ROOT / "assets" / "data" / "publications_data.json"
REPO_CV_PDF = PROJECT_ROOT / "CV_speagle.pdf"
DOCS_CV_PDF = PROJECT_ROOT / "docs" / "CV_speagle.pdf"
DROPBOX_CV_DIR = Path("/mnt/d/Dropbox/CV")
DROPBOX_CV_DOCX = DROPBOX_CV_DIR / "CV_speagle.docx"
DROPBOX_CV_PDF = DROPBOX_CV_DIR / "CV_speagle.pdf"


def _strip_tags(text: str) -> str:
    return re.sub(r"<[^>]+>", "", str(text or "")).strip()


def _sha256(path: Path) -> Optional[str]:
    if not path.exists():
        return None
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _extract_docx_text(docx_path: Path) -> str:
    if not docx_path.exists():
        return ""
    try:
        with zipfile.ZipFile(docx_path, "r") as zf:
            xml_bytes = zf.read("word/document.xml")
        root = ET.fromstring(xml_bytes)
        ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
        paragraphs = []
        for p in root.findall(".//w:p", ns):
            texts = [t.text for t in p.findall(".//w:t", ns) if t.text]
            if texts:
                paragraphs.append("".join(texts))
        return "\n".join(paragraphs)
    except Exception:
        return ""


def _extract_pdf_text(pdf_path: Path) -> str:
    if not pdf_path.exists() or not shutil.which("pdftotext"):
        return ""
    try:
        proc = subprocess.run(
            ["pdftotext", str(pdf_path), "-"],
            capture_output=True,
            text=True,
            timeout=15,
            check=False,
        )
        return proc.stdout if proc.returncode == 0 else ""
    except Exception:
        return ""


def _parse_int(pattern: str, text: str) -> Optional[int]:
    m = re.search(pattern, text, re.I)
    if not m:
        return None
    return int(m.group(1).replace(",", ""))


def compute_site_summary(content: Dict, pub_data: Dict) -> Dict:
    """Compute the exact summary counts from content.json and publications_data.json."""
    mbs = content.get("sections", {}).get("mentorship", {}).get("menteesByStage", {})
    completed = mbs.get("completed", {}) or {}

    cur_postdoc = len(mbs.get("postdoctoral", []) or [])
    cur_phd = len(mbs.get("doctoral", []) or [])
    cur_msc = len(mbs.get("mastersProjects", []) or [])
    cur_ug = len(mbs.get("bachelors", []) or [])
    cur_hs = len(mbs.get("secondary", []) or [])
    cur_total = cur_postdoc + cur_phd + cur_msc + cur_ug + cur_hs

    former_total = sum(
        len(completed.get(k, []) or [])
        for k in ("postdoctoral", "doctoral", "mastersProjects", "bachelors", "secondary")
    )
    all_mentees = cur_total + former_total

    pubs = pub_data.get("publications", []) or []
    metrics = pub_data.get("metrics", {}) or {}
    role_counts = Counter(p.get("authorshipCategory", "other") for p in pubs)
    total_cites = int(metrics.get("totalCitations") or 0)
    cite_floor = (total_cites // 1000) * 1000

    return {
        "mentorship": {
            "active_total": cur_total,
            "postdoc": cur_postdoc,
            "doctoral": cur_phd,
            "masters": cur_msc,
            "bachelors": cur_ug,
            "cumulative_total": all_mentees,
        },
        "publications": {
            "total_papers": len(pubs),
            "citations_total": total_cites,
            "citations_floor_str": f"{cite_floor:,}+",
            "h_index": int(metrics.get("hIndex") or 0),
            "primary": role_counts.get("primary", 0),
            "significant": role_counts.get("significant", 0),
            "postdoc": role_counts.get("postdoc", 0),
            "student": role_counts.get("student", 0),
        },
    }


def parse_cv_summary(cv_text: str) -> Dict:
    """Extract the summary numbers currently written in CV_speagle.pdf / CV_speagle.docx."""
    m_date = re.search(r"Updated\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})", cv_text)
    return {
        "updated_header": m_date.group(1) if m_date else None,
        "mentorship": {
            "active_total": _parse_int(r"currently \(co-\)supervising/mentoring a total of (\d+)", cv_text),
            "postdoc": _parse_int(r"(\d+)\s+postdoctoral researchers", cv_text),
            "doctoral": _parse_int(r"(\d+)\s+doctoral students", cv_text),
            "masters": _parse_int(r"(\d+)\s+MSc students/projects", cv_text),
            "bachelors": _parse_int(r"(\d+)\s+undergraduate students", cv_text),
            "cumulative_total": _parse_int(r"full record of the (\d+) individuals", cv_text),
        },
        "publications": {
            "total_papers": _parse_int(r"author on (\d+)\+?\s+papers", cv_text),
            "citations_floor": _parse_int(r"that have ([\d,]+)\+?\s+citations", cv_text),
            "h_index": _parse_int(r"h-index\s*=\s*(\d+)", cv_text),
            "primary": _parse_int(r"(\d+)\s+papers as primary/co-first author", cv_text),
            "significant": _parse_int(r"(\d+)\s+papers with significant contributions", cv_text),
            "postdoc": _parse_int(r"(\d+)\s+papers led by postdocs", cv_text),
            "student": _parse_int(r"(\d+)\s+papers led by students", cv_text),
        },
    }


def audit_cv_sync(content: Dict, pub_data: Dict) -> Dict:
    repo_hash = _sha256(REPO_CV_PDF)
    docs_hash = _sha256(DOCS_CV_PDF)
    dropbox_hash = _sha256(DROPBOX_CV_PDF)

    cv_text = _extract_docx_text(DROPBOX_CV_DOCX)
    cv_source = str(DROPBOX_CV_DOCX) if cv_text else ""
    if not cv_text:
        cv_text = _extract_pdf_text(REPO_CV_PDF) or _extract_pdf_text(DOCS_CV_PDF)
        cv_source = str(REPO_CV_PDF if REPO_CV_PDF.exists() else DOCS_CV_PDF)

    site_summary = compute_site_summary(content, pub_data)
    cv_summary = parse_cv_summary(cv_text)

    diffs = []
    sm = site_summary["mentorship"]
    cm = cv_summary["mentorship"]
    for key, label in [
        ("active_total", "Current mentees total"),
        ("postdoc", "Current postdoctoral researchers"),
        ("doctoral", "Current doctoral students"),
        ("masters", "Current MSc students/projects"),
        ("bachelors", "Current undergraduate students"),
        ("cumulative_total", "Cumulative mentees total"),
    ]:
        if cm.get(key) is not None and cm.get(key) != sm.get(key):
            diffs.append({
                "section": "Supervision & Mentorship",
                "metric": label,
                "cv_value": cm.get(key),
                "site_value": sm.get(key),
            })

    sp = site_summary["publications"]
    cp = cv_summary["publications"]
    for key, label in [
        ("total_papers", "Total papers"),
        ("h_index", "Google Scholar h-index"),
        ("primary", "Primary/co-first author papers"),
        ("significant", "Significant contribution papers"),
        ("postdoc", "Postdoc-led papers"),
        ("student", "Student-led papers"),
    ]:
        if cp.get(key) is not None and cp.get(key) != sp.get(key):
            diffs.append({
                "section": "Publications",
                "metric": label,
                "cv_value": cp.get(key),
                "site_value": sp.get(key),
            })

    # Also check new service roles in content.json not mentioned in CV text
    cv_lower = cv_text.lower()
    missing_service = []
    for cat in content.get("sections", {}).get("service", {}).get("categories", []):
        for org in cat.get("organizations", []) or []:
            if org.get("hidden"):
                continue
            org_name = _strip_tags(org.get("name", ""))
            for pos in org.get("positions", []) or []:
                role = _strip_tags(pos.get("title") or pos.get("role", ""))
                periods = pos.get("periods", [])
                period_str = ", ".join(periods)
                if "2025" in period_str or "2026" in period_str or "Present" in period_str:
                    probe = role.split("(")[0].strip().lower()
                    if probe and len(probe) >= 6 and probe not in cv_lower:
                        missing_service.append(f"{org_name}: {role} ({period_str})")

    return {
        "cv_source": cv_source,
        "cv_updated_header": cv_summary["updated_header"],
        "pdf_sync": {
            "repo_matches_docs": repo_hash == docs_hash and repo_hash is not None,
            "repo_matches_dropbox": (repo_hash == dropbox_hash) if dropbox_hash else None,
        },
        "site_summary": site_summary,
        "cv_summary": cv_summary,
        "diffs": diffs,
        "missing_service_in_cv": missing_service,
    }


def sync_pdf_files() -> List[str]:
    actions = []
    candidates = [p for p in (DROPBOX_CV_PDF, REPO_CV_PDF, DOCS_CV_PDF) if p.exists()]
    if not candidates:
        return ["No CV_speagle.pdf found to sync."]
    newest = max(candidates, key=lambda p: p.stat().st_mtime)
    newest_hash = _sha256(newest)
    for target in (REPO_CV_PDF, DOCS_CV_PDF):
        if target != newest and _sha256(target) != newest_hash:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(newest, target)
            actions.append(f"Copied {newest} -> {target}")
    if not actions:
        actions.append("CV_speagle.pdf and docs/CV_speagle.pdf are already in sync.")
    return actions


def update_docx_in_place(docx_path: Path, site_summary: Dict) -> List[str]:
    """Update the summary counts and 'Updated <Date>' header inside CV_speagle.docx."""
    if not docx_path.exists():
        return [f"Cannot update {docx_path}: file not accessible in current environment."]

    sm = site_summary["mentorship"]
    sp = site_summary["publications"]
    today_str = dt.date.today().strftime("%B %-d, %Y")

    replacements = [
        (r"Updated\s+[A-Za-z]+\s+\d{1,2},\s+\d{4}", f"Updated {today_str}"),
        (
            r"currently \(co-\)supervising/mentoring a total of \d+ individuals",
            f"currently (co-)supervising/mentoring a total of {sm['active_total']} individuals",
        ),
        (r"\d+\s+postdoctoral researchers", f"{sm['postdoc']} postdoctoral researchers"),
        (r"\d+\s+doctoral students", f"{sm['doctoral']} doctoral students"),
        (r"\d+\s+MSc students/projects", f"{sm['masters']} MSc students/projects"),
        (r"\d+\s+undergraduate students", f"{sm['bachelors']} undergraduate students"),
        (
            r"full record of the \d+ individuals I have \(co-\)supervised/mentored",
            f"full record of the {sm['cumulative_total']} individuals I have (co-)supervised/mentored",
        ),
        (
            r"author on \d+\+ papers that have [\d,]+\+ citations \(h-index=\d+\)",
            f"author on {sp['total_papers']}+ papers that have {sp['citations_floor_str']} citations (h-index={sp['h_index']})",
        ),
        (r"\d+\s+papers as primary/co-first author", f"{sp['primary']} papers as primary/co-first author"),
        (r"\d+\s+papers with significant contributions", f"{sp['significant']} papers with significant contributions"),
        (r"\d+\s+papers led by postdocs", f"{sp['postdoc']} papers led by postdocs"),
        (r"\d+\s+papers led by students", f"{sp['student']} papers led by students"),
    ]

    applied = []
    backup = docx_path.with_suffix(".docx.bak")
    shutil.copy2(docx_path, backup)

    with zipfile.ZipFile(backup, "r") as zin:
        xml_text = zin.read("word/document.xml").decode("utf-8")
        for pat, repl in replacements:
            new_xml, n = re.subn(pat, repl, xml_text)
            if n > 0 and new_xml != xml_text:
                applied.append(f"Updated /{pat}/ -> {repl!r}")
                xml_text = new_xml
        with zipfile.ZipFile(docx_path, "w", zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                if item.filename == "word/document.xml":
                    zout.writestr(item, xml_text.encode("utf-8"))
                else:
                    zout.writestr(item, zin.read(item.filename))

    return applied or ["No matching summary strings changed in CV_speagle.docx."]


def format_report_markdown(report: Dict) -> str:
    sm = report["site_summary"]["mentorship"]
    sp = report["site_summary"]["publications"]
    lines = [
        "# CV <-> Website Synchronization Report",
        "",
        f"- **CV Source Inspected:** `{report['cv_source']}`",
        f"- **CV Header Date:** `{report['cv_updated_header'] or 'Unknown'}`",
        f"- **Repo `CV_speagle.pdf` == `docs/CV_speagle.pdf`:** `{report['pdf_sync']['repo_matches_docs']}`",
        "",
        "## 1. Summary Metric Diffs (CV vs. Website)",
        "",
        "| Section | Metric | CV Value | Website Value |",
        "| :--- | :--- | :---: | :---: |",
    ]
    for d in report["diffs"]:
        lines.append(f"| {d['section']} | {d['metric']} | `{d['cv_value']}` | **`{d['site_value']}`** |")
    if not report["diffs"]:
        lines.append("| All summary counts | In sync | — | — |")

    lines.extend([
        "",
        "## 2. Ready-to-Paste CV Summary Blocks",
        "",
        "### SUPERVISION & MENTORSHIP",
        "```text",
        f"I am currently (co-)supervising/mentoring a total of {sm['active_total']} individuals. This includes:",
        f"  {sm['postdoc']} postdoctoral researchers",
        f"  {sm['doctoral']} doctoral students",
        f"  {sm['masters']} MSc students/projects",
        f"  {sm['bachelors']} undergraduate students",
        f"See my website for a full record of the {sm['cumulative_total']} individuals I have (co-)supervised/mentored.",
        "```",
        "",
        "### PUBLICATIONS",
        "```text",
        f"I am an author on {sp['total_papers']}+ papers that have {sp['citations_floor_str']} citations (h-index={sp['h_index']}). This includes:",
        f"  {sp['primary']} papers as primary/co-first author",
        f"  {sp['significant']} papers with significant contributions",
        f"  {sp['postdoc']} papers led by postdocs",
        f"  {sp['student']} papers led by students",
        "```",
    ])
    if report["missing_service_in_cv"]:
        lines.extend(["", "## 3. Recent Website Service Roles Not Detected in CV", ""])
        for s in report["missing_service_in_cv"]:
            lines.append(f"- {s}")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Bidirectional CV <-> Website sync and audit tool.")
    parser.add_argument("--sync-pdf", action="store_true", help="Sync CV_speagle.pdf and docs/CV_speagle.pdf with newest PDF copy")
    parser.add_argument("--update-docx", action="store_true", help="Update summary counts in /mnt/d/Dropbox/CV/CV_speagle.docx")
    parser.add_argument("--export-patch", type=str, default=None, help="Write Markdown CV sync report to file")
    parser.add_argument("--json", type=str, default=None, help="Write JSON report to file")
    args = parser.parse_args()

    if args.sync_pdf:
        for msg in sync_pdf_files():
            print(msg)

    content = json.loads(CONTENT_JSON.read_text(encoding="utf-8"))
    pub_data = json.loads(PUBLICATIONS_JSON.read_text(encoding="utf-8"))
    report = audit_cv_sync(content, pub_data)

    if args.update_docx:
        for msg in update_docx_in_place(DROPBOX_CV_DOCX, report["site_summary"]):
            print(msg)

    md = format_report_markdown(report)
    print(md)

    if args.export_patch:
        Path(args.export_patch).write_text(md, encoding="utf-8")
    if args.json:
        Path(args.json).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
