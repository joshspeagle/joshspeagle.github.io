/**
 * Publications page content - Dynamic publication data, category badges, batch loading
 */

import { getPublicationIcon, announceToScreenReader } from './shared.js';

// Module-level variables for batch loading
let allPublicationsData = [];
let isLoadingMore = false;

function formatDataSources(sources) {
    const sourceMapping = {
        'google_scholar': 'Google Scholar',
        'ads': 'ADS',
        'openalex': 'OpenAlex'
    };

    return sources.map(source => sourceMapping[source] || source).join(' & ');
}

export async function loadPublicationsContent(publicationsSection, staticData) {
    try {
        // Show loading state
        publicationsSection.innerHTML = '<div class="loading-indicator">Loading publication data...</div>';

        // Try to fetch dynamic publication data and mentorship data in parallel
        const [publicationsResponse, mentorshipResponse] = await Promise.all([
            fetch('assets/data/publications_data.json'),
            fetch('assets/data/content.json')
        ]);

        if (publicationsResponse.ok) {
            const dynamicData = await publicationsResponse.json();

            // Get mentorship data for student categorization
            let mentorshipData = {};
            if (mentorshipResponse.ok) {
                const contentData = await mentorshipResponse.json();
                mentorshipData = contentData.mentorship || {};
            }

            // Create enhanced content with dynamic data
            publicationsSection.innerHTML = createDynamicPublicationsContent(dynamicData, staticData);

            // Initialize statistics dashboard
            if (window.PublicationsStats && dynamicData.publications) {
                // Wait for Chart.js to be fully loaded
                const initializeStats = () => {
                    try {
                        const stats = new PublicationsStats(dynamicData, mentorshipData);
                        stats.renderDashboard('publications-statistics');

                        // Store instance for potential cleanup/theme updates
                        window.currentPublicationsStats = stats;
                    } catch (error) {
                        // Statistics initialization failed - page continues to work without charts
                    }
                };

                // Store publications data globally for batch loading
                // Include ALL publications (not just 2020+) and exclude only featured ones
                allPublicationsData = dynamicData.publications
                    .filter(pub => pub.year && !pub.featured)
                    .sort((a, b) => {
                        if (b.year !== a.year) return b.year - a.year;
                        return a.title.localeCompare(b.title);
                    });

                // Check if Chart.js is loaded, if not wait a bit
                if (window.Chart && Chart.defaults) {
                    requestAnimationFrame(initializeStats);
                } else {
                    setTimeout(() => {
                        if (window.Chart && Chart.defaults) {
                            requestAnimationFrame(initializeStats);
                        }
                    }, 500);
                }

                // Announce initial publications loaded to screen readers
                requestAnimationFrame(() => {
                    const initialCount = Math.min(20, dynamicData.publications.length);
                    const totalCount = dynamicData.publications.length;
                    announceToScreenReader(`Publications page loaded. Showing ${initialCount} of ${totalCount} publications.`);
                });
            }
        } else {
            // Fall back to static data
            publicationsSection.innerHTML = createPublicationsContent(staticData);
        }
    } catch (error) {
        // Fall back to static data on error
        publicationsSection.innerHTML = createPublicationsContent(staticData);
    }
}

