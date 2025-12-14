# Paper Categorization Agent Instructions

## Overview

You are an agent tasked with categorizing a single academic research paper into four research categories. You will read the FULL PAPER (not just the abstract) to make an accurate assessment.

**IMPORTANT**: These instructions are for an autonomous agent. Do NOT run these instructions yourself - spawn an agent to execute them.

---

## Step 1: Obtain and Read the Full Paper

You will be given paper metadata including title, abstract, and identifiers (arXiv ID, ADS bibcode, DOI).

### Access Methods (in order of preference)

1. **arXiv HTML (preferred)** - Most reliable method:
   - URL: `https://arxiv.org/html/{arxiv_id}`
   - Use WebFetch to read the full HTML content
   - This works even when PDF downloads are blocked

2. **arXiv Abstract Page** - Good for extracting arXiv ID:
   - URL: `https://arxiv.org/abs/{arxiv_id}`
   - If you only have a bibcode, search for: `{bibcode} arxiv`

3. **Web Search** - If arXiv ID is unknown:
   - Search: `"{paper title}" arxiv`
   - Or: `{bibcode} site:arxiv.org`

4. **Fallback to abstract-only**:
   - If you cannot access the full paper after reasonable attempts
   - Note this in output: `"full_paper_analyzed": false`

### Finding arXiv IDs from Bibcodes

ADS bibcodes like `2025ApJ...986...59V` don't directly give arXiv IDs. To find them:
- Search: `2025ApJ...986...59V arxiv`
- Or check the ADS page: `https://ui.adsabs.harvard.edu/abs/{bibcode}`

---

## Step 2: Analyze the Paper

Read the full paper, focusing on:
- **Introduction**: What problem is being solved? What is the stated contribution?
- **Methods**: Is this developing NEW methods or applying existing ones?
- **Results**: What are the main findings?
- **Conclusions**: How do the authors frame their contribution?

---

## Step 3: Categorize Using the Rubric

### The Four Categories

#### 1. Statistical Learning & AI (ML/AI)
**Definition**: "Developing novel methods to discover underlying patterns from large, messy datasets."

Papers where **machine learning or AI methods are central**:
- Developing new neural network architectures, training approaches, or ML algorithms
- Applying ML/neural networks to new problem domains (where the ML application is the contribution)
- **Studying, analyzing, or optimizing ML methods** (the method itself is the subject of study)
- VAEs, normalizing flows, transformers, deep learning, generative models
- Data-driven pattern discovery using learned representations (SOMs, clustering, dimensionality reduction)

**Key signals**: "neural network", "deep learning", "VAE", "normalizing flow", "data-driven", "unsupervised learning", "generative model", "random forest", "classification", "clustering", "self-organizing map", "emulator"

