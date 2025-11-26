#!/usr/bin/env python3
"""
Unified publication update pipeline with optimized fetching.

This script combines the functionality of update_publications_manual.py and
process_publications.py into a single, efficient pipeline that:
1. Fetches publication data from all sources (Scholar, ADS, OpenAlex)
2. Only fetches detailed Scholar data for papers that need it
3. Applies all post-processing (categories, authorship, featured flags, etc.)
4. Deploys to the website

Much faster than the original pipeline by avoiding unnecessary detailed fetches.
"""

import json
import logging
import os
import sys
import time
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from rich.console import Console
from rich.progress import (
    Progress,
    SpinnerColumn,
    TextColumn,
    BarColumn,
    TaskProgressColumn,
    TimeRemainingColumn,
)
from rich.table import Table
from rich.panel import Panel
from dotenv import load_dotenv

# Load environment variables from .env file
# Try both current directory and parent directory
if Path(".env").exists():
    load_dotenv(dotenv_path=".env")
elif Path("../.env").exists():
    load_dotenv(dotenv_path="../.env")
else:
    load_dotenv()  # Try default locations

# Import the data fetchers and processors
from fetch_google_scholar import GoogleScholarFetcher
from fetch_ads import ADSFetcher
from fetch_openalex import OpenAlexFetcher
from merge_data import DataMerger
from config import CONFIG

# Set up logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

console = Console()


