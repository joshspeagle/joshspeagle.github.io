#!/usr/bin/env python3
"""
Consolidated post-processing for publications data.

Runs all post-processing steps with a single load/save cycle:
  1. Flag featured publications
  2. Ensure categorization (sync LLM results, strip dead weight)
  3. Fix citations timeline (Google Scholar metrics)
  4. Update ADS library cache
  5. Apply authorship categories
  6. Fetch ADS bibliometric time series
"""

import argparse
import json
import logging
import os
import re
import shutil
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import requests
from dotenv import load_dotenv

from config import get_project_root, get_data_path, get_backup_dir

# Set up logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Suppress verbose external library logging
logging.getLogger("scholarly").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)

# ---------------------------------------------------------------------------
# ADS Library configurations
# ---------------------------------------------------------------------------
ADS_LIBRARIES = {
    "primary": "Jy98AvjOQXqykOSJ-bn96Q",
    "significant": "X5RfsxxzRXC-BWjU11xa4A",
    "student": "yyWDBaVwS0GIrIkz2GKltg",
    "postdoc": "6-JKiyOATdqEzuDGuUMWwg",
}
ADS_ALL_LIBRARY = "YiaebBefTHKZdblrny2Vsw"

# ADS Metrics API endpoint
ADS_METRICS_ENDPOINT = "https://api.adsabs.harvard.edu/v1/metrics"

# Featured publications (partial title matching)
FEATURED_PAPERS = [
    {
        "title_pattern": "Trustworthy scientific inference",
        "description": "Carzon et al.",
    },
    {
        "title_pattern": "A Deep, High-angular-resolution 3D Dust Map",
        "description": "Zucker, Saydjari and Speagle et al.",
    },
    {
        "title_pattern": "ChronoFlow: A Data-driven Model for Gyrochronology",
        "description": "Van-Lane et al.",
    },
]


