"""
Categorize publications based on ADS library membership.

This script fetches the contents of ADS libraries and categorizes publications
into authorship types: primary, significant, student, and all.
"""

import os
import json
import time
import logging
import argparse
import requests
from typing import Dict, List, Set, Optional
from pathlib import Path
import ads
from config import CONFIG


# Load environment variables from .env file
def load_env_file():
    """Load environment variables from .env file."""
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                if line.strip() and not line.startswith("#") and "=" in line:
                    key, value = line.strip().split("=", 1)
                    os.environ[key] = value


# Load environment variables at import time
load_env_file()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ADS Library URLs and their corresponding categories
ADS_LIBRARIES = {
    "all": "YiaebBefTHKZdblrny2Vsw",
    "primary": "Jy98AvjOQXqykOSJ-bn96Q",
    "significant": "X5RfsxxzRXC-BWjU11xa4A",
    "student": "yyWDBaVwS0GIrIkz2GKltg",
}


class PublicationCategorizer:
    """Categorizes publications based on ADS library membership."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("ADS_API_KEY")
        self.retry_attempts = CONFIG["ads"]["retry_attempts"]
        self.retry_delay = CONFIG["ads"]["retry_delay"]

        if self.api_key:
            ads.config.token = self.api_key
            logger.info("ADS API key configured")
        else:
            logger.error("ADS API key required for library access")
            raise ValueError("ADS API key not found")

    def fetch_library_contents(self, library_id: str) -> Set[str]:
        """Fetch all bibcodes from an ADS library using proper pagination."""
        logger.info(f"Fetching library contents: {library_id}")

        bibcodes = set()
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            # Method 1: Try documents endpoint with pagination
            start = 0
            rows = 200  # Request more documents per page
            has_more = True

            while has_more:
                # Try different endpoint variations
                endpoints_to_try = [
                    f"https://api.adsabs.harvard.edu/v1/biblib/documents/{library_id}",
                    f"https://api.adsabs.harvard.edu/v1/biblib/libraries/{library_id}/documents",
                    f"https://api.adsabs.harvard.edu/v1/biblib/libraries/{library_id}",
                ]

                response = None
                for endpoint in endpoints_to_try:
                    params = {"start": start, "rows": rows}
                    try:
                        response = requests.get(
                            endpoint, headers=headers, params=params
                        )
                        if response.status_code == 200:
                            logger.info(
                                f"Successfully connected to endpoint: {endpoint}"
                            )
                            break
                    except Exception as e:
                        logger.debug(f"Endpoint {endpoint} failed: {e}")
                        continue

                if not response or response.status_code != 200:
                    logger.error(f"All endpoints failed for library {library_id}")
                    if response:
                        logger.error(f"Last response status: {response.status_code}")
                        logger.error(f"Last response text: {response.text[:500]}")
                    break

                data = response.json()
                logger.debug(
                    f"Response keys: {list(data.keys()) if isinstance(data, dict) else type(data)}"
                )

                # Extract bibcodes from different response formats
                current_batch = []
                if "documents" in data and isinstance(data["documents"], list):
                    current_batch = data["documents"]
                elif "solr" in data and "docs" in data["solr"]:
                    current_batch = [
                        doc.get("bibcode")
                        for doc in data["solr"]["docs"]
                        if doc.get("bibcode")
                    ]
                elif isinstance(data, list):
                    current_batch = data

                if not current_batch:
                    logger.info(f"No more documents found, stopping pagination")
                    has_more = False
                else:
                    for bibcode in current_batch:
                        if bibcode and isinstance(bibcode, str):
                            bibcodes.add(bibcode)

                    logger.info(
                        f"Fetched {len(current_batch)} documents, total so far: {len(bibcodes)}"
                    )
                    start += len(current_batch)

                    # Stop if we got fewer than requested (indicating last page)
                    if len(current_batch) < rows:
                        has_more = False

                time.sleep(0.2)  # Rate limiting

            logger.info(
                f"Successfully fetched {len(bibcodes)} papers from library {library_id}"
            )
            return bibcodes

        except Exception as e:
            logger.error(f"Error fetching library {library_id}: {e}")
            if "response" in locals() and response:
                logger.error(f"Response status: {response.status_code}")
                logger.error(f"Response text: {response.text[:500]}")
            return set()

    def fetch_papers_by_author(self) -> Set[str]:
        """Fetch all papers by author using search API as fallback."""
        logger.info("Using search API to fetch papers by author")

        try:
            # Search for papers by Speagle
            papers = ads.SearchQuery(
                q='author:"Speagle, J"', fl=["bibcode"], rows=2000, sort="date desc"
            )

            bibcodes = set()
            for paper in papers:
                if paper.bibcode:
                    bibcodes.add(paper.bibcode)

            logger.info(f"Found {len(bibcodes)} papers via author search")
            return bibcodes

        except Exception as e:
            logger.error(f"Error in author search: {e}")
            return set()

    def fetch_all_libraries(self) -> Dict[str, Set[str]]:
        """Fetch contents of all ADS libraries with fallback mechanisms."""
        logger.info("Fetching all ADS library contents...")
        libraries = {}

        # Try to fetch from each library
        for category, library_id in ADS_LIBRARIES.items():
            bibcodes = self.fetch_library_contents(library_id)
            libraries[category] = bibcodes
            time.sleep(self.retry_delay)  # Be respectful to ADS API

            logger.info(f"Library {category}: {len(bibcodes)} papers")

        # If the "all" library is empty or has very few papers, try search fallback
        if len(libraries.get("all", set())) < 50:
            logger.warning(
                "Library fetching returned few papers, trying search fallback"
            )
            all_papers = self.fetch_papers_by_author()

            if len(all_papers) > len(libraries.get("all", set())):
                logger.info(
                    f"Search found {len(all_papers)} papers vs library's {len(libraries.get('all', set()))}"
                )
                # For now, just log this - we'd need manual mapping to categorize search results
                libraries["search_fallback"] = all_papers

        return libraries

    def categorize_paper(
        self, paper: Dict, libraries: Dict[str, Set[str]]
    ) -> List[str]:
        """Categorize a single paper based on library membership."""
        # Get all possible identifiers for this paper
        identifiers = set()

        # Add bibcode and id
        if paper.get("bibcode"):
            identifiers.add(paper["bibcode"])
        if paper.get("id"):
            identifiers.add(paper["id"])

        # Extract bibcode from ADS URL if available
        ads_url = paper.get("adsUrl", "")
        if ads_url and "/abs/" in ads_url:
            url_bibcode = ads_url.split("/abs/")[-1]
            identifiers.add(url_bibcode)

        categories = []

        # First, check if paper is in ANY ADS library at all
        all_lib_bibcodes = libraries.get("all", set())
        in_any_library = any(
            identifier in all_lib_bibcodes for identifier in identifiers
        )

        if not in_any_library:
            # Paper not in any ADS library - will need manual categorization or default to "all"
            return []

        # Paper is in ADS - check specific category libraries
        for category in ["primary", "student", "significant"]:
            library_bibcodes = libraries.get(category, set())

            # Check if any identifier matches any bibcode in the library
            if any(identifier in library_bibcodes for identifier in identifiers):
                categories.append(category)

        # If paper is in ALL library but not in any specific category,
        # it gets no categories (will fall back to heuristics)
        return categories

    def interactive_categorization(
        self, papers_not_in_any_library: List[Dict]
    ) -> Dict[str, List[str]]:
        """Interactively categorize papers that weren't found in any ADS library."""
        if not papers_not_in_any_library:
            return {}

        print(f"\n{len(papers_not_in_any_library)} papers are not in any ADS library:")
        print(
            "These papers will default to 'all' category unless you specify otherwise."
        )
        print(
            "Categories: (p)rimary, (s)ignificant, (t)student, (a)ll, (skip to use default 'all')"
        )
        print("You can enter multiple categories (e.g., 'ps' for primary+significant)")
        print("-" * 70)

        manual_categories = {}

        for i, paper in enumerate(papers_not_in_any_library, 1):
            title = paper.get("title", "Unknown")[:60]
            year = paper.get("year", "Unknown")
            authors = paper.get("authors", [])
            first_author = authors[0] if authors else "Unknown"

            print(f"\nPaper {i}/{len(papers_not_in_any_library)}:")
            print(f"Title: {title}...")
            print(f"Year: {year}")
            print(f"First Author: {first_author}")
            print(f"Bibcode: {paper.get('bibcode', 'N/A')}")

            while True:
                choice = input("Category (p/s/t/a/o/skip): ").strip().lower()

                if choice == "skip":
                    break

                categories = []
                if "p" in choice:
                    categories.append("primary")
                if "s" in choice:
                    categories.append("significant")
                if "t" in choice:
                    categories.append("student")
                if "a" in choice or choice == "all":
                    categories.append("all")
                if "o" in choice or choice == "other":
                    categories.append("other")

                if categories or choice == "":
                    manual_categories[
                        paper.get("bibcode", paper.get("id", f"paper_{i}"))
                    ] = categories
                    break
                else:
                    print("Invalid choice. Use p/s/t/a/o/skip")

        return manual_categories

    def apply_categorization(
        self,
        publications_data: Dict,
        libraries: Dict[str, Set[str]],
        manual_categories: Dict[str, List[str]] = None,
    ) -> Dict:
        """Apply categorization to all publications."""
        manual_categories = manual_categories or {}
        categorized_count = 0
        papers_not_in_any_library = []

        logger.info(
            f"Categorizing {len(publications_data['publications'])} publications..."
        )

        # Debug info
        all_lib_codes = libraries.get("all", set())
        logger.info(f"All library contains {len(all_lib_codes)} bibcodes")

        for paper in publications_data["publications"]:
            # Get paper identifiers
            identifiers = set()
            if paper.get("bibcode"):
                identifiers.add(paper["bibcode"])
            if paper.get("id"):
                identifiers.add(paper["id"])
            ads_url = paper.get("adsUrl", "")
            if ads_url and "/abs/" in ads_url:
                url_bibcode = ads_url.split("/abs/")[-1]
                identifiers.add(url_bibcode)

            # Check if paper is in ANY ADS library
            in_any_library = any(
                identifier in all_lib_codes for identifier in identifiers
            )

            if not in_any_library:
                # Paper not in any ADS library - needs manual categorization or default
                papers_not_in_any_library.append(paper)

                # Check for manual categorization
                bibcode = paper.get("bibcode") or paper.get("id")
                if bibcode in manual_categories:
                    categories = manual_categories[bibcode]
                    paper["authorshipCategories"] = categories
                    categorized_count += 1
                else:
                    # Default to "all" category for papers not in any ADS library
                    paper["authorshipCategories"] = ["all"]
                    categorized_count += 1

                continue

            # Paper is in ADS library - try automatic categorization
            categories = self.categorize_paper(paper, libraries)

            # Check for manual categorization override
            bibcode = paper.get("bibcode") or paper.get("id")
            if bibcode in manual_categories:
                categories.extend(manual_categories[bibcode])
                categories = list(set(categories))  # Remove duplicates

            # Apply categories to paper
            if categories:
                paper["authorshipCategories"] = categories
                categorized_count += 1
            else:
                # If no specific categories but paper is in ALL library,
                # default to "all" category instead of falling back to heuristics
                paper["authorshipCategories"] = ["all"]
                categorized_count += 1

        logger.info(
            f"Successfully categorized {categorized_count} papers with ADS library data"
        )
        if papers_not_in_any_library:
            logger.info(
                f"{len(papers_not_in_any_library)} papers not in any ADS library (defaulted to 'all' or manually categorized)"
            )

        return publications_data, papers_not_in_any_library

    def save_categorization_cache(
        self, libraries: Dict[str, Set[str]], cache_file: str
    ):
        """Save library contents to cache file."""
        cache_data = {
            category: list(bibcodes) for category, bibcodes in libraries.items()
        }
        with open(cache_file, "w") as f:
            json.dump(cache_data, f, indent=2)
        logger.info(f"Library cache saved to {cache_file}")

    def load_categorization_cache(
        self, cache_file: str
    ) -> Optional[Dict[str, Set[str]]]:
        """Load library contents from cache file."""
        try:
            with open(cache_file, "r") as f:
                cache_data = json.load(f)
            libraries = {
                category: set(bibcodes) for category, bibcodes in cache_data.items()
            }
            logger.info(f"Library cache loaded from {cache_file}")
            return libraries
        except FileNotFoundError:
            logger.info("No library cache found")
            return None
        except Exception as e:
            logger.error(f"Error loading cache: {e}")
            return None

    def run(
        self,
        publications_file: str,
        interactive: bool = True,
        use_cache: bool = True,
        cache_file: str = "ads_library_cache.json",
    ) -> bool:
        """Main categorization workflow."""
        logger.info("Starting publication categorization...")

        # Load publications data
        try:
            with open(publications_file, "r") as f:
                publications_data = json.load(f)
        except Exception as e:
            logger.error(f"Error loading publications file: {e}")
            return False

        # Try to load libraries from cache
        libraries = None
        if use_cache:
            libraries = self.load_categorization_cache(cache_file)

        # Fetch library contents if not cached
        if not libraries:
            libraries = self.fetch_all_libraries()
            if use_cache:
                self.save_categorization_cache(libraries, cache_file)

        if not libraries:
            logger.error("Failed to fetch library contents")
            return False

        # Apply automatic categorization
        publications_data, uncategorized_papers = self.apply_categorization(
            publications_data, libraries
        )

        # Interactive categorization for remaining papers
        manual_categories = {}
        if interactive and uncategorized_papers:
            manual_categories = self.interactive_categorization(uncategorized_papers)

            if manual_categories:
                # Re-apply categorization with manual input
                publications_data, _ = self.apply_categorization(
                    publications_data, libraries, manual_categories
                )

        # Save updated publications data
        try:
            with open(publications_file, "w") as f:
                json.dump(publications_data, f, indent=2, ensure_ascii=False)
            logger.info(f"Updated publications saved to {publications_file}")
            return True
        except Exception as e:
            logger.error(f"Error saving publications file: {e}")
            return False


def main():
    parser = argparse.ArgumentParser(
        description="Categorize publications by ADS library membership"
    )
    parser.add_argument(
        "--publications-file",
        default="assets/data/publications_data.json",
        help="Path to publications data file",
    )
    parser.add_argument(
        "--no-interactive", action="store_true", help="Skip interactive categorization"
    )
    parser.add_argument(
        "--no-cache", action="store_true", help="Don't use library content cache"
    )
    parser.add_argument(
        "--cache-file",
        default="ads_library_cache.json",
        help="Path to library cache file",
    )

    args = parser.parse_args()

    try:
        categorizer = PublicationCategorizer()
        success = categorizer.run(
            publications_file=args.publications_file,
            interactive=not args.no_interactive,
            use_cache=not args.no_cache,
            cache_file=args.cache_file,
        )

        if success:
            logger.info("Publication categorization completed successfully")
            return 0
        else:
            logger.error("Publication categorization failed")
            return 1

    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return 1


if __name__ == "__main__":
    exit(main())
