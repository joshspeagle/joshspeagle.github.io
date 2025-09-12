#!/usr/bin/env python3
"""
Enhanced Methodological Keywords System

Based on detailed analysis of key papers, create a heavily weighted methodological
keyword system that properly identifies methods papers even when applied to astronomy.

Key insights:
1. Methodological terms need MUCH higher weights than astronomical terms
2. Missing many key ML/AI terms (VAE, normalizing flows, data-driven, etc.)
3. Missing interpretability terms (gap, systematics, labels, bias)
4. Missing inference terms (zero-inflated, count models, model selection)
"""

ENHANCED_METHODOLOGICAL_KEYWORDS = {
    'Statistical Learning & AI': {
        # Deep Learning & Neural Networks (HIGH PRIORITY)
        'neural network': 15.0,
        'neural networks': 15.0,
        'deep learning': 15.0,
        'machine learning': 15.0,
        'artificial intelligence': 12.0,
        'convolutional': 12.0,
        'recurrent': 12.0,
        'transformer': 12.0,
        'attention': 10.0,
        
        # Generative Models (HIGH PRIORITY)
        'variational autoencoder': 15.0,
        'variational auto-encoder': 15.0,
        'autoencoder': 12.0,
        'auto-encoder': 12.0,
        'encoder': 8.0,
        'decoder': 8.0,
        'variational': 10.0,
        'generative model': 12.0,
        'generative models': 12.0,
        'generative': 8.0,
        
        # Flow-based Models (HIGH PRIORITY)
        'normalizing flows': 15.0,
        'normalizing flow': 15.0,
        'conditional flows': 12.0,
        'invertible': 10.0,
        'bijective': 10.0,
        
        # Core ML Concepts (HIGH PRIORITY)
        'data-driven': 12.0,
        'data driven': 12.0,
        'unsupervised': 10.0,
        'supervised': 8.0,
        'semi-supervised': 8.0,
        'representation learning': 10.0,
        'latent space': 10.0,
        'latent': 6.0,
        'embedding': 8.0,
        'feature learning': 8.0,
        'feature extraction': 6.0,
        'dimensionality reduction': 8.0,
        'spectral': 6.0,  # For spectral learning/data
        'spectra': 4.0,   # When used in ML context
        
        # Training & Optimization
        'training': 4.0,
        'optimization': 4.0,
        'gradient': 4.0,
        'backpropagation': 6.0,
        'hyperparameter': 4.0,
        'cross-validation': 4.0,
        
        # Classic ML Methods
        'random forest': 6.0,
        'support vector': 6.0,
        'gaussian process': 6.0,
        'kernel': 4.0,
        'clustering': 6.0,
        'classification': 6.0,
        'regression': 5.0,
        'ensemble': 6.0,
        
        # Model Types & Architectures
        'probabilistic model': 6.0,
        'statistical model': 5.0,
        'nonparametric': 5.0,
        'parametric': 3.0,
        'flexible model': 5.0,
        
        # Performance & Evaluation
        'prediction': 3.0,
        'predictive': 3.0,
        'reconstruction': 5.0,
        'accuracy': 3.0,
        'performance': 3.0,
        'validation': 3.0,
        
        # Data Processing
        'preprocessing': 4.0,
        'normalization': 4.0,
        'standardization': 4.0,
        'augmentation': 4.0
    },
    
    'Interpretability & Insight': {
        # Core Interpretability (VERY HIGH PRIORITY)
        'interpretability': 15.0,
        'interpretable': 15.0,
        'explainable': 15.0,
        'explainability': 15.0,
        'explanation': 10.0,
        'trustworthy': 12.0,
        'transparency': 10.0,
        'black box': 8.0,
        'white box': 8.0,
        
        # Feature Analysis & Attribution
        'feature importance': 12.0,
        'attribution': 10.0,
        'feature attribution': 12.0,
        'saliency': 8.0,
        'attention map': 8.0,
        'gradient-based': 6.0,
        'integrated gradients': 8.0,
        'shapley': 8.0,
        'shap': 8.0,
        'lime': 8.0,
        
        # Model Understanding & Analysis
        'understanding': 6.0,
        'insight': 8.0,
        'insights': 8.0,
        'interpretation': 8.0,
        'analysis': 4.0,
        'visualization': 6.0,
        'visualisation': 6.0,
        'conflicting': 6.0,  # For Savelli paper (conflicting role)
        'role': 3.0,         # When discussing role/impact of parameters
        'constraining': 5.0,  # Constraining evolution/models
        
        # Bias & Fairness Issues (HIGH PRIORITY for papers like Laroche)
        'bias': 10.0,
        'systematic': 8.0,  # As in "systematic errors"
        'systematics': 10.0,
        'gap': 8.0,  # As in "labels gap"
        'label': 6.0,  # In context of label systematics
        'labels': 6.0,
        'independent': 5.0,  # "label independent"
        'dependent': 4.0,
        'dependence': 4.0,
        'fairness': 8.0,
        'discrimination': 6.0,
        'equity': 6.0,
        
        # Uncertainty & Reliability
        'uncertainty quantification': 12.0,
        'uncertainty': 8.0,
        'confidence': 5.0,
        'reliability': 8.0,
        'robustness': 8.0,
        'robust': 6.0,
        'stable': 4.0,
        'stability': 5.0,
        'sensitive': 4.0,
        'sensitivity': 5.0,
        
        # Validation & Testing
        'validation': 5.0,
        'verification': 5.0,
        'testing': 4.0,
        'evaluation': 4.0,
        'assessment': 4.0,
        'diagnostic': 5.0,
        'diagnostics': 5.0,
        'calibration': 6.0,
        'calibrated': 5.0,
        
        # Adversarial & Counterfactual
        'adversarial': 6.0,
        'counterfactual': 8.0,
        'perturbation': 6.0,
        'occlusion': 6.0,
        
        # Model Behavior
        'behavior': 5.0,
        'behaviour': 5.0,
        'decision': 4.0,
        'reasoning': 6.0,
        'rationale': 6.0
    },
    
    'Inference & Computation': {
        # Bayesian Methods (VERY HIGH PRIORITY)
        'bayesian': 15.0,
        'bayesian inference': 18.0,
        'bayesian statistics': 15.0,
        'bayesian analysis': 12.0,
        'bayesian framework': 10.0,
        'bayesian approach': 10.0,
        'bayesian model': 10.0,
        
        # Core Statistical Inference
        'inference': 12.0,
        'statistical inference': 15.0,
        'statistical framework': 12.0,  # For Brutus paper
        'statistical analysis': 8.0,
        'likelihood': 10.0,
        'likelihood-free': 12.0,
        'posterior': 10.0,
        'prior': 10.0,
        'priors': 10.0,  # For Brutus paper
        'posterior distribution': 8.0,
        'prior distribution': 8.0,
        'marginal likelihood': 8.0,
        'evidence': 6.0,
        
        # MCMC & Sampling Methods (HIGH PRIORITY)
        'markov chain monte carlo': 15.0,
        'markov chain': 12.0,
        'mcmc': 15.0,
        'monte carlo': 12.0,
        'sampling': 8.0,
        'nested sampling': 12.0,
        'importance sampling': 10.0,
        'rejection sampling': 8.0,
        'hamiltonian': 10.0,
        'metropolis': 8.0,
        'gibbs': 8.0,
        'slice sampling': 8.0,
        
        # Variational Methods
        'variational inference': 12.0,
        'variational bayes': 12.0,
        'variational approximation': 8.0,
        'mean field': 6.0,
        
        # Model Selection & Comparison (HIGH PRIORITY for Berek paper)
        'model selection': 12.0,
        'model comparison': 12.0,
        'model averaging': 8.0,
        'information criterion': 8.0,
        'cross-validation': 6.0,
        'aic': 6.0,
        'bic': 6.0,
        'dic': 6.0,
        'waic': 8.0,
        'loo': 6.0,
        'leave-one-out': 6.0,
        
        # Specialized Models (HIGH PRIORITY for Berek)
        'zero-inflated': 15.0,
        'zero inflated': 15.0,
        'hurdle model': 12.0,
        'hurdle': 8.0,
        'count model': 10.0,
        'count data': 8.0,
        'overdispersion': 8.0,
        'negative binomial': 10.0,
        'poisson': 8.0,
        'binomial': 6.0,
        'multinomial': 6.0,
        
        # Hierarchical & Multilevel Models
        'hierarchical': 10.0,
        'hierarchical model': 12.0,
        'multilevel': 8.0,
        'mixed effects': 8.0,
        'random effects': 6.0,
        'fixed effects': 4.0,
        
        # Parameter Estimation & Calibration
        'parameter estimation': 8.0,
        'estimation': 6.0,
        'estimator': 6.0,
        'maximum likelihood': 8.0,
        'maximum a posteriori': 8.0,
        'method of moments': 6.0,
        'calibrate': 8.0,  # For Brutus paper
        'calibration': 8.0,
        'calibrated': 6.0,
        'grid': 6.0,  # Model grids for inference
        'grids': 6.0,
        
        # Uncertainty & Intervals
        'credible interval': 8.0,
        'confidence interval': 6.0,
        'prediction interval': 6.0,
        'uncertainty quantification': 8.0,  # Also in interpretability
        
        # Hypothesis Testing
        'hypothesis testing': 8.0,
        'significance': 4.0,
        'p-value': 4.0,
        'statistical test': 6.0,
        
        # Computational Methods
        'computational statistics': 10.0,
        'numerical methods': 6.0,
        'simulation': 6.0,
        'bootstrap': 6.0,
        'resampling': 6.0,
        'permutation': 4.0,
        
        # Distributions & Probability
        'probability': 5.0,
        'probabilistic': 6.0,
        'stochastic': 6.0,
        'distribution': 4.0,
        'gaussian': 4.0,
        'normal': 3.0,
        'uniform': 3.0,
        'beta': 4.0,
        'gamma': 4.0,
        'dirichlet': 6.0,
        
        # Model Diagnostics & Validation
        'diagnostic': 5.0,
        'convergence': 5.0,
        'trace': 4.0,
        'effective sample size': 5.0,
        'autocorrelation': 4.0,
        'chain': 4.0,
        
        # Approximate Methods
        'approximate': 5.0,
        'approximation': 5.0,
        'asymptotic': 4.0,
        'large sample': 4.0,
        
        # Frequentist Methods
        'frequentist': 6.0,
        'classical': 3.0,
        'traditional': 2.0
    },
    
    'Discovery & Understanding': {
        # Astronomical Objects (REDUCED WEIGHTS)
        'galaxy': 4.0,  # Reduced from 2.5
        'galaxies': 4.0,
        'stellar': 3.0,  # Reduced from 2.0
        'star': 3.0,
        'stars': 3.0,
        'supernova': 4.0,
        'supernovae': 4.0,
        'quasar': 4.0,
        'black hole': 4.0,
        'neutron star': 4.0,
        'white dwarf': 4.0,
        'exoplanet': 4.0,
        
        # Galactic & Extragalactic
        'milky way': 4.0,
        'andromeda': 4.0,
        'local group': 4.0,
        'cluster': 3.0,  # Very common, reduced weight
        'globular cluster': 4.0,
        'open cluster': 4.0,
        'galaxy cluster': 4.0,
        
        # Cosmology & Large Scale Structure
        'dark matter': 5.0,
        'dark energy': 5.0,
        'cosmology': 5.0,
        'cosmological': 4.0,
        'universe': 4.0,
        'cosmic': 4.0,
        'redshift': 4.0,
        
        # Observational Properties (REDUCED)
        'luminosity': 2.0,
        'magnitude': 2.0,
        'photometry': 2.0,
        'spectroscopy': 2.0,
        'spectrum': 2.0,  # Often in methods papers
        'spectra': 2.0,   # Often in methods papers
        'emission': 2.0,
        'absorption': 2.0,
        
        # Physical Properties
        'metallicity': 3.0,
        'abundance': 3.0,
        'chemical': 3.0,
        'kinematic': 3.0,
        'proper motion': 3.0,
        'radial velocity': 3.0,
        'distance': 3.0,
        'parallax': 3.0,
        
        # Processes & Evolution
        'formation': 4.0,
        'evolution': 4.0,
        'population': 2.0,  # Often in methods contexts
        'populations': 2.0,
        'structure': 2.0,   # Very general
        'morphology': 3.0,
        
        # Surveys & Catalogs
        'catalog': 3.0,
        'catalogue': 3.0,
        'survey': 3.0,  # Often methodological
        'observation': 2.0,
        'observational': 2.0,
        
        # Instruments & Missions
        'telescope': 3.0,
        'instrument': 2.0,
        'gaia': 3.0,
        'hubble': 3.0,
        'jwst': 3.0,
        'kepler': 3.0,
        'sloan': 3.0,
        'sdss': 3.0,
        'desi': 3.0,
        
        # Discovery Language
        'discovery': 5.0,
        'detection': 4.0,
        'identification': 3.0,
        'characterization': 3.0,
        'measurement': 2.0,  # Often methodological
        'constraint': 2.0,   # Often methodological
        'determination': 2.0 # Often methodological
    }
}