function createDynamicPublicationsContent(dynamicData, staticData) {
    const metrics = dynamicData.metrics || {};
    const lastUpdated = dynamicData.lastUpdated ?
        new Date(dynamicData.lastUpdated).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : 'Unknown';

    return `
        <section class="highlight-box" role="region" aria-labelledby="research-areas-heading">
            <h3 id="research-areas-heading">${staticData.categories.title}</h3>
            <div class="content-grid" role="list" aria-label="Research areas">
                ${staticData.categories.areas.map((area, index) => `
                    <div role="listitem" aria-describedby="area-${index}-desc">
                        <h4>${area.icon} ${area.title}</h4>
                        <p id="area-${index}-desc">${area.description}</p>
                    </div>
                `).join('')}
            </div>
        </section>

        <section class="page-intro" role="region" aria-labelledby="overview-heading">
            <h2 id="overview-heading" class="sr-only">Publications Overview</h2>
            <div class="content-grid">
                <section role="region" aria-labelledby="metrics-heading">
                    <h3 id="metrics-heading">Research Metrics</h3>
                    <div class="metrics-grid" role="list" aria-label="Publication metrics">
                        <div class="metric" role="listitem">
                            <strong aria-describedby="publications-desc">${metrics.totalPapers || staticData.metrics.totalPapers}</strong>
                            <span id="publications-desc">Publications</span>
                        </div>
                        <div class="metric" role="listitem">
                            <strong aria-describedby="citations-desc">${metrics.totalCitations || staticData.metrics.citations}</strong>
                            <span id="citations-desc">Citations</span>
                        </div>
                        <div class="metric" role="listitem">
                            <strong aria-describedby="hindex-desc">${metrics.hIndex || staticData.metrics.hIndex}</strong>
                            <span id="hindex-desc">h-index</span>
                        </div>
                        <div class="metric" role="listitem">
                            <strong aria-describedby="gindex-desc">${metrics.adsMetricsCurrent?.g || 'N/A'}</strong>
                            <span id="gindex-desc">g-index</span>
                        </div>
                    </div>
                    <p><em>Last updated: <time datetime="${dynamicData.lastUpdated || ''}">${lastUpdated}</time></em></p>
                    ${metrics.sources ? `<p><small>Data sources: ${formatDataSources(metrics.sources)}</small></p>` : ''}
                </section>

                <nav role="navigation" aria-labelledby="pub-links-heading">
                    <h3 id="pub-links-heading">Publication Links</h3>
                    <div class="publication-links" role="list">
                        <a href="${staticData.links.ads}" class="pub-link pub-link-horizontal" role="listitem" aria-label="View publications on ADS">
                            <div class="link-icon">${getPublicationIcon('ads')}</div>
                            <span>Astrophysics Data System</span>
                        </a>
                        <a href="${staticData.links.scholar}" class="pub-link pub-link-horizontal" role="listitem" aria-label="View publications on Google Scholar">
                            <div class="link-icon">${getPublicationIcon('scholar')}</div>
                            <span>Google Scholar</span>
                        </a>
                        <a href="${staticData.links.orcid}" class="pub-link pub-link-horizontal" role="listitem" aria-label="View ORCID profile">
                            <div class="link-icon">${getPublicationIcon('orcid')}</div>
                            <span>ORCID Profile</span>
                        </a>
                    </div>
                </nav>
            </div>
        </section>

        <section id="publications-statistics" role="region" aria-labelledby="stats-heading">
            <h2 id="stats-heading" class="sr-only">Publication Statistics</h2>
            <!-- Statistics dashboard will be rendered here -->
        </section>

        ${createFeaturedPublications(dynamicData, staticData)}

        ${createRecentPublications(dynamicData)}
    `;
}

