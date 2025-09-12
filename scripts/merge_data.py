"""
Data consolidation and merging logic for publication data from multiple sources.
"""

import json
import logging
import os
import time
from datetime import datetime
from typing import Dict, List, Optional
from difflib import SequenceMatcher
from config import CONFIG

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DataMerger:
    """Merges and consolidates publication data from multiple sources."""

    def __init__(self):
        self.config = CONFIG
        self.validation = CONFIG["validation"]

    def merge_publications_multisource(
        self,
        paper_list: List[Dict],
        scholar_data: List[Dict],
        ads_data: List[Dict],
        openalex_data: List[Dict],
    ) -> List[Dict]:
        """Merge publication data from multiple sources."""
        logger.info(
            f"Merging data from {len(scholar_data)} Scholar, {len(ads_data)} ADS, and {len(openalex_data)} OpenAlex papers"
        )

        merged_publications = []

        # Process each paper from the original list
        for paper in paper_list:
            title = paper.get("title", "").strip()
            if not title:
                continue

            # Find matches in each source
            scholar_match = self._find_best_match(paper, scholar_data)
            ads_match = self._find_best_match(paper, ads_data)
            openalex_match = self._find_best_match(paper, openalex_data)

            # Merge data from all available sources
            merged_paper = self._merge_multisource(
                paper, scholar_match, ads_match, openalex_match
            )
            if merged_paper:
                merged_publications.append(merged_paper)

        # Check for duplicates before returning
        deduplicated_publications = self._check_for_duplicates(merged_publications)

        logger.info(
            f"Merged into {len(deduplicated_publications)} publications with multi-source data"
        )
        return sorted(
            deduplicated_publications, key=lambda x: x.get("year", 0), reverse=True
        )

    def _find_best_match(
        self, target_paper: Dict, source_data: List[Dict]
    ) -> Optional[Dict]:
        """Find the best matching paper in a source dataset."""
        target_title = target_paper.get("title", "").strip()
        if not target_title:
            return None

        best_match = None
        best_score = 0

        for paper in source_data:
            score = self._calculate_similarity(target_paper, paper)
            if score > best_score and score >= 0.67:  # Minimum threshold (2/3rds)
                best_score = score
                best_match = paper

        return best_match

    def _merge_multisource(
        self,
        base_paper: Dict,
        scholar_data: Optional[Dict],
        ads_data: Optional[Dict],
        openalex_data: Optional[Dict],
    ) -> Dict:
        """Merge a paper's data from multiple sources."""
        merged = {}

        # Start with base paper data
        merged.update(base_paper)

        # Track sources that provided data
        sources_found = [base_paper.get("source", "base")]
        citations_by_source = {}

        # Merge ADS data (usually most complete metadata)
        if ads_data:
            merged.update(ads_data)
            sources_found.append("ads")
            citations_by_source["ads"] = ads_data.get("citations", 0)

        # Merge OpenAlex data
        if openalex_data:
            # Take longer abstract if available
            if len(openalex_data.get("abstract", "")) > len(merged.get("abstract", "")):
                merged["abstract"] = openalex_data["abstract"]

            # Add OpenAlex identifiers
            if "openalexUrl" in openalex_data:
                merged["openalexUrl"] = openalex_data["openalexUrl"]

            # Merge keywords
            existing_keywords = set(merged.get("keywords", []))
            openalex_keywords = set(openalex_data.get("keywords", []))
            merged["keywords"] = list(existing_keywords | openalex_keywords)

            sources_found.append("openalex")
            citations_by_source["openalex"] = openalex_data.get("citations", 0)

        # Merge Google Scholar data
        if scholar_data:
            # Take longer abstract if available
            if len(scholar_data.get("abstract", "")) > len(merged.get("abstract", "")):
                merged["abstract"] = scholar_data["abstract"]

            # Add Scholar URLs
            if "scholarUrl" in scholar_data:
                merged["scholarUrl"] = scholar_data["scholarUrl"]

            # Merge identifiers if not already present
            for field in ["doi", "arxivId"]:
                if field not in merged and field in scholar_data:
                    merged[field] = scholar_data[field]

            sources_found.append("google_scholar")
            citations_by_source["google_scholar"] = scholar_data.get("citations", 0)

        # Set maximum citation count across all sources
        if citations_by_source:
            merged["citations"] = max(citations_by_source.values())
            merged["citations_by_source"] = citations_by_source
        else:
            merged["citations"] = merged.get("citations", 0)

        # Remove duplicates from sources
        merged["sources"] = list(set(sources_found))

        # Ensure we have essential fields
        if not merged.get("title"):
            return None

        return merged

    def merge_publications(
        self, scholar_data: List[Dict], ads_data: List[Dict]
    ) -> List[Dict]:
        """Legacy merge function for backward compatibility."""
        logger.info(
            f"Merging {len(scholar_data)} Scholar papers with {len(ads_data)} ADS papers"
        )

        merged_publications = []
        scholar_used = set()

        # First pass: match ADS papers with Scholar papers
        for ads_pub in ads_data:
            best_match = None
            best_score = 0
            best_scholar_idx = -1

            for i, scholar_pub in enumerate(scholar_data):
                if i in scholar_used:
                    continue

                score = self._calculate_similarity(ads_pub, scholar_pub)
                if score > best_score and score > 0.8:  # Threshold for matching
                    best_score = score
                    best_match = scholar_pub
                    best_scholar_idx = i

            if best_match:
                # Merge the two publications
                merged_pub = self._merge_publications(ads_pub, best_match)
                merged_publications.append(merged_pub)
                scholar_used.add(best_scholar_idx)
                logger.debug(
                    f"Merged: {merged_pub['title'][:50]}... (score: {best_score:.2f})"
                )
            else:
                # Add ADS-only publication
                merged_publications.append(ads_pub)

        # Second pass: add remaining Scholar-only publications
        for i, scholar_pub in enumerate(scholar_data):
            if i not in scholar_used:
                merged_publications.append(scholar_pub)

        logger.info(f"Merged into {len(merged_publications)} unique publications")
        return sorted(merged_publications, key=lambda x: x.get("year", 0), reverse=True)

    def _calculate_similarity(self, pub1: Dict, pub2: Dict) -> float:
        """Calculate similarity score between two publications."""
        title1 = self._normalize_title(pub1.get("title", ""))
        title2 = self._normalize_title(pub2.get("title", ""))

        # Title similarity (most important)
        title_score = SequenceMatcher(None, title1, title2).ratio()

        # Year similarity
        year1 = pub1.get("year")
        year2 = pub2.get("year")
        year_score = 1.0 if year1 == year2 else 0.0

        # DOI/arXiv matching (if available)
        identifier_score = 0.0
        doi1 = pub1.get("doi", "").lower()
        doi2 = pub2.get("doi", "").lower()
        arxiv1 = pub1.get("arxivId", "").lower()
        arxiv2 = pub2.get("arxivId", "").lower()

        if doi1 and doi2 and doi1 == doi2:
            identifier_score = 1.0
        elif arxiv1 and arxiv2 and arxiv1 == arxiv2:
            identifier_score = 1.0

        # Weighted combination
        if identifier_score > 0:
            return identifier_score  # Perfect match via identifier
        else:
            return 0.7 * title_score + 0.3 * year_score

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

    def _check_for_duplicates(self, publications: List[Dict]) -> List[Dict]:
        """Check for duplicate publications and warn user, return deduplicated list."""
        from collections import defaultdict
        from rich.console import Console

        console = Console()

        if not publications:
            return publications

        # Group publications by normalized title
        title_groups = defaultdict(list)
        for i, pub in enumerate(publications):
            normalized_title = self._normalize_title(pub.get("title", ""))
            title_groups[normalized_title].append((i, pub))

        # Find duplicates
        duplicates_found = []
        deduplicated_list = []
        processed_indices = set()

        for normalized_title, pubs in title_groups.items():
            if len(pubs) > 1:
                duplicates_found.append(pubs)

                # For duplicates, prefer the one with more complete data
                best_pub = None
                best_score = -1
                best_idx = -1

                for idx, pub in pubs:
                    # Primary factor: publication type priority (journal > preprint > ASCL)
                    priority = self._get_publication_priority(pub)
                    score = priority * 100  # Weight publication type heavily

                    # Secondary factor: completeness (more sources = better)
                    score += len(pub.get("sources", [])) * 10

                    # Tie-breaker: higher citation count
                    score += (
                        pub.get("citations", 0) / 10000.0
                    )  # Small weight for citations

                    if score > best_score:
                        best_score = score
                        best_pub = pub
                        best_idx = idx

                # Keep the best one
                if best_pub:
                    deduplicated_list.append(best_pub)
                    processed_indices.update(idx for idx, _ in pubs)

                # Report the duplicates
                console.print(f"\n⚠️  [yellow]DUPLICATE DETECTED:[/yellow]")
                console.print(f"   Title: {pubs[0][1].get('title', 'N/A')[:80]}...")
                console.print(f"   Found {len(pubs)} identical publications:")

                for idx, pub in pubs:
                    is_kept = idx == best_idx
                    status = "✅ KEPT" if is_kept else "❌ REMOVED"
                    scholar_id = pub.get("scholar_id", "N/A")
                    sources = ", ".join(pub.get("sources", []))
                    citations = pub.get("citations", 0)
                    priority = self._get_publication_priority(pub)
                    journal = pub.get("journal", "N/A")[:30] + (
                        "..." if len(pub.get("journal", "")) > 30 else ""
                    )
                    console.print(
                        f"   {status}: Scholar ID: {scholar_id}, Sources: [{sources}], Citations: {citations}, Priority: {priority}, Journal: {journal}"
                    )

                console.print(
                    f"   [dim]Please check Google Scholar for duplicate entries[/dim]"
                )
            else:
                # No duplicates, add to deduplicated list
                deduplicated_list.append(pubs[0][1])
                processed_indices.add(pubs[0][0])

        if duplicates_found:
            total_duplicates = sum(len(group) for group in duplicates_found) - len(
                duplicates_found
            )
            console.print(f"\n📊 [yellow]Duplicate Summary:[/yellow]")
            console.print(
                f"   Found {len(duplicates_found)} duplicate groups affecting {total_duplicates} publications"
            )
            console.print(f"   Automatically kept the most complete version of each")
            console.print(
                f"   Deduplicated: {len(publications)} → {len(deduplicated_list)} publications"
            )
            console.print(
                f"   [bold]Action needed:[/bold] Check Google Scholar profile for duplicate entries"
            )

        return deduplicated_list

    def _merge_publications(self, ads_pub: Dict, scholar_pub: Dict) -> Dict:
        """Merge two publication records, preferring the most complete data."""
        merged = {}

        # Use ADS as base (usually more complete metadata)
        merged.update(ads_pub)

        # Update with Scholar data where appropriate
        # Prefer higher citation count
        ads_citations = ads_pub.get("citations", 0)
        scholar_citations = scholar_pub.get("citations", 0)
        merged["citations"] = max(ads_citations, scholar_citations)

        # Keep both URLs if different
        if "scholarUrl" in scholar_pub:
            merged["scholarUrl"] = scholar_pub["scholarUrl"]

        # Merge identifiers
        if "doi" not in merged and "doi" in scholar_pub:
            merged["doi"] = scholar_pub["doi"]
        if "arxivId" not in merged and "arxivId" in scholar_pub:
            merged["arxivId"] = scholar_pub["arxivId"]

        # Use the more complete abstract
        if len(scholar_pub.get("abstract", "")) > len(merged.get("abstract", "")):
            merged["abstract"] = scholar_pub["abstract"]

        # Combine sources
        merged["sources"] = ["ads", "google_scholar"]

        return merged

    def merge_metrics_multisource(
        self, scholar_metrics: Dict, ads_metrics: Dict, openalex_metrics: Dict
    ) -> Dict:
        """Merge author metrics from multiple sources."""
        logger.info("Merging author metrics from multiple sources")

        merged_metrics = {
            "lastUpdated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }

        # Take the maximum values (usually most accurate)
        for metric in ["totalPapers", "hIndex", "i10Index", "totalCitations"]:
            scholar_val = scholar_metrics.get(metric, 0)
            ads_val = ads_metrics.get(metric, 0)
            openalex_val = openalex_metrics.get(metric, 0)
            merged_metrics[metric] = max(scholar_val, ads_val, openalex_val)

        # Use Google Scholar citations per year (most reliable for this metric)
        # Other sources often have incorrect or incomplete citation timeline data
        scholar_cpy = scholar_metrics.get("citationsPerYear", {})

        if scholar_cpy:
            # Use Google Scholar data as authoritative source
            merged_metrics["citationsPerYear"] = scholar_cpy
        else:
            # Fallback to merged data if Google Scholar unavailable
            ads_cpy = ads_metrics.get("citationsPerYear", {})
            openalex_cpy = openalex_metrics.get("citationsPerYear", {})

            merged_cpy = {}
            all_years = set(ads_cpy.keys()) | set(openalex_cpy.keys())
            for year in all_years:
                merged_cpy[year] = max(
                    ads_cpy.get(year, 0),
                    openalex_cpy.get(year, 0),
                )

            merged_metrics["citationsPerYear"] = merged_cpy

        # Add source information
        merged_metrics["sources"] = []
        if scholar_metrics:
            merged_metrics["sources"].append("google_scholar")
        if ads_metrics:
            merged_metrics["sources"].append("ads")
        if openalex_metrics:
            merged_metrics["sources"].append("openalex")

        return merged_metrics

    def merge_metrics(self, scholar_metrics: Dict, ads_metrics: Dict) -> Dict:
        """Legacy merge function for backward compatibility."""
        logger.info("Merging author metrics")

        merged_metrics = {
            "lastUpdated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }

        # Take the maximum values (usually most accurate)
        for metric in ["totalPapers", "hIndex", "i10Index", "totalCitations"]:
            scholar_val = scholar_metrics.get(metric, 0)
            ads_val = ads_metrics.get(metric, 0)
            merged_metrics[metric] = max(scholar_val, ads_val)

        # Use Google Scholar citations per year (most reliable for this metric)
        scholar_cpy = scholar_metrics.get("citationsPerYear", {})

        if scholar_cpy:
            # Use Google Scholar data as authoritative source
            merged_metrics["citationsPerYear"] = scholar_cpy
        else:
            # Fallback to ADS data if Google Scholar unavailable
            ads_cpy = ads_metrics.get("citationsPerYear", {})
            merged_metrics["citationsPerYear"] = ads_cpy

        # Add source information
        merged_metrics["sources"] = []
        if scholar_metrics:
            merged_metrics["sources"].append("google_scholar")
        if ads_metrics:
            merged_metrics["sources"].append("ads")

        return merged_metrics

    def _get_publication_priority(self, pub: Dict) -> int:
        """Assign priority to publication types, preferring journal articles over ASCL entries."""
        try:
            # Get identifiers and URLs to determine publication type
            bibcode = pub.get("bibcode", "").lower()
            journal = pub.get("journal", "").lower()
            title = pub.get("title", "").lower()
            scholar_url = pub.get("scholarUrl", "").lower()
            ads_url = pub.get("adsUrl", "").lower()

            # Check for ASCL entries (software/code repositories)
            is_ascl = (
                "ascl" in bibcode
                or "ascl" in ads_url
                or "astrophysics source code library" in journal
                or "ascl.net" in scholar_url
            )

            # Check for software-related indicators
            is_software = "software" in journal.lower() or "code" in journal.lower()

            if is_ascl or is_software:
                return 1  # Low priority for ASCL/software entries
            elif "arxiv" in journal or "eprint" in bibcode or "preprint" in journal:
                return 3  # High priority for preprints
            elif any(
                journal_type in journal
                for journal_type in [
                    "astrophysical journal",
                    "mnras",
                    "monthly notices",
                    "astronomy astrophysics",
                    "astronomical journal",
                    "journal",
                    "proceedings",
                    "letters",
                ]
            ):
                return 4  # Highest priority for journal articles
            else:
                return 2  # Medium priority for other types

        except Exception as e:
            logger.debug(f"Error determining publication priority: {e}")
            return 2  # Default medium priority

    def generate_summary_data(self, full_data: Dict) -> Dict:
        """Generate lightweight summary data for quick loading."""
        summary = {
            "lastUpdated": full_data.get("lastUpdated"),
            "metrics": full_data.get("metrics", {}),
            "featuredPublications": [],
            "recentPublications": [],
        }

        publications = full_data.get("publications", [])

        # Get top cited papers for featured
        by_citations = sorted(
            publications, key=lambda x: x.get("citations", 0), reverse=True
        )
        summary["featuredPublications"] = [
            {
                "title": pub["title"],
                "year": pub.get("year"),
                "citations": pub.get("citations", 0),
                "journal": pub.get("journal", ""),
                "url": pub.get("adsUrl") or pub.get("scholarUrl", ""),
            }
            for pub in by_citations[:5]
        ]

        # Get recent papers
        by_year = sorted(publications, key=lambda x: x.get("year", 0), reverse=True)
        summary["recentPublications"] = [
            {
                "title": pub["title"],
                "year": pub.get("year"),
                "citations": pub.get("citations", 0),
                "journal": pub.get("journal", ""),
                "url": pub.get("adsUrl") or pub.get("scholarUrl", ""),
            }
            for pub in by_year[:5]
        ]

        return summary

    def validate_data(self, data: Dict) -> bool:
        """Validate merged data against expected ranges."""
        logger.info("Validating merged data")

        metrics = data.get("metrics", {})

        # Check minimum papers
        total_papers = metrics.get("totalPapers", 0)
        if total_papers < self.validation["min_papers"]:
            logger.warning(
                f"Total papers ({total_papers}) below expected minimum ({self.validation['min_papers']})"
            )

        # Check h-index sanity
        h_index = metrics.get("hIndex", 0)
        if h_index > self.validation["max_h_index"]:
            logger.warning(
                f"H-index ({h_index}) seems unusually high (max: {self.validation['max_h_index']})"
            )

        # Check total citations
        total_citations = metrics.get("totalCitations", 0)
        if total_citations > self.validation["max_citations"]:
            logger.warning(
                f"Total citations ({total_citations}) seems unusually high (max: {self.validation['max_citations']})"
            )

        # Check publications data
        publications = data.get("publications", [])
        if len(publications) == 0:
            logger.error("No publications found in merged data")
            return False

        # Check for required fields
        required_fields = ["title", "year"]
        missing_fields = []
        for pub in publications[:10]:  # Check first 10
            for field in required_fields:
                if not pub.get(field):
                    missing_fields.append(field)

        if missing_fields:
            logger.warning(
                f"Some publications missing required fields: {set(missing_fields)}"
            )

        logger.info(
            f"Validation complete: {total_papers} papers, h-index: {h_index}, citations: {total_citations}"
        )
        return True

    def create_backup(self, data: Dict, backup_dir: str):
        """Create a backup of the data."""
        os.makedirs(backup_dir, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = os.path.join(backup_dir, f"publications_backup_{timestamp}.json")

        try:
            with open(backup_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            logger.info(f"Backup created: {backup_file}")
        except Exception as e:
            logger.error(f"Failed to create backup: {e}")


def main():
    """Test the data merger."""
    # This would typically be called from the main orchestrator
    # Here we can test with dummy data

    merger = DataMerger()

    # Example data structures
    scholar_data = [
        {
            "title": "Test Paper One",
            "year": 2023,
            "citations": 10,
            "source": "google_scholar",
        }
    ]

    ads_data = [
        {
            "title": "Test Paper One",
            "year": 2023,
            "citations": 12,
            "bibcode": "2023test.1..T",
            "source": "ads",
        }
    ]

    merged = merger.merge_publications(scholar_data, ads_data)
    print("Merged publications:", json.dumps(merged, indent=2))


if __name__ == "__main__":
    main()
