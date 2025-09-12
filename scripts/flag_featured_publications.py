#!/usr/bin/env python3
"""
Flag featured publications in the website data.
"""

import json
from pathlib import Path
from rich.console import Console

console = Console()


def flag_featured_publications():
    """Flag specific publications as featured in the website data."""

    # Path to the website publications data (relative to project root)
    website_data_path = Path("assets/data/publications_data.json")
    
    # If running from scripts directory, adjust path
    if not website_data_path.exists():
        website_data_path = Path("../assets/data/publications_data.json")

    if not website_data_path.exists():
        console.print(f"❌ Website data file not found: {website_data_path}")
        return

    # Load the current data
    with open(website_data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    publications = data.get("publications", [])
    if not publications:
        console.print("❌ No publications found in data")
        return

    # Featured publications to flag (partial title matching for robustness)
    featured_papers = [
        {
            "title_pattern": "Trustworthy scientific inference",
            "description": "Carzon et al.",
        },
        {
            "title_pattern": "A Deep, High-Angular Resolution 3D Dust Map",
            "description": "Zucker, Saydjari and Speagle et al.",
        },
        {
            "title_pattern": "ChronoFlow: A Data-driven Model for Gyrochronology",
            "description": "Van-Lane et al.",
        },
    ]

    console.print("🌟 Flagging featured publications...")
    console.print()

    featured_count = 0

    for paper in featured_papers:
        pattern = paper["title_pattern"].lower()
        description = paper["description"]
        found = False

        for pub in publications:
            title = pub.get("title", "").lower()
            if pattern in title:
                pub["featured"] = True
                featured_count += 1
                found = True
                console.print(f"✅ Flagged as featured: {description}")
                console.print(f"   Title: {pub.get('title', 'N/A')[:80]}...")
                console.print(f"   Year: {pub.get('year', 'N/A')}")
                console.print()
                break

        if not found:
            console.print(f"❌ Not found: {description}")
            console.print(f"   Looking for: {paper['title_pattern']}")
            console.print()

    if featured_count > 0:
        # Save the updated data
        with open(website_data_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        console.print(
            f"🎯 Successfully flagged {featured_count} publications as featured"
        )
        console.print(f"   Updated: {website_data_path}")
    else:
        console.print("❌ No publications were flagged as featured")


if __name__ == "__main__":
    flag_featured_publications()