function createStaticFeaturedPublications(staticData) {
    // Fallback for static data format
    const featuredPapers = staticData.featured.papers;

    return `
        <div class="highlight-box">
            <h3>Featured Publications</h3>
            <div class="featured-publications">
                ${featuredPapers.map(paper => `
                    <div class="featured-paper">
                        <h4>${paper.title}</h4>
                        <p class="authors">${paper.authors}</p>
                        <p class="paper-details">${paper.journal} (${paper.year})</p>
                        ${paper.description ? `<p class="abstract">${paper.description}</p>` : ''}
                        <div class="paper-links">
                            ${paper.doi ? `<a href="https://doi.org/${paper.doi}" target="_blank">DOI</a>` : ''}
                            ${paper.arxiv ? `<a href="https://arxiv.org/abs/${paper.arxiv}" target="_blank">arXiv</a>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function createFeaturedPublications(dynamicData, staticData) {
    const publications = dynamicData.publications || [];

    // Find publications marked as featured (no limit)
    const featuredPapers = publications
        .filter(pub => pub.featured === true)
        .sort((a, b) => {
            // Sort featured papers by year descending, then by title
            if (b.year !== a.year) return b.year - a.year;
            return a.title.localeCompare(b.title);
        });

    // Fallback to static data if no featured papers in dynamic data
    if (featuredPapers.length === 0 && staticData.featured && staticData.featured.papers) {
        return createStaticFeaturedPublications(staticData);
    }

    if (featuredPapers.length === 0) {
        return '';
    }

    return `
        <section class="highlight-box" role="region" aria-labelledby="featured-heading">
            <h3 id="featured-heading">Featured Publications</h3>
            <div class="featured-publications" role="list" aria-label="Featured publications list">
                ${featuredPapers.map(paper => {
        // Shorten author list if too long
        const authors = paper.authors || [];
        let authorString = '';
        if (authors.length === 0) {
            authorString = 'Authors not available';
        } else if (authors.length <= 4) {
            authorString = authors.join(', ');
        } else {
            authorString = authors.slice(0, 3).join(', ') + `, et al. (${authors.length} authors)`;
        }

        // Find paper link (arXiv preferred, then ADS, then Scholar URL)
        let arxivLink = '';
        if (paper.arxivId) {
            arxivLink = `https://arxiv.org/abs/${paper.arxivId}`;
        } else if (paper.scholarUrl && paper.scholarUrl.includes('arxiv')) {
            arxivLink = paper.scholarUrl;
        } else if (paper.adsUrl) {
            arxivLink = paper.adsUrl;
        } else if (paper.scholarUrl) {
            // Use Scholar URL as final fallback (e.g., OpenReview links)
            arxivLink = paper.scholarUrl;
        }

        // Check if this is a student-led or postdoc-led publication
        const isStudentPaper = isStudentLed(paper);
        const isPostdocPaper = isPostdocLed(paper);

        // Get publication categories and create badges
        const categoryBadges = createCategoryBadges(paper);
        const studentBadge = isStudentPaper ?
            `<span class="student-led-badge" title="Student-Led Research">🎓 Student-Led</span>` : '';
        const postdocBadge = isPostdocPaper ?
            `<span class="postdoc-led-badge" title="Postdoc-Led Research">🔬 Postdoc-Led</span>` : '';

        // Apply appropriate highlighting class
        let paperClass = 'featured-paper';
        if (isStudentPaper) {
            paperClass = 'featured-paper student-led-paper';
        } else if (isPostdocPaper) {
            paperClass = 'featured-paper postdoc-led-paper';
        }

        return `
                        <div class="${paperClass}">
                            <div class="paper-header">
                                <h4><a href="${arxivLink}" target="_blank" rel="noopener noreferrer">${paper.title}</a></h4>
                                <div class="paper-badges">
                                    ${categoryBadges}
                                    ${studentBadge}
                                    ${postdocBadge}
                                </div>
                            </div>
                            <p class="authors">${authorString}</p>
                            <p class="paper-details">${paper.year}${paper.journal ? ` • ${paper.journal}` : ''}${paper.citations ? ` • ${paper.citations} citations` : ''}</p>
                            ${paper.abstract ? `<p class="abstract">${paper.abstract}</p>` : ''}
                        </div>
                    `;
    }).join('')}
            </div>
        </section>
    `;
}

function createRecentPublications(dynamicData) {
    const publications = dynamicData.publications || [];
    if (publications.length === 0) {
        return '';
    }

    // Get all publications, excluding featured ones (for batch loading)
    const allPubs = publications
        .filter(pub => pub.year && !pub.featured) // Exclude featured papers, include all years
        .sort((a, b) => {
            if (b.year !== a.year) return b.year - a.year; // Sort by year descending
            return a.title.localeCompare(b.title); // Then by title for consistency
        });

    if (allPubs.length === 0) {
        return '';
    }

    // Note: allPublicationsData is set globally in loadPublicationsContent

    // Initial batch size for lazy loading
    const initialBatchSize = 20;
    const initialPubs = allPubs.slice(0, initialBatchSize);

    return `
        <section class="highlight-box" role="region" aria-labelledby="recent-heading">
            <h3 id="recent-heading">Recent Publications</h3>
            <div id="publications-container" class="recent-publications" role="feed" aria-label="Publications list" aria-busy="false" data-total="${allPubs.length}" data-loaded="${initialPubs.length}">
                ${initialPubs.map(pub => createPublicationHTML(pub)).join('')}
            </div>
            ${allPubs.length > initialBatchSize ? `
            <div id="publications-load-more" class="publications-load-more">
                <button class="load-more-btn" data-action="load-more-publications"
                        aria-label="Load more publications">
                    Load More (${allPubs.length - initialPubs.length} remaining)
                </button>
            </div>
            ` : ''}
        </section>
    `;
}

/**
 * Determine research category for a publication
 */
function getPublicationCategory(pub) {
    // First check if we have probabilistic categorization data
    if (pub.categoryProbabilities && typeof pub.categoryProbabilities === 'object') {
        // Use the primary category from researchArea field
        return pub.researchArea || 'Discovery & Understanding';
    }

    // Fallback to old keyword-based system for compatibility
    const keywordsMapping = {
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

    const defaultCategory = "Discovery & Understanding";

    // Check title and abstract for keywords
    const searchText = `${pub.title || ''} ${pub.abstract || ''}`.toLowerCase();

    // Find matching category based on keywords
    for (const [keyword, category] of Object.entries(keywordsMapping)) {
        if (searchText.includes(keyword.toLowerCase())) {
            return category;
        }
    }

    return defaultCategory;
}

/**
 * Get all significant categories for a publication (for multi-category badges)
 */
function getPublicationCategories(pub, threshold = 0.2) {
    if (pub.categoryProbabilities && typeof pub.categoryProbabilities === 'object') {
        // Return categories with probabilities above threshold, sorted by probability
        const categories = Object.entries(pub.categoryProbabilities)
            .filter(([category, prob]) => prob >= threshold)
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

    // Fallback: single category from old system
    const primaryCategory = getPublicationCategory(pub);
    return [{ category: primaryCategory, probability: 1.0 }];
}

/**
 * Get category badge color scheme
 *
 * Color palette chosen to minimize overlap with authorship colors:
 * - Authorship uses: Blue (primary), Purple (postdoc), Orange (student), Green (contributor)
 * - Research categories use: Crimson red, Teal, Indigo, Golden yellow
 * These provide good separation while remaining visually distinct.
 */
function getCategoryColors(category) {
    // Check if dark theme is active
    const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';

    const colorSchemes = {
        'Statistical Learning & AI': {
            bg: isDarkTheme ? '#EF5350' : '#C62828',        // Crimson red (distinct from orange)
            bgLight: '#FFCDD2',
            text: '#ffffff'
        },
        'Interpretability & Insight': {
            bg: isDarkTheme ? '#26A69A' : '#00897B',        // Teal (distinct from purple and green)
            bgLight: '#B2DFDB',
            text: '#ffffff'
        },
        'Inference & Computation': {
            bg: isDarkTheme ? '#5C6BC0' : '#3949AB',        // Indigo (darker than primary author blue)
            bgLight: '#C5CAE9',
            text: '#ffffff'
        },
        'Discovery & Understanding': {
            bg: isDarkTheme ? '#FFCA28' : '#F9A825',        // Golden yellow (distinct from orange)
            bgLight: '#FFF9C4',
            text: '#1a1a2e'                                  // Dark text for contrast on yellow
        }
    };

    return colorSchemes[category] || colorSchemes['Discovery & Understanding'];
}

/**
 * Create category badge HTML for a single category
 */
function createSingleCategoryBadge(category, probability = null, showProbability = false) {
    const colors = getCategoryColors(category);
    const shortLabels = {
        'Statistical Learning & AI': 'ML & AI',
        'Interpretability & Insight': 'Interpretability',
        'Inference & Computation': 'Inference',
        'Discovery & Understanding': 'Discovery'
    };

    const shortLabel = shortLabels[category] || category;
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
 */
function createCategoryBadges(pub, showProbabilities = false) {
    const categories = getPublicationCategories(pub);

    return categories.map(({ category, probability }) =>
        createSingleCategoryBadge(category, probability, showProbabilities)
    ).join('');
}

/**
 * Create category badge HTML (legacy single-category version for compatibility)
 */
function createCategoryBadge(category) {
    return createSingleCategoryBadge(category);
}

/**
 * Check if a publication is student-led
 */
function isStudentLed(pub) {
    // Check if publication has authorship category from ADS library data
    // Using singular 'authorshipCategory' not plural
    if (pub.authorshipCategory) {
        return pub.authorshipCategory === 'student';
    }

    // Fallback: heuristic based on common student names and author position
    // This is a simplified check - in practice you'd want to load actual student data
    const authors = pub.authors || [];
    if (authors.length === 0) return false;

    const firstAuthor = authors[0] || '';

    // Common student indicators (this would be replaced with actual student list)
    const studentIndicators = [
        'Yuan', 'Sanderson', 'Ting', 'Green', 'Eadie', 'Speagle'
    ];

    return studentIndicators.some(indicator =>
        firstAuthor.includes(indicator) && !firstAuthor.includes('Speagle')
    );
}

/**
 * Check if a publication is postdoc-led
 */
function isPostdocLed(pub) {
    // Check if publication has authorship category from ADS library data
    // Using singular 'authorshipCategory' not plural
    if (pub.authorshipCategory) {
        return pub.authorshipCategory === 'postdoc';
    }

    // No fallback heuristic for postdoc detection - rely on ADS library data
    return false;
}

/**
 * Create HTML for a single publication
 */
function createPublicationHTML(pub) {
    // Check if this is a student-led or postdoc-led publication
    const isStudentPaper = isStudentLed(pub);
    const isPostdocPaper = isPostdocLed(pub);

    // Shorten author list if too long
    const authors = pub.authors || [];
    let authorString = '';
    if (authors.length === 0) {
        authorString = 'Authors not available';
    } else if (authors.length <= 4) {
        authorString = authors.join(', ');
    } else {
        authorString = authors.slice(0, 3).join(', ') + `, et al. (${authors.length} authors)`;
    }

    // Find paper link (arXiv preferred, then ADS, then Scholar URL)
    let arxivLink = '';
    if (pub.arxivId) {
        arxivLink = `https://arxiv.org/abs/${pub.arxivId}`;
    } else if (pub.scholarUrl && pub.scholarUrl.includes('arxiv')) {
        arxivLink = pub.scholarUrl;
    } else if (pub.adsUrl) {
        // Use ADS link as fallback
        arxivLink = pub.adsUrl;
    } else if (pub.scholarUrl) {
        // Use Scholar URL as final fallback (e.g., OpenReview links)
        arxivLink = pub.scholarUrl;
    }

    // Get publication categories and create badges
    const categoryBadges = createCategoryBadges(pub);

    // Create student-led or postdoc-led indicator if applicable
    const studentBadge = isStudentPaper ?
        `<span class="student-led-badge" title="Student-Led Research">🎓 Student-Led</span>` : '';
    const postdocBadge = isPostdocPaper ?
        `<span class="postdoc-led-badge" title="Postdoc-Led Research">🔬 Postdoc-Led</span>` : '';

    // Apply appropriate class
    let paperClass = 'recent-paper';
    if (isStudentPaper) {
        paperClass = 'recent-paper student-led-paper';
    } else if (isPostdocPaper) {
        paperClass = 'recent-paper postdoc-led-paper';
    }

    return `
        <article class="${paperClass}" role="article" aria-labelledby="paper-title-${pub.title.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}">
            <div class="paper-header">
                <h4 id="paper-title-${pub.title.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}">
                    <a href="${arxivLink}"
                       target="_blank"
                       rel="noopener noreferrer"
                       aria-describedby="paper-details-${pub.title.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}"
                       aria-label="Read paper: ${pub.title}">
                        ${pub.title}
                    </a>
                </h4>
                <div class="paper-badges" role="group" aria-label="Publication categories and attributes">
                    ${categoryBadges}
                    ${studentBadge}
                    ${postdocBadge}
                </div>
            </div>
            <p class="authors" aria-label="Authors">${authorString}</p>
            <p class="paper-details"
               id="paper-details-${pub.title.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}"
               aria-label="Publication details">
               ${pub.year}${pub.journal ? ` • ${pub.journal}` : ''}${pub.citations ? ` • ${pub.citations} citations` : ''}
            </p>
        </article>
    `;
}