class PostProcessor:
    """Consolidated post-processor for publications data.

    Loads publications_data.json once, runs all steps in-memory,
    and saves once at the end.
    """

    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.data_path = get_data_path()
        self.cache_path = get_data_path("ads_library_cache.json")
        self.data: Optional[Dict] = None
        self.ads_api_key: Optional[str] = None

    # ------------------------------------------------------------------
    # Load / save
    # ------------------------------------------------------------------

    def load(self) -> Dict:
        """Load publications data from the canonical path."""
        logger.info(f"Loading publications data from {self.data_path}")
        with open(self.data_path, "r", encoding="utf-8") as f:
            self.data = json.load(f)
        pubs = self.data.get("publications", [])
        logger.info(f"Loaded {len(pubs)} publications")
        return self.data

    def save(self):
        """Save publications data back to the canonical path."""
        if self.dry_run:
            logger.info("[DRY RUN] Would save to %s", self.data_path)
            return
        self.data_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.data_path, "w", encoding="utf-8") as f:
            json.dump(self.data, f, indent=2, ensure_ascii=False)
        logger.info(f"Saved publications data to {self.data_path}")

    # ------------------------------------------------------------------
    # Step 1: Flag featured publications
    # ------------------------------------------------------------------

    def flag_featured(self):
        """Flag specific publications as featured."""
        pubs = self.data.get("publications", [])
        count = 0
        for paper in FEATURED_PAPERS:
            pattern = paper["title_pattern"].lower()
            for pub in pubs:
                if pattern in pub.get("title", "").lower():
                    pub["featured"] = True
                    count += 1
                    logger.info(f"Flagged featured: {paper['description']}")
                    break
            else:
                logger.warning(f"Featured paper not found: {paper['description']}")
        logger.info(f"Flagged {count} featured publications")

    # ------------------------------------------------------------------
    # Step 2: Ensure categorization (sync LLM, strip dead weight)
    # ------------------------------------------------------------------

    def ensure_categorization(self):
        """Sync categoryProbabilities/researchArea from LLM data.

        - Papers WITH llm_categorization: use its probabilities/area
        - Papers WITHOUT: keep whatever the fetcher assigned
        - Strip _scoring_info from all papers (keyword scoring artifact)
        """
        pubs = self.data.get("publications", [])
        synced = 0
        stripped = 0
        for pub in pubs:
            # Sync from LLM categorization if present
            llm = pub.get("llm_categorization")
            if llm and isinstance(llm, dict):
                if "categoryProbabilities" in llm:
                    pub["categoryProbabilities"] = llm["categoryProbabilities"]
                if "researchArea" in llm:
                    pub["researchArea"] = llm["researchArea"]
                synced += 1

            # Strip keyword scoring artifact
            if "_scoring_info" in pub:
                del pub["_scoring_info"]
                stripped += 1

        # Strip top-level processing_history (keyword scoring artifact)
        if "processing_history" in self.data:
            del self.data["processing_history"]
            logger.info("Stripped processing_history from top-level data")

        logger.info(
            f"Categorization: synced {synced} from LLM, stripped _scoring_info from {stripped}"
        )

    # ------------------------------------------------------------------
    # Step 3: Fix citations timeline
    # ------------------------------------------------------------------

    def fix_citations_timeline(self):
        """Update metrics with Google Scholar citations timeline."""
        try:
            from fetch_google_scholar import GoogleScholarFetcher

            fetcher = GoogleScholarFetcher()
            scholar_metrics = fetcher.fetch_author_metrics()
        except Exception as e:
            logger.warning(f"Could not fetch Scholar metrics: {e}")
            return

        pubs = self.data.get("publications", [])
        current_metrics = self.data.get("metrics", {})

        # Citations per year from Google Scholar
        new_cpy = scholar_metrics.get("citationsPerYear", {})

        # Fallback: keep existing data if Scholar returns empty
        if not new_cpy:
            old_cpy = current_metrics.get("citationsPerYear", {})
            if old_cpy and sum(old_cpy.values()) > 0:
                new_cpy = old_cpy
                logger.info("Using existing citationsPerYear (Scholar returned empty)")
            else:
                logger.warning("No citationsPerYear data available")

        # Citations by publication year (calculated)
        citations_by_pub_year = {}
        for pub in pubs:
            year = pub.get("year")
            if year and year >= 2000:
                yr = str(year)
                citations_by_pub_year[yr] = (
                    citations_by_pub_year.get(yr, 0) + pub.get("citations", 0)
                )

        actual_paper_count = len(pubs)
        updated_metrics = {
            **current_metrics,
            "totalPapers": actual_paper_count,
            "hIndex": scholar_metrics.get(
                "hIndex", current_metrics.get("hIndex", 0)
            ),
            "i10Index": scholar_metrics.get(
                "i10Index", current_metrics.get("i10Index", 0)
            ),
            "totalCitations": scholar_metrics.get(
                "totalCitations", current_metrics.get("totalCitations", 0)
            ),
            "citationsPerYear": new_cpy,
            "citationsByPublicationYear": citations_by_pub_year,
            "lastUpdated": datetime.now().isoformat() + "Z",
        }

        sources = updated_metrics.get("sources", [])
        if "google_scholar" not in sources:
            sources.append("google_scholar")
            updated_metrics["sources"] = sources

        self.data["metrics"] = updated_metrics
        self.data["lastUpdated"] = datetime.now().isoformat() + "Z"
        logger.info(
            f"Citations timeline updated: {len(new_cpy)} years, "
            f"{updated_metrics['totalCitations']} total citations"
        )

    # ------------------------------------------------------------------
    # Step 4: Update ADS library cache
    # ------------------------------------------------------------------

    def update_ads_library_cache(self) -> Dict[str, List[str]]:
        """Fetch latest bibcodes from ADS libraries and update cache."""
        if not self.ads_api_key:
            logger.warning("No ADS API key — skipping library cache update")
            return self._load_existing_cache()

        headers = {"Authorization": f"Bearer {self.ads_api_key}"}
        new_cache: Dict[str, List[str]] = {}

        # Fetch "all" library
        if ADS_ALL_LIBRARY:
            bibcodes = self._fetch_library_bibcodes(ADS_ALL_LIBRARY, headers)
            if bibcodes:
                new_cache["all"] = bibcodes

        # Fetch category libraries
        for category, library_id in ADS_LIBRARIES.items():
            bibcodes = self._fetch_library_bibcodes(library_id, headers)
            if bibcodes:
                new_cache[category] = bibcodes

        # Merge with existing cache
        merged = self._merge_cache(new_cache)

        # Save cache
        if not self.dry_run:
            self.cache_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.cache_path, "w") as f:
                json.dump(merged, f, indent=2)
            logger.info(f"Saved ADS library cache to {self.cache_path}")

        return merged

    def _fetch_library_bibcodes(
        self, library_id: str, headers: Dict
    ) -> List[str]:
        """Fetch all bibcodes from an ADS library with pagination."""
        url = f"https://api.adsabs.harvard.edu/v1/biblib/libraries/{library_id}"
        try:
            resp = requests.get(url, headers=headers, timeout=30)
            resp.raise_for_status()
            metadata = resp.json().get("metadata", {})
            total = metadata.get("num_documents", 0)
        except Exception as e:
            logger.error(f"Library {library_id} metadata fetch failed: {e}")
            return []

        if total == 0:
            return []

        all_bibcodes: List[str] = []
        start = 0
        while start < total:
            try:
                resp = requests.get(
                    url,
                    headers=headers,
                    params={"start": start, "rows": min(200, total - start)},
                    timeout=30,
                )
                resp.raise_for_status()
                docs = resp.json().get("documents", [])
                if not docs:
                    break
                all_bibcodes.extend(docs)
                start += len(docs)
            except Exception as e:
                logger.error(f"Library {library_id} page fetch failed: {e}")
                break

        logger.info(f"Library {library_id}: {len(all_bibcodes)} bibcodes")
        return all_bibcodes

    def _load_existing_cache(self) -> Dict[str, List[str]]:
        """Load existing ADS library cache."""
        try:
            with open(self.cache_path, "r") as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}

    def _merge_cache(self, new_cache: Dict[str, List[str]]) -> Dict[str, List[str]]:
        """Merge new cache with existing, preserving manual entries."""
        existing = self._load_existing_cache()
        merged = existing.copy()
        for category, bibcodes in new_cache.items():
            if category in merged:
                merged_set = set(merged[category]) | set(bibcodes)
                merged[category] = sorted(merged_set, reverse=True)
            else:
                merged[category] = bibcodes
        return merged

    # ------------------------------------------------------------------
    # Step 5: Apply authorship categories
    # ------------------------------------------------------------------

    def apply_authorship_categories(self, cache: Dict[str, List[str]]):
        """Apply authorship categories based on ADS library cache."""
        pubs = self.data.get("publications", [])

        primary = set(cache.get("primary", []))
        significant = set(cache.get("significant", []))
        student = set(cache.get("student", []))
        postdoc = set(cache.get("postdoc", []))

        logger.info(
            f"Library cache: {len(primary)} primary, {len(significant)} significant, "
            f"{len(student)} student, {len(postdoc)} postdoc"
        )

        updated = 0
        for pub in pubs:
            bibcode = pub.get("bibcode", pub.get("id", ""))
            if not bibcode:
                continue

            # Priority: primary > postdoc > student > significant
            if bibcode in primary:
                pub["authorshipCategory"] = "primary"
                updated += 1
            elif bibcode in postdoc:
                pub["authorshipCategory"] = "postdoc"
                updated += 1
            elif bibcode in student:
                pub["authorshipCategory"] = "student"
                updated += 1
            elif bibcode in significant:
                pub["authorshipCategory"] = "significant"
                updated += 1

        logger.info(f"Applied authorship categories to {updated} publications")

    # ------------------------------------------------------------------
    # Step 6: Fetch ADS bibliometric time series
    # ------------------------------------------------------------------

    def fetch_ads_metrics(self):
        """Fetch h/g/i10/tori time series from ADS Metrics API."""
        if not self.ads_api_key:
            logger.warning("No ADS API key — skipping ADS metrics fetch")
            return

        # Get bibcodes from cache or publications
        cache = self._load_existing_cache()
        bibcodes = cache.get("all", [])
        if not bibcodes:
            bibcodes = [
                p.get("bibcode")
                for p in self.data.get("publications", [])
                if p.get("bibcode")
            ]
        if not bibcodes:
            logger.warning("No bibcodes available for ADS metrics")
            return

        headers = {
            "Authorization": f"Bearer {self.ads_api_key}",
            "Content-Type": "application/json",
        }

        # Fetch overall metrics
        raw = self._fetch_metrics_api(bibcodes, headers)
        if not raw:
            return

        parsed = self._parse_ads_metrics(raw)

        # Fetch per-category RIQ breakdown
        bibcodes_by_cat = {
            "all": bibcodes,
            "primary": cache.get("primary", []),
            "significant": cache.get("significant", []),
            "student": cache.get("student", []),
            "postdoc": cache.get("postdoc", []),
        }
        riq_by_category = {}
        for category, cat_bibcodes in bibcodes_by_cat.items():
            if not cat_bibcodes:
                continue
            cat_raw = self._fetch_metrics_api(cat_bibcodes, headers)
            if cat_raw:
                ts = cat_raw.get("time series", {})
                indicators = cat_raw.get("indicators", {})
                tori_series = ts.get("tori", {})
                riq_series = {}
                if tori_series:
                    years = sorted(int(y) for y in tori_series.keys())
                    first_year = years[0]
                    for year in years:
                        tori_val = tori_series.get(str(year), 0)
                        years_active = year - first_year + 1
                        if tori_val > 0 and years_active > 0:
                            riq_series[str(year)] = round(
                                (tori_val**0.5) / years_active * 1000, 1
                            )
                riq_by_category[category] = {
                    "current": indicators.get("riq", 0),
                    "papers": len(cat_bibcodes),
                    "riq_series": riq_series,
                }
                logger.info(
                    f"  {category}: RIQ={indicators.get('riq', 0):.1f}, "
                    f"h={indicators.get('h', 0)}, papers={len(cat_bibcodes)}"
                )

        parsed["riqByCategory"] = riq_by_category

        # Write to metrics
        metrics = self.data.setdefault("metrics", {})
        metrics["adsMetricsTimeSeries"] = parsed.get("adsMetricsTimeSeries", {})
        metrics["adsMetricsCurrent"] = parsed.get("adsMetricsCurrent", {})
        metrics["adsMetricsCurrentRefereed"] = parsed.get(
            "adsMetricsCurrentRefereed", {}
        )
        metrics["riqByCategory"] = parsed.get("riqByCategory", {})
        metrics["adsMetricsLastUpdated"] = parsed.get(
            "adsMetricsLastUpdated", datetime.now().isoformat() + "Z"
        )

        logger.info("ADS bibliometric time series updated")

    def _fetch_metrics_api(
        self, bibcodes: List[str], headers: Dict
    ) -> Optional[Dict]:
        """Call the ADS Metrics API."""
        try:
            resp = requests.post(
                ADS_METRICS_ENDPOINT,
                headers=headers,
                json={"bibcodes": bibcodes, "types": ["indicators", "timeseries"]},
                timeout=60,
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.error(f"ADS metrics API error: {e}")
            return None

    def _parse_ads_metrics(self, raw: Dict) -> Dict:
        """Parse raw ADS metrics response."""
        indicators = raw.get("indicators", {})
        indicators_ref = raw.get("indicators refereed", {})
        ts = raw.get("time series", {})

        result = {
            "adsMetricsCurrent": {
                m: indicators.get(m, 0)
                for m in ["h", "g", "m", "i10", "i100", "tori", "riq", "read10"]
            },
            "adsMetricsCurrentRefereed": {
                m: indicators_ref.get(m, 0)
                for m in ["h", "g", "m", "i10", "i100", "tori", "riq", "read10"]
            },
            "adsMetricsTimeSeries": {
                m: ts[m] for m in ["h", "g", "i10", "i100", "tori", "read10"] if m in ts
            },
            "adsMetricsLastUpdated": datetime.now().isoformat() + "Z",
        }
        logger.info(
            f"Parsed ADS metrics: {len(result['adsMetricsTimeSeries'])} time series"
        )
        return result

    # ------------------------------------------------------------------
    # Run all steps
    # ------------------------------------------------------------------

    def run_all(self):
        """Run the complete post-processing pipeline."""
        # Load .env for API keys
        env_path = get_project_root() / ".env"
        if env_path.exists():
            load_dotenv(dotenv_path=env_path)
        else:
            load_dotenv()
        self.ads_api_key = os.getenv("ADS_API_KEY")

        # Load data
        self.load()

        # Step 1: Featured flags
        logger.info("--- Step 1: Flag featured publications ---")
        self.flag_featured()

        # Step 2: Ensure categorization
        logger.info("--- Step 2: Ensure categorization ---")
        self.ensure_categorization()

        # Step 3: Fix citations timeline
        logger.info("--- Step 3: Fix citations timeline ---")
        self.fix_citations_timeline()

        # Step 4: Update ADS library cache
        logger.info("--- Step 4: Update ADS library cache ---")
        cache = self.update_ads_library_cache()

        # Step 5: Apply authorship categories
        logger.info("--- Step 5: Apply authorship categories ---")
        self.apply_authorship_categories(cache)

        # Step 6: Fetch ADS metrics
        logger.info("--- Step 6: Fetch ADS bibliometric metrics ---")
        self.fetch_ads_metrics()

        # Save once
        self.save()
        logger.info("Post-processing complete.")


def main():
    parser = argparse.ArgumentParser(
        description="Consolidated post-processing for publications data"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without writing files",
    )
    args = parser.parse_args()

    processor = PostProcessor(dry_run=args.dry_run)
    processor.run_all()


if __name__ == "__main__":
    main()
