#!/usr/bin/env python3
"""
Analyze New Category System Performance

Analyzes the new binary + priority scoring system results to identify:
1. How well the new categories separate methodological vs application papers
2. What terms now distinguish each category 
3. Where the system might need further tuning
4. Papers that might be edge cases or incorrectly classified
"""

import json
import logging
from collections import defaultdict, Counter
import re
from typing import Dict, List, Any

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

class NewCategoryAnalyzer:
    """Analyzer for the new probabilistic category system."""
    
    def __init__(self):
        self.publications = []
        self.category_stats = defaultdict(lambda: {
            'count': 0,
            'titles': [],
            'abstracts': [],
            'keywords': [],
            'years': [],
            'citations': [],
            'probabilities': [],  # New: category probabilities
            'confidence_scores': [],  # New: confidence in assignment
            'original_categories': []  # Track what they were before
        })
    
    def load_data(self, data_path: str) -> bool:
        """Load publication data with new scoring info."""
        try:
            with open(data_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self.publications = data.get('publications', [])
                logger.info(f"Loaded {len(self.publications)} publications")
                return True
        except Exception as e:
            logger.error(f"Error loading data: {e}")
            return False
    
    def analyze_new_assignments(self):
        """Analyze the new category assignments and their quality."""
        logger.info("Analyzing new category assignments...")
        
        for pub in self.publications:
            category = pub.get('researchArea', 'Unknown')
            
            # Get scoring info if available
            scoring_info = pub.get('_scoring_info', {})
            probs = pub.get('categoryProbabilities', {})
            original_cat = scoring_info.get('original_category', 'Unknown')
            
            # Calculate confidence (highest probability)
            confidence = max(probs.values()) if probs else 0.0
            
            # Store stats
            stats = self.category_stats[category]
            stats['count'] += 1
            stats['titles'].append(pub.get('title', ''))
            stats['abstracts'].append(pub.get('abstract', ''))
            stats['keywords'].extend(pub.get('keywords', []))
            stats['years'].append(pub.get('year', 0))
            stats['citations'].append(pub.get('citations', 0))
            stats['probabilities'].append(probs)
            stats['confidence_scores'].append(confidence)
            stats['original_categories'].append(original_cat)
    
    def identify_methodological_terms_by_category(self) -> Dict[str, List[str]]:
        """Identify methodological terms that now distinguish each category."""
        logger.info("Identifying methodological terms by new category...")
        
        # Methodological term lists to look for
        methodological_terms = {
            'Statistical Learning & AI': [
                'machine learning', 'neural', 'deep learning', 'data-driven', 
                'variational', 'autoencoder', 'normalizing flows', 'generative',
                'supervised', 'unsupervised', 'training', 'model', 'algorithm'
            ],
            'Interpretability & Insight': [
                'interpretability', 'explainable', 'trustworthy', 'bias', 'systematic',
                'gap', 'independent', 'labels', 'understanding', 'insight', 'analysis',
                'uncertainty', 'robust', 'validation', 'explanation'
            ],
            'Inference & Computation': [
                'bayesian', 'inference', 'mcmc', 'monte carlo', 'sampling', 'likelihood',
                'posterior', 'prior', 'model selection', 'hierarchical', 'stochastic',
                'estimation', 'statistical', 'probability', 'distribution'
            ],
            'Discovery & Understanding': [
                'galaxy', 'stellar', 'star', 'formation', 'evolution', 'survey',
                'observation', 'detection', 'discovery', 'catalog', 'population'
            ]
        }
        
        category_method_usage = {}
        
        for category, stats in self.category_stats.items():
            # Combine all text for this category
            all_text = ' '.join(stats['titles'] + stats['abstracts']).lower()
            
            found_terms = []
            for term_category, terms in methodological_terms.items():
                category_terms = []
                for term in terms:
                    count = len(re.findall(r'\b' + re.escape(term) + r'\b', all_text))
                    if count > 0:
                        category_terms.append(f"{term}({count})")
                
                if category_terms:
                    found_terms.append(f"{term_category}: {', '.join(category_terms[:5])}")
            
            category_method_usage[category] = found_terms
        
        return category_method_usage
    
    def analyze_category_transitions(self) -> Dict[str, int]:
        """Analyze what categories changed from original to new system."""
        logger.info("Analyzing category transitions...")
        
        transitions = Counter()
        
        for pub in self.publications:
            new_cat = pub.get('researchArea', 'Unknown')
            scoring_info = pub.get('_scoring_info', {})
            original_cat = scoring_info.get('original_category', 'Unknown')
            
            if original_cat != new_cat:
                transition = f"{original_cat} → {new_cat}"
                transitions[transition] += 1
        
        return dict(transitions)
    
    def identify_edge_cases(self) -> List[Dict[str, Any]]:
        """Identify papers that might be edge cases or need review."""
        logger.info("Identifying edge cases...")
        
        edge_cases = []
        
        for pub in self.publications:
            probs = pub.get('categoryProbabilities', {})
            scoring_info = pub.get('_scoring_info', {})
            
            if not probs:
                continue
            
            # Calculate metrics
            max_prob = max(probs.values())
            num_significant = sum(1 for p in probs.values() if p > 0.2)
            entropy = -sum(p * np.log(p) if p > 0 else 0 for p in probs.values())
            
            # Identify different types of edge cases
            is_edge_case = False
            edge_type = []
            
            # Low confidence (no category dominates)
            if max_prob < 0.6:
                is_edge_case = True
                edge_type.append(f"low_confidence({max_prob:.2f})")
            
            # Multi-category (multiple categories significant)
            if num_significant >= 3:
                is_edge_case = True
                edge_type.append(f"multi_category({num_significant})")
            
            # High entropy (uncertain assignment)
            if entropy > 1.0:
                is_edge_case = True
                edge_type.append(f"high_entropy({entropy:.2f})")
            
            if is_edge_case:
                edge_cases.append({
                    'title': pub.get('title', ''),
                    'current_category': pub.get('researchArea', ''),
                    'original_category': scoring_info.get('original_category', ''),
                    'probabilities': probs,
                    'confidence': max_prob,
                    'edge_types': edge_type,
                    'abstract': pub.get('abstract', '')[:200] + '...',
                    'year': pub.get('year', 0)
                })
        
        # Sort by confidence (lowest first)
        edge_cases.sort(key=lambda x: x['confidence'])
        
        return edge_cases
    
    def analyze_methodological_coverage(self) -> Dict[str, Any]:
        """Analyze how well we're capturing methodological vs application papers."""
        logger.info("Analyzing methodological coverage...")
        
        # Count papers by type
        methodological_categories = ['Statistical Learning & AI', 'Interpretability & Insight', 'Inference & Computation']
        application_categories = ['Discovery & Understanding']
        
        method_count = sum(self.category_stats[cat]['count'] for cat in methodological_categories)
        app_count = sum(self.category_stats[cat]['count'] for cat in application_categories)
        
        # Analyze confidence by category type
        method_confidences = []
        app_confidences = []
        
        for pub in self.publications:
            cat = pub.get('researchArea', '')
            probs = pub.get('categoryProbabilities', {})
            confidence = max(probs.values()) if probs else 0.0
            
            if cat in methodological_categories:
                method_confidences.append(confidence)
            elif cat in application_categories:
                app_confidences.append(confidence)
        
        return {
            'methodological_papers': method_count,
            'application_papers': app_count,
            'method_percentage': method_count / (method_count + app_count) * 100 if (method_count + app_count) > 0 else 0,
            'avg_method_confidence': sum(method_confidences) / len(method_confidences) if method_confidences else 0,
            'avg_app_confidence': sum(app_confidences) / len(app_confidences) if app_confidences else 0,
            'low_confidence_method': sum(1 for c in method_confidences if c < 0.7),
            'low_confidence_app': sum(1 for c in app_confidences if c < 0.7)
        }
    
    def generate_improvement_recommendations(self, edge_cases, transitions, method_coverage) -> List[str]:
        """Generate recommendations for improving the system."""
        recommendations = []
        
        # Analyze transition patterns
        discovery_to_method = sum(count for trans, count in transitions.items() 
                                if 'Discovery & Understanding →' in trans and 
                                any(method in trans for method in ['Statistical Learning', 'Inference', 'Interpretability']))
        
        if discovery_to_method > len(self.publications) * 0.3:
            recommendations.append(
                f"Many papers ({discovery_to_method}) moved from Discovery to methodological categories. "
                f"Consider if Discovery category keywords are too broad."
            )
        
        # Analyze edge cases
        if len(edge_cases) > len(self.publications) * 0.1:
            recommendations.append(
                f"Found {len(edge_cases)} edge cases ({len(edge_cases)/len(self.publications)*100:.1f}%). "
                f"Review low-confidence assignments and consider additional keywords."
            )
        
        # Check methodological balance
        method_pct = method_coverage['method_percentage']
        if method_pct > 60:
            recommendations.append(
                f"Methodological categories now represent {method_pct:.1f}% of papers. "
                f"Verify this reflects true methodological contribution vs application."
            )
        elif method_pct < 30:
            recommendations.append(
                f"Only {method_pct:.1f}% of papers in methodological categories. "
                f"May be under-recognizing methodological contributions."
            )
        
        # Confidence analysis
        low_conf_method = method_coverage['low_confidence_method']
        if low_conf_method > 0:
            recommendations.append(
                f"{low_conf_method} methodological papers have low confidence (<70%). "
                f"Consider expanding methodological keyword coverage."
            )
        
        return recommendations
    
    def generate_analysis_report(self) -> Dict[str, Any]:
        """Generate comprehensive analysis of new category system."""
        logger.info("Generating new category analysis report...")
        
        # Run all analyses
        self.analyze_new_assignments()
        method_terms = self.identify_methodological_terms_by_category()
        transitions = self.analyze_category_transitions()
        edge_cases = self.identify_edge_cases()
        method_coverage = self.analyze_methodological_coverage()
        recommendations = self.generate_improvement_recommendations(edge_cases, transitions, method_coverage)
        
        # Calculate basic stats
        total_papers = len(self.publications)
        avg_confidences = {}
        for cat, stats in self.category_stats.items():
            if stats['confidence_scores']:
                avg_confidences[cat] = sum(stats['confidence_scores']) / len(stats['confidence_scores'])
        
        return {
            'total_papers': total_papers,
            'category_distribution': {
                cat: {
                    'count': stats['count'],
                    'percentage': stats['count'] / total_papers * 100,
                    'avg_confidence': avg_confidences.get(cat, 0),
                    'avg_citations': sum(stats['citations']) / max(len(stats['citations']), 1)
                }
                for cat, stats in self.category_stats.items()
            },
            'methodological_terms_by_category': method_terms,
            'category_transitions': transitions,
            'edge_cases': edge_cases,
            'methodological_coverage': method_coverage,
            'recommendations': recommendations
        }
    
    def print_analysis_report(self, report: Dict[str, Any]):
        """Print formatted analysis report."""
        print("\n" + "="*80)
        print("NEW CATEGORY SYSTEM ANALYSIS")
        print("="*80)
        
        print(f"\nTotal Papers: {report['total_papers']}")
        
        print(f"\nCategory Distribution & Quality:")
        print("-" * 60)
        for cat, data in sorted(report['category_distribution'].items(), key=lambda x: x[1]['count'], reverse=True):
            print(f"{cat:30} | {data['count']:3d} papers ({data['percentage']:5.1f}%) | "
                  f"Conf: {data['avg_confidence']:.3f} | Cites: {data['avg_citations']:.1f}")
        
        print(f"\nMethodological Coverage:")
        print("-" * 60)
        mc = report['methodological_coverage']
        print(f"Methodological Papers: {mc['methodological_papers']} ({mc['method_percentage']:.1f}%)")
        print(f"Application Papers: {mc['application_papers']} ({100-mc['method_percentage']:.1f}%)")
        print(f"Avg Confidence - Methods: {mc['avg_method_confidence']:.3f}, Applications: {mc['avg_app_confidence']:.3f}")
        
        print(f"\nCategory Transitions (Original → New):")
        print("-" * 60)
        for transition, count in sorted(report['category_transitions'].items(), key=lambda x: x[1], reverse=True):
            print(f"{transition:60} | {count:3d} papers")
        
        print(f"\nMethodological Terms by New Category:")
        print("-" * 60)
        for cat, terms in report['methodological_terms_by_category'].items():
            print(f"\n{cat}:")
            for term_info in terms:
                print(f"  {term_info}")
        
        if report['edge_cases']:
            print(f"\nEdge Cases Requiring Review (Top 10):")
            print("-" * 80)
            for i, case in enumerate(report['edge_cases'][:10]):
                print(f"{i+1:2d}. {case['title'][:50]}...")
                print(f"    {case['original_category']} → {case['current_category']} (conf: {case['confidence']:.3f})")
                print(f"    Issues: {', '.join(case['edge_types'])}")
                probs_str = " | ".join([f"{cat[:12]}:{prob:.2f}" for cat, prob in 
                                      sorted(case['probabilities'].items(), key=lambda x: x[1], reverse=True)])
                print(f"    Probs: {probs_str}")
                print(f"    Abstract: {case['abstract'][:100]}...")
                print()
        
        print(f"\nRecommendations for System Improvement:")
        print("-" * 60)
        for i, rec in enumerate(report['recommendations'], 1):
            print(f"{i}. {rec}")
        
        print("\n" + "="*80)

def main():
    """Main function."""
    import numpy as np
    globals()['np'] = np  # Make numpy available for entropy calculation
    
    analyzer = NewCategoryAnalyzer()
    
    if not analyzer.load_data('assets/data/publications_data.json'):
        return 1
    
    # Generate and print analysis
    report = analyzer.generate_analysis_report()
    analyzer.print_analysis_report(report)
    
    return 0

if __name__ == "__main__":
    exit(main())