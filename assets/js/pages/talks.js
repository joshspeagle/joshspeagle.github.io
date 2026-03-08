/**
 * Talks page content - Chronological presentation list with category filtering
 * and progressive "Load More" pagination within filtered results.
 *
 * Approach: filter first, then paginate. Changing filters resets the page.
 * All talks remain in the DOM for SEO; JS controls visibility.
 */

const TALKS_BATCH_SIZE = 20;
let visibleLimit = TALKS_BATCH_SIZE;
let enabledCategories = new Set();

/**
 * Unified visibility update — single source of truth for what's shown.
 * 1. Filter by enabled categories
 * 2. Among matching items, show only the first `visibleLimit`
 * 3. Add/update/remove "Load More" button based on remaining count
 */
function updateVisibility() {
    let matchCount = 0;
    let shownCount = 0;

    document.querySelectorAll('.talk-item').forEach(item => {
        const catId = item.dataset.category;
        if (!enabledCategories.has(catId)) {
            item.style.display = 'none';
            return;
        }
        matchCount++;
        if (matchCount <= visibleLimit) {
            item.style.display = '';
            shownCount++;
        } else {
            item.style.display = 'none';
        }
    });

    updateLoadMoreButton(matchCount, shownCount);
    updateFilterStatus(shownCount, matchCount);
}

/**
 * Add, update, or remove the "Load More" button based on remaining items
 */
function updateLoadMoreButton(totalMatching, shown) {
    let container = document.getElementById('talks-load-more');
    const remaining = totalMatching - shown;

    if (remaining <= 0) {
        if (container) container.remove();
        return;
    }

    if (!container) {
        const talksList = document.querySelector('.talks-list');
        if (talksList) {
            talksList.insertAdjacentHTML('afterend', `
                <div class="publications-load-more" id="talks-load-more">
                    <button class="load-more-btn" data-action="load-more-talks"></button>
                </div>
            `);
            container = document.getElementById('talks-load-more');
        }
    }

    if (container) {
        const btn = container.querySelector('.load-more-btn');
        if (btn) {
            btn.textContent = `Show More Talks (${remaining} remaining)`;
            btn.setAttribute('aria-label', `Show more talks, ${remaining} remaining`);
        }
    }
}

/**
 * Update screen reader announcements and button aria states
 */
function updateFilterStatus(shownCount, matchCount) {
    const filterStatus = document.getElementById('filter-status');
    const categoryBtns = document.querySelectorAll('.filter-btn[data-filter]:not([data-filter="all"])');
    const allCategoryIds = Array.from(categoryBtns).map(btn => btn.dataset.filter);

    // Update button pressed states
    categoryBtns.forEach(btn => {
        btn.setAttribute('aria-pressed', enabledCategories.has(btn.dataset.filter) ? 'true' : 'false');
    });

    // Update "All" button
    const allBtn = document.querySelector('.filter-btn[data-filter="all"]');
    if (allBtn) {
        const allEnabled = enabledCategories.size === allCategoryIds.length;
        allBtn.classList.toggle('active', allEnabled);
        allBtn.setAttribute('aria-pressed', allEnabled ? 'true' : 'false');
    }

    // Announce to screen readers
    if (filterStatus) {
        const enabledNames = Array.from(categoryBtns)
            .filter(btn => enabledCategories.has(btn.dataset.filter))
            .map(btn => btn.textContent.trim().split(' (')[0]);

        if (enabledCategories.size === allCategoryIds.length) {
            filterStatus.textContent = `Showing ${shownCount} of ${matchCount} talks`;
        } else if (enabledCategories.size === 0) {
            filterStatus.textContent = 'No categories selected, showing 0 talks';
        } else {
            filterStatus.textContent = `Showing ${shownCount} of ${matchCount} talks in ${enabledNames.join(', ')}`;
        }
    }
}

