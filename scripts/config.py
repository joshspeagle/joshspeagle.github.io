"""
Configuration settings for publication data fetching.
"""

CONFIG = {
    "google_scholar": {
        "author_id": "Z6dqXGoAAAAJ",
        "max_results": 500,
        "sort_by": "citedby",
        "retry_attempts": 3,
        "retry_delay": 5,  # seconds between retries
    },
    "ads": {
        "author_query": 'author:"Speagle, J"',
        "fields": [
            "title",
            "author",
            "year",
            "doi",
            "arxiv_class",
            "eprint_id",
            "citation_count",
            "abstract",
            "keyword",
            "bibcode",
            "pub",
            "doctype",
        ],
        "rows": 1000,
        "sort": "date desc",
        "retry_attempts": 3,
        "retry_delay": 2,
    },
    "output": {
        "full_data": "assets/data/publications_data.json",
        "summary": "assets/data/publications_summary.json",
        "backup_dir": "assets/data/backups",
    },
    "categories": {
        "keywords_mapping": {
            # Statistical Learning & AI
            "machine learning": "Statistical Learning & AI",
            "artificial intelligence": "Statistical Learning & AI",
            "neural networks": "Statistical Learning & AI",
            "deep learning": "Statistical Learning & AI",
            "pattern recognition": "Statistical Learning & AI",
            # Interpretability & Insight
            "interpretability": "Interpretability & Insight",
            "explainable ai": "Interpretability & Insight",
            "model interpretation": "Interpretability & Insight",
            "feature importance": "Interpretability & Insight",
            # Inference & Computation
            "bayesian inference": "Inference & Computation",
            "nested sampling": "Inference & Computation",
            "mcmc": "Inference & Computation",
            "monte carlo": "Inference & Computation",
            "statistical inference": "Inference & Computation",
            "computational statistics": "Inference & Computation",
            "parameter estimation": "Inference & Computation",
            # Discovery & Understanding
            "galaxy formation": "Discovery & Understanding",
            "galaxy evolution": "Discovery & Understanding",
            "stellar populations": "Discovery & Understanding",
            "astronomical surveys": "Discovery & Understanding",
            "cosmology": "Discovery & Understanding",
            "dark matter": "Discovery & Understanding",
            "star formation": "Discovery & Understanding",
        },
        "default_category": "Discovery & Understanding",
    },
    "validation": {
        "min_papers": 50,  # Minimum expected number of papers
        "max_h_index": 100,  # Sanity check for h-index
        "max_citations": 50000,  # Sanity check for total citations
        "clean_mathematical_notation": True,  # Auto-fix mathematical notation formatting
        "validate_mathematical_notation": True,  # Check for mathematical notation issues
    },
}

# Author name variations for matching across databases
AUTHOR_VARIATIONS = [
    "Speagle, J. S.",
    "Speagle, Joshua S.",
    "Speagle, J.",
    "Speagle, Joshua",
    "Speagle, Josh",
    "J. S. Speagle",
    "J. Speagle",
    "Joshua S. Speagle",
    "Joshua Speagle",
    "Josh Speagle",
]

# Common journal abbreviations
JOURNAL_MAPPINGS = {
    "MNRAS": "Monthly Notices of the Royal Astronomical Society",
    "ApJ": "The Astrophysical Journal",
    "ApJS": "The Astrophysical Journal Supplement Series",
    "A&A": "Astronomy & Astrophysics",
    "AJ": "The Astronomical Journal",
    "PASP": "Publications of the Astronomical Society of the Pacific",
    "JCAP": "Journal of Cosmology and Astroparticle Physics",
}
