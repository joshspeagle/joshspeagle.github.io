#!/usr/bin/env python3
"""
Post-process scraped publication data for website deployment.

This script:
1. Loads the scraped publication data
2. Marks specified papers as featured
3. Deploys the processed data to the main website directory
"""

import json
import shutil
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# No papers marked as featured by default - this can be done manually


def load_scraped_data():
    """Load the scraped publication data."""
    data_file = "assets/data/publications_data.json"

    if not os.path.exists(data_file):
        logger.error(f"Scraped data file not found: {data_file}")
        return None

    try:
        with open(data_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        logger.info(
            f"Loaded {len(data.get('publications', []))} publications from scraped data"
        )
        return data
    except Exception as e:
        logger.error(f"Error loading scraped data: {e}")
        return None


def clean_featured_flags(data):
    """Remove any featured flags - these should be added manually."""
    publications = data.get("publications", [])

    for pub in publications:
        # Remove featured flag if present - will be added manually
        pub.pop("featured", None)

    logger.info("Cleaned featured flags - papers can be marked as featured manually")
    return data


def deploy_to_website(data):
    """Deploy processed data to the main website directory."""
    source_file = "assets/data/publications_data.json"
    target_file = "../assets/data/publications_data.json"

    try:
        # Save processed data to source location first
        with open(source_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        # Copy to main website directory
        os.makedirs(os.path.dirname(target_file), exist_ok=True)
        shutil.copy2(source_file, target_file)

        logger.info(f"Deployed processed data to {target_file}")
        return True

    except Exception as e:
        logger.error(f"Error deploying data: {e}")
        return False


def main():
    """Main processing function."""
    logger.info("Starting publication data post-processing...")

    # Load scraped data
    data = load_scraped_data()
    if not data:
        logger.error("Failed to load scraped data")
        return False

    # Clean featured flags (can be added manually later)
    data = clean_featured_flags(data)

    # Update last modified timestamp
    data["lastUpdated"] = datetime.utcnow().isoformat() + "Z"

    # Deploy to website
    success = deploy_to_website(data)

    if not success:
        logger.error("❌ Publication data post-processing failed")
        return False

    # Run featured publications flagging script
    logger.info("Running featured publications flagging...")
    try:
        featured_script = Path(__file__).parent / "flag_featured_publications.py"
        result = subprocess.run(
            [sys.executable, str(featured_script)], capture_output=True, text=True
        )

        if result.returncode == 0:
            logger.info("✅ Featured publications flagged successfully")
            # Print the output from the featured script
            if result.stdout.strip():
                print(result.stdout)
        else:
            logger.warning(
                f"⚠️ Featured publications script returned error code {result.returncode}"
            )
            if result.stderr:
                logger.warning(f"Error: {result.stderr}")

    except Exception as e:
        logger.warning(f"⚠️ Could not run featured publications script: {e}")

    # Run publication categorization script
    logger.info("Running publication categorization...")
    try:
        categorization_script = Path(__file__).parent / "categorize_publications.py"
        result = subprocess.run(
            [sys.executable, str(categorization_script)],
            capture_output=True,
            text=True,
        )

        if result.returncode == 0:
            logger.info("✅ Publication categorization completed successfully")
            # Print the output from the categorization script
            if result.stdout.strip():
                print(result.stdout)
        else:
            logger.warning(
                f"⚠️ Publication categorization script returned error code {result.returncode}"
            )
            if result.stderr:
                logger.warning(f"Error: {result.stderr}")

    except Exception as e:
        logger.warning(f"⚠️ Could not run publication categorization script: {e}")

    # Run citations timeline fix script
    logger.info("Running citations timeline fix...")
    try:
        citations_fix_script = Path(__file__).parent / "fix_citations_timeline.py"
        result = subprocess.run(
            [sys.executable, str(citations_fix_script), "--no-backup"],
            capture_output=True,
            text=True,
        )

        if result.returncode == 0:
            logger.info("✅ Citations timeline fix completed successfully")
            # Print the output from the fix script
            if result.stdout.strip():
                print(result.stdout)
        else:
            logger.warning(
                f"⚠️ Citations timeline fix script returned error code {result.returncode}"
            )
            if result.stderr:
                logger.warning(f"Error: {result.stderr}")

    except Exception as e:
        logger.warning(f"⚠️ Could not run citations timeline fix script: {e}")

    logger.info("✅ Publication data post-processing completed successfully")
    return True


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
