"""
Manual publication data updater with multi-source fetching.
"""

import argparse
import json
import logging
import os
import sys
from datetime import datetime
from typing import Dict, Optional
from dotenv import load_dotenv

# Suppress verbose logging from external libraries
logging.getLogger("scholarly").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)
from rich.console import Console
from rich.progress import (
    Progress,
    SpinnerColumn,
    TextColumn,
    BarColumn,
    TaskProgressColumn,
    TimeRemainingColumn,
)
from rich.panel import Panel
from rich.table import Table

from fetch_google_scholar import GoogleScholarFetcher
from fetch_ads import ADSFetcher
from fetch_openalex import OpenAlexFetcher
from merge_data import DataMerger
from config import CONFIG

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

console = Console()


class ManualPublicationUpdater:
    """Manual publication data updater with rich CLI interface."""

    def __init__(self, limit: Optional[int] = None):
        self.config = CONFIG
        self.merger = DataMerger()
        self.limit = limit

        # Initialize fetchers
        self.scholar_fetcher = GoogleScholarFetcher()

        ads_api_key = os.getenv("ADS_API_KEY")
        self.ads_fetcher = ADSFetcher(ads_api_key)

        openalex_email = os.getenv("OPENALEX_EMAIL")
        self.openalex_fetcher = OpenAlexFetcher(openalex_email)

        # Output paths
        self.full_output_path = self.config["output"]["full_data"]
        self.summary_output_path = self.config["output"]["summary"]
        self.backup_dir = self.config["output"]["backup_dir"]

        # Data containers
        self.paper_list = []
        self.scholar_data = []
        self.ads_data = []
        self.openalex_data = []

    def run(self):
        """Main execution method with rich interface."""
        console.print(Panel.fit("📚 Publication Data Updater", style="bold blue"))
        console.print()

        try:
            # Stage 1: Get paper list from Google Scholar
            self._stage_1_get_paper_list()

            # Stage 2: Enrich with ADS data
            self._stage_2_ads_enrichment()

            # Stage 3: Enrich with OpenAlex data
            self._stage_3_openalex_enrichment()

            # Stage 4: Get detailed data from Google Scholar
            self._stage_4_scholar_details()

            # Merge all data
            self._merge_and_save()

            # Display final summary
            self._display_summary()

            return True

        except KeyboardInterrupt:
            console.print("\n❌ Process interrupted by user", style="red")
            return False
        except Exception as e:
            console.print(f"\n❌ Error: {e}", style="red")
            logger.error(f"Update failed: {e}")
            return False

    def _stage_1_get_paper_list(self):
        """Stage 1: Get paper list from Google Scholar."""
        console.print(
            "[bold green][1/4][/bold green] Getting paper list from Google Scholar..."
        )

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            transient=True,
        ) as progress:
            task = progress.add_task("Fetching paper titles...", total=None)

            try:
                self.paper_list = self.scholar_fetcher.fetch_paper_list_quick()
                progress.update(task, description="✓ Paper list retrieved")

            except Exception as e:
                console.print(f"  ❌ Failed to fetch paper list: {e}", style="red")
                raise

        # Apply limit if specified
        total_papers = len(self.paper_list)
        if self.limit and self.limit < total_papers:
            self.paper_list = self.paper_list[: self.limit]
            console.print(
                f"  ✓ Found {total_papers} publications, limited to first {self.limit}"
            )
        else:
            console.print(f"  ✓ Found {total_papers} publications")
        console.print()

    def _stage_2_ads_enrichment(self):
        """Stage 2: Enrich with ADS data."""
        console.print("[bold green][2/4][/bold green] Enriching with ADS data...")

        if not self.paper_list:
            console.print("  ⚠️  No papers to search", style="yellow")
            return

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TaskProgressColumn(),
            TimeRemainingColumn(),
        ) as progress:
            task = progress.add_task("Searching ADS...", total=len(self.paper_list))

            try:
                # Use progress callback if available
                original_method = self.ads_fetcher.search_papers_by_title

                def progress_wrapper(paper_list):
                    results = []
                    for i, paper in enumerate(paper_list):
                        # Search individual paper
                        title = paper.get("title", "").strip()
                        year = paper.get("year")
                        if title:
                            ads_paper = self.ads_fetcher._search_single_paper_by_title(
                                title, year
                            )
                            if ads_paper:
                                results.append(ads_paper)

                        # Update progress
                        progress.update(task, advance=1)

                    return results

                self.ads_data = progress_wrapper(self.paper_list)

            except Exception as e:
                console.print(f"  ❌ ADS search failed: {e}", style="red")
                self.ads_data = []

        console.print(
            f"  ✓ Matched {len(self.ads_data)} papers ({len(self.ads_data)/len(self.paper_list)*100:.1f}%)"
        )
        if self.ads_data:
            total_ads_citations = sum(
                paper.get("citations", 0) for paper in self.ads_data
            )
            console.print(f"  ✓ Total citations from ADS: {total_ads_citations:,}")
        console.print()

    def _stage_3_openalex_enrichment(self):
        """Stage 3: Enrich with OpenAlex data."""
        console.print("[bold green][3/4][/bold green] Enriching with OpenAlex data...")

        if not self.paper_list:
            console.print("  ⚠️  No papers to search", style="yellow")
            return

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TaskProgressColumn(),
            TimeRemainingColumn(),
        ) as progress:
            task = progress.add_task(
                "Searching OpenAlex...", total=len(self.paper_list)
            )

            try:
                # Use progress callback
                def progress_wrapper(paper_list):
                    results = []
                    for i, paper in enumerate(paper_list):
                        # Search individual paper
                        title = paper.get("title", "").strip()
                        year = paper.get("year")
                        if title:
                            openalex_paper = self.openalex_fetcher._search_single_paper(
                                title, year
                            )
                            if openalex_paper:
                                results.append(openalex_paper)

                        # Update progress
                        progress.update(task, advance=1)

                    return results

                self.openalex_data = progress_wrapper(self.paper_list)

            except Exception as e:
                console.print(f"  ❌ OpenAlex search failed: {e}", style="red")
                self.openalex_data = []

        console.print(
            f"  ✓ Matched {len(self.openalex_data)} papers ({len(self.openalex_data)/len(self.paper_list)*100:.1f}%)"
        )
        if self.openalex_data:
            total_openalex_citations = sum(
                paper.get("citations", 0) for paper in self.openalex_data
            )
            console.print(
                f"  ✓ Total citations from OpenAlex: {total_openalex_citations:,}"
            )
        console.print()

    def _stage_4_scholar_details(self):
        """Stage 4: Get detailed data from Google Scholar."""
        console.print(
            "[bold green][4/4][/bold green] Getting full details from Google Scholar..."
        )
        console.print(
            "  ⚠️  [yellow]This may take several minutes due to rate limiting...[/yellow]"
        )

        if not self.paper_list:
            console.print("  ⚠️  No papers to fetch", style="yellow")
            return

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TaskProgressColumn(),
            TimeRemainingColumn(),
        ) as progress:
            task = progress.add_task("Fetching details...", total=len(self.paper_list))

            try:
                # Custom progress wrapper for Scholar detailed fetching
                def progress_wrapper():
                    detailed_papers = []

                    # Get author publications
                    from scholarly import scholarly

                    author = scholarly.search_author_id(self.scholar_fetcher.author_id)
                    author = scholarly.fill(author, sections=["publications"])
                    publications = author.get("publications", [])

                    # Create lookup by title
                    pub_lookup = {}
                    for pub in publications:
                        bib = pub.get("bib", {})
                        title = bib.get("title", "").strip()
                        if title:
                            normalized_title = self.scholar_fetcher._normalize_title(
                                title
                            )
                            pub_lookup[normalized_title] = pub

                    # Process each paper
                    for i, paper_info in enumerate(self.paper_list):
                        try:
                            title = paper_info.get("title", "").strip()
                            normalized_title = self.scholar_fetcher._normalize_title(
                                title
                            )

                            if normalized_title in pub_lookup:
                                pub = pub_lookup[normalized_title]

                                # Fetch detailed information (this is the slow part)
                                pub_detail = scholarly.fill(pub)

                                # Extract detailed information
                                detailed_paper = (
                                    self.scholar_fetcher._extract_publication_info(
                                        pub_detail
                                    )
                                )
                                if detailed_paper:
                                    detailed_papers.append(detailed_paper)

                                # Rate limiting delay
                                import time

                                time.sleep(2)

                            # Update progress
                            progress.update(
                                task,
                                advance=1,
                                description=f"Fetching details... {i+1}/{len(self.paper_list)}",
                            )

                            # Check for interrupt
                            if i > 0 and i % 10 == 0:
                                progress.update(
                                    task,
                                    description=f"[Rate limit pause - resuming...]",
                                )

                        except Exception as e:
                            logger.warning(
                                f"Failed to fetch details for paper '{title}': {e}"
                            )
                            progress.update(task, advance=1)
                            continue

                    return detailed_papers

                self.scholar_data = progress_wrapper()

            except Exception as e:
                console.print(f"  ❌ Scholar detailed fetch failed: {e}", style="red")
                console.print(
                    f"  ⚠️  Continuing with partial data from {len(self.scholar_data)} papers",
                    style="yellow",
                )

        console.print(f"  ✓ Retrieved full details for {len(self.scholar_data)} papers")
        if self.scholar_data:
            total_scholar_citations = sum(
                paper.get("citations", 0) for paper in self.scholar_data
            )
            console.print(
                f"  ✓ Total citations from Scholar: {total_scholar_citations:,}"
            )
        console.print()

    def _debug_missing_papers(self):
        """Debug helper to show which papers are missing from which sources using merger logic."""
        if not self.paper_list:
            return

        console.print(
            "\n📊 [bold yellow]Missing Papers Analysis (Using Merger Logic)[/bold yellow]"
        )

        # Use the same matching logic as the merger
        missing_count = 0
        for i, paper in enumerate(self.paper_list):
            title = paper.get("title", "").strip()
            if not title:
                continue

            # Find matches using the same logic as merger
            scholar_match = self.merger._find_best_match(paper, self.scholar_data)
            ads_match = self.merger._find_best_match(paper, self.ads_data)
            openalex_match = self.merger._find_best_match(paper, self.openalex_data)

            missing_sources = []
            if not ads_match:
                missing_sources.append("ADS")
            if not openalex_match:
                missing_sources.append("OpenAlex")
            if not scholar_match:
                missing_sources.append("Scholar")

            if missing_sources:
                missing_count += 1
                year = paper.get("year", "N/A")
                missing_str = ", ".join(missing_sources)
                console.print(
                    f"  {i+1:2d}. [red]Missing from {missing_str}:[/red] {title[:80]}{'...' if len(title) > 80 else ''} ({year})"
                )

                # Show best similarity scores for debugging
                if "OpenAlex" in missing_sources:
                    best_score = 0
                    best_title = ""
                    best_paper = None
                    for openalex_paper in self.openalex_data:
                        score = self.merger._calculate_similarity(paper, openalex_paper)
                        if score > best_score:
                            best_score = score
                            best_title = openalex_paper.get("title", "")[:60]
                            best_paper = openalex_paper
                    console.print(
                        f"       [dim]Best OpenAlex match: {best_score:.3f} - {best_title}...[/dim]"
                    )

                    # Show step-by-step normalization for debugging
                    if best_paper:
                        import html
                        import re

                        scholar_title = paper.get("title", "")
                        openalex_title = best_paper.get("title", "")

                        console.print(
                            f"       [dim]Scholar raw:         {scholar_title[:70]}...[/dim]"
                        )
                        console.print(
                            f"       [dim]OpenAlex raw:        {openalex_title[:70]}...[/dim]"
                        )

                        # Show HTML entity detection
                        if any(
                            entity in openalex_title
                            for entity in ["&lt;", "&gt;", "&amp;", "&nbsp;"]
                        ):
                            console.print(
                                f"       [yellow]HTML entities detected in OpenAlex title[/yellow]"
                            )

                        # Show HTML tag detection
                        if re.search(r"<[^>]+>", html.unescape(openalex_title)):
                            console.print(
                                f"       [yellow]HTML tags detected in OpenAlex title[/yellow]"
                            )

                        scholar_norm = self.merger._normalize_title(scholar_title)
                        openalex_norm = self.merger._normalize_title(openalex_title)
                        console.print(
                            f"       [dim]Scholar normalized:  {scholar_norm[:70]}...[/dim]"
                        )
                        console.print(
                            f"       [dim]OpenAlex normalized: {openalex_norm[:70]}...[/dim]"
                        )

        if missing_count == 0:
            console.print("  ✅ All papers found in all sources!")
        else:
            console.print(
                f"\n  📈 Summary: {missing_count}/{len(self.paper_list)} papers missing from at least one source"
            )

        console.print()

    def _merge_and_save(self):
        """Merge all data and save to files."""
        console.print("🔄 Merging data from all sources...")

        # Debug: Show papers missing from sources
        self._debug_missing_papers()

        # Merge publications from all sources
        merged_publications = self.merger.merge_publications_multisource(
            self.paper_list, self.scholar_data, self.ads_data, self.openalex_data
        )

        # Get metrics from each source (if we have data)
        scholar_metrics = {}
        ads_metrics = {}
        openalex_metrics = {}

        # Calculate metrics directly from merged data instead of individual sources
        # to avoid re-fetching
        if merged_publications:
            total_papers = len(merged_publications)
            total_citations = sum(
                pub.get("citations", 0) for pub in merged_publications
            )

            # Calculate h-index
            citation_counts = sorted(
                [pub.get("citations", 0) for pub in merged_publications], reverse=True
            )
            h_index = 0
            for i, citations in enumerate(citation_counts):
                if citations >= i + 1:
                    h_index = i + 1
                else:
                    break

            # Calculate i10-index
            i10_index = sum(
                1 for pub in merged_publications if pub.get("citations", 0) >= 10
            )

            # Calculate citations per year
            citations_per_year = {}
            for pub in merged_publications:
                year = pub.get("year")
                if year and year >= 2000:
                    citations_per_year[str(year)] = citations_per_year.get(
                        str(year), 0
                    ) + pub.get("citations", 0)

            # Create merged metrics
            merged_metrics = {
                "totalPapers": total_papers,
                "hIndex": h_index,
                "i10Index": i10_index,
                "totalCitations": total_citations,
                "citationsPerYear": citations_per_year,
                "lastUpdated": datetime.now().isoformat() + "Z",
                "sources": ["google_scholar", "ads", "openalex"],
            }

        # Create consolidated data structure
        full_data = {
            "lastUpdated": datetime.now().isoformat() + "Z",
            "metrics": merged_metrics,
            "publications": merged_publications,
            "sources": {
                "google_scholar": {
                    "publications": len(self.scholar_data),
                    "metrics": bool(self.scholar_data),
                },
                "ads": {
                    "publications": len(self.ads_data),
                    "metrics": bool(self.ads_data),
                },
                "openalex": {
                    "publications": len(self.openalex_data),
                    "metrics": bool(self.openalex_data),
                },
            },
            "statistics": self._generate_statistics(merged_publications),
        }

        # Save data
        self._save_data(full_data)
        self.final_data = full_data

    def _generate_statistics(self, publications: list) -> Dict:
        """Generate additional statistics from publication data."""
        if not publications:
            return {}

        # Publications by year
        pub_by_year = {}
        citations_by_year = {}
        categories_count = {}

        for pub in publications:
            year = pub.get("year")
            if year and year >= 2000:  # Filter reasonable years
                year_str = str(year)
                pub_by_year[year_str] = pub_by_year.get(year_str, 0) + 1
                citations_by_year[year_str] = citations_by_year.get(
                    year_str, 0
                ) + pub.get("citations", 0)

            # Count by research area
            category = pub.get("researchArea", "Unknown")
            categories_count[category] = categories_count.get(category, 0) + 1

        # Top cited papers
        top_cited = sorted(
            publications, key=lambda x: x.get("citations", 0), reverse=True
        )[:10]

        # Recent papers (last 3 years)
        current_year = datetime.now().year
        recent_papers = [
            pub for pub in publications if pub.get("year", 0) >= current_year - 2
        ]

        return {
            "publicationsByYear": pub_by_year,
            "citationsByYear": citations_by_year,
            "categoriesCount": categories_count,
            "topCitedPapers": [
                {
                    "title": pub["title"],
                    "year": pub.get("year"),
                    "citations": pub.get("citations", 0),
                    "journal": pub.get("journal", ""),
                }
                for pub in top_cited
            ],
            "recentPapersCount": len(recent_papers),
            "totalJournals": len(
                set(
                    pub.get("journal", "") for pub in publications if pub.get("journal")
                )
            ),
        }

    def _save_data(self, data: Dict):
        """Save the consolidated data to files."""
        # Create backup
        try:
            self.merger.create_backup(data, self.backup_dir)
        except Exception as e:
            logger.warning(f"Failed to create backup: {e}")

        # Ensure output directories exist
        os.makedirs(os.path.dirname(self.full_output_path), exist_ok=True)
        os.makedirs(os.path.dirname(self.summary_output_path), exist_ok=True)

        # Save full data
        with open(self.full_output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        # Generate and save summary data
        summary_data = self.merger.generate_summary_data(data)
        with open(self.summary_output_path, "w", encoding="utf-8") as f:
            json.dump(summary_data, f, indent=2, ensure_ascii=False)

    def _display_summary(self):
        """Display final summary with rich formatting."""
        console.print()

        metrics = self.final_data.get("metrics", {})
        sources = self.final_data.get("sources", {})

        # Create summary table
        table = Table(title="📊 Final Statistics", title_style="bold blue")
        table.add_column("Metric", style="cyan")
        table.add_column("Value", style="green")

        table.add_row("Total Papers", f"{metrics.get('totalPapers', 0):,}")
        table.add_row("Total Citations", f"{metrics.get('totalCitations', 0):,}")
        table.add_row("H-index", str(metrics.get("hIndex", 0)))
        table.add_row("i10-index", str(metrics.get("i10Index", 0)))

        console.print(table)
        console.print()

        # Data coverage table
        coverage_table = Table(title="🔍 Data Coverage", title_style="bold blue")
        coverage_table.add_column("Source", style="cyan")
        coverage_table.add_column("Papers Found", style="green")
        coverage_table.add_column("Coverage", style="yellow")

        total_papers = len(self.paper_list)

        # Count papers with each source from merged results (not raw fetcher results)
        papers_with_ads = 0
        papers_with_openalex = 0
        papers_with_scholar = 0

        for pub in self.final_data.get("publications", []):
            sources = pub.get("sources", [])
            if "ads" in sources:
                papers_with_ads += 1
            if "openalex" in sources:
                papers_with_openalex += 1
            if "google_scholar" in sources:
                papers_with_scholar += 1

        coverage_table.add_row(
            "Papers with ADS data",
            str(papers_with_ads),
            f"{papers_with_ads/total_papers*100:.1f}%" if total_papers > 0 else "0%",
        )
        coverage_table.add_row(
            "Papers with OpenAlex data",
            str(papers_with_openalex),
            (
                f"{papers_with_openalex/total_papers*100:.1f}%"
                if total_papers > 0
                else "0%"
            ),
        )
        coverage_table.add_row(
            "Papers with Scholar data",
            str(papers_with_scholar),
            (
                f"{papers_with_scholar/total_papers*100:.1f}%"
                if total_papers > 0
                else "0%"
            ),
        )

        # Count papers with all 3 sources
        papers_with_all_sources = 0
        for pub in self.final_data.get("publications", []):
            sources_found = pub.get("sources", [])
            if len(set(sources_found) & {"google_scholar", "ads", "openalex"}) >= 3:
                papers_with_all_sources += 1

        coverage_table.add_row(
            "Papers with all 3 sources",
            str(papers_with_all_sources),
            (
                f"{papers_with_all_sources/total_papers*100:.1f}%"
                if total_papers > 0
                else "0%"
            ),
        )

        console.print(coverage_table)
        console.print()

        # Success message
        console.print(
            "✅ Data saved to [bold]assets/data/publications_data.json[/bold]",
            style="green",
        )

        # Find backup file
        backup_files = []
        if os.path.exists(self.backup_dir):
            backup_files = [
                f
                for f in os.listdir(self.backup_dir)
                if f.startswith("publications_backup_")
            ]
            if backup_files:
                latest_backup = sorted(backup_files)[-1]
                console.print(
                    f"✅ Backup created at [bold]assets/data/backups/{latest_backup}[/bold]",
                    style="green",
                )


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Manual publication data updater with multi-source fetching.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python update_publications_manual.py              # Update all publications
  python update_publications_manual.py --limit 25   # Test with first 25 papers
  python update_publications_manual.py --help       # Show this help message

This script fetches publication data from multiple sources:
1. Google Scholar (authoritative paper list)
2. ADS (Astrophysics Data System) - citations and metadata
3. OpenAlex - additional metadata and identifiers
4. Google Scholar (detailed data for remaining papers)
        """,
    )

    parser.add_argument(
        "--limit",
        type=int,
        metavar="N",
        help="Limit processing to first N papers (useful for testing)",
    )

    return parser.parse_args()


def main():
    """Main entry point."""
    args = parse_args()
    load_dotenv()

    # Header
    console.print("\n╭─────────────────────────────╮")
    console.print("│ 📚 Publication Data Updater │")
    console.print("╰─────────────────────────────╯")

    if args.limit:
        console.print(
            f"  [yellow]Testing mode: Processing first {args.limit} papers[/yellow]"
        )

    console.print()

    # Check environment setup
    ads_key = os.getenv("ADS_API_KEY")
    openalex_email = os.getenv("OPENALEX_EMAIL")

    if not ads_key:
        console.print("❌ ADS_API_KEY not found in environment variables", style="red")
        console.print("Please create a .env file with your ADS API key", style="yellow")
        return False

    if not openalex_email:
        console.print(
            "⚠️  OPENALEX_EMAIL not found in environment variables", style="yellow"
        )
        console.print(
            "Consider adding your email for better OpenAlex rate limits", style="yellow"
        )

    # Run the updater
    updater = ManualPublicationUpdater(limit=args.limit)
    success = updater.run()

    if success:
        console.print(
            "\n🎉 [bold green]Publication data update completed successfully![/bold green]"
        )
        return True
    else:
        console.print("\n❌ [bold red]Publication data update failed[/bold red]")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
