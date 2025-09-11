"""
OpenAlex data fetcher for publication data.
"""

import logging
import time
from typing import Dict, List, Optional
import pyalex
from config import CONFIG, AUTHOR_VARIATIONS, JOURNAL_MAPPINGS

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class OpenAlexFetcher:
    """Fetches publication data from OpenAlex."""

    def __init__(self, email: Optional[str] = None):
        self.config = CONFIG.get("openalex", {})
        self.email = email
        self.retry_attempts = 3
        self.retry_delay = 1

        # Configure PyAlex
        if self.email:
            pyalex.config.email = self.email
            logger.info(f"OpenAlex configured with email: {self.email}")
        else:
            logger.warning(
                "No email configured for OpenAlex. Consider adding one for better rate limits."
            )

    def search_papers_by_title(self, paper_list: List[Dict]) -> List[Dict]:
        """Search for papers in OpenAlex by title matching."""
        logger.info(f"Searching OpenAlex for {len(paper_list)} papers")
        matched_papers = []

        for i, paper in enumerate(paper_list):
            try:
                title = paper.get("title", "").strip()
                if not title:
                    continue

                # Search OpenAlex for this paper
                openalex_paper = self._search_single_paper(title, paper.get("year"))
                if openalex_paper:
                    matched_papers.append(openalex_paper)
                    logger.debug(f"Found OpenAlex match for: {title[:50]}...")
                else:
                    logger.debug(f"No OpenAlex match for: {title[:50]}...")

                # Rate limiting
                time.sleep(0.1)  # OpenAlex is generous but we should still be polite

                if (i + 1) % 10 == 0:
                    logger.info(
                        f"Searched {i + 1}/{len(paper_list)} papers in OpenAlex"
                    )

            except Exception as e:
                logger.warning(f"Error searching for paper '{title[:50]}...': {e}")
                continue

        logger.info(f"Found {len(matched_papers)} matches in OpenAlex")
        return matched_papers

    def _search_single_paper(
        self, title: str, year: Optional[int] = None
    ) -> Optional[Dict]:
        """Search for a single paper in OpenAlex with improved search strategies."""
        for attempt in range(self.retry_attempts):
            try:
                # Multiple search strategies to handle normalization inconsistencies
                search_strategies = [
                    ("broad_terms", self._create_broad_terms_query(title)),
                    ("meaningful_words", self._create_meaningful_words_query(title)),
                    ("normalized", self._create_normalized_search_query(title)),
                    ("key_terms", self._create_key_terms_query(title)),
                    ("exact_quote", f'"{title}"'),
                ]

                # Try each search strategy with early termination for performance
                for strategy_name, search_query in search_strategies:
                    try:
                        works_query = pyalex.Works()
                        works_query = works_query.search(search_query)
                        # Remove type filter to include both articles and preprints
                        # Many papers are indexed as preprints, not just articles
                        works_query = works_query.filter(
                            raw_author_name={"search": "Speagle"}
                        )

                        # Get more results to avoid missing papers outside top 5
                        works = works_query.get(per_page=20)

                        if works:
                            logger.debug(
                                f"{strategy_name} strategy found {len(works)} results"
                            )

                            # Check for good match in this strategy's results - early termination
                            for work in works:
                                openalex_title = work.get("title") or ""
                                if not openalex_title:
                                    continue
                                openalex_title = openalex_title.strip()

                                score = self._calculate_title_similarity(
                                    title, openalex_title
                                )
                                if (
                                    score >= 0.67
                                ):  # Found good match - return immediately
                                    logger.debug(
                                        f"Early match found with '{strategy_name}' strategy, similarity: {score:.3f}"
                                    )
                                    return self._extract_publication_info(work)

                    except Exception as e:
                        logger.debug(f"{strategy_name} strategy failed: {e}")
                        continue

                # No good match found across all strategies
                logger.debug("No match found across all search strategies")

                return None

            except Exception as e:
                logger.warning(f"Attempt {attempt + 1} failed for title search: {e}")
                if attempt < self.retry_attempts - 1:
                    time.sleep(self.retry_delay * (attempt + 1))
                else:
                    return None

    def _create_broad_terms_query(self, title: str) -> str:
        """Create broad search query using first 2-3 most distinctive terms."""
        # This strategy addresses cases like "Euclid preparation-X." where we want "Euclid preparation"
        words = title.split()

        # Find distinctive terms, avoiding Roman numerals and common connector words
        stop_words = {
            "the",
            "a",
            "an",
            "of",
            "for",
            "with",
            "in",
            "on",
            "at",
            "to",
            "by",
            "and",
            "or",
            "from",
            "using",
            "based",
        }

        # Also avoid Roman numerals and single letters that might cause issues
        roman_numerals = {"i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"}

        broad_terms = []
        seen_terms = set()  # Track terms to avoid duplicates

        for word in words:
            clean_word = word.lower().strip(".,:-();")
            # Skip stop words, Roman numerals, and very short words
            if (
                len(clean_word) > 2
                and clean_word not in stop_words
                and clean_word not in roman_numerals
                and not clean_word.endswith(".")  # Skip "X." type terms
                and not clean_word.isdigit()
            ):
                # Take part before punctuation and normalize case
                base_term = word.split("-")[0].split(":")[0].strip()
                base_term_lower = base_term.lower()

                # Only add if we haven't seen this term before
                if base_term_lower not in seen_terms:
                    broad_terms.append(base_term)
                    seen_terms.add(base_term_lower)

        # Return first 2-3 broad terms for focused search
        return " ".join(broad_terms[:3])

    def _create_normalized_search_query(self, title: str) -> str:
        """Create a search query using same normalization as similarity calculation."""
        # Use the same normalization as similarity calculation to ensure consistency
        normalized = self._normalize_title(title)
        # Re-add spaces where needed and clean up
        import re

        normalized = re.sub(r"\s+", " ", normalized).strip()
        return normalized

    def _create_meaningful_words_query(self, title: str) -> str:
        """Create search query using meaningful words (original approach)."""
        clean_title = title.replace('"', "").replace('"', "").replace('"', "").strip()
        clean_title = clean_title.replace("∼", "~")

        words = clean_title.split()
        stop_words = {
            "the",
            "a",
            "an",
            "of",
            "for",
            "with",
            "in",
            "on",
            "at",
            "to",
            "by",
            "and",
            "or",
            "from",
        }
        meaningful_words = [
            w for w in words if w.lower() not in stop_words and len(w) > 2
        ]

        if meaningful_words:
            return " ".join(meaningful_words)
        else:
            return clean_title

    def _create_key_terms_query(self, title: str) -> str:
        """Create search query using most distinctive terms."""
        words = title.split()
        stop_words = {
            "the",
            "a",
            "an",
            "of",
            "for",
            "with",
            "in",
            "on",
            "at",
            "to",
            "by",
            "and",
            "or",
            "from",
            "using",
            "based",
            "study",
            "analysis",
            "approach",
            "method",
            "technique",
        }

        # Normalize punctuation that might cause search issues
        import re

        key_words = []
        for word in words:
            # Clean word and normalize punctuation
            clean_word = re.sub(r"[^\w]", "", word.lower())
            if (
                len(clean_word) > 3
                and clean_word not in stop_words
                and not clean_word.isdigit()
            ):
                # Use original word but without problematic punctuation
                normalized_word = re.sub(r"[-–—:]", " ", word).strip()
                if normalized_word:
                    key_words.append(normalized_word)

        return " ".join(key_words[:5])  # Top 5 distinctive terms

    def _calculate_title_similarity(self, title1: str, title2: str) -> float:
        """Calculate similarity between two titles."""
        from difflib import SequenceMatcher

        # Normalize titles
        title1 = self._normalize_title(title1)
        title2 = self._normalize_title(title2)

        return SequenceMatcher(None, title1, title2).ratio()

    def _normalize_title(self, title: str) -> str:
        """Normalize title for comparison."""
        import re
        import html

        # Step 1: Handle double-encoded HTML entities (&amp;lt; → &lt; → <)
        # Decode multiple times to handle nested encoding
        prev_title = ""
        while prev_title != title:
            prev_title = title
            title = html.unescape(title)

        # Step 2: Strip HTML tags (<i>z</i> → z)
        title = re.sub(r"<[^>]+>", "", title)

        # Step 3: Standard normalization - remove punctuation and convert to lowercase
        title = re.sub(r"[^\w\s]", "", title.lower())
        title = re.sub(r"\s+", " ", title).strip()
        return title

    def _extract_publication_info(self, work: Dict) -> Optional[Dict]:
        """Extract and normalize publication information from OpenAlex work."""
        try:
            title = work.get("title", "").strip()
            if not title:
                return None

            # Extract authors
            authors = []
            authorships = work.get("authorships", [])
            for authorship in authorships:
                author = authorship.get("author", {})
                display_name = author.get("display_name", "")
                if display_name:
                    authors.append(display_name)

            # Extract year
            year = work.get("publication_year")

            # Extract journal/venue
            journal = ""
            primary_location = work.get("primary_location", {})
            if primary_location:
                source = primary_location.get("source", {})
                journal = source.get("display_name", "")

            # Map abbreviations to full names
            for abbrev, full_name in JOURNAL_MAPPINGS.items():
                if abbrev in journal:
                    journal = full_name
                    break

            # Extract identifiers
            doi = work.get("doi")
            if doi and doi.startswith("https://doi.org/"):
                doi = doi.replace("https://doi.org/", "")

            # Extract arXiv ID from IDs
            arxiv_id = None
            ids = work.get("ids", {})
            if "arxiv" in ids:
                arxiv_url = ids["arxiv"]
                if arxiv_url:
                    import re

                    match = re.search(r"arxiv\.org/abs/(.+)", arxiv_url)
                    if match:
                        arxiv_id = match.group(1)

            # Extract abstract
            abstract = ""
            abstract_inverted = work.get("abstract_inverted_index")
            if abstract_inverted:
                # Convert inverted index to full text
                abstract = self._convert_inverted_abstract(abstract_inverted)

            # Extract citations
            citations = work.get("cited_by_count", 0)

            # Extract keywords from concepts
            keywords = []
            concepts = work.get("concepts", [])
            for concept in concepts[:10]:  # Top 10 concepts
                display_name = concept.get("display_name", "")
                if (
                    display_name and concept.get("score", 0) > 0.3
                ):  # High confidence concepts
                    keywords.append(display_name)

            publication = {
                "id": f"openalex_{work.get('id', '').split('/')[-1]}",
                "title": title,
                "authors": authors,
                "year": year,
                "journal": journal.strip(),
                "citations": citations,
                "abstract": abstract.strip(),
                "keywords": keywords,
                "source": "openalex",
            }

            # Add identifiers if available
            if doi:
                publication["doi"] = doi
            if arxiv_id:
                publication["arxivId"] = arxiv_id

            # Add OpenAlex URL
            openalex_id = work.get("id", "")
            if openalex_id:
                publication["openalexUrl"] = openalex_id

            # Classify research area
            publication["researchArea"] = self._classify_research_area(
                title, abstract, keywords
            )

            return publication

        except Exception as e:
            logger.warning(f"Failed to extract publication info from OpenAlex: {e}")
            return None

    def _convert_inverted_abstract(self, inverted_index: Dict) -> str:
        """Convert OpenAlex inverted abstract to full text."""
        try:
            # Create a list to hold words in order
            words = [""] * 1000  # Start with reasonable size

            max_position = 0
            for word, positions in inverted_index.items():
                for pos in positions:
                    if pos >= len(words):
                        # Extend list if needed
                        words.extend([""] * (pos - len(words) + 100))
                    words[pos] = word
                    max_position = max(max_position, pos)

            # Join non-empty words
            abstract_words = [word for word in words[: max_position + 1] if word]
            return " ".join(abstract_words)

        except Exception as e:
            logger.warning(f"Failed to convert inverted abstract: {e}")
            return ""

    def _classify_research_area(
        self, title: str, abstract: str, keywords: List[str]
    ) -> str:
        """Classify publication into research area based on keywords."""
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

    def fetch_author_metrics(self) -> Dict:
        """Fetch author-level metrics from OpenAlex."""
        try:
            logger.info("Fetching author metrics from OpenAlex")

            # Search for author
            authors = (
                pyalex.Authors()
                .search(f"display_name.search:{AUTHOR_VARIATIONS[0]}")
                .get()
            )

            if not authors:
                logger.warning("No author found in OpenAlex")
                return {}

            # Get the best matching author
            author = authors[0]  # Assume first result is best match

            # Get author's works
            author_id = author.get("id", "").split("/")[-1]
            works = pyalex.Works().filter(author={"id": author_id}).get()

            if not works:
                logger.warning("No works found for author in OpenAlex")
                return {}

            # Calculate metrics
            total_papers = len(works)
            total_citations = sum(work.get("cited_by_count", 0) for work in works)

            # Calculate h-index
            citation_counts = sorted(
                [work.get("cited_by_count", 0) for work in works], reverse=True
            )
            h_index = 0
            for i, citations in enumerate(citation_counts):
                if citations >= i + 1:
                    h_index = i + 1
                else:
                    break

            # Calculate i10-index
            i10_index = sum(1 for work in works if work.get("cited_by_count", 0) >= 10)

            # Calculate citations per year
            citations_per_year = {}
            for work in works:
                year = work.get("publication_year")
                if year and year >= 2000:
                    citations_per_year[str(year)] = citations_per_year.get(
                        str(year), 0
                    ) + work.get("cited_by_count", 0)

            metrics = {
                "totalPapers": total_papers,
                "hIndex": h_index,
                "i10Index": i10_index,
                "totalCitations": total_citations,
                "citationsPerYear": citations_per_year,
                "lastUpdated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "source": "openalex",
            }

            logger.info(
                f"OpenAlex metrics: {total_papers} papers, h-index: {h_index}, citations: {total_citations}"
            )

            return metrics

        except Exception as e:
            logger.error(f"Failed to fetch author metrics from OpenAlex: {e}")
            return {}


def main():
    """Main function for testing the OpenAlex fetcher."""
    fetcher = OpenAlexFetcher()

    try:
        # Test with a sample paper
        test_papers = [
            {
                "title": "dynesty: a dynamic nested sampling package for estimating Bayesian posteriors and evidences",
                "year": 2020,
            }
        ]

        # Search for papers
        results = fetcher.search_papers_by_title(test_papers)
        print(f"\nFound {len(results)} papers:")
        for paper in results:
            print(
                f"- {paper['title']} ({paper['year']}) - {paper['citations']} citations"
            )

        # Fetch author metrics
        print("\nFetching author metrics...")
        metrics = fetcher.fetch_author_metrics()
        if metrics:
            print(
                "Author metrics:",
                {k: v for k, v in metrics.items() if k != "citationsPerYear"},
            )

    except Exception as e:
        logger.error(f"Error in main: {e}")


if __name__ == "__main__":
    main()