**Scoring guidance for ML/AI**:
- **High (50%+)**: Developing new ML methods, OR the paper's primary SUBJECT is an ML technique (studying/analyzing/optimizing how an ML method works)
- **Moderate (20-40%)**: Applying ML as central, indispensable methodology (the paper fundamentally depends on ML - removing the ML component would eliminate the paper's core contribution)
- **Low (10-15%)**: ML is one of several important tools in the methodology
- **Minimal (<10%)**: ML mentioned but peripheral or used only for preprocessing

#### 2. Interpretability & Insight (Interp)
**Definition**: "Building rigorous understanding of how statistical methods work in theory and practice to extract scientific insights."

Papers focused on **understanding and explaining**:
- Understanding WHY and HOW methods work or fail
- Investigating systematic errors, biases, selection effects
- Bridging gaps between models and reality (e.g., "labels gap", calibration issues)
- Explaining what models have learned, diagnostic analysis
- Theoretical analysis of method behavior

**Key signals**: "systematic", "bias", "gap", "calibration", "label systematics", "understanding", "diagnostics", "interpretable", "explainable"

#### 3. Inference & Computation (Inference)
**Definition**: "Establishing robust frameworks and designing tractable algorithms to efficiently quantify how much we can learn from data."

Papers where **the statistical/probabilistic framework itself is the contribution**:
- New sampling algorithms (MCMC variants, nested sampling, etc.)
- New Bayesian inference frameworks or pipelines
- Parameter estimation methodology
- Likelihood-free inference METHODOLOGY (developing new techniques)

**Key signals**: "we present [software/package] for inference", "nested sampling", "MCMC", "Bayesian framework", "posterior estimation", "sampling algorithm"

**Critical distinction**: Papers that USE inference methods to do science belong in Discovery, not here. This category is for papers DEVELOPING inference methodology.

#### 4. Discovery & Understanding (Discovery)
**Definition**: "Applying methods to astronomical surveys to uncover new insights about the universe."

Papers where **the scientific finding is the contribution**:
- New measurements, constraints, or catalogs
- Physical insights about astronomical objects
- Galaxy evolution, cosmology, stellar population findings
- Survey results and data products

**Key signals**: "we measure", "we constrain", "we find", "evolution of", "properties of", catalog/map releases

---

## Critical Scoring Rules

### Rule 1: The Citation Test
Ask yourself: **"What would this paper primarily be CITED for?"**
- Cited for a METHOD or ALGORITHM → ML/AI or Inference
- Cited for UNDERSTANDING how something works → Interpretability
- Cited for a SCIENTIFIC RESULT → Discovery

### Rule 2: Distinguishing ML/AI vs Inference
Both involve "methods" but are fundamentally different:

| ML/AI | Inference |
|-------|-----------|
| Neural networks, deep learning | Bayesian frameworks, sampling |
| Data-driven, learns patterns | Probabilistic, quantifies uncertainty |
| "Learning from data" | "Quantifying what we learn" |

**Special case - Simulation-Based Inference (SBI)**:
SBI uses neural networks to perform inference, so it straddles both categories. Neural networks are not just implementation details in SBI—they ARE the inference engine.
- **Developing new SBI techniques**: Weight toward BOTH Inference (for the statistical framework) AND ML/AI (for the neural network methodology). A paper developing new SBI methods should typically have 30-50% in each of these categories.
- **Applying existing SBI to a scientific problem**: Weight toward ML/AI (neural networks are core) + Discovery (for the science). Modest Inference weight since using, not developing, the framework.

### Rule 3: Interpretability Triggers
Papers with significant focus on these themes deserve 25%+ Interpretability:
- "Closing the gap" between models and data
- Label systematics or selection effects
- Understanding what models learn
- Systematic biases in measurements
- Why methods succeed or fail in certain regimes

### Rule 4: Developing vs Applying Methods
- **Developing a method** + demonstrating on data → weight toward the method category (ML/AI or Inference)
- **Applying existing methods** to make discoveries → weight toward Discovery

**Important nuance**: Even when applying existing methods (not developing new ones), if a method is **central to the analysis pipeline**, it deserves moderate weight in its category. Ask: "Could this paper exist without this method?" If removing the method would fundamentally change the paper, it's central. If it's just one tool among many or a preprocessing step, it's peripheral.

### Rule 5: The Subject Matter Test
Ask: **"What is this paper fundamentally ABOUT?"**

If the paper's primary subject IS an ML/AI technique—even if not developing new algorithms—it belongs primarily in ML/AI:
- Paper studying how neural network emulators behave → ML/AI primary (50%+)
- Paper analyzing what a classifier has learned → ML/AI + Interpretability
- Paper optimizing training procedures for existing architectures → ML/AI primary
- Paper benchmarking different ML approaches → ML/AI primary

This differs from papers that merely USE ML to answer a scientific question. The test: Does the title/abstract focus on the ML method itself, or on the scientific application?

---

## Probability Guidelines

- Probabilities must sum to 1.0
- A focused paper can have 80-95% in one category
- Most papers span 2-3 categories with >10% each
- Only assign <5% if a category is essentially absent

---

## Step 4: Update the Publications Data File

After categorizing, you must **directly update** the `assets/data/publications_data.json` file.

### 4.1 Prepare Your Categorization Output

Create a JSON object with this structure:

```json
{
  "categorization": {
    "Statistical Learning & AI": 0.XX,
    "Interpretability & Insight": 0.XX,
    "Inference & Computation": 0.XX,
    "Discovery & Understanding": 0.XX
  },
  "reasoning": "2-3 sentences explaining your categorization, focusing on what the paper's PRIMARY contribution is and what it would be cited for.",
  "full_paper_analyzed": true,
  "source": "arxiv_html",
  "arxiv_id": "XXXX.XXXXX",
  "model": "<your model name>",
  "timestamp": "YYYY-MM-DDTHH:MM:SSZ"
}
```

For the `source` field, use one of:
- `"arxiv_html"` - Read via arXiv HTML version
- `"arxiv_pdf"` - Downloaded and read PDF
- `"journal"` - Accessed via journal website
- `"abstract_only"` - Could not access full paper

If you could not analyze the full paper, add:
```json
"fallback_reason": "Brief explanation of why full paper could not be accessed"
```

### 4.2 Update the Publications JSON File

1. **Read** `assets/data/publications_data.json`
2. **Find** the paper entry by matching the `bibcode` field
3. **Update** the paper entry with these fields:
   - `categoryProbabilities`: Copy from your `categorization` object
   - `researchArea`: Set to the category name with highest probability
   - `llm_categorization`: Store your complete output object
4. **Write** the updated JSON back to the file

**Example of updated paper entry:**
```json
{
  "title": "Example Paper Title",
  "bibcode": "2024MNRAS.531.2582M",
  "categoryProbabilities": {
    "Statistical Learning & AI": 0.10,
    "Interpretability & Insight": 0.35,
    "Inference & Computation": 0.05,
    "Discovery & Understanding": 0.50
  },
  "researchArea": "Discovery & Understanding",
  "llm_categorization": {
    "categorization": { ... },
    "reasoning": "...",
    "full_paper_analyzed": true,
    "source": "arxiv_html",
    "arxiv_id": "2309.13109",
    "model": "claude-sonnet-4-5-20250929",
    "timestamp": "2025-12-14T12:00:00Z"
  },
  ... other existing fields ...
}
```

---

## Example Agent Invocation

When spawning this agent, provide:

```
Categorize this paper and UPDATE publications_data.json directly:

Title: {title}
ADS Bibcode: {bibcode}

Follow the instructions in scripts/llm_categorization_rubric.md to:
1. Access and read the full paper (prefer arXiv HTML)
2. Categorize the paper using the rubric
3. Update the paper entry in assets/data/publications_data.json
4. Confirm the update was successful
```