/**
 * Load more publications in batches
 */
export function loadMorePublications() {
    // Prevent multiple simultaneous loads
    if (isLoadingMore) {
        return;
    }
    isLoadingMore = true;

    const container = document.getElementById('publications-container');
    const loadMoreDiv = document.getElementById('publications-load-more');

    if (!container || !loadMoreDiv) {
        isLoadingMore = false;
        return;
    }

    // Show loading state
    const loadMoreBtn = loadMoreDiv.querySelector('.load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.textContent = 'Loading publications...';
        loadMoreBtn.setAttribute('aria-busy', 'true');
    }

    const loadedPubs = parseInt(container.dataset.loaded);
    const batchSize = 20;

    // Safety check
    if (!allPublicationsData || allPublicationsData.length === 0) {
        // Re-enable button
        if (loadMoreBtn) {
            loadMoreBtn.disabled = false;
            loadMoreBtn.textContent = 'Load More Publications';
            loadMoreBtn.setAttribute('aria-busy', 'false');
        }
        isLoadingMore = false;
        return;
    }

    // Check if we've already loaded everything
    if (loadedPubs >= allPublicationsData.length) {
        // Remove button since everything is loaded
        if (loadMoreDiv) {
            loadMoreDiv.remove();
        }
        isLoadingMore = false;
        return;
    }

    // Simulate loading delay for better UX
    setTimeout(() => {
        const nextBatch = allPublicationsData.slice(loadedPubs, loadedPubs + batchSize);

        // Add new publications to container
        nextBatch.forEach(pub => {
            const pubElement = document.createElement('div');
            pubElement.innerHTML = createPublicationHTML(pub);
            container.appendChild(pubElement.firstElementChild);
        });

        // Update loaded count
        const newLoadedCount = loadedPubs + nextBatch.length;
        container.dataset.loaded = newLoadedCount;

        // Update or remove load more button based on remaining publications
        const remainingCount = allPublicationsData.length - newLoadedCount;

        if (remainingCount > 0) {
            // Update button text with remaining count
            if (loadMoreBtn) {
                loadMoreBtn.textContent = `Load More (${remainingCount} remaining)`;
                loadMoreBtn.disabled = false;
                loadMoreBtn.setAttribute('aria-busy', 'false');
            }
        } else {
            // Remove the load more button since everything is now loaded
            loadMoreDiv.remove();
        }

        // Announce successful loading to screen readers
        const loadedCount = Math.min(batchSize, nextBatch.length);
        announceToScreenReader(`Loaded ${loadedCount} more publications. ${remainingCount} publications remaining.`);

        // Reset loading flag
        isLoadingMore = false;

    }, 500); // 500ms loading delay
}

