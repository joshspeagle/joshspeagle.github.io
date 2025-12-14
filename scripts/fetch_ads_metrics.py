#!/usr/bin/env python3
"""
Fetch bibliometric metrics from the ADS Metrics API.

This script fetches h-index, g-index, i10, i100, tori, read10 time series
data from the ADS API and stores it in publications_data.json.
"""

import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# ADS Metrics API endpoint
ADS_METRICS_ENDPOINT = "https://api.adsabs.harvard.edu/v1/metrics"


class ADSMetricsFetcher:
    """Fetches bibliometric metrics from the ADS API."""

    def __init__(self, api_key: Optional[str] = None):
        """Initialize the fetcher with an API key."""
        self.api_key = api_key or os.getenv("ADS_API_KEY")
        if not self.api_key:
            raise ValueError(
                "ADS_API_KEY not found. Set it in .env or pass it directly."
            )

    def fetch_metrics(self, bibcodes: List[str]) -> Dict:
        """
        Fetch metrics for a list of bibcodes from the ADS Metrics API.

        Args:
            bibcodes: List of ADS bibcodes

        Returns:
            Dictionary containing metrics data
        """
        if not bibcodes:
            logger.warning("No bibcodes provided")
            return {}

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "bibcodes": bibcodes,
            "types": ["indicators", "timeseries"],
        }

        logger.info(f"Fetching metrics for {len(bibcodes)} bibcodes...")

        try:
            response = requests.post(
                ADS_METRICS_ENDPOINT,
                headers=headers,
                json=payload,
                timeout=60,
            )
            response.raise_for_status()
            data = response.json()
            logger.info("Successfully fetched metrics from ADS")
            return data

        except requests.exceptions.Timeout:
            logger.error("Request timed out")
            return {}
        except requests.exceptions.HTTPError as e:
            logger.error(f"HTTP error: {e}")
            logger.error(f"Response: {e.response.text if e.response else 'No response'}")
            return {}
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed: {e}")
            return {}
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse response: {e}")
            return {}

    def parse_metrics(self, raw_data: Dict) -> Dict:
        """
        Parse the raw ADS metrics response into a structured format.

        Args:
            raw_data: Raw response from ADS Metrics API

        Returns:
            Structured metrics dictionary
        """
        result = {
            "adsMetricsTimeSeries": {},
            "adsMetricsCurrent": {},
            "adsMetricsLastUpdated": datetime.now().isoformat() + "Z",
        }

        # Extract current indicator values
        indicators = raw_data.get("indicators", {})
        indicators_refereed = raw_data.get("indicators refereed", {})

        # Current values (use total, not just refereed)
        result["adsMetricsCurrent"] = {
            "h": indicators.get("h", 0),
            "g": indicators.get("g", 0),
            "m": indicators.get("m", 0),
            "i10": indicators.get("i10", 0),
            "i100": indicators.get("i100", 0),
            "tori": indicators.get("tori", 0),
            "riq": indicators.get("riq", 0),
            "read10": indicators.get("read10", 0),
        }

        # Also store refereed-only values
        result["adsMetricsCurrentRefereed"] = {
            "h": indicators_refereed.get("h", 0),
            "g": indicators_refereed.get("g", 0),
            "m": indicators_refereed.get("m", 0),
            "i10": indicators_refereed.get("i10", 0),
            "i100": indicators_refereed.get("i100", 0),
            "tori": indicators_refereed.get("tori", 0),
            "riq": indicators_refereed.get("riq", 0),
            "read10": indicators_refereed.get("read10", 0),
        }

        # Extract time series data
        time_series = raw_data.get("time series", {})

        # Map each metric to year-value pairs
        for metric in ["h", "g", "i10", "i100", "tori", "read10"]:
            if metric in time_series:
                # Time series data is {year: value, year: value, ...}
                result["adsMetricsTimeSeries"][metric] = time_series[metric]

        logger.info(
            f"Parsed metrics: {len(result['adsMetricsTimeSeries'])} time series metrics"
        )

        return result

    def update_publications_data(
        self,
        metrics: Dict,
        publications_path: str = "../assets/data/publications_data.json",
    ) -> bool:
        """
        Update publications_data.json with the fetched metrics.

        Args:
            metrics: Parsed metrics dictionary
            publications_path: Path to publications_data.json

        Returns:
            True if successful, False otherwise
        """
        # Resolve path relative to script location
        script_dir = Path(__file__).parent
        abs_path = (script_dir / publications_path).resolve()

        try:
            with open(abs_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except FileNotFoundError:
            logger.error(f"Publications file not found: {abs_path}")
            return False
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse publications file: {e}")
            return False

        # Update metrics section
        if "metrics" not in data:
            data["metrics"] = {}

        data["metrics"]["adsMetricsTimeSeries"] = metrics.get(
            "adsMetricsTimeSeries", {}
        )
        data["metrics"]["adsMetricsCurrent"] = metrics.get("adsMetricsCurrent", {})
        data["metrics"]["adsMetricsCurrentRefereed"] = metrics.get(
            "adsMetricsCurrentRefereed", {}
        )
        data["metrics"]["riqByCategory"] = metrics.get("riqByCategory", {})
        data["metrics"]["adsMetricsLastUpdated"] = metrics.get(
            "adsMetricsLastUpdated", datetime.now().isoformat() + "Z"
        )

        # Write back
        try:
            with open(abs_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            logger.info(f"Updated {abs_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to write publications file: {e}")
            return False


def load_bibcodes_from_cache(cache_path: str = "ads_library_cache.json") -> Dict[str, List[str]]:
    """Load bibcodes from the ADS library cache, organized by category."""
    script_dir = Path(__file__).parent
    abs_path = (script_dir / cache_path).resolve()

    try:
        with open(abs_path, "r", encoding="utf-8") as f:
            cache = json.load(f)

        result = {
            "all": cache.get("all", []),
            "primary": cache.get("primary", []),
            "significant": cache.get("significant", []),
            "student": cache.get("student", []),
            "postdoc": cache.get("postdoc", []),
        }
        logger.info(f"Loaded bibcodes from cache: {len(result['all'])} total, "
                    f"{len(result['primary'])} primary, {len(result['significant'])} significant, "
                    f"{len(result['student'])} student, {len(result['postdoc'])} postdoc")
        return result
    except FileNotFoundError:
        logger.error(f"Cache file not found: {abs_path}")
        return {"all": [], "primary": [], "significant": [], "student": [], "postdoc": []}
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse cache file: {e}")
        return {"all": [], "primary": [], "significant": [], "student": [], "postdoc": []}


def load_bibcodes_from_publications(
    publications_path: str = "../assets/data/publications_data.json",
) -> List[str]:
    """Load bibcodes directly from publications_data.json."""
    script_dir = Path(__file__).parent
    abs_path = (script_dir / publications_path).resolve()

    try:
        with open(abs_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        publications = data.get("publications", [])
        bibcodes = [
            p.get("bibcode") for p in publications if p.get("bibcode")
        ]
        logger.info(f"Loaded {len(bibcodes)} bibcodes from publications")
        return bibcodes
    except FileNotFoundError:
        logger.error(f"Publications file not found: {abs_path}")
        return []
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse publications file: {e}")
        return []


def main():
    """Main function."""
    logger.info("Starting ADS metrics fetch...")

    # Get API key
    api_key = os.getenv("ADS_API_KEY")
    if not api_key:
        logger.error("ADS_API_KEY environment variable not set")
        logger.error("Set it with: export ADS_API_KEY='your-api-key'")
        return 1

    # Load bibcodes from cache (organized by category)
    bibcodes_by_category = load_bibcodes_from_cache()
    bibcodes = bibcodes_by_category.get("all", [])

    if not bibcodes:
        bibcodes = load_bibcodes_from_publications()

    if not bibcodes:
        logger.error("No bibcodes found. Run update_ads_library_cache.py first.")
        return 1

    fetcher = ADSMetricsFetcher(api_key)

    # Fetch metrics for all papers
    logger.info("Fetching metrics for all papers...")
    raw_metrics = fetcher.fetch_metrics(bibcodes)

    if not raw_metrics:
        logger.error("Failed to fetch metrics")
        return 1

    # Parse metrics
    parsed_metrics = fetcher.parse_metrics(raw_metrics)

    # Fetch metrics by category for RIQ breakdown (including "all")
    categories = ["all", "primary", "significant", "student", "postdoc"]
    riq_by_category = {}

    for category in categories:
        cat_bibcodes = bibcodes_by_category.get(category, [])
        if cat_bibcodes:
            logger.info(f"Fetching metrics for {category} ({len(cat_bibcodes)} papers)...")
            cat_raw = fetcher.fetch_metrics(cat_bibcodes)
            if cat_raw:
                time_series = cat_raw.get("time series", {})
                indicators = cat_raw.get("indicators", {})

                # Get tori time series to compute RIQ
                tori_series = time_series.get("tori", {})

                # Compute RIQ time series: RIQ = sqrt(tori) / years_active * 1000
                # First publication year is the first year with data
                riq_series = {}
                if tori_series:
                    years = sorted([int(y) for y in tori_series.keys()])
                    first_year = years[0]
                    for year in years:
                        tori_val = tori_series.get(str(year), 0)
                        years_active = year - first_year + 1  # +1 to avoid division by zero in first year
                        if tori_val > 0 and years_active > 0:
                            riq_val = (tori_val ** 0.5) / years_active * 1000
                            riq_series[str(year)] = round(riq_val, 1)

                riq_by_category[category] = {
                    "current": indicators.get("riq", 0),
                    "papers": len(cat_bibcodes),
                    "riq_series": riq_series,
                }
                logger.info(f"  {category}: RIQ={indicators.get('riq', 0):.1f}, "
                           f"h={indicators.get('h', 0)}, papers={len(cat_bibcodes)}, "
                           f"riq_series_years={len(riq_series)}")

    # Add RIQ by category to parsed metrics
    parsed_metrics["riqByCategory"] = riq_by_category

    # Log summary
    current = parsed_metrics.get("adsMetricsCurrent", {})
    logger.info("Current metrics (all papers):")
    logger.info(f"  h-index: {current.get('h', 'N/A')}")
    logger.info(f"  g-index: {current.get('g', 'N/A')}")
    logger.info(f"  i10: {current.get('i10', 'N/A')}")
    logger.info(f"  i100: {current.get('i100', 'N/A')}")
    logger.info(f"  tori: {current.get('tori', 'N/A')}")
    logger.info(f"  riq: {current.get('riq', 'N/A')}")
    logger.info(f"  read10: {current.get('read10', 'N/A')}")

    # Update publications data
    if fetcher.update_publications_data(parsed_metrics):
        logger.info("Successfully updated publications_data.json with ADS metrics")
        return 0
    else:
        logger.error("Failed to update publications_data.json")
        return 1


if __name__ == "__main__":
    exit(main())