export function createTalksContent(data) {
    // Calculate total talks dynamically
    const calculatedTotalTalks = data.categories ? data.categories.reduce((sum, cat) => sum + cat.talks.length, 0) : 0;

    // Statistics overview
    const statsHtml = data.statistics ? `
        <div class="talks-overview">
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-number">${calculatedTotalTalks}</span>
                    <span class="stat-label">Total Presentations</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${data.statistics.totalYears}</span>
                    <span class="stat-label">Years Active</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${data.statistics.countries}</span>
                    <span class="stat-label">Countries</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${data.statistics.invitedTalks}</span>
                    <span class="stat-label">Invited Talks</span>
                </div>
            </div>
        </div>
    ` : '';

    // Category filter buttons - all categories enabled by default (aria-pressed="true")
    const filterButtons = data.categories ? `
        <nav class="talks-filters" role="navigation" aria-label="Filter talks by category">
            <button class="filter-btn active" data-filter="all" aria-pressed="true" aria-label="Reset to show all categories, ${calculatedTotalTalks} talks total">
                All (${calculatedTotalTalks})
            </button>
            ${data.categories.map(category => `
                <button class="filter-btn talk-badge talk-badge-${category.color}" data-filter="${category.id}"
                        aria-pressed="true" aria-label="Toggle ${category.name}, ${category.talks.length} talks">
                    ${category.name} (${category.talks.length})
                </button>
            `).join('')}
        </nav>
        <div aria-live="polite" aria-atomic="true" class="sr-only" id="filter-status"></div>
    ` : '';

    // Flatten all talks into a single array with category metadata, then sort chronologically
    const allTalks = [];
    if (data.categories) {
        data.categories.forEach(category => {
            category.talks.forEach(talk => {
                allTalks.push({
                    ...talk,
                    categoryId: category.id,
                    categoryName: category.name,
                    categoryColor: category.color
                });
            });
        });
    }

    // Sort by year descending (newest first), then by month within year
    const monthOrder = { 'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
                         'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12 };
    allTalks.sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        const monthA = a.date.split(' ')[0];
        const monthB = b.date.split(' ')[0];
        return (monthOrder[monthB] || 0) - (monthOrder[monthA] || 0);
    });

    // Generate flat chronological list of all talks
    const talksListHtml = allTalks.length > 0 ? `
        <div class="talks-list" role="list">
            ${allTalks.map((talk, index) => {
                const isInvited = talk.categoryId === 'invited';
                return `
                    <article class="talk-item${isInvited ? ' invited-talk' : ''}" role="listitem"
                             data-category="${talk.categoryId}"
                             aria-labelledby="talk-${index}-title">
                        <div class="talk-header">
                            <h4 class="talk-title" id="talk-${index}-title" aria-label="${talk.title}, ${talk.type} at ${talk.event}, ${talk.date}">
                                ${talk.title}
                            </h4>
                            <div class="talk-meta">
                                <time class="talk-date" datetime="${talk.year}-${talk.date.split(' ')[0] === 'Jan' ? '01' :
                                    talk.date.split(' ')[0] === 'Feb' ? '02' :
                                    talk.date.split(' ')[0] === 'Mar' ? '03' :
                                    talk.date.split(' ')[0] === 'Apr' ? '04' :
                                    talk.date.split(' ')[0] === 'May' ? '05' :
                                    talk.date.split(' ')[0] === 'Jun' ? '06' :
                                    talk.date.split(' ')[0] === 'Jul' ? '07' :
                                    talk.date.split(' ')[0] === 'Aug' ? '08' :
                                    talk.date.split(' ')[0] === 'Sep' ? '09' :
                                    talk.date.split(' ')[0] === 'Oct' ? '10' :
                                    talk.date.split(' ')[0] === 'Nov' ? '11' : '12'}">${talk.date}</time>
                                <span class="talk-type talk-badge talk-badge-${talk.categoryColor}" role="text">${talk.type}</span>
                            </div>
                        </div>

                        <div class="talk-details" aria-describedby="talk-${index}-title">
                            <div class="talk-venue">
                                <strong aria-label="Event: ${talk.event}">${talk.event}</strong>
                                <span class="talk-location" aria-label="Location: ${talk.location}">${talk.location}</span>
                            </div>
                            ${talk.url ? `
                                <div class="talk-links">
                                    <a href="${talk.url}" target="_blank" rel="noopener noreferrer" class="external-link"
                                       aria-label="View recording for ${talk.title}">
                                        View Recording
                                    </a>
                                </div>
                            ` : ''}
                        </div>
                    </article>
                `;
            }).join('')}
        </div>
    ` : '';

    const html = `
        ${data.tagline ? `<div class="page-intro">
            <p>${data.tagline}</p>
            ${data.note ? `<p class="note">${data.note}</p>` : ''}
        </div>` : ''}

        ${statsHtml}
        ${filterButtons}
        ${talksListHtml}
    `;

    // Initialize after DOM update
    setTimeout(() => {
        initializeTalksFiltering();
    }, 100);

    return html;
}

