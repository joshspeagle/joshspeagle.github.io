#!/usr/bin/env python3
"""
Update ADS library cache by fetching the latest data from ADS libraries.

This script fetches bibcodes from predefined ADS libraries and updates
the ads_library_cache.json file.
"""

import json
import logging
import os
import requests
from typing import Dict, List
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# ADS Library configurations
# Format: "category": "library_id"
ADS_LIBRARIES = {
    "primary": "Jy98AvjOQXqykOSJ-bn96Q",  # Primary author library
    "significant": "X5RfsxxzRXC-BWjU11xa4A",  # Contributor/significant library
    "student": "yyWDBaVwS0GIrIkz2GKltg",  # Student-led library
    "postdoc": "6-JKiyOATdqEzuDGuUMWwg",  # Postdoc library
}

# Main library containing all papers
ADS_ALL_LIBRARY = "YiaebBefTHKZdblrny2Vsw"  # All papers library


def fetch_library_bibcodes(library_id: str, api_key: str) -> List[str]:
    """Fetch all bibcodes from an ADS library with pagination."""
    headers = {"Authorization": f"Bearer {api_key}"}

    # First, get the library metadata to know total document count
    url = f"https://api.adsabs.harvard.edu/v1/biblib/libraries/{library_id}"

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()

        # Get total number of documents from metadata
        metadata = data.get("metadata", {})
        total_documents = metadata.get("num_documents", 0)

        if total_documents == 0:
            logger.warning(f"Library {library_id} appears to be empty")
            return []

        logger.debug(f"Library {library_id} contains {total_documents} documents")

    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching library metadata for {library_id}: {e}")
        return []

    # Now fetch all documents with pagination
    all_bibcodes = []
    start = 0
    rows = 200  # Number of bibcodes to fetch per request (ADS max is typically 200)

    while start < total_documents:
        # Use the documents endpoint with pagination parameters
        params = {
            "start": start,
            "rows": min(
                rows, total_documents - start
            ),  # Don't request more than available
        }

        try:
            response = requests.get(url, headers=headers, params=params)
            response.raise_for_status()

            data = response.json()
            bibcodes = data.get("documents", [])

            if not bibcodes:
                # No more documents to fetch
                break

            all_bibcodes.extend(bibcodes)

            logger.debug(
                f"Fetched {len(bibcodes)} bibcodes from library {library_id} (start={start})"
            )

            # Move to next page
            start += len(bibcodes)

        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching library {library_id} (start={start}): {e}")
            break
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing response for library {library_id}: {e}")
            break

    logger.info(
        f"Fetched total of {len(all_bibcodes)} bibcodes from library {library_id}"
    )
    return all_bibcodes


def fetch_all_papers(api_key: str) -> List[str]:
    """Fetch all papers by the author from ADS."""
    import ads

    # Configure ADS
    ads.config.token = api_key

    try:
        # Query for all papers by the author
        query = ads.SearchQuery(
            q='author:"Speagle, J" OR author:"Speagle, Joshua" OR author:"Speagle, Josh"',
            fl=["bibcode"],
            rows=500,
            sort="date desc",
        )

        papers = list(query)
        bibcodes = [paper.bibcode for paper in papers if hasattr(paper, "bibcode")]

        logger.info(f"Fetched {len(bibcodes)} total papers from ADS author search")
        return bibcodes

    except Exception as e:
        logger.error(f"Error fetching all papers: {e}")
        return []


def update_library_cache(api_key: str) -> Dict[str, List[str]]:
    """Update the complete library cache."""
    cache = {}

    # Fetch all papers from the "all" library
    if ADS_ALL_LIBRARY:
        logger.info("Fetching all papers library...")
        all_papers = fetch_library_bibcodes(ADS_ALL_LIBRARY, api_key)
        if all_papers:
            cache["all"] = all_papers
        else:
            # Fallback to author search if library fetch fails
            logger.info("Falling back to author search for all papers...")
            all_papers = fetch_all_papers(api_key)
            if all_papers:
                cache["all"] = all_papers

    # Fetch each category library
    for category, library_id in ADS_LIBRARIES.items():
        if library_id:
            logger.info(f"Fetching {category} library...")
            bibcodes = fetch_library_bibcodes(library_id, api_key)
            if bibcodes:
                cache[category] = bibcodes

    return cache


def merge_with_existing_cache(
    new_cache: Dict[str, List[str]], cache_path: str = "ads_library_cache.json"
) -> Dict[str, List[str]]:
    """Merge new cache data with existing cache, preserving manually added entries."""
    try:
        with open(cache_path, "r") as f:
            existing_cache = json.load(f)
            logger.info(f"Loaded existing cache with {len(existing_cache)} categories")
    except (FileNotFoundError, json.JSONDecodeError):
        logger.info("No existing cache found or cache is invalid, starting fresh")
        existing_cache = {}

    # Merge the caches
    merged_cache = existing_cache.copy()

    for category, bibcodes in new_cache.items():
        if category in merged_cache:
            # Merge bibcodes, preserving unique entries
            existing_set = set(merged_cache[category])
            new_set = set(bibcodes)
            merged_set = existing_set | new_set
            merged_cache[category] = sorted(list(merged_set), reverse=True)

            added = len(merged_set) - len(existing_set)
            if added > 0:
                logger.info(f"Added {added} new bibcodes to {category} category")
        else:
            merged_cache[category] = bibcodes
            logger.info(f"Added new category {category} with {len(bibcodes)} bibcodes")

    return merged_cache


def save_cache(cache: Dict[str, List[str]], cache_path: str = "ads_library_cache.json"):
    """Save the library cache to file."""
    try:
        with open(cache_path, "w") as f:
            json.dump(cache, f, indent=2)

        total_bibcodes = sum(len(bibcodes) for bibcodes in cache.values())
        logger.info(
            f"Saved cache with {len(cache)} categories and {total_bibcodes} total entries"
        )

        # Log summary
        for category, bibcodes in cache.items():
            logger.info(f"  - {category}: {len(bibcodes)} papers")

        return True

    except Exception as e:
        logger.error(f"Error saving cache: {e}")
        return False


def main():
    """Main function."""
    logger.info("Starting ADS library cache update...")

    # Get API key
    api_key = os.getenv("ADS_API_KEY")
    if not api_key:
        logger.error("ADS_API_KEY environment variable not set")
        logger.error("Set it with: export ADS_API_KEY='your-api-key'")
        return 1

    # Fetch new cache data
    new_cache = update_library_cache(api_key)

    if not new_cache:
        logger.warning("No new cache data fetched")
        # Still proceed to preserve existing cache

    # Merge with existing cache
    merged_cache = merge_with_existing_cache(new_cache)

    # Save the cache
    if save_cache(merged_cache):
        logger.info("✅ Successfully updated ADS library cache")
        return 0
    else:
        logger.error("❌ Failed to save library cache")
        return 1


if __name__ == "__main__":
    exit(main())
