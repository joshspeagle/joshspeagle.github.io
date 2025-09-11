"""
ADS (Astrophysics Data System) data fetcher for publication data.
"""

import os
import time
import logging
from typing import Dict, List, Optional
import ads
from config import CONFIG, AUTHOR_VARIATIONS, JOURNAL_MAPPINGS

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ADSFetcher:
    """Fetches publication data from ADS."""

    def __init__(self, api_key: Optional[str] = None):
        self.config = CONFIG["ads"]
        self.api_key = api_key or os.getenv("ADS_API_KEY")
        self.retry_attempts = self.config["retry_attempts"]
        self.retry_delay = self.config["retry_delay"]

        if self.api_key:
            ads.config.token = self.api_key
            logger.info("ADS API key configured")
        else:
            logger.warning("No ADS API key found. Some features may be limited.")

    def fetch_publications(self) -> List[Dict]:
        """Fetch publication list from ADS."""
        publications = []

        for attempt in range(self.retry_attempts):
            try:
                logger.info(f"Fetching publications from ADS (attempt {attempt + 1})")

                # Query ADS for publications
                query = ads.SearchQuery(
                    q=self.config["author_query"],
                    fl=self.config["fields"],
                    rows=self.config["rows"],
                    sort=self.config["sort"],
                )

                papers = list(query)
                logger.info(f"Found {len(papers)} papers in ADS")

                for paper in papers:
                    try:
                        publication = self._extract_publication_info(paper)
                        if publication:
                            publications.append(publication)
                    except Exception as e:
                        logger.warning(
                            f"Failed to process paper {getattr(paper, 'bibcode', 'unknown')}: {e}"
                        )
                        continue

                logger.info(
                    f"Successfully processed {len(publications)} publications from ADS"
                )
                return publications

            except Exception as e:
                logger.error(f"Attempt {attempt + 1} failed: {e}")
                if attempt < self.retry_attempts - 1:
                    time.sleep(self.retry_delay)
                else:
                    logger.error(
                        f"Failed to fetch from ADS after {self.retry_attempts} attempts"
                    )
                    return publications

    def fetch_author_metrics(self) -> Dict:
        """Fetch author-level metrics from ADS."""
        try:
            logger.info("Fetching author metrics from ADS")

            # Get all publications for metrics calculation
            publications = self.fetch_publications()

            if not publications:
                logger.warning("No publications found for metrics calculation")
                return {}

            # Calculate metrics
            total_papers = len(publications)
            total_citations = sum(pub.get("citations", 0) for pub in publications)

            # Calculate h-index
            citation_counts = sorted(
                [pub.get("citations", 0) for pub in publications], reverse=True
            )
            h_index = 0
            for i, citations in enumerate(citation_counts):
                if citations >= i + 1:
                    h_index = i + 1
                else:
                    break

            # Calculate i10-index (papers with 10+ citations)
            i10_index = sum(1 for pub in publications if pub.get("citations", 0) >= 10)

            # Calculate citations per year
            citations_per_year = {}
            for pub in publications:
                year = pub.get("year")
                if year and year >= 2000:  # Reasonable lower bound
                    citations_per_year[str(year)] = citations_per_year.get(
                        str(year), 0
                    ) + pub.get("citations", 0)

            metrics = {
                "totalPapers": total_papers,
                "hIndex": h_index,
                "i10Index": i10_index,
                "totalCitations": total_citations,
                "citationsPerYear": citations_per_year,
                "lastUpdated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "source": "ads",
            }

            logger.info(
                f"ADS metrics: {total_papers} papers, h-index: {h_index}, "
                f"total citations: {total_citations}"
            )

            return metrics

        except Exception as e:
            logger.error(f"Failed to fetch author metrics from ADS: {e}")
            return {}

    def _extract_publication_info(self, paper) -> Optional[Dict]:
        """Extract and normalize publication information from ADS paper object."""
        try:
            # Get basic fields
            title = (
                getattr(paper, "title", [""])[0]
                if hasattr(paper, "title") and paper.title
                else ""
            )
            if not title:
                return None

            # Extract authors
            authors = getattr(paper, "author", []) or []

            # Extract year
            year = getattr(paper, "year", None)
            if year:
                try:
                    year = int(year)
                except (ValueError, TypeError):
                    year = None

            # Extract journal
            journal = getattr(paper, "pub", "") or ""
            # Map abbreviations to full names
            for abbrev, full_name in JOURNAL_MAPPINGS.items():
                if abbrev in journal:
                    journal = full_name
                    break

            # Extract identifiers
            bibcode = getattr(paper, "bibcode", "")
            doi = None
            arxiv_id = None

            # Extract DOI
            if hasattr(paper, "doi") and paper.doi:
                doi = paper.doi[0] if isinstance(paper.doi, list) else paper.doi

            # Extract arXiv ID
            if hasattr(paper, "eprint_id") and paper.eprint_id:
                arxiv_id = (
                    paper.eprint_id[0]
                    if isinstance(paper.eprint_id, list)
                    else paper.eprint_id
                )

            # Extract abstract
            abstract = getattr(paper, "abstract", "") or ""

            # Extract keywords
            keywords = getattr(paper, "keyword", []) or []
            if isinstance(keywords, str):
                keywords = [keywords]

            # Extract citations
            citations = getattr(paper, "citation_count", 0) or 0

            publication = {
                "id": bibcode or f"ads_{hash(title)}",
                "title": title.strip(),
                "authors": authors,
                "year": year,
                "journal": journal.strip(),
                "bibcode": bibcode,
                "citations": citations,
                "abstract": abstract.strip(),
                "keywords": keywords,
                "source": "ads",
            }

            # Add identifiers if available
            if doi:
                publication["doi"] = doi
            if arxiv_id:
                publication["arxivId"] = arxiv_id

            # Generate ADS URL
            if bibcode:
                publication["adsUrl"] = f"https://ui.adsabs.harvard.edu/abs/{bibcode}"

            # Classify research area
            publication["researchArea"] = self._classify_research_area(
                title, abstract, keywords
            )

            return publication

        except Exception as e:
            logger.warning(f"Failed to extract publication info: {e}")
            return None

    def _classify_research_area(
        self, title: str, abstract: str, keywords: List[str]
    ) -> str:
        """Classify publication into research area based on title, abstract, and keywords."""
        text = f"{title} {abstract} {' '.join(keywords)}".lower()

        keyword_mapping = CONFIG["categories"]["keywords_mapping"]

        # Score each category
        category_scores = {}
        for keyword, category in keyword_mapping.items():
            if keyword in text:
                category_scores[category] = category_scores.get(category, 0) + 1

        # Return category with highest score, or default
        if category_scores:
            return max(category_scores, key=category_scores.get)
        else:
            return CONFIG["categories"]["default_category"]

    def fetch_coauthor_network(self) -> Dict:
        """Fetch co-author network data for visualizations."""
        try:
            logger.info("Fetching co-author network from ADS")

            publications = self.fetch_publications()
            coauthor_counts = {}

            for pub in publications:
                authors = pub.get("authors", [])
                for author in authors:
                    # Skip self
                    if any(
                        variation.lower() in author.lower()
                        for variation in AUTHOR_VARIATIONS
                    ):
                        continue

                    # Clean author name
                    clean_name = author.strip()
                    coauthor_counts[clean_name] = coauthor_counts.get(clean_name, 0) + 1

            # Sort by collaboration frequency
            sorted_coauthors = sorted(
                coauthor_counts.items(), key=lambda x: x[1], reverse=True
            )

            return {
                "totalCoauthors": len(coauthor_counts),
                "topCoauthors": sorted_coauthors[:20],  # Top 20 collaborators
                "coauthorCounts": coauthor_counts,
            }

        except Exception as e:
            logger.error(f"Failed to fetch co-author network: {e}")
            return {}


def main():
    """Main function for testing the ADS fetcher."""
    # Check for API key
    api_key = os.getenv("ADS_API_KEY")
    if not api_key:
        print("Warning: No ADS_API_KEY environment variable found.")
        print("Set it with: export ADS_API_KEY='your-api-key'")
        print("Get a key from: https://ui.adsabs.harvard.edu/user/settings/token")

    fetcher = ADSFetcher(api_key)

    try:
        # Test with limited results
        original_rows = fetcher.config["rows"]
        fetcher.config["rows"] = 5  # Limit for testing

        # Fetch publications
        publications = fetcher.fetch_publications()
        print(f"\nFetched {len(publications)} publications:")
        for pub in publications[:3]:  # Show first 3
            print(f"- {pub['title']} ({pub['year']}) - {pub['citations']} citations")

        # Restore original setting
        fetcher.config["rows"] = original_rows

        # Fetch metrics (this will re-fetch all publications)
        print("\nFetching metrics...")
        metrics = fetcher.fetch_author_metrics()
        print("Metrics:", {k: v for k, v in metrics.items() if k != "citationsPerYear"})

    except Exception as e:
        logger.error(f"Error in main: {e}")


if __name__ == "__main__":
    main()