/**
 * No-op kept for backward compatibility with content-loader.js.
 * Pagination is now handled inside initializeTalksFiltering / updateVisibility.
 */
export function initializeTalksLazyLoading() {
    // Lazy loading is integrated into the filtering system.
    // The initial updateVisibility() call in initializeTalksFiltering() handles it.
}

/**
 * Show more talks within the current filter. Increases the visible limit
 * and re-runs the unified visibility update.
 */
export function loadMoreTalks() {
    visibleLimit += TALKS_BATCH_SIZE;
    updateVisibility();
}

// Expose globally for event delegation
window.loadMoreTalks = loadMoreTalks;

/**
 * Initialize talks filtering and pagination.
 * Sets up filter buttons, then runs initial updateVisibility() which
 * also handles the "Load More" cutoff.
 */
export function initializeTalksFiltering() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    if (filterBtns.length === 0) return;

    // Prevent double-initialization
    if (filterBtns[0].dataset.initialized) return;
    filterBtns[0].dataset.initialized = 'true';

    // Get all category IDs (excluding "all" button)
    const categoryBtns = Array.from(filterBtns).filter(btn => btn.dataset.filter !== 'all');
    const allCategoryIds = categoryBtns.map(btn => btn.dataset.filter);

    // All categories enabled by default
    enabledCategories = new Set(allCategoryIds);

    function toggleCategory(categoryId) {
        if (enabledCategories.has(categoryId)) {
            enabledCategories.delete(categoryId);
        } else {
            enabledCategories.add(categoryId);
        }
        // Reset pagination when filter changes
        visibleLimit = TALKS_BATCH_SIZE;
        updateVisibility();
    }

    function resetAllCategories() {
        allCategoryIds.forEach(id => enabledCategories.add(id));
        // Reset pagination when filter changes
        visibleLimit = TALKS_BATCH_SIZE;
        updateVisibility();
    }

    // Add click and keyboard event listeners
    filterBtns.forEach((btn, index) => {
        btn.addEventListener('click', function() {
            const filter = this.dataset.filter;
            if (filter === 'all') {
                resetAllCategories();
            } else {
                toggleCategory(filter);
            }
        });

        btn.addEventListener('keydown', function(e) {
            let targetIndex = index;

            switch(e.key) {
                case 'ArrowRight':
                case 'ArrowDown':
                    e.preventDefault();
                    targetIndex = (index + 1) % filterBtns.length;
                    filterBtns[targetIndex].focus();
                    break;
                case 'ArrowLeft':
                case 'ArrowUp':
                    e.preventDefault();
                    targetIndex = (index - 1 + filterBtns.length) % filterBtns.length;
                    filterBtns[targetIndex].focus();
                    break;
                case 'Home':
                    e.preventDefault();
                    filterBtns[0].focus();
                    break;
                case 'End':
                    e.preventDefault();
                    filterBtns[filterBtns.length - 1].focus();
                    break;
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    const filter = this.dataset.filter;
                    if (filter === 'all') {
                        resetAllCategories();
                    } else {
                        toggleCategory(filter);
                    }
                    break;
            }
        });

        btn.setAttribute('tabindex', index === 0 ? '0' : '-1');
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('focus', function() {
            filterBtns.forEach(b => b.setAttribute('tabindex', '-1'));
            this.setAttribute('tabindex', '0');
        });
    });

    // Initial visibility update — applies both filter and pagination
    updateVisibility();
}
