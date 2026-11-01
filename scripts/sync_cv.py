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
       `MSc students/projects` [omitted when 0 to save a line on Page 1, and
       automatically restored when > 0], `undergraduate student(s)`)
     - Cumulative total (`full record of the N individuals I have (co-)supervised/mentored`)
  2. Publication & Citation Summary Counts (Non-Overlapping Convention):
     - Total papers (`author on N+ papers`), citation floor (`C+ citations`),
       and `h-index=H`
     - Breakdown by non-overlapping authorship role (`primary/co-first author`,
       `other papers with significant contributions` [excluding student/postdoc-led],
       `led by postdocs`, `led by students`)
  3. Service & Governance Roles:
     - Compares service entries in `content.json` against the CV's
       `SELECTED PROFESSIONAL ACTIVITIES & SERVICE` section.
  4. PDF File Sync (`--sync-pdf`) & DOCX Update (`--update-docx`):
     - Keeps `CV_speagle.pdf` and `docs/CV_speagle.pdf` identical to
       `/mnt/d/Dropbox/CV/CV_speagle.pdf`, and updates the summary numbers in
       `/mnt/d/Dropbox/CV/CV_speagle.docx` directly (automatically omitting or
       restoring the MSc bullet based on whether `masters == 0` or `> 0`).

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
        ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
        paragraphs = []
        with zipfile.ZipFile(docx_path, "r") as zf:
            for member in ("word/header2.xml", "word/header1.xml", "word/document.xml"):
                if member in zf.namelist():
                    root = ET.fromstring(zf.read(member))
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
            "citations_floor": cite_floor,
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
    has_mentorship = "currently (co-)supervising/mentoring" in cv_text
    msc_val = _parse_int(r"(\d+)\s+MSc students/projects", cv_text)
    if msc_val is None and has_mentorship:
        # When active MSc count is 0, the CV omits the MSc bullet to preserve the 2-page budget.
        msc_val = 0
    return {
        "updated_header": m_date.group(1) if m_date else None,
        "mentorship": {
            "active_total": _parse_int(r"currently \(co-\)supervising/mentoring a total of (\d+)", cv_text),
            "postdoc": _parse_int(r"(\d+)\s+postdoctoral researchers?", cv_text),
            "doctoral": _parse_int(r"(\d+)\s+doctoral students?", cv_text),
            "masters": msc_val,
            "bachelors": _parse_int(r"(\d+)\s+undergraduate students?", cv_text),
            "cumulative_total": _parse_int(r"full record of the (\d+) individuals", cv_text),
        },
        "publications": {
            "total_papers": _parse_int(r"author on (\d+)\+?\s+papers", cv_text),
            "citations_floor": _parse_int(r"that have ([\d,]+)\+?\s+citations", cv_text),
            "h_index": _parse_int(r"h-index\s*=\s*(\d+)", cv_text),
            "primary": _parse_int(r"(\d+)\s+papers as primary/co-first author", cv_text),
            "significant": _parse_int(r"(\d+)\s+(?:other\s+)?papers with significant contributions", cv_text),
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
        ("citations_floor", "Citations floor"),
        ("h_index", "Google Scholar h-index"),
        ("primary", "Primary/co-first author papers"),
        ("significant", "Significant contribution papers (non-overlapping)"),
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
            org_abbrs = re.findall(r"\(([A-Za-z0-9_-]{3,})\)", org_name)
            for pos in org.get("positions", []) or []:
                role = _strip_tags(pos.get("title") or pos.get("role", ""))
                role_abbrs = re.findall(r"\(([A-Za-z0-9_-]{3,})\)", role)
                periods = pos.get("periods", [])
                period_str = ", ".join(periods)
                if "2025" in period_str or "2026" in period_str or "Present" in period_str:
                    probe = role.split("(")[0].strip().lower()
                    probe_short = re.sub(r"\s+concentration$", "", probe)
                    abbrs = [a.lower() for a in (org_abbrs + role_abbrs)]
                    if (
                        probe
                        and len(probe) >= 6
                        and probe not in cv_lower
                        and probe_short not in cv_lower
                        and not any(a in cv_lower for a in abbrs)
                    ):
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


def _make_bullet_p(template_p: str, text: str) -> str:
    p_pr_m = re.search(r"<w:pPr>.*?</w:pPr>", template_p, flags=re.DOTALL)
    p_open_m = re.match(r"<w:p\b[^>]*>", template_p)
    r_pr = (
        '<w:rPr><w:rFonts w:ascii="Garamond" w:hAnsi="Garamond" w:cs="MS Gothic"/>'
        '<w:sz w:val="26"/><w:szCs w:val="26"/><w:lang w:eastAsia="en-US"/></w:rPr>'
    )
    return (
        f"{p_open_m.group(0)}{p_pr_m.group(0)}"
        f'<w:r>{r_pr}<w:t xml:space="preserve">{text}</w:t></w:r></w:p>'
    )


def update_docx_in_place(docx_path: Path, site_summary: Dict) -> List[str]:
    """Update the summary counts and 'Updated <Date>' header inside CV_speagle.docx.

    Automatically omits the MSc bullet when `masters == 0` (to save 1 line on Page 1)
    and restores it immediately after `doctoral students` whenever `masters > 0`.
    """
    if not docx_path.exists():
        return [f"Cannot update {docx_path}: file not accessible in current environment."]

    sm = site_summary["mentorship"]
    sp = site_summary["publications"]
    today_str = dt.date.today().strftime("%B %-d, %Y")

    backup = docx_path.with_suffix(".docx.bak")
    shutil.copy2(docx_path, backup)

    with zipfile.ZipFile(backup, "r") as zin:
        doc_xml = zin.read("word/document.xml").decode("utf-8")
        hdr2_xml = zin.read("word/header2.xml").decode("utf-8") if "word/header2.xml" in zin.namelist() else ""

    applied = []
    if hdr2_xml:
        new_hdr2 = re.sub(
            r"(<w:t>)(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}(</w:t>)",
            rf"\g<1>{today_str}\g<2>",
            hdr2_xml,
        )
        if new_hdr2 != hdr2_xml:
            applied.append(f"Updated header2.xml date -> {today_str}")
            hdr2_xml = new_hdr2

    p_matches = list(re.finditer(r"<w:p\b[^>]*>.*?</w:p>", doc_xml, flags=re.DOTALL))
    paragraphs = [m.group(0) for m in p_matches]

    ug_noun = "undergraduate student" if sm["bachelors"] == 1 else "undergraduate students"
    phd_noun = "doctoral student" if sm["doctoral"] == 1 else "doctoral students"
    pd_noun = "postdoctoral researcher" if sm["postdoc"] == 1 else "postdoctoral researchers"
    msc_noun = "MSc student/project" if sm["masters"] == 1 else "MSc students/projects"

    has_msc_p = any("MSc student" in "".join(re.findall(r"<w:t(?:\s[^>]*)?>(.*?)</w:t>", p)) for p in paragraphs)

    for idx, p_str in enumerate(paragraphs):
        plain = "".join(re.findall(r"<w:t(?:\s[^>]*)?>(.*?)</w:t>", p_str))

        if "currently (co-)supervising/mentoring a total of" in plain:
            p_open = re.match(r"<w:p\b[^>]*><w:pPr>.*?</w:pPr>", p_str, flags=re.DOTALL).group(0)
            r_reg = '<w:rPr><w:rFonts w:ascii="Garamond" w:hAnsi="Garamond" w:cs="MS Gothic"/><w:sz w:val="28"/><w:szCs w:val="28"/><w:lang w:eastAsia="en-US"/></w:rPr>'
            r_bold = '<w:rPr><w:rFonts w:ascii="Garamond" w:hAnsi="Garamond" w:cs="MS Gothic"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:lang w:eastAsia="en-US"/></w:rPr>'
            paragraphs[idx] = (
                f"{p_open}"
                f'<w:r>{r_reg}<w:t xml:space="preserve">I am currently (co-)supervising/mentoring a total of </w:t></w:r>'
                f'<w:r>{r_bold}<w:t>{sm["active_total"]} individuals</w:t></w:r>'
                f'<w:r>{r_reg}<w:t xml:space="preserve">. This includes: </w:t></w:r></w:p>'
            )
            applied.append(f"Updated active mentees total -> {sm['active_total']}")

        elif "postdoctoral researcher" in plain:
            paragraphs[idx] = _make_bullet_p(p_str, f"    {sm['postdoc']} {pd_noun}")

        elif "doctoral student" in plain:
            doctoral_p = _make_bullet_p(p_str, f"    {sm['doctoral']} {phd_noun}")
            if sm["masters"] > 0 and not has_msc_p:
                msc_p = _make_bullet_p(p_str, f"    {sm['masters']} {msc_noun}")
                paragraphs[idx] = doctoral_p + msc_p
                applied.append(f"Restored MSc line -> {sm['masters']} {msc_noun}")
            else:
                paragraphs[idx] = doctoral_p

        elif "MSc student" in plain:
            if sm["masters"] == 0:
                paragraphs[idx] = ""
                applied.append("Omitted 0 MSc students/projects line to preserve 2-page budget")
            else:
                paragraphs[idx] = _make_bullet_p(p_str, f"    {sm['masters']} {msc_noun}")

        elif "undergraduate student" in plain:
            paragraphs[idx] = _make_bullet_p(p_str, f"    {sm['bachelors']} {ug_noun}")

        elif "for a full record of the" in plain and "supervised/mentored" in plain:
            p_open = re.match(r"<w:p\b[^>]*><w:pPr>.*?</w:pPr>", p_str, flags=re.DOTALL).group(0)
            hl_m = re.search(r"<w:hyperlink\b[^>]*>.*?</w:hyperlink>", p_str, flags=re.DOTALL)
            r_reg = '<w:rPr><w:rFonts w:ascii="Garamond" w:hAnsi="Garamond" w:cs="MS Gothic"/><w:sz w:val="28"/><w:szCs w:val="28"/><w:lang w:eastAsia="en-US"/></w:rPr>'
            r_bold = '<w:rPr><w:rFonts w:ascii="Garamond" w:hAnsi="Garamond" w:cs="MS Gothic"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:lang w:eastAsia="en-US"/></w:rPr>'
            paragraphs[idx] = (
                f"{p_open}"
                f'<w:r>{r_reg}<w:t xml:space="preserve">See my </w:t></w:r>'
                f"{hl_m.group(0)}"
                f'<w:r>{r_reg}<w:t xml:space="preserve"> for a full record of the </w:t></w:r>'
                f'<w:r>{r_bold}<w:t>{sm["cumulative_total"]} individuals</w:t></w:r>'
                f'<w:r>{r_reg}<w:t xml:space="preserve"> I have (co-)supervised/mentored.</w:t></w:r></w:p>'
            )
            applied.append(f"Updated cumulative mentees -> {sm['cumulative_total']}")

        elif "I am an author on" in plain and "h-index=" in plain:
            p_open = re.match(r"<w:p\b[^>]*><w:pPr>.*?</w:pPr>", p_str, flags=re.DOTALL).group(0)
            hl_m = re.search(r"<w:hyperlink\b[^>]*>.*?</w:hyperlink>", p_str, flags=re.DOTALL)
            hl_xml = re.sub(r"<w:t>h-index=\d+</w:t>", f"<w:t>h-index={sp['h_index']}</w:t>", hl_m.group(0))
            r_reg = '<w:rPr><w:rFonts w:ascii="Garamond" w:hAnsi="Garamond" w:cs="MS Gothic"/><w:sz w:val="28"/><w:szCs w:val="28"/><w:lang w:eastAsia="en-US"/></w:rPr>'
            r_bold = '<w:rPr><w:rFonts w:ascii="Garamond" w:hAnsi="Garamond" w:cs="MS Gothic"/><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:lang w:eastAsia="en-US"/></w:rPr>'
            paragraphs[idx] = (
                f"{p_open}"
                f'<w:r>{r_reg}<w:t xml:space="preserve">I am an author on </w:t></w:r>'
                f'<w:r>{r_bold}<w:t xml:space="preserve">{sp["total_papers"]}+ papers</w:t></w:r>'
                f'<w:r>{r_reg}<w:t xml:space="preserve"> that have </w:t></w:r>'
                f'<w:r>{r_bold}<w:t xml:space="preserve">{sp["citations_floor_str"]} </w:t></w:r>'
                f'<w:r>{r_reg}<w:t xml:space="preserve">citations (</w:t></w:r>'
                f"{hl_xml}"
                f'<w:r>{r_reg}<w:t>). This includes:</w:t></w:r></w:p>'
            )
            applied.append(
                f"Updated publications topline -> {sp['total_papers']}+ papers, {sp['citations_floor_str']} citations, h-index={sp['h_index']}"
            )

        elif "papers as primary/co-first author" in plain:
            paragraphs[idx] = _make_bullet_p(p_str, f"    {sp['primary']} papers as primary/co-first author")

        elif "papers with significant contributions" in plain:
            paragraphs[idx] = _make_bullet_p(
                p_str, f"    {sp['significant']} other papers with significant contributions (non-overlapping categories)"
            )

        elif "papers led by postdocs" in plain:
            paragraphs[idx] = _make_bullet_p(p_str, f"    {sp['postdoc']} papers led by postdocs")

        elif "papers led by students" in plain:
            paragraphs[idx] = _make_bullet_p(p_str, f"    {sp['student']} papers led by students")

    out_parts = []
    last_end = 0
    for idx, m in enumerate(p_matches):
        out_parts.append(doc_xml[last_end:m.start()])
        out_parts.append(paragraphs[idx])
        last_end = m.end()
    out_parts.append(doc_xml[last_end:])
    new_doc_xml = "".join(out_parts)

    with zipfile.ZipFile(backup, "r") as zin:
        with zipfile.ZipFile(docx_path, "w", zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                if item.filename == "word/document.xml":
                    zout.writestr(item, new_doc_xml.encode("utf-8"))
                elif item.filename == "word/header2.xml" and hdr2_xml:
                    zout.writestr(item, hdr2_xml.encode("utf-8"))
                else:
                    zout.writestr(item, zin.read(item.filename))

    backup.unlink(missing_ok=True)
    return applied or ["No matching summary strings changed in CV_speagle.docx."]


def export_docx_to_pdf() -> List[str]:
    """Export D:\\Dropbox\\CV\\CV_speagle.docx to D:\\Dropbox\\CV\\CV_speagle.pdf via Word COM."""
    ps_exe = Path("/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe")
    if not ps_exe.exists() or not DROPBOX_CV_DOCX.exists():
        return ["Word COM export unavailable in this environment."]
    ps_script = (
        '$ErrorActionPreference = "Stop"; '
        "$word = New-Object -ComObject Word.Application; "
        "$word.Visible = $false; $word.DisplayAlerts = 0; "
        "try { "
        '$doc = $word.Documents.Open("D:\\Dropbox\\CV\\CV_speagle.docx", $false, $true); '
        '$doc.ExportAsFixedFormat("D:\\Dropbox\\CV\\CV_speagle.pdf", 17); '
        "$pages = $doc.ComputeStatistics(2); "
        'Write-Output "PAGES=$pages"; '
        "$doc.Close($false) "
        "} finally { $word.Quit() }"
    )
    proc = subprocess.run(
        [str(ps_exe), "-NoProfile", "-NonInteractive", "-Command", ps_script],
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=30,
        cwd="/mnt/c",
        check=False,
    )
    if proc.returncode != 0:
        return [f"Word COM export failed: {proc.stderr.strip()}"]
    return [f"Exported {DROPBOX_CV_PDF} ({proc.stdout.strip()})"]


def format_report_markdown(report: Dict) -> str:
    sm = report["site_summary"]["mentorship"]
    sp = report["site_summary"]["publications"]
    ug_noun = "undergraduate student" if sm["bachelors"] == 1 else "undergraduate students"
    mentorship_lines = [
        f"I am currently (co-)supervising/mentoring a total of {sm['active_total']} individuals. This includes:",
        f"  {sm['postdoc']} postdoctoral researchers",
        f"  {sm['doctoral']} doctoral students",
    ]
    if sm["masters"] > 0:
        mentorship_lines.append(f"  {sm['masters']} MSc students/projects")
    mentorship_lines.extend([
        f"  {sm['bachelors']} {ug_noun}",
        f"See my website for a full record of the {sm['cumulative_total']} individuals I have (co-)supervised/mentored.",
    ])

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
        *mentorship_lines,
        "```",
        "",
        "### PUBLICATIONS (Non-Overlapping Categories)",
        "```text",
        f"I am an author on {sp['total_papers']}+ papers that have {sp['citations_floor_str']} citations (h-index={sp['h_index']}). This includes:",
        f"  {sp['primary']} papers as primary/co-first author",
        f"  {sp['significant']} other papers with significant contributions (non-overlapping categories)",
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
    parser.add_argument("--export-pdf", action="store_true", help="Export /mnt/d/Dropbox/CV/CV_speagle.docx to PDF via Word COM")
    parser.add_argument("--export-patch", type=str, default=None, help="Write Markdown CV sync report to file")
    parser.add_argument("--json", type=str, default=None, help="Write JSON report to file")
    args = parser.parse_args()

    content = json.loads(CONTENT_JSON.read_text(encoding="utf-8"))
    pub_data = json.loads(PUBLICATIONS_JSON.read_text(encoding="utf-8"))
    report = audit_cv_sync(content, pub_data)

    if args.update_docx:
        for msg in update_docx_in_place(DROPBOX_CV_DOCX, report["site_summary"]):
            print(msg)
        report = audit_cv_sync(content, pub_data)

    if args.export_pdf:
        for msg in export_docx_to_pdf():
            print(msg)

    if args.sync_pdf or args.export_pdf:
        for msg in sync_pdf_files():
            print(msg)
        report = audit_cv_sync(content, pub_data)

    md = format_report_markdown(report)
    print(md)

    if args.export_patch:
        Path(args.export_patch).write_text(md, encoding="utf-8")
    if args.json:
        Path(args.json).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