# Field-specific weight multipliers
FIELD_WEIGHTS = {
    'title': 3.0,
    'abstract': 1.0,
    'keywords': 2.0
}

def test_enhanced_keywords():
    """Test the enhanced keyword system on actual papers from the dataset."""
    import json
    import re
    from collections import defaultdict
    
    # Load actual papers
    with open('assets/data/publications_data.json', 'r') as f:
        data = json.load(f)
    
    publications = data.get('publications', [])
    
    # Take first 20 papers for broader testing
    test_papers = publications[:20]
    
    def clean_text(text):
        text = re.sub(r'[^\w\s-]', ' ', text.lower())
        return re.sub(r'\s+', ' ', text.strip())
    
    def count_matches(keyword, text):
        pattern = r'\b' + re.escape(keyword) + r'\b'
        return len(re.findall(pattern, text, re.IGNORECASE))
    
    print("="*80)
    print("ENHANCED KEYWORD SYSTEM TEST - 20 PAPERS")
    print("="*80)
    
    for i, pub in enumerate(test_papers):
        print(f"\\n{i+1}. {pub.get('title', 'No title')[:70]}...")
        print(f"   Current Category: {pub.get('researchArea', 'Unknown')}")
        
        # Combine text from title, abstract, and keywords with field weights
        title = pub.get('title', '')
        abstract = pub.get('abstract', '')[:800]  # Limit abstract length
        keywords = ' '.join(pub.get('keywords', []))
        
        # Apply field weights during text combination
        weighted_text = (
            (title + ' ') * int(FIELD_WEIGHTS['title']) +
            (abstract + ' ') * int(FIELD_WEIGHTS['abstract']) + 
            (keywords + ' ') * int(FIELD_WEIGHTS['keywords'])
        )
        
        text_clean = clean_text(weighted_text)
        category_scores = defaultdict(float)
        matched_terms = defaultdict(list)
        
        for category, cat_keywords in ENHANCED_METHODOLOGICAL_KEYWORDS.items():
            for keyword, weight in cat_keywords.items():
                matches = count_matches(keyword, text_clean)
                if matches > 0:
                    category_scores[category] += matches * weight
                    matched_terms[category].append(f"{keyword}({matches})")
                    
        # Normalize to probabilities
        total = sum(category_scores.values())
        if total > 0:
            probs = {cat: score/total for cat, score in category_scores.items()}
        else:
            probs = {cat: 0.25 for cat in ENHANCED_METHODOLOGICAL_KEYWORDS.keys()}
            
        print("   Enhanced Scores:")
        for cat, prob in sorted(probs.items(), key=lambda x: x[1], reverse=True):
            if prob > 0.05:  # Only show categories with >5% probability
                terms_sample = matched_terms[cat][:3]  # Show top 3 matching terms
                print(f"     {cat:25}: {prob:.3f} {terms_sample}")
        
        print("-"*80)

if __name__ == "__main__":
    test_enhanced_keywords()