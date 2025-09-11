"""
Main orchestrator script for fetching and consolidating publication data.
"""

import json
import logging
import os
import sys
from datetime import datetime
from typing import Dict

from fetch_google_scholar import GoogleScholarFetcher
from fetch_ads import ADSFetcher
from merge_data import DataMerger
from config import CONFIG

# Set up logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class PublicationDataOrchestrator:
    """Main orchestrator for fetching and processing publication data."""

    def __init__(self):
        self.config = CONFIG
        self.merger = DataMerger()

        # Initialize fetchers
        self.scholar_fetcher = GoogleScholarFetcher()

        ads_api_key = os.getenv("ADS_API_KEY")
        self.ads_fetcher = ADSFetcher(ads_api_key)

        # Output paths
        self.full_output_path = self.config["output"]["full_data"]
        self.summary_output_path = self.config["output"]["summary"]
        self.backup_dir = self.config["output"]["backup_dir"]

    def fetch_all_data(self) -> Dict:
        """Fetch data from all sources and merge."""
        logger.info("Starting publication data fetch from all sources")

        # Initialize data containers
        scholar_publications = []
        scholar_metrics = {}
        ads_publications = []
        ads_metrics = {}

        # Fetch from Google Scholar
        try:
            logger.info("Fetching from Google Scholar...")
            scholar_metrics = self.scholar_fetcher.fetch_author_metrics()
            scholar_publications = self.scholar_fetcher.fetch_publications()
            logger.info(
                f"Scholar: {len(scholar_publications)} publications, "
                f"{scholar_metrics.get('totalCitations', 0)} citations"
            )
        except Exception as e:
            logger.error(f"Failed to fetch from Google Scholar: {e}")

        # Fetch from ADS
        try:
            logger.info("Fetching from ADS...")
            ads_publications = self.ads_fetcher.fetch_publications()
            ads_metrics = self.ads_fetcher.fetch_author_metrics()
            logger.info(
                f"ADS: {len(ads_publications)} publications, "
                f"{ads_metrics.get('totalCitations', 0)} citations"
            )
        except Exception as e:
            logger.error(f"Failed to fetch from ADS: {e}")

        # Merge data
        logger.info("Merging data from all sources...")
        merged_publications = self.merger.merge_publications(
            scholar_publications, ads_publications
        )
        merged_metrics = self.merger.merge_metrics(scholar_metrics, ads_metrics)

        # Create consolidated data structure
        full_data = {
            "lastUpdated": datetime.now().isoformat() + "Z",
            "metrics": merged_metrics,
            "publications": merged_publications,
            "sources": {
                "google_scholar": {
                    "publications": len(scholar_publications),
                    "metrics": bool(scholar_metrics),
                },
                "ads": {
                    "publications": len(ads_publications),
                    "metrics": bool(ads_metrics),
                },
            },
            "statistics": self._generate_statistics(merged_publications),
        }

        # Add co-author network if ADS data is available
        try:
            if ads_publications:
                coauthor_network = self.ads_fetcher.fetch_coauthor_network()
                full_data["coauthorNetwork"] = coauthor_network
        except Exception as e:
            logger.warning(f"Failed to generate co-author network: {e}")

        return full_data

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

    def save_data(self, data: Dict):
        """Save the consolidated data to files."""
        logger.info("Saving consolidated data")

        # Validate data first
        if not self.merger.validate_data(data):
            logger.warning("Data validation failed, but proceeding with save")

        # Create backup
        try:
            self.merger.create_backup(data, self.backup_dir)
        except Exception as e:
            logger.warning(f"Failed to create backup: {e}")

        # Ensure output directories exist
        os.makedirs(os.path.dirname(self.full_output_path), exist_ok=True)
        os.makedirs(os.path.dirname(self.summary_output_path), exist_ok=True)

        # Save full data
        try:
            with open(self.full_output_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            logger.info(f"Full data saved to {self.full_output_path}")
        except Exception as e:
            logger.error(f"Failed to save full data: {e}")
            raise

        # Generate and save summary data
        try:
            summary_data = self.merger.generate_summary_data(data)
            with open(self.summary_output_path, "w", encoding="utf-8") as f:
                json.dump(summary_data, f, indent=2, ensure_ascii=False)
            logger.info(f"Summary data saved to {self.summary_output_path}")
        except Exception as e:
            logger.error(f"Failed to save summary data: {e}")

    def run(self):
        """Main execution method."""
        try:
            logger.info("=== Starting Publication Data Update ===")

            # Fetch and merge all data
            data = self.fetch_all_data()

            # Save results
            self.save_data(data)

            # Log summary
            metrics = data.get("metrics", {})
            logger.info(f"=== Update Complete ===")
            logger.info(f"Total Publications: {metrics.get('totalPapers', 0)}")
            logger.info(f"H-Index: {metrics.get('hIndex', 0)}")
            logger.info(f"Total Citations: {metrics.get('totalCitations', 0)}")
            logger.info(f"Data sources: {', '.join(metrics.get('sources', []))}")

            return True

        except Exception as e:
            logger.error(f"Publication data update failed: {e}")
            return False


def main():
    """Main entry point."""
    # Check for required environment variables
    ads_key = os.getenv("ADS_API_KEY")
    if not ads_key:
        logger.warning("ADS_API_KEY not found. ADS data will be limited.")
        logger.info(
            "Get an API key from: https://ui.adsabs.harvard.edu/user/settings/token"
        )

    # Run the orchestrator
    orchestrator = PublicationDataOrchestrator()
    success = orchestrator.run()

    if success:
        logger.info("Publication data update completed successfully")
        sys.exit(0)
    else:
        logger.error("Publication data update failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