export function createPublicationsContent(data) {
    return `
        <div class="highlight-box">
            <h3>${data.categories.title}</h3>
            <div class="content-grid">
                ${data.categories.areas.map(area => `
                    <div>
                        <h4>${area.icon} ${area.title}</h4>
                        <p>${area.description}</p>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="page-intro">
            <div class="content-grid">
                <div>
                    <h3>Research Metrics</h3>
                    <div class="metrics-grid">
                        <div class="metric">
                            <strong>${data.metrics.totalPapers}</strong>
                            <span>Publications</span>
                        </div>
                        <div class="metric">
                            <strong>${data.metrics.hIndex}</strong>
                            <span>h-index</span>
                        </div>
                        <div class="metric">
                            <strong>${data.metrics.citations}</strong>
                            <span>Citations</span>
                        </div>
                    </div>
                    <p><em>${data.metrics.note}</em></p>
                </div>

                <div>
                    <h3>Publication Links</h3>
                    <div class="publication-links">
                        <a href="${data.links.ads}" class="pub-link pub-link-horizontal" aria-label="View publications on ADS">
                            <div class="link-icon">${getPublicationIcon('ads')}</div>
                            <span>Astrophysics Data System</span>
                        </a>
                        <a href="${data.links.scholar}" class="pub-link pub-link-horizontal" aria-label="View publications on Google Scholar">
                            <div class="link-icon">${getPublicationIcon('scholar')}</div>
                            <span>Google Scholar</span>
                        </a>
                        <a href="${data.links.orcid}" class="pub-link pub-link-horizontal" aria-label="View ORCID profile">
                            <div class="link-icon">${getPublicationIcon('orcid')}</div>
                            <span>ORCID Profile</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <div class="highlight-box">
            <h3>${data.featured.title}</h3>
            ${data.featured.papers.map(paper => `
                <div class="featured-paper">
                    <h4>${paper.title}</h4>
                    <p><strong>Authors:</strong> ${paper.authors}</p>
                    <p><strong>Journal:</strong> ${paper.journal} (${paper.year})</p>
                    <p>${paper.description}</p>
                    <div class="paper-links">
                        <a href="https://doi.org/${paper.doi}">DOI</a>
                        <a href="https://arxiv.org/abs/${paper.arxiv}">arXiv</a>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Make function globally available for event delegation
window.loadMorePublications = loadMorePublications;
