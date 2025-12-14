/**
 * Publication categorization and display utilities
 * Consolidates publication-related logic used across the codebase
 */

import { CONFIG } from './config.js';

// Keywords mapping for fallback categorization
const KEYWORDS_MAPPING = {
    // Statistical Learning & AI
    "machine learning": "Statistical Learning & AI",
    "artificial intelligence": "Statistical Learning & AI",
    "neural networks": "Statistical Learning & AI",
    "deep learning": "Statistical Learning & AI",
    "pattern recognition": "Statistical Learning & AI",
    // Interpretability & Insight
    "interpretability": "Interpretability & Insight",
    "explainable ai": "Interpretability & Insight",
    "model interpretation": "Interpretability & Insight",
    "feature importance": "Interpretability & Insight",
    // Inference & Computation
    "bayesian inference": "Inference & Computation",
    "nested sampling": "Inference & Computation",
    "mcmc": "Inference & Computation",
    "monte carlo": "Inference & Computation",
    "statistical inference": "Inference & Computation",
    "computational statistics": "Inference & Computation",
    "parameter estimation": "Inference & Computation",
    // Discovery & Understanding
    "galaxy formation": "Discovery & Understanding",
    "galaxy evolution": "Discovery & Understanding",
    "stellar populations": "Discovery & Understanding",
    "astronomical surveys": "Discovery & Understanding",
    "cosmology": "Discovery & Understanding",
    "dark matter": "Discovery & Understanding",
    "star formation": "Discovery & Understanding"
};

const DEFAULT_CATEGORY = "Discovery & Understanding";

const SHORT_LABELS = {
    'Statistical Learning & AI': 'ML & AI',
    'Interpretability & Insight': 'Interpretability',
    'Inference & Computation': 'Inference',
    'Discovery & Understanding': 'Discovery'
};

/**
 * Determine the primary research category for a publication
 * @param {Object} pub - Publication object
 * @returns {string} Category name
 */
export function getPublicationCategory(pub) {
    // First check if we have probabilistic categorization data
    if (pub.categoryProbabilities && typeof pub.categoryProbabilities === 'object') {
        return pub.researchArea || DEFAULT_CATEGORY;
    }

    // Fallback to keyword-based system
    const searchText = `${pub.title || ''} ${pub.abstract || ''}`.toLowerCase();

    for (const [keyword, category] of Object.entries(KEYWORDS_MAPPING)) {
        if (searchText.includes(keyword.toLowerCase())) {
            return category;
        }
    }

    return DEFAULT_CATEGORY;
}

/**
 * Get all significant categories for a publication (for multi-category badges)
 * @param {Object} pub - Publication object
 * @param {number} threshold - Probability threshold for inclusion
 * @returns {Array<{category: string, probability: number}>} Array of categories
 */
export function getPublicationCategories(pub, threshold = CONFIG.categoryThreshold) {
    if (pub.categoryProbabilities && typeof pub.categoryProbabilities === 'object') {
        const categories = Object.entries(pub.categoryProbabilities)
            .filter(([, prob]) => prob >= threshold)
            .sort(([, a], [, b]) => b - a)
            .map(([category, prob]) => ({ category, probability: prob }));

        // Always include at least the primary category
        if (categories.length === 0 && pub.researchArea) {
            categories.push({
                category: pub.researchArea,
                probability: pub.categoryProbabilities[pub.researchArea] || 1.0
            });
        }

        return categories;
    }

    // Fallback: single category
    return [{ category: getPublicationCategory(pub), probability: 1.0 }];
}

/**
 * Get category badge color scheme based on current theme
 * @param {string} category - Category name
 * @returns {{bg: string, bgLight: string, text: string}} Color scheme
 */
export function getCategoryColors(category) {
    const isDarkTheme = document.body.classList.contains('dark-theme') ||
        document.documentElement.getAttribute('data-theme') !== 'light';

    const colorSchemes = {
        'Statistical Learning & AI': {
            bg: isDarkTheme ? '#E74C3C' : '#C0392B',
            bgLight: '#F1948A',
            text: '#ffffff'
        },
        'Interpretability & Insight': {
            bg: isDarkTheme ? '#16A085' : '#138D75',
            bgLight: '#52C4A0',
            text: '#ffffff'
        },
        'Inference & Computation': {
            bg: isDarkTheme ? '#3498DB' : '#2E86AB',
            bgLight: '#85C1E9',
            text: '#ffffff'
        },
        'Discovery & Understanding': {
            bg: isDarkTheme ? '#27AE60' : '#1E8449',
            bgLight: '#82E0AA',
            text: '#ffffff'
        }
    };

    return colorSchemes[category] || colorSchemes[DEFAULT_CATEGORY];
}

/**
 * Get short label for a category
 * @param {string} category - Full category name
 * @returns {string} Short label
 */
export function getShortLabel(category) {
    return SHORT_LABELS[category] || category;
}

/**
 * Check if a publication is student-led
 * @param {Object} pub - Publication object
 * @returns {boolean} True if student-led
 */
export function isStudentLed(pub) {
    if (pub.authorshipCategory) {
        return pub.authorshipCategory === 'student';
    }
    return false;
}

/**
 * Check if a publication is postdoc-led
 * @param {Object} pub - Publication object
 * @returns {boolean} True if postdoc-led
 */
export function isPostdocLed(pub) {
    if (pub.authorshipCategory) {
        return pub.authorshipCategory === 'postdoc';
    }
    return false;
}

/**
 * Get authorship type for a publication
 * @param {Object} pub - Publication object
 * @returns {string|null} Authorship type ('student', 'postdoc', or null)
 */
export function getAuthorshipType(pub) {
    return pub.authorshipCategory || null;
}

/**
 * Create a single category badge HTML
 * @param {string} category - Category name
 * @param {number|null} probability - Optional probability value
 * @param {boolean} showProbability - Whether to show probability in tooltip
 * @returns {string} HTML string
 */
export function createSingleCategoryBadge(category, probability = null, showProbability = false) {
    const colors = getCategoryColors(category);
    const shortLabel = getShortLabel(category);
    const probabilityText = (showProbability && probability !== null) ? ` (${Math.round(probability * 100)}%)` : '';
    const title = `${category}${probabilityText}`;

    return `
        <span class="category-badge"
              style="background-color: ${colors.bg}; color: ${colors.text};"
              title="${title}">
            ${shortLabel}
        </span>
    `;
}

/**
 * Create category badges HTML for multiple categories
 * @param {Object} pub - Publication object
 * @param {boolean} showProbabilities - Whether to show probabilities
 * @returns {string} HTML string
 */
export function createCategoryBadges(pub, showProbabilities = false) {
    const categories = getPublicationCategories(pub);

    return categories.map(({ category, probability }) =>
        createSingleCategoryBadge(category, probability, showProbabilities)
    ).join('');
}

// Export default category for external use
export { DEFAULT_CATEGORY };
