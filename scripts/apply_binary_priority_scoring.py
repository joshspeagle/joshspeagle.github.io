#!/usr/bin/env python3
"""
Apply Binary Priority Scoring to All Publications

Applies the improved binary presence + methodological priority scoring system
to all publications and updates the publications data with probability distributions.
"""

import json
import time
import logging
from pathlib import Path
# Import local functions (consolidated from binary_priority_scoring module)
import numpy as np
import re
from collections import defaultdict
from enhanced_methodological_keywords import ENHANCED_METHODOLOGICAL_KEYWORDS

# Priority multipliers for methodological categories (reduced from 3.0 to allow multi-category)
METHODOLOGICAL_PRIORITY = {
    'Statistical Learning & AI': 2.0,        # Moderate priority boost
    'Interpretability & Insight': 2.0,       # Moderate priority boost  
    'Inference & Computation': 2.0,          # Moderate priority boost
    'Discovery & Understanding': 1.0         # Base priority (astronomy application)
}

# Field-specific weight multipliers
FIELD_WEIGHTS = {
    'title': 3.0,
    'abstract': 1.0,
    'keywords': 2.0
}

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

def clean_text(text):
    """Clean text for keyword matching."""
    text = re.sub(r'[^\w\s-]', ' ', text.lower())
    return re.sub(r'\s+', ' ', text.strip())

def keyword_present(keyword, text):
    """Check if keyword is present in text (binary: True/False)."""
    pattern = r'\b' + re.escape(keyword) + r'\b'
    return bool(re.search(pattern, text, re.IGNORECASE))

def score_paper_binary_priority(publication):
    """Score a paper using binary presence + methodological priority."""
    
    title = publication.get('title', '')
    abstract = publication.get('abstract', '')[:800]  # Limit abstract length
    keywords_list = publication.get('keywords', [])
    keywords_text = ' '.join(keywords_list)
    
    # Clean each field
    title_clean = clean_text(title)
    abstract_clean = clean_text(abstract)
    keywords_clean = clean_text(keywords_text)
    
    category_scores = defaultdict(float)
    matched_terms = defaultdict(list)
    
    # Score each category
    for category, category_keywords in ENHANCED_METHODOLOGICAL_KEYWORDS.items():
        category_score = 0.0
        
        for keyword, base_weight in category_keywords.items():
            field_contributions = []
            
            # Check presence in each field (binary)
            if keyword_present(keyword, title_clean):
                contribution = base_weight * FIELD_WEIGHTS['title']
                field_contributions.append(('title', contribution))
                
            if keyword_present(keyword, abstract_clean):
                contribution = base_weight * FIELD_WEIGHTS['abstract']
                field_contributions.append(('abstract', contribution))
                
            if keyword_present(keyword, keywords_clean):
                contribution = base_weight * FIELD_WEIGHTS['keywords']
                field_contributions.append(('keywords', contribution))
            
            # Sum contributions from all fields for this keyword
            keyword_total = sum(contrib for field, contrib in field_contributions)
            
            if keyword_total > 0:
                category_score += keyword_total
                matched_terms[category].append(f"{keyword}({len(field_contributions)})")
        
        # Apply methodological priority multiplier
        priority_multiplier = METHODOLOGICAL_PRIORITY.get(category, 1.0)
        category_scores[category] = category_score * priority_multiplier
    
    return category_scores, matched_terms

def normalize_scores(scores):
    """Convert scores to probabilities using simple sum normalization.
    
    This is more intuitive than softmax - probabilities are directly proportional to scores.
    """
    if not scores or all(s == 0 for s in scores.values()):
        # Equal probabilities if no scores
        return {cat: 0.25 for cat in scores.keys()}
    
    # Simple sum normalization
    total_score = sum(scores.values())
    return {cat: score / total_score for cat, score in scores.items()}

def power_normalize(scores, power=0.5):
    """Alternative normalization using power scaling for more balanced distributions."""
    if not scores or all(s == 0 for s in scores.values()):
        return {cat: 0.25 for cat in scores.keys()}
    
    # Apply power scaling to reduce score differences
    categories = list(scores.keys())
    powered_scores = {cat: (score ** power) for cat, score in scores.items()}
    
    # Normalize to probabilities
    total = sum(powered_scores.values())
    return {cat: score / total for cat, score in powered_scores.items()}

def assign_primary_category(probabilities, min_threshold=0.3):
    """Assign primary category based on highest probability above threshold."""
    sorted_cats = sorted(probabilities.items(), key=lambda x: x[1], reverse=True)
    
    if sorted_cats[0][1] >= min_threshold:
        return sorted_cats[0][0]
    else:
        # If no category is dominant, assign to highest scoring one
        return sorted_cats[0][0]