class UnifiedPublicationPipeline:
    """Unified pipeline for fetching and processing publication data."""

    def __init__(self):
        self.config = CONFIG
        self.merger = DataMerger()

        # Initialize fetchers
        self.scholar_fetcher = GoogleScholarFetcher()
        self.ads_fetcher = ADSFetcher()

        # Get OpenAlex email from environment
        openalex_email = os.getenv("OPENALEX_EMAIL")
        self.openalex_fetcher = OpenAlexFetcher(email=openalex_email)

        # Data containers
        self.paper_list = []
        self.scholar_data = []
        self.ads_data = []
        self.openalex_data = []
        self.merged_data = None

    def run(self):
        """Main execution method."""
        console.print("\n[bold cyan]🚀 UNIFIED PUBLICATION UPDATE PIPELINE[/bold cyan]")
        console.print("=" * 60)

        start_time = time.time()

        try:
            # Stage 0: Backup existing data before we do anything
            self._stage_0_backup_existing()

            # Stage 1: Quick fetch of paper list
            self._stage_1_quick_fetch()

            # Stage 2: ADS enrichment
            self._stage_2_ads_enrichment()

            # Stage 3: OpenAlex enrichment
            self._stage_3_openalex_enrichment()

            # Stage 4: Smart Scholar details (only for papers that need it)
            self._stage_4_smart_scholar_details()

            # Stage 5: Merge all data
            self._stage_5_merge_data()

            # Stage 6: Save scraped data
            self._stage_6_save_scraped_data()

            # Stage 7: Run post-processing scripts
            self._stage_7_post_processing()

            # Display final statistics
            self._display_final_stats()

            elapsed = time.time() - start_time
            console.print(
                f"\n✅ [bold green]Pipeline completed successfully in {elapsed:.1f} seconds![/bold green]"
            )

        except Exception as e:
            console.print(f"\n❌ [bold red]Pipeline failed: {e}[/bold red]")
            logger.error(f"Pipeline error: {e}", exc_info=True)
            sys.exit(1)

    def _stage_0_backup_existing(self):
        """Stage 0: Backup existing publications data before making any changes."""
        console.print("\n[bold green][0/7][/bold green] Backing up existing data...")

        existing_file = Path("assets/data/publications_data.json")

        if not existing_file.exists():
            # Try parent directory (if running from scripts/)
            existing_file = Path("../assets/data/publications_data.json")

        if existing_file.exists():
            backup_dir = Path("assets/data/backups")
            if not backup_dir.exists():
                backup_dir = Path("../assets/data/backups")
            backup_dir.mkdir(parents=True, exist_ok=True)

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_path = backup_dir / f"publications_PRE_UPDATE_{timestamp}.json"

            try:
                import shutil
                shutil.copy2(existing_file, backup_path)
                console.print(f"  ✓ Existing data backed up to {backup_path}")
            except Exception as e:
                console.print(f"  ⚠️  Backup failed: {e}", style="yellow")
                raise RuntimeError(f"Failed to backup existing data: {e}")
        else:
            console.print("  ℹ️  No existing publications_data.json found (first run?)")

    def _stage_1_quick_fetch(self):
        """Stage 1: Quick fetch of paper list from Google Scholar."""
        console.print(
            "\n[bold green][1/7][/bold green] Fetching paper list from Google Scholar..."
        )

        try:
            self.paper_list = self.scholar_fetcher.fetch_paper_list_quick()
            console.print(f"  ✓ Retrieved [cyan]{len(self.paper_list)}[/cyan] papers")

            # Log if we found the Walmsley paper
            for paper in self.paper_list:
                if "Scaling Laws" in paper.get("title", "") and "Galaxy" in paper.get(
                    "title", ""
                ):
                    console.print(f"  ✓ Found Walmsley paper in list")
                    break

        except Exception as e:
            console.print(f"  ❌ Failed: {e}", style="red")
            raise

    def _stage_2_ads_enrichment(self):
        """Stage 2: Enrich with ADS data."""
        console.print("\n[bold green][2/7][/bold green] Enriching with ADS data...")

        if not self.paper_list:
            console.print("  ⚠️  No papers to search", style="yellow")
            return

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TaskProgressColumn(),
        ) as progress:
            task = progress.add_task("Searching ADS...", total=len(self.paper_list))

            try:
                # Search for papers in ADS
                for paper in self.paper_list:
                    title = paper.get("title", "").strip()
                    year = paper.get("year")

                    if title:
                        ads_paper = self.ads_fetcher._search_single_paper_by_title(
                            title, year
                        )
                        if ads_paper:
                            self.ads_data.append(ads_paper)

                    progress.update(task, advance=1)

            except Exception as e:
                console.print(f"  ❌ ADS search failed: {e}", style="red")
                self.ads_data = []

        console.print(
            f"  ✓ Matched {len(self.ads_data)} papers ({len(self.ads_data)/len(self.paper_list)*100:.1f}%)"
        )

    def _stage_3_openalex_enrichment(self):
        """Stage 3: Enrich with OpenAlex data."""
        console.print(
            "\n[bold green][3/7][/bold green] Enriching with OpenAlex data..."
        )

        if not self.paper_list:
            console.print("  ⚠️  No papers to search", style="yellow")
            return

        try:
            # Use the OpenAlex batch search
            self.openalex_data = self.openalex_fetcher.search_papers_by_title(
                self.paper_list
            )
            console.print(
                f"  ✓ Matched {len(self.openalex_data)} papers ({len(self.openalex_data)/len(self.paper_list)*100:.1f}%)"
            )

        except Exception as e:
            console.print(f"  ❌ OpenAlex search failed: {e}", style="red")
            self.openalex_data = []

    def _stage_4_smart_scholar_details(self):
        """Stage 4: Smart Scholar details - only fetch for papers that need it."""
        console.print(
            "\n[bold green][4/7][/bold green] Smart Google Scholar detailed fetch..."
        )

        # First do a quick merge to see what we have so far
        temp_merged = self.merger.merge_publications_multisource(
            self.paper_list, [], self.ads_data, self.openalex_data
        )

        # Identify papers that need detailed Scholar data
        papers_needing_details = []
        for i, paper in enumerate(temp_merged):
            needs_detail = False

            # Check if missing critical information
            if not paper.get("authors") or len(paper.get("authors", [])) == 0:
                needs_detail = True
                logger.debug(f"Paper {i} needs detail: missing authors")
            elif not paper.get("abstract"):
                needs_detail = True
                logger.debug(f"Paper {i} needs detail: missing abstract")
            elif paper.get("sources") == ["google_scholar"]:
                needs_detail = True
                logger.debug(f"Paper {i} needs detail: only Scholar source")

            if needs_detail:
                # Find the original paper in paper_list
                for orig in self.paper_list:
                    if orig.get("title") == paper.get("title"):
                        papers_needing_details.append(orig)
                        break

        console.print(
            f"  ℹ️  {len(papers_needing_details)} papers need detailed fetch (out of {len(self.paper_list)})"
        )

        if papers_needing_details:
            console.print(
                f"  ⚠️  [yellow]This will take ~{len(papers_needing_details)*2} seconds due to rate limiting[/yellow]"
            )

            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                BarColumn(),
                TaskProgressColumn(),
            ) as progress:
                task = progress.add_task(
                    "Fetching details...", total=len(papers_needing_details)
                )

                try:
                    # Fetch detailed data only for papers that need it
                    from scholarly import scholarly

                    # Get author publications for lookup
                    author = scholarly.search_author_id(self.scholar_fetcher.author_id)
                    author = scholarly.fill(author, sections=["publications"])
                    publications = author.get("publications", [])

                    # Create lookup
                    pub_lookup = {}
                    for pub in publications:
                        bib = pub.get("bib", {})
                        title = bib.get("title", "").strip()
                        if title:
                            normalized = self.scholar_fetcher._normalize_title(title)
                            pub_lookup[normalized] = pub

                    # Fetch details for papers that need it
                    for paper in papers_needing_details:
                        title = paper.get("title", "").strip()
                        normalized = self.scholar_fetcher._normalize_title(title)

                        if normalized in pub_lookup:
                            pub = pub_lookup[normalized]
                            pub_detail = scholarly.fill(pub)
                            detailed_paper = (
                                self.scholar_fetcher._extract_publication_info(
                                    pub_detail
                                )
                            )

                            if detailed_paper:
                                self.scholar_data.append(detailed_paper)

                            time.sleep(2)  # Rate limiting

                        progress.update(task, advance=1)

                except Exception as e:
                    console.print(
                        f"  ⚠️  Scholar details partially failed: {e}", style="yellow"
                    )

            console.print(
                f"  ✓ Fetched detailed data for {len(self.scholar_data)} papers"
            )
        else:
            console.print("  ✓ No papers need detailed Scholar fetch - skipping!")

    def _stage_5_merge_data(self):
        """Stage 5: Merge all data sources."""
        console.print(
            "\n[bold green][5/7][/bold green] Merging data from all sources..."
        )

        # Merge publications
        merged_publications = self.merger.merge_publications_multisource(
            self.paper_list, self.scholar_data, self.ads_data, self.openalex_data
        )

        console.print(f"  ✓ Merged into {len(merged_publications)} publications")

        # Get metrics
        scholar_metrics = {}
        ads_metrics = {}
        openalex_metrics = {}

        try:
            scholar_metrics = self.scholar_fetcher.fetch_author_metrics()
        except:
            pass

        try:
            ads_metrics = self.ads_fetcher.fetch_author_metrics()
        except:
            pass

        try:
            openalex_metrics = self.openalex_fetcher.fetch_author_metrics()
        except:
            pass

        merged_metrics = self.merger.merge_metrics_multisource(
            scholar_metrics, ads_metrics, openalex_metrics
        )

        # Create final data structure
        self.merged_data = {
            "lastUpdated": datetime.now().isoformat() + "Z",
            "metrics": merged_metrics,
            "publications": merged_publications,
            "citationsByPublicationYear": self._calculate_citations_by_year(
                merged_publications
            ),
        }

        console.print(
            f"  ✓ Metrics: {merged_metrics.get('totalPapers', 0)} papers, "
            f"{merged_metrics.get('totalCitations', 0)} citations, "
            f"h-index: {merged_metrics.get('hIndex', 0)}"
        )

    def _stage_6_save_scraped_data(self):
        """Stage 6: Save the scraped/merged data."""
        console.print("\n[bold green][6/7][/bold green] Saving scraped data...")

        # Determine correct path (handle running from scripts/ or project root)
        if Path("../assets/data").exists():
            base_path = Path("../assets/data")
        else:
            base_path = Path("assets/data")

        # Create backup
        backup_dir = base_path / "backups"
        backup_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = backup_dir / f"publications_backup_{timestamp}.json"

        # Save backup
        try:
            with open(backup_path, "w", encoding="utf-8") as f:
                json.dump(self.merged_data, f, indent=2, ensure_ascii=False)
            console.print(f"  ✓ Backup saved to {backup_path}")
        except Exception as e:
            console.print(f"  ⚠️  Backup failed: {e}", style="yellow")

        # Save main file
        output_path = base_path / "publications_data.json"
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(self.merged_data, f, indent=2, ensure_ascii=False)

        console.print(f"  ✓ Data saved to {output_path}")

    def _stage_7_post_processing(self):
        """Stage 7: Run post-processing scripts."""
        console.print("\n[bold green][7/7][/bold green] Running post-processing...")

        scripts = [
            ("flag_featured_publications.py", "Featured publications"),
            ("apply_binary_priority_scoring.py", "Research categories"),
            ("fix_citations_timeline.py", "Citations timeline"),
            ("update_ads_library_cache.py", "ADS library cache"),
            ("apply_authorship_categories.py", "Authorship categories"),
        ]

        for script_name, description in scripts:
            script_path = Path(__file__).parent / script_name

            if not script_path.exists():
                console.print(f"  ⚠️  {description}: Script not found", style="yellow")
                continue

            try:
                # Run script from scripts directory to ensure relative paths work
                result = subprocess.run(
                    [sys.executable, str(script_path)],
                    capture_output=True,
                    text=True,
                    timeout=30,
                    cwd=Path(
                        __file__
                    ).parent,  # Set working directory to scripts folder
                )

                if result.returncode == 0:
                    console.print(f"  ✓ {description}: Success")
                    # Show important output for authorship categories
                    if "authorship" in script_name.lower() and result.stdout:
                        # Parse the output for the update count
                        if "Updated" in result.stdout:
                            for line in result.stdout.splitlines():
                                if "Updated" in line and "publications" in line:
                                    console.print(f"    {line.strip()}", style="dim")
                                    break
                else:
                    console.print(
                        f"  ⚠️  {description}: Failed (code {result.returncode})",
                        style="yellow",
                    )
                    if result.stderr:
                        logger.debug(f"Error: {result.stderr}")
                    if result.stdout:
                        logger.debug(f"Output: {result.stdout}")

            except subprocess.TimeoutExpired:
                console.print(f"  ⚠️  {description}: Timeout", style="yellow")
            except Exception as e:
                console.print(f"  ⚠️  {description}: Error - {e}", style="yellow")

        # Deploy to website directory
        console.print("\n  Deploying to website...")
        source_file = Path("assets/data/publications_data.json")
        target_file = Path("../assets/data/publications_data.json")

        if source_file.exists():
            target_file.parent.mkdir(parents=True, exist_ok=True)
            import shutil

            shutil.copy2(source_file, target_file)
            console.print(f"  ✓ Deployed to {target_file}")

    def _calculate_citations_by_year(self, publications: List[Dict]) -> Dict:
        """Calculate citations by publication year."""
        citations_by_year = {}

        for pub in publications:
            year = pub.get("year")
            citations = pub.get("citations", 0)

            if year and year >= 2000:  # Filter reasonable years
                year_str = str(year)
                citations_by_year[year_str] = (
                    citations_by_year.get(year_str, 0) + citations
                )

        return citations_by_year

    def _display_final_stats(self):
        """Display final statistics."""
        console.print("\n[bold cyan]📊 FINAL STATISTICS[/bold cyan]")

        # Load the final processed data
        with open("../assets/data/publications_data.json", "r") as f:
            final_data = json.load(f)

        metrics = final_data.get("metrics", {})
        publications = final_data.get("publications", [])

        # Create statistics table
        table = Table(title="Publication Metrics", show_header=True)
        table.add_column("Metric", style="cyan")
        table.add_column("Value", style="green")

        table.add_row("Total Papers", str(len(publications)))
        table.add_row("Total Citations", f"{metrics.get('totalCitations', 0):,}")
        table.add_row("H-index", str(metrics.get("hIndex", 0)))
        table.add_row("i10-index", str(metrics.get("i10Index", 0)))

        console.print(table)

        # Data coverage table
        coverage_table = Table(title="Data Coverage", show_header=True)
        coverage_table.add_column("Source", style="cyan")
        coverage_table.add_column("Papers", style="green")
        coverage_table.add_column("Coverage", style="yellow")

        # Count papers by source
        ads_count = sum(1 for p in publications if "ads" in p.get("sources", []))
        openalex_count = sum(
            1 for p in publications if "openalex" in p.get("sources", [])
        )
        scholar_count = sum(
            1 for p in publications if "google_scholar" in p.get("sources", [])
        )
        all_three = sum(1 for p in publications if len(p.get("sources", [])) >= 3)

        coverage_table.add_row(
            "ADS", str(ads_count), f"{ads_count/len(publications)*100:.1f}%"
        )
        coverage_table.add_row(
            "OpenAlex",
            str(openalex_count),
            f"{openalex_count/len(publications)*100:.1f}%",
        )
        coverage_table.add_row(
            "Google Scholar",
            str(scholar_count),
            f"{scholar_count/len(publications)*100:.1f}%",
        )
        coverage_table.add_row(
            "All 3 Sources", str(all_three), f"{all_three/len(publications)*100:.1f}%"
        )

        console.print(coverage_table)

        # Authorship categories
        authorship_counts = {}
        for pub in publications:
            cat = pub.get("authorshipCategory", "none")
            authorship_counts[cat] = authorship_counts.get(cat, 0) + 1

        if any(cat != "none" for cat in authorship_counts):
            auth_table = Table(title="Authorship Categories", show_header=True)
            auth_table.add_column("Category", style="cyan")
            auth_table.add_column("Count", style="green")

            for cat in ["primary", "postdoc", "student", "significant", "none"]:
                if cat in authorship_counts:
                    auth_table.add_row(cat.capitalize(), str(authorship_counts[cat]))

            console.print(auth_table)

        # Check for specific papers
        console.print("\n[bold cyan]📝 Special Papers Check[/bold cyan]")

        # Check for Walmsley paper
        for pub in publications:
            if "Scaling Laws" in pub.get("title", "") and "Galaxy" in pub.get(
                "title", ""
            ):
                console.print(
                    "  ✓ Walmsley paper: Found with category '"
                    f"{pub.get('authorshipCategory', 'none')}'"
                )
                break
        else:
            console.print("  ❌ Walmsley paper: Not found", style="red")

        # Check for papers with missing data
        missing_authors = sum(1 for p in publications if not p.get("authors"))
        if missing_authors > 0:
            console.print(
                f"  ⚠️  {missing_authors} papers with missing authors", style="yellow"
            )
        else:
            console.print("  ✓ All papers have authors")


def main():
    """Main entry point."""
    # Check for ADS API key
    ads_key = os.getenv("ADS_API_KEY")
    if not ads_key:
        console.print(
            "[yellow]⚠️  ADS_API_KEY not set. ADS data will be limited.[/yellow]"
        )
        console.print(
            "Get a key from: https://ui.adsabs.harvard.edu/user/settings/token"
        )
        console.print("Set it with: export ADS_API_KEY='your-key-here'")
        console.print()

    # Run the pipeline
    pipeline = UnifiedPublicationPipeline()
    pipeline.run()


if __name__ == "__main__":
    main()
