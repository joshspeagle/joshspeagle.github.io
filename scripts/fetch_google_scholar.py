"""
Google Scholar data fetcher for publication metrics.
"""

import time
import logging
from typing import Dict, List, Optional
from scholarly import scholarly, ProxyGenerator
from config import CONFIG

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class GoogleScholarFetcher:
    """Fetches publication data from Google Scholar."""

    def __init__(self):
        self.config = CONFIG["google_scholar"]
        self.author_id = self.config["author_id"]
        self.max_results = self.config["max_results"]
        self.retry_attempts = self.config["retry_attempts"]
        self.retry_delay = self.config["retry_delay"]

        # Set up proxy if needed (helps with rate limiting)
        try:
            pg = ProxyGenerator()
            pg.FreeProxies()
            scholarly.use_proxy(pg)
            logger.info("Using proxy for Google Scholar requests")
        except Exception as e:
            logger.warning(f"Could not set up proxy: {e}. Using direct connection.")

    def fetch_author_metrics(self) -> Dict:
        """Fetch author-level metrics from Google Scholar."""
        for attempt in range(self.retry_attempts):
            try:
                logger.info(f"Fetching author metrics (attempt {attempt + 1})")

                # Get author information
                author = scholarly.search_author_id(self.author_id)
                author = scholarly.fill(author, sections=["basics", "indices"])

                metrics = {
                    "totalPapers": len(author.get("publications", [])),
                    "hIndex": author.get("hindex", 0),
                    "i10Index": author.get("i10index", 0),
                    "totalCitations": author.get("citedby", 0),
                    "citationsPerYear": author.get("cites_per_year", {}),
                    "lastUpdated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                }

                logger.info(
                    f"Successfully fetched metrics: {metrics['totalPapers']} papers, "
                    f"h-index: {metrics['hIndex']}, citations: {metrics['totalCitations']}"
                )

                return metrics

            except Exception as e:
                logger.error(f"Attempt {attempt + 1} failed: {e}")
                if attempt < self.retry_attempts - 1:
                    time.sleep(self.retry_delay)
                else:
                    raise Exception(
                        f"Failed to fetch author metrics after {self.retry_attempts} attempts"
                    )

    def fetch_publications(self) -> List[Dict]:
        """Fetch detailed publication list from Google Scholar."""
        publications = []

        for attempt in range(self.retry_attempts):
            try:
                logger.info(f"Fetching publications (attempt {attempt + 1})")

                # Get author and fill with publications
                author = scholarly.search_author_id(self.author_id)
                author = scholarly.fill(author, sections=["publications"])

                for i, pub in enumerate(author.get("publications", [])):
                    if i >= self.max_results:
                        break

                    try:
                        # Fill publication with detailed information
                        pub_detail = scholarly.fill(pub)

                        # Extract relevant information
                        publication = self._extract_publication_info(pub_detail)
                        if publication:
                            publications.append(publication)

                        # Add delay to avoid rate limiting
                        time.sleep(1)

                        if (i + 1) % 10 == 0:
                            logger.info(f"Processed {i + 1} publications...")

                    except Exception as e:
                        logger.warning(
                            f"Failed to fetch details for publication {i}: {e}"
                        )
                        continue

                logger.info(f"Successfully fetched {len(publications)} publications")
                return publications

            except Exception as e:
                logger.error(f"Attempt {attempt + 1} failed: {e}")
                if attempt < self.retry_attempts - 1:
                    time.sleep(self.retry_delay)
                else:
                    logger.error(
                        f"Failed to fetch publications after {self.retry_attempts} attempts"
                    )
                    return publications  # Return what we have

    def _extract_publication_info(self, pub: Dict) -> Optional[Dict]:
        """Extract and normalize publication information."""
        try:
            title = pub.get("bib", {}).get("title", "").strip()
            if not title:
                return None

            # Extract basic information
            bib = pub.get("bib", {})

            publication = {
                "id": f"scholar_{hash(title)}",  # Generate unique ID
                "title": title,
                "authors": self._parse_authors(bib.get("author", "")),
                "year": self._parse_year(bib.get("pub_year")),
                "journal": bib.get("venue", ""),
                "citations": pub.get("num_citations", 0),
                "url": pub.get("pub_url", ""),
                "abstract": bib.get("abstract", ""),
                "source": "google_scholar",
            }

            # Try to extract DOI or arXiv ID from URL or other fields
            self._extract_identifiers(publication, pub)

            # Classify research area based on title and abstract
            publication["researchArea"] = self._classify_research_area(
                title, publication["abstract"]
            )

            return publication

        except Exception as e:
            logger.warning(f"Failed to extract publication info: {e}")
            return None

    def _parse_authors(self, author_string: str) -> List[str]:
        """Parse author string into list of authors."""
        if not author_string:
            return []

        # Split on common delimiters
        authors = []
        for delimiter in [", ", " and ", " & "]:
            if delimiter in author_string:
                authors = [a.strip() for a in author_string.split(delimiter)]
                break
        else:
            authors = [author_string.strip()]

        return [a for a in authors if a]

    def _parse_year(self, year_value) -> Optional[int]:
        """Parse year from various formats."""
        if not year_value:
            return None

        try:
            if isinstance(year_value, int):
                return year_value
            elif isinstance(year_value, str):
                # Extract first 4-digit number that looks like a year
                import re

                match = re.search(r"\b(19|20)\d{2}\b", year_value)
                if match:
                    return int(match.group())
        except:
            pass

        return None

    def _extract_identifiers(self, publication: Dict, pub: Dict):
        """Extract DOI, arXiv ID, and other identifiers."""
        url = pub.get("pub_url", "")

        # Extract DOI
        import re

        doi_match = re.search(r"doi\.org/(.+)", url)
        if doi_match:
            publication["doi"] = doi_match.group(1)

        # Extract arXiv ID
        arxiv_match = re.search(r"arxiv\.org/abs/(.+)", url)
        if arxiv_match:
            publication["arxivId"] = arxiv_match.group(1)

        # Store original URL
        if url:
            publication["scholarUrl"] = url

    def _classify_research_area(self, title: str, abstract: str) -> str:
        """Classify publication into research area based on keywords."""
        text = f"{title} {abstract}".lower()

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


def main():
    """Main function for testing the Google Scholar fetcher."""
    fetcher = GoogleScholarFetcher()

    try:
        # Fetch metrics
        metrics = fetcher.fetch_author_metrics()
        print("Metrics:", metrics)

        # Fetch first few publications for testing
        fetcher.max_results = 5  # Limit for testing
        publications = fetcher.fetch_publications()
        print(f"\nFetched {len(publications)} publications:")
        for pub in publications[:3]:  # Show first 3
            print(f"- {pub['title']} ({pub['year']}) - {pub['citations']} citations")

    except Exception as e:
        logger.error(f"Error in main: {e}")


if __name__ == "__main__":
    main()