def process_all_publications(input_file, output_file=None, dry_run=False):
    """Process all publications with new scoring system."""
    
    logger.info(f"Loading publications from {input_file}")
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    publications = data.get('publications', [])
    logger.info(f"Processing {len(publications)} publications")
    
    # Process each publication
    updated_publications = []
    category_changes = []
    probability_stats = {
        'high_confidence': 0,    # Primary category > 50%
        'medium_confidence': 0,  # Primary category 30-50%  
        'low_confidence': 0,     # Primary category < 30%
        'multi_category': 0      # Multiple categories > 20%
    }
    
    for i, pub in enumerate(publications):
        if i % 20 == 0:
            logger.info(f"Processing paper {i+1}/{len(publications)}")
        
        # Get original category
        original_category = pub.get('researchArea', 'Unknown')
        
        # Score with new system
        try:
            category_scores, matched_terms = score_paper_binary_priority(pub)
            
            # Convert to probabilities using simple sum normalization (more intuitive than softmax)
            probabilities = normalize_scores(category_scores)
            
            # Assign primary category
            new_primary_category = assign_primary_category(probabilities)
            
            # Create updated publication (preserve existing featured flag)
            updated_pub = pub.copy()
            updated_pub['researchArea'] = new_primary_category
            updated_pub['categoryProbabilities'] = probabilities
            updated_pub['_scoring_info'] = {
                'method': 'binary_priority_sum_normalization',
                'raw_scores': {cat: float(score) for cat, score in category_scores.items()},
                'matched_terms': {cat: terms[:5] for cat, terms in matched_terms.items()},
                'original_category': original_category,
                'updated_at': time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }
            
            # Preserve featured flag if it exists
            if 'featured' in pub:
                updated_pub['featured'] = pub['featured']
            
            # Track changes
            if original_category != new_primary_category:
                category_changes.append({
                    'title': pub.get('title', ''),
                    'original': original_category,
                    'new': new_primary_category,
                    'confidence': probabilities[new_primary_category],
                    'probabilities': probabilities
                })
            
            # Track probability statistics
            max_prob = max(probabilities.values())
            multi_cat_count = sum(1 for p in probabilities.values() if p > 0.2)
            
            if max_prob >= 0.5:
                probability_stats['high_confidence'] += 1
            elif max_prob >= 0.3:
                probability_stats['medium_confidence'] += 1
            else:
                probability_stats['low_confidence'] += 1
                
            if multi_cat_count >= 2:
                probability_stats['multi_category'] += 1
            
            updated_publications.append(updated_pub)
            
        except Exception as e:
            logger.error(f"Error processing paper {i}: {e}")
            updated_publications.append(pub)  # Keep original on error
    
    # Update data
    if not dry_run:
        data['publications'] = updated_publications
        data['lastUpdated'] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        
        # Add processing metadata
        if 'processing_history' not in data:
            data['processing_history'] = []
        
        data['processing_history'].append({
            'step': 'binary_priority_probabilistic_scoring',
            'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            'method': 'binary_presence + methodological_priority + softmax',
            'changes': len(category_changes),
            'statistics': probability_stats
        })
        
        # Save updated data
        output_path = output_file or input_file
        logger.info(f"Saving updated data to {output_path}")
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    
    # Print results
    print("\n" + "="*80)
    print("BINARY PRIORITY PROBABILISTIC SCORING RESULTS")
    print("="*80)
    
    print(f"\nTotal Publications: {len(publications)}")
    print(f"Category Changes: {len(category_changes)} ({len(category_changes)/len(publications)*100:.1f}%)")
    
    print(f"\nConfidence Distribution:")
    print(f"  High Confidence (>50%):     {probability_stats['high_confidence']:3d} papers ({probability_stats['high_confidence']/len(publications)*100:.1f}%)")
    print(f"  Medium Confidence (30-50%): {probability_stats['medium_confidence']:3d} papers ({probability_stats['medium_confidence']/len(publications)*100:.1f}%)")
    print(f"  Low Confidence (<30%):      {probability_stats['low_confidence']:3d} papers ({probability_stats['low_confidence']/len(publications)*100:.1f}%)")
    print(f"  Multi-Category (2+ >20%):   {probability_stats['multi_category']:3d} papers ({probability_stats['multi_category']/len(publications)*100:.1f}%)")
    
    # Show category distribution
    new_distribution = {}
    for pub in updated_publications:
        cat = pub.get('researchArea', 'Unknown')
        new_distribution[cat] = new_distribution.get(cat, 0) + 1
    
    print(f"\nNew Category Distribution:")
    for cat, count in sorted(new_distribution.items(), key=lambda x: x[1], reverse=True):
        print(f"  {cat:30} | {count:3d} papers ({count/len(publications)*100:.1f}%)")
    
    # Show sample category changes
    if category_changes:
        print(f"\nSample Category Changes (top 10):")
        print("-" * 80)
        for i, change in enumerate(category_changes[:10]):
            title = change['title'][:50] + "..." if len(change['title']) > 50 else change['title']
            print(f"{i+1:2d}. {title}")
            print(f"    {change['original']} → {change['new']} (confidence: {change['confidence']:.3f})")
            
            # Show probability distribution
            probs_str = " | ".join([f"{cat[:12]}: {prob:.2f}" for cat, prob in 
                                  sorted(change['probabilities'].items(), key=lambda x: x[1], reverse=True)])
            print(f"    Probabilities: {probs_str}")
            print()
    
    print("="*80)
    
    return updated_publications, category_changes

def main():
    """Main function."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Apply binary priority scoring to all publications")
    parser.add_argument(
        "--input",
        default="assets/data/publications_data.json",
        help="Input publications JSON file"
    )
    parser.add_argument(
        "--output",
        help="Output file (default: overwrite input)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run without saving changes"
    )
    
    args = parser.parse_args()
    
    # Process publications
    updated_pubs, changes = process_all_publications(
        args.input, 
        args.output, 
        args.dry_run
    )
    
    if not args.dry_run:
        print(f"\nUpdated {len(updated_pubs)} publications with probabilistic categories!")
        print("Ready to run research category analysis on updated data.")
    else:
        print(f"\nDry run complete. {len(changes)} papers would be changed.")
    
    return 0

if __name__ == "__main__":
    exit(main())