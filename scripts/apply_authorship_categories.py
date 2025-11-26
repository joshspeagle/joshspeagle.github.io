#!/usr/bin/env python3
"""
Apply authorship categories to publications based on ADS library cache.

This script reads the ads_library_cache.json and updates publications_data.json
with appropriate authorshipCategories based on bibcode matches.
"""

import json
import logging
from pathlib import Path

# Set up logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def load_library_cache(cache_path=None):
    """Load the ADS library cache."""
    if cache_path is None:
        # Try multiple locations
        possible_paths = [
            "scripts/ads_library_cache.json",  # From parent directory
            "ads_library_cache.json",  # From scripts directory
            Path(__file__).parent / "ads_library_cache.json",  # Absolute
        ]

        for path in possible_paths:
            if Path(path).exists():
                cache_path = path
                break
        else:
            logger.error("ADS library cache not found in any expected location")
            return {}

    try:
        with open(cache_path, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        logger.error(f"Library cache not found at {cache_path}")
        return {}
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing library cache: {e}")
        return {}


def load_publications(pub_path=None):
    """Load the publications data."""
    if pub_path is None:
        # Try multiple locations
        possible_paths = [
            "assets/data/publications_data.json",  # From parent directory
            "../assets/data/publications_data.json",  # From scripts directory
            Path(__file__).parent.parent
            / "assets/data/publications_data.json",  # Absolute
        ]

        for path in possible_paths:
            if Path(path).exists():
                pub_path = path
                break
        else:
            logger.error("Publications data not found in any expected location")
            return {}

    try:
        with open(pub_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        logger.error(f"Publications data not found at {pub_path}")
        return {}
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing publications data: {e}")
        return {}


def apply_categories(publications_data, library_cache):
    """Apply authorship categories based on library cache."""

    if not publications_data.get("publications"):
        logger.error("No publications found in data")
        return publications_data

    # Create lookup sets for faster matching
    primary_bibcodes = set(library_cache.get("primary", []))
    significant_bibcodes = set(library_cache.get("significant", []))
    student_bibcodes = set(library_cache.get("student", []))
    postdoc_bibcodes = set(library_cache.get("postdoc", []))

    logger.info(f"Library cache contains:")
    logger.info(f"  - {len(primary_bibcodes)} primary papers")
    logger.info(f"  - {len(significant_bibcodes)} significant papers")
    logger.info(f"  - {len(student_bibcodes)} student papers")
    logger.info(f"  - {len(postdoc_bibcodes)} postdoc papers")

    updated_count = 0

    for pub in publications_data["publications"]:
        bibcode = pub.get("bibcode", pub.get("id", ""))

        if not bibcode:
            continue

        # Determine categories for this paper
        categories = []

        if bibcode in primary_bibcodes:
            categories.append("primary")

        if bibcode in postdoc_bibcodes:
            categories.append("postdoc")

        if bibcode in student_bibcodes:
            categories.append("student")

        if bibcode in significant_bibcodes:
            categories.append("significant")

        # Update if we found any categories
        if categories:
            # Use priority order: primary > postdoc > student > significant
            if "primary" in categories:
                pub["authorshipCategory"] = "primary"
            elif "postdoc" in categories:
                pub["authorshipCategory"] = "postdoc"
            elif "student" in categories:
                pub["authorshipCategory"] = "student"
            elif "significant" in categories:
                pub["authorshipCategory"] = "significant"

            updated_count += 1
            logger.debug(f"Updated {bibcode}: {pub['authorshipCategory']}")

    logger.info(f"Updated {updated_count} publications with authorship categories")
    return publications_data


def save_publications(publications_data, output_path=None):
    """Save the updated publications data."""
    if output_path is None:
        # Try multiple locations - use the same one we loaded from
        possible_paths = [
            "assets/data/publications_data.json",  # From parent directory
            "../assets/data/publications_data.json",  # From scripts directory
            Path(__file__).parent.parent
            / "assets/data/publications_data.json",  # Absolute
        ]

        for path in possible_paths:
            if Path(path).exists():
                output_path = path
                break
        else:
            # Default to parent directory location
            output_path = "assets/data/publications_data.json"

    try:
        # Ensure directory exists
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(publications_data, f, indent=2, ensure_ascii=False)
        logger.info(f"Saved updated publications to {output_path}")
        return True
    except Exception as e:
        logger.error(f"Error saving publications: {e}")
        return False


def main():
    """Main function."""
    logger.info("Starting authorship category application...")

    # Load data
    library_cache = load_library_cache()
    if not library_cache:
        return 1

    publications_data = load_publications()
    if not publications_data:
        return 1

    # Apply categories
    updated_data = apply_categories(publications_data, library_cache)

    # Save results
    if save_publications(updated_data):
        logger.info("Successfully applied authorship categories")
        return 0
    else:
        return 1


if __name__ == "__main__":
    exit(main())
